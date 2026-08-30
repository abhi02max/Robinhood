/**
 * Greedy -> Interval Scheduling.
 *
 * Every problem here is solved by sorting the intervals on one endpoint and then
 * making an irrevocable local choice. Which endpoint to sort on is the entire
 * difficulty: sorting on the wrong one produces a solution that looks reasonable and
 * is wrong on inputs where one long interval swallows several short ones.
 */
export default {
  topic: 'greedy',
  pattern: 'interval-scheduling',
  problems: [
    // -----------------------------------------------------------------------
    {
      slug: 'meeting-rooms',
      title: 'Meeting Rooms',
      difficulty: 'Easy',
      tags: ['interval-scheduling', 'sorting'],
      companies: ['Facebook', 'Amazon', 'Microsoft'],
      description:
        'Given an array of meeting time intervals where `intervals[i] = [start, end]`, determine whether a person could attend **all** of the meetings.\n\nReturn `true` if no two meetings overlap. Intervals are half-open in the usual scheduling sense: a meeting ending at 10 and another starting at 10 do **not** conflict, because the first is over when the second begins.',
      analogy:
        'Checking a day\'s calendar for double-bookings. You do not compare every appointment against every other one — you read the day in chronological order and only ever check whether the next appointment starts before the previous one ended.',
      constraints: [
        '0 <= intervals.length <= 10^4',
        'intervals[i].length == 2',
        '0 <= start < end <= 10^6',
      ],
      edgeCases: [
        'Empty schedule or a single meeting — trivially attendable',
        'Meetings that touch exactly, where one ends as the next begins',
        'Input given out of chronological order, which is why sorting comes first',
        'One long meeting containing several short ones',
        'Identical intervals, which do conflict',
      ],
      hints: [
        'If the meetings were sorted by start time, which pairs could possibly conflict?',
        'Only consecutive ones. If meeting i+1 starts before meeting i ends, there is a conflict; otherwise no earlier meeting can reach it either.',
        'Touching endpoints are not a conflict, so the comparison is strict: next start < current end.',
      ],
      brute: {
        name: 'Compare Every Pair',
        summary: 'Test all pairs of meetings for overlap.',
        intuition:
          'Two intervals overlap when each starts before the other ends. Checking that for every pair needs no sorting and no ordering argument, which makes it the definition of the problem in code.\n\nO(N^2) pairs — 10^8 comparisons at the constraint limit. Its value is as an oracle, and in making the overlap test itself explicit: `a.start < b.end && b.start < a.end`, with the strictness that lets touching intervals pass.',
        steps: [
          'For each pair of distinct meetings:',
          'Return false if each one starts strictly before the other ends.',
          'Return true if no pair conflicts.',
        ],
        js: 'function canAttendMeetings(intervals) {\n  for (let i = 0; i < intervals.length; i++) {\n    for (let j = i + 1; j < intervals.length; j++) {\n      const [aStart, aEnd] = intervals[i];\n      const [bStart, bEnd] = intervals[j];\n      if (aStart < bEnd && bStart < aEnd) return false;\n    }\n  }\n  return true;\n}',
        py: 'def can_attend_meetings(intervals):\n    n = len(intervals)\n    for i in range(n):\n        for j in range(i + 1, n):\n            a_start, a_end = intervals[i]\n            b_start, b_end = intervals[j]\n            if a_start < b_end and b_start < a_end:\n                return False\n    return True',
        time: 'O(N^2)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Sort by Start, Compare Neighbours',
        summary: 'Sort by start time and check each meeting against only its predecessor.',
        intuition:
          'Sorting by start time collapses the pairwise check to a neighbour check. The argument: after sorting, if meeting i+1 does not overlap meeting i, it cannot overlap anything earlier either, because every earlier meeting starts no later than i and — this is the part worth stating — the only thing that can reach forward into i+1 is an end time, and the relevant end time is the one immediately before it in the scan.\n\nSo one pass suffices. If any meeting starts strictly before its predecessor ends, the schedule is impossible; otherwise it works.\n\nThe strict comparison is the specification, not an optimisation: [0,10] and [10,20] are attendable, so `next.start < current.end` must be strict. Using `<=` reports a conflict for every back-to-back meeting.\n\nO(N log N) for the sort and O(N) for the sweep, and the sort dominates.',
        steps: [
          'Copy and sort the intervals by start time ascending.',
          'For each adjacent pair, return false if the later start is strictly less than the earlier end.',
          'Return true.',
        ],
        js: 'function canAttendMeetings(intervals) {\n  const sorted = intervals.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[0] - b[0]);\n  for (let i = 1; i < sorted.length; i++) {\n    if (sorted[i][0] < sorted[i - 1][1]) return false;\n  }\n  return true;\n}',
        py: 'def can_attend_meetings(intervals):\n    ordered = sorted(intervals, key=lambda pair: pair[0])\n    for i in range(1, len(ordered)):\n        if ordered[i][0] < ordered[i - 1][1]:\n            return False\n    return True',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { intervals: [[0, 30], [5, 10], [15, 20]] }, expect: false, explanation: 'The meeting from 0 to 30 overlaps both of the others.' },
        { payload: { intervals: [[7, 10], [2, 4]] }, expect: true, explanation: 'No overlap, and the input is not in chronological order — sorting is what makes the neighbour check valid.' },
        { payload: { intervals: [[0, 10], [10, 20]] }, expect: true, explanation: 'Touching endpoints do not conflict, which is why the comparison must be strict.' },
        { payload: { intervals: [[5, 8], [5, 8]] }, expect: false, explanation: 'Identical meetings overlap completely.' },
      ],
      cases: [
        { payload: { intervals: [] }, label: 'empty schedule' },
        { payload: { intervals: [[1, 5]] }, label: 'single meeting' },
        { payload: { intervals: [[1, 2], [2, 3], [3, 4], [4, 5]] }, label: 'chain of touching meetings' },
        { payload: { intervals: [[1, 100], [2, 3]] }, label: 'short meeting inside a long one' },
        { payload: { intervals: [[10, 20], [1, 5], [30, 40], [21, 29]] }, label: 'shuffled but conflict-free' },
        { payload: { intervals: [[10, 20], [1, 11], [30, 40]] }, label: 'conflict only visible after sorting' },
        { payload: { intervals: [[0, 1000000]] }, label: 'constraint boundary values' },
        { payload: { intervals: [[1, 3], [3, 5], [4, 6]] }, label: 'conflict at the very end of the schedule' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'non-overlapping-intervals',
      title: 'Non-overlapping Intervals',
      difficulty: 'Medium',
      tags: ['interval-scheduling', 'sorting', 'activity-selection'],
      companies: ['Amazon', 'Facebook', 'Google'],
      description:
        'Given an array of intervals, return the **minimum number of intervals to remove** so that the rest do not overlap.\n\nAs with the previous problem, intervals that only touch at an endpoint are not considered overlapping. Minimising removals is the same as maximising how many you keep, which is the classic activity-selection problem — and the endpoint you sort on decides whether you get the right answer.',
      analogy:
        'Booking as many talks as possible into one lecture hall. The greedy rule that works is to always take the talk that *finishes* earliest among those you can still attend, because finishing early leaves the most room for everything after it. Choosing by start time or by duration both fail.',
      constraints: [
        '1 <= intervals.length <= 10^5',
        'intervals[i].length == 2',
        '-5 * 10^4 <= start < end <= 5 * 10^4',
      ],
      edgeCases: [
        'Already non-overlapping — remove nothing',
        'All intervals identical, so all but one must go',
        'One long interval overlapping many short ones, where removing the long one is correct',
        'Intervals that only touch, which must not be removed',
        'Single interval',
      ],
      hints: [
        'Reframe it: instead of minimising removals, maximise the number of intervals you keep.',
        'Sort by END time. Then greedily keep an interval whenever it starts at or after the end of the last one you kept.',
        'Why end time? Among all intervals you could take next, the one that ends soonest leaves the largest remaining window, and it never costs you anything — any solution using a later-ending choice can be rewritten to use this one.',
        'The answer is the total count minus the number you kept.',
      ],
      brute: {
        name: 'Sort by Start and Drop the Longer Conflict',
        summary: 'Sweep in start order and, on each conflict, discard whichever of the two intervals ends later.',
        intuition:
          'Sorting by start time and resolving conflicts pairwise also works, provided the tie-break is right: when two intervals overlap, keep the one that ends earlier, because it constrains the future less. Discarding the later-ending one costs a removal but leaves more room.\n\nThis is a valid O(N log N) solution, and it is here as the brute-force slot because it is the version people reach for first — the reasoning is local and per-conflict rather than a clean invariant, which makes it much easier to get subtly wrong. It also makes the "keep the earlier end" insight explicit, which is exactly what the end-sorted version formalises.',
        steps: [
          'Sort the intervals by start time.',
          'Track the end of the interval currently kept.',
          'For each next interval: if it starts before that end, remove one and keep whichever ends earlier.',
          'Otherwise keep it and advance the tracked end.',
        ],
        js: 'function eraseOverlapIntervals(intervals) {\n  const sorted = intervals.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[0] - b[0]);\n  let removals = 0;\n  let currentEnd = Infinity;\n  for (let i = 0; i < sorted.length; i++) {\n    if (i === 0) { currentEnd = sorted[i][1]; continue; }\n    if (sorted[i][0] < currentEnd) {\n      removals++;\n      currentEnd = Math.min(currentEnd, sorted[i][1]);\n    } else {\n      currentEnd = sorted[i][1];\n    }\n  }\n  return removals;\n}',
        py: 'def erase_overlap_intervals(intervals):\n    ordered = sorted(intervals, key=lambda pair: pair[0])\n    removals = 0\n    current_end = None\n    for i, (start, end) in enumerate(ordered):\n        if i == 0:\n            current_end = end\n            continue\n        if start < current_end:\n            removals += 1\n            current_end = min(current_end, end)\n        else:\n            current_end = end\n    return removals',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Sort by End, Greedily Keep',
        summary: 'Sort by end time and keep every interval that starts at or after the last kept end.',
        intuition:
          'Sort by end time and walk forward, keeping an interval whenever it does not overlap the last one kept. The number of removals is the total minus the number kept.\n\nThe exchange argument for why earliest-end is optimal: suppose some optimal solution does not start with the earliest-ending interval. Swap its first interval for the earliest-ending one. That is still legal — the replacement ends no later, so it cannot conflict with anything the original solution scheduled afterwards — and the count is unchanged. Repeating the swap turns any optimal solution into the greedy one, so the greedy one is optimal too.\n\nThat argument is what fails for the alternatives. Sorting by start time picks a long interval that blocks several short ones. Sorting by duration looks plausible but a short interval can straddle the boundary between two others and block both.\n\nThe comparison is `start >= lastEnd`, not `>`, because touching intervals do not overlap. Using `>` needlessly removes every back-to-back pair.\n\nO(N log N) for the sort, O(N) for the sweep, O(1) extra space beyond the sorted copy.',
        steps: [
          'Sort the intervals by end time ascending.',
          'Set kept = 0 and lastEnd = negative infinity.',
          'For each interval, if its start is at least lastEnd, increment kept and set lastEnd to its end.',
          'Return the total count minus kept.',
        ],
        js: 'function eraseOverlapIntervals(intervals) {\n  const sorted = intervals.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[1] - b[1]);\n  let kept = 0;\n  let lastEnd = -Infinity;\n  for (const [start, end] of sorted) {\n    if (start >= lastEnd) {\n      kept++;\n      lastEnd = end;\n    }\n  }\n  return intervals.length - kept;\n}',
        py: 'def erase_overlap_intervals(intervals):\n    ordered = sorted(intervals, key=lambda pair: pair[1])\n    kept = 0\n    last_end = float("-inf")\n    for start, end in ordered:\n        if start >= last_end:\n            kept += 1\n            last_end = end\n    return len(intervals) - kept',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { intervals: [[1, 2], [2, 3], [3, 4], [1, 3]] }, expect: 1, explanation: 'Removing [1,3] leaves three non-overlapping intervals. Touching pairs like [1,2] and [2,3] are fine.' },
        { payload: { intervals: [[1, 2], [1, 2], [1, 2]] }, expect: 2, explanation: 'All three are identical, so two must go.' },
        { payload: { intervals: [[1, 2], [2, 3]] }, expect: 0, explanation: 'They only touch, so nothing overlaps and nothing is removed.' },
        { payload: { intervals: [[1, 100], [11, 22], [1, 11], [2, 12]] }, expect: 2, explanation: 'Keeping [1,11] and [11,22] is the best possible, so two intervals are removed. Sorting by start time and keeping the first would take [1,100] and force three removals.' },
      ],
      cases: [
        { payload: { intervals: [[1, 2]] }, label: 'single interval' },
        { payload: { intervals: [[1, 5], [6, 10], [11, 15]] }, label: 'already disjoint' },
        { payload: { intervals: [[1, 10], [2, 3], [4, 5], [6, 7]] }, label: 'one long interval blocking three short ones' },
        { payload: { intervals: [[-50000, 0], [0, 50000]] }, label: 'constraint boundary values, touching' },
        { payload: { intervals: [[-5, -1], [-4, -2], [-3, 0]] }, label: 'all negative and mutually overlapping' },
        { payload: { intervals: [[1, 3], [2, 4], [3, 5], [4, 6]] }, label: 'chain of pairwise overlaps' },
        { payload: { intervals: [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]] }, label: 'longer overlap chain, alternate keeps' },
        { payload: { intervals: [[1, 4], [2, 3], [3, 4]] }, label: 'duration-based greedy would fail here' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'minimum-number-of-arrows-to-burst-balloons',
      title: 'Minimum Number of Arrows to Burst Balloons',
      difficulty: 'Medium',
      tags: ['interval-scheduling', 'sorting'],
      companies: ['Amazon', 'Facebook'],
      description:
        'Balloons are given as intervals `points[i] = [start, end]` on a flat wall. An arrow shot straight up at coordinate `x` bursts every balloon whose interval satisfies `start <= x <= end`.\n\nReturn the minimum number of arrows needed to burst all of them. Both endpoints count, so a balloon at `[10, 16]` and one at `[16, 20]` share the point 16 and can be burst together — which is the opposite of the touching rule in the two problems above.',
      analogy:
        'Popping a wall of overlapping bubbles with as few pins as possible. Every pin should be placed as far right as it can still go while hitting everything currently in reach — pushing it further right wastes coverage, pulling it left gains nothing.',
      constraints: [
        '1 <= points.length <= 10^5',
        'points[i].length == 2',
        '-2^31 <= start <= end <= 2^31 - 1',
      ],
      edgeCases: [
        'A single balloon — one arrow',
        'All balloons sharing a common point — one arrow',
        'Completely disjoint balloons — one arrow each',
        'Balloons touching at exactly one coordinate, which share an arrow',
        'A balloon fully containing another',
        'Extreme coordinate values where a start minus an end would overflow a 32-bit subtraction',
      ],
      hints: [
        'Sort by end coordinate. Where is the best place to put the first arrow?',
        'At the smallest end coordinate. Any arrow that bursts that balloon must be at or before its end, and placing it exactly at the end maximises what else it can reach.',
        'Sweep the rest: a balloon whose start is at or before the current arrow is already burst; otherwise place a new arrow at that balloon\'s end.',
        'The comparison uses <= because touching endpoints do count as a hit here.',
      ],
      brute: {
        name: 'Sort and Re-Scan for Each Arrow',
        summary: 'Repeatedly place an arrow at the earliest remaining end and delete every balloon it bursts.',
        intuition:
          'Do the greedy choice explicitly with a removal step: find the balloon with the smallest end among those still alive, place an arrow there, then walk the whole list removing everything that arrow hits. Repeat until nothing is left.\n\nThe answer is right, and the process makes the invariant visible — after each round, no surviving balloon contains the arrow coordinate. It is O(N^2) in the worst case because each round rescans the survivors, so it is the version to check against rather than to ship.',
        steps: [
          'Sort by end coordinate.',
          'While balloons remain, take the smallest end as the arrow position.',
          'Remove every balloon whose start is at most that position.',
          'Count the arrow and repeat.',
        ],
        js: 'function findMinArrowShots(points) {\n  let alive = points.map((pair) => [pair[0], pair[1]]).sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));\n  let arrows = 0;\n  while (alive.length > 0) {\n    const arrow = alive[0][1];\n    arrows++;\n    alive = alive.filter((pair) => pair[0] > arrow);\n  }\n  return arrows;\n}',
        py: 'def find_min_arrow_shots(points):\n    alive = sorted((list(pair) for pair in points), key=lambda pair: pair[1])\n    arrows = 0\n    while alive:\n        arrow = alive[0][1]\n        arrows += 1\n        alive = [pair for pair in alive if pair[0] > arrow]\n    return arrows',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Sort by End, One Sweep',
        summary: 'Sort by end coordinate and place a new arrow only when a balloon starts after the current one.',
        intuition:
          'Sort by end coordinate and place the first arrow at the first balloon\'s end. That balloon must be hit by some arrow, and every arrow that hits it sits at or before its end — so putting it exactly at the end is at least as good as any other choice, because it also covers the maximum possible amount of what comes later.\n\nThen sweep. A balloon whose start is at or before the current arrow is already burst, so skip it. A balloon whose start is strictly after the arrow cannot be helped by it, so commit a new arrow at that balloon\'s end and repeat the argument.\n\nThe test is `start > arrow`, using strict greater-than, because a balloon starting exactly at the arrow coordinate *is* burst — both endpoints count. This is the opposite convention from the meeting-room problems, and mixing them up is the usual source of an off-by-one here.\n\nSorting by end rather than start matters for the same reason as activity selection: sorting by start and greedily extending gets confused by a balloon that spans the entire wall.\n\nComparing end coordinates directly rather than subtracting them also avoids overflow — with values at the 32-bit extremes, `a[1] - b[1]` as a comparator can wrap around and produce a nonsensical ordering.',
        steps: [
          'Sort the balloons by end coordinate ascending.',
          'Set arrows = 1 and place the first arrow at the first balloon\'s end.',
          'For each subsequent balloon, if its start is strictly greater than the arrow position, increment arrows and move the arrow to this balloon\'s end.',
          'Return arrows.',
        ],
        js: 'function findMinArrowShots(points) {\n  const sorted = points.map((pair) => [pair[0], pair[1]]).sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));\n  let arrows = 1;\n  let arrow = sorted[0][1];\n  for (let i = 1; i < sorted.length; i++) {\n    if (sorted[i][0] > arrow) {\n      arrows++;\n      arrow = sorted[i][1];\n    }\n  }\n  return arrows;\n}',
        py: 'def find_min_arrow_shots(points):\n    ordered = sorted(points, key=lambda pair: pair[1])\n    arrows = 1\n    arrow = ordered[0][1]\n    for start, end in ordered[1:]:\n        if start > arrow:\n            arrows += 1\n            arrow = end\n    return arrows',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { points: [[10, 16], [2, 8], [1, 6], [7, 12]] }, expect: 2, explanation: 'One arrow at 6 bursts [1,6] and [2,8]; another at 12 bursts [7,12] and [10,16].' },
        { payload: { points: [[1, 2], [3, 4], [5, 6], [7, 8]] }, expect: 4, explanation: 'Nothing overlaps, so every balloon needs its own arrow.' },
        { payload: { points: [[1, 2], [2, 3], [3, 4], [4, 5]] }, expect: 2, explanation: 'Touching balloons share an arrow here, unlike the meeting-room convention: an arrow at 2 covers [1,2] and [2,3].' },
        { payload: { points: [[1, 10]] }, expect: 1, explanation: 'A single balloon needs one arrow.' },
      ],
      cases: [
        { payload: { points: [[1, 1]] }, label: 'zero-width balloon' },
        { payload: { points: [[1, 100], [2, 3], [4, 5]] }, label: 'one balloon spanning the others' },
        { payload: { points: [[5, 5], [5, 5], [5, 5]] }, label: 'identical zero-width balloons' },
        { payload: { points: [[0, 10], [10, 20], [20, 30]] }, label: 'chain touching at single points' },
        { payload: { points: [[-2147483648, 2147483647]] }, label: 'full 32-bit span in one balloon' },
        { payload: { points: [[-2147483648, -2147483647], [2147483646, 2147483647]] }, label: 'extremes at both ends where subtracting would overflow' },
        { payload: { points: [[1, 2], [2, 3], [1, 3], [4, 5]] }, label: 'nested and touching combined' },
        { payload: { points: [[9, 12], [1, 10], [4, 11], [8, 12], [3, 9], [6, 9], [6, 7]] }, label: 'heavily overlapping cluster' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'maximum-length-of-pair-chain',
      title: 'Maximum Length of Pair Chain',
      difficulty: 'Medium',
      tags: ['interval-scheduling', 'sorting', 'activity-selection'],
      companies: ['Google'],
      description:
        'You are given pairs `pairs[i] = [left, right]` with `left < right`. A pair `[c, d]` can follow `[a, b]` in a chain only if `b < c` — strictly.\n\nReturn the length of the longest chain that can be formed. Pairs may be used in any order and you do not have to use them all. Note the strictness: `[1,2]` cannot be followed by `[2,3]`, which is the same convention as the meeting-room problems and the opposite of the balloon problem.',
      analogy:
        'Chaining relay legs where the next runner may only set off after the previous one has fully finished, with no handover at the same instant. Always choosing the leg that finishes earliest leaves the most time for everything after it.',
      constraints: [
        '1 <= pairs.length <= 1000',
        'pairs[i].length == 2',
        '-1000 <= left < right <= 1000',
      ],
      edgeCases: [
        'A single pair — chain length 1',
        'All pairs mutually overlapping, so the answer is 1',
        'Pairs where one ends exactly where the next begins, which cannot chain',
        'Already-chainable input given in shuffled order',
        'A pair containing all the others',
      ],
      hints: [
        'This is activity selection again. Which endpoint should the sort key be?',
        'The right endpoint. Greedily take a pair whenever its left is strictly greater than the right end of the last pair taken.',
        'Sorting by the left endpoint and taking greedily fails: a pair with a small left and a huge right blocks everything after it.',
        'Because the chain condition is b < c and not b <= c, the comparison in the sweep must be strict.',
      ],
      brute: {
        name: 'Longest Chain by Dynamic Programming',
        summary: 'Sort by left endpoint and compute, for each pair, the longest chain ending there.',
        intuition:
          'Treat it as a longest-increasing-subsequence problem. Sort by left endpoint, then for each pair look back at every earlier pair that can precede it and take the best chain length found, plus one.\n\nThis needs no exchange argument — it explores every valid chain implicitly — which makes it a trustworthy oracle. It costs O(N^2), fine at N = 1000, and it is genuinely the right tool if the chaining rule were more complex than "ends before the next begins".',
        steps: [
          'Sort the pairs by left endpoint.',
          'Set best[i] = 1 for every pair.',
          'For each i, for each j before it: if pairs[j] can precede pairs[i], set best[i] = max(best[i], best[j] + 1).',
          'Return the largest value in best.',
        ],
        js: 'function findLongestChain(pairs) {\n  const sorted = pairs.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[0] - b[0]);\n  const best = new Array(sorted.length).fill(1);\n  let answer = 1;\n  for (let i = 0; i < sorted.length; i++) {\n    for (let j = 0; j < i; j++) {\n      if (sorted[j][1] < sorted[i][0] && best[j] + 1 > best[i]) best[i] = best[j] + 1;\n    }\n    if (best[i] > answer) answer = best[i];\n  }\n  return answer;\n}',
        py: 'def find_longest_chain(pairs):\n    ordered = sorted(pairs, key=lambda pair: pair[0])\n    best = [1] * len(ordered)\n    answer = 1\n    for i in range(len(ordered)):\n        for j in range(i):\n            if ordered[j][1] < ordered[i][0] and best[j] + 1 > best[i]:\n                best[i] = best[j] + 1\n        answer = max(answer, best[i])\n    return answer',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Sort by Right Endpoint, Greedy Chain',
        summary: 'Sort by right endpoint and extend the chain whenever the next pair starts strictly after the current end.',
        intuition:
          'Identical in structure to Non-overlapping Intervals, and the same exchange argument applies: among the pairs that could come next, the one finishing earliest is never a worse choice, because it ends no later and therefore rules out no more of the future.\n\nSort by right endpoint. Keep the right end of the last pair taken. For each pair in order, if its left is strictly greater than that end, take it and advance the end. Count the takes.\n\nThe strictness matters and differs from the balloon problem: here [1,2] followed by [2,3] is illegal, so the test is `left > lastEnd`. In the balloon problem the equivalent test was also strict but meant the opposite thing — there equality meant "already covered", here equality means "cannot chain". Reading the comparison off the problem statement rather than reusing a remembered template is the safer habit.\n\nO(N log N), dominated by the sort, versus O(N^2) for the DP. Both are fast enough at N = 1000; the greedy is the one that scales.',
        steps: [
          'Sort the pairs by right endpoint ascending.',
          'Set length = 0 and lastEnd = negative infinity.',
          'For each pair, if its left is strictly greater than lastEnd, increment length and set lastEnd to its right.',
          'Return length.',
        ],
        js: 'function findLongestChain(pairs) {\n  const sorted = pairs.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[1] - b[1]);\n  let length = 0;\n  let lastEnd = -Infinity;\n  for (const [left, right] of sorted) {\n    if (left > lastEnd) {\n      length++;\n      lastEnd = right;\n    }\n  }\n  return length;\n}',
        py: 'def find_longest_chain(pairs):\n    ordered = sorted(pairs, key=lambda pair: pair[1])\n    length = 0\n    last_end = float("-inf")\n    for left, right in ordered:\n        if left > last_end:\n            length += 1\n            last_end = right\n    return length',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { pairs: [[1, 2], [2, 3], [3, 4]] }, expect: 2, explanation: '[1,2] then [3,4]. [2,3] cannot follow [1,2] because the rule requires 2 < 2, which is false.' },
        { payload: { pairs: [[1, 2], [7, 8], [4, 5]] }, expect: 3, explanation: 'All three chain once sorted by right endpoint, even though the input order does not.' },
        { payload: { pairs: [[1, 10]] }, expect: 1, explanation: 'A single pair is a chain of length 1.' },
        { payload: { pairs: [[1, 100], [2, 3], [4, 5]] }, expect: 2, explanation: '[2,3] then [4,5]. Sorting by left endpoint and taking greedily would pick [1,100] and stop at 1.' },
      ],
      cases: [
        { payload: { pairs: [[-1, 0]] }, label: 'single pair with negative left' },
        { payload: { pairs: [[1, 2], [1, 2], [1, 2]] }, label: 'identical pairs, answer is 1' },
        { payload: { pairs: [[1, 5], [2, 6], [3, 7]] }, label: 'all mutually overlapping' },
        { payload: { pairs: [[-1000, -999], [999, 1000]] }, label: 'constraint boundary values' },
        { payload: { pairs: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]] }, label: 'fully chainable' },
        { payload: { pairs: [[9, 10], [7, 8], [5, 6], [3, 4], [1, 2]] }, label: 'fully chainable but reversed' },
        { payload: { pairs: [[-10, -8], [-7, -5], [-4, -2], [-1, 1]] }, label: 'negative coordinates chaining' },
        { payload: { pairs: [[3, 4], [1, 2], [4, 5], [2, 3]] }, label: 'touching pairs shuffled' },
      ],
    },
  ],
};
