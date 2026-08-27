/**
 * Express router for the learning curriculum API.
 *
 * Mounted at `/api/learning` from server/index.js.
 *
 *   GET  /topics
 *   GET  /patterns/:topicId
 *   GET  /problems/:patternId
 *   GET  /problem/:id
 *   GET  /problems-index           — compact cross-cutting projection
 *   GET  /companies                — company taxonomy
 *   POST /submit
 */

import express from 'express';
import {
  getTopics,
  getPatternsByTopic,
  getProblemsByPattern,
  getProblemDetail,
  getProblemsIndexHandler,
  getCompaniesHandler,
  postSubmission,
  getAttemptsHandler,
  getPatternProgressHandler,
  getMasteryHandler,
  getRecommendationHandler,
  getUserProfileHandler,
  getLearningPathHandler,
  getCodeAnalysisHandler,
  getPerformanceSignalsHandler,
  getKnowledgeGraphHandler,
  getCommunityInsightsHandler,
  getPredictionsHandler,
} from './learning-controller.js';

const router = express.Router();

async function requireAuthenticatedUser(req, res, next) {
  if (req.user?.userId || req.user?.id) return next();

  const requireAuth = req.app?.locals?.requireAuth;
  if (typeof requireAuth !== 'function') {
    return res.status(503).json({
      errorType: 'AUTH_UNAVAILABLE',
      reason: 'Authentication is not ready. Please retry shortly.',
      requestId: req.requestId || null,
    });
  }

  return requireAuth(req, res, next);
}

// Read endpoints (target: <200ms — single-query or two-query paths)
router.get('/topics',                    getTopics);
router.get('/patterns/:topicId',         getPatternsByTopic);
router.get('/problems/:patternId',       getProblemsByPattern);
router.get('/problem/:id',               getProblemDetail);

// Cross-cutting read endpoints (introduced for the legacy-page migration)
router.get('/problems-index',            getProblemsIndexHandler);
router.get('/companies',                 getCompaniesHandler);

// Write endpoint
router.post('/submit', requireAuthenticatedUser, express.json({ limit: '256kb' }), postSubmission);

// Phase 4: Learning Loop read endpoints
router.get('/attempts/:problemId',       requireAuthenticatedUser, getAttemptsHandler);
router.get('/pattern-progress',          requireAuthenticatedUser, getPatternProgressHandler);

// Phase 5: Adaptive Learning Engine
router.get('/mastery',                   requireAuthenticatedUser, getMasteryHandler);
router.get('/recommend/:problemId',      requireAuthenticatedUser, getRecommendationHandler);

// Phase 6: Intelligence Layer
router.get('/profile',                   requireAuthenticatedUser, getUserProfileHandler);
router.get('/learning-path',             requireAuthenticatedUser, getLearningPathHandler);

// Phase 7: Code Intelligence Engine
router.get('/code-analysis/:problemId',  requireAuthenticatedUser, getCodeAnalysisHandler);
router.get('/performance-signals',       requireAuthenticatedUser, getPerformanceSignalsHandler);

// Phase 8: Knowledge Graph + Cross-User Intelligence
router.get('/knowledge-graph',           getKnowledgeGraphHandler);
router.get('/community/:problemId',      getCommunityInsightsHandler);

// Phase 9: Predictive Intelligence
router.get('/predictions',               requireAuthenticatedUser, getPredictionsHandler);

export default router;
