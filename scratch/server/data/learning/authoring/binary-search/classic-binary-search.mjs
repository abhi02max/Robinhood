/**
 * Binary Search -> Classic Binary Search on a Sorted Array.
 *
 * The canonical entry set for the pattern: halve a sorted range on a comparison
 * against the midpoint. Four problems chosen so that each forces a different part of
 * the template to be right — the exact hit, the insertion point when there is no hit,
 * a strictly-greater search with wraparound, and a variant where the comparison is
 * against a parity invariant rather than against a target value.
 */
export default {
  topic: 'binary-search',
  pattern: 'classic-binary-search',
  problems: [
    // -----------------------------------------------------------------------
    {
      slug: 'binary-search',
      title: 'Binary Search',
      difficulty: 'Easy',
      tags: ['binary-search', 'sorted-array'],
      companies: ['Amazon', 'Google', 'Microsoft'],
      description:
        'Given a sorted array of distinct integers `nums` and an integer `target`, return the index of `target` if it is present, or `-1` if it is not.\n\nThe solution must run in `O(log N)` time, which rules out a linear scan. This is the template every other problem in the topic is a variation of, so it is worth getting the boundary handling exactly right rather than approximately right.',
      analogy:
        'Looking up a word in a physical dictionary. You open it near the middle, see whether your word sorts before or after that page, and throw away the half that cannot contain it. Each look discards half the remaining pages.',
      constraints: [
        '1 <= nums.length <= 10^4',
        '-10^4 <= nums[i], target <= 10^4',
        'All values in nums are distinct and sorted in ascending order',
      ],
      edgeCases: [
        'Target is the first element',
        'Target is the last element',
        'Target is absent but within the value range, so the search must terminate',
        'Target is smaller than everything or larger than everything',
        'Single-element array, both matching and not matching',
      ],
      hints: [
        'Maintain a range [low, high] that is the only part of the array still able to contain the target. What does comparing nums[mid] to target tell you about which half to keep?',
        'Use low <= high as the loop condition and move past the midpoint when you discard: low = mid + 1 or high = mid - 1. Writing low = mid instead is the classic infinite loop.',
        'Compute mid as low + Math.floor((high - low) / 2) rather than (low + high) / 2 — the habit matters in languages where the sum can overflow.',
      ],
      brute: {
        name: 'Linear Scan',
        summary: 'Walk the array from the start and return the first index holding the target.',
        intuition:
          'Sortedness is not required for this to be correct, which is exactly why it is the wrong answer here: it ignores the one piece of structure the problem gives you. It is O(N), fine for a handful of elements and useful as an oracle for the fast version.\n\nThe useful thing it shows is the contract: distinct values mean there is at most one answer, so "the first index found" and "the index" are the same thing.',
        steps: [
          'For each index i from 0 upward:',
          'If nums[i] equals target, return i.',
          'Return -1 after the loop.',
        ],
        js: 'function search(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] === target) return i;\n  }\n  return -1;\n}',
        py: 'def search(nums, target):\n    for i, value in enumerate(nums):\n        if value == target:\n            return i\n    return -1',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Halve the Range',
        summary: 'Keep a candidate range and compare the target against the midpoint, discarding the half that cannot contain it.',
        intuition:
          'The invariant is: if the target is anywhere in the array, it is inside [low, high]. Start with the whole array, so the invariant holds. Look at the midpoint. Because the array is sorted, if nums[mid] < target then every index up to and including mid is too small, so the target can only be in [mid+1, high] — and the invariant still holds. Symmetrically for nums[mid] > target.\n\nEach step at least halves the range, so it takes O(log N) steps. When low > high the range is empty, and by the invariant the target was never present, so -1 is correct.\n\nThe two details that break implementations: the loop condition must be low <= high, because a range of one element is still a live candidate and must be tested; and the discard must step past mid, because nums[mid] has already been ruled out and leaving it in the range means the range can stop shrinking.',
        steps: [
          'Set low = 0 and high = N - 1.',
          'While low <= high, compute mid = low + (high - low) / 2 rounded down.',
          'If nums[mid] equals target, return mid.',
          'If nums[mid] is less than target, set low = mid + 1; otherwise set high = mid - 1.',
          'Return -1 once the range is empty.',
        ],
        js: 'function search(nums, target) {\n  let low = 0;\n  let high = nums.length - 1;\n  while (low <= high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}',
        py: 'def search(nums, target):\n    low, high = 0, len(nums) - 1\n    while low <= high:\n        mid = low + (high - low) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, expect: 4, explanation: '9 sits at index 4. The search looks at 3, then 9, and stops.' },
        { payload: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, expect: -1, explanation: '2 is inside the value range but absent, so the range empties and the answer is -1.' },
        { payload: { nums: [5], target: 5 }, expect: 0, explanation: 'A single-element range must still be tested, which is what low <= high guarantees.' },
        { payload: { nums: [1, 3], target: 3 }, expect: 1, explanation: 'With two elements the midpoint rounds down to index 0, so finding index 1 requires the low = mid + 1 step to be correct.' },
      ],
      cases: [
        { payload: { nums: [5], target: -5 }, label: 'single element, no match' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 1 }, label: 'target is the first element' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 5 }, label: 'target is the last element' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 0 }, label: 'target below the whole range' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 6 }, label: 'target above the whole range' },
        { payload: { nums: [-10000, 0, 10000], target: -10000 }, label: 'constraint boundary values' },
        { payload: { nums: [2, 4, 6, 8, 10, 12, 14, 16], target: 14 }, label: 'even length, target in the right half' },
        { payload: { nums: [1, 3, 5, 7, 9, 11, 13], target: 7 }, label: 'odd length, target at the exact midpoint' },
        { payload: { nums: [-9, -7, -5, -3, -1], target: -6 }, label: 'all negative, absent target' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'search-insert-position',
      title: 'Search Insert Position',
      difficulty: 'Easy',
      tags: ['binary-search', 'sorted-array', 'lower-bound'],
      companies: ['Amazon', 'Google'],
      description:
        'Given a sorted array of distinct integers `nums` and a target, return the index of the target if it is present. If it is absent, return the index where it **would be inserted** to keep the array sorted.\n\nThis is the same search as plain binary search with one change: instead of reporting failure, report where the failure happened. The answer is in the range `[0, N]` — inserting past the end is valid.',
      analogy:
        'Filing a new folder into an alphabetised drawer. If the label already exists you stop at it; if it does not, you still need the exact gap it belongs in, and "not found" is not an acceptable answer.',
      constraints: [
        '1 <= nums.length <= 10^4',
        '-10^4 <= nums[i], target <= 10^4',
        'nums contains distinct values sorted in ascending order',
      ],
      edgeCases: [
        'Target smaller than every element — the answer is 0',
        'Target larger than every element — the answer is N, one past the end',
        'Target already present, where the answer is its own index',
        'Insertion between two adjacent elements',
        'Single-element array, target on either side of it',
      ],
      hints: [
        'Run the same loop as binary search, but think about what low holds when the loop ends without a match.',
        'When the range empties, low is exactly the count of elements strictly less than the target — which is the insertion index. So returning low instead of -1 is the whole change.',
        'This is the lower-bound primitive: the first index whose value is >= target. Recognising it here makes the duplicate-handling problems later much shorter.',
      ],
      brute: {
        name: 'Scan for the First Element Not Less Than Target',
        summary: 'Walk from the left and return the first index whose value is greater than or equal to the target.',
        intuition:
          'The insertion point is by definition the first position whose current occupant should come after the new value. Scanning left to right finds it directly, and if no element qualifies the answer is the length of the array.\n\nO(N), and it makes the specification concrete: the answer is a count of elements strictly smaller than the target, which is what the binary-search version converges on.',
        steps: [
          'For each index i in order:',
          'If nums[i] is greater than or equal to target, return i.',
          'Return the array length if nothing qualified.',
        ],
        js: 'function searchInsert(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] >= target) return i;\n  }\n  return nums.length;\n}',
        py: 'def search_insert(nums, target):\n    for i, value in enumerate(nums):\n        if value >= target:\n            return i\n    return len(nums)',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Binary Search Returning the Low Pointer',
        summary: 'Standard halving loop; when the range empties, low is the insertion index.',
        intuition:
          'Track the same invariant as binary search, and add a second one: every index below low holds a value strictly less than the target, and every index above high holds a value strictly greater. Both start vacuously true.\n\nWhen nums[mid] < target we set low = mid + 1, which keeps the first claim true. When nums[mid] > target we set high = mid - 1, keeping the second. The loop ends when low = high + 1, at which point the two claims say: everything left of low is smaller, everything from low on is larger. That is precisely the insertion point.\n\nSo the answer is low, and it needs no special casing for the two extremes — a target below everything never advances low past 0, and a target above everything advances it all the way to N.',
        steps: [
          'Set low = 0 and high = N - 1.',
          'While low <= high, compute the midpoint.',
          'If nums[mid] equals target, return mid.',
          'If nums[mid] is less than target, set low = mid + 1; otherwise set high = mid - 1.',
          'Return low.',
        ],
        js: 'function searchInsert(nums, target) {\n  let low = 0;\n  let high = nums.length - 1;\n  while (low <= high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return low;\n}',
        py: 'def search_insert(nums, target):\n    low, high = 0, len(nums) - 1\n    while low <= high:\n        mid = low + (high - low) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return low',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [1, 3, 5, 6], target: 5 }, expect: 2, explanation: '5 is present at index 2, so that index is returned.' },
        { payload: { nums: [1, 3, 5, 6], target: 2 }, expect: 1, explanation: '2 belongs between 1 and 3, which is index 1.' },
        { payload: { nums: [1, 3, 5, 6], target: 7 }, expect: 4, explanation: '7 is larger than everything, so it is inserted one past the end at index 4.' },
        { payload: { nums: [1, 3, 5, 6], target: 0 }, expect: 0, explanation: '0 is smaller than everything, so it goes at the front.' },
      ],
      cases: [
        { payload: { nums: [1], target: 0 }, label: 'single element, insert before' },
        { payload: { nums: [1], target: 1 }, label: 'single element, exact match' },
        { payload: { nums: [1], target: 2 }, label: 'single element, insert after' },
        { payload: { nums: [-10, -5, 0, 5, 10], target: -7 }, label: 'insertion among negatives' },
        { payload: { nums: [-10, -5, 0, 5, 10], target: 0 }, label: 'match at the exact midpoint' },
        { payload: { nums: [2, 4, 6, 8], target: 7 }, label: 'insertion in the right half of an even-length array' },
        { payload: { nums: [-10000, 10000], target: 0 }, label: 'constraint boundary values' },
        { payload: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9], target: 10 }, label: 'append to a long array' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'find-smallest-letter-greater-than-target',
      title: 'Find Smallest Letter Greater Than Target',
      difficulty: 'Easy',
      tags: ['binary-search', 'upper-bound', 'strings'],
      companies: ['LinkedIn'],
      description:
        'You are given an array of characters `letters` sorted in non-decreasing order, each a single lowercase letter, and a character `target`. Return the smallest letter in the array that is **strictly greater** than `target`.\n\nThe letters wrap around: if no letter is strictly greater than the target, return the first letter of the array. Note that `letters` may contain repeats, which is what makes "strictly greater" different from "greater or equal".',
      analogy:
        'A circular seating chart in alphabetical order. You want the next person after a given name; if the name sorts after everyone, you wrap round to the first seat rather than reporting nothing.',
      constraints: [
        '2 <= letters.length <= 10^4',
        'Every entry of letters is a single lowercase English letter',
        'letters is sorted in non-decreasing order and may contain repeats',
        'target is a single lowercase English letter',
      ],
      edgeCases: [
        'Target greater than or equal to every letter — wrap to letters[0]',
        'Target smaller than every letter — the answer is letters[0] without wrapping, which looks the same but arrives differently',
        'Repeated letters equal to the target, all of which must be skipped',
        'The whole array is one repeated letter',
        'Target is the letter z, forcing the wrap',
      ],
      hints: [
        'You want the first index whose letter is strictly greater than the target. What does that make the comparison inside the loop?',
        'Treat a letter equal to the target the same way you treat a smaller one — both mean "go right". That is the difference between upper bound and lower bound, and it is a one-character change.',
        'When the range empties, low is the count of letters that are <= target. If that equals the array length, everything was too small, so return letters[0]; otherwise return letters[low].',
      ],
      brute: {
        name: 'Scan for the First Strictly Greater Letter',
        summary: 'Walk the sorted array and return the first letter that beats the target; wrap if none does.',
        intuition:
          'Because the array is sorted, the first strictly-greater letter encountered is the smallest such letter, so a single left-to-right pass answers the question. If the scan finishes, no letter qualified and the wrap rule applies.\n\nWriting this first pins down the two subtleties that the binary search then has to reproduce: comparison is strict, and failure wraps rather than returning nothing.',
        steps: [
          'For each letter in order:',
          'If it is strictly greater than target, return it.',
          'Return the first letter of the array if the scan finished.',
        ],
        js: 'function nextGreatestLetter(letters, target) {\n  for (const letter of letters) {\n    if (letter > target) return letter;\n  }\n  return letters[0];\n}',
        py: 'def next_greatest_letter(letters, target):\n    for letter in letters:\n        if letter > target:\n            return letter\n    return letters[0]',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Upper Bound by Binary Search',
        summary: 'Binary search for the first index strictly greater than the target, then wrap if that index is past the end.',
        intuition:
          'This is the upper-bound primitive. The invariant is that every index below low holds a letter <= target and every index above high holds a letter > target. To maintain it, a midpoint letter that is less than *or equal to* the target sends low right — equality is on the "discard" side, which is exactly what makes the result strictly greater and what makes repeats of the target skip correctly.\n\nWhen the loop ends, low is the number of letters that are <= target. If low equals the length, every letter lost the comparison and the wrap rule gives letters[0]. Otherwise letters[low] is the smallest strictly-greater letter.\n\nOne modulo does both cases at once: letters[low % letters.length]. It is worth understanding rather than memorising, because the same shape appears whenever a sorted search has to wrap.',
        steps: [
          'Set low = 0 and high = N - 1.',
          'While low <= high, compute the midpoint.',
          'If letters[mid] is less than or equal to target, set low = mid + 1; otherwise set high = mid - 1.',
          'Return letters[low % N], which wraps to the first letter when nothing was greater.',
        ],
        js: 'function nextGreatestLetter(letters, target) {\n  let low = 0;\n  let high = letters.length - 1;\n  while (low <= high) {\n    const mid = low + Math.floor((high - low) / 2);\n    if (letters[mid] <= target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return letters[low % letters.length];\n}',
        py: 'def next_greatest_letter(letters, target):\n    low, high = 0, len(letters) - 1\n    while low <= high:\n        mid = low + (high - low) // 2\n        if letters[mid] <= target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return letters[low % len(letters)]',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { letters: ['c', 'f', 'j'], target: 'a' }, expect: 'c', explanation: 'Every letter beats a, so the smallest of them, c, is the answer.' },
        { payload: { letters: ['c', 'f', 'j'], target: 'c' }, expect: 'f', explanation: 'Strictly greater, so c itself does not qualify and f is next.' },
        { payload: { letters: ['c', 'f', 'j'], target: 'j' }, expect: 'c', explanation: 'Nothing is greater than j, so the search wraps to the first letter.' },
        { payload: { letters: ['x', 'x', 'y', 'y'], target: 'z' }, expect: 'x', explanation: 'Target above everything with repeats present; the wrap gives x.' },
      ],
      cases: [
        { payload: { letters: ['a', 'b'], target: 'a' }, label: 'minimum length array' },
        { payload: { letters: ['a', 'b'], target: 'b' }, label: 'minimum length, wrap required' },
        { payload: { letters: ['e', 'e', 'e', 'e'], target: 'e' }, label: 'all letters identical and equal to target' },
        { payload: { letters: ['e', 'e', 'e', 'e'], target: 'd' }, label: 'all identical, target just below' },
        { payload: { letters: ['a', 'c', 'c', 'c', 'f'], target: 'c' }, label: 'run of repeats equal to target must be skipped' },
        { payload: { letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], target: 'd' }, label: 'even length, answer just right of the midpoint' },
        { payload: { letters: ['b', 'z'], target: 'a' }, label: 'target below everything' },
        { payload: { letters: ['a', 'a', 'z', 'z'], target: 'a' }, label: 'jump over a block of repeats' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'single-element-in-a-sorted-array',
      title: 'Single Element in a Sorted Array',
      difficulty: 'Medium',
      tags: ['binary-search', 'sorted-array', 'parity'],
      companies: ['Amazon', 'Microsoft', 'Google'],
      description:
        'You are given a sorted array where every element appears exactly **twice**, except for one element which appears once. Return that single element.\n\nThe expected complexity is `O(log N)` time and `O(1)` space, so XOR-ing the whole array (which is `O(N)`) does not qualify. The insight is that you are not searching for a value at all — you are searching for the place where the pairing breaks.',
      analogy:
        'Shoes lined up in pairs along a wall, left then right, left then right. One shoe has no partner. You do not need to check every pair: step to the middle, look at whether the pairs there still start on even positions, and the odd one out must be on the side where that pattern has broken.',
      constraints: [
        '1 <= nums.length <= 10^5',
        'nums.length is odd',
        '0 <= nums[i] <= 10^5',
        'nums is sorted in non-decreasing order and every value but one appears exactly twice',
      ],
      edgeCases: [
        'Single-element array — that element is the answer',
        'The unique element is first',
        'The unique element is last',
        'The unique element is at the exact midpoint',
        'Pairs of equal values adjacent to the unique element, which is where naive midpoint comparisons fail',
      ],
      // The whole problem rests on the input really being sorted with exactly one
      // unpaired value. An input that breaks that makes both implementations agree on
      // an answer to a different question.
      assume: ({ nums }) => {
        if (nums.length % 2 === 0) return 'length must be odd';
        for (let i = 1; i < nums.length; i++) {
          if (nums[i] < nums[i - 1]) return `not sorted at index ${i}`;
        }
        const counts = new Map();
        for (const v of nums) counts.set(v, (counts.get(v) || 0) + 1);
        const singles = [...counts.values()].filter((n) => n !== 2);
        if (singles.length !== 1 || singles[0] !== 1) return 'exactly one value must appear once, every other exactly twice';
        return true;
      },
      hints: [
        'Before the unique element, each pair occupies indices (even, odd). What happens to that alignment after the unique element?',
        'After the single element, pairs start on odd indices instead. So the question is: is the break to the left of the midpoint, or to the right?',
        'Force the midpoint to an even index (clear its low bit). If nums[mid] equals nums[mid+1], the pairing is still intact up to there, so the answer lies to the right; otherwise it is at or before mid.',
        'Because the array length is odd and only one element is unpaired, the range always narrows to exactly one index — no separate found/not-found handling is needed.',
      ],
      brute: {
        name: 'Pairwise Scan',
        summary: 'Step through the array two at a time and return the first element whose neighbour does not match.',
        intuition:
          'Walk indices 0, 2, 4, ... and compare each with the next index. As long as pairs are intact, each even index matches its successor. The first even index that does not match holds the unique element — and if the scan reaches the last index, that final element is the unpaired one.\n\nO(N) and obviously correct, which makes it the oracle. It also shows the structure the fast solution exploits: the array is intact-pairs, then the single element, then intact-pairs shifted by one.',
        steps: [
          'For each even index i, stepping by 2:',
          'If i is the last index, return nums[i].',
          'If nums[i] is not equal to nums[i+1], return nums[i].',
          'Continue to the next even index.',
        ],
        js: 'function singleNonDuplicate(nums) {\n  for (let i = 0; i < nums.length; i += 2) {\n    if (i === nums.length - 1) return nums[i];\n    if (nums[i] !== nums[i + 1]) return nums[i];\n  }\n  return nums[nums.length - 1];\n}',
        py: 'def single_non_duplicate(nums):\n    n = len(nums)\n    for i in range(0, n, 2):\n        if i == n - 1:\n            return nums[i]\n        if nums[i] != nums[i + 1]:\n            return nums[i]\n    return nums[n - 1]',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Binary Search on Pair Alignment',
        summary: 'Search for the first even index whose pair is broken, halving the range on that test.',
        intuition:
          'Do not search for a value — search for a boundary. Split the array conceptually at the unique element. To its left, every pair sits at (even, odd) index positions. To its right, that alignment is shifted by one, so pairs sit at (odd, even).\n\nSo take a midpoint and snap it down to an even index. If nums[mid] equals nums[mid+1], the (even, odd) alignment still holds at mid, which means the unique element is strictly to the right: set low = mid + 2. If they differ, the alignment has already broken at or before mid, so set high = mid.\n\nThe range shrinks to a single even index, which is the answer. Snapping the midpoint down is the part worth being careful about: comparing an odd mid against mid+1 tests the wrong pairing and the search drifts to the wrong half.\n\nThe alternative O(N) trick — XOR every element, since duplicates cancel — is correct and much easier to remember, but it reads the whole array and so misses the point of the exercise.',
        steps: [
          'Set low = 0 and high = N - 1.',
          'While low is less than high, compute mid and clear its lowest bit so it is even.',
          'If nums[mid] equals nums[mid + 1], set low = mid + 2 — the break is further right.',
          'Otherwise set high = mid — the break is at or before mid.',
          'Return nums[low].',
        ],
        js: 'function singleNonDuplicate(nums) {\n  let low = 0;\n  let high = nums.length - 1;\n  while (low < high) {\n    let mid = low + Math.floor((high - low) / 2);\n    if (mid % 2 === 1) mid -= 1;\n    if (nums[mid] === nums[mid + 1]) low = mid + 2;\n    else high = mid;\n  }\n  return nums[low];\n}',
        py: 'def single_non_duplicate(nums):\n    low, high = 0, len(nums) - 1\n    while low < high:\n        mid = low + (high - low) // 2\n        if mid % 2 == 1:\n            mid -= 1\n        if nums[mid] == nums[mid + 1]:\n            low = mid + 2\n        else:\n            high = mid\n    return nums[low]',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { nums: [1, 1, 2, 3, 3, 4, 4, 8, 8] }, expect: 2, explanation: 'Pairs are intact up to index 1; at index 2 the alignment breaks, and 2 is the unpaired value.' },
        { payload: { nums: [3, 3, 7, 7, 10, 11, 11] }, expect: 10, explanation: 'The break happens at index 4, where 10 has no partner.' },
        { payload: { nums: [1] }, expect: 1, explanation: 'A single element is trivially unpaired, and the loop never runs.' },
        { payload: { nums: [1, 1, 2] }, expect: 2, explanation: 'The unique element is last, so the search has to walk right rather than stopping early.' },
      ],
      cases: [
        { payload: { nums: [1, 2, 2] }, label: 'unique element first' },
        { payload: { nums: [0, 0, 1, 1, 2, 2, 3] }, label: 'unique element last in a longer array' },
        { payload: { nums: [1, 2, 2, 3, 3] }, label: 'unique element first, longer tail' },
        { payload: { nums: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6] }, label: 'unique element at the far right' },
        { payload: { nums: [1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6] }, label: 'unique element at the exact midpoint' },
        { payload: { nums: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5] }, label: 'unique element is zero at the front' },
        { payload: { nums: [10, 10, 20, 20, 30, 30, 40, 40, 50, 50, 100000] }, label: 'constraint boundary value, unique at the end' },
        { payload: { nums: [1, 1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13] }, label: 'long array, unique at the end' },
        { payload: { nums: [1, 1, 3, 3, 5, 7, 7, 9, 9, 11, 11, 13, 13] }, label: 'long array, unique in the middle' },
      ],
    },
  ],
};
