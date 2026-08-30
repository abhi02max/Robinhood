/**
 * Paiza.IO transport, verified against a fake Paiza rather than the live API.
 *
 * check-paiza.js already proves the engine works against the real service, but
 * that needs the network and it cannot force the failure modes that matter. These
 * tests stand up an HTTP server speaking Paiza's protocol -- form-encoded
 * `POST /runners/create` returning `{id, status:"running"}`, then
 * `GET /runners/get_details` polled until `status` leaves "running" -- and assert
 * the engine reads the four terminal shapes correctly.
 *
 * Every field shape below was copied from a live response on 2026-08-29, not
 * guessed: build_result "failure" for compile errors, result "failure" with
 * exit_code "1" for runtime errors, result "timeout" with time "1.00" for the
 * fixed 1-second CPU cap, and `memory` in BYTES (Judge0 reports kilobytes).
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

// Read at module load time by execution-engine.js, so they must be set before the
// dynamic import. A short poll interval keeps the suite fast; PAIZA_URL is read
// lazily so each test can point it at its own fake server.
const FAKE_KEY = 'unit-test-paiza-key-not-a-real-credential';
process.env.EXECUTION_PROVIDER = 'paiza';
process.env.PAIZA_API_KEY = FAKE_KEY;
process.env.PAIZA_POLL_INTERVAL_MS = '150';
process.env.PAIZA_MAX_POLLS = '4';

const { runExecution, ERROR_KIND } = await import(
  '../../server/learning-engine/execution-engine.js'
);

const sentinel = (json) => `<<<OUT>>>${json}<<<END>>>`;

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
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
 * A fake Paiza. `httpStatus` forces every response to that status;
 * `neverFinishes` keeps every run in status "running" forever.
 */
async function startFakePaiza({ httpStatus = null, body = null, neverFinishes = false } = {}) {
  const state = {
    creates: [], // the decoded form body of each POST /runners/create
    pollCalls: 0,
    keysSeen: new Set(),
    sources: new Set(),
    runs: new Map(), // id -> { payload, pollsSeen }
    nextId: 1,
    sawGetStatus: false,
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/runners/get_status') state.sawGetStatus = true;

    if (req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req));
      state.keysSeen.add(form.get('api_key'));
      if (httpStatus) return sendJson(res, httpStatus, body ?? { error: 'forced failure' });

      const source = form.get('source_code') || '';
      state.sources.add(source);
      state.creates.push({
        language: form.get('language'),
        input: form.get('input'),
        source,
      });

      const payload = JSON.parse(form.get('input') || '{}');
      const id = `run-${state.nextId++}`;
      state.runs.set(id, { payload, pollsSeen: 0 });
      // Create ALWAYS comes back still running -- `longpoll=true` is ignored by
      // the real API, so a transport that trusts the create response is broken.
      return sendJson(res, 200, { id, status: 'running' });
    }

    // GET /runners/get_details
    state.pollCalls += 1;
    state.keysSeen.add(url.searchParams.get('api_key'));
    if (httpStatus) return sendJson(res, httpStatus, body ?? { error: 'forced failure' });

    const run = state.runs.get(url.searchParams.get('id'));
    if (!run || neverFinishes) return sendJson(res, 200, { status: 'running' });
    // Every run reports "running" once first, so the poll loop is exercised.
    if (run.pollsSeen++ === 0) return sendJson(res, 200, { status: 'running' });
    return sendJson(res, 200, { status: 'completed', ...terminalFor(run.payload) });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    state,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** The four terminal shapes, verbatim field names from the live API. */
function terminalFor(payload) {
  switch (payload.want) {
    case 'timeout':
      return {
        build_result: 'success',
        result: 'timeout',
        stdout: '',
        stderr: '',
        exit_code: null,
        time: '1.00',
        memory: 12_000_000,
      };
    case 'runtime':
      return {
        build_result: 'success',
        result: 'failure',
        stdout: '',
        stderr: 'ReferenceError: oops is not defined',
        exit_code: '1',
        time: '0.05',
        memory: 30_000_000,
      };
    case 'compile':
      return {
        build_result: 'failure',
        build_stderr: 'SyntaxError: Unexpected token }',
        build_exit_code: '1',
        result: null,
        stdout: '',
        stderr: '',
        exit_code: null,
        time: null,
        memory: null,
      };
    case 'nooutput':
      // Ran cleanly but printed nothing the harness recognises.
      return {
        build_result: 'success',
        result: 'success',
        stdout: 'hello from console.log\n',
        stderr: '',
        exit_code: '0',
        time: '0.02',
        memory: 8_000_000,
      };
    case 'noisy_stderr':
      // A warning on stderr must NOT fail an otherwise correct answer.
      return {
        build_result: 'success',
        result: 'success',
        stdout: sentinel(payload.emit),
        stderr: 'DeprecationWarning: something is deprecated',
        exit_code: '0',
        time: '0.03',
        memory: 8_000_000,
      };
    default:
      return {
        build_result: 'success',
        result: 'success',
        stdout: `noise on stdout\n${sentinel(payload.emit)}`,
        stderr: '',
        exit_code: '0',
        time: payload.time ?? '0.012',
        memory: payload.memory ?? 3_456_000,
      };
  }
}

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

test('create-then-poll transport with per-case verdicts', async (t) => {
  const fake = await startFakePaiza();
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [
    tc(0, { expected: 1 }),
    tc(1, { expected: 3, hidden: true }),
    tc(2, { expected: 5, emit: 'null' }), // ran fine, returned the wrong thing
    tc(3, { want: 'timeout', expected: 7 }),
    tc(4, { want: 'runtime', expected: 9 }),
    tc(5, { want: 'nooutput', expected: 11 }),
    tc(6, { want: 'noisy_stderr', expected: 13 }),
  ];

  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.provider, 'paiza');
  assert.equal(out.total, 7);
  assert.equal(out.results.length, 7);

  // One create per case; two polls each (first says running). No batching exists.
  assert.equal(fake.state.creates.length, 7);
  assert.equal(fake.state.pollCalls, 14);
  assert.equal(out.http_requests, 21, 'cost must be measured, not assumed');

  // get_details carries its own status, so get_status is never needed.
  assert.equal(fake.state.sawGetStatus, false);

  // The key travels on every request, and only the configured one.
  assert.deepEqual([...fake.state.keysSeen], [FAKE_KEY]);

  // The program is built once and reused; only stdin differs per case.
  assert.equal(fake.state.sources.size, 1, 'the same source must be reused');
  assert.equal(new Set(fake.state.creates.map((c) => c.input)).size, 7);
  assert.deepEqual([...new Set(fake.state.creates.map((c) => c.language))], ['javascript']);

  // Results come back ordered by test_index regardless of completion order.
  assert.deepEqual(out.results.map((r) => r.test_index), [0, 1, 2, 3, 4, 5, 6]);

  const [r0, r1, r2, r3, r4, r5, r6] = out.results;
  assert.equal(r0.passed, true);
  assert.equal(r0.error_kind, null);
  assert.equal(r1.passed, true);
  assert.equal(r1.is_hidden, true);

  assert.equal(r2.passed, false, 'null is not 5');
  assert.equal(r2.error_kind, ERROR_KIND.WRONG_ANSWER);

  assert.equal(r3.passed, false);
  assert.equal(r3.error_kind, ERROR_KIND.TIME_LIMIT_EXCEEDED);

  assert.equal(r4.passed, false);
  assert.equal(r4.error_kind, ERROR_KIND.RUNTIME_ERROR);
  assert.match(r4.stderr, /ReferenceError/);

  assert.equal(r5.passed, false, 'no sentinel is not a pass');
  assert.equal(r5.error_kind, ERROR_KIND.RUNTIME_ERROR);

  assert.equal(r6.passed, true, 'a warning on stderr must not fail a correct answer');

  assert.equal(out.pass_count, 3);
  assert.equal(out.first_failed_index, 2);

  // memory is BYTES on Paiza. 30_000_000 bytes is the peak across these cases;
  // treating it as kilobytes would report 30 GB.
  assert.equal(out.memory_bytes, Math.round(30_000_000 / 1024) * 1024);
});

test('a compile failure is reported as a compile error on every case', async (t) => {
  const fake = await startFakePaiza();
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [0, 1, 2].map((i) => tc(i, { want: 'compile', expected: i }));
  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.pass_count, 0);
  for (const r of out.results) {
    assert.equal(r.error_kind, ERROR_KIND.COMPILE_ERROR);
    assert.match(r.stderr, /SyntaxError/, 'build_stderr must be surfaced, not the empty stderr');
  }
});

test('a transport failure fails every case without leaking the API key', async (t) => {
  const fake = await startFakePaiza({
    httpStatus: 403,
    // An upstream gateway echoing the request back is exactly how a key leaks
    // into a user-visible error. The engine must redact it.
    body: { error: `rejected request with api_key=${FAKE_KEY}` },
  });
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [0, 1].map((i) => tc(i, { expected: i }));
  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.pass_count, 0);
  for (const r of out.results) assert.equal(r.error_kind, ERROR_KIND.HARNESS_ERROR);

  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes(FAKE_KEY), 'the API key must never reach the user');
  assert.match(out.results[0].stderr, /\[redacted\]/);
  assert.match(out.results[0].stderr, /403/, 'the status code is still useful');
});

test('a run that never finishes is a timeout, not a wrong answer', async (t) => {
  const fake = await startFakePaiza({ neverFinishes: true });
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const testCases = [tc(0, { expected: 1 })];
  const out = await runExecution({ code: CODE, language: 'javascript', testCases });

  assert.equal(out.results[0].passed, false);
  assert.equal(out.results[0].error_kind, ERROR_KIND.TIME_LIMIT_EXCEEDED);
  // PAIZA_MAX_POLLS is 4 above: the loop must give up rather than hang.
  assert.equal(fake.state.pollCalls, 4);
});

test('a create response with no id fails the case instead of polling forever', async (t) => {
  // The shape an over-quota or rejected create comes back as: HTTP 200, no `id`.
  const fake = await startFakePaiza({ httpStatus: 200, body: { error: 'no id here' } });
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const out = await runExecution({
    code: CODE,
    language: 'javascript',
    testCases: [tc(0, { expected: 1 })],
  });

  assert.equal(out.results[0].passed, false);
  assert.equal(out.results[0].error_kind, ERROR_KIND.HARNESS_ERROR);
  assert.equal(fake.state.pollCalls, 0, 'no id means nothing to poll');
});

test('python maps to python3, and cpp requires a signature', async (t) => {
  const fake = await startFakePaiza();
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  const py = await runExecution({
    code: 'def solve(nums):\n    return nums[0] + nums[1]\n',
    language: 'python',
    testCases: [tc(0, { expected: 1 })],
  });
  assert.equal(py.pass_count, 1);
  // Paiza's identifier is python3; sending "python" would select Python 2.
  assert.equal(fake.state.creates[0].language, 'python3');

  // No cpp_signature: a compile error with a clear reason, and no HTTP at all.
  const before = fake.state.creates.length;
  const cpp = await runExecution({
    code: 'int solve(vector<int>& nums) { return nums[0]; }',
    language: 'cpp',
    testCases: [tc(0, { expected: 1 })],
  });
  assert.equal(cpp.results[0].error_kind, ERROR_KIND.COMPILE_ERROR);
  assert.equal(fake.state.creates.length, before, 'must fail before spending a request');
});

test('the C++ call shape follows the submission, not just the signature', async (t) => {
  const fake = await startFakePaiza();
  process.env.PAIZA_URL = fake.url;
  t.after(() => fake.close());

  // A signature naming a class, as the seeded maximum-subarray one does.
  const sig = {
    fn: 'maxSubArray',
    ret: 'int',
    args: [{ name: 'nums', type: 'vector<int>' }],
    class: 'Solution',
  };
  const cases = [tc(0, { expected: 1 })];

  const emitted = async (code, cpp_signature) => {
    fake.state.creates.length = 0;
    await runExecution({ code, language: 'cpp', testCases: cases, cpp_signature });
    return fake.state.creates[0].source;
  };

  // Free function against a class signature: must call the function directly.
  // Emitting `Solution __sol;` here failed to compile with "unknown type name
  // 'Solution'", which reads as a platform bug rather than a bad submission.
  const free = await emitted('int maxSubArray(vector<int>& nums) { return nums[0]; }', sig);
  assert.match(free, /__out = maxSubArray\(nums\);/);
  assert.doesNotMatch(free, /Solution __sol;/);

  // Class-style against the same signature: must call the method.
  const cls = await emitted(
    'class Solution {\npublic:\n  int maxSubArray(vector<int>& nums) { return nums[0]; }\n};',
    sig,
  );
  assert.match(cls, /Solution __sol; __out = __sol\.maxSubArray\(nums\);/);

  // Class-style against a signature with no class: still a method call, because
  // LeetCode habits do not depend on how the reference solution was recorded.
  const noClassSig = { ...sig, class: undefined };
  const clsNoSig = await emitted(
    'struct Solution {\n  int maxSubArray(vector<int>& nums) { return nums[0]; }\n};',
    noClassSig,
  );
  assert.match(clsNoSig, /Solution __sol; __out = __sol\.maxSubArray\(nums\);/);

  // A mention is not a definition: `Solution*` must not trigger the class path.
  const mention = await emitted(
    'int maxSubArray(vector<int>& nums) { /* no Solution class here */ return nums[0]; }',
    sig,
  );
  assert.match(mention, /__out = maxSubArray\(nums\);/);
});
