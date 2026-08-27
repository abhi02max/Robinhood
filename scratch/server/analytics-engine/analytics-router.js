import express from 'express';
import { clamp, isUuid, resolveUserIdFromRequest, safeJsonParse } from '../domain-engine/request-context.js';

const router = express.Router();

async function safeQuery(pgPool, sql, params = []) {
    if (!pgPool) return [];
    try {
        const result = await pgPool.query(sql, params);
        return result.rows || [];
    } catch (_) {
        return [];
    }
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function computeLearningMastery(state) {
    const subjects = state?.subjects || {};
    const entries = Object.values(subjects);
    if (!entries.length) return null;

    let completedTopics = 0;
    let totalSignals = 0;

    for (const subjectState of entries) {
        const completed = Array.isArray(subjectState?.completedTopics)
            ? subjectState.completedTopics.length
            : 0;
        completedTopics += completed;

        const queue = Array.isArray(subjectState?.revisionQueue)
            ? subjectState.revisionQueue.length
            : 0;
        totalSignals += Math.max(completed + queue, completed + 1);
    }

    if (totalSignals <= 0) return null;
    return clamp(Math.round((completedTopics / totalSignals) * 100), 0, 100);
}

function mapStreakDays(activityByDate, days = 14) {
    const mapped = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const iso = date.toISOString().split('T')[0];
        const minutes = toNumber(activityByDate?.[iso]?.minutes || 0, 0);
        mapped.push({
            date: iso,
            minutes,
            active: minutes > 0,
        });
    }
    return mapped;
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

async function loadAnalyticsBundle(pgPool, identity) {
    const userProgressRows = await safeQuery(
        pgPool,
        `
            SELECT mastery_percentage, streak_days, last_activity_date, subject, created_at
            FROM user_progress
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `,
        [identity.userUuid]
    );

    const progressRows = await safeQuery(
        pgPool,
        `
            SELECT
                COUNT(*) FILTER (WHERE status IN ('Solved', 'Mastered'))::int AS solved_count,
                COUNT(*)::int AS attempted_count
            FROM progress
            WHERE user_id = $1
        `,
        [identity.userUuid]
    );

    const streakRows = await safeQuery(
        pgPool,
        `
            SELECT current_streak, max_streak, last_activity_date
            FROM streaks
            WHERE user_id = $1
            LIMIT 1
        `,
        [identity.userUuid]
    );

    const snapshotRows = await safeQuery(
        pgPool,
        `
            SELECT metrics, snapshot_date
            FROM analytics_snapshots
            WHERE user_id = $1
            ORDER BY snapshot_date DESC
            LIMIT 1
        `,
        [identity.userUuid]
    );

    const learningRows = identity.learningKeys.length
        ? await safeQuery(
                pgPool,
                `
                    SELECT user_id, state, updated_at
                    FROM learning_progress
                    WHERE user_id = ANY($1::text[])
                    ORDER BY updated_at DESC
                    LIMIT 1
                `,
                [identity.learningKeys]
            )
        : [];

    return {
        userProgress: userProgressRows[0] || null,
        progress: progressRows[0] || null,
        streak: streakRows[0] || null,
        snapshot: snapshotRows[0] || null,
        learning: learningRows[0] || null,
    };
}

function buildProgressResponse(bundle, identity) {
    const progress = bundle.progress || {};
    const solvedCount = toNumber(progress.solved_count, 0);
    const attemptedCount = toNumber(progress.attempted_count, 0);

    const solvedRatioMastery = attemptedCount > 0
        ? Math.round((solvedCount / attemptedCount) * 100)
        : null;

    const userMastery = toNumber(bundle.userProgress?.mastery_percentage, NaN);
    const learningState = safeJsonParse(bundle.learning?.state, {});
    const learningMastery = computeLearningMastery(learningState);

    const mastery = Number.isFinite(userMastery)
        ? clamp(userMastery, 0, 100)
        : (learningMastery != null ? learningMastery : clamp(solvedRatioMastery || 0, 0, 100));

    const streakFromTable = toNumber(bundle.streak?.current_streak, NaN);
    const streakFromProgress = toNumber(bundle.userProgress?.streak_days, NaN);
    const streakFromLearning = toNumber(learningState?.streak?.current, 0);

    const streak = Number.isFinite(streakFromTable)
        ? streakFromTable
        : (Number.isFinite(streakFromProgress) ? streakFromProgress : streakFromLearning);

    const updatedAt = bundle.learning?.updated_at || bundle.userProgress?.created_at || null;

    return {
        userId: identity.userUuid,
        mastery,
        streak,
        solvedCount,
        attemptedCount,
        updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
    };
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-engine' });
});

router.get('/progress', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req);

    const bundle = await loadAnalyticsBundle(pgPool, identity);
    const response = buildProgressResponse(bundle, identity);

    return res.json(response);
});

router.get('/streaks', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req);
    const bundle = await loadAnalyticsBundle(pgPool, identity);

    const learningState = safeJsonParse(bundle.learning?.state, {});
    const snapshotMetrics = safeJsonParse(bundle.snapshot?.metrics, {});
    const activityByDate = learningState?.activityByDate || snapshotMetrics?.activityByDate || {};

    const currentStreak = toNumber(bundle.streak?.current_streak, toNumber(learningState?.streak?.current, 0));
    const longestStreak = toNumber(bundle.streak?.max_streak, toNumber(learningState?.streak?.longest, currentStreak));

    return res.json({
        userId: identity.userUuid,
        currentStreak,
        longestStreak,
        mappedDays: mapStreakDays(activityByDate, 14),
    });
});

router.get('/progress/:userId', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req, req.params.userId);

    const bundle = await loadAnalyticsBundle(pgPool, identity);
    const response = buildProgressResponse(bundle, identity);

    return res.json(response);
});

router.get('/readiness/:userId/:companyId', async (req, res) => {
    const pgPool = req.app?.locals?.pgPool || null;
    const identity = await resolveIdentity(req, req.params.userId);
    const companyId = String(req.params.companyId || 'general').trim();

    const bundle = await loadAnalyticsBundle(pgPool, identity);
    const progress = buildProgressResponse(bundle, identity);

    const categoryRows = await safeQuery(
        pgPool,
        `
            SELECT
                COALESCE(NULLIF(TRIM(p.category), ''), 'General') AS category,
                COUNT(*) FILTER (WHERE pr.status IN ('Solved', 'Mastered'))::int AS solved_count,
                COUNT(*)::int AS attempted_count
            FROM progress pr
            LEFT JOIN problems p ON p.id::text = pr.problem_id::text
            WHERE pr.user_id = $1
            GROUP BY 1
            ORDER BY attempted_count DESC, solved_count ASC
        `,
        [identity.userUuid]
    );

    const weakSpots = categoryRows
        .filter((row) => toNumber(row.attempted_count, 0) > 0)
        .map((row) => {
            const solved = toNumber(row.solved_count, 0);
            const attempted = toNumber(row.attempted_count, 0);
            return {
                category: row.category,
                solved,
                attempted,
                ratio: attempted > 0 ? solved / attempted : 0,
            };
        })
        .filter((row) => row.ratio < 0.55)
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 3)
        .map((row) => row.category);

    const readiness = clamp(
        Math.round(
            (progress.mastery * 0.65) +
            (clamp(progress.streak, 0, 30) * 1.1) +
            (Math.min(progress.solvedCount, 40) * 0.8)
        ),
        0,
        100
    );

    return res.json({
        userId: identity.userUuid,
        companyId,
        readiness,
        weakSpots: weakSpots.length ? weakSpots : ['Problem solving speed', 'Edge-case articulation'],
        metrics: {
            mastery: progress.mastery,
            streak: progress.streak,
            solvedCount: progress.solvedCount,
            attemptedCount: progress.attemptedCount,
        },
    });
});

export default router;
