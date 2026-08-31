#!/usr/bin/env node
/**
 * C# verdict mapping and serialization against a real provider.
 *
 * check-starters.js proves every generated C# starter compiles. This proves the rest,
 * with particular attention to the three things most likely to fail SILENTLY:
 *
 *   - `bool.ToString()` returns "True", which is not valid JSON;
 *   - `double.ToString()` is culture-dependent, so a comma-decimal locale emits 12,75
 *     and every float problem fails for a reason nobody would look for;
 *   - a C# jagged array literal is not a Java one: `new int[][]{{1,2}}` compiles in
 *     Java and not in C#.
 *
 * Roughly 60 provider requests.
 *
 *   node server/scripts/check-csharp-verdicts.js
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
  const out = await runExecution({ code, language: 'csharp', testCases: cases, cpp_signature: sig });
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

const ROB_SIG = { fn: 'rob', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'int' };
const ROB_CASES = [
  { id: '1', order_index: 1, is_hidden: false, input_payload: { nums: [1, 2, 3, 1] }, expected_output: 4 },
  { id: '2', order_index: 2, is_hidden: false, input_payload: { nums: [2, 7, 9, 3, 1] }, expected_output: 12 },
  { id: '3', order_index: 3, is_hidden: true, input_payload: { nums: [] }, expected_output: 0 },
];

// Note the PascalCase method name: LeetCode's C# convention, and what the generated
// starter declares.
await check('accepted: int[] argument, PascalCase method, empty array case', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `public class Solution {
    public int Rob(int[] nums) {
        int twoBack = 0, oneBack = 0;
        for (int i = 0; i < nums.Length; i++) {
            int best = Math.Max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = best;
        }
        return oneBack;
    }
}`,
}, allPass);

await check('wrong answer', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `public class Solution {
    public int Rob(int[] nums) {
        int best = 0;
        for (int i = 0; i < nums.Length; i++) if (nums[i] > best) best = nums[i];
        return best;
    }
}`,
}, hasKind('wrong_answer'));

await check('compilation error', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: 'public class Solution { public int Rob(int[] nums) { return } }',
}, hasKind('compile_error'));

await check('runtime error: thrown exception', {
  sig: ROB_SIG,
  cases: ROB_CASES,
  code: `public class Solution {
    public int Rob(int[] nums) {
        throw new InvalidOperationException("boom");
    }
}`,
}, hasKind('runtime_error'));

await check('timeout: busy loop exceeds the 1s CPU cap', {
  sig: ROB_SIG,
  cases: [ROB_CASES[0]],
  code: `public class Solution {
    public int Rob(int[] nums) {
        long x = 0;
        for (long i = 0; i < 40000000000L; i++) x += i;
        return (int) x;
    }
}`,
}, hasKind('time_limit_exceeded'));

// --- the three silent hazards ------------------------------------------------
await check('bool return serializes lowercase, not "True"', {
  sig: { fn: 'isEven', class: 'Solution', args: [{ name: 'n', type: 'int' }], ret: 'bool' },
  cases: [
    { id: '1', order_index: 1, is_hidden: false, input_payload: { n: 4 }, expected_output: true },
    { id: '2', order_index: 2, is_hidden: false, input_payload: { n: 5 }, expected_output: false },
  ],
  code: `public class Solution {
    public bool IsEven(int n) { return n % 2 == 0; }
}`,
}, allPass);

await check('double return uses an invariant decimal point', {
  sig: { fn: 'avg', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }, { name: 'k', type: 'int' }], ret: 'double' },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { nums: [1, 12, -5, -6, 50, 3], k: 4 },
    expected_output: 12.75,
  }],
  code: `public class Solution {
    public double Avg(int[] nums, int k) {
        double sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];
        double best = sum;
        for (int i = k; i < nums.Length; i++) { sum += nums[i] - nums[i - k]; best = Math.Max(best, sum); }
        return best / k;
    }
}`,
}, allPass);

await check('jagged int[][] argument (C# literal shape, not Java\'s)', {
  sig: {
    fn: 'cornerSum', class: 'Solution',
    args: [{ name: 'grid', type: 'vector<vector<int>>' }],
    ret: 'int',
  },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { grid: [[1, 2], [3, 4], [5]] },
    expected_output: 1 + 4 + 5,
  }],
  code: `public class Solution {
    public int CornerSum(int[][] grid) {
        int total = grid[0][0];
        total += grid[1][grid[1].Length - 1];
        total += grid[2][0];
        return total;
    }
}`,
}, allPass);

await check('string and string[] round-trip with escapes and non-ASCII', {
  sig: {
    fn: 'wrap', class: 'Solution',
    args: [{ name: 's', type: 'string' }, { name: 'words', type: 'vector<string>' }],
    ret: 'vector<string>',
  },
  cases: [{
    id: '1', order_index: 1, is_hidden: false,
    input_payload: { s: 'caf\u00e9 "q" \\ x', words: ['alpha', 'beta'] },
    expected_output: ['caf\u00e9 "q" \\ x', 'alpha', 'beta'],
  }],
  code: `public class Solution {
    public string[] Wrap(string s, string[] words) {
        string[] outp = new string[words.Length + 1];
        outp[0] = s;
        for (int i = 0; i < words.Length; i++) outp[i + 1] = words[i];
        return outp;
    }
}`,
}, allPass);

await check('int[] return and an empty int[] return', {
  sig: {
    fn: 'twoSum', class: 'Solution',
    args: [{ name: 'numbers', type: 'vector<int>' }, { name: 'target', type: 'int' }],
    ret: 'vector<int>',
  },
  cases: [
    { id: '1', order_index: 1, is_hidden: false, input_payload: { numbers: [2, 7, 11, 15], target: 9 }, expected_output: [1, 2] },
    { id: '2', order_index: 2, is_hidden: false, input_payload: { numbers: [1, 2], target: 99 }, expected_output: [] },
  ],
  code: `public class Solution {
    public int[] TwoSum(int[] numbers, int target) {
        int lo = 0, hi = numbers.Length - 1;
        while (lo < hi) {
            int sum = numbers[lo] + numbers[hi];
            if (sum == target) return new int[] { lo + 1, hi + 1 };
            if (sum < target) lo++; else hi--;
        }
        return new int[0];
    }
}`,
}, allPass);

console.log(failures ? c.r(`\n${failures} failed\n`) : c.g('\nAll C# provider checks passed.\n'));
process.exit(failures ? 1 : 0);
