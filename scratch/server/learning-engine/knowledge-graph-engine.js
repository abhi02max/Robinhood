/**
 * Knowledge Graph Engine — Phase 8
 * Pure functions for cross-user intelligence, problem calibration,
 * pattern transition analysis, and cohort-based recommendations.
 * No DB, no I/O — takes aggregate data, outputs insights.
 */

// ─── 1. Cross-User Failure Mapping ───

/**
 * Compute common failure patterns per problem from aggregate data.
 * @param {Array} problemAggs — [{ problem_id, title, slug, pattern_name,
 *   total_submissions, accepted, wrong_answer, tle, runtime_error,
 *   total_users, solved_users, avg_attempts, avg_time_secs }]
 * @returns {Array} enriched with failure percentages + difficulty calibration
 */
export function computeProblemInsights(problemAggs) {
  return problemAggs.map((p) => {
    const total = Number(p.total_submissions) || 1;
    const users = Number(p.total_users) || 1;
    const solved = Number(p.solved_users) || 0;
    const accepted = Number(p.accepted) || 0;
    const wa = Number(p.wrong_answer) || 0;
    const tle = Number(p.tle) || 0;
    const re = Number(p.runtime_error) || 0;

    const solveRate = Math.round((solved / users) * 100) / 100;
    const acceptRate = Math.round((accepted / total) * 100) / 100;
    const avgAttempts = Math.round(Number(p.avg_attempts || 0) * 10) / 10;
    const avgTime = Math.round(Number(p.avg_time_secs || 0));

    // Dominant failure type
    const failMap = { wrong_answer: wa, tle, runtime_error: re };
    const failTotal = wa + tle + re;
    const dominant = failTotal > 0
      ? Object.entries(failMap).sort(([,a],[,b]) => b - a)[0]
      : null;

    return {
      problem_id: p.problem_id,
      title: p.title,
      slug: p.slug,
      pattern_name: p.pattern_name,
      total_submissions: total,
      total_users: users,
      solved_users: solved,
      solve_rate: solveRate,
      accept_rate: acceptRate,
      avg_attempts: avgAttempts,
      avg_solve_time_secs: avgTime,
      failure_breakdown: {
        wrong_answer: failTotal > 0 ? Math.round((wa / failTotal) * 100) : 0,
        tle: failTotal > 0 ? Math.round((tle / failTotal) * 100) : 0,
        runtime_error: failTotal > 0 ? Math.round((re / failTotal) * 100) : 0,
      },
      dominant_failure: dominant ? { type: dominant[0], percentage: failTotal > 0 ? Math.round((dominant[1] / failTotal) * 100) : 0 } : null,
      calibrated_difficulty: calibrateDifficulty(solveRate, avgAttempts, avgTime),
    };
  });
}

/**
 * Compute common failure patterns per pattern from aggregate data.
 */
export function computePatternInsights(patternAggs) {
  return patternAggs.map((p) => {
    const total = Number(p.total_submissions) || 1;
    const users = Number(p.total_users) || 1;
    const solved = Number(p.solved_users) || 0;
    const wa = Number(p.wrong_answer) || 0;
    const tle = Number(p.tle) || 0;
    const re = Number(p.runtime_error) || 0;
    const solveRate = Math.round((solved / users) * 100) / 100;
    const failTotal = wa + tle + re;

    return {
      pattern_slug: p.pattern_slug,
      pattern_name: p.pattern_name,
      topic_name: p.topic_name,
      total_submissions: total,
      total_users: users,
      solved_users: solved,
      solve_rate: solveRate,
      avg_attempts: Math.round(Number(p.avg_attempts || 0) * 10) / 10,
      failure_breakdown: {
        wrong_answer: failTotal > 0 ? Math.round((wa / failTotal) * 100) : 0,
        tle: failTotal > 0 ? Math.round((tle / failTotal) * 100) : 0,
        runtime_error: failTotal > 0 ? Math.round((re / failTotal) * 100) : 0,
      },
      difficulty_index: Math.round((1 - solveRate) * 100) / 100,
    };
  });
}

// ─── 2. Problem Difficulty Calibration ───

function calibrateDifficulty(solveRate, avgAttempts, avgTimeSecs) {
  // Score from 0 (trivial) to 1 (extremely hard)
  const solveFactor = 1 - solveRate; // lower solve = harder
  const attemptFactor = Math.min(1, (avgAttempts - 1) / 5); // more attempts = harder
  const timeFactor = Math.min(1, avgTimeSecs / 600); // longer time = harder

  const score = Math.round(
    (solveFactor * 0.5 + attemptFactor * 0.3 + timeFactor * 0.2) * 100
  ) / 100;

  let label = 'Easy';
  if (score >= 0.65) label = 'Hard';
  else if (score >= 0.35) label = 'Medium';

  return { score, label };
}

// ─── 3. Pattern Transition Intelligence ───

/**
 * Analyze which patterns users struggle with after mastering another.
 * @param {Array} transitionData — [{ from_pattern, to_pattern, users_attempted,
 *   users_succeeded, avg_attempts_to_first_solve }]
 */
export function analyzePatternTransitions(transitionData) {
  return transitionData.map((t) => {
    const attempted = Number(t.users_attempted) || 1;
    const succeeded = Number(t.users_succeeded) || 0;
    const transitionRate = Math.round((succeeded / attempted) * 100) / 100;
    const avgAttempts = Math.round(Number(t.avg_attempts_to_first_solve || 0) * 10) / 10;

    let difficulty = 'smooth';
    if (transitionRate < 0.3) difficulty = 'hard';
    else if (transitionRate < 0.6) difficulty = 'moderate';

    return {
      from_pattern: t.from_pattern,
      to_pattern: t.to_pattern,
      users_attempted: attempted,
      users_succeeded: succeeded,
      transition_rate: transitionRate,
      avg_attempts: avgAttempts,
      difficulty,
      insight: transitionRate < 0.4
        ? `Users strong in ${t.from_pattern} often struggle with ${t.to_pattern} (${Math.round(transitionRate * 100)}% success)`
        : null,
    };
  }).sort((a, b) => a.transition_rate - b.transition_rate);
}

// ─── 4. Knowledge Graph Builder ───

/**
 * Build a knowledge graph connecting users, problems, patterns, errors.
 * Output is a set of typed nodes and edges for visualization/analysis.
 */
export function buildKnowledgeGraph(problemInsights, patternInsights, transitions) {
  const nodes = [];
  const edges = [];

  // Pattern nodes
  for (const p of patternInsights) {
    nodes.push({
      id: `pat:${p.pattern_slug}`, type: 'pattern',
      label: p.pattern_name, topic: p.topic_name,
      solve_rate: p.solve_rate, difficulty_index: p.difficulty_index,
    });
  }

  // Problem nodes
  for (const p of problemInsights) {
    nodes.push({
      id: `prob:${p.problem_id}`, type: 'problem',
      label: p.title, slug: p.slug, pattern: p.pattern_name,
      solve_rate: p.solve_rate, calibrated: p.calibrated_difficulty.label,
      dominant_failure: p.dominant_failure?.type || null,
    });
    // Problem → Pattern edge
    edges.push({
      from: `prob:${p.problem_id}`, to: `pat:${p.pattern_name?.toLowerCase().replace(/\s+/g,'-') || 'unknown'}`,
      type: 'belongs_to', weight: 1,
    });
  }

  // Transition edges
  for (const t of transitions) {
    edges.push({
      from: `pat:${t.from_pattern?.toLowerCase().replace(/\s+/g,'-') || ''}`,
      to: `pat:${t.to_pattern?.toLowerCase().replace(/\s+/g,'-') || ''}`,
      type: 'transition', weight: t.transition_rate,
      difficulty: t.difficulty,
    });
  }

  return {
    nodes, edges,
    summary: {
      total_patterns: patternInsights.length,
      total_problems: problemInsights.length,
      total_transitions: transitions.length,
      hardest_pattern: patternInsights.length > 0
        ? patternInsights.reduce((h, p) => p.difficulty_index > h.difficulty_index ? p : h, patternInsights[0])?.pattern_name
        : null,
      easiest_pattern: patternInsights.length > 0
        ? patternInsights.reduce((e, p) => p.difficulty_index < e.difficulty_index ? p : e, patternInsights[0])?.pattern_name
        : null,
    },
  };
}

// ─── 5. Cohort-Based Recommendation Scoring ───

/**
 * Score a candidate problem based on cohort intelligence.
 * Higher score = better recommendation.
 */
export function scoreCandidateWithCohort(candidate, problemInsights, userSolveRate) {
  const insight = problemInsights.find((p) => p.problem_id === candidate.id);
  if (!insight) return 0;

  let score = 0;

  // Prefer problems with moderate solve rate (challenging but achievable)
  const idealSolveRate = Math.max(0.2, Math.min(0.8, userSolveRate + 0.1));
  const solveDiff = Math.abs(insight.solve_rate - idealSolveRate);
  score += (1 - solveDiff) * 40; // 0-40 points

  // Prefer problems many users found valuable (high attempt + eventual solve)
  if (insight.solved_users > 3) score += 20;
  else if (insight.solved_users > 1) score += 10;

  // Penalize problems with very low solve rate for weaker users
  if (userSolveRate < 0.4 && insight.solve_rate < 0.2) score -= 15;

  // Prefer problems without dominant TLE (frustrating)
  if (insight.dominant_failure?.type === 'tle' && insight.dominant_failure.percentage > 60) score -= 10;

  return Math.round(score * 10) / 10;
}
