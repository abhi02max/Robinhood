#!/usr/bin/env node
/**
 * Compile-and-run check for the backfilled `cpp_signature` values.
 *
 * WHY
 * ---
 * server/scripts/backfill-cpp-signatures.js infers 60 signatures from test data.
 * An inferred signature that is subtly wrong does not fail loudly — it produces a
 * compile error, or worse a silent truncation (`int` where the answer is 12.75).
 * The only proof is running real C++ against the real seeded cases.
 *
 * WHAT IT COVERS
 * --------------
 * Eleven problems chosen so that between them they use every type the curriculum
 * actually needs — argument types vector<int>, int, string, vector<string>,
 * vector<vector<int>>; return types int, double, bool, vector<int>,
 * vector<string>, vector<vector<int>> — which is the complete set in use across
 * all 63 signatures. A type outside this set would be reported by the backfill
 * script rather than reaching here. The last two are the linked-list problems whose
 * starters gained a `pos` parameter on 2026-08-30; they are here because a problem
 * whose input shape just changed is the one most likely to be graded wrongly.
 *
 * Each problem runs a correct solution (expected: every case passes) and, for two
 * of them, a plausible near-miss (expected: rejected). A checker that only ever
 * sees correct code cannot tell a working harness from one that passes everything.
 *
 * Needs the database (for the signatures and cases) and network access to the
 * execution provider. Costs roughly 2 Paiza requests per test case; C++ recompiles
 * per case, so expect a couple of minutes.
 *
 *   node server/scripts/check-cpp-problems.js
 *   node server/scripts/check-cpp-problems.js valid-parentheses 3sum   # a subset
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pkg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true, quiet: true });

// Force real execution: a leftover EXECUTION_PROVIDER=mock would report a pass for
// every one of these without compiling anything, which is the exact failure this
// script exists to rule out.
if (String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}

const { runExecution } = await import('../learning-engine/execution-engine.js');
const { Pool } = pkg;

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Correct solutions, written against the seed data's conventions (1-indexed
// two-sum answers, sorted 3sum triplets, arrays standing in for char[]).
// ---------------------------------------------------------------------------
const CORRECT = {
  // bool <- string
  'valid-parentheses': `bool isValid(string s) {
    string st;
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') { st += ch; continue; }
        if (st.empty()) return false;
        char t = st.back(); st.pop_back();
        if ((ch == ')' && t != '(') || (ch == ']' && t != '[') || (ch == '}' && t != '{')) return false;
    }
    return st.empty();
}`,

  // int <- string
  'longest-substring-without-repeating-characters': `int lengthOfLongestSubstring(string s) {
    vector<int> last(256, -1);
    int best = 0, start = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        unsigned char ch = s[i];
        if (last[ch] >= start) start = last[ch] + 1;
        last[ch] = i;
        best = max(best, i - start + 1);
    }
    return best;
}`,

  // double <- vector<int>, int   (the one problem where an int return would lie)
  'maximum-average-subarray-i': `double findMaxAverage(vector<int>& nums, int k) {
    double sum = 0;
    for (int i = 0; i < k; i++) sum += nums[i];
    double best = sum;
    for (int i = k; i < (int)nums.size(); i++) {
        sum += nums[i] - nums[i - k];
        best = max(best, sum);
    }
    return best / k;
}`,

  // vector<int> <- vector<int>, int   (1-indexed, per the seed data)
  'two-sum-ii-sorted-array': `vector<int> twoSum(vector<int>& numbers, int target) {
    int lo = 0, hi = (int)numbers.size() - 1;
    while (lo < hi) {
        int sum = numbers[lo] + numbers[hi];
        if (sum == target) return {lo + 1, hi + 1};
        if (sum < target) lo++; else hi--;
    }
    return {};
}`,

  // vector<string> <- vector<string>   (single-character strings for char[])
  'reverse-string': `vector<string> reverseString(vector<string>& s) {
    vector<string> out(s.rbegin(), s.rend());
    return out;
}`,

  // vector<vector<int>> <- vector<int>
  '3sum': `vector<vector<int>> threeSum(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> out;
    for (int i = 0; i + 2 < (int)nums.size(); i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int lo = i + 1, hi = (int)nums.size() - 1;
        while (lo < hi) {
            int sum = nums[i] + nums[lo] + nums[hi];
            if (sum < 0) lo++;
            else if (sum > 0) hi--;
            else {
                out.push_back({nums[i], nums[lo], nums[hi]});
                while (lo < hi && nums[lo] == nums[lo + 1]) lo++;
                while (lo < hi && nums[hi] == nums[hi - 1]) hi--;
                lo++; hi--;
            }
        }
    }
    return out;
}`,

  // int <- vector<vector<int>>, int   (the only matrix argument in the curriculum)
  'max-value-of-equation': `int findMaxValueOfEquation(vector<vector<int>>& points, int k) {
    deque<pair<int,int>> dq; // (y - x, x)
    int best = INT_MIN;
    for (const auto& p : points) {
        int x = p[0], y = p[1];
        while (!dq.empty() && dq.front().second < x - k) dq.pop_front();
        if (!dq.empty()) best = max(best, dq.front().first + x + y);
        while (!dq.empty() && dq.back().first <= y - x) dq.pop_back();
        dq.push_back({y - x, x});
    }
    return best;
}`,

  // bool <- int   (a scalar argument, no container decoding at all)
  'happy-number': `bool isHappy(int n) {
    auto step = [](int v) {
        int s = 0;
        while (v > 0) { int d = v % 10; s += d * d; v /= 10; }
        return s;
    };
    int slow = n, fast = step(n);
    while (fast != 1 && slow != fast) { slow = step(slow); fast = step(step(fast)); }
    return fast == 1;
}`,

  // bool <- vector<int>, int   (the two problems whose starters this session fixed)
  //
  // Both are degenerate as seeded: `head` is a plain array and `pos` names the cycle
  // entry outright, so `return pos != -1;` scores 12/12 without implementing anything.
  // Representing a real linked list needs a node type the harness has no encoding for.
  // These reference solutions rebuild the links and run Floyd's anyway, because the
  // point here is to prove the signature and the harness, and a one-line solution
  // would prove neither.
  'linked-list-cycle': `bool hasCycle(vector<int>& head, int pos) {
    int n = (int)head.size();
    if (n == 0) return false;
    vector<int> next(n);                              // next[i], or -1 at the tail
    for (int i = 0; i < n; i++) next[i] = i + 1 < n ? i + 1 : pos;
    int slow = 0, fast = 0;
    while (fast != -1 && next[fast] != -1) {
        slow = next[slow];
        fast = next[next[fast]];
        if (slow == fast) return true;
    }
    return false;
}`,

  // int <- vector<int>, int   (the cycle entry's index, or -1)
  'linked-list-cycle-ii': `int detectCycle(vector<int>& head, int pos) {
    int n = (int)head.size();
    if (n == 0) return -1;
    vector<int> next(n);
    for (int i = 0; i < n; i++) next[i] = i + 1 < n ? i + 1 : pos;
    int slow = 0, fast = 0;
    bool met = false;
    while (fast != -1 && next[fast] != -1) {
        slow = next[slow];
        fast = next[next[fast]];
        if (slow == fast) { met = true; break; }
    }
    if (!met) return -1;
    int a = 0;
    while (a != slow) { a = next[a]; slow = next[slow]; }
    return a;
}`,

  // vector<int> <- vector<int>, int, via a deque
  'sliding-window-maximum': `vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq;
    vector<int> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) out.push_back(nums[dq.front()]);
    }
    return out;
}`,
};

// Near-misses that must NOT pass. Written as a class to exercise the other call
// shape at the same time.
const WRONG = {
  // Integer division: returns 12 where the answer is 12.75. This is exactly what a
  // wrongly-inferred `int` return type would silently produce.
  'maximum-average-subarray-i': `class Solution {
public:
    double findMaxAverage(vector<int>& nums, int k) {
        int sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];
        int best = sum;
        for (int i = k; i < (int)nums.size(); i++) { sum += nums[i] - nums[i - k]; best = max(best, sum); }
        return best / k;
    }
};`,
  // 0-indexed instead of 1-indexed.
  'two-sum-ii-sorted-array': `class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        int lo = 0, hi = (int)numbers.size() - 1;
        while (lo < hi) {
            int sum = numbers[lo] + numbers[hi];
            if (sum == target) return {lo, hi};
            if (sum < target) lo++; else hi--;
        }
        return {};
    }
};`,
};

// ---------------------------------------------------------------------------

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const slugs = requested.length ? requested : Object.keys(CORRECT);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

async function loadProblem(slug) {
  const { rows } = await pool.query(
    'SELECT id, title, cpp_signature FROM problems WHERE slug = $1',
    [slug],
  );
  if (!rows.length) throw new Error(`${slug} is not seeded`);
  const { rows: cases } = await pool.query(
    `SELECT id, input_payload, expected_output, is_hidden, order_index
       FROM test_cases WHERE problem_id = $1 ORDER BY order_index`,
    [rows[0].id],
  );
  return { ...rows[0], testCases: cases };
}

let failures = 0;
console.log(c.bold('\n=== C++ signature check against real seeded cases ===\n'));

for (const slug of slugs) {
  const code = CORRECT[slug];
  if (!code) { console.log(`${c.red('?')} ${slug}: no reference solution in this script`); failures += 1; continue; }

  let problem;
  try {
    problem = await loadProblem(slug);
  } catch (e) {
    console.log(`${c.red('!')} ${slug}: ${e.message}`);
    failures += 1;
    continue;
  }

  const sig = problem.cpp_signature;
  const sigText = sig
    ? `${sig.ret} ${sig.fn}(${(sig.args || []).map((a) => `${a.type} ${a.name}`).join(', ')})`
    : '(none)';

  const t0 = Date.now();
  const out = await runExecution({
    code,
    language: 'cpp',
    testCases: problem.testCases,
    cpp_signature: sig,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = out.pass_count === out.total && out.total > 0;
  if (!ok) failures += 1;

  console.log(`${ok ? c.green('PASS') : c.red('FAIL')} ${slug}`);
  console.log(`     ${c.dim(sigText)}`);
  console.log(`     ${out.pass_count}/${out.total} cases, ${out.http_requests ?? '?'} requests, ${secs}s`);
  if (!ok) {
    const bad = out.results.find((r) => !r.passed);
    console.log(`     ${c.red(bad?.error_kind || 'unknown')}: ${String(bad?.stderr || '').slice(0, 300)}`);
    if (bad && bad.error_kind === 'wrong_answer') {
      console.log(`     expected ${JSON.stringify(bad.expected)} got ${JSON.stringify(bad.actual)}`);
    }
  }

  // The near-miss control, where one exists.
  if (WRONG[slug]) {
    const ctrl = await runExecution({
      code: WRONG[slug],
      language: 'cpp',
      testCases: problem.testCases,
      cpp_signature: sig,
    });
    const rejected = ctrl.pass_count < ctrl.total;
    if (!rejected) failures += 1;
    console.log(
      `     control (${rejected ? c.green('rejected') : c.red('ACCEPTED — the verdict is not real')}) ` +
      `${ctrl.pass_count}/${ctrl.total}`,
    );
  }
}

await pool.end();

console.log(
  failures === 0
    ? c.green(c.bold('\nAll checked signatures compile and grade correctly.\n'))
    : c.red(c.bold(`\n${failures} check(s) failed.\n`)),
);
process.exit(failures === 0 ? 0 : 1);
