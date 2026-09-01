/**
 * Recursion -> Subsets via Include/Exclude.
 *
 * `recursion` is the declared prerequisite of dynamic-programming and both tree topics, and it held
 * zero problems while dynamic-programming/1d-state already held four. This is the shape every
 * backtracking and knapsack problem reuses, so it goes before either.
 *
 * The three problems are a deliberate ladder, and the third is the one that matters most:
 *
 *   subsets              the bare include/exclude decision tree
 *   subsets with dups    pruning a branch, which is the first time the recursion makes a CHOICE
 *                        about whether to recurse rather than always doing both
 *   count subsets        the same tree with the enumeration deleted -- and this is exactly the step
 *                        that makes dynamic programming possible, because a count has overlapping
 *                        subproblems where a list of subsets does not
 *
 * The third is also flat-signatured on purpose. The first two return vector<vector<int>>, which C
 * cannot express, so without it the whole pattern would be unreachable for a C learner. It was not
 * chosen to game the language count -- counting subsets with a target sum is a canonical problem in
 * its own right and it is the direct bridge to 0-1 knapsack in stage 12.
 *
 * ORDERING
 * --------
 * Subsets have no natural order, and the grader compares exact output, so an unstated ordering
 * would make a correct solution ungradable. Both enumeration problems state it: each subset
 * ascending, the outer list sorted by length and then lexicographically. Following the repo's
 * existing 3sum precedent.
 */
export default {
  topic: 'recursion',
  pattern: 'subset-include-exclude',
  problems: [
    // =======================================================================
    {
      slug: 'all-subsets-of-distinct-values',
      title: 'All Subsets of Distinct Values',
      difficulty: 'Medium',
      tags: ['recursion', 'subsets', 'decision-tree', 'enumeration'],
      description:
        'Given an array `nums` of distinct integers, return every possible subset, including the empty subset and the whole array. There are exactly two to the power of `n` of them.\n\nThe structure is a binary decision per element: either it is in the subset or it is not. Walking that decision tree to its leaves enumerates every subset exactly once, with no duplicates to filter out.\n\n**Output ordering.** Each subset must list its values in increasing order, and the outer list must be sorted by subset size first, and subsets of equal size compared element by element on their values. Subsets have no natural order, so the ordering is part of the specification.',
      analogy:
        'Deciding which of several optional extras to add to a car. Each extra is an independent yes-or-no, so the set of possible builds is every combination of those decisions — and the empty build, with no extras at all, is one of them.',
      constraints: [
        '1 <= nums.length <= 10',
        '-100 <= nums[i] <= 100',
        'all values in nums are distinct',
      ],
      edgeCases: [
        'A single element, giving the empty subset and the one-element subset',
        'The empty subset, which must be present and is easy to omit',
        'The full array, which must also be present',
        'Negative values, which affect the required ascending order inside each subset',
        'The maximum length of ten, giving 1024 subsets',
      ],
      hints: [
        'At each index you have exactly two choices: include that element or skip it. Recurse on both, then move to the next index.',
        'The base case is running past the last index. At that point the path you have accumulated IS one complete subset — record a copy of it.',
        'Record a COPY. If you push the running path itself, every recorded subset is the same array and it ends up empty once the recursion unwinds.',
        'Sort the input first so each path is naturally ascending, then sort the collected subsets by length, and equal-length subsets element by element.',
      ],
      brute: {
        name: 'Bitmask Enumeration',
        summary: 'Treat each integer from 0 to 2^n - 1 as a set of include/exclude bits.',
        intuition:
          'There are two to the power of n subsets and two to the power of n integers with n bits, so the correspondence is exact: for each integer, include element i whenever bit i is set. No recursion at all.\n\nIt is genuinely a good solution and it is here as the baseline because it makes the SIZE of the answer unmistakable — the loop bound is literally the count — and because it is an independent construction to check the recursion against. What it does not do is generalise: the moment the problem adds a constraint that prunes whole branches, as the next problem does, a flat loop over bitmasks has nowhere to put the pruning.',
        steps: [
          'Sort the input so that every produced subset is already ascending.',
          'For each integer from 0 to 2^n - 1, examine its bits.',
          'Include element i in the current subset when bit i of the integer is set.',
          'Collect the subsets, then sort by length and element by element.',
        ],
        js: 'function compareSubsets(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction subsets(nums) {\n  const values = nums.slice().sort((a, b) => a - b);\n  const out = [];\n  const total = 1 << values.length;\n  for (let mask = 0; mask < total; mask++) {\n    const subset = [];\n    for (let i = 0; i < values.length; i++) {\n      if (mask & (1 << i)) subset.push(values[i]);\n    }\n    out.push(subset);\n  }\n  out.sort(compareSubsets);\n  return out;\n}',
        py: 'def subsets(nums):\n    values = sorted(nums)\n    out = []\n    for mask in range(1 << len(values)):\n        subset = [values[i] for i in range(len(values)) if mask & (1 << i)]\n        out.append(subset)\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(2^N * N)',
        space: 'O(2^N * N)',
      },
      optimal: {
        name: 'Include/Exclude Recursion',
        summary: 'At each index, recurse once having taken the element and once having skipped it.',
        intuition:
          'The decision tree is the algorithm. At index `i` there are two branches: the subsets that contain `nums[i]` and the subsets that do not. Recursing into both and advancing the index covers every subset exactly once, because each subset corresponds to exactly one root-to-leaf path.\n\nTwo things go wrong in practice. The first is recording the path by reference rather than by value, so every recorded subset aliases the same array and they all end up empty when the recursion unwinds. The second is forgetting to undo the include before taking the exclude branch — the path has to be back to its original state when the second branch starts, or the two branches interfere. Here the undo is a `pop` after the include call.\n\nThat second point is the whole reason this pattern comes before backtracking. The include/exclude shape is where state restoration first becomes necessary, and it is easier to see when the only state is a list of chosen values.',
        steps: [
          'Sort the input so every path is produced in ascending order.',
          'Recurse with an index and a running path.',
          'When the index passes the last element, record a copy of the path.',
          'Otherwise: append the element and recurse, then remove it and recurse again.',
          'Sort the collected subsets by length, comparing equal-length subsets element by element.',
        ],
        js: 'function compareSubsets(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction collectSubsets(values, index, path, out) {\n  if (index === values.length) {\n    out.push(path.slice());\n    return;\n  }\n  path.push(values[index]);\n  collectSubsets(values, index + 1, path, out);\n  path.pop();\n  collectSubsets(values, index + 1, path, out);\n}\n\nfunction subsets(nums) {\n  const values = nums.slice().sort((a, b) => a - b);\n  const out = [];\n  collectSubsets(values, 0, [], out);\n  out.sort(compareSubsets);\n  return out;\n}',
        // Built by iterative doubling rather than recursion: each element either extends every
        // subset found so far or does not. Same set, different construction, so agreement is
        // evidence rather than a transcription.
        py: 'def subsets(nums):\n    values = sorted(nums)\n    out = [[]]\n    for value in values:\n        out = out + [subset + [value] for subset in out]\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(2^N * N)',
        space: 'O(2^N * N)',
      },
      examples: [
        { payload: { nums: [1, 2, 3] }, expect: [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]], explanation: 'Eight subsets for three elements, ordered by size and then element by element. The empty subset comes first.' },
        { payload: { nums: [1] }, expect: [[], [1]], explanation: 'A single element gives two subsets: skip it, or take it.' },
        { payload: { nums: [3, 1] }, expect: [[], [1], [3], [1, 3]], explanation: 'The input is unsorted but each subset must be ascending, so sorting the input first handles it.' },
        { payload: { nums: [-1, 2] }, expect: [[], [-1], [2], [-1, 2]], explanation: 'Negative values order by numeric value, so -1 precedes 2 inside the subset and in the outer ordering.' },
      ],
      cases: [
        { payload: { nums: [0] }, label: 'single zero' },
        { payload: { nums: [-5] }, label: 'single negative value' },
        { payload: { nums: [2, 1] }, label: 'two elements given in descending order' },
        { payload: { nums: [1, 2, 3, 4] }, label: 'sixteen subsets' },
        { payload: { nums: [-3, -2, -1] }, label: 'all negative' },
        { payload: { nums: [100, -100, 0] }, label: 'constraint boundary values' },
        { payload: { nums: [5, 3, 1, 4, 2] }, label: 'thirty-two subsets from shuffled input' },
        { payload: { nums: [1, 2, 3, 4, 5, 6] }, label: 'sixty-four subsets' },
        { payload: { nums: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] }, label: 'maximum length, 1024 subsets' },
        { payload: { nums: [-100, -50, 0, 50, 100] }, label: 'symmetric spread across zero' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1 || p.nums.length > 10) return 'nums must hold 1..10 elements';
        if (new Set(p.nums).size !== p.nums.length) return 'nums must hold distinct values';
        return true;
      },
    },

    // =======================================================================
    {
      slug: 'all-subsets-with-duplicates',
      title: 'All Subsets With Duplicates',
      difficulty: 'Medium',
      tags: ['recursion', 'subsets', 'pruning', 'deduplication'],
      description:
        'Given an array `nums` that may contain repeated values, return every distinct subset. Two subsets are the same if they contain the same values with the same multiplicities, regardless of which positions those values came from.\n\nSo `[1, 2, 2]` has six distinct subsets, not eight: taking the first 2 alone and taking the second 2 alone produce the same subset.\n\nFiltering duplicates out afterwards works but is wasteful and awkward. The better approach never generates them, by making the recursion skip a branch it can prove is a repeat.\n\n**Output ordering.** Each subset ascending, outer list sorted by size and then element by element on values, as in the previous problem.',
      analogy:
        'Choosing toppings from a tray where several bowls hold the same thing. Two identical bowls are interchangeable, so "one scoop of olives" is one choice however many olive bowls are on the tray — what matters is how many scoops of each kind you take, not which bowl you reached into.',
      constraints: [
        '1 <= nums.length <= 10',
        '-100 <= nums[i] <= 100',
      ],
      edgeCases: [
        'No duplicates at all, where the answer matches the previous problem',
        'All values identical, giving only n + 1 distinct subsets rather than 2^n',
        'A single element',
        'Duplicates that are not adjacent in the input, which is why sorting first is required',
        'Two separate groups of duplicates, so pruning must apply independently within each',
      ],
      hints: [
        'Sort the input first. Equal values then sit next to each other, which is what makes a duplicate branch identifiable at all.',
        'Iterate over the choices for the next position rather than taking a plain include/exclude at each index. At each level, try each remaining distinct value once.',
        'Within one level, if the value equals the previous candidate you already tried at that level, skip it — that branch would produce subsets you have already produced.',
        'The skip condition compares against the previous candidate at the SAME level, not against the previously chosen element. Getting that wrong either produces duplicates or drops legitimate subsets like [2, 2].',
      ],
      brute: {
        name: 'Generate Everything, Then Deduplicate',
        summary: 'Enumerate all 2^n position-based subsets, canonicalise each, and keep the distinct ones.',
        intuition:
          'Ignore the duplication while generating: enumerate every subset of POSITIONS, which is the previous problem, then sort each subset and discard the repeats by keying on their contents.\n\nCorrect and easy to trust, which is why it is the reference. The cost is that it always does the full two-to-the-n work even when the answer is far smaller — for ten identical values it generates 1024 subsets to return 11. It also needs a canonical key for each subset to detect the repeats, which is extra machinery the pruned version does not need at all.',
        steps: [
          'Sort the input.',
          'For each integer from 0 to 2^n - 1, build the subset of elements whose bit is set.',
          'Serialise each subset to a key and keep only the first occurrence of each key.',
          'Sort the distinct subsets by length and element by element.',
        ],
        js: 'function compareSubsets(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction subsetsWithDuplicates(nums) {\n  const values = nums.slice().sort((a, b) => a - b);\n  const seen = new Set();\n  const out = [];\n  const total = 1 << values.length;\n  for (let mask = 0; mask < total; mask++) {\n    const subset = [];\n    for (let i = 0; i < values.length; i++) {\n      if (mask & (1 << i)) subset.push(values[i]);\n    }\n    const key = subset.join(",");\n    if (!seen.has(key)) {\n      seen.add(key);\n      out.push(subset);\n    }\n  }\n  out.sort(compareSubsets);\n  return out;\n}',
        py: 'def subsets_with_duplicates(nums):\n    values = sorted(nums)\n    seen = set()\n    out = []\n    for mask in range(1 << len(values)):\n        subset = tuple(values[i] for i in range(len(values)) if mask & (1 << i))\n        if subset not in seen:\n            seen.add(subset)\n            out.append(list(subset))\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(2^N * N)',
        space: 'O(2^N * N)',
      },
      optimal: {
        name: 'Sort and Skip Equal Siblings',
        summary: 'Recurse over choices for each position, skipping a value equal to the previous one tried at that level.',
        intuition:
          'Sort the input so equal values are adjacent. Then restructure the recursion: instead of an include/exclude decision per index, each level loops over the candidates that could come next, and every prefix reached is itself a valid subset to record.\n\nThe pruning rule is the point. Within one level, trying the value 2 twice produces the same set of subsets both times — the two 2s are interchangeable. So skip a candidate when it equals the candidate tried immediately before it AT THAT LEVEL. Crucially this is not "skip if it equals the previously chosen element", which would forbid `[2, 2]` entirely; the check is about sibling branches, not about the path.\n\nThis is the first problem where the recursion decides whether to recurse rather than always doing both, and where the loop index carries information the path does not. Both ideas are load-bearing for combination problems in the next pattern.',
        steps: [
          'Sort the input so equal values are adjacent.',
          'Recurse with a start index and a running path, recording a copy of the path on entry.',
          'Loop the candidate index from the start index to the end.',
          'Skip a candidate whose value equals the value at the previous candidate index in this same loop.',
          'Otherwise append it, recurse from the next index, then remove it before trying the next candidate.',
        ],
        js: 'function compareSubsets(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction walkSubsets(values, start, path, out) {\n  out.push(path.slice());\n  for (let i = start; i < values.length; i++) {\n    if (i > start && values[i] === values[i - 1]) continue;\n    path.push(values[i]);\n    walkSubsets(values, i + 1, path, out);\n    path.pop();\n  }\n}\n\nfunction subsetsWithDuplicates(nums) {\n  const values = nums.slice().sort((a, b) => a - b);\n  const out = [];\n  walkSubsets(values, 0, [], out);\n  out.sort(compareSubsets);\n  return out;\n}',
        // Built by extending only the subsets added on the previous round when a value repeats,
        // which is the iterative counterpart of the sibling-skip rule. Different construction,
        // same answer.
        py: 'def subsets_with_duplicates(nums):\n    values = sorted(nums)\n    out = [[]]\n    start = 0\n    for i, value in enumerate(values):\n        first = start if i > 0 and value == values[i - 1] else 0\n        start = len(out)\n        for j in range(first, start):\n            out.append(out[j] + [value])\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(2^N * N)',
        space: 'O(2^N * N)',
      },
      examples: [
        { payload: { nums: [1, 2, 2] }, expect: [[], [1], [2], [1, 2], [2, 2], [1, 2, 2]], explanation: 'Six distinct subsets, not eight. Taking either single 2 gives the same subset, so one branch is pruned.' },
        { payload: { nums: [1, 2, 3] }, expect: [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]], explanation: 'With no duplicates the pruning never fires and the answer matches the previous problem.' },
        { payload: { nums: [2, 2, 2] }, expect: [[], [2], [2, 2], [2, 2, 2]], explanation: 'All identical, so only four distinct subsets exist rather than eight. Note [2,2] and [2,2,2] must be present — a pruning rule that compared against the chosen element instead of the sibling would drop them.' },
        { payload: { nums: [2, 1, 2] }, expect: [[], [1], [2], [1, 2], [2, 2], [1, 2, 2]], explanation: 'The duplicates are not adjacent in the input, which is why sorting first is a precondition of the pruning rule.' },
      ],
      cases: [
        { payload: { nums: [5] }, label: 'single element, no duplicates possible' },
        { payload: { nums: [4, 4] }, label: 'two identical values give three subsets' },
        { payload: { nums: [0, 0, 0, 0] }, label: 'four identical zeros give five subsets' },
        { payload: { nums: [1, 1, 2, 2] }, label: 'two separate duplicate groups' },
        { payload: { nums: [3, 1, 3, 1] }, label: 'two interleaved duplicate groups, unsorted input' },
        { payload: { nums: [-1, -1, 2] }, label: 'duplicated negative value' },
        { payload: { nums: [1, 2, 2, 3, 3, 3] }, label: 'groups of size one, two and three' },
        { payload: { nums: [100, 100, -100, -100] }, label: 'constraint boundaries, both duplicated' },
        { payload: { nums: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }, label: 'ten identical values give eleven subsets, where the brute force does 1024 units of work' },
        { payload: { nums: [1, 2, 3, 4, 5, 5] }, label: 'mostly distinct with one duplicated pair' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 1 && p.nums.length <= 10 ? true : 'nums must hold 1..10 elements'),
    },

    // =======================================================================
    {
      slug: 'count-subsets-with-target-sum',
      title: 'Count Subsets With a Target Sum',
      difficulty: 'Medium',
      tags: ['recursion', 'subsets', 'counting', 'knapsack-precursor'],
      description:
        'Given an array `nums` and an integer `target`, return how many subsets of `nums` have elements summing to exactly `target`. The empty subset sums to zero, so it counts when the target is zero.\n\nSubsets are counted by position, so if two elements have the same value they still give two different subsets. `[1, 1]` with target 1 has two answers, not one.\n\nThis is the same decision tree as the previous two problems with the enumeration removed — and that removal is the whole point. A count can be memoised because two different paths reaching the same index with the same remaining target have the same number of completions. A list of subsets cannot, because the answers themselves differ.',
      analogy:
        'Counting how many ways to settle a bill exactly, using each note on the table at most once, without writing out the combinations. You do not need the list to know how many there are, and that is what makes the question cheap.',
      constraints: [
        '1 <= nums.length <= 20',
        '-100 <= nums[i] <= 100',
        '-2000 <= target <= 2000',
      ],
      edgeCases: [
        'A target of zero, which the empty subset always satisfies',
        'No subset reaching the target, so the answer is 0',
        'Duplicate values, which produce separate subsets and must not be deduplicated',
        'Negative values, which mean the running sum can decrease and no early cutoff on overshoot is valid',
        'A target reachable only by taking every element',
      ],
      hints: [
        'The same include/exclude tree as before: at each index, count the completions that take the element plus the completions that skip it.',
        'The base case is running past the last index. At that point the path is complete, so return 1 if the accumulated sum equals the target and 0 otherwise.',
        'Do not deduplicate. Two equal values at different positions are different subsets, so [1,1] with target 1 answers 2.',
        'Resist adding a cutoff for "the running sum already exceeds the target". With negative values allowed, a sum that overshoots can come back down.',
      ],
      brute: {
        name: 'Enumerate and Filter',
        summary: 'Build every subset with a bitmask, sum each one, and count the matches.',
        intuition:
          'The most direct possible reading: produce all two-to-the-n subsets, add each up, count those that hit the target. Nothing subtle, and it is the right cross-check because the answer is a single number where an off-by-one in a recursion is otherwise invisible.\n\nIt makes the cost explicit too. It builds every subset in order to throw almost all of them away, which is exactly what the counting recursion avoids — and what makes the counting version memoisable while this one is not.',
        steps: [
          'For each integer from 0 to 2^n - 1, treat its bits as an include/exclude choice.',
          'Sum the selected elements.',
          'Increment a counter when the sum equals the target.',
          'Return the counter.',
        ],
        js: 'function countSubsetsWithSum(nums, target) {\n  let found = 0;\n  const total = 1 << nums.length;\n  for (let mask = 0; mask < total; mask++) {\n    let sum = 0;\n    for (let i = 0; i < nums.length; i++) {\n      if (mask & (1 << i)) sum += nums[i];\n    }\n    if (sum === target) found += 1;\n  }\n  return found;\n}',
        py: 'def count_subsets_with_sum(nums, target):\n    found = 0\n    for mask in range(1 << len(nums)):\n        total = 0\n        for i, value in enumerate(nums):\n            if mask & (1 << i):\n                total += value\n        if total == target:\n            found += 1\n    return found',
        time: 'O(2^N * N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Count Completions Recursively',
        summary: 'Return the number of completions from each state, summing the take and skip branches.',
        intuition:
          'Change what the recursion returns. Instead of collecting subsets into a shared list, each call answers a question about its own subtree: how many ways are there to reach the target from this index with this much already accumulated? The answer is the take-branch count plus the skip-branch count, and the base case at the end of the array returns 1 or 0.\n\nThat reformulation is the single most important step in this pattern, because it makes the problem have overlapping subproblems. Two different sets of earlier choices that arrive at index 7 with 12 still needed have identical futures, so the answer for that state could be computed once and reused. Enumeration has no such structure — the subsets themselves differ, so nothing can be shared.\n\nStage 12 turns exactly this recursion into a table. The equal-partition problem there is this function with the recursion replaced by a loop over reachable sums, which is why the two are paired across the milestone.\n\nOne thing NOT to add: a cutoff when the running sum passes the target. It is tempting and it is wrong here, because negative values mean an overshooting sum can come back down.',
        steps: [
          'Recurse with an index and the sum accumulated so far.',
          'When the index passes the last element, return 1 if the sum equals the target, else 0.',
          'Otherwise return the count from including the element plus the count from skipping it.',
          'Return the value from the top-level call.',
        ],
        js: 'function completions(nums, index, sum, target) {\n  if (index === nums.length) return sum === target ? 1 : 0;\n  const taking = completions(nums, index + 1, sum + nums[index], target);\n  const skipping = completions(nums, index + 1, sum, target);\n  return taking + skipping;\n}\n\nfunction countSubsetsWithSum(nums, target) {\n  return completions(nums, 0, 0, target);\n}',
        // A different construction: carry a map from reachable sum to the number of ways of
        // reaching it, and fold one element in at a time. Same recurrence, no recursion, so
        // agreement with the JavaScript version is real evidence.
        py: 'def count_subsets_with_sum(nums, target):\n    ways = {0: 1}\n    for value in nums:\n        nxt = dict(ways)\n        for reached, count in ways.items():\n            nxt[reached + value] = nxt.get(reached + value, 0) + count\n        ways = nxt\n    return ways.get(target, 0)',
        time: 'O(2^N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [1, 2, 3], target: 3 }, expect: 2, explanation: 'Both [3] and [1,2] sum to 3, so the answer is 2.' },
        { payload: { nums: [1, 1], target: 1 }, expect: 2, explanation: 'The two 1s are at different positions, so they are different subsets. Deduplicating by value would wrongly return 1.' },
        { payload: { nums: [5], target: 0 }, expect: 1, explanation: 'The empty subset sums to zero, so a target of zero always has at least this one answer.' },
        { payload: { nums: [2, 4], target: 7 }, expect: 0, explanation: 'No subset reaches 7, so the answer is 0.' },
      ],
      cases: [
        { payload: { nums: [1], target: 1 }, label: 'single element matching the target' },
        { payload: { nums: [1], target: 2 }, label: 'single element, unreachable target' },
        { payload: { nums: [0], target: 0 }, label: 'a zero element gives two subsets summing to zero' },
        { payload: { nums: [0, 0, 0], target: 0 }, label: 'three zeros give all eight subsets summing to zero' },
        { payload: { nums: [3, 3, 3], target: 6 }, label: 'duplicates give three distinct position-based subsets' },
        { payload: { nums: [-1, 1], target: 0 }, label: 'negative and positive cancelling, plus the empty subset' },
        { payload: { nums: [-2, -3, 5], target: 0 }, label: 'a sum that overshoots then returns, which defeats an early cutoff' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 15 }, label: 'reachable only by taking every element' },
        { payload: { nums: [1, 2, 3, 4, 5], target: 5 }, label: 'several different-sized subsets reach the target' },
        { payload: { nums: [100, -100, 100, -100], target: 0 }, label: 'constraint boundaries with heavy cancellation' },
        { payload: { nums: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], target: 5 }, label: 'ten identical values, so the answer is the binomial coefficient 252' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1 || p.nums.length > 20) return 'nums must hold 1..20 elements';
        if (!Number.isInteger(p.target)) return 'target must be an integer';
        return true;
      },
    },
  ],
};
