// Execution Router
// Handles /api/execute/* endpoints and delegates to piston, judge0, or sql modules
import express from 'express';
import piston from './piston.js';
import judge0 from './judge0.js';
import sql from './sql.js';
import normalizeExecutionResult from './normalize.js';
import * as security from './security.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { createRequestTimeoutMiddleware } from '../middleware/request-timeout.js';
import {
  runCode as facadeRunCode,
  submitCode as facadeSubmitCode,
  NotFoundError,
  ValidationError,
} from './execution-service.js';
const router = express.Router();
const SUBMIT_FALLBACK_MAX_CASES = Math.max(1, Number(process.env.EXEC_SUBMIT_FALLBACK_MAX_CASES || 50));
const JUDGE0_INFRA_FAILURE_PATTERN = /(judge0 request failed \(5\d{2}\)|econnrefused|enotfound|timed out|timeout|temporarily unavailable|no such file|read-only file system|cannot create|failed to create|service unavailable|provider unavailable|internal error|socket hang up)/i;
const TRANSIENT_CPP_FALLBACK_PATTERN = /(device guard policy|spawn unknown|failed to start compiled c\+\+ program|access is denied)/i;
const TRANSIENT_CPP_MAX_ATTEMPTS = Math.max(1, Number(process.env.EXEC_CPP_TRANSIENT_MAX_ATTEMPTS || 3));
const RUN_RATE_LIMIT_MAX = Math.max(1, Number(process.env.EXEC_RUN_RATE_LIMIT_MAX || 90));
const SUBMIT_RATE_LIMIT_MAX = Math.max(1, Number(process.env.EXEC_SUBMIT_RATE_LIMIT_MAX || 45));
const SQL_RATE_LIMIT_MAX = Math.max(1, Number(process.env.EXEC_SQL_RATE_LIMIT_MAX || 40));
const EXEC_RATE_LIMIT_WINDOW_SECONDS = Math.max(1, Number(process.env.EXEC_RATE_LIMIT_WINDOW_SECONDS || 60));
const EXEC_RUN_TIMEOUT_MS = Math.max(1000, Number(process.env.EXEC_RUN_TIMEOUT_MS || 25000));
const EXEC_SUBMIT_TIMEOUT_MS = Math.max(1000, Number(process.env.EXEC_SUBMIT_TIMEOUT_MS || 35000));
const EXEC_SQL_TIMEOUT_MS = Math.max(1000, Number(process.env.EXEC_SQL_TIMEOUT_MS || 15000));

const runRateLimiter = createRateLimitMiddleware({
  prefix: 'api',
  bucket: 'execute-run',
  maxRequests: RUN_RATE_LIMIT_MAX,
  windowSeconds: EXEC_RATE_LIMIT_WINDOW_SECONDS,
  keyByUser: true,
});

const submitRateLimiter = createRateLimitMiddleware({
  prefix: 'api',
  bucket: 'execute-submit',
  maxRequests: SUBMIT_RATE_LIMIT_MAX,
  windowSeconds: EXEC_RATE_LIMIT_WINDOW_SECONDS,
  keyByUser: true,
});

const sqlRateLimiter = createRateLimitMiddleware({
  prefix: 'api',
  bucket: 'execute-sql',
  maxRequests: SQL_RATE_LIMIT_MAX,
  windowSeconds: EXEC_RATE_LIMIT_WINDOW_SECONDS,
  keyByUser: true,
});

const runTimeoutGuard = createRequestTimeoutMiddleware(EXEC_RUN_TIMEOUT_MS, {
  message: 'Execution timed out while running code.',
});

const submitTimeoutGuard = createRequestTimeoutMiddleware(EXEC_SUBMIT_TIMEOUT_MS, {
  message: 'Execution timed out while submitting code.',
});

const sqlTimeoutGuard = createRequestTimeoutMiddleware(EXEC_SQL_TIMEOUT_MS, {
  message: 'Execution timed out while running SQL.',
});

function getRequestId(req) {
  return req.requestId || req.headers['x-request-id'] || null;
}

function logExecution(event, payload) {
  console.log(`[Execution Router] ${event}`, JSON.stringify(payload));
}

function emitExecutionTelemetry(req, payload) {
  try {
    req?.app?.locals?.telemetryRecorder?.recordExecution?.(payload);
  } catch {
    // Telemetry errors should never impact execution responses.
  }
}

function normalizeComparableOutput(value = '') {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n');
}

function outputMatchesExpected(actualOutput = '', expectedOutput = '') {
  const expected = normalizeComparableOutput(expectedOutput);
  if (!expected) return true;
  return normalizeComparableOutput(actualOutput) === expected;
}

function isJudge0InfrastructureFailure(result, language = '') {
  const statusId = Number(result?.status?.id || 0);
  const statusDescription = String(result?.status?.description || '');
  const normalizedLanguage = String(language || '').toLowerCase();
  const isCompiledLanguage = ['cpp', 'c++', 'java', 'c'].includes(normalizedLanguage);
  const stderrText = String(result?.stderr || '').trim();
  const compileOutputText = String(result?.compile_output || '').trim();
  const combinedMessage = [
    result?.error,
    stderrText,
    compileOutputText,
    statusDescription,
  ]
    .filter(Boolean)
    .join(' ');

  if (statusId === 6 && isCompiledLanguage) {
    // For compiled languages, reroute compilation errors through fallback execution.
    // If the code is truly invalid, fallback will still fail with compile/runtime errors.
    // This protects valid submissions when Judge0's compiler sandbox is unstable.
    return true;
  }

  if (statusId !== 0 && !/internal|service unavailable|provider unavailable/i.test(statusDescription)) {
    return false;
  }

  return JUDGE0_INFRA_FAILURE_PATTERN.test(combinedMessage);
}

async function runSubmitFallbackWithPiston(payload, requestId) {
  const language = String(payload?.language || '').toLowerCase();
  const isCppLike = language === 'cpp' || language === 'c++';
  const code = String(payload?.code || '');

  const incomingCases = Array.isArray(payload?.testCases) && payload.testCases.length > 0
    ? payload.testCases
    : [{ input: '', output: '' }];

  const testCases = incomingCases.slice(0, SUBMIT_FALLBACK_MAX_CASES).map((testCase) => ({
    input: String(testCase?.input || ''),
    output: String(testCase?.output || ''),
  }));

  let passed = 0;
  const caseResults = [];
  let firstFailureMessage = '';

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];

    try {
      const maxAttempts = isCppLike ? TRANSIENT_CPP_MAX_ATTEMPTS : 1;
      let normalizedRun = null;
      let runError = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const runResult = await piston.runCode({
          language,
          code,
          stdin: testCase.input,
        });

        normalizedRun = normalizeExecutionResult(runResult, 'piston');
        runError = String(normalizedRun.error || '').trim();

        const shouldRetry = attempt < maxAttempts
          && runError
          && TRANSIENT_CPP_FALLBACK_PATTERN.test(runError);

        if (!shouldRetry) {
          break;
        }

        logExecution('submit fallback transient cpp error, retrying case', {
          requestId,
          language,
          caseIndex: index + 1,
          attempt,
          error: runError,
        });
      }

      const actualOutput = String(normalizedRun.output || '').trim();
      const expectedOutput = String(testCase.output || '');
      const passedCase = !runError && outputMatchesExpected(actualOutput, expectedOutput);

      if (passedCase) {
        passed += 1;
      }

      const caseRecord = {
        index: index + 1,
        passed: passedCase,
        input: testCase.input,
        expectedOutput,
        actualOutput,
        error: runError,
      };
      caseResults.push(caseRecord);

      if (!passedCase && !firstFailureMessage) {
        firstFailureMessage = runError || `Expected "${expectedOutput}" but received "${actualOutput}".`;
      }
    } catch (error) {
      const message = String(error?.message || 'Execution fallback failed.');
      caseResults.push({
        index: index + 1,
        passed: false,
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput: '',
        error: message,
      });

      logExecution('submit fallback failed', {
        requestId,
        language,
        failedCaseIndex: index + 1,
        error: message,
      });

      return {
        status: {
          id: 0,
          description: 'Fallback execution failed',
        },
        stdout: '',
        stderr: `Execution fallback failed: ${message}`,
        error: `Execution fallback failed: ${message}`,
        compile_output: '',
        time: '',
        memory: '',
        passed,
        total: testCases.length,
        caseResults,
        fallbackProvider: 'piston',
        fallbackReason: 'judge0_unavailable',
      };
    }
  }

  const total = testCases.length;
  const allPassed = passed === total;

  return {
    status: {
      id: allPassed ? 3 : 4,
      description: allPassed ? 'Accepted' : 'Wrong Answer',
    },
    stdout: caseResults[0]?.actualOutput || '',
    stderr: allPassed ? '' : firstFailureMessage,
    compile_output: '',
    time: '',
    memory: '',
    passed,
    total,
    caseResults,
    fallbackProvider: 'piston',
    fallbackReason: 'judge0_unavailable',
  };
}

// POST /api/execute/run
router.post('/run', runRateLimiter, runTimeoutGuard, security.validateRunRequest, async (req, res) => {
  const startedAt = Date.now();
  try {
    // ── Problem-aware path: dispatch to façade when problemId is present ──
    const problemId = req.body?.problemId || null;
    if (problemId) {
      try {
        const result = await facadeRunCode({
          problemId,
          code: req.body?.code || '',
          language: req.body?.language || '',
        });
        logExecution('run completed (problem-aware)', {
          requestId: getRequestId(req),
          problemId,
          success: result.status === 'Accepted',
          durationMs: Date.now() - startedAt,
          language: result.language,
          provider: result.provider,
          passed: result.passed,
          total: result.total,
        });
        emitExecutionTelemetry(req, {
          endpoint: 'execute-run',
          language: result.language,
          success: result.status === 'Accepted',
          provider: result.provider,
          verdict: result.status,
          requestId: getRequestId(req),
          durationMs: Date.now() - startedAt,
          statusCode: 200,
        });
        return res.json(result);
      } catch (err) {
        if (err instanceof NotFoundError) return res.status(404).json({ error: 'NotFound', message: err.message });
        if (err instanceof ValidationError) return res.status(400).json({ error: 'BadRequest', message: err.message });
        throw err;
      }
    }

    // ── Legacy stdin-based path (no problemId) ──
    const language = req.body?.language || null;
    const runPayload = {
      language,
      code: req.body?.code || '',
      stdin: req.body?.stdin || '',
    };

    if (String(language || '').toLowerCase() === 'sql') {
      const sqlText = req.body?.query ?? req.body?.code ?? '';
      const sqlResult = await sql.runQuery({
        query: sqlText,
        userId: req?.user?.userId || req?.user?.id || null,
      });
      const normalizedSql = normalizeExecutionResult(sqlResult, 'sql');

      logExecution('run completed', {
        requestId: getRequestId(req),
        success: normalizedSql.success,
        durationMs: Date.now() - startedAt,
        language,
        provider: 'sql',
      });

      emitExecutionTelemetry(req, {
        endpoint: 'execute-run',
        language,
        success: Boolean(normalizedSql.success),
        provider: 'sql',
        verdict: normalizedSql.verdict,
        error: normalizedSql.error,
        requestId: getRequestId(req),
        durationMs: Date.now() - startedAt,
        statusCode: 200,
      });

      res.json(normalizedSql);
      return;
    }

    let provider = 'piston';
    let result;
    const normalizedLanguage = String(language || '').toLowerCase();
    const isCppLike = normalizedLanguage === 'cpp' || normalizedLanguage === 'c++';

    try {
      const maxAttempts = isCppLike ? TRANSIENT_CPP_MAX_ATTEMPTS : 1;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        result = await piston.runCode(runPayload);
        const normalizedAttempt = normalizeExecutionResult(result, 'piston');
        const runError = String(normalizedAttempt.error || '').trim();
        const shouldRetry = attempt < maxAttempts
          && runError
          && TRANSIENT_CPP_FALLBACK_PATTERN.test(runError);

        if (!shouldRetry) {
          break;
        }

        logExecution('run transient cpp error, retrying piston', {
          requestId: getRequestId(req),
          language,
          attempt,
          error: runError,
        });
      }
    } catch (pistonError) {
      console.warn('[Execution Router] piston run failed, attempting Judge0 fallback', JSON.stringify({
        requestId: getRequestId(req),
        durationMs: Date.now() - startedAt,
        language,
        error: pistonError?.message || 'Unknown piston error',
      }));

      try {
        result = await judge0.runCode(runPayload);
        provider = 'judge0';
      } catch (judge0Error) {
        console.error('[Execution Router] judge0 fallback failed', JSON.stringify({
          requestId: getRequestId(req),
          durationMs: Date.now() - startedAt,
          language,
          error: judge0Error?.message || 'Unknown judge0 error',
        }));

        result = {
          error: judge0Error?.message || pistonError?.message || 'Execution provider unavailable',
        };
        provider = 'piston';
      }
    }

    const normalized = normalizeExecutionResult(result, provider);

    logExecution('run completed', {
      requestId: getRequestId(req),
      success: normalized.success,
      durationMs: Date.now() - startedAt,
      language,
      provider,
    });

    emitExecutionTelemetry(req, {
      endpoint: 'execute-run',
      language,
      success: Boolean(normalized.success),
      provider,
      verdict: normalized.verdict,
      error: normalized.error,
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });

    res.json(normalized);
  } catch (err) {
    console.error('[Execution Router] run failed', JSON.stringify({
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      language: req.body?.language || null,
      error: err?.message || 'Unknown execution error',
    }));

    const normalizedError = normalizeExecutionResult({ error: err?.message || 'Unknown execution error' }, 'piston');
    emitExecutionTelemetry(req, {
      endpoint: 'execute-run',
      language: req.body?.language || null,
      success: false,
      provider: 'piston',
      verdict: normalizedError.verdict,
      error: normalizedError.error,
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      statusCode: 500,
    });
    res.json(normalizedError);
  }
});

// POST /api/execute/submit
router.post('/submit', submitRateLimiter, submitTimeoutGuard, security.validateSubmitRequest, async (req, res) => {
  const startedAt = Date.now();
  try {
    const requestId = getRequestId(req);

    // ── Problem-aware path: dispatch to façade when problemId is present ──
    const problemId = req.body?.problemId || null;
    if (problemId) {
      try {
        const userId = req?.user?.userId || req?.user?.id || null;
        const result = await facadeSubmitCode({
          userId,
          problemId,
          code: req.body?.code || '',
          language: req.body?.language || '',
        });
        logExecution('submit completed (problem-aware)', {
          requestId,
          problemId,
          success: result.passed,
          durationMs: Date.now() - startedAt,
          language: result.language,
          provider: result.provider,
          submissionId: result.submissionId,
          passedCount: result.passedCount,
          total: result.total,
        });
        emitExecutionTelemetry(req, {
          endpoint: 'execute-submit',
          language: result.language,
          success: result.passed,
          provider: result.provider,
          verdict: result.status,
          requestId,
          durationMs: Date.now() - startedAt,
          statusCode: 200,
        });
        return res.json(result);
      } catch (err) {
        if (err instanceof NotFoundError) return res.status(404).json({ error: 'NotFound', message: err.message });
        if (err instanceof ValidationError) return res.status(400).json({ error: 'BadRequest', message: err.message });
        throw err;
      }
    }

    // ── Legacy stdin/testCases-based path (no problemId) ──
    const submitPayload = {
      language: req.body?.language,
      code: req.body?.code,
      stdin: req.body?.stdin || '',
      testCases: Array.isArray(req.body?.testCases) ? req.body.testCases : [],
    };
    let provider = 'judge0';
    let result;

    try {
      result = await judge0.submitCode(submitPayload);
    } catch (judge0Error) {
      console.warn('[Execution Router] judge0 submit threw, attempting Piston fallback', JSON.stringify({
        requestId,
        durationMs: Date.now() - startedAt,
        language: req.body?.language || null,
        error: judge0Error?.message || 'Unknown Judge0 error',
      }));

      result = await runSubmitFallbackWithPiston(submitPayload, requestId);
      provider = 'piston-fallback';
    }

    if (provider === 'judge0' && isJudge0InfrastructureFailure(result, submitPayload.language || '')) {
      console.warn('[Execution Router] judge0 submit infrastructure failure, using fallback', JSON.stringify({
        requestId,
        durationMs: Date.now() - startedAt,
        language: submitPayload.language || null,
        reason: result?.stderr || result?.error || result?.status?.description || 'unknown',
      }));
      result = await runSubmitFallbackWithPiston(submitPayload, requestId);
      provider = 'piston-fallback';
    }

    const normalized = normalizeExecutionResult(result, 'judge0');

    if (provider !== 'judge0') {
      normalized.provider = provider;
      normalized.fallback = true;
      normalized.fallbackReason = result?.fallbackReason || 'judge0_unavailable';
      normalized.testCasesPassed = Number(result?.passed || normalized.testCasesPassed || 0);
      normalized.totalTestCases = Number(result?.total || normalized.totalTestCases || 0);
      normalized.caseResults = Array.isArray(result?.caseResults) ? result.caseResults : [];
    }

    logExecution('submit completed', {
      requestId,
      success: normalized.success,
      durationMs: Date.now() - startedAt,
        language: submitPayload.language || null,
        testCases: submitPayload.testCases.length,
      provider,
    });

    emitExecutionTelemetry(req, {
      endpoint: 'execute-submit',
      language: submitPayload.language || null,
      success: Boolean(normalized.success),
      provider,
      verdict: normalized.verdict,
      error: normalized.error,
      requestId,
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });

    res.json(normalized);
  } catch (err) {
    console.error('[Execution Router] submit failed', JSON.stringify({
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      language: req.body?.language || null,
      error: err?.message || 'Unknown submit error',
    }));

    const normalizedError = normalizeExecutionResult({ error: err.message }, 'judge0');
    emitExecutionTelemetry(req, {
      endpoint: 'execute-submit',
      language: req.body?.language || null,
      success: false,
      provider: 'judge0',
      verdict: normalizedError.verdict,
      error: normalizedError.error,
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      statusCode: 500,
    });
    res.status(500).json(normalizedError);
  }
});

// POST /api/execute/sql
router.post('/sql', sqlRateLimiter, sqlTimeoutGuard, security.validateSqlRequest, async (req, res) => {
  const startedAt = Date.now();
  try {
    const result = await sql.runQuery({
      query: req.body?.query,
      userId: req?.user?.userId || req?.user?.id || req.body?.userId || null,
    });
    const normalized = normalizeExecutionResult(result, 'sql');

    logExecution('sql completed', {
      requestId: getRequestId(req),
      success: normalized.success,
      durationMs: Date.now() - startedAt,
      queryBytes: String(req.body?.query || '').length,
      rowCount: Array.isArray(normalized.output) ? normalized.output.length : 0,
    });

    emitExecutionTelemetry(req, {
      endpoint: 'execute-sql',
      language: 'sql',
      success: Boolean(normalized.success),
      provider: 'sql',
      verdict: normalized.verdict,
      error: normalized.error,
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });

    res.json(normalized);
  } catch (err) {
    console.error('[Execution Router] sql failed', JSON.stringify({
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      queryBytes: String(req.body?.query || '').length,
      error: err?.message || 'Unknown SQL error',
    }));

    // SQL query/runtime errors are user-facing execution outcomes, not transport failures.
    // Return normalized payload with success=false so the UI can render inline errors
    // without browser console noise from HTTP 500 responses.
    const normalizedError = normalizeExecutionResult({ error: err.message }, 'sql');
    emitExecutionTelemetry(req, {
      endpoint: 'execute-sql',
      language: 'sql',
      success: false,
      provider: 'sql',
      verdict: normalizedError.verdict,
      error: normalizedError.error,
      requestId: getRequestId(req),
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });
    res.json(normalizedError);
  }
});

export default router;
