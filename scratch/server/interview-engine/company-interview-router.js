import express from 'express';
import { startMockSession } from './mock-session-engine.js';
import { resolveUserIdFromRequest } from '../domain-engine/request-context.js';

const router = express.Router();

router.post('/company/:companyId', async (req, res) => {
    const context = {
        pgPool: req.app?.locals?.pgPool || null,
        redisClient: req.app?.locals?.redisClient || null,
    };

    try {
    const { companyId } = req.params;
        const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
        const session = await startMockSession('company', { ...(req.body || {}), companyId, userId }, context);
        return res.json(session);
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to create company-focused interview session.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
});

export default router;
