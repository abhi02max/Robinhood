/**
 * Controller layer — HTTP only.
 *
 * Validates request shape, calls the service, shapes the response to match
 * the public API contract, maps service errors to HTTP status codes.
 */

import {
  getAllTopics,
  getPatternsForTopic,
  getProblemsForPattern,
  getProblemWithVisibleTests,
  submitSolution,
  getProblemsIndex,
  getAttemptHistory,
  getPatternProgress,
  getMasteryDashboard,
  getNextRecommendation,
  getUserProfile,
  getLearningPath,
  getCodeAnalysis,
  getPerformanceSignals,
  getKnowledgeGraph,
  getCommunityInsights,
  getPredictions,
  NotFoundError,
  ValidationError,
} from './learning-service.js';
import { companies as COMPANY_CATALOG } from '../../src/data/companies.js';

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value, paramName) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    const err = new ValidationError(`Invalid UUID for ${paramName}: ${value}`);
    throw err;
  }
}

function handleError(res, error, fallbackContext = 'learning-engine') {
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: 'BadRequest', message: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: 'NotFound', message: error.message });
  }
  console.error(`[${fallbackContext}]`, error);
  return res.status(500).json({ error: 'InternalServerError', message: 'Database or executor failure' });
}

function getRequestUserId(req) {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    throw new ValidationError('Authenticated user context is required');
  }
  return userId;
}

// -------------------------------------------------------------------------
// GET /api/learning/topics
// -------------------------------------------------------------------------
export async function getTopics(req, res) {
  try {
    const topics = await getAllTopics();
    // Public response shape per spec: id, name, description, slug, order_index.
    // `progress` is reserved for a future user-aware enrichment step.
    const payload = topics.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      order_index: t.order_index,
      progress: null,
    }));
    res.json({ topics: payload, count: payload.length });
  } catch (e) {
    handleError(res, e, 'GET /topics');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/patterns/:topicId
// -------------------------------------------------------------------------
export async function getPatternsByTopic(req, res) {
  try {
    const { topicId } = req.params;
    assertUuid(topicId, 'topicId');

    const patterns = await getPatternsForTopic(topicId);

    const payload = patterns.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      explanation: p.explanation,
      when_to_use: p.when_to_use,
      intuition: p.intuition,
      order_index: p.order_index,
      problem_count: p.problem_count,
    }));
    res.json({ topic_id: topicId, patterns: payload, count: payload.length });
  } catch (e) {
    handleError(res, e, 'GET /patterns/:topicId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/problems/:patternId
// -------------------------------------------------------------------------
export async function getProblemsByPattern(req, res) {
  try {
    const { patternId } = req.params;
    assertUuid(patternId, 'patternId');

    const problems = await getProblemsForPattern(patternId);

    const payload = problems.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      tags: p.tags || [],
    }));
    res.json({ pattern_id: patternId, problems: payload, count: payload.length });
  } catch (e) {
    handleError(res, e, 'GET /problems/:patternId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/problem/:id
//
// The route param is interpreted as a problem SLUG (e.g. "two-sum"). UUID
// validation has been intentionally removed — slugs are URL-safe but not
// hex-shaped, so any non-empty string is acceptable here. The service will
// return NotFoundError → HTTP 404 if the slug doesn't match a row.
// -------------------------------------------------------------------------
export async function getProblemDetail(req, res) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new ValidationError('Problem slug is required');
    }

    const { problem, visible_test_cases } = await getProblemWithVisibleTests(id);

    // Strict response shape per spec — visible test cases ONLY.
    res.json({
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      description: problem.description,
      examples: problem.examples,
      constraints: problem.constraints,
      edge_cases: problem.edge_cases,
      approach_brute: problem.approach_brute,
      approach_optimal: problem.approach_optimal,
      time_complexity: problem.time_complexity,
      space_complexity: problem.space_complexity,
      starter_code: problem.starter_code,
      tags: problem.tags || [],
      test_cases: visible_test_cases.map((tc) => ({
        id: tc.id,
        input_payload: tc.input_payload,
        expected_output: tc.expected_output,
        order_index: tc.order_index,
      })),
    });
  } catch (e) {
    handleError(res, e, 'GET /problem/:id');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/problems-index
//
// Compact cross-cutting listing of every problem with its topic + pattern
// context. Drives the legacy-page migration (sheets, revision, concept-map,
// profile) so those clients no longer need to walk topic→pattern→problem
// themselves. Lightweight: ~150 problems × ~10 small fields ≈ <30 KB JSON.
// -------------------------------------------------------------------------
export async function getProblemsIndexHandler(req, res) {
  try {
    const rows = await getProblemsIndex();
    const problems = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      difficulty: r.difficulty,
      tags: r.tags || [],
      topic: {
        id: r.topic_id,
        slug: r.topic_slug,
        name: r.topic_name,
      },
      pattern: {
        id: r.pattern_id,
        slug: r.pattern_slug,
        name: r.pattern_name,
      },
    }));
    res.json({ ok: true, count: problems.length, problems });
  } catch (e) {
    handleError(res, e, 'GET /problems-index');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/companies
//
// Returns the company taxonomy (industry / tier / interview rounds /
// avg-difficulty / advertised problemCount).
//
// IMPORTANT — schema gap acknowledgment:
// The DB does not yet model a company ↔ problem join. `problems` only has
// algorithmic tags (e.g. "array", "binary-search"), not company tags. So
// the per-company `problems[]` array is INTENTIONALLY EMPTY in the response.
// The endpoint advertises this with the `schemaSupportsProblemMapping`
// flag so clients can render gracefully and we can flip the flag once a
// `problem_companies` join table lands.
// -------------------------------------------------------------------------
export async function getCompaniesHandler(req, res) {
  try {
    const companies = (COMPANY_CATALOG || []).map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      tier: c.tier,
      color: c.color,
      rounds: Array.isArray(c.rounds) ? c.rounds : [],
      avgDifficulty: c.avgDifficulty,
      problemCount: Number(c.problemCount || 0),
      problems: [], // populated once schema models company tagging
    }));
    res.json({
      ok: true,
      schemaSupportsProblemMapping: false,
      count: companies.length,
      companies,
    });
  } catch (e) {
    handleError(res, e, 'GET /companies');
  }
}

// -------------------------------------------------------------------------
// POST /api/learning/submit
// Body: { problem_id, code, language }
// -------------------------------------------------------------------------
export async function postSubmission(req, res) {
  try {
    const body = req.body || {};
    const problemId = body.problem_id || body.problemId;
    const code = body.code;
    const language = body.language;

    if (!problemId) throw new ValidationError('problem_id is required');
    assertUuid(problemId, 'problem_id');

    const userId = getRequestUserId(req);

    const result = await submitSolution({ userId, problemId, code, language });
    res.json(result);
  } catch (e) {
    handleError(res, e, 'POST /submit');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/attempts/:problemId
// -------------------------------------------------------------------------
export async function getAttemptsHandler(req, res) {
  try {
    const { problemId } = req.params;
    assertUuid(problemId, 'problemId');
    const userId = getRequestUserId(req);
    const result = await getAttemptHistory(userId, problemId);
    res.json(result);
  } catch (e) {
    handleError(res, e, 'GET /attempts/:problemId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/pattern-progress
// -------------------------------------------------------------------------
export async function getPatternProgressHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const patterns = await getPatternProgress(userId);
    res.json({ ok: true, patterns, count: patterns.length });
  } catch (e) {
    handleError(res, e, 'GET /pattern-progress');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/mastery
// -------------------------------------------------------------------------
export async function getMasteryHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const dashboard = await getMasteryDashboard(userId);
    res.json({ ok: true, ...dashboard });
  } catch (e) {
    handleError(res, e, 'GET /mastery');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/recommend/:problemId
// -------------------------------------------------------------------------
export async function getRecommendationHandler(req, res) {
  try {
    const { problemId } = req.params;
    assertUuid(problemId, 'problemId');
    const userId = getRequestUserId(req);
    const rec = await getNextRecommendation(userId, problemId);
    res.json({ ok: true, ...rec });
  } catch (e) {
    handleError(res, e, 'GET /recommend/:problemId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/profile
// -------------------------------------------------------------------------
export async function getUserProfileHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const profile = await getUserProfile(userId);
    res.json({ ok: true, ...profile });
  } catch (e) {
    handleError(res, e, 'GET /profile');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/learning-path
// -------------------------------------------------------------------------
export async function getLearningPathHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const path = await getLearningPath(userId);
    res.json({ ok: true, ...path });
  } catch (e) {
    handleError(res, e, 'GET /learning-path');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/code-analysis/:problemId
// -------------------------------------------------------------------------
export async function getCodeAnalysisHandler(req, res) {
  try {
    const { problemId } = req.params;
    assertUuid(problemId, 'problemId');
    const userId = getRequestUserId(req);
    const analysis = await getCodeAnalysis(userId, problemId);
    if (!analysis) return res.json({ ok: true, analysis: null });
    res.json({ ok: true, ...analysis });
  } catch (e) {
    handleError(res, e, 'GET /code-analysis/:problemId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/performance-signals
// -------------------------------------------------------------------------
export async function getPerformanceSignalsHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const signals = await getPerformanceSignals(userId);
    res.json({ ok: true, ...signals });
  } catch (e) {
    handleError(res, e, 'GET /performance-signals');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/knowledge-graph
// -------------------------------------------------------------------------
export async function getKnowledgeGraphHandler(req, res) {
  try {
    const data = await getKnowledgeGraph();
    res.json({ ok: true, ...data });
  } catch (e) {
    handleError(res, e, 'GET /knowledge-graph');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/community/:problemId
// -------------------------------------------------------------------------
export async function getCommunityInsightsHandler(req, res) {
  try {
    const { problemId } = req.params;
    assertUuid(problemId, 'problemId');
    const insights = await getCommunityInsights(problemId);
    res.json({ ok: true, ...(insights || {}) });
  } catch (e) {
    handleError(res, e, 'GET /community/:problemId');
  }
}

// -------------------------------------------------------------------------
// GET /api/learning/predictions
// -------------------------------------------------------------------------
export async function getPredictionsHandler(req, res) {
  try {
    const userId = getRequestUserId(req);
    const predictions = await getPredictions(userId);
    res.json({ ok: true, ...predictions });
  } catch (e) {
    handleError(res, e, 'GET /predictions');
  }
}
