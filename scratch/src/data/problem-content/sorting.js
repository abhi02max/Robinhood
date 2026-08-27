// Sorting — Production Problem Content
export const sortingContent = {
'ss1': {
  description: 'Given an array of integers nums, sort the array in ascending order and return it. You must solve the problem without using any built-in functions in O(n log(n)) time complexity and with the smallest space complexity possible.',
  intuition: 'Since we need O(n log n) time and minimal space, we can use Merge Sort or Quick Sort. Merge Sort guarantees O(n log n) time but uses O(n) space. Quick Sort uses O(log n) space but worst-case time is O(n^2), although randomized pivot makes it O(n log n) average.',
  approaches: [
    { name: 'Merge Sort', complexity: { time: 'O(n log n)', space: 'O(n)' }, description: 'Divide the array into two halves, sort them recursively, and then merge the two sorted halves.', pseudocode: 'def mergeSort(arr):\n  if len(arr) <= 1: return arr\n  mid = len(arr)//2\n  L = mergeSort(arr[:mid])\n  R = mergeSort(arr[mid:])\n  return merge(L, R)' }
  ],
  dryRun: { input: '[5,2,3,1]', steps: [
    { step: 1, state: 'Split: [5,2] and [3,1]', action: 'Recursively sort halves' },
    { step: 2, state: 'Split [5,2]: [5] and [2]', action: 'Merge to [2,5]' },
    { step: 3, state: 'Split [3,1]: [3] and [1]', action: 'Merge to [1,3]' },
    { step: 4, state: 'Merge [2,5] and [1,3]', action: 'Result: [1,2,3,5]' }
  ]},
  edgeCases: [
    { case: 'Array is already sorted', explanation: 'Works as expected, still takes O(n log n).' },
    { case: 'Array has duplicate elements', explanation: 'Merge sort is stable and handles duplicates correctly.' },
    { case: 'Empty array or single element', explanation: 'Returns immediately.' }
  ],
  visibleTests: [
    { input: { nums: [5,2,3,1] }, expected: [1,2,3,5], note: 'Basic test' },
    { input: { nums: [5,1,1,2,0,0] }, expected: [0,0,1,1,2,5], note: 'With duplicates' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 50000 } },
  patternExplanation: { pattern: 'Divide and Conquer', why: 'Sorting problems fundamentally rely on breaking the problem down into smaller sorted subproblems.', related: ['a12'] },
  visualDiagram: '    [5, 2, 3, 1]\n   /          \\\n [5, 2]      [3, 1]\n /   \\       /    \\\n[5]  [2]   [3]   [1]\n \\   /       \\    /\n [2, 5]      [1, 3]\n   \\          /\n   [1, 2, 3, 5]',
  examples: [
    { input: 'nums = [5,2,3,1]', output: '[1,2,3,5]', explanation: 'Sorted array.' }
  ],
  constraints: ['1 <= nums.length <= 50000', '-50000 <= nums[i] <= 50000']
},

'ss2': {
  description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
  intuition: 'If we sort the intervals by their start times, overlapping intervals will be adjacent. We can build the merged list by comparing the start of the current interval with the end of the last merged interval.',
  approaches: [
    { name: 'Sort and Merge (Optimal)', complexity: { time: 'O(n log n)', space: 'O(n)' }, description: 'Sort intervals by start time. Iterate through, merging if start <= previous_end.', pseudocode: 'intervals.sort(key=lambda x: x[0])\nmerged = []\nfor interval in intervals:\n  if not merged or merged[-1][1] < interval[0]:\n    merged.append(interval)\n  else:\n    merged[-1][1] = max(merged[-1][1], interval[1])\nreturn merged' }
  ],
  dryRun: { input: 'intervals=[[1,3],[2,6],[8,10],[15,18]]', steps: [
    { step: 1, state: 'Sort', action: 'Already sorted.' },
    { step: 2, state: 'Add [1,3]', action: 'merged=[[1,3]]' },
    { step: 3, state: 'Check [2,6]', action: '2 <= 3. Merge: [1, max(3,6)] -> merged=[[1,6]]' },
    { step: 4, state: 'Check [8,10]', action: '8 > 6. No overlap. merged=[[1,6], [8,10]]' },
    { step: 5, state: 'Check [15,18]', action: '15 > 10. No overlap. merged=[[1,6], [8,10], [15,18]] ✓' }
  ]},
  edgeCases: [
    { case: 'Single interval', explanation: 'Returns the interval itself.' },
    { case: 'Fully contained intervals', explanation: 'max() handles it.' },
    { case: 'Touching intervals (e.g. [1,4],[4,5])', explanation: 'They overlap, so they merge.' }
  ],
  visibleTests: [
    { input: { intervals: [[1,3],[2,6],[8,10],[15,18]] }, expected: [[1,6],[8,10],[15,18]], note: 'Classic case' },
    { input: { intervals: [[1,4],[4,5]] }, expected: [[1,5]], note: 'Touching' }
  ],
  hiddenTestConfig: { generator: 'intervals', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Interval Merging', why: 'Sorting by start time guarantees that any overlaps must be with the immediately preceding interval in the sorted list.', related: ['ss3'] },
  visualDiagram: '1---3\n  2-----6\n          8--10\n                 15---18\nMerged:\n1-------6\n          8--10\n                 15---18',
  examples: [
    { input: 'intervals=[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]', explanation: 'Intervals [1,3] and [2,6] overlap.' }
  ],
  constraints: ['1 <= intervals.length <= 10^4', 'intervals[i].length == 2', '0 <= starti <= endi <= 10^4']
},

'ss3': {
  description: 'You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] represent the start and the end of the ith interval and intervals is sorted in ascending order by starti. You are also given an interval newInterval = [start, end] that represents the start and end of another interval. Insert newInterval into intervals such that intervals is still sorted in ascending order by starti and intervals still does not have any overlapping intervals (merge overlapping intervals if necessary).',
  intuition: 'Since the intervals are already sorted and disjoint, we can linearly scan the list. Add intervals that end before the new interval starts. Merge overlapping intervals into the new interval. Finally, add intervals that start after the new interval ends.',
  approaches: [
    { name: 'Linear Scan (Optimal)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Add left disjoints, merge overlaps, add right disjoints.', pseudocode: 'res = []\ni = 0\nwhile i < len(intervals) and intervals[i][1] < newInterval[0]:\n  res.append(intervals[i]); i += 1\nwhile i < len(intervals) and intervals[i][0] <= newInterval[1]:\n  newInterval[0] = min(newInterval[0], intervals[i][0])\n  newInterval[1] = max(newInterval[1], intervals[i][1])\n  i += 1\nres.append(newInterval)\nwhile i < len(intervals):\n  res.append(intervals[i]); i += 1\nreturn res' }
  ],
  dryRun: { input: 'intervals=[[1,3],[6,9]], newInterval=[2,5]', steps: [
    { step: 1, state: 'Check [1,3]', action: '3 >= 2. It overlaps! newInterval=[min(1,2), max(3,5)] = [1,5]' },
    { step: 2, state: 'Check [6,9]', action: '6 > 5. No overlap. Append merged [1,5].' },
    { step: 3, state: 'Append rest', action: 'Append [6,9]. Result: [[1,5], [6,9]] ✓' }
  ]},
  edgeCases: [
    { case: 'Empty intervals', explanation: 'Return [newInterval].' },
    { case: 'New interval comes first', explanation: 'Add newInterval, then add rest.' },
    { case: 'New interval comes last', explanation: 'Add rest, then add newInterval.' }
  ],
  visibleTests: [
    { input: { intervals: [[1,3],[6,9]], newInterval: [2,5] }, expected: [[1,5],[6,9]], note: 'Basic merge' },
    { input: { intervals: [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval: [4,8] }, expected: [[1,2],[3,10],[12,16]], note: 'Merge multiple' }
  ],
  hiddenTestConfig: { generator: 'intervals', constraints: { minLen: 0, maxLen: 10^4 } },
  patternExplanation: { pattern: 'Interval Insertion', why: 'The sorted disjoint property allows O(n) greedy insertion without resorting.', related: ['ss2'] },
  visualDiagram: '1-2   3---5   6-7   8---10     12----16\n        4-------8  (new)\n\nMerge 3-5, 6-7, 8-10 with 4-8:\nNew is min(3,4) to max(10,8) -> 3-10.\nResult:\n1-2   3---------10             12----16',
  examples: [
    { input: 'intervals=[[1,3],[6,9]], newInterval=[2,5]', output: '[[1,5],[6,9]]', explanation: 'Merges with [1,3]' }
  ],
  constraints: ['0 <= intervals.length <= 10^4', 'intervals[i].length == 2', '0 <= starti <= endi <= 10^5', 'intervals is sorted by starti in ascending order.', 'newInterval.length == 2', '0 <= start <= end <= 10^5']
}
};

