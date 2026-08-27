/**
 * Service layer — orchestrates repository calls and the execution engine.
 *
 * No HTTP knowledge here. Throws typed errors that the controller maps to
 * HTTP status codes.
 */

import {
  listTopics as repoListTopics,
  listPatternsByTopicId,
  getTopicIdById,
  listProblemsByPatternId,
  getPatternIdById,
  getProblemDetailById,
  getProblemDetailBySlug,
  listAllTestCasesForProblem,
  getProblemForSubmission,
  insertSubmission,
  listProblemsIndex,
  getProblemByOrdinalOffset,
  listProblemsForLegacyEndpoint,
  getSubmissionHistory,
  getProblemPatternContext,
  getUserPatternStats,
  getUserPatternStatsDetailed,
  getNextProblemCandidates,
  getUnsolvedProblemFallback,
  getUserSubmissionsWithDetails,
  getAllPatternsWithPrereqs,
  getProblemComplexity,
  getLatestSubmissionCode,
  getAggregateByProblem,
  getAggregateByPattern,
  getPatternTransitions,
  getProblemCommunityStats,
  getSubmissionTimeline,
  getTotalPatternCount,
} from './learning-repository.js';
import { runExecution, isLanguageSupported, ERROR_KIND } from './execution-engine.js';
import {
  analyzeErrorPatterns,
  computeAdaptiveWeights,
  buildUserProfile,
  buildLearningPath,
  generateContextualHint,
} from './intelligence-engine.js';
import {
  analyzeSubmittedCode,
  computePerformanceSignals,
} from './code-analysis-engine.js';
import {
  computeProblemInsights,
  computePatternInsights,
  analyzePatternTransitions,
  buildKnowledgeGraph,
} from './knowledge-graph-engine.js';
import {
  predictReadiness,
  detectRisks,
  generateInterventions,
  forecastVelocity,
  buildPredictiveProfile,
} from './predictive-engine.js';

// -------------------------------------------------------------------------
// Typed errors
// -------------------------------------------------------------------------
export class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}
export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

// -------------------------------------------------------------------------
// Read paths
// -------------------------------------------------------------------------

export async function getAllTopics() {
  return repoListTopics();
}

export async function getPatternsForTopic(topicId) {
  // Fast existence check so we can return 404 instead of an empty array
  const exists = await getTopicIdById(topicId);
  if (!exists) throw new NotFoundError(`Topic not found: ${topicId}`);
  return listPatternsByTopicId(topicId);
}

export async function getProblemsForPattern(patternId) {
  const exists = await getPatternIdById(patternId);
  if (!exists) throw new NotFoundError(`Pattern not found: ${patternId}`);
  return listProblemsByPatternId(patternId);
}

/**
 * Compact projection of every problem joined with its topic + pattern.
 * Used to power list/dashboard surfaces (sheets, revision, profile,
 * concept map) without those clients needing to walk the topic→pattern→
 * problem hierarchy themselves.
 */
export async function getProblemsIndex() {
  return listProblemsIndex();
}

/**
 * Deterministic per-day picker — the seed integer wraps modulo the total
 * problem count and selects exactly one row. Returns null on empty DB.
 */
export async function getDailyDrillProblem(seedIndex) {
  return getProblemByOrdinalOffset(seedIndex);
}

/**
 * Filtered listing for the legacy /api/problems shim endpoint.
 *
 * Notes on filter semantics:
 *  - `topicSlug` maps to topics.slug (effectively the "category" dimension
 *    in the legacy data model).
 *  - `companySlug` is accepted for forward compatibility but currently a
 *    no-op because the schema does not yet model company tagging.
 */
export async function getProblemsForLegacyShim({ topicSlug = null } = {}) {
  return listProblemsForLegacyEndpoint({ topicSlug });
}

/**
 * Public detail loader for the GET /problem/:slug route.
 *
 * The route param is treated as a slug (no UUID validation upstream). For
 * backward compatibility — older bookmarks/links that still hold the UUID
 * primary key — we fall back to an id-based lookup if the value happens to
 * look like a UUID. This keeps the contract slug-first per spec while
 * avoiding gratuitous 404s on existing clients.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProblemWithVisibleTests(slug) {
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new NotFoundError(`Problem not found: ${slug}`);
  }

  // Slug-based lookup (primary path).
  let result = await getProblemDetailBySlug(slug);

  // Backward-compat fallback for callers still using UUIDs.
  if (!result && UUID_RE.test(slug)) {
    result = await getProblemDetailById(slug);
  }

  if (!result) throw new NotFoundError(`Problem not found: ${slug}`);
  return result;
}

// -------------------------------------------------------------------------
// Submission flow
// -------------------------------------------------------------------------

const MAX_CODE_LENGTH = 100_000; // 100 KB — guards against accidental DoS

/**
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} args.problemId
 * @param {string} args.code
 * @param {string} args.language
 */
export async function submitSolution({ userId, problemId, code, language }) {
  // -- input validation -----------------------------------------------------
  if (!problemId)              throw new ValidationError('problem_id is required');
  if (typeof code !== 'string') throw new ValidationError('code must be a string');
  if (code.length === 0)       throw new ValidationError('code must not be empty');
  if (code.length > MAX_CODE_LENGTH) {
    throw new ValidationError(`code exceeds ${MAX_CODE_LENGTH} bytes`);
  }
  if (!language)               throw new ValidationError('language is required');
  if (!isLanguageSupported(language)) {
    throw new ValidationError(`unsupported language: ${language}`);
  }

  // -- ensure problem exists ------------------------------------------------
  const problem = await getProblemForSubmission(problemId);
  if (!problem) throw new NotFoundError(`Problem not found: ${problemId}`);

  // -- fetch ALL test cases (visible + hidden) ------------------------------
  const testCases = await listAllTestCasesForProblem(problemId);
  if (testCases.length === 0) {
    throw new ValidationError(`No test cases configured for problem ${problemId}`);
  }

  // -- run real code executor (Piston / Judge0) ----------------------------
  const exec = await runExecution({ language, code, testCases });

  // Status: prefer Accepted; if any case errored at runtime/compile/TLE,
  // surface that distinctly from a plain Wrong Answer.
  let status;
  if (exec.pass_count === exec.total) {
    status = 'Accepted';
  } else {
    const firstFail = exec.first_failed_index !== null
      ? exec.results[exec.first_failed_index]
      : null;
    const fk = firstFail && firstFail.error_kind;
    if (fk === ERROR_KIND.RUNTIME_ERROR ||
        fk === ERROR_KIND.COMPILE_ERROR ||
        fk === ERROR_KIND.HARNESS_ERROR) {
      status = 'Runtime Error';
    } else if (fk === ERROR_KIND.TIME_LIMIT_EXCEEDED) {
      status = 'Time Limit Exceeded';
    } else {
      status = 'Wrong Answer';
    }
  }

  // -- redact hidden inputs/outputs in the failed-cases summary -------------
  const failedResults = exec.results.filter((r) => !r.passed);
  const failCasesForDb = failedResults.map((r) => ({
    test_index: r.test_index,
    test_case_id: r.test_case_id,
    is_hidden: r.is_hidden,
    input: r.is_hidden ? null : r.input,
    expected: r.is_hidden ? null : r.expected,
    actual: r.is_hidden ? null : r.actual,
  }));

  // -- persist submission ---------------------------------------------------
  const submission = await insertSubmission({
    userId,
    problemId,
    language: String(language).toLowerCase(),
    code,
    status,
    executionTimeMs: exec.runtime_ms,
    memoryUsedBytes: exec.memory_bytes,
    passCount: exec.pass_count,
    failCases: failCasesForDb,
  });

  // -- shape the API response ----------------------------------------------
  let firstFailedTestCase = null;
  if (exec.first_failed_index !== null) {
    const fr = exec.results[exec.first_failed_index];
    const baseMsg = fr.is_hidden
      ? `Failed on hidden test case #${fr.test_index + 1}`
      : `Failed on test case #${fr.test_index + 1}`;

    let message = baseMsg;
    if (fr.error_kind === ERROR_KIND.RUNTIME_ERROR ||
        fr.error_kind === ERROR_KIND.HARNESS_ERROR) {
      message = `${baseMsg} — Runtime Error`;
    } else if (fr.error_kind === ERROR_KIND.COMPILE_ERROR) {
      message = `${baseMsg} — Compilation Error`;
    } else if (fr.error_kind === ERROR_KIND.TIME_LIMIT_EXCEEDED) {
      message = `${baseMsg} — Time Limit Exceeded`;
    }

    firstFailedTestCase = {
      test_index: fr.test_index,
      is_hidden: fr.is_hidden,
      error_kind: fr.error_kind,                 // wrong_answer | runtime_error | …
      // Hidden test details are intentionally redacted to protect the suite.
      input:    fr.is_hidden ? null : fr.input,
      expected: fr.is_hidden ? null : fr.expected,
      actual:   fr.is_hidden ? null : fr.actual,
      // stderr can leak hidden test internals if the user prints them; redact too.
      stderr:   fr.is_hidden ? null : (fr.stderr || null),
      message,
    };
  }

  // -- enrich with learning-loop metadata -----------------------------------
  let attemptNumber = 1;
  let previousStatus = null;
  let patternName = null;
  let topicName = null;
  try {
    const history = await getSubmissionHistory(userId, problemId);
    // history is newest-first; current submission is history[0]
    attemptNumber = history.length;
    if (history.length > 1) {
      previousStatus = history[1].status; // the one before this
    }
    const ctx = await getProblemPatternContext(problemId);
    if (ctx) {
      patternName = ctx.pattern_name;
      topicName = ctx.topic_name;
    }
  } catch (_) {
    // Learning metadata enrichment must never break the submit flow.
  }

  const result = {
    submission_id: submission.id,
    status,                                    // Accepted | Wrong Answer | Runtime Error | TLE
    passed: status === 'Accepted',
    pass_count: exec.pass_count,
    total_cases: exec.total,
    failed_test_case: firstFailedTestCase,     // null if accepted
    runtime_ms: exec.runtime_ms,
    memory_bytes: exec.memory_bytes,
    language: exec.language,
    provider: exec.provider,                   // piston | judge0 | mock
    created_at: submission.created_at,
    // Phase 4: Learning Loop enrichment
    attempt_number: attemptNumber,
    previous_status: previousStatus,
    pattern_name: patternName,
    topic_name: topicName,
  };

  // Phase 6: Generate server-side contextual hint (async, non-blocking)
  try {
    const hint = await getServerHint(userId, problemId, result);
    if (hint) result.contextual_hint = hint;
  } catch (_) { /* never break submit */ }

  // Phase 7: Code analysis (async, non-blocking)
  try {
    const probComp = await getProblemComplexity(problemId);
    if (probComp) {
      const codeAnalysis = analyzeSubmittedCode({
        code,
        language,
        patternName: probComp.pattern_name || patternName,
        status,
        expectedTimeComplexity: probComp.time_complexity,
        expectedSpaceComplexity: probComp.space_complexity,
      });
      result.code_analysis = codeAnalysis;
    }
  } catch (_) { /* never break submit */ }

  return result;
}

// -------------------------------------------------------------------------
// Phase 4: Learning Loop — read paths
// -------------------------------------------------------------------------

/**
 * Fetch attempt history for a user on a specific problem.
 */
export async function getAttemptHistory(userId, problemId) {
  const history = await getSubmissionHistory(userId, problemId);
  const ctx = await getProblemPatternContext(problemId);
  return {
    problem_id: problemId,
    attempts: history.map((h) => ({
      id: h.id,
      status: h.status,
      language: h.language,
      runtime_ms: h.execution_time_ms,
      memory_bytes: h.memory_used_bytes,
      pass_count: h.pass_count,
      created_at: h.created_at,
    })),
    total: history.length,
    pattern_name: ctx?.pattern_name || null,
    topic_name: ctx?.topic_name || null,
  };
}

/**
 * Aggregate per-pattern performance stats for a user.
 */
export async function getPatternProgress(userId) {
  const stats = await getUserPatternStats(userId);

  return stats.map((s) => {
    // Compute mastery level
    let mastery = 'not_started';
    if (s.problems_solved > 0 && s.problems_solved >= s.problems_attempted) {
      mastery = 'strong';
    } else if (s.problems_solved > 0) {
      mastery = 'improving';
    } else if (s.total_submissions > 0) {
      mastery = 'weak';
    }
    return {
      pattern_name: s.pattern_name,
      pattern_slug: s.pattern_slug,
      topic_name: s.topic_name,
      total_submissions: s.total_submissions,
      problems_attempted: s.problems_attempted,
      problems_solved: s.problems_solved,
      avg_runtime_ms: s.avg_runtime_ms,
      mastery,
    };
  });
}

// -------------------------------------------------------------------------
// Phase 5: Adaptive Learning Engine
// -------------------------------------------------------------------------

/**
 * Compute mastery score (0..1) for a pattern.
 * Accepts optional adaptive weights from the intelligence engine.
 */
function computeMasteryScore(stat, weights = null) {
  const attempted = Number(stat.problems_attempted || 0);
  const solved    = Number(stat.problems_solved || 0);
  const avgAttempts = Number(stat.avg_attempts_per_solve || 0);
  const avgTimeSecs = Number(stat.avg_solve_time_secs || 0);

  if (attempted === 0) return 0;

  const w = weights || { correctness: 0.4, efficiency: 0.3, speed: 0.2, volume: 0.1 };

  const successRate = attempted > 0 ? solved / attempted : 0;
  const efficiency = avgAttempts > 0 ? Math.min(1, 1 / avgAttempts) : 0;
  const speed = avgTimeSecs > 0 ? Math.min(1, 60 / avgTimeSecs) : (solved > 0 ? 1 : 0);
  const volume = Math.min(1, Math.log(attempted + 1) / Math.log(5));

  return Math.round(
    (successRate * w.correctness + efficiency * w.efficiency + speed * w.speed + volume * w.volume) * 100
  ) / 100;
}

/**
 * Determine weakness status from mastery score.
 */
function classifyMastery(score, attempted, solved) {
  if (attempted === 0) return 'not_started';
  if (score >= 0.75) return 'strong';
  if (score >= 0.45) return 'improving';
  if (solved > 0 && score >= 0.25) return 'developing';
  return 'weak';
}

/**
 * Determine what difficulty the user should attempt next based on mastery.
 */
function adaptDifficulty(masteryScore, currentDifficulty) {
  if (masteryScore >= 0.75) {
    // Strong → increase difficulty
    if (currentDifficulty === 'Easy') return 'Medium';
    if (currentDifficulty === 'Medium') return 'Hard';
    return 'Hard';
  }
  if (masteryScore < 0.3) {
    // Weak → decrease difficulty
    if (currentDifficulty === 'Hard') return 'Medium';
    if (currentDifficulty === 'Medium') return 'Easy';
    return 'Easy';
  }
  // Maintain current level
  return currentDifficulty || 'Medium';
}

/**
 * Full mastery dashboard with scores, weakness detection, and difficulty recommendations.
 */
export async function getMasteryDashboard(userId) {
  const stats = await getUserPatternStatsDetailed(userId);

  const patterns = stats.map((s) => {
    const score = computeMasteryScore(s);
    const mastery = classifyMastery(score, s.problems_attempted, s.problems_solved);
    return {
      pattern_id: s.pattern_id,
      pattern_name: s.pattern_name,
      pattern_slug: s.pattern_slug,
      topic_name: s.topic_name,
      mastery_score: score,
      mastery_level: mastery,
      is_weak: mastery === 'weak',
      problems_attempted: s.problems_attempted,
      problems_solved: s.problems_solved,
      total_submissions: s.total_submissions,
      avg_attempts_per_solve: s.avg_attempts_per_solve,
      avg_solve_time_secs: s.avg_solve_time_secs,
      avg_runtime_ms: s.avg_runtime_ms,
      recommended_difficulty: adaptDifficulty(
        score,
        score >= 0.5 ? 'Medium' : 'Easy'
      ),
    };
  });

  const weakPatterns = patterns.filter((p) => p.is_weak);
  const strongPatterns = patterns.filter((p) => p.mastery_level === 'strong');

  return {
    patterns,
    weak_patterns: weakPatterns.map((p) => p.pattern_name),
    strong_patterns: strongPatterns.map((p) => p.pattern_name),
    overall_score: patterns.length > 0
      ? Math.round((patterns.reduce((sum, p) => sum + p.mastery_score, 0) / patterns.length) * 100) / 100
      : 0,
  };
}

/**
 * Recommend next problem(s) after a submission.
 *
 * Strategy:
 *   1. Compute mastery for all touched patterns
 *   2. Sort by mastery score ascending (weakest first)
 *   3. Pick candidates from weakest patterns with adapted difficulty
 *   4. Fallback to unsolved problems across all patterns
 */
export async function getNextRecommendation(userId, currentProblemId) {
  const stats = await getUserPatternStatsDetailed(userId);

  // Current problem's context
  const currentCtx = await getProblemPatternContext(currentProblemId);
  const currentPatternSlug = currentCtx?.pattern_slug || null;

  // Score all patterns
  const scored = stats.map((s) => {
    const score = computeMasteryScore(s);
    return {
      pattern_id: s.pattern_id,
      pattern_name: s.pattern_name,
      pattern_slug: s.pattern_slug,
      topic_name: s.topic_name,
      mastery_score: score,
      mastery_level: classifyMastery(score, s.problems_attempted, s.problems_solved),
      recommended_difficulty: adaptDifficulty(
        score,
        score >= 0.5 ? 'Medium' : 'Easy'
      ),
    };
  }).sort((a, b) => a.mastery_score - b.mastery_score); // weakest first

  // Prioritise: 1) weak patterns, 2) current pattern, 3) any pattern
  const weakPatternIds = scored
    .filter((s) => s.mastery_level === 'weak' || s.mastery_level === 'developing')
    .map((s) => s.pattern_id);

  const currentPatternEntry = scored.find((s) => s.pattern_slug === currentPatternSlug);
  const currentPatternId = currentPatternEntry?.pattern_id;

  // Build candidate list from weak patterns first
  let targetIds = [...weakPatternIds];
  if (currentPatternId && !targetIds.includes(currentPatternId)) {
    targetIds.push(currentPatternId);
  }
  // Add all pattern ids as fallback
  for (const s of scored) {
    if (!targetIds.includes(s.pattern_id)) targetIds.push(s.pattern_id);
  }

  const preferDiff = currentPatternEntry?.recommended_difficulty || 'Medium';

  let candidates = await getNextProblemCandidates(userId, targetIds, preferDiff, 3);

  // Fallback if no candidates in tracked patterns
  if (candidates.length === 0) {
    candidates = await getUnsolvedProblemFallback(userId, preferDiff, 3);
  }

  const primary = candidates[0] || null;
  const alternatives = candidates.slice(1);

  return {
    recommendation: primary ? {
      id: primary.id,
      slug: primary.slug,
      title: primary.title,
      difficulty: primary.difficulty,
      pattern_name: primary.pattern_name,
      topic_name: primary.topic_name,
      reason: weakPatternIds.some((pid) => {
        // Check if primary belongs to a weak pattern
        const match = scored.find((s) => s.pattern_id === pid);
        return match && match.pattern_name === primary.pattern_name;
      })
        ? `Strengthen your ${primary.pattern_name} skills`
        : currentPatternSlug && primary.pattern_slug === currentPatternSlug
          ? `Continue practicing ${primary.pattern_name}`
          : `Explore ${primary.pattern_name}`,
    } : null,
    alternatives: alternatives.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty,
      pattern_name: c.pattern_name,
    })),
    adapted_difficulty: preferDiff,
    current_pattern: currentCtx ? {
      name: currentCtx.pattern_name,
      mastery: currentPatternEntry?.mastery_level || 'not_started',
      score: currentPatternEntry?.mastery_score || 0,
    } : null,
  };
}

// -------------------------------------------------------------------------
// Phase 6: Intelligence Layer — service functions
// -------------------------------------------------------------------------

/**
 * Build a comprehensive user intelligence profile.
 */
export async function getUserProfile(userId) {
  const [stats, allSubs] = await Promise.all([
    getUserPatternStatsDetailed(userId),
    getUserSubmissionsWithDetails(userId),
  ]);

  const errorProfile = analyzeErrorPatterns(allSubs);
  const weights = computeAdaptiveWeights(errorProfile);
  const profile = buildUserProfile(stats, errorProfile, allSubs);

  return {
    ...profile,
    adaptive_weights: weights,
  };
}

/**
 * Build the learning path graph with mastery overlay.
 */
export async function getLearningPath(userId) {
  const [patterns, stats, allSubs] = await Promise.all([
    getAllPatternsWithPrereqs(),
    getUserPatternStatsDetailed(userId),
    getUserSubmissionsWithDetails(userId),
  ]);

  // Compute adaptive weights from user's error profile
  const errorProfile = analyzeErrorPatterns(allSubs);
  const weights = computeAdaptiveWeights(errorProfile);

  // Build mastery lookup by pattern slug
  const masteryBySlug = {};
  for (const s of stats) {
    const score = computeMasteryScore(s, weights);
    masteryBySlug[s.pattern_slug] = {
      score,
      level: classifyMastery(score, s.problems_attempted, s.problems_solved),
    };
  }

  const path = buildLearningPath(patterns, masteryBySlug);
  return {
    ...path,
    pattern_count: patterns.length,
    mastered_count: Object.values(masteryBySlug).filter((m) => m.level === 'strong').length,
  };
}

/**
 * Generate a server-side contextual hint for a submission.
 * Uses the intelligence engine with full user error history.
 */
export async function getServerHint(userId, problemId, submissionResult) {
  try {
    const [allSubs, stats, ctx] = await Promise.all([
      getUserSubmissionsWithDetails(userId),
      getUserPatternStatsDetailed(userId),
      getProblemPatternContext(problemId),
    ]);

    const errorProfile = analyzeErrorPatterns(allSubs);
    const profile = buildUserProfile(stats, errorProfile, allSubs);

    return generateContextualHint({
      pattern_name: ctx?.pattern_name || submissionResult.pattern_name || '',
      status: submissionResult.status,
      attempt_number: submissionResult.attempt_number || 1,
      error_tendency: profile.error_tendency,
      user_weaknesses: profile.weaknesses,
      failed_test: submissionResult.failed_test_case,
      problem_title: null,
    });
  } catch (_) {
    return null; // Never break the submit flow
  }
}

// -------------------------------------------------------------------------
// Phase 7: Code Intelligence Engine — service functions
// -------------------------------------------------------------------------

/**
 * Analyze code for a specific problem (on-demand, not just after submit).
 */
export async function getCodeAnalysis(userId, problemId) {
  const [sub, probComp] = await Promise.all([
    getLatestSubmissionCode(userId, problemId),
    getProblemComplexity(problemId),
  ]);
  if (!sub || !probComp) return null;

  return analyzeSubmittedCode({
    code: sub.code,
    language: sub.language,
    patternName: probComp.pattern_name,
    status: null,
    expectedTimeComplexity: probComp.time_complexity,
    expectedSpaceComplexity: probComp.space_complexity,
  });
}

/**
 * Compute performance signals across all user submissions.
 */
export async function getPerformanceSignals(userId) {
  const allSubs = await getUserSubmissionsWithDetails(userId);
  return computePerformanceSignals(allSubs);
}

// -------------------------------------------------------------------------
// Phase 8: Knowledge Graph — service functions
// -------------------------------------------------------------------------

/**
 * Build the full knowledge graph with cross-user intelligence.
 */
export async function getKnowledgeGraph() {
  const [probAggs, patAggs, transitions] = await Promise.all([
    getAggregateByProblem(),
    getAggregateByPattern(),
    getPatternTransitions(),
  ]);

  const problemInsights = computeProblemInsights(probAggs);
  const patternInsights = computePatternInsights(patAggs);
  const transitionAnalysis = analyzePatternTransitions(transitions);
  const graph = buildKnowledgeGraph(problemInsights, patternInsights, transitionAnalysis);

  return {
    graph,
    problem_insights: problemInsights,
    pattern_insights: patternInsights,
    transitions: transitionAnalysis,
  };
}

/**
 * Get community stats for a specific problem.
 */
export async function getCommunityInsights(problemId) {
  const stats = await getProblemCommunityStats(problemId);
  if (!stats) return null;

  const total = Number(stats.total_submissions) || 1;
  const users = Number(stats.total_users) || 1;
  const solved = Number(stats.solved_users) || 0;
  const wa = Number(stats.wrong_answer) || 0;
  const tle = Number(stats.tle) || 0;
  const re = Number(stats.runtime_error) || 0;
  const failTotal = wa + tle + re;

  return {
    total_submissions: Number(stats.total_submissions),
    total_users: users,
    solved_users: solved,
    solve_rate: Math.round((solved / users) * 100),
    avg_attempts: Number(stats.avg_attempts) || 0,
    avg_runtime_ms: Number(stats.avg_runtime_ms) || 0,
    failure_breakdown: {
      wrong_answer: failTotal > 0 ? Math.round((wa / failTotal) * 100) : 0,
      tle: failTotal > 0 ? Math.round((tle / failTotal) * 100) : 0,
      runtime_error: failTotal > 0 ? Math.round((re / failTotal) * 100) : 0,
    },
  };
}

// -------------------------------------------------------------------------
// Phase 9: Predictive Intelligence — service functions
// -------------------------------------------------------------------------

export async function getPredictions(userId) {
  const [timeline, masteryData, patternCount, profile] = await Promise.all([
    getSubmissionTimeline(userId),
    getUserPatternStatsDetailed(userId),
    getTotalPatternCount(),
    getUserProfile(userId),
  ]);

  const readiness = predictReadiness(masteryData, timeline.length, patternCount);
  const risks = detectRisks(timeline, profile);
  const interventions = generateInterventions(risks, masteryData);
  const velocity = forecastVelocity(timeline);

  return buildPredictiveProfile(readiness, risks, velocity, interventions);
}
