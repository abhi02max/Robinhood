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
        const session = await startMockSession('behavioral', { company, userId }, getContext(req));
        return res.json(session);
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to initialize behavioral round session.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
        const session = await startMockSession(
            'behavioral',
            { ...(req.body || {}), userId },
            getContext(req)
        );
        return res.json(session);
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to create behavioral round session.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
});

export default router;
