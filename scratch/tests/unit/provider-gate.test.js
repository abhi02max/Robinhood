import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RESULT,
  ProviderStats,
  classifyCase,
  classifyExecution,
  isBlocking,
  isRetryable,
  looksProviderFailure,
  looksThrottled,
  runWithBackoff,
  worst,
} from '../../server/scripts/lib/provider-gate.mjs';

/**
 * The provider result taxonomy.
 *
 * This exists because of a concrete loss: Phase 2D's final regression sweep reported
 * `harness_error` on two problems, and the sweep was treated as a failure until a
 * re-run came back clean. The cause was an HTTP 429 from Paiza. The engine collapses
 * every transport throw into `harness_error`, so a provider rationing us was
 * indistinguishable from a broken generated program.
 *
 * The taxonomy's whole job is to never make that mistake again — in either direction. A
 * 429 must not read as a harness failure, and a harness failure must not be excused as
 * a 429.
 */

const caseResult = (over = {}) => ({
  passed: false, error_kind: null, stderr: '', expected: 1, actual: null, ...over,
});

// ---------------------------------------------------------------------------
// Recognising a throttle
// ---------------------------------------------------------------------------

test('an HTTP 429 is a throttle, whatever language the body is in', () => {
  // The status code is the reliable signal: paizaFetch puts it in the message verbatim.
  assert.ok(looksThrottled('Paiza HTTP 429: {"error":"..."}'));
  // The 2D failure came back in Japanese. Matching the localised text is a fallback,
  // not the primary signal, but it must work.
  assert.ok(looksThrottled('\u5B9F\u884C\u56DE\u6570\u306E\u5236\u9650\u306B\u9054\u3057\u307E\u3057\u305F'));
  assert.ok(looksThrottled('\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044'));
  // Judge0 via RapidAPI phrases it in English.
  assert.ok(looksThrottled('Judge0 HTTP 429: Too Many Requests'));
  assert.ok(looksThrottled('rate limit exceeded'));
  assert.ok(looksThrottled('monthly quota exceeded'));
});

test('a compiler diagnostic is NOT a throttle', () => {
  // The failure mode that would matter most: excusing a real defect as a quota problem.
  assert.equal(looksThrottled('error: expected \';\' before \'}\' token'), false);
  assert.equal(looksThrottled('Main.java:7: error: cannot find symbol'), false);
  assert.equal(looksThrottled('Exception in thread "main" java.lang.NullPointerException'), false);
  assert.equal(looksThrottled(''), false);
});

test('server errors and network faults are provider failures, not throttles', () => {
  assert.ok(looksProviderFailure('Paiza HTTP 503: Service Unavailable'));
  assert.ok(looksProviderFailure('Paiza returned no run id: {}'));
  assert.ok(looksProviderFailure('fetch failed'));
  assert.ok(looksProviderFailure('ECONNRESET'));
  assert.equal(looksThrottled('Paiza HTTP 503: Service Unavailable'), false);
});

// ---------------------------------------------------------------------------
// Classifying one case
// ---------------------------------------------------------------------------

test('a 429 arriving as harness_error is reclassified as a throttle', () => {
  // This is the exact shape runExecution produces for a transport throw.
  const got = classifyCase(caseResult({ error_kind: 'harness_error', stderr: 'Paiza HTTP 429: limit' }));
  assert.equal(got.result, RESULT.PROVIDER_THROTTLED);
  assert.equal(isBlocking(got.result), false);
  assert.equal(isRetryable(got.result), true);
});

test('a harness_error with no provider signature stays a harness failure', () => {
  const got = classifyCase(caseResult({ error_kind: 'harness_error', stderr: 'could not parse harness output' }));
  assert.equal(got.result, RESULT.HARNESS_FAILURE);
  assert.equal(isBlocking(got.result), true);
  assert.equal(isRetryable(got.result), false);
});

test('a reference solution that fails to compile blames the harness, not the candidate', () => {
  // The corpus solutions are known-correct, so a compile error means the program we
  // generated around them is wrong.
  const got = classifyCase(caseResult({ error_kind: 'compile_error', stderr: 'error: expected \';\'' }));
  assert.equal(got.result, RESULT.HARNESS_FAILURE);
});

test('a reference solution that returns the wrong value is a product failure', () => {
  const got = classifyCase(caseResult({ error_kind: 'wrong_answer', expected: 4, actual: 5 }));
  assert.equal(got.result, RESULT.PRODUCT_FAILURE);
  assert.match(got.reason, /expected 4 got 5/);
});

test('a known-wrong control being REJECTED is the pass', () => {
  const got = classifyCase(caseResult({ error_kind: 'wrong_answer' }), 'reject');
  assert.equal(got.result, RESULT.PASS);
});

test('a known-wrong control being ACCEPTED is a product failure', () => {
  // The grader let a wrong answer through, which is the worst thing this gate can find.
  const got = classifyCase(caseResult({ passed: true, error_kind: null }), 'reject');
  assert.equal(got.result, RESULT.PRODUCT_FAILURE);
  assert.match(got.reason, /accepted/);
});

test('a throttled control is still a throttle, not a pass', () => {
  // Under `reject`, "did not pass" is success — so a throttle must be caught BEFORE
  // that rule, or every throttled control would be scored as a pass.
  const got = classifyCase(
    caseResult({ error_kind: 'harness_error', stderr: 'Paiza HTTP 429' }),
    'reject',
  );
  assert.equal(got.result, RESULT.PROVIDER_THROTTLED);
});

// ---------------------------------------------------------------------------
// Worst-wins across an execution
// ---------------------------------------------------------------------------

test('a definitive wrong answer outranks a throttle on other cases', () => {
  // A wrong VALUE is a fact regardless of what happened to the other cases. Reporting the
  // throttle instead would spend a retry to rediscover something already known.
  const out = {
    results: [
      caseResult({ error_kind: 'harness_error', stderr: 'Paiza HTTP 429' }),
      caseResult({ error_kind: 'harness_error', stderr: 'Paiza HTTP 429' }),
      caseResult({ error_kind: 'wrong_answer', expected: 1, actual: 2 }),
    ],
  };
  assert.equal(classifyExecution(out).result, RESULT.PRODUCT_FAILURE);
});

test('an all-passing execution is a pass', () => {
  const out = { results: [caseResult({ passed: true }), caseResult({ passed: true })] };
  assert.equal(classifyExecution(out).result, RESULT.PASS);
});

test('an execution with no results is a provider failure, not a pass', () => {
  assert.equal(classifyExecution({ results: [] }).result, RESULT.PROVIDER_FAILURE);
});

test('severity order puts real failures above throttles and passes below both', () => {
  assert.equal(worst([RESULT.PASS, RESULT.PROVIDER_THROTTLED]), RESULT.PROVIDER_THROTTLED);
  assert.equal(worst([RESULT.PROVIDER_THROTTLED, RESULT.HARNESS_FAILURE]), RESULT.HARNESS_FAILURE);
  assert.equal(worst([RESULT.PRODUCT_FAILURE, RESULT.HARNESS_FAILURE]), RESULT.HARNESS_FAILURE);
  assert.equal(worst([RESULT.PASS, RESULT.PASS]), RESULT.PASS);
});

// ---------------------------------------------------------------------------
// Bounded backoff
// ---------------------------------------------------------------------------

const throttled = { results: [{ passed: false, error_kind: 'harness_error', stderr: 'Paiza HTTP 429' }] };
const passing = { results: [{ passed: true, error_kind: null }] };

test('a throttle is retried and the eventual pass is what gets reported', () => {
  let calls = 0;
  return runWithBackoff(async () => {
    calls += 1;
    return calls < 3 ? throttled : passing;
  }, { baseDelayMs: 1, maxDelayMs: 2, maxRetries: 5 }).then((r) => {
    assert.equal(r.result, RESULT.PASS);
    assert.equal(calls, 3);
    assert.equal(r.attempts, 3);
  });
});

test('retries are BOUNDED and a persistent throttle is reported as a throttle', () => {
  // Not a pass and not a failure. An unbounded retry would hide the rationing, which is
  // the one number the Judge0 migration needs.
  let calls = 0;
  return runWithBackoff(async () => { calls += 1; return throttled; }, {
    baseDelayMs: 1, maxDelayMs: 2, maxRetries: 2,
  }).then((r) => {
    assert.equal(r.result, RESULT.PROVIDER_THROTTLED);
    assert.equal(calls, 3, 'one initial attempt plus exactly maxRetries retries');
    assert.equal(isBlocking(r.result), false);
  });
});

test('a real failure is NOT retried', () => {
  let calls = 0;
  return runWithBackoff(async () => {
    calls += 1;
    return { results: [{ passed: false, error_kind: 'wrong_answer', expected: 1, actual: 2 }] };
  }, { baseDelayMs: 1, maxRetries: 5 }).then((r) => {
    assert.equal(r.result, RESULT.PRODUCT_FAILURE);
    assert.equal(calls, 1, 'retrying a wrong answer would just waste quota');
  });
});

test('a throw is classified rather than crashing the gate', () => {
  let calls = 0;
  return runWithBackoff(async () => {
    calls += 1;
    throw new Error('Paiza HTTP 429: slow down');
  }, { baseDelayMs: 1, maxDelayMs: 2, maxRetries: 1 }).then((r) => {
    assert.equal(r.result, RESULT.PROVIDER_THROTTLED);
    assert.equal(calls, 2);
  });
});

test('stats count executions, throttles and retries separately', () => {
  const stats = new ProviderStats();
  let calls = 0;
  return runWithBackoff(async () => {
    calls += 1;
    return calls < 2 ? throttled : passing;
  }, { baseDelayMs: 1, maxDelayMs: 2, maxRetries: 3, stats }).then(() => {
    assert.equal(stats.executions, 2, 'both attempts cost a provider execution');
    assert.equal(stats.throttles, 1);
    assert.equal(stats.retries, 1);
    stats.record(RESULT.PASS);
    assert.equal(stats.passes, 1);
    assert.equal(stats.failures, 0);
  });
});

test('the retry delay is jittered, so concurrent workers do not retry in lockstep', async () => {
  // All workers were throttled at the same moment; an unjittered schedule would have
  // them all come back at the same moment and be throttled again.
  const delays = [];
  for (let i = 0; i < 40; i += 1) {
    let calls = 0;
    const t0 = Date.now();
    // eslint-disable-next-line no-await-in-loop
    await runWithBackoff(async () => { calls += 1; return calls < 2 ? throttled : passing; }, {
      baseDelayMs: 30, maxDelayMs: 30, maxRetries: 1,
    });
    delays.push(Date.now() - t0);
  }
  const unique = new Set(delays);
  assert.ok(unique.size > 5, `expected jittered delays, saw ${unique.size} distinct values`);
  assert.ok(Math.max(...delays) <= 200, 'jitter must stay under the ceiling');
});

// ---------------------------------------------------------------------------
// Rejection is an execution-level property
// ---------------------------------------------------------------------------

/**
 * The gate's own first run reported three PRODUCT_FAILUREs that were all its own fault:
 * the `vector<int>` control returns `nums.slice(0, 1)`, and on the empty input
 * `[].slice(0, 1)` is `[]` — the right answer. Judging controls per case called that a
 * grading defect. It is not: a submission is Accepted only when EVERY case passes, so a
 * control only has to stop the submission being accepted.
 */

test('a control that coincidentally passes SOME cases is still rejected', () => {
  const out = {
    results: [
      { passed: true, error_kind: null },
      { passed: false, error_kind: 'wrong_answer', expected: [1, 2], actual: [1] },
      { passed: false, error_kind: 'wrong_answer', expected: [3], actual: [] },
    ],
  };
  const got = classifyExecution(out, 'reject');
  assert.equal(got.result, RESULT.PASS);
  assert.match(got.reason, /1\/3 cases passed/);
});

test('a control that passes EVERY case is a product failure', () => {
  const out = { results: [{ passed: true, error_kind: null }, { passed: true, error_kind: null }] };
  const got = classifyExecution(out, 'reject');
  assert.equal(got.result, RESULT.PRODUCT_FAILURE);
  assert.match(got.reason, /accepted on all 2 case/);
});

test('a reference solution must pass every case, not just one', () => {
  const out = {
    results: [
      { passed: true, error_kind: null },
      { passed: false, error_kind: 'wrong_answer', expected: 4, actual: 5 },
    ],
  };
  assert.equal(classifyExecution(out, 'pass').result, RESULT.PRODUCT_FAILURE);
});

test('infrastructure conditions outrank the reject rule', () => {
  // Otherwise a throttled control would score as a pass, since "did not pass" is the
  // success condition for a control.
  const out = {
    results: [
      { passed: false, error_kind: 'harness_error', stderr: 'Paiza HTTP 429' },
      { passed: false, error_kind: 'wrong_answer' },
    ],
  };
  assert.equal(classifyExecution(out, 'reject').result, RESULT.PROVIDER_THROTTLED);
});

test('a harness failure is not excused by the reject rule either', () => {
  const out = {
    results: [
      { passed: false, error_kind: 'harness_error', stderr: 'could not parse harness output' },
      { passed: false, error_kind: 'wrong_answer' },
    ],
  };
  assert.equal(classifyExecution(out, 'reject').result, RESULT.HARNESS_FAILURE);
});

test('expectation "any" ignores correctness but still catches infrastructure faults', () => {
  // What the starter compile matrix needs: a bare starter's answer is meaningless, but a
  // 429 or an unparseable harness must still be reported.
  const wrong = { results: [{ passed: false, error_kind: 'wrong_answer' }] };
  assert.equal(classifyExecution(wrong, 'any').result, RESULT.PASS);

  const coincidental = { results: [{ passed: true, error_kind: null }] };
  assert.equal(classifyExecution(coincidental, 'any').result, RESULT.PASS);

  const throttledOut = { results: [{ passed: false, error_kind: 'harness_error', stderr: 'HTTP 429' }] };
  assert.equal(classifyExecution(throttledOut, 'any').result, RESULT.PROVIDER_THROTTLED);

  const compileFail = { results: [{ passed: false, error_kind: 'compile_error', stderr: 'error: expected \';\'' }] };
  // A starter that does not compile is the whole point of that tier, and `any` must not
  // swallow it. It is surfaced as a harness failure because the starter is ours.
  assert.equal(classifyExecution(compileFail, 'any').result, RESULT.HARNESS_FAILURE);
});

test('a throttle wins when nothing definitive was learned', () => {
  // Every failing case was throttled, so there is no evidence about correctness. This is
  // the case that must be retried rather than reported as a wrong answer — the exact
  // mistake Phase 2D's sweep made.
  const out = {
    results: [
      { passed: true, error_kind: null },
      { passed: false, error_kind: 'harness_error', stderr: 'Paiza HTTP 429' },
    ],
  };
  const got = classifyExecution(out, 'pass');
  assert.equal(got.result, RESULT.PROVIDER_THROTTLED);
  assert.equal(isRetryable(got.result), true);
});

test('a throttled case is never counted as a wrong answer', () => {
  const out = { results: [{ passed: false, error_kind: 'harness_error', stderr: 'HTTP 429' }] };
  assert.notEqual(classifyExecution(out, 'pass').result, RESULT.PRODUCT_FAILURE);
});
