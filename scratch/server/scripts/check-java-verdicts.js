#!/usr/bin/env node
/**
 * Java verdict mapping against a real provider.
 *
 * check-starters.js proves every generated Java starter COMPILES. This proves the
 * engine maps each outcome to the right verdict, which no amount of compiling shows:
 * Accepted, Wrong Answer, Compilation Error, Runtime Error and Time Limit Exceeded,
 * plus a round-trip of every argument and return type the curriculum uses (including
 * an escaped quote and a non-ASCII character) and a double compared under tolerance.
 *
 * It also covers the two Java-specific shapes worth pinning: a user class declared
 * public must be de-publicised rather than rejected, since Java permits one public
 * top-level class per file and the providers compile this as Main.java.
 *
 * Needs network access to the execution provider. Roughly 70 provider requests.
 *
 *   node server/scripts/check-java-verdicts.js
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dir, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dir, '..', '..', '.env.local'), override: true, quiet: true });
if (String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}
const { runExecution } = await import('../learning-engine/execution-engine.js');

const SIG = { fn: 'rob', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'int' };
const CASES = [
  { id: 't1', input_payload: { nums: [1, 2, 3, 1] }, expected_output: 4, is_hidden: false, order_index: 1 },
  { id: 't2', input_payload: { nums: [2, 7, 9, 3, 1] }, expected_output: 12, is_hidden: false, order_index: 2 },
  { id: 't3', input_payload: { nums: [5] }, expected_output: 5, is_hidden: true, order_index: 3 },
];

const CORRECT = `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0, oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            int best = Math.max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = best;
        }
        return oneBack;
    }
}`;

// Returns the single largest house. Correct for [5], wrong for [1,2,3,1] (3 vs 4).
// "Take every other" would have been wrong as a control: it is genuinely optimal on
// all three of these inputs, so it proved nothing.
const WRONG = `class Solution {
    public int rob(int[] nums) {
        int best = 0;
        for (int i = 0; i < nums.length; i++) best = Math.max(best, nums[i]);
        return best;
    }
}`;

const COMPILE_ERROR = `class Solution {
    public int rob(int[] nums) {
        return   // missing expression
    }
}`;

const RUNTIME_ERROR = `class Solution {
    public int rob(int[] nums) {
        throw new IllegalStateException("boom");
    }
}`;

const PUBLIC_CLASS = `public class Solution {
    public int rob(int[] nums) {
        int twoBack = 0, oneBack = 0;
        for (int n : nums) { int b = Math.max(oneBack, twoBack + n); twoBack = oneBack; oneBack = b; }
        return oneBack;
    }
}`;

const SLOW = `class Solution {
    public int rob(int[] nums) {
        long x = 0;
        for (long i = 0; i < 40000000000L; i++) x += i;
        return (int) x;
    }
}`;

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
let failures = 0;

async function check(label, code, expect) {
  const t0 = Date.now();
  const out = await runExecution({ code, language: 'java', testCases: CASES, cpp_signature: SIG });
  const first = out.results.find((r) => !r.passed) || out.results[0];
  const kinds = [...new Set(out.results.map((r) => r.error_kind).filter(Boolean))];
  const actual = {
    passed: out.pass_count, total: out.total, kinds,
  };
  const ok = expect(actual);
  if (!ok) failures += 1;
  console.log(`${ok ? c.g('PASS') : c.r('FAIL')} ${label}`);
  console.log(c.d(`      ${out.pass_count}/${out.total} passed, kinds=[${kinds.join(',')}], ${((Date.now() - t0) / 1000).toFixed(1)}s, ${out.http_requests ?? '?'} requests`));
  if (!ok || process.env.VERBOSE) {
    console.log(c.d(`      stderr: ${String(first?.stderr || '').slice(0, 300).replace(/\n/g, ' ')}`));
    console.log(c.d(`      actual: ${JSON.stringify(first?.actual)} expected: ${JSON.stringify(first?.expected)}`));
  }
  return out;
}

console.log('\n=== Java through Paiza ===\n');
await check('accepted: correct solution passes every case', CORRECT, (a) => a.passed === a.total && a.total === 3);
await check('accepted: a public user class is de-publicised and still compiles', PUBLIC_CLASS, (a) => a.passed === a.total);
await check('wrong answer: take-every-other fails', WRONG, (a) => a.passed < a.total && a.kinds.includes('wrong_answer'));
await check('compilation error', COMPILE_ERROR, (a) => a.passed === 0 && a.kinds.includes('compile_error'));
await check('runtime error: thrown exception', RUNTIME_ERROR, (a) => a.passed === 0 && a.kinds.includes('runtime_error'));
await check('timeout: busy loop exceeds the 1s CPU cap', SLOW, (a) => a.passed === 0 && a.kinds.includes('time_limit_exceeded'));

// Type coverage: every argument and return type the curriculum actually uses.
const TYPE_SIG = {
  fn: 'echo', class: 'Solution',
  args: [
    { name: 'n', type: 'int' }, { name: 's', type: 'string' },
    { name: 'arr', type: 'vector<int>' }, { name: 'words', type: 'vector<string>' },
    { name: 'grid', type: 'vector<vector<int>>' },
  ],
  ret: 'vector<string>',
};
const TYPE_CODE = `class Solution {
    public String[] echo(int n, String s, int[] arr, String[] words, int[][] grid) {
        return new String[]{ String.valueOf(n), s, String.valueOf(arr.length),
                             String.valueOf(words.length), String.valueOf(grid.length),
                             String.valueOf(grid[0][1]) };
    }
}`;
const TYPE_CASES = [{
  id: 'ty', order_index: 1, is_hidden: false,
  input_payload: { n: 7, s: 'caf\u00e9 "q"', arr: [1, 2, 3], words: ['a', 'b'], grid: [[1, 2], [3, 4]] },
  expected_output: ['7', 'caf\u00e9 "q"', '3', '2', '2', '2'],
}];
const typeOut = await runExecution({ code: TYPE_CODE, language: 'java', testCases: TYPE_CASES, cpp_signature: TYPE_SIG });
const typeOk = typeOut.pass_count === 1;
if (!typeOk) failures += 1;
console.log(`${typeOk ? c.g('PASS') : c.r('FAIL')} every curriculum type round-trips (incl. escaped + non-ASCII string)`);
console.log(c.d(`      actual: ${JSON.stringify(typeOut.results[0]?.actual)}`));

// Double return, which is the only float in the curriculum.
const D_SIG = { fn: 'avg', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }, { name: 'k', type: 'int' }], ret: 'double' };
const D_CODE = `class Solution {
    public double avg(int[] nums, int k) {
        double sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];
        double best = sum;
        for (int i = k; i < nums.length; i++) { sum += nums[i] - nums[i - k]; best = Math.max(best, sum); }
        return best / k;
    }
}`;
const D_CASES = [{ id: 'd1', order_index: 1, is_hidden: false, input_payload: { nums: [1, 12, -5, -6, 50, 3], k: 4 }, expected_output: 12.75 }];
const dOut = await runExecution({ code: D_CODE, language: 'java', testCases: D_CASES, cpp_signature: D_SIG });
const dOk = dOut.pass_count === 1;
if (!dOk) failures += 1;
console.log(`${dOk ? c.g('PASS') : c.r('FAIL')} double return compares with float tolerance`);
console.log(c.d(`      actual: ${JSON.stringify(dOut.results[0]?.actual)} expected 12.75`));

console.log(failures ? c.r(`\n${failures} failed\n`) : c.g('\nAll Java provider checks passed.\n'));
process.exit(failures ? 1 : 0);
