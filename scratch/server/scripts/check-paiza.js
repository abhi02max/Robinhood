#!/usr/bin/env node
/**
 * Paiza.IO preflight check.
 *
 *     node server/scripts/check-paiza.js
 *
 * Unlike check-judge0.js this needs no key -- Paiza's `guest` key is the default
 * and works without signup. It drives the REAL runExecution() from
 * execution-engine.js against synthetic test cases, so it exercises the whole
 * path a submission takes (harness generation, stdin encoding, sentinel parsing,
 * expected-output comparison) rather than just the HTTP transport.
 *
 * What it proves, per language:
 *
 *   1. a correct solution is Accepted on every case
 *   2. a wrong solution is Wrong Answer -- NOT a pass (the mock provider's bug)
 *   3. a throwing solution is a runtime error, with the message reaching stderr
 *   4. how close real runtimes are to Paiza's fixed 1.00s CPU cap
 *
 * No database and no running server required.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolved from this file, not cwd, so it behaves the same from the repo root.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

// Force the provider for this script only. Whatever EXECUTION_PROVIDER is set to
// in .env.local is irrelevant here -- the point is to test paiza specifically,
// and reading `mock` would make every check pass for the wrong reason.
process.env.EXECUTION_PROVIDER = 'paiza';

const { runExecution } = await import('../learning-engine/execution-engine.js');

// Three cases: the third is deliberately larger so the reported runtime says
// something about headroom under the 1-second cap.
const CASES = [
  { id: 1, test_index: 0, input_payload: { a: 2, b: 2 }, expected_output: 4, is_hidden: false },
  { id: 2, test_index: 1, input_payload: { a: -5, b: 5 }, expected_output: 0, is_hidden: false },
  { id: 3, test_index: 2, input_payload: { a: 1000000, b: 2000000 }, expected_output: 3000000, is_hidden: true },
];

const PROGRAMS = {
  javascript: {
    correct: 'function addTwo(a, b) {\n  return a + b;\n}\n',
    wrong: 'function addTwo(a, b) {\n  return a - b;\n}\n',
    throws: 'function addTwo(a, b) {\n  throw new Error("intentional failure");\n}\n',
  },
  python: {
    correct: 'def add_two(a, b):\n    return a + b\n',
    wrong: 'def add_two(a, b):\n    return a - b\n',
    throws: 'def add_two(a, b):\n    raise ValueError("intentional failure")\n',
  },
  cpp: {
    correct: 'int addTwo(int a, int b) {\n    return a + b;\n}\n',
    wrong: 'int addTwo(int a, int b) {\n    return a - b;\n}\n',
    throws: 'int addTwo(int a, int b) {\n    throw std::runtime_error("intentional failure");\n}\n',
  },
};

// cpp needs the signature metadata the C++ harness builds its main() from.
const CPP_SIGNATURE = {
  fn: 'addTwo',
  ret: 'int',
  args: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }],
};

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failures += 1; console.log(`  FAIL  ${m}`); };
const info = (m) => console.log(`  INFO  ${m}`);

function summarize(r) {
  const verdicts = r.results.map((x) => (x.passed ? 'ok' : (x.error_kind || 'wrong_answer')));
  return `${r.pass_count}/${r.total} [${verdicts.join(', ')}]`;
}

async function checkLanguage(language, programs) {
  console.log(`\n--- ${language} ---`);
  const opts = language === 'cpp' ? { cpp_signature: CPP_SIGNATURE } : {};

  // 1. correct
  const good = await runExecution({ language, code: programs.correct, testCases: CASES, ...opts });
  if (good.pass_count === CASES.length) {
    ok(`correct solution accepted: ${summarize(good)}`);
  } else {
    bad(`correct solution did not pass every case: ${summarize(good)}`);
    const f = good.results.find((x) => !x.passed);
    if (f) info(`first failure: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}; stderr: ${String(f.stderr || '').slice(0, 300)}`);
  }
  const times = good.results.map((x) => x.runtime_ms);
  info(`per-case wall time: ${times.join('ms, ')}ms   total ${good.runtime_ms}ms   http ${good.http_requests} requests`);
  info(`peak memory reported: ${good.memory_bytes} bytes`);

  // 2. wrong -- the check the mock provider fails
  const wrong = await runExecution({ language, code: programs.wrong, testCases: CASES, ...opts });
  // a-b equals a+b only when b is 0, which none of the cases use.
  if (wrong.pass_count === 0) {
    ok(`wrong solution rejected: ${summarize(wrong)}`);
  } else {
    bad(`wrong solution passed ${wrong.pass_count} case(s) -- grading is not real`);
  }

  // 3. throwing
  const threw = await runExecution({ language, code: programs.throws, testCases: CASES, ...opts });
  const kinds = new Set(threw.results.map((x) => x.error_kind));
  if (threw.pass_count === 0) ok(`throwing solution failed every case (kinds: ${[...kinds].join(', ')})`);
  else bad(`throwing solution passed ${threw.pass_count} case(s)`);
  const stderr = threw.results.map((x) => x.stderr || '').join('\n');
  if (/intentional failure/.test(stderr)) ok('the thrown message reaches stderr');
  else info(`stderr did not carry the message: ${JSON.stringify(stderr.slice(0, 200))}`);
}

console.log(`Paiza preflight against ${process.env.PAIZA_URL || 'https://api.paiza.io'}`);
console.log(`  api_key: ${process.env.PAIZA_API_KEY || 'guest'} (guest needs no signup)`);
console.log('  Paiza caps CPU at 1.00s and does not let a caller raise it.');

for (const [language, programs] of Object.entries(PROGRAMS)) {
  try {
    await checkLanguage(language, programs);
  } catch (e) {
    bad(`${language}: ${String((e && e.message) || e)}`);
  }
}

console.log('');
if (failures) {
  console.log(`${failures} check(s) FAILED -- do not flip EXECUTION_PROVIDER to paiza yet.`);
  process.exit(1);
}
console.log('All checks passed. EXECUTION_PROVIDER=paiza will grade submissions for real.');
