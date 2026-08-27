// Binary Search — Production Problem Content
export const binarySearchContent = {
'bs1': {
  description: 'Given an array of integers nums sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.',
  intuition: 'Classic binary search: compare target with middle element. If equal, found. If target < mid, search left half. If target > mid, search right half. Halve the search space each step.',
  approaches: [
    { name: 'Binary Search (Optimal)', complexity: { time: 'O(log n)', space: 'O(1)' }, description: 'Maintain lo and hi pointers. Compute mid, compare, narrow range.', pseudocode: 'lo, hi = 0, n-1\nwhile lo <= hi:\n  mid = (lo+hi)//2\n  if nums[mid] == target: return mid\n  elif nums[mid] < target: lo = mid+1\n  else: hi = mid-1\nreturn -1' },
  ],
  dryRun: { input: 'nums=[-1,0,3,5,9,12], target=9', steps: [
    { step: 1, state: 'lo=0, hi=5, mid=2, nums[2]=3', action: '9>3 → lo=3' },
    { step: 2, state: 'lo=3, hi=5, mid=4, nums[4]=9', action: '9==9 → return 4 ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[-1,0,5], target=5', explanation: 'Target at end' },
    { case: 'nums=[5], target=5', explanation: 'Single element match' },
    { case: 'nums=[5], target=-5', explanation: 'Single element no match' },
    { case: 'nums=[], target=0', explanation: 'Empty array — return -1' },
    { case: 'nums=[2,5], target=0', explanation: 'Target less than all elements' },
  ],
  visibleTests: [
    { input: { nums: [-1,0,3,5,9,12], target: 9 }, expected: 4, note: 'Found at 4' },
    { input: { nums: [-1,0,3,5,9,12], target: 2 }, expected: -1, note: 'Not found' },
    { input: { nums: [5], target: 5 }, expected: 0, note: 'Single match' },
    { input: { nums: [5], target: -5 }, expected: -1, note: 'Single no match' },
    { input: { nums: [1,2,3,4,5], target: 1 }, expected: 0, note: 'First element' },
    { input: { nums: [1,2,3,4,5], target: 5 }, expected: 4, note: 'Last element' },
    { input: { nums: [1,2,3,4,5], target: 3 }, expected: 2, note: 'Middle' },
    { input: { nums: [1,2,3,4,5], target: 6 }, expected: -1, note: 'Beyond range' },
    { input: { nums: [-10,-5,0,5,10], target: -5 }, expected: 1, note: 'Negatives' },
    { input: { nums: [1,3,5,7,9,11,13,15], target: 11 }, expected: 5, note: 'Larger array' },
  ],
  hiddenTestConfig: { generator: 'sortedArray', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Standard Binary Search', why: 'The foundation of all binary search problems. Sorted data + O(log n) = binary search. The pattern of halving the search space applies to arrays, answer spaces, and decision problems.', related: ['bs4','bs5','bs10'] },
  visualDiagram: 'nums = [-1, 0, 3, 5, 9, 12]  target = 9\n\nStep 1: [lo=0         mid=2         hi=5]\n         -1  0  3  5  9  12\n                 ↑ 3<9 → search right\n\nStep 2:          [lo=3  mid=4  hi=5]\n                  5  9  12\n                     ↑ 9==9 → FOUND at index 4',
  examples: [
    { input: 'nums=[-1,0,3,5,9,12], target=9', output: '4', explanation: 'Found at index 4' },
    { input: 'nums=[-1,0,3,5,9,12], target=2', output: '-1', explanation: 'Not in array' },
  ],
  constraints: ['1 ≤ nums.length ≤ 10⁴', '-10⁴ < nums[i], target < 10⁴', 'All integers in nums are unique', 'nums is sorted in ascending order'],
},

'bs5': {
  description: 'There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is possibly rotated at an unknown pivot. Given target, return its index, or -1.',
  intuition: 'Modified binary search: at each step, determine which half is sorted. If target falls within the sorted half\'s range, search there. Otherwise, search the other half.',
  approaches: [
    { name: 'Modified Binary Search', complexity: { time: 'O(log n)', space: 'O(1)' }, description: 'Check which half is sorted. Determine if target is in that sorted range.', pseudocode: 'lo, hi = 0, n-1\nwhile lo <= hi:\n  mid = (lo+hi)//2\n  if nums[mid] == target: return mid\n  if nums[lo] <= nums[mid]:  # left sorted\n    if nums[lo]<=target<nums[mid]: hi=mid-1\n    else: lo=mid+1\n  else:  # right sorted\n    if nums[mid]<target<=nums[hi]: lo=mid+1\n    else: hi=mid-1\nreturn -1' },
  ],
  dryRun: { input: 'nums=[4,5,6,7,0,1,2], target=0', steps: [
    { step: 1, state: 'lo=0,hi=6,mid=3, nums[3]=7', action: 'Left sorted [4,5,6,7]. 0 not in [4,7] → lo=4' },
    { step: 2, state: 'lo=4,hi=6,mid=5, nums[5]=1', action: 'Left [0,1] sorted. 0 in [0,1] → hi=4' },
    { step: 3, state: 'lo=4,hi=4,mid=4, nums[4]=0', action: '0==0 → return 4 ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[1], target=1', explanation: 'Single element match' },
    { case: 'nums=[1], target=0', explanation: 'Single element no match' },
    { case: 'nums=[1,2,3], target=2', explanation: 'Not rotated — standard binary search' },
    { case: 'nums=[3,1,2], target=3', explanation: 'Target is at rotation point' },
    { case: 'nums=[2,1], target=1', explanation: 'Two elements, rotated' },
  ],
  visibleTests: [
    { input: { nums: [4,5,6,7,0,1,2], target: 0 }, expected: 4, note: 'Classic rotated' },
    { input: { nums: [4,5,6,7,0,1,2], target: 3 }, expected: -1, note: 'Not found' },
    { input: { nums: [1], target: 0 }, expected: -1, note: 'Single no match' },
    { input: { nums: [1], target: 1 }, expected: 0, note: 'Single match' },
    { input: { nums: [3,1], target: 1 }, expected: 1, note: 'Two elements' },
    { input: { nums: [1,3], target: 3 }, expected: 1, note: 'Not rotated' },
    { input: { nums: [5,1,2,3,4], target: 1 }, expected: 1, note: 'Rotated by 1' },
    { input: { nums: [2,3,4,5,1], target: 5 }, expected: 3, note: 'Near pivot' },
    { input: { nums: [4,5,6,7,0,1,2], target: 4 }, expected: 0, note: 'First element' },
    { input: { nums: [4,5,6,7,0,1,2], target: 2 }, expected: 6, note: 'Last element' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 5000 } },
  patternExplanation: { pattern: 'Binary Search on Rotated Array', why: 'Even in a rotated sorted array, one half is always properly sorted. By identifying the sorted half, we can determine which half to search. This "find the sorted portion" insight is the key modification to standard binary search.', related: ['bs4','bs9'] },
  visualDiagram: 'nums = [4, 5, 6, 7, 0, 1, 2]  target = 0\n\n   7\n 6 |\n 5 |         2\n 4 |       1 |\n   |     0 | |\n   └─────────┘\n   pivot here ↑\n\nStep 1: mid=7, left [4,5,6,7] sorted, 0∉[4,7] → go right\nStep 2: mid=1, left [0,1] sorted, 0∈[0,1] → go left\nStep 3: mid=0 → FOUND at index 4',
  examples: [
    { input: 'nums=[4,5,6,7,0,1,2], target=0', output: '4', explanation: 'Found in the rotated portion' },
    { input: 'nums=[4,5,6,7,0,1,2], target=3', output: '-1', explanation: 'Not in array' },
  ],
  constraints: ['1 ≤ nums.length ≤ 5000', '-10⁴ ≤ nums[i] ≤ 10⁴', 'All values are unique', 'nums is possibly rotated'],
},

'bs7': {
  description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log(min(m,n))).',
  intuition: 'Binary search on the shorter array to find a partition where all elements on the left are ≤ all elements on the right. The partition splits both arrays such that left half = right half in total count.',
  approaches: [
    { name: 'Binary Search on Partition (Optimal)', complexity: { time: 'O(log(min(m,n)))', space: 'O(1)' }, description: 'Binary search on shorter array. For each partition of nums1, compute corresponding partition of nums2.', pseudocode: 'Ensure nums1 is shorter\nlo, hi = 0, len(nums1)\nwhile lo <= hi:\n  i = (lo+hi)//2  # partition in nums1\n  j = (m+n+1)//2 - i  # partition in nums2\n  if nums1[i-1] > nums2[j]: hi=i-1\n  elif nums2[j-1] > nums1[i]: lo=i+1\n  else: found valid partition' },
  ],
  dryRun: { input: 'nums1=[1,3], nums2=[2]', steps: [
    { step: 1, state: 'Total=3, half=2', action: 'Need 2 elements on left' },
    { step: 2, state: 'Partition nums1 at 1: left=[1], right=[3]', action: 'Partition nums2 at 1: left=[2], right=[]' },
    { step: 3, state: 'Check: 1≤2 and 2≤3', action: 'Valid! Median = max(1,2) = 2 ✓' },
  ]},
  edgeCases: [
    { case: 'nums1=[1,2], nums2=[3,4]', explanation: 'Even total — median is average of two middle elements' },
    { case: 'nums1=[], nums2=[1]', explanation: 'One array empty — median of other' },
    { case: 'nums1=[1], nums2=[1]', explanation: 'Both have same element — median is 1.0' },
    { case: 'nums1=[1,2], nums2=[]', explanation: 'Second empty — median of first' },
    { case: 'nums1=[1], nums2=[2,3,4,5,6]', explanation: 'Very different sizes' },
  ],
  visibleTests: [
    { input: { nums1: [1,3], nums2: [2] }, expected: 2.0, note: 'Odd total' },
    { input: { nums1: [1,2], nums2: [3,4] }, expected: 2.5, note: 'Even total' },
    { input: { nums1: [], nums2: [1] }, expected: 1.0, note: 'One empty' },
    { input: { nums1: [1], nums2: [1] }, expected: 1.0, note: 'Same element' },
    { input: { nums1: [1,2,3], nums2: [4,5,6] }, expected: 3.5, note: 'No overlap' },
    { input: { nums1: [1,3,5], nums2: [2,4,6] }, expected: 3.5, note: 'Interleaved' },
    { input: { nums1: [1], nums2: [2,3,4,5,6] }, expected: 3.5, note: 'Size diff' },
    { input: { nums1: [0,0], nums2: [0,0] }, expected: 0.0, note: 'All zeros' },
    { input: { nums1: [1,2], nums2: [] }, expected: 1.5, note: 'Second empty' },
    { input: { nums1: [3], nums2: [-2,-1] }, expected: -1.0, note: 'Negatives' },
  ],
  hiddenTestConfig: { generator: 'sortedArray', constraints: { minLen: 0, maxLen: 1000 } },
  patternExplanation: { pattern: 'Binary Search on Answer / Partition', why: 'Instead of merging arrays (O(n+m)), we binary search for the correct partition point. This exploits the sorted property to achieve O(log(min(m,n))). The key insight is that a valid partition means all left elements ≤ all right elements across both arrays.', related: ['bs12','hp3'] },
  visualDiagram: 'nums1 = [1, 3, 8, 9, 15]\nnums2 = [7, 11, 19, 21, 25]\n\nPartition: nums1 left=[1,3,8] | nums2 left=[7,11]\n           nums1 right=[9,15] | nums2 right=[19,21,25]\n\nLeft: [1,3,7,8,11]  Right: [9,15,19,21,25]\nmax_left=11, min_right=9 → invalid\n\nAdjust partition... find valid split where\nmax(left) ≤ min(right)',
  examples: [
    { input: 'nums1=[1,3], nums2=[2]', output: '2.0', explanation: 'Merged: [1,2,3], median=2' },
    { input: 'nums1=[1,2], nums2=[3,4]', output: '2.5', explanation: 'Merged: [1,2,3,4], median=(2+3)/2=2.5' },
  ],
  constraints: ['nums1.length == m, nums2.length == n', '0 ≤ m ≤ 1000, 0 ≤ n ≤ 1000', '1 ≤ m + n ≤ 2000', '-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶'],
},

'bs2': {
  description: 'You are given an m x n integer matrix matrix with the following two properties: Each row is sorted in non-decreasing order. The first integer of each row is greater than the last integer of the previous row. Given an integer target, return true if target is in matrix or false otherwise.',
  intuition: 'Since the rows are sorted and the first element of a row is greater than the last element of the previous row, we can treat the 2D matrix as a flat 1D sorted array of length m * n and perform standard binary search.',
  approaches: [
    { name: '1D Binary Search (Optimal)', complexity: { time: 'O(log(m*n))', space: 'O(1)' }, description: 'Map 1D indices to 2D coordinates: row = idx // n, col = idx % n.', pseudocode: 'lo, hi = 0, m*n - 1\nwhile lo <= hi:\n  mid = (lo+hi)//2\n  val = matrix[mid // n][mid % n]\n  if val == target: return true\n  elif val < target: lo = mid + 1\n  else: hi = mid - 1\nreturn false' }
  ],
  dryRun: { input: 'matrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target=3', steps: [
    { step: 1, state: 'lo=0, hi=11', action: 'mid=5 -> val=11. 11 > 3 -> hi=4' },
    { step: 2, state: 'lo=0, hi=4', action: 'mid=2 -> val=5. 5 > 3 -> hi=1' },
    { step: 3, state: 'lo=0, hi=1', action: 'mid=0 -> val=1. 1 < 3 -> lo=1' },
    { step: 4, state: 'lo=1, hi=1', action: 'mid=1 -> val=3. 3 == 3 -> Found ✓' }
  ]},
  edgeCases: [
    { case: '1x1 matrix', explanation: 'Standard binary search handles it.' },
    { case: 'Target smaller than first or larger than last', explanation: 'Exits loop naturally, returns false.' }
  ],
  visibleTests: [
    { input: { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 3 }, expected: true, note: 'Found' },
    { input: { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 13 }, expected: false, note: 'Not found' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 100 } },
  patternExplanation: { pattern: 'Matrix to 1D Mapping', why: 'Mapping linear indices to 2D coordinates avoids complex row/col searches.', related: ['bs1'] },
  visualDiagram: 'Indices 0 to 11 map to:\n(0,0), (0,1), (0,2), (0,3)\n(1,0), (1,1), (1,2), (1,3)\n(2,0), (2,1), (2,2), (2,3)',
  examples: [
    { input: 'matrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target=3', output: 'true', explanation: '3 is at row 0 col 1' }
  ],
  constraints: ['m == matrix.length', 'n == matrix[i].length', '1 <= m, n <= 100', '-10^4 <= matrix[i][j], target <= 10^4']
},

'bs3': {
  description: 'Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards have gone and will come back in h hours. Koko can decide her bananas-per-hour eating speed of k. Return the minimum integer k such that she can eat all the bananas within h hours.',
  intuition: 'The minimum speed is 1, and the maximum speed is the maximum pile size. We can binary search for the speed k. For each k, we check if she can eat all bananas in h hours.',
  approaches: [
    { name: 'Binary Search on Answer', complexity: { time: 'O(n log m)', space: 'O(1)' }, description: 'Binary search the speed. m is the max pile size.', pseudocode: 'lo, hi = 1, max(piles)\nwhile lo <= hi:\n  k = (lo+hi)//2\n  hours = sum(math.ceil(p / k) for p in piles)\n  if hours <= h: hi = k - 1\n  else: lo = k + 1\nreturn lo' }
  ],
  dryRun: { input: 'piles=[3,6,7,11], h=8', steps: [
    { step: 1, state: 'lo=1, hi=11, mid(k)=6', action: 'hours = 1+1+2+2 = 6 <= 8. Try smaller k: hi=5' },
    { step: 2, state: 'lo=1, hi=5, mid(k)=3', action: 'hours = 1+2+3+4 = 10 > 8. Try larger k: lo=4' },
    { step: 3, state: 'lo=4, hi=5, mid(k)=4', action: 'hours = 1+2+2+3 = 8 <= 8. Try smaller k: hi=3' },
    { step: 4, state: 'lo=4, hi=3 -> stop', action: 'Return lo=4 ✓' }
  ]},
  edgeCases: [
    { case: 'h == len(piles)', explanation: 'Must eat at max pile size speed.' },
    { case: 'Very large h', explanation: 'Speed becomes 1.' }
  ],
  visibleTests: [
    { input: { piles: [3,6,7,11], h: 8 }, expected: 4, note: 'Classic case' },
    { input: { piles: [30,11,23,4,20], h: 5 }, expected: 30, note: 'h = len(piles)' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Binary Search on Answer Space', why: 'When the search space is monotonically ordered (if speed k works, k+1 definitely works), we can binary search the answer.', related: ['bs7'] },
  visualDiagram: 'Speeds: 1  2  3  4  5  6  ... 11\nHours: 27 15 10  8  8  6  ...  4\nWe want min speed where Hours <= 8 -> Speed 4.',
  examples: [
    { input: 'piles=[3,6,7,11], h=8', output: '4', explanation: 'Speed 4 takes 1+2+2+3 = 8 hours.' }
  ],
  constraints: ['1 <= piles.length <= 10^4', 'piles.length <= h <= 10^9', '1 <= piles[i] <= 10^9']
},

'bs4': {
  description: 'Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array. You must write an algorithm that runs in O(log n) time.',
  intuition: 'In a rotated sorted array, the minimum element is the only element that is smaller than its previous element. We can use binary search to find this inflection point. If the middle element is greater than the rightmost element, the minimum must be to its right. Otherwise, it\'s to its left (including mid).',
  approaches: [
    { name: 'Binary Search (Optimal)', complexity: { time: 'O(log N)', space: 'O(1)' }, description: 'Compare mid with right pointer. If mid > right, min is in right half. Else min is in left half.', pseudocode: 'l, r = 0, len(nums) - 1\nwhile l < r:\n  mid = l + (r - l) // 2\n  if nums[mid] > nums[r]:\n    l = mid + 1\n  else:\n    r = mid\nreturn nums[l]' }
  ],
  dryRun: { input: 'nums=[4,5,6,7,0,1,2]', steps: [
    { step: 1, state: 'l=0(4), r=6(2), mid=3(7)', action: 'nums[3]=7 > nums[6]=2. Min is to the right. l=mid+1=4' },
    { step: 2, state: 'l=4(0), r=6(2), mid=5(1)', action: 'nums[5]=1 < nums[6]=2. Min is to the left (incl mid). r=mid=5' },
    { step: 3, state: 'l=4(0), r=5(1), mid=4(0)', action: 'nums[4]=0 < nums[5]=1. Min is to the left. r=mid=4' },
    { step: 4, state: 'l=4, r=4', action: 'Loop ends. Return nums[4] = 0 ✓' }
  ]},
  edgeCases: [
    { case: 'Array not rotated (e.g. [1,2,3])', explanation: 'Condition nums[mid] > nums[r] is never met. r steadily moves to 0.' },
    { case: 'Length 1 or 2', explanation: 'Correctly computes and terminates.' }
  ],
  visibleTests: [
    { input: { nums: [3,4,5,1,2] }, expected: 1, note: 'Classic case' },
    { input: { nums: [4,5,6,7,0,1,2] }, expected: 0, note: 'Larger array' },
    { input: { nums: [11,13,15,17] }, expected: 11, note: 'Not rotated' }
  ],
  hiddenTestConfig: { generator: 'rotatedSortedArray', constraints: { minLen: 1, maxLen: 5000 } },
  patternExplanation: { pattern: 'Binary Search on Rotated Array', why: 'Comparing mid with the rightmost element reliably tells us which half contains the "wrap-around" point (the minimum).', related: ['bs1'] },
  visualDiagram: 'Values:  4 5 6 7 | 0 1 2\nSorted:  0 1 2 4 5 6 7\nThe drop from 7 to 0 is the inflection point we are searching for.',
  examples: [
    { input: 'nums=[3,4,5,1,2]', output: '1', explanation: 'The original array was [1,2,3,4,5] rotated 3 times.' }
  ],
  constraints: ['n == nums.length', '1 <= n <= 5000', '-5000 <= nums[i] <= 5000', 'All the integers of nums are unique.', 'nums is sorted and rotated between 1 and n times.']
},

'bs6': {
  description: 'Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key\'s value at a certain timestamp.',
  intuition: 'Since timestamps are strictly increasing when set() is called, the list of timestamps for a particular key will naturally be sorted. We can use binary search to efficiently find the largest timestamp that is <= the target timestamp.',
  approaches: [
    { name: 'Hash Map + Binary Search', complexity: { time: 'O(1) set, O(log N) get', space: 'O(N)' }, description: 'Map key to a list of (timestamp, value) pairs. Use binary search (bisect_right) in get().', pseudocode: 'class TimeMap:\n  def __init__(): self.store = defaultdict(list)\n  def set(k, v, t): self.store[k].append((t, v))\n  def get(k, t):\n    vals = self.store.get(k, [])\n    if not vals: return ""\n    l, r = 0, len(vals) - 1\n    res = ""\n    while l <= r:\n      mid = (l + r) // 2\n      if vals[mid][0] <= t:\n        res = vals[mid][1]; l = mid + 1\n      else: r = mid - 1\n    return res' }
  ],
  dryRun: { input: 'set("foo","bar",1), get("foo",1), get("foo",3), set("foo","bar2",4), get("foo",4), get("foo",5)', steps: [
    { step: 1, state: 'set("foo","bar",1)', action: 'store["foo"]=[(1,"bar")]' },
    { step: 2, state: 'get("foo",1)', action: 'Binary search finds (1,"bar") <= 1. Returns "bar"' },
    { step: 3, state: 'get("foo",3)', action: 'Binary search finds (1,"bar") <= 3. Returns "bar"' },
    { step: 4, state: 'set("foo","bar2",4)', action: 'store["foo"]=[(1,"bar"), (4,"bar2")]' },
    { step: 5, state: 'get("foo",4)', action: 'Binary search finds (4,"bar2") <= 4. Returns "bar2"' },
    { step: 6, state: 'get("foo",5)', action: 'Binary search finds (4,"bar2") <= 5. Returns "bar2" ✓' }
  ]},
  edgeCases: [
    { case: 'Target timestamp < smallest timestamp', explanation: 'l and r pointers cross without updating res, returns "".' },
    { case: 'Key doesn\'t exist', explanation: 'Returns "".' }
  ],
  visibleTests: [
    { input: { commands: ["TimeMap","set","get","get","set","get","get"], args: [[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]] }, expected: [null,null,"bar","bar",null,"bar2","bar2"], note: 'Classic case' }
  ],
  hiddenTestConfig: { generator: 'timeMap', constraints: { numOps: 1000 } },
  patternExplanation: { pattern: 'Binary Search (Upper Bound)', why: 'We need the maximum value that satisfies a condition (<= timestamp). This is a classic "find upper bound" binary search pattern.', related: ['bs3'] },
  visualDiagram: 'Key: "foo"\nTimestamps:  [1] ----------> [4]\nValues:     "bar"         "bar2"\n\nget(3) -> searches for <= 3. Finds 1 -> "bar"\nget(5) -> searches for <= 5. Finds 4 -> "bar2"',
  examples: [
    { input: 'set("foo", "bar", 1), get("foo", 1)', output: '"bar"', explanation: 'Stored and retrieved at same time.' }
  ],
  constraints: ['1 <= key.length, value.length <= 100', 'key and value consist of lowercase English letters and digits.', '1 <= timestamp <= 10^7', 'All timestamps in set are strictly increasing.']
}
};


