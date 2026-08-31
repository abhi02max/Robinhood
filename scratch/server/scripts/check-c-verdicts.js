#!/usr/bin/env node
/**
 * C verdict mapping and calling conventions against a real provider.
 *
 * check-starters.js proves every generated C starter compiles. This proves the parts
 * that compiling cannot show:
 *
 *   - each outcome maps to the right verdict (Accepted, Wrong Answer, Compilation
 *     Error, Runtime Error, Time Limit Exceeded);
 *   - the length-beside-every-array convention actually reaches the function;
 *   - the `int* returnSize` out-parameter works for array returns, including the empty
 *     case, which is a legitimate answer and must serialize as [] not null;
 *   - strings survive as char* including an escaped quote and a non-ASCII character
 *     (the literal encoder emits UTF-8 bytes as OCTAL escapes, because C's \\x is
 *     greedy and would swallow following hex digits);
 *   - it is really C and not C++, which is what the old id-54 mapping made it.
 *
 * Roughly 60 provider requests.
 *
 *   node server/scripts/check-c-verdicts.js
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

const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
let failures = 0;

async function check(label, { code, sig, cases }, expect) {
  const t0 = Date.now();
  const out = await runExecution({ code, language: 'c', testCases: cases, cpp_signature: sig });
  const kinds = [...new Set(out.results.map((r) => r.error_kind).filter(Boolean))];
  const ok = expect({ passed: out.pass_count, total: out.total, kinds });
  if (!ok) failures += 1;
  console.log(`${ok ? c.g('PASS') : c.r('FAIL')} ${label}`);
  console.log(c.d(`      ${out.pass_count}/${out.total}, kinds=[${kinds.join(',')}], ${((Date.now() - t0) / 1000).toFixed(1)}s`));
  if (!ok) {
    const bad = out.results.find((r) => !r.passed) || out.results[0];
    console.log(c.d(`      actual=${JSON.stringify(bad?.actual)} expected=${JSON.stringify(bad?.expected)}`));
    console.log(c.d(`      stderr=${String(bad?.stderr || '').slice(0, 400).replace(/\n/g, ' ')}`));
  }
  return out;
}

const allPass = (a) => a.passed === a.total && a.total > 0;
const hasKind = (k) => (a) => a.passed < a.total && a.kinds.includes(k);

// --- scalar return, array argument with a companion length -------------------
const ROB_SIG = { fn: 'rob', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'int' };
const ROB_CASES = [
  { id: '1', order_index: 1, is_hidden: false, input_payload: { nums: [1, 2, 3, 1] }, expected_output: 4 },
  { id: '2', order_index: 2, is_hidden: false, input_payload: { nums: [2, 7, 9, 3, 1] }, expected_output: 12 },
  { id: '3', order_index: 3, is_hidden: true, input_payload: { nums: [] }, expected_output: 0 },
];
await check('accepted: array argument arrives with its length (incl. empty array)', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `int rob(int* nums, int numsSize) {
    int twoBack = 0, oneBack = 0, i;
    for (i = 0; i < numsSize; i++) {
        int best = oneBack > twoBack + nums[i] ? oneBack : twoBack + nums[i];
        twoBack = oneBack;
        oneBack = best;
    }
    return oneBack;
}`,
}, allPass);

await check('wrong answer', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `int rob(int* nums, int numsSize) {
    int best = 0, i;
    for (i = 0; i < numsSize; i++) if (nums[i] > best) best = nums[i];
    return best;
}`,
}, hasKind('wrong_answer'));

await check('compilation error', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: 'int rob(int* nums, int numsSize) { return }',
}, hasKind('compile_error'));

// abort() raises SIGABRT deterministically. A null dereference is NOT a usable probe
// here and that is worth recording: it is undefined behaviour, so the compiler is
// free not to trap it, and measured on Paiza/Clang it returned garbage (-442586288)
// and was graded Wrong Answer rather than Runtime Error. That is a real hazard of the
// language rather than a harness defect — a C solution can corrupt memory and be
// reported as a wrong answer instead of a crash.
await check('runtime error: abort() is reported as a runtime error', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `#include <stdlib.h>
int rob(int* nums, int numsSize) {
    abort();
    return 0;
}`,
}, hasKind('runtime_error'));

await check('runtime error: an out-of-range exit code is a runtime error', {
  sig: ROB_SIG,
  cases: [ROB_CASES[0]],
  code: `#include <stdlib.h>
int rob(int* nums, int numsSize) {
    exit(42);
}`,
}, hasKind('runtime_error'));

await check('timeout: busy loop exceeds the 1s CPU cap', {
  sig: ROB_SIG,
  cases: [ROB_CASES[0]],
  code: `int rob(int* nums, int numsSize) {
    volatile long long x = 0;
    long long i;
    for (i = 0; i < 40000000000LL; i++) x += i;
    return (int) x;
}`,
}, hasKind('time_limit_exceeded'));

// --- array return via the returnSize out-parameter ---------------------------
const TWOSUM_SIG = {
  fn: 'twoSum',
  args: [{ name: 'numbers', type: 'vector<int>' }, { name: 'target', type: 'int' }],
  ret: 'vector<int>',
};
await check('accepted: array return through *returnSize (1-indexed, per the seed data)', {
  sig: TWOSUM_SIG,
  cases: [
    { id: '1', order_index: 1, is_hidden: false, input_payload: { numbers: [2, 7, 11, 15], target: 9 }, expected_output: [1, 2] },
    { id: '2', order_index: 2, is_hidden: false, input_payload: { numbers: [2, 3, 4], target: 6 }, expected_output: [1, 3] },
  ],
  code: `int* twoSum(int* numbers, int numbersSize, int target, int* returnSize) {
    int lo = 0, hi = numbersSize - 1;
    while (lo < hi) {
        int sum = numbers[lo] + numbers[hi];
        if (sum == target) {
            int* out = (int*) malloc(2 * sizeof(int));
            out[0] = lo + 1; out[1] = hi + 1;
            *returnSize = 2;
            return out;
        }
        if (sum < target) lo++; else hi--;
    }
    *returnSize = 0;
    return NULL;
}`,
}, allPass);

await check('accepted: an empty array return serializes as [] and not null', {
  sig: TWOSUM_SIG,
  cases: [{ id: '1', order_index: 1, is_hidden: false, input_payload: { numbers: [1, 2], target: 99 }, expected_output: [] }],
  code: `int* twoSum(int* numbers, int numbersSize, int target, int* returnSize) {
    *returnSize = 0;
    return NULL;
}`,
}, allPass);

// --- strings ----------------------------------------------------------------
await check('accepted: char* in and out, with an escaped quote and non-ASCII', {
  sig: { fn: 'echo', args: [{ name: 's', type: 'string' }], ret: 'string' },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { s: 'caf\u00e9 "q" \\ x' },
    expected_output: 'caf\u00e9 "q" \\ x',
  }],
  code: `char* echo(char* s) {
    return s;
}`,
}, allPass);

await check('accepted: char** array of strings with its length', {
  sig: { fn: 'firstOf', args: [{ name: 'words', type: 'vector<string>' }], ret: 'vector<string>' },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { words: ['alpha', 'beta', 'gamma'] },
    expected_output: ['alpha', 'gamma'],
  }],
  code: `char** firstOf(char** words, int wordsSize, int* returnSize) {
    char** out = (char**) malloc(2 * sizeof(char*));
    out[0] = words[0];
    out[1] = words[wordsSize - 1];
    *returnSize = 2;
    return out;
}`,
}, allPass);

// --- it is really C, not C++ -------------------------------------------------
await check('this is a C compiler: a C++-only construct must NOT compile', {
  sig: ROB_SIG,
  cases: [ROB_CASES[0]],
  // `class` is not a C keyword and std:: does not exist. Under the old mapping this
  // compiled, because `c` was pointed at the C++ compiler.
  code: `#include <vector>
class Helper { public: int v; };
int rob(int* nums, int numsSize) {
    std::vector<int> v;
    return 0;
}`,
}, hasKind('compile_error'));

await check('accepted: bool and double round-trip', {
  sig: { fn: 'ratio', args: [{ name: 'nums', type: 'vector<int>' }, { name: 'flag', type: 'bool' }], ret: 'double' },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { nums: [1, 12, -5, -6, 50, 3], flag: true },
    expected_output: 12.75,
  }],
  code: `double ratio(int* nums, int numsSize, bool flag) {
    if (!flag) return 0.0;
    double sum = 0; int i;
    for (i = 0; i < 4; i++) sum += nums[i];
    double best = sum;
    for (i = 4; i < numsSize; i++) { sum += nums[i] - nums[i - 4]; if (sum > best) best = sum; }
    return best / 4.0;
}`,
}, allPass);

console.log(failures ? c.r(`\n${failures} failed\n`) : c.g('\nAll C provider checks passed.\n'));
process.exit(failures ? 1 : 0);
