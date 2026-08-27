import { randomUUID } from 'crypto';
import { orchestrateAIRequest } from '../ai-gateway.js';
import { isUuid, normalizeName } from '../domain-engine/request-context.js';

const ROUND_TYPE_MAP = {
    technical: 'technical',
    behavioral: 'behavioral',
    hr: 'hr',
    company: 'company',
};

const DB_RETRYABLE_CODES = new Set(['40001', '40P01', '53300', '57P03']);
const INTERVIEW_DB_MAX_RETRIES = Math.max(0, Number(process.env.INTERVIEW_DB_MAX_RETRIES || 2));
const INTERVIEW_DB_RETRY_BASE_MS = Math.max(20, Number(process.env.INTERVIEW_DB_RETRY_BASE_MS || 80));

const ROUND_FOCUS = {
    technical: [
        'clarify constraints before coding',
        'derive brute force then optimize',
        'state complexity and edge cases',
    ],
    behavioral: [
        'use STAR structure with metrics',
        'show ownership and collaboration',
        'highlight decision trade-offs',
    ],
    hr: [
        'role motivation and long-term fit',
        'compensation and offer expectations',
        'communication clarity under pressure',
    ],
    company: [
        'company-specific product understanding',
        'team fit and impact narrative',
        'alignment to role expectations',
    ],
};

function normalizeInterviewType(type) {
    const normalized = normalizeName(type).toLowerCase();
    return ROUND_TYPE_MAP[normalized] || 'technical';
}

function normalizeCompany(payload) {
    return normalizeName(
        payload?.company ||
        payload?.companyId ||
        payload?.companyName ||
        'General'
    ) || 'General';
}

function fallbackPrompt(type, company) {
    if (type === 'technical') {
        return `You are interviewing for ${company}. Let's begin: given a list of integers, design a solution to find the longest contiguous segment with at most two distinct values. Explain brute force first, then optimize.`;
    }
    if (type === 'behavioral') {
        return `You are interviewing for ${company}. Tell me about a time you disagreed with a senior engineer. What was the conflict, how did you navigate it, and what measurable outcome changed?`;
    }
    if (type === 'hr') {
        return `You are interviewing for ${company}. Why this role, why now, and how does it fit your 2-year growth plan? Keep your answer concise and role-specific.`;
    }
    return `You are interviewing for ${company}. Start with a short intro and then explain one project impact that directly maps to this company's engineering culture.`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error) {
    const code = String(error?.code || '');
    return DB_RETRYABLE_CODES.has(code);
}

async function withPgRetry(operation) {
    for (let attempt = 1; attempt <= INTERVIEW_DB_MAX_RETRIES + 1; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (!isRetryableDbError(error) || attempt > INTERVIEW_DB_MAX_RETRIES) {
                throw error;
            }
            const waitMs = Math.min(1200, INTERVIEW_DB_RETRY_BASE_MS * (2 ** (attempt - 1)));
            await sleep(waitMs);
        }
    }

    throw new Error('Interview session persistence retry exhausted.');
}

async function generateInitialPrompt(redisClient, { type, company, payload }) {
    const systemPrompt = [
        'You are a strict but constructive interviewer.',
        'Return exactly one first interview question only.',
        'Question must be realistic, specific, and high-signal.',
        'No prefacing, no markdown, no bullet points.',
    ].join(' ');

    const userPrompt = [
        `Round Type: ${type}`,
        `Company: ${company}`,
        `Candidate Context: ${normalizeName(payload?.candidateContext || payload?.context || 'N/A')}`,
        `Preferred Difficulty: ${normalizeName(payload?.difficulty || 'medium')}`,
        'Generate the first interviewer question.',
    ].join('\n');

    const result = await orchestrateAIRequest(redisClient, {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        userId: payload?.userId || 'interview-engine',
        problemId: `${company}:${type}`,
        actionType: 'interview-opening-question',
        options: {
            temperature: 0.35,
            maxTokens: 180,
        },
    });

    if (!result?.success || !result.content) {
        return {
            prompt: fallbackPrompt(type, company),
            provider: 'fallback',
            model: null,
            cached: false,
        };
    }

    return {
        prompt: String(result.content).replace(/\s+/g, ' ').trim(),
        provider: result.provider,
        model: result.model,
        cached: Boolean(result.fromCache),
    };
}

async function persistSession(pgPool, session) {
    if (!pgPool || !isUuid(session.userId)) {
        return null;
    }

    const result = await withPgRetry(() => pgPool.query(
        `
            INSERT INTO mock_interviews (user_id, session_type, company, transcript, ai_feedback, score)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
            RETURNING id, created_at
        `,
        [
            session.userId,
            session.type,
            session.company,
            JSON.stringify(session.transcript || []),
            JSON.stringify(session.aiFeedback || {}),
            session.score || null,
        ]
    ));

    return result.rows?.[0] || null;
}

export async function startMockSession(type, payload = {}, context = {}) {
    const normalizedType = normalizeInterviewType(type || payload?.type);
    const company = normalizeCompany(payload);
    const now = new Date().toISOString();
    const userId = isUuid(payload?.userId)
        ? payload.userId
        : (isUuid(context?.userId) ? context.userId : null);

    const ai = await generateInitialPrompt(context?.redisClient || null, {
        type: normalizedType,
        company,
        payload,
    }).catch(() => ({
        prompt: fallbackPrompt(normalizedType, company),
        provider: 'fallback',
        model: null,
        cached: false,
    }));

    const transcript = [
        {
            role: 'interviewer',
            message: ai.prompt,
            createdAt: now,
        },
    ];

    const baseSession = {
        sessionId: randomUUID(),
        type: normalizedType,
        company,
        status: 'started',
        initialPrompt: ai.prompt,
        transcript,
        roundFocus: ROUND_FOCUS[normalizedType] || ROUND_FOCUS.technical,
        expectedDurationMins: normalizedType === 'technical' ? 45 : 30,
        provider: ai.provider,
        model: ai.model,
        cached: ai.cached,
        createdAt: now,
        userId,
        aiFeedback: {
            readinessChecklist: ROUND_FOCUS[normalizedType] || [],
            nextAction: 'Answer in a structured way, then request feedback on one weak point.',
        },
        score: null,
    };

    let persisted = null;
    try {
        persisted = await persistSession(context?.pgPool || null, baseSession);
    } catch (_) {
        persisted = null;
    }

    return {
        sessionId: persisted?.id ? `mock-${persisted.id}` : baseSession.sessionId,
        type: baseSession.type,
        company: baseSession.company,
        status: baseSession.status,
        initialPrompt: baseSession.initialPrompt,
        transcript: baseSession.transcript,
        roundFocus: baseSession.roundFocus,
        expectedDurationMins: baseSession.expectedDurationMins,
        provider: baseSession.provider,
        model: baseSession.model,
        cached: baseSession.cached,
        persisted: Boolean(persisted?.id),
        createdAt: persisted?.created_at || baseSession.createdAt,
    };
}

export { normalizeInterviewType };
