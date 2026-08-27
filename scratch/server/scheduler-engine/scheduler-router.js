import express from 'express';
import { isUuid, normalizeDate, normalizeName, resolveUserIdFromRequest, safeJsonParse } from '../domain-engine/request-context.js';

const router = express.Router();
const DB_RETRYABLE_CODES = new Set(['40001', '40P01', '53300', '57P03']);
const SCHEDULER_DB_MAX_RETRIES = Math.max(0, Number(process.env.SCHEDULER_DB_MAX_RETRIES || 2));
const SCHEDULER_DB_RETRY_BASE_MS = Math.max(20, Number(process.env.SCHEDULER_DB_RETRY_BASE_MS || 80));

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error) {
    const code = String(error?.code || '');
    return DB_RETRYABLE_CODES.has(code);
}

async function withPgRetry(operation) {
    for (let attempt = 1; attempt <= SCHEDULER_DB_MAX_RETRIES + 1; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (!isRetryableDbError(error) || attempt > SCHEDULER_DB_MAX_RETRIES) {
                throw error;
            }
            const waitMs = Math.min(1200, SCHEDULER_DB_RETRY_BASE_MS * (2 ** (attempt - 1)));
            await sleep(waitMs);
        }
    }

    throw new Error('Scheduler DB retry exhausted.');
}

async function runInTransaction(pgPool, work) {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const value = await work(client);
        await client.query('COMMIT');
        return value;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

async function safeQuery(pgPool, sql, params = []) {
    if (!pgPool) return [];
    try {
        const result = await pgPool.query(sql, params);
        return result.rows || [];
    } catch (_) {
        return [];
    }
}

async function resolveIdentity(req, explicitUserId = null) {
    const sessionUserId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
    const requested = String(explicitUserId || req.query?.userId || req.body?.userId || '').trim();
    const userUuid = isUuid(requested) ? requested : sessionUserId;

    const learningKeys = [requested, userUuid]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    return {
        userUuid,
        userKey: requested || userUuid,
        learningKeys: Array.from(new Set(learningKeys)),
    };
}

function mapTaskRow(row, source = 'scheduler_tasks') {
    const dueDate = row?.due_date instanceof Date
        ? row.due_date.toISOString().split('T')[0]
        : normalizeDate(row?.due_date, String(row?.due_date || ''));

    return {
        id: row.id,
        title: row.title,
        taskType: row.task_type,
        dueDate,
        status: row.status,
        source,
    };
}

function buildLearningDerivedTasks(state, targetDate) {
    const subjects = state?.subjects || {};
    const derived = [];

    for (const [subjectId, subjectState] of Object.entries(subjects)) {
        const queue = Array.isArray(subjectState?.revisionQueue) ? subjectState.revisionQueue : [];
        for (const entry of queue) {
            const dueDate = normalizeDate(entry?.dueDate || entry?.dueAt || entry?.nextReviewDate || null, null);
            if (!dueDate || dueDate !== targetDate) continue;
            if (entry?.done) continue;

            const topicId = normalizeName(entry?.topicId || entry?.topic || 'Revision Topic');
            derived.push({
                id: `derived-${subjectId}-${topicId}-${dueDate}`,
                title: `Revise ${topicId}`,
                taskType: 'revision',
                dueDate,
                status: 'pending',
                source: 'learning_progress',
            });
        }
    }

    return derived;
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scheduler-engine' });
});

router.get('/today', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req);
    const today = normalizeDate(new Date(), new Date().toISOString().split('T')[0]);

    const taskRows = await safeQuery(
        pgPool,
        `
            SELECT id, task_type, title, due_date, status
            FROM scheduler_tasks
            WHERE user_id = $1
                AND due_date = $2::date
            ORDER BY created_at ASC
        `,
        [identity.userUuid, today]
    );

    const dbTasks = taskRows.map((row) => mapTaskRow(row));

    const learningRows = identity.learningKeys.length
        ? await safeQuery(
                pgPool,
                `
                    SELECT state
                    FROM learning_progress
                    WHERE user_id = ANY($1::text[])
                    ORDER BY updated_at DESC
                    LIMIT 1
                `,
                [identity.learningKeys]
            )
        : [];

    const learningState = safeJsonParse(learningRows[0]?.state, {});
    const derivedTasks = buildLearningDerivedTasks(learningState, today);

    const allTasks = [...dbTasks, ...derivedTasks];

    return res.json({
        userId: identity.userUuid,
        date: today,
        tasks: allTasks,
        summary: {
            total: allTasks.length,
            pending: allTasks.filter((task) => task.status !== 'completed').length,
            completed: allTasks.filter((task) => task.status === 'completed').length,
        },
    });
});

async function createTaskHandler(req, res) {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req);

    const title = normalizeName(req.body?.title);
    const dueDate = normalizeDate(req.body?.dueDate, null);
    const taskType = normalizeName(req.body?.taskType || 'study').toLowerCase();

    if (!title || !dueDate) {
        return res.status(400).json({
            errorType: 'VALIDATION_ERROR',
            reason: 'title and dueDate are required.',
        });
    }

    if (!pgPool) {
        return res.status(503).json({
            errorType: 'DB_UNAVAILABLE',
            reason: 'Scheduler storage is unavailable.',
        });
    }

    try {
        const created = await withPgRetry(() => pgPool.query(
            `
                INSERT INTO scheduler_tasks (user_id, task_type, title, due_date, status)
                VALUES ($1, $2, $3, $4::date, 'pending')
                RETURNING id, task_type, title, due_date, status, created_at
            `,
            [identity.userUuid, taskType, title, dueDate]
        ));

        return res.status(201).json({
            status: 'created',
            task: mapTaskRow(created.rows[0]),
        });
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to create scheduler task.',
            likelyCause: error?.message || 'Unknown error',
        });
    }
}

router.post('/create', createTaskHandler);
router.post('/today/create', createTaskHandler);

router.get('/planner/:userId/daily', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req, req.params.userId);
    const date = normalizeDate(req.query?.date, normalizeDate(new Date(), null));

    const rows = await safeQuery(
        pgPool,
        `
            SELECT id, task_type, title, due_date, status
            FROM scheduler_tasks
            WHERE user_id = $1
                AND due_date = $2::date
            ORDER BY created_at ASC
        `,
        [identity.userUuid, date]
    );

    return res.json({
        userId: identity.userUuid,
        date,
        tasks: rows.map((row) => mapTaskRow(row)),
    });
});

router.post('/reminders/:userId', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    if (!pgPool) {
        return res.status(503).json({
            errorType: 'DB_UNAVAILABLE',
            reason: 'Scheduler storage is unavailable.',
        });
    }

    const identity = await resolveIdentity(req, req.params.userId);

    const learningRows = identity.learningKeys.length
        ? await safeQuery(
                pgPool,
                `
                    SELECT state
                    FROM learning_progress
                    WHERE user_id = ANY($1::text[])
                    ORDER BY updated_at DESC
                    LIMIT 1
                `,
                [identity.learningKeys]
            )
        : [];

    const learningState = safeJsonParse(learningRows[0]?.state, {});
    const subjects = learningState?.subjects || {};
    const candidates = [];
    for (const [subjectId, subjectState] of Object.entries(subjects)) {
        const queue = Array.isArray(subjectState?.revisionQueue) ? subjectState.revisionQueue : [];
        for (const entry of queue) {
            const dueDate = normalizeDate(entry?.dueDate || entry?.dueAt || entry?.nextReviewDate, null);
            if (!dueDate || entry?.done) continue;
            const topicId = normalizeName(entry?.topicId || entry?.topic || 'Revision Topic');
            candidates.push({
                title: `Revise ${topicId}`,
                dueDate,
            });
        }
    }

    const dedupedCandidates = Array.from(
        new Map(candidates.map((item) => [`${item.title}::${item.dueDate}`, item])).values()
    );

    let inserted = 0;
    try {
        inserted = await withPgRetry(() => runInTransaction(pgPool, async (client) => {
            let totalInserted = 0;
            for (const candidate of dedupedCandidates) {
                const insertedRows = await client.query(
                    `
                        INSERT INTO scheduler_tasks (user_id, task_type, title, due_date, status)
                        SELECT $1, 'revision', $2, $3::date, 'pending'
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM scheduler_tasks
                            WHERE user_id = $1
                                AND title = $2
                                AND due_date = $3::date
                                AND status IN ('pending', 'in_progress')
                        )
                        RETURNING id
                    `,
                    [identity.userUuid, candidate.title, candidate.dueDate]
                );
                totalInserted += insertedRows.rows.length;
            }
            return totalInserted;
        }));
    } catch (error) {
        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to synchronize reminders right now.',
            likelyCause: error?.message || 'Unknown error',
        });
    }

    return res.json({
        success: true,
        userId: identity.userUuid,
        inserted,
        message: 'Spaced repetition reminders synchronized from learning progress.',
    });
});

export default router;
