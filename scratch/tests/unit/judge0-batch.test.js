/**
 * Judge0 batch transport, verified against a fake Judge0 rather than RapidAPI.
 *
 * The real host needs a paid key, but the part that can silently be wrong is our
 * own transport: the official host does not enable `wait=true`, so submissions
 * must be created and then POLLED. These tests stand up an HTTP server that
 * speaks Judge0's batch protocol (positional create array, partial rejection,
 * In Queue before terminal, base64 payloads) and assert the engine drives it
 * correctly end to end -- including that each test case keeps its own stdin,
 * status, time and memory.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

// These are read at module load time by execution-engine.js, so they must be set
// before the dynamic import below. Batch size 3 against 7 test cases forces the
// chunking path; the short poll interval keeps the suite fast.
const FAKE_KEY = 'unit-test-key-not-a-real-credential';
process.env.EXECUTION_PROVIDER = 'judge0';
process.env.JUDGE0_API_KEY = FAKE_KEY;
process.env.JUDGE0_API_HOST = 'judge0-ce.test.invalid';
process.env.JUDGE0_BATCH_SIZE = '3';
process.env.JUDGE0_POLL_INTERVAL_MS = '150';
process.env.JUDGE0_MAX_POLLS = '6';

const { runExecution, ERROR_KIND } = await import(
  '../../server/learning-engine/execution-engine.js'
);

// Judge0 status ids we care about.
const IN_QUEUE = { id: 1, description: 'In Queue' };
const ACCEPTED = { id: 3, description: 'Accepted' };
const TLE = { id: 5, description: 'Time Limit Exceeded' };
const COMPILE_ERROR = { id: 6, description: 'Compilation Error' };
const NZEC = { id: 11, description: 'Runtime Error (NZEC)' };

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(String(s || ''), 'base64').toString('utf8');
const sentinel = (json) => `<<<OUT>>>${json}<<<END>>>`;

function sendJson(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

/**
 * A fake Judge0. `httpStatus` forces every response to that status so the
 * transport-failure path can be exercised; `neverFinishes` keeps every
 * submission In Queue forever.
 */
async function startFakeJudge0({ httpStatus = null, body = null, neverFinishes = false } = {}) {
  const state = {
    createCalls: [], // one entry per POST /submissions/batch
    pollCalls: 0,
    authSeen: [], // { key, host } per request
    unauthenticated: 0,
    stdinByToken: new Map(),
    sources: new Set(),
    queryStrings: [],
    subs: new Map(), // token -> { payload, pollsSeen }
    nextToken: 1,
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    state.queryStrings.push(url.search);

    const key = req.headers['x-rapidapi-key'];
    if (!key) {
      state.unauthenticated += 1;
      return sendJson(res, 401, { message: 'You are not subscribed to this API.' });
    }
    state.authSeen.push({ key, host: req.headers['x-rapidapi-host'] });

    if (httpStatus) return sendJson(res, httpStatus, body ?? { error: 'forced failure' });

    if (req.method === 'POST') {
      const parsed = JSON.parse(await readBody(req));
      state.createCalls.push(parsed);
      const out = parsed.submissions.map((s) => {
        state.sources.add(unb64(s.source_code));
        const stdin = unb64(s.stdin);
        const payload = JSON.parse(stdin);
        // A batch can be PARTIALLY rejected and still return 201: the slot holds
        // a validation error instead of a token.
        if (payload.want === 'reject') return { language_id: ['language not found'] };
        const token = `tok-${state.nextToken++}`;
        state.stdinByToken.set(token, stdin);
        state.subs.set(token, { payload, pollsSeen: 0 });
        return { token };
      });
      return sendJson(res, 201, out);
    }

    // GET /submissions/batch?tokens=...
    state.pollCalls += 1;
    const tokens = (url.searchParams.get('tokens') || '').split(',').filter(Boolean);
    const submissions = tokens.map((token) => {
      const sub = state.subs.get(token);
      if (!sub || neverFinishes) return { token, status: IN_QUEUE };
      // Every submission reports In Queue once, so the poll loop is real.
      if (sub.pollsSeen++ === 0) return { token, status: IN_QUEUE };
      return { token, ...terminalFor(sub.payload) };
    });
    return sendJson(res, 200, { submissions });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    state,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** What a finished Judge0 submission looks like, keyed off the test payload. */
function terminalFor(payload) {
  switch (payload.want) {
    case 'tle':
      return { status: TLE, stdout: null, time: '5.0', memory: 2048 };
    case 'runtime':
      return {
        status: NZEC, stdout: null, exit_code: 1, time: '0.01', memory: 2048,
        stderr: b64('ReferenceError: oops is not defined'),
      };
    case 'compile':
      return {
        status: COMPILE_ERROR, stdout: null, time: null, memory: null,
        compile_output: b64('SyntaxError: Unexpected token }'),
      };
    case 'nooutput':
      // Ran, but printed nothing the harness recognises.
      return { status: ACCEPTED, stdout: b64('hello from console.log'), time: '0.02', memory: 3072 };
    default:
      return {
        status: ACCEPTED,
        stdout: b64(`noise on stdout\n${sentinel(payload.emit)}`),
        exit_code: 0,
        time: payload.time ?? '0.012',
        memory: payload.memory ?? 3456,
      };
  }
}

/** A test case whose expected output is `expected` and whose fake run emits `emit`. */
function tc(i, { want = 'ok', expected, emit, hidden = false, ...rest } = {}) {
  return {
    id: `case-${i}`,
    order_index: i,
    is_hidden: hidden,
    input_payload: { nums: [i, i + 1], want, emit: emit ?? JSON.stringify(expected), ...rest },
    expected_output: expected,
  };
}

const CODE = 'function solve(nums) {\n  return nums[0] + nums[1];\n}\n';

test('batch transport: chunking, polling, and per-case verdicts', async (t) => {
  const fake = await startFakeJudge0();
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [
    tc(0, { expected: 1 }),
    tc(1, { expected: 3 }),
    tc(2, { expected: 5, emit: 'null' }), // ran fine, returned the wrong thing
    tc(3, { want: 'tle', expected: 7 }),
    tc(4, { want: 'runtime', expected: 9 }),
    tc(5, { want: 'reject', expected: 11 }),
    tc(6, { expected: 13, hidden: true }),
  ];

  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.provider, 'judge0');
  assert.equal(out.total, 7);
  assert.equal(out.results.length, 7);

  // 7 cases at JUDGE0_BATCH_SIZE=3 => 3 creates. Two polls: the first sees
  // everything In Queue, the second sees it finished.
  assert.equal(fake.state.createCalls.length, 3);
  assert.deepEqual(fake.state.createCalls.map((c) => c.submissions.length), [3, 3, 1]);
  assert.equal(fake.state.pollCalls, 2);
  assert.equal(out.http_requests, 5, 'one submit must cost ~5 requests, not one per test case');

  // Auth on every single request, with the configured host.
  assert.equal(fake.state.unauthenticated, 0);
  assert.equal(fake.state.authSeen.length, 5);
  assert.ok(fake.state.authSeen.every((a) => a.key === FAKE_KEY));
  assert.ok(fake.state.authSeen.every((a) => a.host === 'judge0-ce.test.invalid'));

  // base64 mode and a fields list on the poll, or Judge0 returns raw/every field.
  assert.ok(fake.state.queryStrings.every((q) => q.includes('base64_encoded=true')));
  assert.ok(fake.state.queryStrings.some((q) => q.includes('fields=token')));

  // One compiled program, reused; each case differs only by stdin.
  assert.equal(fake.state.sources.size, 1);
  const source = [...fake.state.sources][0];
  assert.ok(source.includes('function solve'), 'user code must be embedded verbatim');
  assert.ok(source.includes('<<<OUT>>>'), 'the harness must be wrapped around it');
  const stdins = [...fake.state.stdinByToken.values()].map((s) => JSON.parse(s).nums);
  assert.deepEqual(stdins, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7]]);

  // Results stay in test_index order even though they arrive by token.
  assert.deepEqual(out.results.map((r) => r.test_index), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(out.results.map((r) => r.test_case_id),
    ['case-0', 'case-1', 'case-2', 'case-3', 'case-4', 'case-5', 'case-6']);

  const [r0, r1, r2, r3, r4, r5, r6] = out.results;

  assert.equal(r0.passed, true);
  assert.equal(r0.actual, 1);
  assert.equal(r0.error_kind, null);
  assert.equal(r0.runtime_ms, 12, "runtime comes from Judge0's reported CPU time");

  assert.equal(r1.passed, true);

  // Returning null must NOT pass. This is exactly what the mock provider got wrong.
  assert.equal(r2.passed, false);
  assert.equal(r2.error_kind, ERROR_KIND.WRONG_ANSWER);
  assert.equal(r2.actual, null);

  assert.equal(r3.passed, false);
  assert.equal(r3.error_kind, ERROR_KIND.TIME_LIMIT_EXCEEDED);

  assert.equal(r4.passed, false);
  assert.equal(r4.error_kind, ERROR_KIND.RUNTIME_ERROR);
  assert.match(r4.stderr, /oops is not defined/);

  // The rejected slot must be attributed to case 5 specifically, not shifted.
  assert.equal(r5.passed, false);
  assert.equal(r5.error_kind, ERROR_KIND.HARNESS_ERROR);
  assert.match(r5.stderr, /Judge0 rejected this submission/);
  assert.match(r5.stderr, /language not found/);

  assert.equal(r6.passed, true);
  assert.equal(r6.is_hidden, true);

  assert.equal(out.pass_count, 3);
  assert.equal(out.first_failed_index, 2);
  assert.equal(out.memory_bytes, 3456 * 1024);
});

test('compilation failure is reported as a compile error on every case', async (t) => {
  const fake = await startFakeJudge0();
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [tc(0, { want: 'compile', expected: 1 }), tc(1, { want: 'compile', expected: 3 })];
  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.pass_count, 0);
  for (const r of out.results) {
    assert.equal(r.error_kind, ERROR_KIND.COMPILE_ERROR);
    assert.match(r.stderr, /Unexpected token/, 'compile_output must reach the user');
  }
});

test('a run that prints no harness sentinel is a runtime error, not a pass', async (t) => {
  const fake = await startFakeJudge0();
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const out = await runExecution({
    code: CODE,
    language: 'javascript',
    testCases: [tc(0, { want: 'nooutput', expected: 1 })],
  });

  assert.equal(out.pass_count, 0);
  assert.equal(out.results[0].error_kind, ERROR_KIND.RUNTIME_ERROR);
});

test('transport failure fails every case without leaking the API key', async (t) => {
  const fake = await startFakeJudge0({
    httpStatus: 429,
    body: { message: `quota exceeded for key ${FAKE_KEY}` },
  });
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [tc(0, { expected: 1 }), tc(1, { expected: 3 })];
  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  // A Judge0 outage must surface as a failed submission, not a thrown 500.
  assert.equal(out.pass_count, 0);
  assert.equal(out.results.length, 2);
  for (const r of out.results) {
    assert.equal(r.error_kind, ERROR_KIND.HARNESS_ERROR);
    assert.match(r.stderr, /Judge0 HTTP 429/);
  }
  // The upstream body is echoed back truncated. This fake deliberately puts the
  // key in that body to prove judge0Redact strips it before a user ever sees it.
  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes(FAKE_KEY), 'the RapidAPI key must never reach a result payload');
  assert.match(out.results[0].stderr, /\[redacted\]/);
});

test('unfinished submissions are reported as timeouts, not wrong answers', async (t) => {
  // Never leaves In Queue: the poll budget runs out.
  const fake = await startFakeJudge0({ neverFinishes: true });
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const out = await runExecution({
    code: CODE,
    language: 'javascript',
    testCases: [tc(0, { expected: 1 })],
  });

  assert.equal(out.pass_count, 0);
  assert.equal(out.results[0].error_kind, ERROR_KIND.TIME_LIMIT_EXCEEDED);
  assert.match(out.results[0].stderr, /poll budget/);
  assert.equal(fake.state.pollCalls, 6, 'JUDGE0_MAX_POLLS bounds the loop');
});

test('float results compare with tolerance, integers still compare exactly', async (t) => {
  const fake = await startFakeJudge0();
  process.env.JUDGE0_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [
    // maximum-average-subarray-i returns a double: last-bit drift must pass.
    tc(0, { expected: 12.75, emit: '12.750000000001' }),
    // A genuinely different average must still fail.
    tc(1, { expected: 12.75, emit: '12.8' }),
    // Tolerance must not soften integer comparison into an off-by-one.
    tc(2, { expected: 3, emit: '4' }),
    // Whole-number doubles stay exact-friendly.
    tc(3, { expected: 4, emit: '4.0' }),
  ];

  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.results[0].passed, true, '12.750000000001 must satisfy 12.75');
  assert.equal(out.results[1].passed, false, '12.8 must not satisfy 12.75');
  assert.equal(out.results[2].passed, false, 'an off-by-one integer must never pass');
  assert.equal(out.results[3].passed, true);
});
