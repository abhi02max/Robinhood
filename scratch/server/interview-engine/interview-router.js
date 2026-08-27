import express from 'express';
import technicalRouter from './technical-router.js';
import behavioralRouter from './behavioral-router.js';
import hrRouter from './hr-router.js';
import companyInterviewRouter from './company-interview-router.js';
import { startMockSession } from './mock-session-engine.js';
import { resolveUserIdFromRequest } from '../domain-engine/request-context.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'interview-engine' });
});

router.use('/technical', technicalRouter);
router.use('/behavioral', behavioralRouter);
router.use('/hr', hrRouter);
router.use('/', companyInterviewRouter);

router.post('/mock-session', async (req, res) => {
  const context = {
    pgPool: req.app?.locals?.pgPool || null,
    redisClient: req.app?.locals?.redisClient || null,
  };

  try {
    const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
    const session = await startMockSession(
      req.body?.type || 'technical',
      { ...(req.body || {}), userId },
      context
    );
    return res.json(session);
  } catch (error) {
    return res.status(500).json({
      errorType: 'SERVER_ERROR',
      reason: 'Unable to create mock interview session.',
      likelyCause: error?.message || 'Unknown error',
    });
  }
});

export default router;
