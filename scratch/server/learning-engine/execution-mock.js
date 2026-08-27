/**
 * Mock execution engine.
 *
 * This is a STUB. It deterministically simulates running user code against a
 * list of test cases without actually executing anything. When you wire up
 * Judge0 / Piston / a custom sandbox, replace `runMockExecution` with the
 * real adapter — the function signature and return shape are what the
 * service layer depends on.
 *
 * Determinism rules (so tests against this mock are predictable):
 *   - empty / whitespace-only code           → ALL tests fail
 *   - code containing  "// FAIL"   (or # FAIL) → ALL tests fail
 *   - code containing  "// FAIL_HIDDEN"        → only hidden tests fail
 *   - otherwise                                → ALL tests pass
 */

const FAIL_MARKER = /(?:\/\/|#)\s*FAIL\b(?!_)/i;
const FAIL_HIDDEN_MARKER = /(?:\/\/|#)\s*FAIL_HIDDEN\b/i;

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'go',
  'rust',
]);

export function isLanguageSupported(language) {
  return SUPPORTED_LANGUAGES.has(String(language || '').toLowerCase());
}

/**
 * Deep-equality-ish comparison sufficient for JSON-serialisable test outputs.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

/**
 * @param {Object}  args
 * @param {string}  args.language       e.g. "javascript"
 * @param {string}  args.code           user-submitted source
 * @param {Array<{
 *    id: string,
 *    input_payload: any,
 *    expected_output: any,
 *    is_hidden: boolean,
 *    order_index: number,
 *  }>}             args.testCases
 *
 * @returns {{
 *    pass_count: number,
 *    total: number,
 *    runtime_ms: number,
 *    memory_bytes: number,
 *    results: Array<{
 *      test_index: number,
 *      passed: boolean,
 *      runtime_ms: number,
 *      is_hidden: boolean,
 *      input: any,
 *      expected: any,
 *      actual: any,
 *    }>,
 *    first_failed_index: number | null,
 *  }}
 */
export function runMockExecution({ language, code, testCases }) {
  const codeStr = String(code || '');
  const trimmed = codeStr.trim();

  const isAllFail =
    trimmed.length === 0 ||
    FAIL_MARKER.test(codeStr);
  const isHiddenFail = !isAllFail && FAIL_HIDDEN_MARKER.test(codeStr);

  const results = [];
  let totalRuntime = 0;
  let firstFailedIndex = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    // Deterministic per-test runtime in [4, 28]ms — derived from i + length(code)
    const perTestRuntime = 4 + ((i * 7 + codeStr.length) % 25);
    totalRuntime += perTestRuntime;

    let passed;
    if (isAllFail) {
      passed = false;
    } else if (isHiddenFail && tc.is_hidden) {
      passed = false;
    } else {
      // In a real executor this would compare the user's actual output to
      // expected. The mock assumes the candidate-style code is correct.
      passed = true;
    }

    const actual = passed ? tc.expected_output : null;

    if (!passed && firstFailedIndex === null) firstFailedIndex = i;

    results.push({
      test_index: i,
      test_case_id: tc.id,
      passed,
      runtime_ms: perTestRuntime,
      is_hidden: !!tc.is_hidden,
      input: tc.input_payload,
      expected: tc.expected_output,
      actual,
    });
  }

  const passCount = results.filter((r) => r.passed).length;

  // Deterministic mock memory in [4MB, 12MB]
  const memoryBytes = 1024 * 1024 * (4 + (codeStr.length % 9));

  return {
    pass_count: passCount,
    total: testCases.length,
    runtime_ms: totalRuntime,
    memory_bytes: memoryBytes,
    results,
    first_failed_index: firstFailedIndex,
    language: String(language || '').toLowerCase(),
  };
}
