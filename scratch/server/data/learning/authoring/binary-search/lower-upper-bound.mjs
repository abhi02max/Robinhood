/**
 * Binary Search -> Lower / Upper Bound.
 *
 * WHY THIS PATTERN, AND WHY IT IS NOT classic-binary-search AGAIN
 * --------------------------------------------------------------
 * `classic-binary-search` holds four problems and every one of them can be written as "find a hit,
 * return early". `search-insert-position` looks like a lower bound and is not: it explicitly
 * promises DISTINCT values, and with distinct values a plain search that reports where it stopped
 * is already correct. The duplicate case never arises, so the discipline this pattern is about never
 * gets exercised.
 *
 * Drop the distinctness promise and everything changes. "Where does 2 go in [1,2,2,2,3]?" has two
 * defensible answers, so the problem statement has to pick one, and the loop can no longer return
 * the moment it finds a match — it has to keep shrinking towards a boundary. That is the whole
 * pattern, and it is what every later binary-search pattern reduces to: rotated search, search on
 * answer, and peak finding are all "find the boundary between the region where a predicate is false
 * and the region where it is true".
 *
 * THE LADDER
 * ----------
 *   leftmost insert index    one boundary. The loop stops distinguishing "found" from "not found"
 *                            and starts returning a position instead.
 *   first and last index     two boundaries composed into a range, which is where an off-by-one in
 *                            either one becomes visible as a wrong pair rather than a wrong number.
 *   count below each query   the same boundary, called many times against one sorted array. The
 *                            sort is paid once and amortised over the query set, which is the first
 *                            time preprocessing rather than the search itself is the point.
 *
 * WHAT THE TESTS ARE FOR
 * ----------------------
 * Two bugs account for nearly every wrong binary search, and neither one crashes:
 *
 *   1. `<` where `<=` belongs, or the reverse. On an array of distinct values this is usually
 *      invisible. On duplicates it silently returns the other end of the run.
 *   2. moving the wrong bound, or moving it by the wrong amount — `high = mid` versus
 *      `high = mid - 1`, `low = mid` versus `low = mid + 1`. The first spins forever on a
 *      two-element window; the second skips the answer.
 *
 * So the case sets here are built around runs of identical values, targets sitting exactly on a
 * boundary, and windows of length one and two. Arrays where every value is distinct and the target
 * is comfortably interior prove almost nothing about this pattern and are present only as sanity
 * checks.
 */
export default {
  topic: 'binary-search',
  pattern: 'lower-upper-bound',
  problems: [
    // =======================================================================
    {
      slug: 'leftmost-insert-index-with-duplicates',
      title: 'Leftmost Insert Index With Duplicates',
      difficulty: 'Easy',
      tags: ['binary-search', 'lower-upper-bound', 'boundary-search', 'duplicates'],
      companies: ['Amazon', 'Google', 'Microsoft'],
      description:
        '`nums` is sorted in non-decreasing order and MAY contain repeated values. Return the lowest index at which `target` could be inserted so the array stays sorted.\n\nWhen `target` is absent this is the only place it fits. When `target` is present, several positions would keep the array sorted — anywhere inside the existing run of equal values — and you must return the leftmost of them, which is the index of the first occurrence.\n\nAn equivalent description, and the one worth carrying around: the answer is exactly how many elements are strictly less than `target`. That framing makes the two extremes fall out without special cases. Nothing is smaller than the smallest value, so a target below everything gives `0`; everything is smaller than a target above everything, so it gives `nums.length`, which is a valid position one past the end.\n\nThe related problem `search-insert-position` promises distinct values, and with distinct values a search that simply reports where it stopped is already right. Allowing duplicates is what makes this a different problem.',
      analogy:
        'Slotting a book onto a shelf ordered by height when several books already share the exact height you are holding. Any gap within that group keeps the shelf tidy, so the rule has to be decided rather than discovered: you always slide yours in at the near end of the group. Then the position is fully determined by how many shorter books there are.',
      constraints: [
        '1 <= nums.length <= 10^4',
        'nums is sorted in non-decreasing order and may contain duplicates',
        '-10^4 <= nums[i], target <= 10^4',
        'The answer lies in the range 0 to nums.length inclusive',
      ],
      edgeCases: [
        'The target is present many times, where the answer is the first occurrence and not the last',
        'The target is smaller than every element, giving 0',
        'The target is larger than every element, giving nums.length',
        'Every element equals the target, giving 0',
        'Every element is identical and the target differs, giving 0 or nums.length',
        'A single-element array, with the target below, equal to, and above it',
        'The target falls in a gap between two distinct values',
        'The run of equal values reaches the start or the end of the array',
      ],
      hints: [
        'Do not return early on a match. A match tells you the answer is at that index OR further left, which is progress but not the answer — so record the narrowing and keep going.',
        'Search over positions rather than over elements. Let the window be the half-open range of candidate answers, from 0 to nums.length inclusive, and shrink it until only one position is left.',
        'At the midpoint there are two cases. If nums[mid] is strictly less than the target then position mid is ruled out and so is everything to its left, so move the low bound to mid + 1. Otherwise mid is still a possible answer, so move the high bound to mid, NOT to mid - 1.',
        'That asymmetry is the crux: low jumps past mid because mid is eliminated, high lands on mid because mid survives. Using high = mid - 1 here discards a viable answer, and using low = mid instead of mid + 1 never shrinks a two-wide window and loops forever.',
        'Sanity check with the counting description. If the answer really is the number of elements strictly less than the target, then the comparison inside the loop must be strictly less than too. A <= there returns the position after the last occurrence instead.',
      ],
      brute: {
        name: 'Count What Is Smaller',
        summary: 'Walk the array and count the elements strictly less than the target.',
        intuition:
          'The specification, written out. The leftmost legal insert position is the number of elements strictly below the target, so one pass with a counter answers it, and there is no window, no midpoint and no bound to move incorrectly.\n\nThis is worth writing before the binary search for two reasons. It settles what the answer IS, independently of how it is found — which matters because the two plausible readings of "insert position" on duplicates differ, and this version cannot express the wrong one. And because the array is sorted, the count is also the index of the first element that is not below the target, which is the statement the binary search is actually converging on.\n\nIt is linear rather than logarithmic, so it is the wrong submission for a 10,000-element array, but it is the right reference: it agrees with the optimal version on every input or the optimal version is broken.',
        steps: [
          'Set a counter to zero.',
          'For each element, increase the counter when the element is strictly less than the target.',
          'Return the counter.',
        ],
        js: 'function leftmostInsertIndex(nums, target) {\n  let below = 0;\n  for (const value of nums) {\n    if (value < target) below += 1;\n  }\n  return below;\n}',
        py: 'def leftmost_insert_index(nums, target):\n    below = 0\n    for value in nums:\n        if value < target:\n            below += 1\n    return below',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Shrink to the Boundary',
        summary: 'Halve a window of candidate positions, moving low past the midpoint and high onto it.',
        intuition:
          'Think of the array as split into two regions: a prefix where values are strictly less than the target, and a suffix where they are not. Because the array is sorted, that split is a single point, and it is the answer. Binary search is then not looking for a value at all — it is locating a boundary.\n\nKeep a window of candidate positions running from 0 to nums.length. That upper limit is not a typo: inserting past the last element is a legal answer, so the window covers one more position than there are elements. At the midpoint, if the value there is strictly below the target, every position up to and including mid is ruled out, so low becomes mid + 1. Otherwise mid is still viable, so high becomes mid — mid itself must stay in the window, which is why this branch does not subtract one. The window shrinks every iteration and ends with low equal to high, which is the boundary.\n\nGetting either bound wrong produces a specific, quiet failure. `high = mid - 1` throws away a position that could have been the answer, so the result is one too low whenever the boundary is exactly at mid. `low = mid` instead of `mid + 1` leaves a two-wide window unchanged and hangs. And `<=` in place of `<` moves the boundary to the far end of a run of equal values, which is a perfectly reasonable answer to a different question and is wrong for this one.\n\nThe accompanying Python reference is written the other way round, with inclusive bounds and a remembered answer: it tracks the last index it has seen holding a value below the target, moving low or high past the midpoint in both branches, and returns that index plus one. Inclusive-bound loops are the shape people usually learn first and they need a variable to carry the result. Two loop shapes, two different sets of off-by-one hazards, and they agree on every payload.',
        steps: [
          'Set low to 0 and high to nums.length. The window is positions, not elements, so it includes one past the end.',
          'While low is below high, take the midpoint of the window.',
          'If nums[mid] is strictly less than the target, set low to mid + 1.',
          'Otherwise set high to mid, keeping mid as a candidate.',
          'Return low, which now equals high.',
        ],
        js: 'function leftmostInsertIndex(nums, target) {\n  let low = 0;\n  let high = nums.length;\n  while (low < high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (nums[mid] < target) {\n      low = mid + 1;\n    } else {\n      high = mid;\n    }\n  }\n  return low;\n}',
        py: 'def leftmost_insert_index(nums, target):\n    low = 0\n    high = len(nums) - 1\n    last_below = -1\n    while low <= high:\n        mid = (low + high) // 2\n        if nums[mid] < target:\n            last_below = mid\n            low = mid + 1\n        else:\n            high = mid - 1\n    return last_below + 1',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [1, 2, 2, 2, 3], target: 2 }, expect: 1, explanation: 'Three 2s occupy indices 1 to 3. Any of those positions keeps the array sorted, and the leftmost is 1. A loop using <= returns 4, the position after the run.' },
        { payload: { nums: [1, 3, 5, 6], target: 4 }, expect: 2, explanation: 'The target is absent and belongs between 3 and 5. Two elements are strictly below it.' },
        { payload: { nums: [2, 2, 2], target: 5 }, expect: 3, explanation: 'Every element is below the target, so it goes one past the end. The answer may equal nums.length.' },
        { payload: { nums: [2, 2, 2], target: 2 }, expect: 0, explanation: 'Nothing is strictly below the target, so the answer is 0 even though the target is present at every index.' },
      ],
      cases: [
        { payload: { nums: [5], target: 3 }, label: 'single element, target below' },
        { payload: { nums: [5], target: 5 }, label: 'single element, target equal' },
        { payload: { nums: [5], target: 7 }, label: 'single element, target above' },
        { payload: { nums: [1, 1, 1, 1, 1], target: 1 }, label: 'all equal to the target, answer 0 not 5' },
        { payload: { nums: [1, 1, 1, 1, 1], target: 0 }, label: 'all identical, target below' },
        { payload: { nums: [1, 1, 1, 1, 1], target: 2 }, label: 'all identical, target above' },
        { payload: { nums: [1, 2], target: 2 }, label: 'two elements, target is the second — the window that a wrong bound update hangs on' },
        { payload: { nums: [1, 2], target: 1 }, label: 'two elements, target is the first' },
        { payload: { nums: [2, 2, 3, 3], target: 3 }, label: 'run boundary in the middle' },
        { payload: { nums: [3, 3, 3, 4], target: 3 }, label: 'run starts at index 0' },
        { payload: { nums: [1, 4, 4, 4], target: 4 }, label: 'run reaches the end of the array' },
        { payload: { nums: [-10000, -10000, 0, 10000, 10000], target: 0 }, label: 'boundary magnitudes with duplicates on both sides' },
        { payload: { nums: [-5, -3, -1], target: -4 }, label: 'all negative, target in a gap' },
        { payload: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 1 }, label: 'distinct values, target is the minimum' },
        { payload: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 11 }, label: 'distinct values, target past the end' },
        { payload: { nums: [0, 0, 0, 0, 0, 0, 0, 1], target: 1 }, label: 'long run then a single larger value' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1 || p.nums.length > 10000) return 'nums must hold between 1 and 10^4 elements';
        for (let i = 1; i < p.nums.length; i += 1) {
          if (p.nums[i - 1] > p.nums[i]) return `nums must be non-decreasing, but index ${i - 1} holds ${p.nums[i - 1]} before ${p.nums[i]}`;
        }
        if (!p.nums.every((v) => Number.isInteger(v) && v >= -10000 && v <= 10000)) return 'values must be integers within +/- 10^4';
        if (!Number.isInteger(p.target) || p.target < -10000 || p.target > 10000) return 'target must be an integer within +/- 10^4';
        return true;
      },
    },

    // =======================================================================
    {
      slug: 'first-and-last-index-of-target',
      title: 'First and Last Index of Target',
      difficulty: 'Medium',
      tags: ['binary-search', 'lower-upper-bound', 'boundary-search', 'duplicates'],
      companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
      description:
        '`nums` is sorted in non-decreasing order and may contain repeated values. Return a two-element array holding the first and last index at which `target` appears, in that order.\n\nIf `target` does not appear at all, return `[-1, -1]`.\n\nBecause the array is sorted, every occurrence of the target sits in one unbroken run, so the pair you return always describes a contiguous block and `last - first + 1` is how many times the target occurs. Finding one occurrence is not enough and walking outwards from it is not either — a run can cover the whole array, which would make that walk linear. Both ends have to be found by searching.',
      analogy:
        'Finding where a chapter begins and ends in a printed book using only the page you can see. You do not read from the front; you open somewhere, decide whether you are before, inside or after the chapter, and halve what is left. Being inside it does not answer the question, because the chapter might run for another two hundred pages, so you keep halving in each direction until you land on the exact first and last page.',
      constraints: [
        '1 <= nums.length <= 10^4',
        'nums is sorted in non-decreasing order and may contain duplicates',
        '-10^4 <= nums[i], target <= 10^4',
        'Return [-1, -1] when the target is absent',
      ],
      edgeCases: [
        'The target is absent, giving [-1, -1]',
        'The target appears exactly once, giving the same index twice',
        'Every element is the target, giving [0, nums.length - 1]',
        'The run starts at index 0',
        'The run ends at the last index',
        'A single-element array, both matching and not matching',
        'The target is smaller than everything, or larger than everything',
        'A value adjacent to the target is present but the target itself is not',
      ],
      hints: [
        'Solve it as two independent boundary searches rather than one search plus a scan. Each boundary is a lower-bound-style loop, so neither one needs to know about the other.',
        'The first index is the leftmost position where the value is at least the target. That is exactly the previous problem, and if the value sitting there is not the target then the target is absent and you can stop.',
        'For the last index, find the leftmost position where the value is strictly GREATER than the target, then step back one. Notice the only change from the first search is < becoming <=, which is why those two comparisons are so easy to swap by accident.',
        'A cleaner way to hold both in your head: let below(v) be the count of elements strictly less than v. Then first = below(target), and last = below(target + 1) - 1. Absence shows up as first being greater than last, with no separate lookup needed.',
        'Do not derive the last index by scanning right from the first one. When the array is one long run of the target, that scan visits every element and the solution stops being logarithmic on exactly the input that looks like the interesting case.',
      ],
      brute: {
        name: 'Scan and Remember Both Ends',
        summary: 'Walk the array once, recording the first and last position where the target appears.',
        intuition:
          'One pass, two variables. Set the first index the first time a match is seen and overwrite the last index on every match. If nothing matched, both stay at -1 and the required absent answer comes out on its own.\n\nThis has no boundary arithmetic to get wrong, which is exactly what makes it the reference. The whole difficulty of the optimal version lives in two comparison operators and two bound assignments, and a linear scan has none of them — so any disagreement between the two is unambiguously a bug in the search rather than a misreading of the problem.\n\nIt is also the version to reach for when the array is not sorted, since the search is only available because sortedness makes the matches contiguous.',
        steps: [
          'Set first and last to -1.',
          'For each index, if the element equals the target, set first if it is still -1, and set last unconditionally.',
          'Return the pair.',
        ],
        js: 'function firstAndLastIndex(nums, target) {\n  let first = -1;\n  let last = -1;\n  for (let i = 0; i < nums.length; i += 1) {\n    if (nums[i] === target) {\n      if (first === -1) first = i;\n      last = i;\n    }\n  }\n  return [first, last];\n}',
        py: 'def first_and_last_index(nums, target):\n    first = -1\n    last = -1\n    for i, value in enumerate(nums):\n        if value == target:\n            if first == -1:\n                first = i\n            last = i\n    return [first, last]',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Two Boundary Searches',
        summary: 'Find the first position not below the target and the first position above it, then read off the range.',
        intuition:
          'Run the same boundary loop twice with one comparison changed. The first search locates the leftmost position where the value is at least the target: that is the first occurrence if the target is present at all. The second locates the leftmost position where the value is strictly greater than the target; the element just before it is the last occurrence. Two logarithmic searches, so the whole thing stays logarithmic even when the target fills the array.\n\nAbsence needs one check and it is easy to get subtly wrong. After the first search, `low` can land on `nums.length`, which is past the end and cannot be indexed, so the bounds check has to come before the value comparison. If instead you tested `nums[low] !== target` first you would read off the end of the array in exactly the case where the target is larger than everything.\n\nThe two searches differ only in `<` versus `<=`, and that is the whole reason this problem is harder than the previous one. Swapping them turns first into last and last into first, producing an inverted pair on any input with duplicates and an identical pair on any input without them — so a test set built from distinct values would not notice. Most of the cases here are runs.\n\nThe accompanying Python reference is written from the counting identity instead: with below(v) meaning the number of elements strictly under v, the first index is below(target) and the last is below(target + 1) - 1, because everything under target + 1 is either under target or equal to it. Absence falls out as first exceeding last, so there is no index to bounds-check at all. It is the same two searches wearing different clothes, and it needs `target + 1` where the other needs `<=` — different mistakes available, which is what makes the pair worth having.',
        steps: [
          'Search for the leftmost position where the value is at least the target; call it first.',
          'If first equals nums.length, or the value there is not the target, return [-1, -1].',
          'Search for the leftmost position where the value is strictly greater than the target.',
          'Subtract one from it to get last.',
          'Return [first, last].',
        ],
        js: 'function firstIndexAtLeast(nums, target) {\n  let low = 0;\n  let high = nums.length;\n  while (low < high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\n\nfunction firstIndexAbove(nums, target) {\n  let low = 0;\n  let high = nums.length;\n  while (low < high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (nums[mid] <= target) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\n\nfunction firstAndLastIndex(nums, target) {\n  const first = firstIndexAtLeast(nums, target);\n  if (first === nums.length || nums[first] !== target) return [-1, -1];\n  const last = firstIndexAbove(nums, target) - 1;\n  return [first, last];\n}',
        py: 'def count_strictly_below(nums, limit):\n    low = 0\n    high = len(nums)\n    while low < high:\n        mid = (low + high) // 2\n        if nums[mid] < limit:\n            low = mid + 1\n        else:\n            high = mid\n    return low\n\n\ndef first_and_last_index(nums, target):\n    first = count_strictly_below(nums, target)\n    last = count_strictly_below(nums, target + 1) - 1\n    if first > last:\n        return [-1, -1]\n    return [first, last]',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [5, 7, 7, 8, 8, 10], target: 8 }, expect: [3, 4], explanation: 'The 8s occupy indices 3 and 4. Both ends are found by searching, not by stepping outwards from a hit.' },
        { payload: { nums: [5, 7, 7, 8, 8, 10], target: 6 }, expect: [-1, -1], explanation: 'The target is absent. The first boundary search lands at index 1, but the value there is 7, so absence is detected without a second search.' },
        { payload: { nums: [4, 4, 4, 4], target: 4 }, expect: [0, 3], explanation: 'The run covers the whole array. Scanning outwards from a hit would be linear here, which is exactly the case the second search exists for.' },
        { payload: { nums: [2, 4, 6], target: 9 }, expect: [-1, -1], explanation: 'The target is above everything, so the first search returns 3, one past the end. Checking that before indexing is what avoids reading out of bounds.' },
      ],
      cases: [
        { payload: { nums: [1], target: 1 }, label: 'single element, present' },
        { payload: { nums: [1], target: 2 }, label: 'single element, target above' },
        { payload: { nums: [1], target: 0 }, label: 'single element, target below' },
        { payload: { nums: [1, 2, 3], target: 1 }, label: 'single occurrence at index 0' },
        { payload: { nums: [1, 2, 3], target: 3 }, label: 'single occurrence at the last index' },
        { payload: { nums: [3, 3, 3, 5, 6], target: 3 }, label: 'run anchored at the start' },
        { payload: { nums: [1, 2, 9, 9, 9], target: 9 }, label: 'run anchored at the end' },
        { payload: { nums: [1, 2, 2, 2, 2, 2, 3], target: 2 }, label: 'long interior run — swapping < and <= inverts this pair' },
        { payload: { nums: [1, 2, 2, 2, 2, 2, 3], target: 1 }, label: 'target immediately before a long run' },
        { payload: { nums: [1, 2, 2, 2, 2, 2, 3], target: 3 }, label: 'target immediately after a long run' },
        { payload: { nums: [7, 7], target: 7 }, label: 'two identical elements, the smallest run spanning everything' },
        { payload: { nums: [1, 3], target: 2 }, label: 'target in the gap of a two-element array' },
        { payload: { nums: [-10000, -10000, 10000, 10000], target: -10000 }, label: 'boundary magnitudes, run at the start' },
        { payload: { nums: [-10000, -10000, 10000, 10000], target: 10000 }, label: 'boundary magnitudes, run at the end' },
        { payload: { nums: [-5, -4, -4, -4, -1], target: -4 }, label: 'all negative with an interior run' },
        { payload: { nums: [0, 0, 0, 0, 0, 0, 0, 0], target: 1 }, label: 'target absent but above a run that fills the array' },
        { payload: { nums: [1, 1, 1, 2, 2, 2], target: 2 }, label: 'two runs, target is the second, so first is not 0' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1 || p.nums.length > 10000) return 'nums must hold between 1 and 10^4 elements';
        for (let i = 1; i < p.nums.length; i += 1) {
          if (p.nums[i - 1] > p.nums[i]) return `nums must be non-decreasing, but index ${i - 1} holds ${p.nums[i - 1]} before ${p.nums[i]}`;
        }
        if (!p.nums.every((v) => Number.isInteger(v) && v >= -10000 && v <= 10000)) return 'values must be integers within +/- 10^4';
        if (!Number.isInteger(p.target) || p.target < -10000 || p.target > 10000) return 'target must be an integer within +/- 10^4';
        return true;
      },
    },

    // =======================================================================
    {
      slug: 'count-values-below-each-query',
      title: 'Count Values Below Each Query',
      difficulty: 'Medium',
      tags: ['binary-search', 'lower-upper-bound', 'sorting', 'preprocessing'],
      companies: ['Amazon', 'Google', 'Adobe'],
      description:
        'You are given `nums` in **arbitrary order** and a list of `queries`. For each query, return how many values in `nums` are strictly less than it.\n\nReturn one answer per query, in the same order the queries were given.\n\nStrictly less than matters: a value exactly equal to a query is not counted. Queries may repeat, may arrive in any order, and may fall below everything or above everything in `nums`.\n\nThe interesting part is not any single count. It is that `nums` is unsorted, so some preparation is unavoidable — and once you have paid for it, every query afterwards should be cheap. Sorting once and searching per query costs `O(N log N + Q log N)`; answering each query by scanning costs `O(N * Q)` and gets worse the more questions you are asked.',
      analogy:
        'Someone hands you an unsorted stack of exam papers and then asks, one score at a time, how many students scored below each cutoff. Re-counting the stack for every cutoff is absurd. You sort the stack once and then each answer is a matter of finding where a cutoff falls, and the sorting effort is spread across however many questions come.',
      constraints: [
        '1 <= nums.length <= 10^4',
        '1 <= queries.length <= 10^4',
        'nums is in arbitrary order and may contain duplicates',
        '-10^4 <= nums[i], queries[j] <= 10^4',
        'Each answer lies in the range 0 to nums.length inclusive',
      ],
      edgeCases: [
        'nums arrives unsorted, so a solution that searches it directly is wrong',
        'A query equal to a value in nums, which must NOT be counted',
        'A query below every value, giving 0',
        'A query above every value, giving nums.length',
        'Repeated queries, which must each get the same answer',
        'Queries given in descending order',
        'Every value in nums identical, so answers are only ever 0 or nums.length',
        'A single value in nums, and a single query',
        'A query exactly equal to the minimum of nums, giving 0',
      ],
      hints: [
        'Separate the work into preparation and lookup. Ask what you would want to have ready before the first query arrives, given that every query is the same kind of question.',
        'Sorting nums once makes it possible to answer any query without touching the whole array again. Sort a COPY unless you are sure the caller does not need the original order.',
        'A single query against sorted values is the leftmost-insert-index problem from earlier in this pattern: the count of values strictly below the query IS the leftmost position where the query could be inserted. So the per-query work is a boundary search you already have.',
        'Keep the comparison strict inside that search. Using <= counts values equal to the query, which is a different question and shows up only on queries that land exactly on a value — so test those deliberately.',
        'A different route worth knowing: sort the queries too, remembering their original positions, then walk the sorted values and the sorted queries together with a single moving cursor. No binary search at all, and it is faster when the number of queries is large. Just remember to write each answer back to its original position.',
      ],
      brute: {
        name: 'Count Per Query',
        summary: 'For each query, walk the whole of nums and count what is below it.',
        intuition:
          'The direct reading of the problem, and it needs nothing about ordering. For each query, scan every value and count the ones strictly below. It works on unsorted input as-is, which is worth noticing: sorting is an optimisation here rather than a requirement, unlike in the previous two problems where sortedness is a promise the search depends on.\n\nThe cost is the product of the two sizes. At the stated limits that is up to 10^8 comparisons, which is the wrong side of acceptable, and it gets worse rather than better as more queries arrive — the opposite of what preprocessing gives you.\n\nAs a reference it is ideal, because the strictness rule appears exactly once and in plain sight. Every disagreement it catches in the fast version is either a comparison operator or a forgotten sort.',
          steps: [
          'Create an empty list of answers.',
          'For each query, set a counter to zero.',
          'Walk every value in nums, increasing the counter when the value is strictly below the query.',
          'Append the counter to the answers.',
          'Return the answers in query order.',
        ],
        js: 'function countBelowEachQuery(nums, queries) {\n  const answers = [];\n  for (const query of queries) {\n    let below = 0;\n    for (const value of nums) {\n      if (value < query) below += 1;\n    }\n    answers.push(below);\n  }\n  return answers;\n}',
        py: 'def count_below_each_query(nums, queries):\n    answers = []\n    for query in queries:\n        below = 0\n        for value in nums:\n            if value < query:\n                below += 1\n        answers.append(below)\n    return answers',
        time: 'O(N * Q)',
        space: 'O(Q)',
      },
      optimal: {
        name: 'Sort Once, Then a Boundary Search per Query',
        summary: 'Sort a copy of nums, then answer each query with the leftmost-insert-index search.',
        intuition:
          'Sort a copy of `nums` once. Now every query is one boundary search: the number of values strictly below a query is the leftmost position at which that query could be inserted, which is the first problem in this pattern reused verbatim. Total cost is one sort plus one logarithmic search per query, and the sort is paid whether there is one query or ten thousand.\n\nSort a COPY. Reordering the caller\'s array is a side effect the problem never asked for, and in the harness it would mean one test case could change what a later one sees.\n\nThe strict comparison is the whole correctness question and it is invisible on most inputs. A query that falls between two distinct values gives the same answer either way; only a query landing exactly on a value distinguishes strictly-below from at-or-below. Several cases here are built to land exactly on a value for that reason, including a query equal to the minimum, where strictly-below must give 0.\n\nThe accompanying Python reference avoids binary search entirely. Sort the values, sort the query INDICES by their query value, then sweep both together with one cursor that only ever moves forward: for each query in ascending order, advance the cursor past every value below it, and the cursor position is the answer. Because the cursor never rewinds, the whole query set costs one linear pass after sorting, which is better than a search per query when there are many queries. The catch is that answers come out in sorted-query order and must be written back to the original positions, which is why the sort is over indices rather than over the queries themselves. Two constructions, one with a per-query search and one with none, agreeing on every payload.',
        steps: [
          'Sort a copy of nums in ascending order.',
          'For each query in the order given, run a boundary search on the sorted copy.',
          'The search returns the leftmost position where the query could be inserted, which is the count of values strictly below it.',
          'Collect those counts in query order and return them.',
        ],
        js: 'function leftmostIndexAtLeast(sorted, target) {\n  let low = 0;\n  let high = sorted.length;\n  while (low < high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (sorted[mid] < target) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\n\nfunction countBelowEachQuery(nums, queries) {\n  const sorted = nums.slice().sort((a, b) => a - b);\n  return queries.map((query) => leftmostIndexAtLeast(sorted, query));\n}',
        py: 'def count_below_each_query(nums, queries):\n    values = sorted(nums)\n    order = sorted(range(len(queries)), key=lambda i: queries[i])\n    answers = [0] * len(queries)\n    cursor = 0\n    for i in order:\n        while cursor < len(values) and values[cursor] < queries[i]:\n            cursor += 1\n        answers[i] = cursor\n    return answers',
        time: 'O(N log N + Q log N)',
        space: 'O(N + Q)',
      },
      examples: [
        { payload: { nums: [4, 1, 7, 1], queries: [2, 8, 1] }, expect: [2, 4, 0], explanation: 'nums is unsorted. Below 2 there are the two 1s; below 8 everything; below 1 nothing, because equal values do not count.' },
        { payload: { nums: [3, 3, 3], queries: [3, 4] }, expect: [0, 3], explanation: 'A query equal to every value counts none of them. One point higher counts all three. This pair is what separates strictly-below from at-or-below.' },
        { payload: { nums: [10, 20, 30], queries: [30, 30, 5] }, expect: [2, 2, 0], explanation: 'Repeated queries get the same answer, and answers stay in query order rather than being sorted or deduplicated.' },
        { payload: { nums: [5], queries: [9, 5, 1] }, expect: [1, 0, 0], explanation: 'A single value, with queries above it, equal to it and below it. Descending queries do not change the required output order.' },
      ],
      cases: [
        { payload: { nums: [1], queries: [1] }, label: 'one value, one query, equal' },
        { payload: { nums: [9, 8, 7, 6, 5], queries: [7] }, label: 'strictly descending input, so an unsorted search fails' },
        { payload: { nums: [5, 5, 5, 5], queries: [5, 6, 4] }, label: 'all identical values, answers only 0 or 4' },
        { payload: { nums: [2, 4, 6, 8], queries: [8, 6, 4, 2] }, label: 'queries in descending order, each landing exactly on a value' },
        { payload: { nums: [2, 4, 6, 8], queries: [1, 3, 5, 7, 9] }, label: 'every query in a gap, where strict and non-strict agree' },
        { payload: { nums: [-3, -1, -2], queries: [-2, 0, -4] }, label: 'all negative and unsorted' },
        { payload: { nums: [1, 2, 3, 4, 5], queries: [1] }, label: 'query equals the minimum, so the answer is 0' },
        { payload: { nums: [1, 2, 3, 4, 5], queries: [6] }, label: 'query above the maximum, so the answer is the full length' },
        { payload: { nums: [7, 7, 7, 1, 1], queries: [7, 1, 4] }, label: 'two runs, unsorted, queries on both run values' },
        { payload: { nums: [0], queries: [-10000, 0, 10000] }, label: 'constraint boundary queries against a single zero' },
        { payload: { nums: [-10000, 10000], queries: [-10000, 10000, 0] }, label: 'constraint boundary values and queries' },
        { payload: { nums: [3, 1, 4, 1, 5, 9, 2, 6], queries: [5, 5, 5, 1, 10] }, label: 'unsorted with duplicates and a repeated query' },
        { payload: { nums: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2], queries: [2, 1, 3] }, label: 'long run then a single larger value' },
        { payload: { nums: [100, 50], queries: [50, 51, 100, 101] }, label: 'two values with queries just on and just past each' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1 || p.nums.length > 10000) return 'nums must hold between 1 and 10^4 elements';
        if (!Array.isArray(p.queries) || p.queries.length < 1 || p.queries.length > 10000) return 'queries must hold between 1 and 10^4 entries';
        if (!p.nums.every((v) => Number.isInteger(v) && v >= -10000 && v <= 10000)) return 'values must be integers within +/- 10^4';
        if (!p.queries.every((v) => Number.isInteger(v) && v >= -10000 && v <= 10000)) return 'queries must be integers within +/- 10^4';
        return true;
      },
    },
  ],
};
