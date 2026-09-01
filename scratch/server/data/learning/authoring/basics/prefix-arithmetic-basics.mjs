/**
 * Basics -> Prefix Arithmetic.
 *
 * This pattern is the direct prerequisite of arrays/prefix-sum, which already holds five
 * problems while this one held none — one of the five inverted-teaching-order findings from the
 * 3A.0 audit. The three problems here are the missing groundwork, and they are deliberately
 * chosen NOT to overlap the arrays pattern:
 *
 *   running maximum   a prefix is any associative fold, not only a sum
 *   range query       the precompute step and the query step are different things
 *   split counting    a running prefix compared against a fixed total
 *
 * arrays/prefix-sum already covers cumulative output (running-sum-of-1d-array), split-point
 * search (find-pivot-index) and the hash-map-of-prefixes trick (subarray-sum-equals-k). None of
 * those teaches the operator generalisation or the precompute/query separation, and the third
 * problem here is an inequality count rather than the equality search find-pivot-index performs.
 */
export default {
  topic: 'basics',
  pattern: 'prefix-arithmetic-basics',
  problems: [
    // =======================================================================
    {
      slug: 'running-maximum-of-a-sequence',
      title: 'Running Maximum of a Sequence',
      difficulty: 'Easy',
      tags: ['prefix-arithmetic', 'array-traversal', 'associative-fold'],
      description:
        'Given an array `nums`, return an array `out` of the same length where `out[i]` is the largest value among `nums[0]` through `nums[i]` inclusive.\n\nThis is a prefix computation, but the operator is maximum rather than addition. Recognising that a prefix array works for *any* operation where combining is associative — max, min, greatest common divisor, bitwise or — is more useful than memorising the sum case, because the recurrence is identical: each output depends only on the previous output and the current element.',
      analogy:
        'A record board at a swimming pool that shows the fastest time so far this season. Nobody re-reads every result to update it — a new time either beats the number on the board or it does not.',
      constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
      edgeCases: [
        'A single element, where the output is the input',
        'A strictly increasing array, where every element becomes the new maximum',
        'A strictly decreasing array, where the first element is the maximum forever',
        'All values equal, so the running maximum never changes',
        'All negative values, which catches an implementation that initialises the accumulator to zero',
      ],
      hints: [
        'The answer at index i depends on only two things: the answer at index i-1 and the element at index i.',
        'out[0] = nums[0], and out[i] = max(out[i-1], nums[i]). One pass, no inner loop.',
        'Do not initialise the running maximum to zero. Seed it from the first element, or an all-negative input will report zeroes.',
      ],
      brute: {
        name: 'Rescan Each Prefix',
        summary: 'For each index, scan every element up to it and take the largest.',
        intuition:
          'Read the definition literally: the answer at index i is the maximum over a prefix, so scan that prefix. Correct, and it needs no observation about the structure of the problem.\n\nThe waste is the same as with prefix sums. Computing the maximum over the first six elements rescans the five the previous answer already examined, so the total work is 1 + 2 + ... + N. It is worth writing because it makes the recurrence obvious by contrast.',
        steps: [
          'Create an empty output array.',
          'For each index i, set best to the first element.',
          'Scan every index j from 0 to i, keeping the larger of best and nums[j].',
          'Append best to the output and continue.',
        ],
        js: 'function runningMaximum(nums) {\n  const out = [];\n  for (let i = 0; i < nums.length; i++) {\n    let best = nums[0];\n    for (let j = 0; j <= i; j++) {\n      if (nums[j] > best) best = nums[j];\n    }\n    out.push(best);\n  }\n  return out;\n}',
        py: 'def running_maximum(nums):\n    out = []\n    for i in range(len(nums)):\n        best = nums[0]\n        for j in range(i + 1):\n            if nums[j] > best:\n                best = nums[j]\n        out.append(best)\n    return out',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Carry One Accumulator',
        summary: 'Keep the best value seen so far and compare each element against it once.',
        intuition:
          'The maximum over a prefix contains the maximum over the previous prefix, so there is nothing to recompute. Seed an accumulator from the first element, then for each element keep whichever is larger and record it.\n\nThe seeding matters more than it looks. Starting the accumulator at zero is the single most common way to get this wrong, and it only shows up on input that is entirely negative — which is exactly why that case is in the hidden tests. Taking the first element as the starting value has no such failure mode and needs no knowledge of the value range.',
        steps: [
          'Set the accumulator to the first element.',
          'For each element in order, replace the accumulator with the larger of the two.',
          'Append the accumulator to the output after each element.',
          'Return the output array.',
        ],
        js: 'function runningMaximum(nums) {\n  const out = [];\n  let best = nums[0];\n  for (const value of nums) {\n    if (value > best) best = value;\n    out.push(best);\n  }\n  return out;\n}',
        py: 'def running_maximum(nums):\n    out = []\n    best = nums[0]\n    for value in nums:\n        if value > best:\n            best = value\n        out.append(best)\n    return out',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [3, 1, 4, 1, 5] }, expect: [3, 3, 4, 4, 5], explanation: 'The running maximum only changes when an element beats everything before it, at indices 2 and 4.' },
        { payload: { nums: [5, 4, 3, 2, 1] }, expect: [5, 5, 5, 5, 5], explanation: 'A decreasing array never beats its first element, so the output is constant.' },
        { payload: { nums: [-5, -2, -9] }, expect: [-5, -2, -2], explanation: 'All values are negative. An accumulator seeded at zero would wrongly report zeroes here.' },
        { payload: { nums: [7] }, expect: [7], explanation: 'A single element is its own running maximum.' },
      ],
      cases: [
        { payload: { nums: [1, 2, 3, 4, 5] }, label: 'strictly increasing, every element is a new maximum' },
        { payload: { nums: [2, 2, 2, 2] }, label: 'all equal, so the accumulator never updates' },
        { payload: { nums: [0, 0, 0] }, label: 'all zeros' },
        { payload: { nums: [-1] }, label: 'single negative element' },
        { payload: { nums: [-1000000000, 1000000000] }, label: 'constraint boundaries in one array' },
        { payload: { nums: [1000000000, -1000000000] }, label: 'the maximum arrives first and never moves' },
        { payload: { nums: [4, -1, 4, -1, 4] }, label: 'ties with the current maximum, which must not be treated as an increase or a decrease' },
        { payload: { nums: [-3, -3, -4, -2, -2, -1] }, label: 'all negative with ties and a late improvement' },
        { payload: { nums: [10, 9, 11, 8, 12, 7, 13] }, label: 'alternating dips with a rising trend' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 1 ? true : 'nums must hold at least one element'),
    },

    // =======================================================================
    {
      slug: 'range-sum-from-prefix-table',
      title: 'Range Sum From a Prefix Table',
      difficulty: 'Easy',
      tags: ['prefix-arithmetic', 'range-query', 'precomputation'],
      description:
        'Given an array `nums` and two indices `left` and `right` with `left <= right`, return the sum of `nums[left]` through `nums[right]` inclusive.\n\nA single sum is easy to get by looping over the range. The point of this problem is the technique underneath it: build a cumulative table once, then answer the question with one subtraction. That separation — an expensive precompute followed by cheap queries — is what makes prefix sums worth knowing, and it is invisible when you only ever answer one query.\n\nUse a table of length `n + 1` where `prefix[0]` is zero. Then the answer is `prefix[right + 1] - prefix[left]`, with no special case for `left` being zero.',
      analogy:
        'Reading a utility meter. You do not measure the electricity used in March by watching the wires all month; you subtract the reading at the start of March from the reading at the end. The meter is the prefix table, and every billing period is a query against it.',
      constraints: [
        '1 <= nums.length <= 10^5',
        '-10^4 <= nums[i] <= 10^4',
        '0 <= left <= right < nums.length',
      ],
      edgeCases: [
        'The range covers the whole array',
        'The range is a single element, where left equals right',
        'The range starts at index 0, which is where an off-by-one in the table shows up',
        'The range ends at the last index',
        'Negative values inside the range, so the sum is not monotonic in the range length',
      ],
      hints: [
        'Build a table where entry i holds the sum of the first i elements. Note the length: n + 1, not n.',
        'With prefix[0] = 0, the sum of nums[left..right] is prefix[right + 1] - prefix[left]. Check that against left = 0 to see why the extra leading entry removes a special case.',
        'If you size the table at n instead of n + 1 you will need an if-statement for left = 0. That if-statement is the bug this layout avoids.',
      ],
      brute: {
        name: 'Loop Over the Range',
        summary: 'Add up the elements from left to right directly.',
        intuition:
          'For one query this is not merely acceptable, it is the right answer: a single pass over the range, no extra memory, nothing to get wrong. Presenting it as a brute force is honest only in a specific sense — it does not scale with the number of QUERIES, which is the situation the technique exists for.\n\nIt is also the correct reference to check the table version against, because the off-by-one in a prefix table is easy to write and hard to see.',
        steps: [
          'Set total to zero.',
          'Add nums[i] for every index i from left to right inclusive.',
          'Return total.',
        ],
        js: 'function rangeSum(nums, left, right) {\n  let total = 0;\n  for (let i = left; i <= right; i++) total += nums[i];\n  return total;\n}',
        py: 'def range_sum(nums, left, right):\n    total = 0\n    for i in range(left, right + 1):\n        total += nums[i]\n    return total',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Cumulative Table and One Subtraction',
        summary: 'Precompute prefix sums with a leading zero, then answer with a single difference.',
        intuition:
          'Build `prefix` of length n + 1 where `prefix[i]` is the sum of the first i elements, so `prefix[0]` is the empty sum, zero. Then the elements from `left` to `right` are exactly those counted by `prefix[right + 1]` but not by `prefix[left]`, and the answer is the difference.\n\nThe leading zero is the whole trick. Without it the formula needs `left > 0 ? prefix[right] - prefix[left - 1] : prefix[right]`, and that branch is where the classic off-by-one lives. With it there is one expression and no branch.\n\nFor a single query this is strictly more work than looping. For a thousand queries against the same array it is a thousand subtractions after one pass, and that is the trade the pattern is about.',
        steps: [
          'Create a table of length n + 1 with the first entry set to zero.',
          'For each index i, set table[i + 1] to table[i] plus nums[i].',
          'Return table[right + 1] minus table[left].',
        ],
        js: 'function rangeSum(nums, left, right) {\n  const prefix = new Array(nums.length + 1).fill(0);\n  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];\n  return prefix[right + 1] - prefix[left];\n}',
        py: 'def range_sum(nums, left, right):\n    prefix = [0] * (len(nums) + 1)\n    for i, value in enumerate(nums):\n        prefix[i + 1] = prefix[i] + value\n    return prefix[right + 1] - prefix[left]',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [1, 2, 3, 4, 5], left: 1, right: 3 }, expect: 9, explanation: 'Elements 2, 3 and 4 sum to 9, which is prefix[4] - prefix[1] = 10 - 1.' },
        { payload: { nums: [1, 2, 3, 4, 5], left: 0, right: 4 }, expect: 15, explanation: 'The whole array. With a leading zero in the table this is prefix[5] - prefix[0], needing no special case.' },
        { payload: { nums: [4, -2, 7], left: 2, right: 2 }, expect: 7, explanation: 'A single-element range where left equals right.' },
        { payload: { nums: [-1, -2, -3, -4], left: 0, right: 1 }, expect: -3, explanation: 'A range starting at index 0 with negative values, which is where an off-by-one and a zero-initialised accumulator both show up.' },
      ],
      cases: [
        { payload: { nums: [5], left: 0, right: 0 }, label: 'smallest possible array and range' },
        { payload: { nums: [0, 0, 0, 0], left: 1, right: 2 }, label: 'all zeros' },
        { payload: { nums: [10000, 10000, 10000], left: 0, right: 2 }, label: 'maximum values, whole range' },
        { payload: { nums: [-10000, -10000, -10000], left: 0, right: 2 }, label: 'minimum values, whole range' },
        { payload: { nums: [3, 1, 4, 1, 5, 9, 2, 6], left: 5, right: 7 }, label: 'range at the far right end' },
        { payload: { nums: [3, 1, 4, 1, 5, 9, 2, 6], left: 0, right: 0 }, label: 'single element at index 0' },
        { payload: { nums: [3, 1, 4, 1, 5, 9, 2, 6], left: 7, right: 7 }, label: 'single element at the last index' },
        { payload: { nums: [2, -3, 5, -1, 4, -6], left: 1, right: 4 }, label: 'mixed signs cancelling inside the range' },
        { payload: { nums: [1, -1, 1, -1, 1, -1], left: 0, right: 5 }, label: 'alternating values summing to zero' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1) return 'nums must hold at least one element';
        if (!(p.left >= 0 && p.right < p.nums.length && p.left <= p.right)) return 'indices must satisfy 0 <= left <= right < nums.length';
        return true;
      },
    },

    // =======================================================================
    // The 55th slot. Chosen because the pattern had two Easy problems and no application
    // step, and because arrays/prefix-sum holds five problems built on prefix arithmetic
    // while this pattern held none.
    {
      slug: 'count-valid-array-splits',
      title: 'Count Valid Array Splits',
      difficulty: 'Medium',
      tags: ['prefix-arithmetic', 'counting', 'running-total'],
      description:
        'An array `nums` is split at index `i` by putting `nums[0]` through `nums[i]` in the left part and the rest in the right part. A split is *valid* when the left part\'s sum is greater than or equal to the right part\'s sum, and when the right part is not empty — so `i` ranges over `0` to `n - 2`.\n\nReturn how many of those split positions are valid.\n\nRecomputing both sums for every candidate index is quadratic. Once you have the total of the whole array, the right sum follows from the left sum by subtraction, so one pass is enough.',
      analogy:
        'Sliding a divider along a shelf of books and asking at each position whether the left stack now weighs at least as much as the right. You weigh the whole shelf once at the start; after that, moving the divider one book to the right just moves that book\'s weight from one side of the comparison to the other.',
      constraints: [
        '2 <= nums.length <= 10^5',
        '-1000 <= nums[i] <= 1000',
      ],
      edgeCases: [
        'The smallest array, of length two, which has exactly one candidate split',
        'No valid split at all, so the answer is 0',
        'Every split valid, so the answer is n - 1',
        'The last index must NOT be counted, because the right part would be empty',
        'Negative values, which mean validity is not monotonic as the divider moves right — a split can be valid, then invalid, then valid again',
      ],
      hints: [
        'Compute the sum of the whole array first. If you also know the sum of the left part, what does that tell you about the right part?',
        'right = total - left. So the condition left >= right is just left >= total - left, and you never build the right part at all.',
        'Add nums[i] to the running left sum, then test index i — and stop the loop at n - 2, because splitting at the last index leaves nothing on the right.',
      ],
      brute: {
        name: 'Recompute Both Sides',
        summary: 'For each split position, sum the left part and the right part from scratch and compare.',
        intuition:
          'Translate the definition directly: for every index, build both sums with two inner loops and check the condition. Correct, and it makes the boundary rule concrete — the loop over split positions has to stop one short of the end, and writing it out is the easiest way to see why.\n\nEach candidate rescans the array, so the total is quadratic. At the constraint ceiling of 100,000 elements that is around five billion additions.',
        steps: [
          'Set a counter to zero.',
          'For each split index i from 0 to n - 2, sum the elements up to i and the elements after i.',
          'Increment the counter when the left sum is at least the right sum.',
          'Return the counter.',
        ],
        js: 'function countValidSplits(nums) {\n  let count = 0;\n  for (let i = 0; i <= nums.length - 2; i++) {\n    let left = 0;\n    for (let j = 0; j <= i; j++) left += nums[j];\n    let right = 0;\n    for (let j = i + 1; j < nums.length; j++) right += nums[j];\n    if (left >= right) count += 1;\n  }\n  return count;\n}',
        py: 'def count_valid_splits(nums):\n    count = 0\n    n = len(nums)\n    for i in range(n - 1):\n        left = 0\n        for j in range(i + 1):\n            left += nums[j]\n        right = 0\n        for j in range(i + 1, n):\n            right += nums[j]\n        if left >= right:\n            count += 1\n    return count',
        time: 'O(N^2)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Running Prefix Against a Fixed Total',
        summary: 'Sum the array once, then walk a running left total and derive the right total by subtraction.',
        intuition:
          'The two parts always account for the whole array, so `right = total - left`. That removes the second inner loop entirely: keep a running `left`, and the condition `left >= total - left` is checked in constant time per index.\n\nTwo details are where this goes wrong. The running total must be updated BEFORE testing index `i`, because the element at `i` belongs to the left part — this is the opposite of the pivot-index problem, where the pivot element belongs to neither side. And the loop must stop at `n - 2`, since a split at the last index leaves an empty right part, which the problem excludes.\n\nNegative values are what make the problem more than bookkeeping. With all-positive input the left sum only grows, so once a split is valid every later one is too and you could stop counting and do arithmetic. With negatives the validity can switch back and forth, so every index genuinely has to be tested.',
        steps: [
          'Sum the whole array into total.',
          'Set left to zero and count to zero.',
          'For each index i from 0 to n - 2, add nums[i] to left.',
          'Increment count when left is at least total minus left.',
          'Return count.',
        ],
        js: 'function countValidSplits(nums) {\n  let total = 0;\n  for (const value of nums) total += value;\n  let left = 0;\n  let count = 0;\n  for (let i = 0; i <= nums.length - 2; i++) {\n    left += nums[i];\n    if (left >= total - left) count += 1;\n  }\n  return count;\n}',
        py: 'def count_valid_splits(nums):\n    total = sum(nums)\n    left = 0\n    count = 0\n    for i in range(len(nums) - 1):\n        left += nums[i]\n        if left >= total - left:\n            count += 1\n    return count',
        time: 'O(N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [10, 4, -8, 7] }, expect: 2, explanation: 'Splitting after index 0 gives 10 against 3, and after index 1 gives 14 against -1. Both are valid. Splitting after index 2 gives 6 against 7, which is not.' },
        { payload: { nums: [2, 3, 1, 0] }, expect: 2, explanation: 'Left sums are 2, 5 and 6 against right sums 4, 1 and 0. The first split fails and the other two succeed.' },
        { payload: { nums: [1, 1] }, expect: 1, explanation: 'The smallest array. The one candidate split gives 1 against 1, and the condition allows equality.' },
        { payload: { nums: [1, 5] }, expect: 0, explanation: 'The only split gives 1 against 5, so there is no valid split and the answer is 0.' },
      ],
      cases: [
        { payload: { nums: [0, 0] }, label: 'two zeros, equality counts as valid' },
        { payload: { nums: [-1, -1] }, label: 'two equal negatives' },
        { payload: { nums: [5, 1, 1, 1] }, label: 'every split valid, answer is n - 1' },
        { payload: { nums: [1, 1, 1, 5] }, label: 'no split valid' },
        { payload: { nums: [1000, -1000, 1000, -1000] }, label: 'validity flips back and forth because of negatives' },
        { payload: { nums: [-5, 10, -5, 10, -5] }, label: 'negatives make the left sum non-monotonic' },
        { payload: { nums: [1000, 1000, 1000, 1000, 1000] }, label: 'all at the positive constraint bound' },
        { payload: { nums: [-1000, -1000, -1000, -1000] }, label: 'all at the negative constraint bound, where the left sum shrinks' },
        { payload: { nums: [3, 3, 3, 3, 3, 3] }, label: 'uniform values, so the answer is exactly the second half of the positions' },
        { payload: { nums: [7, 0, 0, 0, 0, 0, 0] }, label: 'a single large leading value makes every split valid' },
        { payload: { nums: [0, 0, 0, 0, 0, 7] }, label: 'a single large trailing value makes no split valid' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 2 ? true : 'nums must hold at least two elements'),
    },
  ],
};
