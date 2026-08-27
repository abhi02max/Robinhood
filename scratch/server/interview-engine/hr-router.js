import express from 'express';
import { startMockSession } from './mock-session-engine.js';
import { resolveUserIdFromRequest } from '../domain-engine/request-context.js';

const router = express.Router();

function getContext(req) {
    return {
        pgPool: req.app?.locals?.pgPool || null,
        redisClient: req.app?.locals?.redisClient || null,
    };
}

router.get('/:company', async (req, res) => {
    try {
        const { company } = req.params;
        const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
        const session = await startMockSession('hr', { company, userId }, getContext(req));
        return res.json(session);
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to initialize HR round session.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
        const session = await startMockSession(
            'hr',
            { ...(req.body || {}), userId },
            getContext(req)
        );
        return res.json(session);
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to create HR round session.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
});

export default router;
