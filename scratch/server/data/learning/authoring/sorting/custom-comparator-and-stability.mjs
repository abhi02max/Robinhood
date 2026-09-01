/**
 * Sorting -> Custom Comparators & Stability.
 *
 * This is the pattern the rest of the curriculum actually depends on. Greedy and interval problems
 * are almost all "sort by the right key, then scan once", and the 3A.0 audit found this pattern
 * empty while greedy/interval-scheduling — which is a specialisation of it — already held four
 * problems.
 *
 * Two problems, chosen because they fail in different ways:
 *
 *   frequency sort         the key is DERIVED from the data rather than being the data, and the
 *                          tie-break has to be stated or the answer is not unique
 *   largest concatenation  the comparator is not a numeric comparison at all, and "sort
 *                          descending" is confidently wrong
 *
 * The second is the one worth the effort. Every learner's first instinct is to sort the numbers in
 * descending order, and it produces the wrong answer on inputs as small as [3, 30].
 */
export default {
  topic: 'sorting',
  pattern: 'custom-comparator-and-stability',
  problems: [
    // =======================================================================
    {
      slug: 'sort-by-frequency-then-value',
      title: 'Sort by Frequency, Then by Value',
      difficulty: 'Medium',
      tags: ['sorting', 'custom-comparator', 'frequency-counter', 'tie-breaking'],
      description:
        'Given an array `nums`, return its values sorted so that values occurring more often come first. Values occurring equally often are ordered by increasing numeric value.\n\nEvery occurrence is kept, so the output has the same length as the input. A value appearing three times contributes three copies, all adjacent.\n\nThe tie-break is part of the specification rather than a detail: without it the answer would not be unique, and a grader comparing exact output could not accept a correct solution. Stating the full ordering is what makes a comparator problem well posed.',
      analogy:
        'Arranging a shop\'s shelves by what sells most. Best sellers go at the front, and when two lines sell identically you fall back on a fixed rule — catalogue number — so that two people stocking the shelves independently produce the same layout.',
      constraints: [
        '1 <= nums.length <= 10^4',
        '-10^4 <= nums[i] <= 10^4',
      ],
      edgeCases: [
        'A single element',
        'All values distinct, so every frequency is one and the output is simply sorted ascending',
        'All values identical, so the output is the input',
        'Two different values with the same frequency, which is where the tie-break decides',
        'Negative values, which must order by numeric value and not by absolute value or by text',
      ],
      hints: [
        'Count occurrences first. A map from value to count is enough, and it can be built in one pass.',
        'Sort the distinct values by count descending. When two counts are equal, order by the value itself ascending.',
        'Then expand: emit each distinct value as many times as it occurred. Sorting the original array element by element with the same comparator also works, and is a good way to see why a stable sort matters when the key is derived.',
      ],
      brute: {
        name: 'Count by Rescanning',
        summary: 'For each element, count its occurrences by scanning the whole array, then sort with that.',
        intuition:
          'Skip the map: to know how often a value occurs, look. For each element, walk the array and tally the matches, then sort using the tally as the primary key and the value as the secondary.\n\nThe result is right and the cost is not. Every element triggers a full scan, so building the keys is quadratic before any sorting happens — around 10^8 comparisons at the constraint ceiling. It is worth writing because it separates the two ideas cleanly: the counting is one problem and the ordering is another, and only the counting needs improving.',
        steps: [
          'For each element, scan the array and count how many times it appears.',
          'Pair each element with its count.',
          'Sort the pairs by count descending, then by value ascending.',
          'Return the values from the sorted pairs.',
        ],
        js: 'function frequencySort(nums) {\n  const withCounts = nums.map((value) => {\n    let count = 0;\n    for (const other of nums) {\n      if (other === value) count += 1;\n    }\n    return { value, count };\n  });\n  withCounts.sort((a, b) => (b.count - a.count) || (a.value - b.value));\n  return withCounts.map((entry) => entry.value);\n}',
        py: 'def frequency_sort(nums):\n    pairs = []\n    for value in nums:\n        count = 0\n        for other in nums:\n            if other == value:\n                count += 1\n        pairs.append((value, count))\n    pairs.sort(key=lambda pair: (-pair[1], pair[0]))\n    return [pair[0] for pair in pairs]',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Count Once, Then Sort Distinct Values',
        summary: 'Build a frequency map in one pass, sort the distinct values, then expand each by its count.',
        intuition:
          'Counting and ordering are separate concerns. One pass builds a map from value to count. Then only the DISTINCT values need sorting, which is at most as many as the input and usually far fewer, and the comparator reads both keys straight from the map.\n\nExpanding afterwards is what keeps the output stable-looking without relying on the sort being stable: all copies of a value are emitted together by construction, so there is no question of equal elements changing relative order.\n\nThe comparator itself is the transferable part. `(b.count - a.count) || (a.value - b.value)` is the standard shape for a multi-key ordering — compare the primary key, and only if it ties fall through to the next. Getting the sign right on each key separately is easier than reasoning about a single combined expression, and it is why the descending key subtracts in the opposite order from the ascending one.',
        steps: [
          'Walk the array once, incrementing a count per distinct value.',
          'Collect the distinct values.',
          'Sort them by count descending, falling back to value ascending on a tie.',
          'Emit each value as many times as its count, in that order.',
        ],
        js: 'function frequencySort(nums) {\n  const counts = new Map();\n  for (const value of nums) counts.set(value, (counts.get(value) || 0) + 1);\n  const distinct = [...counts.keys()];\n  distinct.sort((a, b) => (counts.get(b) - counts.get(a)) || (a - b));\n  const out = [];\n  for (const value of distinct) {\n    for (let i = 0; i < counts.get(value); i++) out.push(value);\n  }\n  return out;\n}',
        py: 'def frequency_sort(nums):\n    counts = {}\n    for value in nums:\n        counts[value] = counts.get(value, 0) + 1\n    out = []\n    for value in sorted(counts, key=lambda v: (-counts[v], v)):\n        out.extend([value] * counts[value])\n    return out',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [1, 1, 2, 2, 2, 3] }, expect: [2, 2, 2, 1, 1, 3], explanation: 'The 2s occur three times so they lead, then the 1s twice, then the single 3.' },
        { payload: { nums: [4, 5, 6] }, expect: [4, 5, 6], explanation: 'Every frequency is one, so the tie-break decides everything and the output is plain ascending order.' },
        { payload: { nums: [3, 1, 3, 1, 2 ] }, expect: [1, 1, 3, 3, 2], explanation: 'The 1s and 3s both occur twice, so the tie-break puts 1 before 3. Without a stated tie-break both orders would be defensible and the problem would be ungradable.' },
        { payload: { nums: [-1, -1, 5] }, expect: [-1, -1, 5], explanation: 'Negative values order by numeric value, not by magnitude or by text.' },
      ],
      cases: [
        { payload: { nums: [9] }, label: 'single element' },
        { payload: { nums: [7, 7, 7, 7] }, label: 'all identical' },
        { payload: { nums: [5, 4, 3, 2, 1] }, label: 'all distinct and reversed, so output is ascending' },
        { payload: { nums: [-3, -1, -2, -1, -3, -3] }, label: 'all negative with three different frequencies' },
        { payload: { nums: [10000, -10000, 10000, -10000] }, label: 'constraint boundaries tied on frequency' },
        { payload: { nums: [0, 0, 0, 1, 1, 2] }, label: 'strictly decreasing frequencies including zero as a value' },
        { payload: { nums: [1, 2, 3, 1, 2, 3, 1] }, label: 'a three-way tie broken by value, with one winner' },
        { payload: { nums: [2, 2, 1, 1, 3, 3, 4, 4] }, label: 'four values all tied, so the whole answer is the tie-break' },
        { payload: { nums: [-5, 5, -5, 5, -5] }, label: 'a negative value wins on frequency over a positive one' },
        { payload: { nums: [100, 100, 1, 1, 1, 50] }, label: 'the most frequent value is not the largest or the smallest' },
      ],
      assume: (p) => (Array.isArray(p.nums) && p.nums.length >= 1 ? true : 'nums must hold at least one element'),
    },

    // =======================================================================
    {
      slug: 'largest-number-from-concatenation',
      title: 'Largest Number From Concatenation',
      difficulty: 'Medium',
      tags: ['sorting', 'custom-comparator', 'string-comparison'],
      description:
        'Given a list of non-negative integers `nums`, arrange them in the order that makes the largest possible number when their decimal representations are joined end to end. Return that number as a **string**.\n\nReturning a string is not a convenience — the joined value can be hundreds of digits long and fits no integer type, so the answer genuinely is text.\n\nThe obvious rule, sort descending, is wrong. For `[3, 30]` it gives `"303"` while `"330"` is larger. The correct comparison asks which of two orderings of the same pair produces more: put `a` before `b` when the string `a + b` is greater than the string `b + a`.',
      analogy:
        'Choosing the order of digits on a scoreboard where you can only slot in pre-printed tiles. Comparing tiles by their printed number misleads you — what matters is which arrangement of two tiles reads higher when they sit side by side.',
      constraints: [
        '1 <= nums.length <= 100',
        '0 <= nums[i] <= 10^9',
      ],
      edgeCases: [
        'A single value, whose answer is just that value as text',
        'All values zero, whose answer must be "0" and not "000"',
        'A single zero among other values, which must be placed last',
        'Values that are prefixes of each other, such as 3 and 30, or 8 and 89',
        'Duplicate values, where either order gives the same result',
      ],
      hints: [
        'Compare candidates by what they produce, not by what they are. For two values a and b, which comes first depends on whether a+b or b+a is the larger string.',
        'String comparison already does the right thing here because both concatenations have the same length, so a plain lexicographic comparison of a+b against b+a decides it.',
        'After sorting, one special case remains: if the largest value is zero then every value is zero, and joining them gives a run of zeros. Return "0" instead.',
      ],
      brute: {
        name: 'Try Every Ordering',
        summary: 'Generate all permutations, join each one, and keep the largest result.',
        intuition:
          'The problem asks for the best arrangement, so enumerate the arrangements. It is obviously correct — it literally checks every candidate — and it is the only version whose correctness needs no argument at all, which makes it the right thing to validate the comparator against.\n\nIt is also unusable beyond about ten values, since the number of orderings is the factorial of the input size. That gap between "provably correct" and "usable" is the whole reason a comparator argument is worth making, and it is why the test cases include a small input where both approaches can be run and compared.',
        steps: [
          'Generate every permutation of the values.',
          'Join the values of each permutation into a string.',
          'Compare the joined strings by length first, then lexicographically, keeping the largest.',
          'Return the largest, collapsing an all-zero result to "0".',
        ],
        // The helper is top-level and declared BEFORE the entry function on purpose. The
        // entrypoint extractor takes the LAST top-level function it can see and knows nothing
        // about nesting, so a helper defined inside the entry function would be picked as the
        // entrypoint instead -- by this build and by the real grader alike.
        js: 'function bestOrdering(remaining, prefix, best) {\n  if (remaining.length === 0) {\n    if (best === null || prefix.length > best.length || (prefix.length === best.length && prefix > best)) return prefix;\n    return best;\n  }\n  let winner = best;\n  for (let i = 0; i < remaining.length; i++) {\n    const rest = remaining.slice(0, i).concat(remaining.slice(i + 1));\n    winner = bestOrdering(rest, prefix + remaining[i], winner);\n  }\n  return winner;\n}\n\nfunction largestConcatenation(nums) {\n  const texts = nums.map(String);\n  const best = bestOrdering(texts, "", null);\n  const trimmed = best.replace(/^0+/, "");\n  return trimmed === "" ? "0" : trimmed;\n}',
        py: 'from itertools import permutations\n\n\ndef largest_concatenation(nums):\n    texts = [str(v) for v in nums]\n    best = None\n    for order in permutations(texts):\n        joined = "".join(order)\n        if best is None or len(joined) > len(best) or (len(joined) == len(best) and joined > best):\n            best = joined\n    return best.lstrip("0") or "0"',
        time: 'O(N! * N)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Pairwise Concatenation Comparator',
        summary: 'Sort the values as strings, placing a before b when a+b beats b+a.',
        intuition:
          'The comparison to make is local: given two values, which order of just those two reads higher? Put `a` first when the string `a + b` is greater than `b + a`. That rule is a valid ordering — it is transitive, which is what licenses using it inside a sort — and sorting by it yields the globally best arrangement.\n\nWhy the string comparison is safe: `a + b` and `b + a` always have the same length, being the same digits in a different order, so lexicographic comparison and numeric comparison agree. That would not hold when comparing values of different lengths directly, which is exactly why sorting the numbers themselves fails.\n\nThe one case the comparator cannot handle is all zeros. Any arrangement gives "000...0", which is a correct concatenation but not a canonical number. Checking whether the leading value is zero catches the whole class at once — if the largest is zero, everything is.\n\nThe transferable lesson is that a comparator can encode any consistent preference, not just "bigger" or "smaller". Recognising when the natural key is not the data is what this pattern is for.',
        steps: [
          'Convert every value to its decimal string.',
          'Sort the strings with a comparator that puts a before b when a+b is greater than b+a.',
          'Join the sorted strings.',
          'If the result starts with a zero then every value was zero, so return "0".',
        ],
        js: 'function largestConcatenation(nums) {\n  const texts = nums.map(String);\n  texts.sort((a, b) => {\n    const ab = a + b;\n    const ba = b + a;\n    if (ab === ba) return 0;\n    return ab > ba ? -1 : 1;\n  });\n  if (texts[0] === "0") return "0";\n  return texts.join("");\n}',
        // A different mechanism from the JavaScript version: a key based on repeating each string
        // to a common length orders identically to the pairwise rule, so agreement between the two
        // is real evidence rather than a transcription.
        py: 'def largest_concatenation(nums):\n    texts = [str(v) for v in nums]\n    width = max(len(t) for t in texts) + 1\n    texts.sort(key=lambda t: (t * width)[:width], reverse=True)\n    if texts[0] == "0":\n        return "0"\n    return "".join(texts)',
        time: 'O(N log N * L)',
        space: 'O(N * L)',
      },
      examples: [
        { payload: { nums: [3, 30] }, expect: '330', explanation: 'Sorting numerically descending gives "303". The comparator asks whether "330" beats "303" and places 3 first, which is why the numeric sort is wrong.' },
        { payload: { nums: [3, 30, 34, 5, 9] }, expect: '9534330', explanation: 'The comparator orders 9, 5, 34, 3, 30 — note 34 before 3 and 3 before 30, neither of which follows from numeric order.' },
        { payload: { nums: [0, 0] }, expect: '0', explanation: 'Every value is zero. Joining gives "00", so the all-zero case must collapse to a single "0".' },
        { payload: { nums: [10, 2] }, expect: '210', explanation: '"210" beats "102". A descending numeric sort would put 10 first and produce the smaller answer.' },
      ],
      cases: [
        { payload: { nums: [1] }, label: 'single value' },
        { payload: { nums: [0] }, label: 'single zero' },
        { payload: { nums: [0, 0, 0, 0] }, label: 'all zeros must give "0", not "0000"' },
        { payload: { nums: [0, 1] }, label: 'a zero must be placed last' },
        { payload: { nums: [8, 89] }, label: 'prefix pair: "898" beats "888"... check which, the comparator decides' },
        { payload: { nums: [89, 8] }, label: 'the same pair given in the other order, so the answer must match' },
        { payload: { nums: [5, 5, 5] }, label: 'duplicates, where every order is equivalent' },
        { payload: { nums: [1, 10, 100, 1000] }, label: 'each value a prefix of the next, the worst case for numeric sorting' },
        { payload: { nums: [432, 43243] }, label: 'a long prefix overlap' },
        { payload: { nums: [1000000000, 999999999] }, label: 'constraint ceiling, where the shorter value wins' },
        { payload: { nums: [12, 121] }, label: 'classic ambiguous pair, "12121" against "12112"' },
        { payload: { nums: [7, 70, 77, 707, 770] }, label: 'five mutually overlapping prefixes' },
      ],
      assume: (p) => {
        if (!Array.isArray(p.nums) || p.nums.length < 1) return 'nums must hold at least one value';
        if (!p.nums.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000000000)) return 'each value must be an integer in 0..10^9';
        return true;
      },
    },
  ],
};
