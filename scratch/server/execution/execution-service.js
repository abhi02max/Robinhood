/**
 * Execution Service — thin façade over the existing problem-aware execution
 * engine.
 *
 * THIS FILE DOES NOT IMPLEMENT EXECUTION LOGIC.
 * It composes:
 *
 *   server/learning-engine/execution-engine.js   (real Judge0/Piston runner)
 *   server/learning-engine/learning-repository.js (problem + test-case + DB writes)
 *
 * Two public functions, both shaped exactly as Phase 2 spec asks:
 *
 *   runCode({ problemId, code, language })
 *      → fetch ONLY visible test cases
 *      → call runExecution(...)
 *      → DO NOT persist (runs are ephemeral; no submissions row)
 *      → return { status, passed, total, executionTime, memory, results[] }
 *
 *   submitCode({ userId, problemId, code, language })
 *      → fetch ALL test cases (visible + hidden)
 *      → call runExecution(...)
 *      → persist exactly one row in `submissions`
 *      → return { status, passed, total, executionTime, memory, submissionId, ... }
 *
 * Hidden-test-case redaction is the engine layer's job (see execution-engine.js
 * + learning-service.js). The façade only forwards/aggregates results.
 */

import {
  runExecution,
  isLanguageSupported,
  ERROR_KIND,
} from '../learning-engine/execution-engine.js';

import {
  getProblemForSubmission,
  listAllTestCasesForProblem,
  getVisibleTestCases,
  insertSubmission,
} from '../learning-engine/learning-repository.js';

// ---------------------------------------------------------------------------
// Errors — same shape as learning-service so the router can map identically
// ---------------------------------------------------------------------------
export class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}
export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_CODE_LENGTH = 100_000; // 100 KB — guard against accidental DoS
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';

// Status strings persisted to submissions.status — these MUST match the CHECK
// constraint on the column (Pending | Accepted | Wrong Answer | TLE | RE | CE).
const STATUS_ACCEPTED          = 'Accepted';
const STATUS_WRONG_ANSWER      = 'Wrong Answer';
const STATUS_TIME_LIMIT        = 'Time Limit Exceeded';
const STATUS_RUNTIME_ERROR     = 'Runtime Error';
const STATUS_COMPILATION_ERROR = 'Compilation Error';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateCommonInputs({ problemId, code, language }) {
  if (!problemId || typeof problemId !== 'string') {
    throw new ValidationError('problemId is required');
  }
  if (!UUID_RE.test(problemId)) {
    throw new ValidationError(`Invalid problemId UUID: ${problemId}`);
  }
  if (typeof code !== 'string') {
    throw new ValidationError('code must be a string');
  }
  if (code.length === 0) {
    throw new ValidationError('code must not be empty');
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new ValidationError(`code exceeds ${MAX_CODE_LENGTH} bytes`);
  }
  if (!language) {
    throw new ValidationError('language is required');
  }

  const lang = String(language).toLowerCase();
  // C++ acceptance is gated per-problem inside the engine (cpp_signature).
  // We only filter languages we have any harness for here.
  if (!isLanguageSupported(lang) && lang !== 'cpp' && lang !== 'c++') {
    throw new ValidationError(`Unsupported language: ${language}`);
  }
}

/**
 * Map the engine's first-failure ERROR_KIND to a submissions.status value.
 * Engine error_kind → DB status:
 *   wrong_answer        → "Wrong Answer"
 *   runtime_error       → "Runtime Error"
 *   harness_error       → "Runtime Error" (user code crashed before the print)
 *   compile_error       → "Compilation Error"
 *   time_limit_exceeded → "Time Limit Exceeded"
 *   null/anything else  → "Wrong Answer" (defensive)
 */
function statusFromExecResult(exec) {
  if (exec.pass_count === exec.total) return STATUS_ACCEPTED;

  const idx = exec.first_failed_index;
  const fk = (idx !== null && idx !== undefined) ? exec.results[idx]?.error_kind : null;

  if (fk === ERROR_KIND.RUNTIME_ERROR
   || fk === ERROR_KIND.HARNESS_ERROR) return STATUS_RUNTIME_ERROR;
  if (fk === ERROR_KIND.COMPILE_ERROR)       return STATUS_COMPILATION_ERROR;
  if (fk === ERROR_KIND.TIME_LIMIT_EXCEEDED) return STATUS_TIME_LIMIT;
  return STATUS_WRONG_ANSWER;
}

/**
 * Project an engine result into the public Phase 2 response shape.
 * Used by both runCode and submitCode.
 *
 *   exec.results[] is per-test-case; we keep it as-is for `runCode` (visible
 *   tests only ⇒ never leaks anything) and redact it for `submitCode`.
 *
 * @param {object} exec   engine output (see runExecution doc)
 * @param {boolean} redactHidden  if true, drops input/expected/actual/stderr
 *                                from cases marked is_hidden
 */
function shapeResults(exec, { redactHidden }) {
  return exec.results.map((r) => {
    if (redactHidden && r.is_hidden) {
      return {
        index: r.test_index,
        passed: r.passed,
        is_hidden: true,
        runtime_ms: r.runtime_ms,
        error_kind: r.error_kind,
        // input / expected / actual / stderr deliberately omitted
      };
    }
    return {
      index: r.test_index,
      passed: r.passed,
      is_hidden: !!r.is_hidden,
      runtime_ms: r.runtime_ms,
      error_kind: r.error_kind,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      stderr: r.stderr || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Public: runCode — Run button (visible tests only, no DB write)
// ---------------------------------------------------------------------------
/**
 * @param {Object} args
 * @param {string} args.problemId   problem UUID
 * @param {string} args.code        user code
 * @param {string} args.language    'javascript' | 'python' | 'cpp'
 *
 * @returns {Promise<{
 *   status: 'Accepted'|'Wrong Answer'|'Runtime Error'|'Compilation Error'|'Time Limit Exceeded'|'No Tests',
 *   passed: number,
 *   total: number,
 *   executionTime: number,    // total wall-clock ms across cases
 *   memory: number,           // peak memory bytes (engine-reported; 0 if provider doesn't report)
 *   results: Array<object>,   // per visible case
 *   provider: string,         // piston | judge0 | mock
 *   language: string
 * }>}
 */
export async function runCode({ problemId, code, language }) {
  validateCommonInputs({ problemId, code, language });

  // Confirm problem exists ⇒ clean 404 instead of an empty-tests crash later.
  const problem = await getProblemForSubmission(problemId);
  if (!problem) throw new NotFoundError(`Problem not found: ${problemId}`);

  const visible = await getVisibleTestCases(problemId);
  if (visible.length === 0) {
    return {
      status: 'No Tests',
      passed: 0,
      total: 0,
      executionTime: 0,
      memory: 0,
      results: [],
      provider: null,
      language: String(language).toLowerCase(),
    };
  }

  const exec = await runExecution({
    language,
    code,
    testCases: visible,
    cpp_signature: problem.cpp_signature || null,
  });
  const status = statusFromExecResult(exec);

  return {
    status,
    passed: exec.pass_count,
    total: exec.total,
    executionTime: exec.runtime_ms,
    memory: exec.memory_bytes,
    results: shapeResults(exec, { redactHidden: false }), // visible only — safe
    provider: exec.provider,
    language: exec.language,
  };
}

// ---------------------------------------------------------------------------
// Public: submitCode — Submit button (ALL tests, persists submission)
// ---------------------------------------------------------------------------
/**
 * @param {Object} args
 * @param {string} [args.userId]    user UUID (anonymous default if absent)
 * @param {string} args.problemId   problem UUID
 * @param {string} args.code
 * @param {string} args.language
 *
 * @returns {Promise<{
 *   submissionId: string,
 *   status: string,
 *   passed: boolean,             // true iff status === 'Accepted'
 *   passedCount: number,
 *   total: number,
 *   executionTime: number,
 *   memory: number,
 *   firstFailedTestCase: object|null,
 *   results: Array<object>,      // per case (hidden cases redacted)
 *   provider: string,
 *   language: string,
 *   createdAt: string
 * }>}
 */
export async function submitCode({ userId, problemId, code, language }) {
  validateCommonInputs({ problemId, code, language });

  const problem = await getProblemForSubmission(problemId);
  if (!problem) throw new NotFoundError(`Problem not found: ${problemId}`);

  const allTests = await listAllTestCasesForProblem(problemId);
  if (allTests.length === 0) {
    throw new ValidationError(`No test cases configured for problem ${problemId}`);
  }

  const exec = await runExecution({
    language,
    code,
    testCases: allTests,
    cpp_signature: problem.cpp_signature || null,
  });
  const status = statusFromExecResult(exec);

  // ---- per-case redaction for the failed-cases summary persisted with the
  // ---- submission (the row keeps a JSONB column called fail_cases). Hidden
  // ---- inputs/expectations/actuals MUST be stripped so a future user-facing
  // ---- "submission detail" page can't accidentally leak the test suite.
  const failedResults = exec.results.filter((r) => !r.passed);
  const failCasesForDb = failedResults.map((r) => ({
    test_index: r.test_index,
    test_case_id: r.test_case_id,
    is_hidden: r.is_hidden,
    error_kind: r.error_kind,
    input:    r.is_hidden ? null : r.input,
    expected: r.is_hidden ? null : r.expected,
    actual:   r.is_hidden ? null : r.actual,
  }));

  // ---- Persist exactly one row. Reuses the existing repository writer to
  // ---- guarantee column-shape parity with /api/learning/submit.
  const submission = await insertSubmission({
    userId: userId || ANONYMOUS_USER_ID,
    problemId,
    language: String(language).toLowerCase(),
    code,
    status,
    executionTimeMs: exec.runtime_ms,
    memoryUsedBytes: exec.memory_bytes,
    passCount: exec.pass_count,
    failCases: failCasesForDb,
  });

  // ---- Build the API-facing first-failed summary (also redacted).
  let firstFailedTestCase = null;
  if (exec.first_failed_index !== null && exec.first_failed_index !== undefined) {
    const fr = exec.results[exec.first_failed_index];
    const baseLabel = fr.is_hidden
      ? `hidden test case #${fr.test_index + 1}`
      : `test case #${fr.test_index + 1}`;
    firstFailedTestCase = {
      test_index: fr.test_index,
      is_hidden: fr.is_hidden,
      error_kind: fr.error_kind,
      input:    fr.is_hidden ? null : fr.input,
      expected: fr.is_hidden ? null : fr.expected,
      actual:   fr.is_hidden ? null : fr.actual,
      stderr:   fr.is_hidden ? null : (fr.stderr || null),
      message: `Failed on ${baseLabel}`,
    };
  }

  return {
    submissionId: submission.id,
    status,
    passed: status === STATUS_ACCEPTED,
    passedCount: exec.pass_count,
    total: exec.total,
    executionTime: exec.runtime_ms,
    memory: exec.memory_bytes,
    firstFailedTestCase,
    results: shapeResults(exec, { redactHidden: true }),
    provider: exec.provider,
    language: exec.language,
    createdAt: submission.created_at,
  };
}

export default { runCode, submitCode, NotFoundError, ValidationError };
