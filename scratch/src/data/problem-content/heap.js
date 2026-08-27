// Heap / Priority Queue — Production Problem Content
export const heapContent = {
'hp1': {
  description: 'Given an integer array nums and an integer k, return the kth largest element in the array. Note that it is the kth largest element in sorted order, not the kth distinct element.',
  intuition: 'Use a min-heap of size k. After processing all elements, the root of the heap is the kth largest. Alternatively, use Quickselect for average O(n).',
  approaches: [
    { name: 'Sort', complexity: { time: 'O(n log n)', space: 'O(1)' }, description: 'Sort descending, return element at index k-1.', pseudocode: 'sort(nums, reverse=True)\nreturn nums[k-1]' },
    { name: 'Min-Heap of Size K', complexity: { time: 'O(n log k)', space: 'O(k)' }, description: 'Maintain a min-heap of size k. For each element, if it\'s larger than heap root, replace root.', pseudocode: 'heap = MinHeap()\nfor num in nums:\n  heap.push(num)\n  if heap.size > k: heap.pop()\nreturn heap.top()' },
    { name: 'Quickselect (Optimal Avg)', complexity: { time: 'O(n) avg', space: 'O(1)' }, description: 'Partition around pivot. If pivot is at position n-k, we found it. Otherwise recurse on correct side.', pseudocode: 'target = n - k\ndef quickselect(lo, hi):\n  pivot = partition(lo, hi)\n  if pivot == target: return nums[pivot]\n  elif pivot < target: return quickselect(pivot+1, hi)\n  else: return quickselect(lo, pivot-1)' },
  ],
  dryRun: { input: 'nums=[3,2,1,5,6,4], k=2', steps: [
    { step: 1, state: 'Min-heap, k=2', action: 'Process: 3→heap=[3], 2→heap=[2,3]' },
    { step: 2, state: 'heap=[2,3], size=k', action: '1<2 skip. 5>2→pop 2, push 5→heap=[3,5]' },
    { step: 3, state: 'heap=[3,5]', action: '6>3→pop 3, push 6→heap=[5,6]' },
    { step: 4, state: 'heap=[5,6]', action: '4<5 skip. Answer: heap top = 5 ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[1], k=1', explanation: 'Single element — return it' },
    { case: 'nums=[3,3,3], k=2', explanation: 'Duplicates — 2nd largest is still 3' },
    { case: 'nums=[1,2,3,4,5], k=5', explanation: 'k equals array length — return minimum' },
    { case: 'nums=[-1,-2,-3], k=1', explanation: 'All negative — largest is -1' },
    { case: 'nums=[1,2,3,4,5], k=1', explanation: 'k=1 — return maximum' },
  ],
  visibleTests: [
    { input: { nums: [3,2,1,5,6,4], k: 2 }, expected: 5, note: 'Classic' },
    { input: { nums: [3,2,3,1,2,4,5,5,6], k: 4 }, expected: 4, note: 'With dups' },
    { input: { nums: [1], k: 1 }, expected: 1, note: 'Single' },
    { input: { nums: [3,3,3], k: 2 }, expected: 3, note: 'All same' },
    { input: { nums: [1,2,3,4,5], k: 5 }, expected: 1, note: 'k=n (min)' },
    { input: { nums: [1,2,3,4,5], k: 1 }, expected: 5, note: 'k=1 (max)' },
    { input: { nums: [-1,-2,-3], k: 1 }, expected: -1, note: 'Negatives' },
    { input: { nums: [7,6,5,4,3,2,1], k: 3 }, expected: 5, note: 'Sorted desc' },
    { input: { nums: [99,99], k: 1 }, expected: 99, note: 'Two same' },
    { input: { nums: [2,1], k: 2 }, expected: 1, note: 'Two elements' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'K-th Element via Heap/Quickselect', why: 'Finding the kth element is a selection problem. A min-heap of size k gives O(n log k) — better than sorting when k << n. Quickselect gives average O(n) but worst case O(n²). Both are fundamental to "top K" problems.', related: ['hp2','hp3','hp5'] },
  visualDiagram: 'nums = [3, 2, 1, 5, 6, 4], k=2\n\nMin-Heap (size 2):\nAfter 3:  [3]\nAfter 2:  [2, 3]\nAfter 1:  [2, 3]  (1 < root, skip)\nAfter 5:  [3, 5]  (pop 2, push 5)\nAfter 6:  [5, 6]  (pop 3, push 6)\nAfter 4:  [5, 6]  (4 < root, skip)\n\nHeap root = 5 = 2nd largest ✓',
  examples: [
    { input: 'nums=[3,2,1,5,6,4], k=2', output: '5', explanation: 'Sorted: [6,5,4,3,2,1], 2nd = 5' },
    { input: 'nums=[3,2,3,1,2,4,5,5,6], k=4', output: '4', explanation: 'Sorted desc: [6,5,5,4,...], 4th = 4' },
  ],
  constraints: ['1 ≤ k ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
},

'hp3': {
  description: 'The median is the middle value in an ordered list. Design a data structure that supports addNum(num) and findMedian(). If the list has even size, median is the average of the two middle values.',
  intuition: 'Use two heaps: a max-heap for the lower half and a min-heap for the upper half. The median is at the tops of these heaps. Balance the heaps so they differ in size by at most 1.',
  approaches: [
    { name: 'Two Heaps (Optimal)', complexity: { time: 'O(log n) add, O(1) find', space: 'O(n)' }, description: 'Max-heap stores smaller half, min-heap stores larger half. Median is top of max-heap (odd) or average of both tops (even).', pseudocode: 'addNum(num):\n  maxHeap.push(num)\n  minHeap.push(maxHeap.pop())\n  if minHeap.size > maxHeap.size:\n    maxHeap.push(minHeap.pop())\n\nfindMedian():\n  if maxHeap.size > minHeap.size:\n    return maxHeap.top()\n  return (maxHeap.top() + minHeap.top()) / 2' },
  ],
  dryRun: { input: 'addNum(1), addNum(2), findMedian(), addNum(3), findMedian()', steps: [
    { step: 1, state: 'add(1): maxH=[1], minH=[]', action: 'Median would be 1' },
    { step: 2, state: 'add(2): maxH=[1], minH=[2]', action: 'Balanced' },
    { step: 3, state: 'findMedian()', action: '(1+2)/2 = 1.5 ✓' },
    { step: 4, state: 'add(3): maxH=[2,1], minH=[3]', action: 'maxH has extra' },
    { step: 5, state: 'findMedian()', action: 'maxH.top = 2 ✓' },
  ]},
  edgeCases: [
    { case: 'Single element', explanation: 'Median is that element' },
    { case: 'Two elements', explanation: 'Median is average' },
    { case: 'All same values', explanation: 'Median is that value' },
    { case: 'Negative numbers', explanation: 'Works the same — heaps handle negatives' },
    { case: 'Large stream (10⁵ elements)', explanation: 'O(log n) per insertion, constant median query' },
  ],
  visibleTests: [
    { input: { operations: ['add(1)','add(2)','median','add(3)','median'] }, expected: [null,null,1.5,null,2.0], note: 'Classic' },
    { input: { operations: ['add(5)','median'] }, expected: [null,5.0], note: 'Single' },
    { input: { operations: ['add(1)','add(1)','median'] }, expected: [null,null,1.0], note: 'Duplicates' },
    { input: { operations: ['add(3)','add(1)','add(2)','median'] }, expected: [null,null,null,2.0], note: 'Unsorted' },
    { input: { operations: ['add(-1)','add(-2)','median'] }, expected: [null,null,-1.5], note: 'Negatives' },
    { input: { operations: ['add(1)','add(2)','add(3)','add(4)','median'] }, expected: [null,null,null,null,2.5], note: 'Even count' },
    { input: { operations: ['add(6)','add(10)','add(2)','add(6)','median'] }, expected: [null,null,null,null,6.0], note: 'Dup in middle' },
    { input: { operations: ['add(0)','median'] }, expected: [null,0.0], note: 'Zero' },
    { input: { operations: ['add(1)','add(2)','add(3)','add(4)','add(5)','median'] }, expected: [null,null,null,null,null,3.0], note: 'Odd count' },
    { input: { operations: ['add(100)','add(-100)','median'] }, expected: [null,null,0.0], note: 'Wide range' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 50000 } },
  patternExplanation: { pattern: 'Two Heaps (Median Maintenance)', why: 'Maintaining the median of a stream requires O(1) access to the middle elements. Two heaps split the data into lower and upper halves, keeping the median at the boundary. This pattern extends to any "running median" or "balanced partition" problem.', related: ['hp1','hp4'] },
  visualDiagram: 'Stream: 5, 2, 8, 1, 4\n\nAfter 5:  maxH=[5]        minH=[]       median=5\nAfter 2:  maxH=[2]        minH=[5]      median=3.5\nAfter 8:  maxH=[5,2]      minH=[8]      median=5\nAfter 1:  maxH=[2,1]      minH=[5,8]    median=3.5\nAfter 4:  maxH=[4,2,1]    minH=[5,8]    median=4\n\n  maxHeap (lower half)  |  minHeap (upper half)\n       [4]              |       [5]\n      / \\               |      /\n    [2] [1]             |    [8]\n         median = max of left = 4',
  examples: [
    { input: 'addNum(1), addNum(2), findMedian()', output: '1.5', explanation: 'Two elements, average' },
    { input: 'addNum(1), addNum(2), addNum(3), findMedian()', output: '2.0', explanation: 'Middle element' },
  ],
  constraints: ['-10⁵ ≤ num ≤ 10⁵', 'At most 5×10⁴ calls to addNum and findMedian', 'findMedian called only after at least one addNum'],
},

'hp2': {
  description: 'Given an integer array nums and an integer k, return the kth largest element in the array. Note that it is the kth largest element in the sorted order, not the kth distinct element.',
  intuition: 'We can use a Min-Heap of size k. As we iterate through the array, we push elements into the heap. If the heap size exceeds k, we pop the smallest element. At the end, the heap contains the k largest elements, and the top of the Min-Heap is the kth largest.',
  approaches: [
    { name: 'Min-Heap (Optimal)', complexity: { time: 'O(n log k)', space: 'O(k)' }, description: 'Maintain a min-heap of size k.', pseudocode: 'heap = []\nfor num in nums:\n  heap.push(num)\n  if len(heap) > k: heap.pop()\nreturn heap[0]' },
    { name: 'Quickselect', complexity: { time: 'O(n) avg, O(n^2) worst', space: 'O(1)' }, description: 'Use quicksort partitioning to find the kth largest.', pseudocode: 'def quickselect(l, r, k_smallest):\n  pivot = partition(l, r)\n  if pivot == k_smallest: return nums[pivot]\n  elif pivot > k_smallest: return quickselect(l, pivot-1, k_smallest)\n  else: return quickselect(pivot+1, r, k_smallest)' }
  ],
  dryRun: { input: 'nums=[3,2,1,5,6,4], k=2', steps: [
    { step: 1, state: 'num=3', action: 'heap=[3]' },
    { step: 2, state: 'num=2', action: 'heap=[2,3]' },
    { step: 3, state: 'num=1', action: 'heap=[1,2,3] -> pop -> heap=[2,3]' },
    { step: 4, state: 'num=5', action: 'heap=[2,3,5] -> pop -> heap=[3,5]' },
    { step: 5, state: 'num=6', action: 'heap=[3,5,6] -> pop -> heap=[5,6]' },
    { step: 6, state: 'num=4', action: 'heap=[4,5,6] -> pop -> heap=[5,6]' },
    { step: 7, state: 'End', action: 'Return heap[0] = 5 ✓' }
  ]},
  edgeCases: [
    { case: 'k == 1', explanation: 'Returns the maximum element.' },
    { case: 'k == len(nums)', explanation: 'Returns the minimum element.' }
  ],
  visibleTests: [
    { input: { nums: [3,2,1,5,6,4], k: 2 }, expected: 5, note: 'Basic' },
    { input: { nums: [3,2,3,1,2,4,5,5,6], k: 4 }, expected: 4, note: 'With duplicates' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Top K Elements', why: 'A min-heap of size K is the standard way to find the top K largest elements in a stream or array.', related: ['hp1', 'hp3'] },
  visualDiagram: 'nums: 3 2 1 5 6 4\nHeap (k=2):\n[3] -> [2,3] -> [3,5] -> [5,6] -> [5,6]\nTop is 5.',
  examples: [
    { input: 'nums=[3,2,1,5,6,4], k=2', output: '5', explanation: 'Sorted: [1,2,3,4,5,6]. 2nd largest is 5.' }
  ],
  constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4']
},

'hp4': {
  description: 'The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value, and the median is the mean of the two middle values. Implement the MedianFinder class.',
  intuition: 'Maintain two heaps: a Max-Heap for the smaller half of the numbers, and a Min-Heap for the larger half. Keep them balanced so the size difference is at most 1. The median is either the top of the larger heap or the average of both tops.',
  approaches: [
    { name: 'Two Heaps (Optimal)', complexity: { time: 'O(log n) add, O(1) find', space: 'O(n)' }, description: 'Use two heaps. Balance them after every insertion.', pseudocode: 'class MedianFinder:\n  def addNum(num):\n    if max_heap and num <= -max_heap[0]: max_heap.push(-num)\n    else: min_heap.push(num)\n    balance_heaps()\n  def findMedian():\n    if len(max_heap) > len(min_heap): return -max_heap[0]\n    if len(min_heap) > len(max_heap): return min_heap[0]\n    return (-max_heap[0] + min_heap[0]) / 2' }
  ],
  dryRun: { input: 'add(1), add(2), find(), add(3), find()', steps: [
    { step: 1, state: 'add(1)', action: 'max_heap=[1], min_heap=[]' },
    { step: 2, state: 'add(2)', action: 'max_heap=[1], min_heap=[2]' },
    { step: 3, state: 'find()', action: '(1+2)/2 = 1.5' },
    { step: 4, state: 'add(3)', action: 'min_heap=[2,3], max_heap=[1] -> balance -> min_heap=[3], max_heap=[1,2]' },
    { step: 5, state: 'find()', action: 'Return top of max_heap = 2' }
  ]},
  edgeCases: [
    { case: 'All same numbers', explanation: 'Heaps balance naturally.' },
    { case: 'Negative numbers', explanation: 'Supported since comparison works exactly the same.' }
  ],
  visibleTests: [
    { input: { ops: ["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"], args: [[],[1],[2],[],[3],[]] }, expected: [null,null,null,1.5,null,2.0], note: 'Basic' }
  ],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 1, maxLen: 50000 } },
  patternExplanation: { pattern: 'Two Heaps', why: 'When we need dynamic access to the median of a dataset, maintaining two halves of the data with heaps provides O(1) access and O(log n) updates.', related: ['sw6'] },
  visualDiagram: 'Stream: 1, 2, 3\nMaxHeap (Small half) | MinHeap (Large half)\n[1]                  | []\n[1]                  | [2]     -> median 1.5\n[1, 2]               | [3]     -> median 2.0',
  examples: [
    { input: 'add(1), add(2), findMedian()', output: '1.5', explanation: '(1+2)/2 = 1.5' }
  ],
  constraints: ['-10^5 <= num <= 10^5', 'There will be at least one element in the data structure before calling findMedian.']
},

'hp5': {
  description: 'Given an array of points where points[i] = [xi, yi] represents a point on the X-Y plane and an integer k, return the k closest points to the origin (0, 0). The distance is the Euclidean distance.',
  intuition: 'We need the "k smallest" distances. A Max-Heap of size k is perfect for this. We push points with their distances into the max-heap. If the heap size exceeds k, we pop the maximum distance. What\'s left are the k smallest distances.',
  approaches: [
    { name: 'Max-Heap of size K (Optimal)', complexity: { time: 'O(N log K)', space: 'O(K)' }, description: 'Use a max-heap to keep track of the k closest points seen so far.', pseudocode: 'heap = []\nfor x, y in points:\n  dist = x*x + y*y\n  heap.push((-dist, x, y))\n  if len(heap) > k: heap.pop()\nreturn [[x, y] for _, x, y in heap]' },
    { name: 'Quickselect', complexity: { time: 'O(N) avg', space: 'O(1)' }, description: 'Partition the points array based on distance until the pivot is at index k.', pseudocode: 'def quickselect(l, r, k):\n  pivot_idx = partition(l, r)\n  if pivot_idx == k: return\n  elif pivot_idx < k: quickselect(pivot_idx+1, r, k)\n  else: quickselect(l, pivot_idx-1, k)' }
  ],
  dryRun: { input: 'points=[[3,3],[5,-1],[-2,4]], k=2', steps: [
    { step: 1, state: '[3,3]', action: 'dist=18. heap=[(-18, 3, 3)]' },
    { step: 2, state: '[5,-1]', action: 'dist=26. heap=[(-18, 3, 3), (-26, 5, -1)] (ordered by max dist at top)' },
    { step: 3, state: '[-2,4]', action: 'dist=20. heap=[(-18,3,3), (-26,5,-1), (-20,-2,4)] -> pop top (-26) -> heap=[(-18,3,3), (-20,-2,4)]' },
    { step: 4, state: 'Return', action: '[[3,3], [-2,4]] ✓' }
  ]},
  edgeCases: [
    { case: 'k == len(points)', explanation: 'Returns all points.' },
    { case: 'Points with same distance', explanation: 'Order doesn\'t matter, any valid subset is accepted.' }
  ],
  visibleTests: [
    { input: { points: [[1,3],[-2,2]], k: 1 }, expected: [[-2,2]], note: 'Classic case' },
    { input: { points: [[3,3],[5,-1],[-2,4]], k: 2 }, expected: [[3,3],[-2,4]], note: 'Multiple points' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Top K Elements', why: 'Whenever we need the "K smallest" or "K largest" of something, a heap of size K is the standard approach to do it in a single pass with O(K) memory.', related: ['hp2'] },
  visualDiagram: 'Points: [3,3] (d=18), [5,-1] (d=26), [-2,4] (d=20)\nk = 2\n\nSort by distance: 18, 20, 26\nTop 2 closest: [3,3] and [-2,4]',
  examples: [
    { input: 'points=[[1,3],[-2,2]], k=1', output: '[[-2,2]]', explanation: 'Distance to [1,3] is sqrt(10). Distance to [-2,2] is sqrt(8). [-2,2] is closer.' }
  ],
  constraints: ['1 <= k <= points.length <= 10^4', '-10^4 <= xi, yi <= 10^4']
},

'hp6': {
  description: 'Given a characters array tasks, representing the tasks a CPU needs to do, and a non-negative integer n that represents the cooldown period between two same tasks, return the least number of units of times that the CPU will take to finish all the given tasks.',
  intuition: 'We should always schedule the most frequent tasks first to ensure we don\'t end up with only one type of task at the end (which would force us to idle repeatedly). A Max-Heap can give us the most frequent available task. A queue can store tasks that are currently cooling down.',
  approaches: [
    { name: 'Max-Heap + Queue (Optimal Simulation)', complexity: { time: 'O(N)', space: 'O(1)' }, description: 'Count frequencies. Put frequencies in a max-heap. Pop one, decrement, and put it in a cooldown queue with the time it will be available. If heap is empty but queue has items, CPU is idle.', pseudocode: 'counts = Counter(tasks)\nmax_heap = [-c for c in counts.values()]\nheapq.heapify(max_heap)\ntime = 0\nq = deque() # pairs of (count_remaining, idle_until_time)\nwhile max_heap or q:\n  time += 1\n  if max_heap:\n    cnt = 1 + heapq.heappop(max_heap)\n    if cnt:\n      q.append((cnt, time + n))\n  if q and q[0][1] == time:\n    heapq.heappush(max_heap, q.popleft()[0])\nreturn time' }
  ],
  dryRun: { input: 'tasks=["A","A","A","B","B","B"], n=2', steps: [
    { step: 1, state: 'time=1', action: 'Pop A (rem 2). q=[(2, time+2=3)].' },
    { step: 2, state: 'time=2', action: 'Pop B (rem 2). q=[(2, 3), (2, 4)].' },
    { step: 3, state: 'time=3', action: 'Heap empty. CPU idles. q[0] is ready, push A (rem 2) to heap.' },
    { step: 4, state: 'time=4', action: 'Pop A (rem 1). q[0] ready, push B. q=[(1, 6)].' },
    { step: 5, state: 'Continue...', action: 'Total time is 8. ✓' }
  ]},
  edgeCases: [
    { case: 'n = 0', explanation: 'No cooldown, time is just length of tasks.' },
    { case: 'All same tasks', explanation: 'Massive idling. Handled correctly by queue.' }
  ],
  visibleTests: [
    { input: { tasks: ["A","A","A","B","B","B"], n: 2 }, expected: 8, note: 'Classic case' },
    { input: { tasks: ["A","A","A","B","B","B"], n: 0 }, expected: 6, note: 'No cooldown' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Scheduling with Cooldown (Heap + Queue)', why: 'When scheduling with constraints, a heap gets the greedy optimal next item, and a queue manages the temporal constraint (cooldown).', related: ['hp7'] },
  visualDiagram: 'n = 2\nA -> B -> idle -> A -> B -> idle -> A -> B\nTime: 1, 2, 3, 4, 5, 6, 7, 8',
  examples: [
    { input: 'tasks=["A","A","A","B","B","B"], n=2', output: '8', explanation: 'A -> B -> idle -> A -> B -> idle -> A -> B' }
  ],
  constraints: ['1 <= task.length <= 10^4', 'tasks[i] is upper-case English letter.', 'The integer n is in the range [0, 100].']
}
};


