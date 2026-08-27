import express from 'express';
import { z } from 'zod';
import { debugQuery } from './sql-debugger.js';
import { explainError } from './ai-debug-explainer.js';
import { analyzeRuntime } from './runtime-analyzer.js';
import { buildTraceFromOutput, parseStackTrace } from './trace-parser.js';
import pistonExecution from '../execution/piston.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { createRequestTimeoutMiddleware } from '../middleware/request-timeout.js';
import { resolveUserIdFromRequest } from '../domain-engine/request-context.js';

const router = express.Router();

const DEBUG_CODE_MAX_BYTES = Math.max(1_024, Number(process.env.DEBUG_CODE_MAX_BYTES || 80_000));
const DEBUG_STDIN_MAX_BYTES = Math.max(256, Number(process.env.DEBUG_STDIN_MAX_BYTES || 20_000));
const DEBUG_ERROR_MAX_BYTES = Math.max(256, Number(process.env.DEBUG_ERROR_MAX_BYTES || 40_000));
const DEBUG_RUN_TIMEOUT_MS = Math.max(1000, Number(process.env.DEBUG_RUN_TIMEOUT_MS || 25000));
const DEBUG_SQL_TIMEOUT_MS = Math.max(1000, Number(process.env.DEBUG_SQL_TIMEOUT_MS || 12000));
const DEBUG_EXPLAIN_TIMEOUT_MS = Math.max(1000, Number(process.env.DEBUG_EXPLAIN_TIMEOUT_MS || 12000));
const SUPPORTED_LANGUAGES = new Set(['python', 'javascript', 'cpp', 'java', 'c']);

const runRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'debugger-run',
    maxRequests: Math.max(1, Number(process.env.DEBUG_RUN_RATE_LIMIT_MAX || 60)),
    windowSeconds: Math.max(1, Number(process.env.DEBUG_RATE_LIMIT_WINDOW_SECONDS || 60)),
    keyByUser: true,
});

const sqlRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'debugger-sql',
    maxRequests: Math.max(1, Number(process.env.DEBUG_SQL_RATE_LIMIT_MAX || 40)),
    windowSeconds: Math.max(1, Number(process.env.DEBUG_RATE_LIMIT_WINDOW_SECONDS || 60)),
    keyByUser: true,
});

const explainRateLimiter = createRateLimitMiddleware({
    prefix: 'api',
    bucket: 'debugger-explain',
    maxRequests: Math.max(1, Number(process.env.DEBUG_EXPLAIN_RATE_LIMIT_MAX || 30)),
    windowSeconds: Math.max(1, Number(process.env.DEBUG_RATE_LIMIT_WINDOW_SECONDS || 60)),
    keyByUser: true,
});

const runTimeoutGuard = createRequestTimeoutMiddleware(DEBUG_RUN_TIMEOUT_MS, {
    message: 'Debugger execution timed out.',
});

const sqlTimeoutGuard = createRequestTimeoutMiddleware(DEBUG_SQL_TIMEOUT_MS, {
    message: 'Debugger SQL analysis timed out.',
});

const explainTimeoutGuard = createRequestTimeoutMiddleware(DEBUG_EXPLAIN_TIMEOUT_MS, {
    message: 'Debugger explanation timed out.',
});

const runRequestSchema = z.object({
    language: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional(),
    source: z.union([z.string(), z.number()]).optional(),
    stdin: z.union([z.string(), z.number()]).optional(),
}).strip();

const sqlRequestSchema = z.object({
    query: z.union([z.string(), z.number()]),
}).strip();

const explainRequestSchema = z.object({
    error: z.union([z.string(), z.number()]),
    code: z.union([z.string(), z.number()]).optional(),
}).strip();

const languageAliasMap = {
    js: 'javascript',
    node: 'javascript',
    py: 'python',
    cplusplus: 'cpp',
    'c++': 'cpp',
};

function normalizeLanguage(rawLanguage) {
    const normalized = String(rawLanguage || '').trim().toLowerCase();
    return languageAliasMap[normalized] || normalized;
}

function toSafeString(value, maxBytes) {
    return String(value ?? '').slice(0, maxBytes);
}

function parseWithSchema(schema, payload) {
    const parsed = schema.parse(payload || {});
    return parsed;
}

function validationError(res, reason) {
    return res.status(400).json({
        errorType: 'VALIDATION_ERROR',
        reason,
    });
}

function inferLanguage(requestedLanguage, code) {
    const requested = normalizeLanguage(requestedLanguage);
    if (SUPPORTED_LANGUAGES.has(requested)) {
        return requested;
    }

    const source = String(code || '');
    if (/^\s*#include\s+<.+>/m.test(source) || /std::/m.test(source)) return 'cpp';
    if (/\bpublic\s+class\s+[A-Z][A-Za-z0-9_]*\b/m.test(source) || /System\.out\.print/mi.test(source)) return 'java';
    if (/^\s*#include\s+<stdio\.h>/m.test(source) || /\bprintf\s*\(/m.test(source)) return 'c';
    if (/\bconsole\.log\(|\bfunction\s+|=>/m.test(source)) return 'javascript';
    if (/^\s*def\s+[a-zA-Z_]/m.test(source) || /\bprint\s*\(/m.test(source)) return 'python';
    return 'python';
}

function normalizeExecutionPayload(raw) {
    const run = raw?.run || raw || {};
    const stdout = String(run.stdout || '');
    const stderr = String(run.stderr || '');
    const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n').trim();
    const exitCode = typeof run.code === 'number' ? run.code : null;

    return {
        stdout,
        stderr,
        output: combined,
        exitCode,
        success: exitCode === 0 && !stderr.trim(),
        durationMs: Number(run.wall_time || 0),
        memory: Number(run.memory || 0),
    };
}

function getRequestId(req) {
    if (req?.requestId) {
        return req.requestId;
    }

    const candidate = req?.headers?.['x-request-id'];
    if (Array.isArray(candidate)) {
        return String(candidate[0] || '').trim() || null;
    }
    const resolved = String(candidate || '').trim();
    return resolved || null;
}

function emitDebuggerTelemetry(req, payload) {
    const telemetry = req.app?.locals?.telemetryRecorder;
    if (!telemetry || typeof telemetry.recordExecution !== 'function') {
        return;
    }

    telemetry.recordExecution({
        endpoint: payload?.endpoint || 'debugger',
        provider: payload?.provider || 'debugger-engine',
        ...payload,
    });
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'debugger-engine' });
});

router.post('/run', runRateLimiter, runTimeoutGuard, async (req, res) => {
    const startedAt = Date.now();
    let parsed;
    try {
        parsed = parseWithSchema(runRequestSchema, req.body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return validationError(res, error.issues?.[0]?.message || 'Invalid debugger run payload.');
        }
        return validationError(res, 'Invalid debugger run payload.');
    }

    const code = toSafeString(parsed.code ?? parsed.source ?? '', DEBUG_CODE_MAX_BYTES).trim();
    if (!code) {
        return validationError(res, 'Code snippet is required to run debugger trace.');
    }

    const language = inferLanguage(parsed.language, code);

    try {
        const rawExecution = await pistonExecution.runCode({
            language,
            code,
            stdin: toSafeString(parsed.stdin ?? '', DEBUG_STDIN_MAX_BYTES),
        });
        const normalized = normalizeExecutionPayload(rawExecution);

        const trace = buildTraceFromOutput(normalized.output || normalized.stdout);
        const runtime = analyzeRuntime({
            code,
            executionResult: {
                output: normalized.stdout,
                stderr: normalized.stderr,
            },
        });

        const parsedError = normalized.stderr
            ? parseStackTrace(normalized.stderr)
            : null;

        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-run',
            provider: 'piston',
            language,
            success: normalized.success,
            verdict: normalized.success ? 'Accepted' : 'Runtime Error',
            error: normalized.success ? null : normalized.stderr || normalized.output || 'Runtime error',
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 200,
        });

        return res.json({
            status: normalized.success ? 'ok' : 'runtime_error',
            success: normalized.success,
            language,
            output: normalized.output || '(no output)',
            stdout: normalized.stdout,
            stderr: normalized.stderr,
            exitCode: normalized.exitCode,
            durationMs: normalized.durationMs,
            memoryBytes: normalized.memory,
            trace,
            watch: runtime.watch,
            states: runtime.states,
            finalState: runtime.final,
            parsedError,
        });
    } catch (error) {
        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-run',
            provider: 'piston',
            language,
            success: false,
            verdict: 'System Error',
            error: error?.message || 'Unknown execution error',
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 500,
        });

        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to execute code for debugger trace.',
            likelyCause: error?.message || 'Unknown execution error',
        });
    }
});

router.post('/sql', sqlRateLimiter, sqlTimeoutGuard, async (req, res) => {
    const startedAt = Date.now();
    let parsed;
    try {
        parsed = parseWithSchema(sqlRequestSchema, req.body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return validationError(res, error.issues?.[0]?.message || 'Invalid SQL debug payload.');
        }
        return validationError(res, 'Invalid SQL debug payload.');
    }

    const query = toSafeString(parsed.query, 5_000).trim();
    if (!query) {
        return validationError(res, 'SQL query is required.');
    }

    try {
        const result = await debugQuery(query);
        if (!result.valid) {
            emitDebuggerTelemetry(req, {
                endpoint: 'debugger-sql',
                provider: 'sql',
                language: 'sql',
                success: false,
                verdict: 'Validation Error',
                error: result.reason || 'Invalid SQL query',
                requestId: getRequestId(req),
                durationMs: Date.now() - startedAt,
                statusCode: 400,
            });
            return res.status(400).json(result);
        }

        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-sql',
            provider: 'sql',
            language: 'sql',
            success: true,
            verdict: 'Accepted',
            error: null,
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 200,
        });
        return res.json(result);
    } catch (error) {
        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-sql',
            provider: 'sql',
            language: 'sql',
            success: false,
            verdict: 'System Error',
            error: error?.message || 'Debugger SQL engine error',
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 500,
        });

        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to debug SQL query right now.',
            likelyCause: error?.message || 'Debugger SQL engine error',
        });
    }
});

router.post('/explain', explainRateLimiter, explainTimeoutGuard, async (req, res) => {
    const startedAt = Date.now();
    let parsed;
    try {
        parsed = parseWithSchema(explainRequestSchema, req.body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return validationError(res, error.issues?.[0]?.message || 'Invalid debugger explain payload.');
        }
        return validationError(res, 'Invalid debugger explain payload.');
    }

    const rawError = toSafeString(parsed.error, DEBUG_ERROR_MAX_BYTES).trim();
    const code = toSafeString(parsed.code ?? '', DEBUG_CODE_MAX_BYTES).trim();

    if (!rawError) {
        return validationError(res, 'Runtime error payload is required for explanation.');
    }

    try {
        const trace = parseStackTrace(rawError);
        const userId = await resolveUserIdFromRequest(req, { allowAnonymous: true });
        const explanation = await explainError(trace, code, {
            redisClient: req.app?.locals?.redisClient || null,
            userId,
        });

        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-explain',
            provider: 'debugger-engine',
            language: explanation?.language || null,
            success: true,
            verdict: 'Accepted',
            error: null,
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 200,
        });

        return res.json({
            ...explanation,
            trace,
        });
    } catch (error) {
        emitDebuggerTelemetry(req, {
            endpoint: 'debugger-explain',
            provider: 'debugger-engine',
            language: null,
            success: false,
            verdict: 'System Error',
            error: error?.message || 'Debugger explanation failure',
            requestId: getRequestId(req),
            durationMs: Date.now() - startedAt,
            statusCode: 500,
        });

        return res.status(500).json({
            errorType: 'SERVER_ERROR',
            reason: 'Unable to generate debugger explanation right now.',
            likelyCause: error?.message || 'Debugger explanation failure',
        });
    }
});

export default router;
