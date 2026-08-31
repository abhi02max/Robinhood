/**
 * Provider result taxonomy and bounded retry, FOR VERIFICATION TOOLING ONLY.
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 2D's final sweep reported `harness_error` on two problems. The cause was an
 * HTTP 429 from Paiza after a long run of consecutive validation sweeps. That is a
 * provider quota condition, and the gate called it a harness failure — the single most
 * expensive kind of wrong answer a release gate can give, because it sends you looking
 * for a bug in code that is correct.
 *
 * The engine cannot tell the difference today. `runExecution`'s per-case catch turns
 * every transport throw into `error_kind: 'harness_error'` with the message in
 * `stderr` (execution-engine.js, the runWithConcurrency catch). Three genuinely
 * different situations arrive identically:
 *
 *   - the candidate's program is broken            -> their problem
 *   - the generated harness is broken              -> our problem, blocks release
 *   - the provider refused to run anything at all  -> nobody's problem, retry later
 *
 * This module separates them for the gate. It does NOT change the engine.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It is not imported by the API, the learning engine, or anything on the submission
 * path. A retry loop there would mask exactly the provider limit we are trying to
 * measure, and would charge a user's wall-clock time for our quota problem. If a real
 * submission hits a 429 the user should see a platform error and we should see it in
 * the numbers. Retrying is a property of *validation*, where waiting is free and the
 * only alternative is a false failure.
 */

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

/**
 * Why a single provider execution turned out the way it did.
 *
 * The ordering matters when several cases in one execution disagree: the worst
 * outcome wins, so one genuine harness failure is never hidden behind nine passes.
 * PROVIDER_THROTTLED sits BELOW the real failures because a throttle is not evidence
 * of anything — if any case produced real information about correctness, that is what
 * should be reported.
 */
export const RESULT = Object.freeze({
  PASS: 'PASS',
  UNSUPPORTED_SIGNATURE: 'UNSUPPORTED_SIGNATURE',
  PROVIDER_THROTTLED: 'PROVIDER_THROTTLED',
  PROVIDER_FAILURE: 'PROVIDER_FAILURE',
  PRODUCT_FAILURE: 'PRODUCT_FAILURE',
  HARNESS_FAILURE: 'HARNESS_FAILURE',
});

/** Worst-wins precedence. Higher number = reported. */
const SEVERITY = Object.freeze({
  [RESULT.PASS]: 0,
  [RESULT.UNSUPPORTED_SIGNATURE]: 1,
  [RESULT.PROVIDER_THROTTLED]: 2,
  [RESULT.PROVIDER_FAILURE]: 3,
  [RESULT.PRODUCT_FAILURE]: 4,
  [RESULT.HARNESS_FAILURE]: 5,
});

/** Does this outcome mean the gate should fail? A throttle does not. */
export function isBlocking(result) {
  return result === RESULT.PRODUCT_FAILURE
    || result === RESULT.HARNESS_FAILURE
    || result === RESULT.PROVIDER_FAILURE;
}

/** Is this outcome worth retrying? Only transient provider conditions. */
export function isRetryable(result) {
  return result === RESULT.PROVIDER_THROTTLED;
}

export function worst(results) {
  let out = RESULT.PASS;
  for (const r of results) if (SEVERITY[r] > SEVERITY[out]) out = r;
  return out;
}

// ---------------------------------------------------------------------------
// Recognising a throttle
// ---------------------------------------------------------------------------

/**
 * Patterns that mean "the provider declined to run this, try later".
 *
 * Paiza is an undocumented free endpoint and its throttle message is localised —
 * the 2D failure came back in Japanese. Rather than hardcode a translation that
 * could change without notice, this matches on:
 *
 *   1. the HTTP status, which `paizaFetch` puts in the message verbatim. This is the
 *      reliable signal and the one 2D actually produced.
 *   2. English rate-limit vocabulary, for Judge0/RapidAPI, which returns 429 with a
 *      quota message.
 *   3. Japanese vocabulary for limits and "try again later" — 制限 (limit), 回数
 *      (count), しばらく (a while), 超え (exceeded). Matched as a fallback only,
 *      because relying on it alone would be brittle.
 *
 * `create returned no id` is treated separately below: it means the provider rejected
 * the submission before running it, which is never the candidate's or the harness's
 * fault, but is not necessarily a throttle either.
 */
const THROTTLE_PATTERNS = [
  /\bHTTP\s+429\b/i,
  /\b429\b[^0-9]{0,20}too\s+many/i,
  /too\s+many\s+requests/i,
  /rate[\s_-]?limit/i,
  /quota\s+(exceeded|exhausted)/i,
  /retry[\s-]?after/i,
  /制限/,
  /回数/,
  /しばらく/,
  /超え/,
];

/** The provider was reachable but refused to accept or complete the work. */
const PROVIDER_FAILURE_PATTERNS = [
  /\bHTTP\s+5\d\d\b/,
  /returned no run id/i,
  /\bECONNRESET\b/i,
  /\bENOTFOUND\b/i,
  /\bEAI_AGAIN\b/i,
  /socket hang up/i,
  /fetch failed/i,
  /network|dns/i,
  /timed out/i,
];

export function looksThrottled(text) {
  const s = String(text || '');
  return THROTTLE_PATTERNS.some((re) => re.test(s));
}

export function looksProviderFailure(text) {
  const s = String(text || '');
  return PROVIDER_FAILURE_PATTERNS.some((re) => re.test(s));
}

/**
 * Classify ONE test-case result from `runExecution`.
 *
 * @param {object} caseResult  one entry of `runExecution().results`
 * @param {'pass'|'reject'} expectation
 *        `pass`   — a reference solution: anything other than passing is a failure.
 *        `reject` — a known-wrong control or a bare starter. Note the asymmetry: a
 *                   control is judged at the EXECUTION level by `classifyExecution`, not
 *                   here, because a single case passing is not a defect. See the comment
 *                   on `classifyExecution`.
 * @returns {{result: string, reason: string}}
 */
export function classifyCase(caseResult, expectation = 'pass') {
  const kind = caseResult?.error_kind || null;
  const stderr = String(caseResult?.stderr || caseResult?.message || '');

  // A harness_error is the only kind the transport layer collapses into, so it is the
  // only one worth re-reading. Everything else came from a real compile or run.
  if (kind === 'harness_error') {
    if (looksThrottled(stderr)) {
      return { result: RESULT.PROVIDER_THROTTLED, reason: firstLine(stderr) };
    }
    if (looksProviderFailure(stderr)) {
      return { result: RESULT.PROVIDER_FAILURE, reason: firstLine(stderr) };
    }
    // Nothing recognisable: the generated program produced output the harness could
    // not parse. That is ours.
    return { result: RESULT.HARNESS_FAILURE, reason: firstLine(stderr) || 'harness_error with no detail' };
  }

  if (expectation === 'reject') {
    if (caseResult?.passed) {
      return { result: RESULT.PRODUCT_FAILURE, reason: 'a known-wrong solution was accepted' };
    }
    return { result: RESULT.PASS, reason: kind || 'rejected' };
  }

  if (caseResult?.passed) return { result: RESULT.PASS, reason: '' };

  // A reference solution that fails. compile_error points at the generated program,
  // which is the harness; wrong_answer points at the serializer or the comparison.
  if (kind === 'compile_error') {
    return { result: RESULT.HARNESS_FAILURE, reason: `reference solution did not compile: ${firstLine(stderr)}` };
  }
  return {
    result: RESULT.PRODUCT_FAILURE,
    reason: `${kind || 'not passed'}: expected ${json(caseResult?.expected)} got ${json(caseResult?.actual)}`,
  };
}

/**
 * Classify a whole `runExecution` output. Worst case wins.
 *
 * REJECTION IS AN EXECUTION-LEVEL PROPERTY, NOT A PER-CASE ONE
 * -----------------------------------------------------------
 * A first version of this judged controls per case: any case a known-wrong solution
 * passed was a PRODUCT_FAILURE. The gate promptly reported three, and all three were the
 * gate's fault. The `vector<int>` control returns `nums.slice(0, 1)`, and on the empty
 * input `[].slice(0, 1)` is `[]` — the correct answer. The control was still wrong on the
 * other three cases.
 *
 * That is not a defect, it is how grading works: a submission is Accepted only when EVERY
 * case passes, so what a control has to prove is that the submission as a whole is not
 * accepted. Individual coincidental passes are expected and harmless — `check-starters.js`
 * relies on the same fact when it notes that a placeholder `return 0` can satisfy a case
 * whose answer happens to be 0.
 *
 * Requiring a control to be wrong on every case would also make the corpus worse: it
 * would rule out the most realistic controls, the off-by-one kind that is right sometimes.
 *
 * Provider and harness conditions are still read per case, because those are never
 * "expected" for either expectation.
 */
export function classifyExecution(out, expectation = 'pass') {
  const cases = Array.isArray(out?.results) ? out.results : [];
  if (!cases.length) {
    return { result: RESULT.PROVIDER_FAILURE, reason: 'execution returned no results' };
  }

  // Two independent readings, then the worse one wins.
  //
  //   infra        per case: throttles, provider faults, unparseable harness output.
  //   correctness  execution-level: was the submission accepted, and should it have been.
  //
  // They are combined by SEVERITY rather than short-circuiting on infra, because a
  // definitive correctness verdict is worth more than a throttle. If two cases were
  // throttled and a third came back with the wrong VALUE, that wrong value is a fact —
  // reporting the throttle instead would burn a retry to rediscover it. A throttle only
  // wins when nothing definitive was learned.
  const isInfra = (r) => r === RESULT.PROVIDER_THROTTLED
    || r === RESULT.PROVIDER_FAILURE
    || r === RESULT.HARNESS_FAILURE;

  let infra = { result: RESULT.PASS, reason: '' };
  for (const cr of cases) {
    const got = classifyCase(cr, 'pass');
    if (isInfra(got.result) && SEVERITY[got.result] > SEVERITY[infra.result]) infra = got;
  }

  const passed = cases.filter((cr) => cr.passed).length;
  let correctness = { result: RESULT.PASS, reason: `${passed}/${cases.length} cases passed` };

  if (expectation === 'reject') {
    if (passed === cases.length) {
      correctness = { result: RESULT.PRODUCT_FAILURE, reason: `a known-wrong solution was accepted on all ${cases.length} case(s)` };
    }
  } else if (expectation === 'pass' && passed !== cases.length) {
    // Only a case that failed for a NON-infra reason says anything about correctness.
    // A throttled case tells us nothing, and treating it as a wrong answer is exactly the
    // 2D mistake.
    const firstReal = cases.find((cr) => !cr.passed && !isInfra(classifyCase(cr, 'pass').result));
    if (firstReal) correctness = classifyCase(firstReal, 'pass');
  }
  // `expectation === 'any'` deliberately leaves correctness at PASS: the caller judges it
  // itself. The starter compile matrix uses this, because a bare starter returns a zero
  // value, so both "wrong answer" and "coincidentally correct" are acceptable and the
  // only claim is that the program built and ran.

  return SEVERITY[infra.result] > SEVERITY[correctness.result] ? infra : correctness;
}

const firstLine = (s) => String(s || '').split('\n')[0].trim().slice(0, 240);
const json = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };

// ---------------------------------------------------------------------------
// Bounded retry with jitter
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a provider execution, retrying ONLY on a recognised throttle.
 *
 * Bounded on purpose. An unbounded retry turns a gate into a program that never
 * finishes and never tells you the provider is rationing you, which is information
 * the Judge0 migration needs. After `maxRetries` the throttle is reported as a
 * throttle — not a pass, and not a failure — and the caller decides.
 *
 * Full jitter (`random() * delay`) rather than fixed backoff: the gate runs several
 * executions concurrently, and they were throttled at the same moment, so an
 * unjittered schedule would have them all retry at the same moment too.
 *
 * @param {() => Promise<object>} exec  returns a `runExecution` output
 * @param {object} opts
 * @param {'pass'|'reject'} opts.expectation
 * @param {number} opts.maxRetries      default 3, so at most 4 attempts
 * @param {number} opts.baseDelayMs     default 4000
 * @param {number} opts.maxDelayMs      default 30000
 * @param {ProviderStats} [opts.stats]
 * @param {(msg: string) => void} [opts.onRetry]
 */
export async function runWithBackoff(exec, {
  expectation = 'pass',
  maxRetries = 3,
  baseDelayMs = 4000,
  maxDelayMs = 30000,
  stats = null,
  onRetry = null,
  label = '',
} = {}) {
  let attempt = 0;
  let last = { result: RESULT.PROVIDER_FAILURE, reason: 'never ran' };
  let out = null;

  for (;;) {
    const t0 = Date.now();
    try {
      out = await exec();
      last = classifyExecution(out, expectation);
    } catch (e) {
      // A throw here escaped runExecution entirely — signature validation, or a
      // provider error on the single shared path rather than per case.
      const msg = String((e && e.message) || e);
      last = looksThrottled(msg)
        ? { result: RESULT.PROVIDER_THROTTLED, reason: firstLine(msg) }
        : looksProviderFailure(msg)
          ? { result: RESULT.PROVIDER_FAILURE, reason: firstLine(msg) }
          : { result: RESULT.HARNESS_FAILURE, reason: firstLine(msg) };
      out = null;
    }

    if (stats) {
      stats.executions += 1;
      stats.providerMs += Date.now() - t0;
      if (last.result === RESULT.PROVIDER_THROTTLED) stats.throttles += 1;
    }

    if (!isRetryable(last.result) || attempt >= maxRetries) break;

    const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const delay = Math.round(Math.random() * ceiling);
    attempt += 1;
    if (stats) stats.retries += 1;
    if (onRetry) {
      onRetry(`throttled${label ? ` on ${label}` : ''}, retry ${attempt}/${maxRetries} in ${(delay / 1000).toFixed(1)}s`);
    }
    await sleep(delay);
  }

  return { ...last, attempts: attempt + 1, out };
}

/** Counters that become the throttling evidence for the Judge0 migration. */
export class ProviderStats {
  constructor() {
    this.executions = 0;
    this.retries = 0;
    this.throttles = 0;
    this.providerMs = 0;
    this.byResult = Object.fromEntries(Object.values(RESULT).map((r) => [r, 0]));
  }

  record(result) {
    this.byResult[result] = (this.byResult[result] || 0) + 1;
  }

  get passes() { return this.byResult[RESULT.PASS] || 0; }

  get failures() {
    return (this.byResult[RESULT.PRODUCT_FAILURE] || 0)
      + (this.byResult[RESULT.HARNESS_FAILURE] || 0)
      + (this.byResult[RESULT.PROVIDER_FAILURE] || 0);
  }

  toJSON() {
    return {
      executions: this.executions,
      passes: this.passes,
      failures: this.failures,
      throttles: this.throttles,
      retries: this.retries,
      provider_seconds: Math.round(this.providerMs / 1000),
      by_result: this.byResult,
    };
  }
}
