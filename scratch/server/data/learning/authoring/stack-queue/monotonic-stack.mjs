/**
 * Stack & Queue -> Monotonic Stack.
 *
 * A stack whose contents are kept sorted, so that pushing a new element pops
 * everything it dominates. The pops are where the answers come from: each popped
 * element has just met the neighbour it was waiting for. Four problems covering the
 * three variants — next greater to the right, next greater with wraparound, and the
 * distance-to-next-greater framing.
 */
export default {
  topic: 'stack-queue',
  pattern: 'monotonic-stack',
  problems: [
    // -----------------------------------------------------------------------
    {
      slug: 'next-greater-element-i',
      title: 'Next Greater Element I',
      difficulty: 'Easy',
      tags: ['monotonic-stack', 'hash-map'],
      companies: ['Amazon', 'Bloomberg'],
      description:
        'You are given two arrays of **distinct** integers, `nums1` and `nums2`, where `nums1` is a subset of `nums2`.\n\nFor each value in `nums1`, find it in `nums2` and return the first element **to its right in `nums2`** that is strictly greater than it. If there is no such element, use `-1`. Return the answers in the order the values appear in `nums1`.',
      analogy:
        'A queue of people of different heights. For each named person you want the first person standing behind them who is taller. Anyone shorter than the person behind them is answered and can leave the problem, which is what lets a single pass settle everyone.',
      constraints: [
        '1 <= nums1.length <= nums2.length <= 1000',
        '0 <= nums1[i], nums2[i] <= 10^4',
        'All integers in nums1 and nums2 are distinct',
        'Every integer of nums1 also appears in nums2',
      ],
      edgeCases: [
        'The queried value is the maximum of nums2 — the answer is -1',
        'The queried value is last in nums2 — the answer is -1',
        'nums2 strictly increasing, so every answer is the immediate neighbour',
        'nums2 strictly decreasing, so every answer is -1',
        'nums1 in a different order from nums2, which the output order must follow',
      ],
      hints: [
        'Solve the general problem first: for every position of nums2, what is its next greater element? Then answer the queries by lookup.',
        'Sweep nums2 keeping a stack of values still waiting for a bigger neighbour. Each new value answers everything smaller than it that is sitting on the stack.',
        'Because the values are distinct, a map from value to its answer is enough — you never have to disambiguate two equal values.',
        'Anything left on the stack at the end never found a greater element, so its answer is -1.',
      ],
      brute: {
        name: 'Locate Then Scan Right',
        summary: 'For each query, find its index in nums2 and scan rightward for the first larger value.',
        intuition:
          'The definition, executed literally: locate the value, then walk right until something bigger appears, or fall off the end and report -1. No auxiliary structure, and the ordering requirement is satisfied automatically because the queries are processed in their own order.\n\nEach query costs O(M) to find and O(M) to scan, so the total is O(N*M). At these constraints that is a million steps and would actually pass, but it does not generalise and it hides the structure the stack exploits.',
        steps: [
          'For each value in nums1:',
          'Find its index in nums2.',
          'Scan rightward for the first strictly greater value and record it.',
          'Record -1 if the scan reaches the end.',
        ],
        js: 'function nextGreaterElement(nums1, nums2) {\n  const out = [];\n  for (const value of nums1) {\n    const at = nums2.indexOf(value);\n    let answer = -1;\n    for (let j = at + 1; j < nums2.length; j++) {\n      if (nums2[j] > value) { answer = nums2[j]; break; }\n    }\n    out.push(answer);\n  }\n  return out;\n}',
        py: 'def next_greater_element(nums1, nums2):\n    out = []\n    for value in nums1:\n        at = nums2.index(value)\n        answer = -1\n        for j in range(at + 1, len(nums2)):\n            if nums2[j] > value:\n                answer = nums2[j]\n                break\n        out.append(answer)\n    return out',
        time: 'O(N*M)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Monotonic Stack over nums2, Then Lookup',
        summary: 'One sweep of nums2 with a decreasing stack answers every position; the queries become map lookups.',
        intuition:
          'Sweep nums2 left to right and keep a stack of values that have not yet found a greater element. The stack is kept strictly decreasing from bottom to top, and that invariant is what makes it work.\n\nWhen a new value arrives, everything on top of the stack that is smaller than it has just found its answer — the new value is the *first* greater one, because it is the first element to the right that exceeded them. Pop each such value and record the new value as its answer. Then push the new value, which preserves the decreasing order.\n\nWhy is the popped element\'s answer necessarily the *first* greater one, not just some greater one? Because it was still on the stack, meaning every element between it and here was smaller than it — otherwise it would have been popped earlier. So nothing in between could have been greater.\n\nWhatever remains on the stack at the end never met a greater element, so those answers are -1. Each element is pushed once and popped at most once, so the sweep is O(M) despite the inner while loop.\n\nWith the answers in a map, the queries are O(1) each. Distinctness is what makes a value-keyed map sufficient; with duplicates the same sweep would have to be keyed by index instead.',
        steps: [
          'Create an empty stack and an empty map from value to answer.',
          'For each value of nums2: while the stack top is smaller than it, pop and record this value as the popped element\'s answer.',
          'Push the value.',
          'Map every value of nums1 through the answers, defaulting to -1.',
        ],
        js: 'function nextGreaterElement(nums1, nums2) {\n  const answer = new Map();\n  const stack = [];\n  for (const value of nums2) {\n    while (stack.length > 0 && stack[stack.length - 1] < value) {\n      answer.set(stack.pop(), value);\n    }\n    stack.push(value);\n  }\n  return nums1.map((value) => (answer.has(value) ? answer.get(value) : -1));\n}',
        py: 'def next_greater_element(nums1, nums2):\n    answer = {}\n    stack = []\n    for value in nums2:\n        while stack and stack[-1] < value:\n            answer[stack.pop()] = value\n        stack.append(value)\n    return [answer.get(value, -1) for value in nums1]',
        time: 'O(N + M)',
        space: 'O(M)',
      },
      examples: [
        { payload: { nums1: [4, 1, 2], nums2: [1, 3, 4, 2] }, expect: [-1, 3, -1], explanation: '4 has nothing greater to its right. 1 is followed by 3. 2 is last, so -1.' },
        { payload: { nums1: [2, 4], nums2: [1, 2, 3, 4] }, expect: [3, -1], explanation: '2 is followed by 3; 4 is the maximum and last, so -1.' },
        { payload: { nums1: [1], nums2: [1] }, expect: [-1], explanation: 'A single element has nothing to its right.' },
        { payload: { nums1: [3, 1], nums2: [3, 2, 1] }, expect: [-1, -1], explanation: 'A strictly decreasing nums2 answers every query with -1; the whole array ends up on the stack.' },
      ],
      cases: [
        { payload: { nums1: [1, 2, 3, 4], nums2: [1, 2, 3, 4] }, label: 'strictly increasing, each answer is the neighbour' },
        { payload: { nums1: [4, 3, 2, 1], nums2: [4, 3, 2, 1] }, label: 'strictly decreasing, all -1' },
        { payload: { nums1: [5], nums2: [1, 5, 3, 9, 2] }, label: 'answer several positions to the right' },
        { payload: { nums1: [9], nums2: [1, 5, 3, 9, 2] }, label: 'query is the maximum' },
        { payload: { nums1: [2, 9, 1, 3, 5], nums2: [1, 5, 3, 9, 2] }, label: 'query order differs from nums2 order' },
        { payload: { nums1: [0], nums2: [0, 10000] }, label: 'constraint boundary values' },
        { payload: { nums1: [7, 4], nums2: [2, 7, 4, 8, 1, 6] }, label: 'two queries answered by the same element' },
        { payload: { nums1: [6, 1], nums2: [6, 5, 4, 3, 2, 1, 7] }, label: 'long decreasing run resolved by one large value' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'next-greater-element-ii',
      title: 'Next Greater Element II',
      difficulty: 'Medium',
      tags: ['monotonic-stack', 'circular-array'],
      companies: ['Amazon', 'Google'],
      description:
        'Given a **circular** integer array `nums`, return the next greater element for every position.\n\nSearching for the next greater element means walking right and wrapping past the end back to the beginning. If no greater element exists anywhere in the array, the answer for that position is `-1`. Unlike the previous problem, values may repeat, so positions have to be tracked rather than values.',
      analogy:
        'People standing in a circle rather than a line. To find the first taller person clockwise from you, you may pass the person you started next to and keep going — but you stop after one full lap, because after that you would be answering yourself.',
      constraints: ['1 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
      edgeCases: [
        'Single element — no greater element exists, so -1',
        'All elements equal — every answer is -1, since "greater" is strict',
        'The maximum element, whose answer is always -1',
        'An answer that is only reachable by wrapping around',
        'Duplicate values, which is why the stack must hold indices rather than values',
      ],
      hints: [
        'How would you handle the wraparound without physically doubling the array?',
        'Iterate for 2N steps and use index modulo N. The first lap sets up the stack, the second lap lets earlier positions find answers that lie before them.',
        'Store indices on the stack, not values — duplicates make values ambiguous, and you need to know which slot of the output to fill.',
        'On the second lap, do not push anything. Every position is already on the stack or already answered, and pushing again would let a position answer itself.',
      ],
      brute: {
        name: 'Walk the Circle From Each Position',
        summary: 'For each index, step forward with wraparound for up to N-1 positions looking for a greater value.',
        intuition:
          'Literal reading of "circular": from index i, check i+1, i+2, ..., wrapping with modulo, and stop after N-1 steps because that has covered every other element exactly once. First greater value wins; if the lap completes, the answer is -1.\n\nThe N-1 bound is the detail worth pinning down — stopping at N steps would compare the element against itself, and not bounding it at all loops forever on an array of equal values. O(N^2) overall, and at N = 10^4 that is 10^8 comparisons: slow, but unambiguous.',
        steps: [
          'For each index i:',
          'For each offset from 1 to N-1, look at index (i + offset) mod N.',
          'Record the first value strictly greater than nums[i] and stop.',
          'Record -1 if the whole lap finds nothing.',
        ],
        js: 'function nextGreaterElements(nums) {\n  const n = nums.length;\n  const out = [];\n  for (let i = 0; i < n; i++) {\n    let answer = -1;\n    for (let offset = 1; offset < n; offset++) {\n      const candidate = nums[(i + offset) % n];\n      if (candidate > nums[i]) { answer = candidate; break; }\n    }\n    out.push(answer);\n  }\n  return out;\n}',
        py: 'def next_greater_elements(nums):\n    n = len(nums)\n    out = []\n    for i in range(n):\n        answer = -1\n        for offset in range(1, n):\n            candidate = nums[(i + offset) % n]\n            if candidate > nums[i]:\n                answer = candidate\n                break\n        out.append(answer)\n    return out',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Monotonic Stack over Two Laps',
        summary: 'Run the decreasing-stack sweep for 2N steps with modulo indexing, pushing only during the first lap.',
        intuition:
          'The linear version of "next greater element" only looks rightward, so a circular array needs positions near the end to see positions near the start. Doubling the array would achieve that; iterating for 2N steps with index modulo N achieves the same thing without allocating anything.\n\nThe stack holds **indices**, not values. Two reasons: duplicates make a value-keyed answer ambiguous, and the output is positional, so you need to know which slot to fill when a waiting element is finally answered.\n\nThe sweep is the same as before — a new value pops every index whose value it exceeds, and each popped index records this value as its answer. The one change is that pushes happen only while the step counter is below N. On the second lap the goal is purely to *resolve* positions still waiting, and pushing again would let an index find itself, or produce answers for indices that already have them.\n\nAnything still on the stack after 2N steps was never exceeded by any element anywhere in the circle, so it is a maximum and its answer is -1. Initialising the output to -1 handles those without a final loop.\n\nEach index is pushed once and popped at most once across both laps, so the total is O(N) despite the doubled iteration count.',
        steps: [
          'Fill the output with -1 and create an empty stack of indices.',
          'For step from 0 to 2N-1, let i = step mod N.',
          'While the stack is non-empty and nums at its top index is less than nums[i], pop and set that index\'s answer to nums[i].',
          'Push i only while step is less than N.',
          'Return the output.',
        ],
        js: 'function nextGreaterElements(nums) {\n  const n = nums.length;\n  const out = new Array(n).fill(-1);\n  const stack = [];\n  for (let step = 0; step < 2 * n; step++) {\n    const i = step % n;\n    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {\n      out[stack.pop()] = nums[i];\n    }\n    if (step < n) stack.push(i);\n  }\n  return out;\n}',
        py: 'def next_greater_elements(nums):\n    n = len(nums)\n    out = [-1] * n\n    stack = []\n    for step in range(2 * n):\n        i = step % n\n        while stack and nums[stack[-1]] < nums[i]:\n            out[stack.pop()] = nums[i]\n        if step < n:\n            stack.append(i)\n    return out',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { nums: [1, 2, 1] }, expect: [2, -1, 2], explanation: 'The last 1 finds 2 by wrapping around to index 1. The 2 is the maximum, so -1.' },
        { payload: { nums: [1, 2, 3, 4, 3] }, expect: [2, 3, 4, -1, 4], explanation: 'The trailing 3 wraps past the end to find 4 at index 3.' },
        { payload: { nums: [5] }, expect: [-1], explanation: 'A single element cannot be greater than itself, so the lap bound matters here.' },
        { payload: { nums: [2, 2, 2] }, expect: [-1, -1, -1], explanation: 'Greater is strict, so equal values never answer each other.' },
      ],
      cases: [
        { payload: { nums: [1, 1] }, label: 'two equal elements' },
        { payload: { nums: [1, 2] }, label: 'answer requires the wrap for one position' },
        { payload: { nums: [5, 4, 3, 2, 1] }, label: 'strictly decreasing, all answered by the wrap' },
        { payload: { nums: [1, 2, 3, 4, 5] }, label: 'strictly increasing, only the maximum is -1' },
        { payload: { nums: [3, 8, 4, 1, 2] }, label: 'maximum in the interior' },
        { payload: { nums: [-1, -2, -3] }, label: 'all negative' },
        { payload: { nums: [1000000000, -1000000000] }, label: 'constraint boundary magnitudes' },
        { payload: { nums: [2, 7, 2, 7, 2, 7] }, label: 'repeating pattern with duplicates' },
        { payload: { nums: [4, 4, 4, 5, 4, 4] }, label: 'duplicates resolved by one larger value' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'daily-temperatures',
      title: 'Daily Temperatures',
      difficulty: 'Medium',
      tags: ['monotonic-stack', 'distances'],
      companies: ['Amazon', 'Facebook', 'Google'],
      description:
        'Given an array `temperatures` of daily temperatures, return an array `answer` where `answer[i]` is the **number of days you have to wait** after day `i` for a warmer temperature.\n\nIf no later day is warmer, the answer for that day is `0`. This is the same sweep as Next Greater Element, but the output is a distance rather than a value — which is why the stack has to carry indices.',
      analogy:
        'Waiting for the next warm day on a calendar. Days that are colder than tomorrow are answered immediately; a long cold snap accumulates unanswered days, and one warm day at the end resolves the whole run at once, each with its own waiting time.',
      constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
      edgeCases: [
        'Single day — the answer is 0',
        'Strictly decreasing temperatures, where every answer is 0',
        'Strictly increasing temperatures, where every answer is 1',
        'Equal temperatures, which do not count as warmer',
        'A long cold run resolved by a single warm day at the end',
      ],
      hints: [
        'This is "next greater element", but the answer is a gap. What does the stack need to hold for you to compute a gap?',
        'Indices. When day j finally beats day i, the wait is j - i, which you cannot recover from the temperature values alone.',
        'Keep the stack decreasing by temperature. Each new day pops every colder day still waiting and fills in its distance.',
        'Days left on the stack at the end never saw a warmer day, so their answer is 0 — initialise the output to 0 and you need no cleanup pass.',
      ],
      brute: {
        name: 'Scan Forward From Each Day',
        summary: 'For each day, walk forward until a warmer day appears and record the gap.',
        intuition:
          'Straight from the statement: from day i, look at i+1, i+2, ... and stop at the first strictly warmer day, recording the difference in indices. If the scan runs off the end, the answer is 0.\n\nCorrect and easy to verify by hand, which is what makes it the oracle. It is O(N^2) in the worst case — a long descending run makes every scan traverse the whole tail — and at N = 10^5 that is 10^10 comparisons.',
        steps: [
          'For each index i:',
          'Walk j forward from i+1.',
          'If temperatures[j] is greater than temperatures[i], record j - i and stop.',
          'Record 0 if no warmer day is found.',
        ],
        js: 'function dailyTemperatures(temperatures) {\n  const n = temperatures.length;\n  const out = [];\n  for (let i = 0; i < n; i++) {\n    let wait = 0;\n    for (let j = i + 1; j < n; j++) {\n      if (temperatures[j] > temperatures[i]) { wait = j - i; break; }\n    }\n    out.push(wait);\n  }\n  return out;\n}',
        py: 'def daily_temperatures(temperatures):\n    n = len(temperatures)\n    out = []\n    for i in range(n):\n        wait = 0\n        for j in range(i + 1, n):\n            if temperatures[j] > temperatures[i]:\n                wait = j - i\n                break\n        out.append(wait)\n    return out',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Monotonic Stack of Indices',
        summary: 'Sweep once with a stack of indices whose temperatures decrease; each warmer day resolves the run of colder days above it.',
        intuition:
          'Keep a stack of the days that are still waiting for something warmer. The invariant is that their temperatures decrease from the bottom of the stack to the top — which holds naturally, because a day is only pushed after every warmer-or-equal comparison has been settled.\n\nWhen day i arrives, look at the top of the stack. If that day is colder, day i is its answer, and crucially it is the *first* warmer day: had anything between them been warmer, that day would have popped it already. Record the wait as i minus the popped index, and keep popping while the invariant is violated.\n\nThe reason indices rather than temperatures go on the stack is the output. The question asks how long the wait was, and that is a difference of positions; the temperature values cannot reconstruct it.\n\nEqual temperatures must not pop. "Warmer" is strict, so the comparison is `<` and a flat run stacks up rather than resolving itself.\n\nDays still on the stack at the end never warmed up, and pre-filling the output with 0 covers them. Each index is pushed and popped at most once, so the sweep is O(N) even though it contains a while loop.',
        steps: [
          'Fill the output with 0 and create an empty stack of indices.',
          'For each index i: while the stack is non-empty and the temperature at its top index is strictly less than temperatures[i], pop that index and set its answer to i minus it.',
          'Push i.',
          'Return the output.',
        ],
        js: 'function dailyTemperatures(temperatures) {\n  const out = new Array(temperatures.length).fill(0);\n  const stack = [];\n  for (let i = 0; i < temperatures.length; i++) {\n    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {\n      const day = stack.pop();\n      out[day] = i - day;\n    }\n    stack.push(i);\n  }\n  return out;\n}',
        py: 'def daily_temperatures(temperatures):\n    out = [0] * len(temperatures)\n    stack = []\n    for i, temp in enumerate(temperatures):\n        while stack and temperatures[stack[-1]] < temp:\n            day = stack.pop()\n            out[day] = i - day\n        stack.append(i)\n    return out',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { temperatures: [73, 74, 75, 71, 69, 72, 76, 73] }, expect: [1, 1, 4, 2, 1, 1, 0, 0], explanation: 'Day 2 (75) waits four days for 76. The last two days never warm up.' },
        { payload: { temperatures: [30, 40, 50, 60] }, expect: [1, 1, 1, 0], explanation: 'Strictly increasing, so each day is answered by the next one.' },
        { payload: { temperatures: [30, 60, 90] }, expect: [1, 1, 0], explanation: 'Large jumps change nothing — only the ordering matters, not the size of the gap in temperature.' },
        { payload: { temperatures: [90, 80, 70] }, expect: [0, 0, 0], explanation: 'Strictly decreasing, so nothing is ever answered and the whole array ends on the stack.' },
      ],
      cases: [
        { payload: { temperatures: [50] }, label: 'single day' },
        { payload: { temperatures: [50, 50] }, label: 'equal temperatures do not count as warmer' },
        { payload: { temperatures: [50, 50, 50, 51] }, label: 'flat run resolved by one warmer day' },
        { payload: { temperatures: [100, 30] }, label: 'constraint boundary values' },
        { payload: { temperatures: [30, 100] }, label: 'boundary values ascending' },
        { payload: { temperatures: [80, 70, 60, 50, 90] }, label: 'long cold run resolved at the end' },
        { payload: { temperatures: [55, 38, 53, 81, 61, 93, 97, 32, 43, 78] }, label: 'no obvious pattern' },
        { payload: { temperatures: [40, 41, 40, 41, 40, 41] }, label: 'alternating pattern' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'remove-k-digits',
      title: 'Remove K Digits',
      difficulty: 'Medium',
      tags: ['monotonic-stack', 'greedy', 'strings'],
      companies: ['Google', 'Amazon', 'Snapchat'],
      description:
        'Given a string `num` representing a non-negative integer and an integer `k`, remove exactly `k` digits so that the remaining number is as **small as possible**. Return it as a string without leading zeros, using `"0"` if everything is removed.\n\nThe order of the remaining digits cannot change — you are deleting, not rearranging. This is the monotonic stack used for a decision rather than a lookup: a digit is removed at the moment it is shown to be bigger than the digit that follows it.',
      analogy:
        'Editing a price tag down by peeling off digits without reordering them. Peeling a digit that is larger than the one behind it always lowers the number, because the smaller digit moves up into a more significant place.',
      constraints: [
        '1 <= num.length <= 10^5',
        'num consists of digits only and has no leading zeros unless it is exactly "0"',
        '0 <= k <= num.length',
      ],
      edgeCases: [
        'k equals the length — everything is removed and the answer is "0"',
        'k = 0 — the input is returned unchanged',
        'Digits already in ascending order, where the removals must come from the end',
        'Leading zeros appearing after removal, which must be stripped',
        'All digits identical, where any k removals give the same result',
        'A result that is entirely zeros, which must collapse to "0"',
      ],
      hints: [
        'Think about the leftmost place you can improve. If a digit is larger than the digit right after it, what happens to the number when you delete it?',
        'Deleting it makes the number smaller, because a smaller digit moves into a more significant position. So repeatedly delete the leftmost digit that is bigger than its successor.',
        'A stack does this in one pass: push digits, and before pushing, pop while the top is greater than the incoming digit and you still have removals left.',
        'If removals remain after the sweep, the digits are non-decreasing, so the smallest result comes from dropping them off the end.',
        'Finally strip leading zeros, and if nothing is left return "0".',
      ],
      brute: {
        name: 'Repeatedly Delete the First Descent',
        summary: 'Run k passes, each removing the first digit that is greater than the digit after it, or the last digit if there is none.',
        intuition:
          'The greedy fact is local: if some digit exceeds its successor, deleting that digit lowers the number, and the earliest such digit gives the biggest improvement because it sits in the most significant place. If no digit exceeds its successor the string is non-decreasing, and then the smallest result comes from removing the final digit.\n\nApplying that rule k times is obviously correct and easy to check by hand. It is O(N*k) because each pass rescans from the start — up to 10^10 steps at the constraint limits — but it is the specification the stack version compresses into one pass.',
        steps: [
          'Repeat k times:',
          'Scan for the first index whose digit is greater than the next digit.',
          'Remove that digit, or the last digit if the string is non-decreasing.',
          'Strip leading zeros and return "0" if nothing remains.',
        ],
        js: 'function removeKdigits(num, k) {\n  let digits = num;\n  for (let round = 0; round < k; round++) {\n    let cut = digits.length - 1;\n    for (let i = 0; i + 1 < digits.length; i++) {\n      if (digits[i] > digits[i + 1]) { cut = i; break; }\n    }\n    digits = digits.slice(0, cut) + digits.slice(cut + 1);\n  }\n  const trimmed = digits.replace(/^0+/, "");\n  return trimmed === "" ? "0" : trimmed;\n}',
        py: 'def remove_kdigits(num, k):\n    digits = num\n    for _ in range(k):\n        cut = len(digits) - 1\n        for i in range(len(digits) - 1):\n            if digits[i] > digits[i + 1]:\n                cut = i\n                break\n        digits = digits[:cut] + digits[cut + 1:]\n    trimmed = digits.lstrip("0")\n    return trimmed if trimmed else "0"',
        time: 'O(N*k)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Monotonic Stack with a Removal Budget',
        summary: 'Sweep once, popping a larger digit whenever a smaller one arrives and the budget allows, then trim.',
        intuition:
          'The brute force keeps rescanning for descents. A stack finds them incrementally: hold the digits kept so far, and when a new digit arrives, any kept digit larger than it is a descent that should be removed — so pop it and spend one removal. Keep popping while the top is larger and budget remains, then push the new digit. The stack ends up non-decreasing, which is the shape of the smallest achievable number.\n\nThree finishing details, each of which is a wrong answer if skipped:\n\n1. **Unused budget.** If removals remain, no descent was left, so the kept digits are non-decreasing. Removing from the end is then optimal, because the last digit is the largest in the least significant position. Drop the final `k` remaining digits.\n2. **Leading zeros.** Popping can expose zeros at the front — "10200" with k=1 becomes "0200" — and the result must be a normal number, so strip them.\n3. **Empty result.** If everything is stripped or removed, return "0" rather than an empty string.\n\nEach digit is pushed once and popped at most once, so the sweep is O(N) regardless of k.',
        steps: [
          'Create an empty stack and set the remaining budget to k.',
          'For each digit: while the budget is positive and the stack top is greater than this digit, pop and decrement the budget.',
          'Push the digit.',
          'Drop the last `budget` digits if any budget remains.',
          'Join, strip leading zeros, and return "0" if the result is empty.',
        ],
        js: 'function removeKdigits(num, k) {\n  const stack = [];\n  let budget = k;\n  for (const digit of num) {\n    while (budget > 0 && stack.length > 0 && stack[stack.length - 1] > digit) {\n      stack.pop();\n      budget--;\n    }\n    stack.push(digit);\n  }\n  const kept = stack.slice(0, stack.length - budget);\n  const trimmed = kept.join("").replace(/^0+/, "");\n  return trimmed === "" ? "0" : trimmed;\n}',
        py: 'def remove_kdigits(num, k):\n    stack = []\n    budget = k\n    for digit in num:\n        while budget > 0 and stack and stack[-1] > digit:\n            stack.pop()\n            budget -= 1\n        stack.append(digit)\n    kept = stack[:len(stack) - budget] if budget else stack\n    trimmed = "".join(kept).lstrip("0")\n    return trimmed if trimmed else "0"',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { num: '1432219', k: 3 }, expect: '1219', explanation: 'Remove 4, 3 and 2 — each is larger than the digit that follows it — leaving 1219.' },
        { payload: { num: '10200', k: 1 }, expect: '200', explanation: 'Removing the 1 exposes a leading zero, which must be stripped.' },
        { payload: { num: '10', k: 2 }, expect: '0', explanation: 'Every digit is removed, and the answer is the string "0" rather than an empty string.' },
        { payload: { num: '112', k: 1 }, expect: '11', explanation: 'Already non-decreasing, so no descent exists and the removal comes off the end.' },
      ],
      cases: [
        { payload: { num: '9', k: 1 }, label: 'remove the only digit' },
        { payload: { num: '9', k: 0 }, label: 'nothing to remove' },
        { payload: { num: '1234567890', k: 9 }, label: 'trailing zero becomes the whole answer' },
        { payload: { num: '100', k: 1 }, label: 'result is all zeros and must collapse' },
        { payload: { num: '10001', k: 4 }, label: 'zeros throughout, single digit left' },
        { payload: { num: '5555555', k: 3 }, label: 'all digits identical' },
        { payload: { num: '987654321', k: 4 }, label: 'strictly descending' },
        { payload: { num: '123456789', k: 4 }, label: 'strictly ascending, removals from the end' },
        { payload: { num: '4321098765', k: 5 }, label: 'descent then ascent with a zero crossing' },
      ],
    },
  ],
};
