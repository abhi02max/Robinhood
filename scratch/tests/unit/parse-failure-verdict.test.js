import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

/**
 * D10 — a parse failure in JavaScript or Python must be a Compilation Error.
 *
 * Defect D3 (fixed in Phase 1b) was a C++ compile error labelled "Runtime Error". The
 * interpreted languages had the same bug and it survived, because they have no compile
 * step for the provider to report on: Node and CPython fail at parse time by writing to
 * stderr and exiting non-zero, which is indistinguishable from a crash unless you look
 * closer.
 *
 * These tests pin the DISCRIMINATOR, which is the part that makes the fix safe rather
 * than a guess. Sniffing stderr for "SyntaxError" alone would misreport
 * `JSON.parse("{oops")` — a genuine runtime SyntaxError — as a compile error. The
 * harness wraps user code in try/catch and prefixes what it catches with
 * `RuntimeError: `; a parse failure kills the process before that handler exists, so the
 * prefix cannot be present. Its ABSENCE is the signal.
 *
 * Both stderr shapes below were captured from the live provider, not invented.
 */

const PORT_BASE = 34600;

/**
 * A fake Paiza that returns a canned run result, so the verdict mapping is tested without
 * a provider and without quota. Mirrors the transport contract asserted in
 * paiza-runner.test.js: create returns an id, get_details carries the outcome.
 */
async function withFakePaiza(details, fn) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/runners/create')) {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => res.end(JSON.stringify({ id: 'fake-1', status: 'running' })));
      return;
    }
    res.end(JSON.stringify({ id: 'fake-1', status: 'completed', ...details }));
  });

  const port = PORT_BASE + Math.floor(Math.random() * 200);
  await new Promise((r) => server.listen(port, '127.0.0.1', r));

  const prevUrl = process.env.PAIZA_URL;
  const prevProvider = process.env.EXECUTION_PROVIDER;
  const prevPoll = process.env.PAIZA_POLL_INTERVAL_MS;
  process.env.PAIZA_URL = `http://127.0.0.1:${port}`;
  process.env.EXECUTION_PROVIDER = 'paiza';
  process.env.PAIZA_POLL_INTERVAL_MS = '150';
  try {
    // Imported inside so the URL is read lazily, as getPaizaUrl() does.
    const { runExecution } = await import('../../server/learning-engine/execution-engine.js');
    return await fn(runExecution);
  } finally {
    process.env.PAIZA_URL = prevUrl;
    process.env.EXECUTION_PROVIDER = prevProvider;
    process.env.PAIZA_POLL_INTERVAL_MS = prevPoll;
    await new Promise((r) => server.close(r));
  }
}

const CASES = [{ id: 'd1', order_index: 1, is_hidden: false, input_payload: { n: 4 }, expected_output: 4 }];
const JS = 'function echoInt(n) {\n  return n;\n}';
const PY = 'def echo_int(n):\n    return n';

// Captured from Node 16 on Paiza.
const NODE_PARSE_FAILURE = [
  '/workspace/Main.js:1',
  'function echoInt(n) { return n; }}}',
  '                                  ^',
  '',
  "SyntaxError: Unexpected token '}'",
  '    at Object.compileFunction (node:vm:360:18)',
].join('\n');

// Captured from CPython 3.11 on Paiza.
const PY_PARSE_FAILURE = [
  '  File "/workspace/Main.py", line 2',
  '    return n +',
  '              ^',
  'SyntaxError: invalid syntax',
].join('\n');

const PY_INDENT_FAILURE = [
  '  File "/workspace/Main.py", line 2',
  '    return n',
  '    ^',
  'IndentationError: expected an indented block after function definition on line 1',
].join('\n');

// Also captured live: the harness catches it, so the prefix is present.
const RUNTIME_SYNTAX_ERROR = [
  'RuntimeError: SyntaxError: Unexpected token o in JSON at position 1',
  '    at JSON.parse (<anonymous>)',
  '    at echoInt (/workspace/Main.js:1:35)',
].join('\n');

const failure = (stderr) => ({ result: 'failure', exit_code: '1', stderr, stdout: '', time: '0.05', memory: 8000000 });

// ---------------------------------------------------------------------------

test('D10: a Node parse failure is a compile error, not a runtime error', async () => {
  await withFakePaiza(failure(NODE_PARSE_FAILURE), async (runExecution) => {
    const out = await runExecution({ code: JS, language: 'javascript', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'compile_error');
  });
});

test('D10: a CPython SyntaxError is a compile error', async () => {
  await withFakePaiza(failure(PY_PARSE_FAILURE), async (runExecution) => {
    const out = await runExecution({ code: PY, language: 'python', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'compile_error');
  });
});

test('D10: an IndentationError is a compile error', async () => {
  await withFakePaiza(failure(PY_INDENT_FAILURE), async (runExecution) => {
    const out = await runExecution({ code: PY, language: 'python', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'compile_error');
  });
});

test('D10: a RUNTIME SyntaxError stays a runtime error', async () => {
  // The whole reason the discriminator is the RuntimeError: prefix and not the word
  // "SyntaxError". Getting this wrong would trade one wrong verdict for another.
  await withFakePaiza(failure(RUNTIME_SYNTAX_ERROR), async (runExecution) => {
    const out = await runExecution({ code: JS, language: 'javascript', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'runtime_error');
  });
});

test('D10: an ordinary runtime exception is untouched', async () => {
  await withFakePaiza(failure('RuntimeError: Error: boom\n    at echoInt (/workspace/Main.js:2:9)'), async (runExecution) => {
    const out = await runExecution({ code: JS, language: 'javascript', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'runtime_error');
  });
});

test('D10: a runtime failure with no syntax vocabulary at all stays a runtime error', async () => {
  await withFakePaiza(failure('Segmentation fault'), async (runExecution) => {
    const out = await runExecution({ code: JS, language: 'javascript', testCases: CASES });
    assert.equal(out.results[0].error_kind, 'runtime_error');
  });
});

test('D10 is scoped to source-parsed languages and leaves C++ alone', async () => {
  // C++ has a real compiler whose failures already arrive as build_result: "failure", and
  // it uses the same RuntimeError: prefix. A C++ program that somehow printed the word
  // SyntaxError while crashing must still be a runtime error.
  const sig = { fn: 'echoInt', class: 'Solution', args: [{ name: 'n', type: 'int' }], ret: 'int' };
  const cpp = '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) { return n; }\n};';
  await withFakePaiza(failure('terminate called: SyntaxError somewhere in a message'), async (runExecution) => {
    const out = await runExecution({ code: cpp, language: 'cpp', testCases: CASES, cpp_signature: sig });
    assert.equal(out.results[0].error_kind, 'runtime_error');
  });
});

test('a real compile failure is still a compile error for a compiled language', async () => {
  const sig = { fn: 'echoInt', class: 'Solution', args: [{ name: 'n', type: 'int' }], ret: 'int' };
  const cpp = '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) { return n; }\n};';
  await withFakePaiza(
    { build_result: 'failure', build_stderr: "error: expected ';'", build_exit_code: '1', result: null },
    async (runExecution) => {
      const out = await runExecution({ code: cpp, language: 'cpp', testCases: CASES, cpp_signature: sig });
      assert.equal(out.results[0].error_kind, 'compile_error');
    },
  );
});
