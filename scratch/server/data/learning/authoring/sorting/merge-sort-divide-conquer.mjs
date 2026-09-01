/**
 * Sorting -> Merge Sort & Divide and Conquer.
 *
 * The first divide-and-conquer recurrence in the curriculum, and it is placed here rather than in
 * `recursion` on purpose: the merge step is the interesting part, and it is easier to see when the
 * problem is one you already know the answer to.
 *
 * The pair is chosen so the second problem is a speed-up of something the previous pattern already
 * established. `count-adjacent-swaps-to-sort` proves the answer equals the inversion count and
 * finds it in O(N^2); this pattern finds the same number in O(N log N) by noticing that the merge
 * step already has the information. That makes the divide-and-conquer version a genuine
 * improvement to a known quantity rather than a new trick with a new definition.
 *
 * A CORRECTION TO THE 3A.1 BLUEPRINT
 * ----------------------------------
 * The blueprint expected the inversion problem to be the first to exercise the `long long` return
 * type. It cannot. An inversion count exceeds int32 only when n > ~65,536, and the literal-based
 * harness caps a single argument at 24,000 bytes -- roughly 4,000 integers. The array required is
 * a hundred times larger than the harness can embed, so the answer stays inside int32 and the
 * signature inferrer correctly reports `int`. Recorded as
 * WIDE_TYPES_UNREACHABLE_VIA_LARGE_INPUTS.
 */
export default {
  topic: 'sorting',
  pattern: 'merge-sort-divide-conquer',
  problems: [
    // =======================================================================
    {
      slug: 'sort-array-by-merging',
      title: 'Sort an Array by Merging',
      difficulty: 'Medium',
      tags: ['sorting', 'merge-sort', 'divide-and-conquer', 'stability'],
      description:
        'Return the values of `nums` in non-decreasing order, using merge sort rather than a library routine.\n\nSplit the array into two halves, sort each half by the same method, then combine the two sorted halves into one. The splitting is trivial and the recursion does the bookkeeping; the algorithm lives entirely in that last step, which walks both halves with one index each and repeatedly takes the smaller front value.\n\nWhen the two front values are equal, take the one from the LEFT half. That single choice is what makes the sort stable, and it costs nothing.',
      analogy:
        'Merging two already-alphabetised stacks of forms into one. You compare only the top form of each stack, move the earlier one onto the output pile, and never look deeper. Ties go to the stack that was on your left, so forms that arrived first stay first.',
      constraints: ['1 <= nums.length <= 5000', '-10^6 <= nums[i] <= 10^6'],
      edgeCases: [
        'A single element, which is the recursion base case',
        'Two elements, the smallest input where a merge actually happens',
        'An odd length, so the two halves are different sizes',
        'One half entirely smaller than the other, so one side drains before the other starts',
        'Duplicate values spanning the split point, where the tie-breaking rule decides stability',
      ],
      hints: [
        'An array of length one is already sorted. That is the base case, and it is the only one you need.',
        'The merge takes two sorted lists and one output. Keep an index into each input and repeatedly append the smaller of the two front values.',
        'When one input runs out, append everything remaining in the other. Forgetting this tail is the most common way to lose elements.',
        'On a tie, take from the left half. Taking from the right instead still sorts correctly but reverses equal elements, which breaks stability.',
      ],
      brute: {
        name: 'Repeated Minimum Extraction',
        summary: 'Repeatedly scan the remaining values for the smallest and append it.',
        intuition:
          'The definition of sorted output read literally: the first element is the minimum, the second is the minimum of what is left, and so on. Scan, take, remove, repeat.\n\nIt is a useful baseline for two reasons. It is obviously correct, so it makes a good cross-check. And it shows what divide and conquer actually buys: this version rescans the whole remainder for every single output element, N passes over roughly N values, while merge sort compares each element only against elements in the other half at each of log N levels.',
        steps: [
          'Copy the input into a working list.',
          'While the working list is not empty, scan it for the smallest value.',
          'Append that value to the output and remove that one occurrence from the working list.',
          'Return the output.',
        ],
        js: 'function sortArray(nums) {\n  const rest = nums.slice();\n  const out = [];\n  while (rest.length > 0) {\n    let smallest = 0;\n    for (let i = 1; i < rest.length; i++) {\n      if (rest[i] < rest[smallest]) smallest = i;\n    }\n    out.push(rest[smallest]);\n    rest.splice(smallest, 1);\n  }\n  return out;\n}',
        py: 'def sort_array(nums):\n    rest = list(nums)\n    out = []\n    while rest:\n        smallest = 0\n        for i in range(1, len(rest)):\n            if rest[i] < rest[smallest]:\n                smallest = i\n        out.append(rest.pop(smallest))\n    return out',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Merge Sort',
        summary: 'Sort each half recursively, then merge the two sorted halves in one pass.',
        intuition:
          'Divide and conquer works here because merging two sorted lists is cheap — linear in their combined length — while merging two unsorted lists is not easier than sorting from scratch. So the recursion is not doing the work; it is arranging for the work to be easy.\n\nThe cost analysis is worth internalising because the same shape reappears constantly. Each level of recursion touches every element once during its merges, so a level costs O(N). Halving the size each time gives log N levels. Hence O(N log N), and unlike the elementary sorts it is the same on sorted, reversed and random input.\n\nThe stability rule is the one place a correct-looking implementation goes subtly wrong. Using `left[i] <= right[j]` keeps equal elements in their original order; using `<` sends the right-hand one first and reverses them. Both sort. Only one is stable, and stability is what the next pattern relies on when it sorts by a derived key.',
        steps: [
          'If the array has one element or fewer, return a copy of it.',
          'Split at the midpoint and sort each half by the same procedure.',
          'Walk both sorted halves with one index each, appending the smaller front value.',
          'Break ties in favour of the left half.',
          'Append whatever remains in the half that did not run out, then return the result.',
        ],
        js: 'function mergeTwo(left, right) {\n  const out = [];\n  let i = 0;\n  let j = 0;\n  while (i < left.length && j < right.length) {\n    if (left[i] <= right[j]) {\n      out.push(left[i]);\n      i += 1;\n    } else {\n      out.push(right[j]);\n      j += 1;\n    }\n  }\n  while (i < left.length) { out.push(left[i]); i += 1; }\n  while (j < right.length) { out.push(right[j]); j += 1; }\n  return out;\n}\n\nfunction sortArray(nums) {\n  if (nums.length <= 1) return nums.slice();\n  const middle = Math.floor(nums.length / 2);\n  return mergeTwo(sortArray(nums.slice(0, middle)), sortArray(nums.slice(middle)));\n}',
        // Deliberately bottom-up rather than a transcription of the recursive version: same
        // algorithm, different control flow, so agreement between the two is real evidence.
        py: 'def sort_array(nums):\n    out = list(nums)\n    n = len(out)\n    width = 1\n    while width < n:\n        merged = []\n        start = 0\n        while start < n:\n            left = out[start:start + width]\n            right = out[start + width:start + 2 * width]\n            i = j = 0\n            while i < len(left) and j < len(right):\n                if left[i] <= right[j]:\n                    merged.append(left[i])\n                    i += 1\n                else:\n                    merged.append(right[j])\n                    j += 1\n            merged.extend(left[i:])\n            merged.extend(right[j:])\n            start += 2 * width\n        out = merged\n        width *= 2\n    return out',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [5, 2, 3, 1] }, expect: [1, 2, 3, 5], explanation: 'Halves [5,2] and [3,1] sort to [2,5] and [1,3], which merge by comparing front values only.' },
        { payload: { nums: [5, 1, 1, 2, 0, 0] }, expect: [0, 0, 1, 1, 2, 5], explanation: 'Duplicates spanning the split point. Ties go to the left half, so equal values keep their original order.' },
        { payload: { nums: [1] }, expect: [1], explanation: 'The recursion base case: an array of one element is already sorted.' },
        { payload: { nums: [1, 2, 3, 7, 8, 9] }, expect: [1, 2, 3, 7, 8, 9], explanation: 'One half is entirely smaller than the other, so the left drains completely before the right contributes — which is where a missing tail-copy loses elements.' },
      ],
      cases: [
        { payload: { nums: [2, 1] }, label: 'smallest input with a real merge' },
        { payload: { nums: [1, 2, 3, 4, 5] }, label: 'already sorted, odd length' },
        { payload: { nums: [5, 4, 3, 2, 1] }, label: 'reverse sorted, odd length' },
        { payload: { nums: [7, 7, 7, 7] }, label: 'all identical' },
        { payload: { nums: [9, 8, 7, 6, 5, 4, 3] }, label: 'seven elements reversed, so the halves are uneven' },
        { payload: { nums: [-1000000, 1000000, 0, -1, 1] }, label: 'constraint boundary values' },
        { payload: { nums: [4, 1, 4, 1, 4, 1] }, label: 'two values alternating, heavy tie-breaking' },
        { payload: { nums: [10, 20, 30, 1, 2, 3] }, label: 'the right half is entirely smaller, so the RIGHT drains first' },
        { payload: { nums: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5] }, label: 'eleven elements with repeats at several depths' },
        { payload: { nums: [0, 0, 0, 1, 0, 0] }, label: 'a single distinct value among duplicates' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 1 ? true : 'nums must hold at least one element'),
    },

    // =======================================================================
    {
      slug: 'count-inversions-while-merging',
      title: 'Count Inversions While Merging',
      difficulty: 'Medium',
      tags: ['sorting', 'merge-sort', 'inversions', 'divide-and-conquer'],
      description:
        'An *inversion* in `nums` is a pair of indices `i < j` where `nums[i] > nums[j]`. Return how many inversions the array contains.\n\nThe previous pattern showed this number is also the minimum count of adjacent swaps needed to sort the array, and found it by checking every pair in O(N^2). Here you should find the same number in O(N log N).\n\nThe idea is that a merge sort already has the information and throws it away. While merging two sorted halves, whenever you take a value from the right half, every value still remaining in the left half is greater than it — and each of those is an inversion, because it started at a smaller index. Count them in one addition instead of one at a time.',
      analogy:
        'Two queues merging into one, where you record how many people from the left queue get overtaken each time someone from the right queue steps in front. You do not count them individually — you already know how many are still standing in the left queue.',
      constraints: [
        '1 <= nums.length <= 4000',
        '-10^6 <= nums[i] <= 10^6',
      ],
      edgeCases: [
        'An already-sorted array, which has zero inversions',
        'A reverse-sorted array, whose count is the maximum n(n-1)/2',
        'A single element, which has zero inversions',
        'Duplicate values, which are not inversions of each other and require the tie to go to the left half',
        'An inversion that spans the split point, which the recursion must not lose',
      ],
      hints: [
        'Split the counting into three parts: inversions entirely inside the left half, entirely inside the right half, and those with one index in each. The recursion gives you the first two.',
        'During the merge, when you take a value from the right half, how many left-half values are still waiting? Every one of them is greater than the value you just took.',
        'Add the number of remaining left-half elements, not one. That single addition is what turns the quadratic count into a logarithmic-depth one.',
        'On a tie take from the LEFT half and count nothing. Equal values are not inversions, and taking from the right would count them.',
      ],
      brute: {
        name: 'Check Every Pair',
        summary: 'Compare all pairs of indices and count the ones that are out of order.',
        intuition:
          'Straight from the definition, and identical to the optimal solution of the previous pattern\'s problem. It is the right reference because the answer it produces is unarguable, which makes it the perfect check on a merge-based count where an off-by-one in the tally is invisible in the sorted output.\n\nAt the constraint ceiling of 4,000 elements this is about eight million comparisons — fine for validation, and the reason the ceiling is 4,000 rather than 100,000.',
        steps: [
          'Set a counter to zero.',
          'For every pair of indices i < j, compare the two values.',
          'Increment the counter when the earlier value is strictly greater.',
          'Return the counter.',
        ],
        js: 'function countInversions(nums) {\n  let total = 0;\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] > nums[j]) total += 1;\n    }\n  }\n  return total;\n}',
        py: 'def count_inversions(nums):\n    total = 0\n    n = len(nums)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if nums[i] > nums[j]:\n                total += 1\n    return total',
        time: 'O(N^2)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Count During the Merge',
        summary: 'Merge sort the array, and each time a right-half value is taken, add the number of left-half values still pending.',
        intuition:
          'Every inversion has its two indices either both in the left half, both in the right half, or one in each. The recursive calls count the first two categories, so the merge only has to count the third — and at that point both halves are sorted, which is what makes it cheap.\n\nWhen the merge takes a value from the right half, that value is smaller than every value still unconsumed in the left half. All of those sit at smaller original indices, so each forms an inversion with it. There are exactly `leftLength - i` of them, so one addition handles the whole group. Adding one per pair instead would be correct but would put the quadratic back.\n\nThe tie rule is load-bearing in both directions here. Taking from the left on a tie keeps the sort stable AND avoids counting equal values as inversions. Using a strict comparison instead would over-count on any input with duplicates, and the sorted output would look perfectly correct while the number was wrong — which is precisely why the duplicate-heavy cases are in the hidden set.',
        steps: [
          'If the array has one element or fewer, it holds no inversions.',
          'Split at the midpoint and recursively sort and count each half.',
          'Merge the two sorted halves, keeping one index into each.',
          'When the left front value is less than or equal to the right front value, take from the left and count nothing.',
          'Otherwise take from the right and add the number of left-half values still remaining.',
          'Return the sum of the two recursive counts and the merge count.',
        ],
        js: 'function sortAndCount(values) {\n  if (values.length <= 1) return { sorted: values.slice(), count: 0 };\n  const middle = Math.floor(values.length / 2);\n  const left = sortAndCount(values.slice(0, middle));\n  const right = sortAndCount(values.slice(middle));\n  const merged = [];\n  let i = 0;\n  let j = 0;\n  let crossing = 0;\n  while (i < left.sorted.length && j < right.sorted.length) {\n    if (left.sorted[i] <= right.sorted[j]) {\n      merged.push(left.sorted[i]);\n      i += 1;\n    } else {\n      merged.push(right.sorted[j]);\n      j += 1;\n      crossing += left.sorted.length - i;\n    }\n  }\n  while (i < left.sorted.length) { merged.push(left.sorted[i]); i += 1; }\n  while (j < right.sorted.length) { merged.push(right.sorted[j]); j += 1; }\n  return { sorted: merged, count: left.count + right.count + crossing };\n}\n\nfunction countInversions(nums) {\n  return sortAndCount(nums).count;\n}',
        // Bottom-up merging with the same counting rule: different control flow from the
        // recursive JavaScript version, so agreement is evidence rather than a transcription.
        py: 'def count_inversions(nums):\n    out = list(nums)\n    n = len(out)\n    total = 0\n    width = 1\n    while width < n:\n        merged = []\n        start = 0\n        while start < n:\n            left = out[start:start + width]\n            right = out[start + width:start + 2 * width]\n            i = j = 0\n            while i < len(left) and j < len(right):\n                if left[i] <= right[j]:\n                    merged.append(left[i])\n                    i += 1\n                else:\n                    merged.append(right[j])\n                    j += 1\n                    total += len(left) - i\n            merged.extend(left[i:])\n            merged.extend(right[j:])\n            start += 2 * width\n        out = merged\n        width *= 2\n    return total',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [2, 4, 1, 3, 5] }, expect: 3, explanation: 'The out-of-order pairs are (2,1), (4,1) and (4,3). During the merge, taking the 1 from a right half counts both larger values still pending on the left in one addition.' },
        { payload: { nums: [1, 2, 3, 4, 5] }, expect: 0, explanation: 'Already sorted, so no right-half value is ever taken before the left half drains.' },
        { payload: { nums: [5, 4, 3, 2, 1] }, expect: 10, explanation: 'Fully reversed: every one of the ten pairs is an inversion, the maximum for five elements.' },
        { payload: { nums: [2, 2, 2, 1] }, expect: 3, explanation: 'The three 2s are not inversions of each other. Only the pairs involving the 1 count, so a strict tie comparison would wrongly return 6.' },
      ],
      cases: [
        { payload: { nums: [1] }, label: 'single element' },
        { payload: { nums: [2, 1] }, label: 'smallest non-zero answer' },
        { payload: { nums: [1, 2] }, label: 'smallest zero answer' },
        { payload: { nums: [3, 3, 3, 3, 3, 3] }, label: 'all identical — zero, and a strict tie rule returns 15 instead' },
        { payload: { nums: [8, 7, 6, 5, 4, 3, 2, 1] }, label: 'fully reversed, maximum 28' },
        { payload: { nums: [1, 2, 3, 4, 5, 6, 7, 8] }, label: 'already sorted, eight elements' },
        { payload: { nums: [4, 3, 2, 1, 8, 7, 6, 5] }, label: 'inversions only WITHIN each half, none crossing the split' },
        { payload: { nums: [5, 6, 7, 8, 1, 2, 3, 4] }, label: 'inversions ONLY across the split, sixteen of them' },
        { payload: { nums: [-1, -2, -3, -2, -1] }, label: 'negatives with duplicates on both sides of the minimum' },
        { payload: { nums: [1000000, -1000000, 0, 1000000, -1000000] }, label: 'constraint boundaries with repeats' },
        { payload: { nums: [2, 3, 8, 6, 1] }, label: 'a small mixture with a late minimum' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 1 && p.nums.length <= 4000 ? true : 'nums must hold 1..4000 elements'),
    },
  ],
};
