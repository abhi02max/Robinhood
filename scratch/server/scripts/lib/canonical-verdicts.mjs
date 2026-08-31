/**
 * The verdict matrix: five outcomes, six languages, one program each.
 *
 * The gate's job here is narrow and worth stating precisely. It is NOT checking that a
 * solution is right — the canonical corpus does that. It is checking that when something
 * goes wrong, the platform tells the user WHICH thing went wrong. A compile error
 * reported as a runtime error (defect D3, fixed in Phase 1b) is not a cosmetic bug: it
 * sends a candidate looking for a logic mistake in code that never built.
 *
 * WHERE "COMPILATION ERROR" COMES FROM TWO DIFFERENT PLACES
 * ---------------------------------------------------------
 * For C++, Java, C and C# it comes from a real compiler on the provider.
 *
 * JavaScript and Python have no compile step, and there are two distinct paths that
 * produce the verdict. Both were measured against the live provider rather than assumed:
 *
 *   no function at all      LOCAL. `extractEntrypoint` finds nothing and `runExecution`
 *                           returns compile_error for every case with ZERO provider
 *                           requests. Covered by tests/unit/entrypoint-extraction.test.js,
 *                           because a local path does not need provider quota to prove.
 *
 *   a genuine syntax error  PROVIDER. Node/CPython fail at parse time. This is what the
 *                           matrix probes, and it is what defect D10 was about: it used
 *                           to be reported as runtime_error.
 *
 * A first draft of this file probed compile_error with a function whose parameter names
 * did not match the payload. That was wrong, and the gate caught it: extraction does not
 * validate names, so the harness called the function with `undefined` and the verdict was
 * a legitimate wrong_answer. The probe now uses a real syntax error.
 *
 * TIME LIMIT EXCEEDED IS PROVIDER-DEPENDENT
 * -----------------------------------------
 * Paiza caps CPU at 1.00s and ignores `EXECUTION_TIMEOUT_MS`, so a busy loop is reliable
 * here. On Judge0 `cpu_time_limit` is ours to set and these same loops may need
 * retuning; that is recorded in docs/judge0-revalidation.md rather than assumed away.
 */

/** The five verdicts every production language must be able to produce. */
export const VERDICTS = Object.freeze(['accepted', 'wrong_answer', 'compile_error', 'runtime_error', 'time_limit_exceeded']);

/** How a language's compile_error verdict is actually produced. */
export const COMPILE_ERROR_SOURCE = Object.freeze({
  javascript: 'Node parse failure, reclassified from runtime_error (D10)',
  python: 'CPython parse failure, reclassified from runtime_error (D10)',
  cpp: 'provider compiler (build_result: failure)',
  java: 'provider compiler (build_result: failure)',
  c: 'provider compiler (build_result: failure)',
  csharp: 'provider compiler (build_result: failure)',
});

const SIG = {
  fn: 'echoInt',
  class: 'Solution',
  args: [{ name: 'n', type: 'int' }],
  ret: 'int',
};

const CASES = [
  { id: 'v1', order_index: 1, is_hidden: false, input_payload: { n: 4 }, expected_output: 4 },
  { id: 'v2', order_index: 2, is_hidden: false, input_payload: { n: -9 }, expected_output: -9 },
];

/** One case only, for the timeout probe: a busy loop costs a full second each. */
const ONE_CASE = [CASES[0]];

/**
 * Programs keyed by language then verdict.
 *
 * The JavaScript and Python `compile_error` programs contain a REAL parse error, and each
 * still defines a function so that extraction succeeds — otherwise the local path would
 * short-circuit and the provider would never be asked, testing nothing.
 */
export const PROGRAMS = Object.freeze({
  javascript: {
    accepted: 'function echoInt(n) {\n  return n;\n}',
    wrong_answer: 'function echoInt(n) {\n  return n + 1;\n}',
    // Extra braces: extraction finds `echoInt`, then Node refuses to parse the file.
    compile_error: 'function echoInt(n) {\n  return n;\n}}}',
    runtime_error: 'function echoInt(n) {\n  throw new Error("boom");\n}',
    time_limit_exceeded: 'function echoInt(n) {\n  let x = 0;\n  for (let i = 0; i < 5e9; i++) x += i;\n  return x;\n}',
  },

  python: {
    accepted: 'def echo_int(n):\n    return n',
    wrong_answer: 'def echo_int(n):\n    return n + 1',
    // A dangling operator: valid enough to match the def pattern, not valid Python.
    compile_error: 'def echo_int(n):\n    return n +',
    runtime_error: 'def echo_int(n):\n    raise ValueError("boom")',
    time_limit_exceeded: 'def echo_int(n):\n    x = 0\n    for i in range(500000000):\n        x += i\n    return x',
  },

  cpp: {
    accepted: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        return n;\n    }\n};',
    wrong_answer: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        return n + 1;\n    }\n};',
    compile_error: 'class Solution {\npublic:\n    int echoInt(int n) {\n        return\n    }\n};',
    // A thrown exception rather than a segfault: it exits non-zero with a message on
    // stderr, which is what the mapping reads, and it does not depend on the platform's
    // signal handling.
    runtime_error: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        throw runtime_error("boom");\n    }\n};',
    time_limit_exceeded: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        volatile long long x = 0;\n        for (long long i = 0; i < 40000000000LL; i++) x += i;\n        return (int) x;\n    }\n};',
  },

  java: {
    accepted: 'class Solution {\n    public int echoInt(int n) {\n        return n;\n    }\n}',
    wrong_answer: 'class Solution {\n    public int echoInt(int n) {\n        return n + 1;\n    }\n}',
    compile_error: 'class Solution {\n    public int echoInt(int n) {\n        return\n    }\n}',
    runtime_error: 'class Solution {\n    public int echoInt(int n) {\n        throw new IllegalStateException("boom");\n    }\n}',
    time_limit_exceeded: 'class Solution {\n    public int echoInt(int n) {\n        long x = 0;\n        for (long i = 0; i < 40000000000L; i++) x += i;\n        return (int) x;\n    }\n}',
  },

  c: {
    accepted: 'int echoInt(int n) {\n    return n;\n}',
    wrong_answer: 'int echoInt(int n) {\n    return n + 1;\n}',
    compile_error: 'int echoInt(int n) {\n    return\n}',
    // A null dereference is the canonical C runtime fault. Paiza reports
    // result:"failure", which maps to runtime_error.
    runtime_error: 'int echoInt(int n) {\n    int* p = NULL;\n    *p = 1;\n    return n;\n}',
    time_limit_exceeded: 'int echoInt(int n) {\n    volatile long long x = 0;\n    for (long long i = 0; i < 40000000000LL; i++) x += i;\n    return (int) x;\n}',
  },

  csharp: {
    accepted: 'public class Solution {\n    public int EchoInt(int n) {\n        return n;\n    }\n}',
    wrong_answer: 'public class Solution {\n    public int EchoInt(int n) {\n        return n + 1;\n    }\n}',
    compile_error: 'public class Solution {\n    public int EchoInt(int n) {\n        return\n    }\n}',
    runtime_error: 'public class Solution {\n    public int EchoInt(int n) {\n        throw new InvalidOperationException("boom");\n    }\n}',
    time_limit_exceeded: 'public class Solution {\n    public int EchoInt(int n) {\n        long x = 0;\n        for (long i = 0; i < 40000000000L; i++) x += i;\n        return (int) x;\n    }\n}',
  },
});

/** The signature, cases and expectation for one (language, verdict) probe. */
export function verdictProbe(language, verdict) {
  const code = PROGRAMS[language]?.[verdict];
  if (!code) return null;
  return {
    code,
    sig: SIG,
    cases: verdict === 'time_limit_exceeded' ? ONE_CASE : CASES,
    // `accepted` must pass every case; every other verdict must NOT pass and must
    // report exactly the error_kind it is named after.
    expectPassing: verdict === 'accepted',
    expectKind: verdict === 'accepted' ? null : verdict,
  };
}
