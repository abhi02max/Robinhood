/**
 * Recursion -> Backtracking With Restore.
 *
 * The previous pattern introduced the include/exclude tree and the need to undo a choice before
 * taking the next branch. This pattern is about that undo becoming the whole difficulty: the path
 * is shared mutable state, and every branch has to leave it exactly as it found it.
 *
 * Two problems, chosen to vary what is being branched over:
 *
 *   combination sum       branches over the ARRAY, with reuse allowed, so the recursion can stay
 *                         on the same index and the termination argument is about the remaining
 *                         target rather than about running out of elements
 *   letter combinations   branches over a MAPPING rather than over the input, and returns strings,
 *                         which keeps the pattern reachable in C
 *
 * The second is flat-signatured deliberately. Combination sum returns vector<vector<int>>, which C
 * cannot express, so without a string-returning partner the whole pattern would be closed to a C
 * learner. Letter combinations is a canonical backtracking problem in its own right and was not
 * chosen to game the language count.
 *
 * TESTS FOR STATE LEAKAGE
 * -----------------------
 * The bug this pattern exists to teach is forgetting to restore. Both problems have hidden cases
 * with several viable branches at the same level, because a missing undo only shows up when a later
 * sibling inherits state from an earlier one — an input with a single path through the tree passes
 * happily with no restoration at all.
 */
export default {
  topic: 'recursion',
  pattern: 'backtracking-with-restore',
  problems: [
    // =======================================================================
    {
      slug: 'combinations-summing-to-target',
      title: 'Combinations Summing to a Target',
      difficulty: 'Medium',
      tags: ['recursion', 'backtracking', 'combinations', 'state-restoration'],
      description:
        'Given an array `candidates` of distinct positive integers and a positive integer `target`, return every combination of candidates that sums to exactly `target`. The same candidate may be used any number of times, and two combinations are different only if they use different multiplicities — so `[2, 3]` and `[3, 2]` are the same combination and only one of them may appear.\n\n**Output ordering.** Each combination must be listed in non-decreasing order, and the outer list must be sorted by length first, then compared element by element. Combinations have no natural order, so the ordering is part of the specification.',
      analogy:
        'Making up an exact postage amount from an unlimited supply of a few stamp denominations. You can use as many of each as you like, and a handful of stamps is the same handful however you arrange it on the envelope.',
      constraints: [
        '1 <= candidates.length <= 8',
        '2 <= candidates[i] <= 40',
        'all values in candidates are distinct',
        '1 <= target <= 40',
      ],
      edgeCases: [
        'No combination reaches the target, so the answer is an empty list',
        'A candidate equal to the target, giving a one-element combination',
        'A single candidate that divides the target, giving one combination of repeats',
        'A target smaller than every candidate, which admits nothing',
        'Several combinations of the same length, where the element-by-element ordering decides',
      ],
      hints: [
        'Sort the candidates first. Then a combination built by only ever moving forward is automatically non-decreasing, and you never produce a reordering of one you have already found.',
        'Recurse with a start index and the amount still needed. Because reuse is allowed, recursing on the SAME index rather than the next one is what permits repeats.',
        'Two base cases: the remaining amount hits zero, which means record a copy of the path; or it goes below zero, which means abandon this branch.',
        'After the recursive call returns, remove the value you appended. If you forget, the next candidate at that level starts from a path that already contains the previous one.',
      ],
      brute: {
        name: 'Bounded Multiplicity Enumeration',
        summary: 'Work out the maximum useful count of each candidate, then try every combination of counts.',
        intuition:
          'Reframe the problem as choosing a multiplicity for each candidate. Candidate `c` can appear at most `target / c` times, so the search space is a product of small ranges and can be walked with a plain nested enumeration over count vectors — no path to maintain and therefore nothing to restore.\n\nThat is exactly why it makes a good reference. Its correctness does not depend on getting an undo right, so if the backtracking version disagrees with it the fault is in the backtracking. The cost is that it explores count vectors that overshoot the target long before the last candidate is even considered, doing work the pruned recursion skips.',
        steps: [
          'Sort the candidates.',
          'For each candidate compute the maximum number of copies that could fit in the target.',
          'Enumerate every vector of counts within those bounds.',
          'Keep the vectors whose weighted sum equals the target, expanding each into a combination.',
          'Sort the result by length and then element by element.',
        ],
        js: 'function compareLists(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction enumerateCounts(values, target, index, counts, out) {\n  if (index === values.length) {\n    let sum = 0;\n    for (let i = 0; i < values.length; i++) sum += values[i] * counts[i];\n    if (sum !== target) return;\n    const combo = [];\n    for (let i = 0; i < values.length; i++) {\n      for (let k = 0; k < counts[i]; k++) combo.push(values[i]);\n    }\n    out.push(combo);\n    return;\n  }\n  const most = Math.floor(target / values[index]);\n  for (let c = 0; c <= most; c++) {\n    counts[index] = c;\n    enumerateCounts(values, target, index + 1, counts, out);\n  }\n  counts[index] = 0;\n}\n\nfunction combinationSum(candidates, target) {\n  const values = candidates.slice().sort((a, b) => a - b);\n  const out = [];\n  enumerateCounts(values, target, 0, new Array(values.length).fill(0), out);\n  out.sort(compareLists);\n  return out;\n}',
        py: 'def combination_sum(candidates, target):\n    values = sorted(candidates)\n    out = []\n\n    def walk(index, counts):\n        if index == len(values):\n            total = sum(v * c for v, c in zip(values, counts))\n            if total == target:\n                combo = []\n                for v, c in zip(values, counts):\n                    combo.extend([v] * c)\n                out.append(combo)\n            return\n        most = target // values[index]\n        for c in range(most + 1):\n            walk(index + 1, counts + [c])\n\n    walk(0, [])\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(product of target/c over all candidates)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Backtracking With an Explicit Undo',
        summary: 'Append a candidate, recurse on the reduced target, then remove it before trying the next.',
        intuition:
          'Keep one shared path array and one number, the amount still needed. At each level, loop over the candidates from the current start index onwards: append the candidate, recurse with the target reduced by it, then remove it. Because reuse is allowed the recursion passes the SAME index rather than the next one, and because it never moves backwards each combination is generated in non-decreasing order exactly once.\n\nThe undo is the load-bearing line. The path is shared across every branch, so after the recursive call returns it has to be back to what it was or the next candidate at this level inherits the previous candidate\'s choice. That failure is invisible on inputs where only one branch ever succeeds, which is why the hidden cases include targets with several viable combinations of the same length.\n\nSorting first buys the other half. It makes each path non-decreasing for free, and it means that once a candidate exceeds the remaining target every later candidate does too — so the loop can stop rather than continue. That is the pruning the count-vector enumeration cannot express.',
        steps: [
          'Sort the candidates ascending.',
          'Recurse with a start index, the remaining target, and a shared path.',
          'When the remaining target is zero, record a copy of the path and return.',
          'Loop candidates from the start index; stop early once a candidate exceeds the remaining target.',
          'Append the candidate, recurse with the same index and the reduced target, then remove it.',
          'Sort the collected combinations by length and element by element.',
        ],
        js: 'function compareLists(a, b) {\n  if (a.length !== b.length) return a.length - b.length;\n  for (let i = 0; i < a.length; i++) {\n    if (a[i] !== b[i]) return a[i] - b[i];\n  }\n  return 0;\n}\n\nfunction buildCombinations(values, start, remaining, path, out) {\n  if (remaining === 0) {\n    out.push(path.slice());\n    return;\n  }\n  for (let i = start; i < values.length; i++) {\n    if (values[i] > remaining) break;\n    path.push(values[i]);\n    buildCombinations(values, i, remaining - values[i], path, out);\n    path.pop();\n  }\n}\n\nfunction combinationSum(candidates, target) {\n  const values = candidates.slice().sort((a, b) => a - b);\n  const out = [];\n  buildCombinations(values, 0, target, [], out);\n  out.sort(compareLists);\n  return out;\n}',
        // A different construction: build up combinations reachable at each total, so a
        // combination for total t extends one for t - value. No shared mutable path and
        // therefore no undo at all, which makes agreement with the backtracking version
        // meaningful evidence rather than a transcription.
        py: 'def combination_sum(candidates, target):\n    values = sorted(candidates)\n    reachable = {0: [[]]}\n    for total in range(1, target + 1):\n        found = []\n        for value in values:\n            if value > total:\n                break\n            for combo in reachable.get(total - value, []):\n                if combo and combo[-1] > value:\n                    continue\n                found.append(combo + [value])\n        reachable[total] = found\n    out = [list(c) for c in reachable.get(target, [])]\n    out.sort(key=lambda s: (len(s), s))\n    return out',
        time: 'O(N^(target/min) )',
        space: 'O(target/min)',
      },
      examples: [
        { payload: { candidates: [2, 3, 6, 7], target: 7 }, expect: [[7], [2, 2, 3]], explanation: 'Two combinations reach 7. They are ordered by length, so the single 7 comes before the three-element one.' },
        { payload: { candidates: [2, 3, 5], target: 8 }, expect: [[3, 5], [2, 3, 3], [2, 2, 2, 2]], explanation: 'Three combinations of lengths two, three and four. Several viable branches at the same level means a missing undo would corrupt the later ones.' },
        { payload: { candidates: [2], target: 1 }, expect: [], explanation: 'The target is smaller than the only candidate, so nothing reaches it and the answer is empty.' },
        { payload: { candidates: [3], target: 9 }, expect: [[3, 3, 3]], explanation: 'A single candidate dividing the target gives exactly one combination, made of repeats — which is only possible because the recursion may reuse the same index.' },
      ],
      cases: [
        { payload: { candidates: [2], target: 2 }, label: 'candidate equals the target' },
        { payload: { candidates: [5], target: 4 }, label: 'target below the only candidate, empty answer' },
        { payload: { candidates: [2, 4], target: 3 }, label: 'no combination reaches an odd target from even candidates' },
        { payload: { candidates: [2, 3], target: 6 }, label: 'two combinations of different lengths' },
        { payload: { candidates: [2, 3, 4], target: 6 }, label: 'four viable branches at the top level, so a missing undo corrupts later siblings' },
        { payload: { candidates: [7, 3, 2], target: 9 }, label: 'unsorted candidates, which the sort must normalise' },
        { payload: { candidates: [40], target: 40 }, label: 'constraint ceiling, single candidate' },
        { payload: { candidates: [2], target: 40 }, label: 'twenty repeats of one candidate, the longest path' },
        { payload: { candidates: [2, 3, 5, 7, 11, 13, 17, 19], target: 20 }, label: 'eight candidates with many combinations, the heaviest branching case' },
        { payload: { candidates: [4, 6, 8], target: 7 }, label: 'all candidates even, odd target, empty answer' },
        { payload: { candidates: [3, 5], target: 11 }, label: 'reachable only as 3 + 3 + 5' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.candidates) || p.candidates.length < 1 || p.candidates.length > 8) return 'candidates must hold 1..8 values';
        if (new Set(p.candidates).size !== p.candidates.length) return 'candidates must be distinct';
        if (!p.candidates.every((v) => Number.isInteger(v) && v >= 2 && v <= 40)) return 'each candidate must be an integer in 2..40';
        if (!(Number.isInteger(p.target) && p.target >= 1 && p.target <= 40)) return 'target must be an integer in 1..40';
        return true;
      },
    },

    // =======================================================================
    {
      slug: 'phone-keypad-letter-combinations',
      title: 'Phone Keypad Letter Combinations',
      difficulty: 'Medium',
      tags: ['recursion', 'backtracking', 'strings', 'cartesian-product'],
      description:
        'On a traditional telephone keypad each digit from 2 to 9 carries a group of letters: 2 is `abc`, 3 is `def`, 4 is `ghi`, 5 is `jkl`, 6 is `mno`, 7 is `pqrs`, 8 is `tuv`, and 9 is `wxyz`.\n\nGiven a string `digits` containing only the characters 2 to 9, return every letter string it could spell, choosing one letter per digit in order.\n\nAn empty input spells nothing, so the answer is an empty list rather than a list holding the empty string.\n\n**Output ordering.** Lexicographic. This is also what a straightforward recursion produces if the letters of each digit are tried in the order given above, so the ordering costs nothing to satisfy.',
      analogy:
        'Reading out a phone number to someone who only knows the letters printed on the buttons. Each button they hear narrows the next character to one of three or four, and the set of words they might write down is every path through those choices.',
      constraints: [
        '0 <= digits.length <= 4',
        'digits contains only the characters 2 through 9',
      ],
      edgeCases: [
        'An empty input, whose answer is an empty list and NOT a list containing the empty string',
        'A single digit, giving one string per letter on that button',
        'A digit with four letters, 7 or 9, rather than three',
        'Repeated digits, where the same letter group is branched over more than once',
        'The maximum length of four, all fours letters, giving 256 strings',
      ],
      hints: [
        'Map each digit character to its letters once, up front. The recursion then only deals with positions.',
        'Recurse on the index into the digit string. At each level, loop over the letters of that digit, append one, recurse, then remove it.',
        'The base case is reaching the end of the digit string: the accumulated path is one complete answer.',
        'Handle the empty input before you start. An empty digit string reaches the base case immediately and would otherwise record the empty string as an answer.',
      ],
      brute: {
        name: 'Iterative Product Expansion',
        summary: 'Start with one empty prefix and extend every prefix by every letter of the next digit.',
        intuition:
          'The answer is the Cartesian product of the letter groups, so build it a digit at a time: hold the list of prefixes for the digits consumed so far, and replace it with every prefix extended by every letter of the next digit. No recursion, no shared state, nothing to restore.\n\nThat absence is precisely why it is the reference. It cannot fail through a missing undo, so if the backtracking version disagrees with it the fault is definitely in the backtracking. It also allocates a new list at every step where the recursion reuses one buffer, which is the trade the recursive version is making.',
        steps: [
          'Return an empty list immediately when the input is empty.',
          'Start with a list containing just the empty prefix.',
          'For each digit, replace the list with every prefix extended by every letter of that digit.',
          'Return the final list.',
        ],
        js: 'function letterCombinations(digits) {\n  if (digits.length === 0) return [];\n  const keypad = { 2: "abc", 3: "def", 4: "ghi", 5: "jkl", 6: "mno", 7: "pqrs", 8: "tuv", 9: "wxyz" };\n  let prefixes = [""];\n  for (const digit of digits) {\n    const next = [];\n    for (const prefix of prefixes) {\n      for (const letter of keypad[digit]) next.push(prefix + letter);\n    }\n    prefixes = next;\n  }\n  return prefixes;\n}',
        py: 'def letter_combinations(digits):\n    if not digits:\n        return []\n    keypad = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}\n    prefixes = [""]\n    for digit in digits:\n        prefixes = [prefix + letter for prefix in prefixes for letter in keypad[digit]]\n    return prefixes',
        time: 'O(4^N * N)',
        space: 'O(4^N * N)',
      },
      optimal: {
        name: 'Backtracking Over the Mapping',
        summary: 'Walk the digit string, appending one letter per level and removing it after recursing.',
        intuition:
          'The branching factor comes from the keypad rather than from the input array, which is the difference from every previous problem in this topic. The path is a buffer of chosen letters, one per digit consumed, and the recursion index says which digit is next.\n\nThe undo is the same discipline as combination sum and it is easier to see here because the path is a fixed length: at level `i` the buffer always holds exactly `i` letters, so failing to remove the appended letter makes the buffer grow past the digit count and the recorded strings come out too long. That is a loud failure rather than a subtle one, which is why this is the better of the two problems to meet the idea on.\n\nThe empty-input case is worth handling explicitly rather than falling out of the recursion. With no digits the base case fires immediately and records the empty string, giving a one-element answer where the correct answer has none.',
        steps: [
          'Return an empty list when the digit string is empty.',
          'Build the digit-to-letters mapping once.',
          'Recurse with an index into the digit string and a buffer of chosen letters.',
          'At the end of the string, join the buffer and record it.',
          'Otherwise loop the letters of the current digit: append, recurse on the next index, remove.',
        ],
        js: 'function walkKeypad(digits, keypad, index, buffer, out) {\n  if (index === digits.length) {\n    out.push(buffer.join(""));\n    return;\n  }\n  for (const letter of keypad[digits[index]]) {\n    buffer.push(letter);\n    walkKeypad(digits, keypad, index + 1, buffer, out);\n    buffer.pop();\n  }\n}\n\nfunction letterCombinations(digits) {\n  if (digits.length === 0) return [];\n  const keypad = { 2: "abc", 3: "def", 4: "ghi", 5: "jkl", 6: "mno", 7: "pqrs", 8: "tuv", 9: "wxyz" };\n  const out = [];\n  walkKeypad(digits, keypad, 0, [], out);\n  return out;\n}',
        // A different construction: index arithmetic over the product size, treating the answer
        // number as a mixed-radix numeral across the digit groups. No recursion and no path, so
        // agreement with the backtracking version is real evidence.
        py: 'def letter_combinations(digits):\n    if not digits:\n        return []\n    keypad = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}\n    groups = [keypad[d] for d in digits]\n    total = 1\n    for group in groups:\n        total *= len(group)\n    out = []\n    for n in range(total):\n        rest = n\n        chars = []\n        for group in reversed(groups):\n            rest, pick = divmod(rest, len(group))\n            chars.append(group[pick])\n        out.append("".join(reversed(chars)))\n    return out',
        time: 'O(4^N * N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { digits: '23' }, expect: ['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf'], explanation: 'Three letters on 2 times three on 3 gives nine strings, in lexicographic order because each group is tried in printed order.' },
        { payload: { digits: '' }, expect: [], explanation: 'No digits spell nothing. The answer is an empty list, not a list containing the empty string — which is what an unguarded recursion would produce.' },
        { payload: { digits: '2' }, expect: ['a', 'b', 'c'], explanation: 'A single digit gives one string per letter on that button.' },
        { payload: { digits: '7' }, expect: ['p', 'q', 'r', 's'], explanation: 'The 7 button carries four letters rather than three, so the branching factor is not constant across digits.' },
      ],
      cases: [
        { payload: { digits: '9' }, label: 'the other four-letter button' },
        { payload: { digits: '22' }, label: 'a repeated digit, branching over the same group twice' },
        { payload: { digits: '79' }, label: 'two four-letter buttons, sixteen strings' },
        { payload: { digits: '234' }, label: 'twenty-seven strings from three three-letter buttons' },
        { payload: { digits: '279' }, label: 'mixed branching factors, forty-eight strings' },
        { payload: { digits: '999' }, label: 'the same four-letter group three times, sixty-four strings' },
        { payload: { digits: '2345' }, label: 'maximum length with three-letter buttons, eighty-one strings' },
        { payload: { digits: '7979' }, label: 'maximum length, all four-letter buttons, 256 strings' },
        { payload: { digits: '8' }, label: 'a three-letter button in the middle of the keypad' },
        { payload: { digits: '56' }, label: 'two adjacent three-letter buttons' },
      ],
      assume: (p) => {
        if (typeof p.digits !== 'string') return 'digits must be a string';
        if (p.digits.length > 4) return 'digits must be at most 4 characters';
        if (!/^[2-9]*$/.test(p.digits)) return 'digits may contain only the characters 2 through 9';
        return true;
      },
    },
  ],
};
