// Two Pointers — Production Problem Content
export const twoPointerContent = {
'tp1': {
  description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
  intuition: 'Use two pointers from both ends. Skip non-alphanumeric characters. Compare lowercase versions of the characters at both pointers, moving inward.',
  approaches: [
    { name: 'Clean + Reverse', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Filter to only alphanumeric, lowercase all, then compare string with its reverse.', pseudocode: 'cleaned = [c.lower() for c in s if c.isalnum()]\nreturn cleaned == cleaned[::-1]' },
    { name: 'Two Pointers (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Left and right pointers. Skip non-alnum chars. Compare lowercase at each step.', pseudocode: 'l, r = 0, len(s)-1\nwhile l < r:\n  while l<r and !isalnum(s[l]): l++\n  while l<r and !isalnum(s[r]): r--\n  if lower(s[l]) != lower(s[r]): return false\n  l++; r--\nreturn true' },
  ],
  dryRun: { input: 's = "A man, a plan, a canal: Panama"', steps: [
    { step: 1, state: 'l=0(A), r=29(a)', action: 'A==a ✓, move inward' },
    { step: 2, state: 'l=2(m), r=27(m)', action: 'Skip space, m==m ✓' },
    { step: 3, state: 'l=3(a), r=26(a)', action: 'a==a ✓, continue...' },
    { step: 4, state: '...all pairs match', action: 'l >= r → return true ✓' },
  ]},
  edgeCases: [
    { case: 's=""', explanation: 'Empty string is a palindrome' },
    { case: 's=" "', explanation: 'Single space — after filtering, empty → palindrome' },
    { case: 's=".,!?"', explanation: 'All non-alnum — empty after filtering → palindrome' },
    { case: 's="0P"', explanation: 'Mixed digit and letter — 0≠p, not palindrome' },
    { case: 's="aa"', explanation: 'Two same chars — palindrome' },
  ],
  visibleTests: [
    { input: { s: 'A man, a plan, a canal: Panama' }, expected: true, note: 'Classic palindrome' },
    { input: { s: 'race a car' }, expected: false, note: 'Not palindrome' },
    { input: { s: ' ' }, expected: true, note: 'Empty after filter' },
    { input: { s: '' }, expected: true, note: 'Empty string' },
    { input: { s: 'a' }, expected: true, note: 'Single char' },
    { input: { s: 'ab' }, expected: false, note: 'Two different' },
    { input: { s: 'aba' }, expected: true, note: 'Odd palindrome' },
    { input: { s: '0P' }, expected: false, note: 'Digit vs letter' },
    { input: { s: 'Was it a car or a cat I saw?' }, expected: true, note: 'Long palindrome' },
    { input: { s: 'No lemon, no melon' }, expected: true, note: 'Phrase palindrome' },
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 0, maxLen: 5000 } },
  patternExplanation: { pattern: 'Two Pointers (Inward)', why: 'Palindrome checking naturally maps to comparing from both ends. Two pointers moving inward achieves O(1) space by avoiding string copy/reverse.', related: ['tp3','tp14'] },
  visualDiagram: '"A man, a plan, a canal: Panama"\n\n  L                           R\n  A   m a n   a   p l a n   a\n  ↑                           ↑\n  A == a ✓  (case-insensitive)\n\n    L                       R\n    m                       m\n    ↑                       ↑\n    m == m ✓\n    ... all pairs match → TRUE',
  examples: [
    { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: 'After filtering: "amanaplanacanalpanama" is a palindrome' },
    { input: 's = "race a car"', output: 'false', explanation: '"raceacar" is not a palindrome' },
  ],
  constraints: ['1 ≤ s.length ≤ 2 × 10⁵', 's consists of printable ASCII characters'],
},

'tp3': {
  description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i ≠ j ≠ k and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.',
  intuition: 'Sort the array. For each element, use two pointers on the remaining subarray to find pairs that sum to its negative. Skip duplicates at each level to avoid duplicate triplets.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n³)', space: 'O(1)' }, description: 'Try every triplet combination, checking if sum is zero. Use a set to avoid duplicates.', pseudocode: 'for i in 0..n:\n  for j in i+1..n:\n    for k in j+1..n:\n      if nums[i]+nums[j]+nums[k]==0:\n        add sorted triplet to result set' },
    { name: 'Sort + Two Pointers (Optimal)', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'Sort array. Fix one element, then use two pointers for the remaining pair. Skip duplicates.', pseudocode: 'sort(nums)\nfor i in 0..n-2:\n  if i>0 and nums[i]==nums[i-1]: continue\n  l, r = i+1, n-1\n  while l < r:\n    s = nums[i]+nums[l]+nums[r]\n    if s < 0: l++\n    elif s > 0: r--\n    else: add [nums[i],nums[l],nums[r]]; skip dups' },
  ],
  dryRun: { input: 'nums = [-1,0,1,2,-1,-4]', steps: [
    { step: 1, state: 'sorted: [-4,-1,-1,0,1,2]', action: 'Sort first' },
    { step: 2, state: 'i=0, fix=-4, l=1,r=5', action: '-4+(-1)+2=-3<0 → l++... no valid pair' },
    { step: 3, state: 'i=1, fix=-1, l=2,r=5', action: '-1+(-1)+2=0 ✓ Found [-1,-1,2]' },
    { step: 4, state: 'l=3,r=4', action: '-1+0+1=0 ✓ Found [-1,0,1]' },
    { step: 5, state: 'i=2, skip (nums[2]==nums[1])', action: 'Duplicate skip' },
  ]},
  edgeCases: [
    { case: 'nums=[0,0,0]', explanation: 'All zeros — single triplet [0,0,0]' },
    { case: 'nums=[1,2,3]', explanation: 'All positive — no valid triplet' },
    { case: 'nums=[-1,0,1]', explanation: 'Exactly one triplet' },
    { case: 'nums=[0,0,0,0]', explanation: 'Multiple zeros — still only one triplet [0,0,0]' },
    { case: 'nums=[-2,0,1,1,2]', explanation: 'Multiple valid triplets — [-2,0,2] and [-2,1,1]' },
  ],
  visibleTests: [
    { input: { nums: [-1,0,1,2,-1,-4] }, expected: [[-1,-1,2],[-1,0,1]], note: 'Classic case' },
    { input: { nums: [0,1,1] }, expected: [], note: 'No valid triplet' },
    { input: { nums: [0,0,0] }, expected: [[0,0,0]], note: 'Triple zeros' },
    { input: { nums: [0,0,0,0] }, expected: [[0,0,0]], note: 'Dedup zeros' },
    { input: { nums: [-2,0,1,1,2] }, expected: [[-2,0,2],[-2,1,1]], note: 'Two triplets' },
    { input: { nums: [1,2,3] }, expected: [], note: 'All positive' },
    { input: { nums: [-1,-1,-1,2] }, expected: [[-1,-1,2]], note: 'Duplicate elements' },
    { input: { nums: [-4,-2,1,-5,-4,-4,4,-2,0,4,0,-2,3,1,-5,0] }, expected: [[-5,1,4],[-4,0,4],[-4,1,3],[-2,-2,4],[-2,1,1],[0,0,0]], note: 'Complex case' },
    { input: { nums: [-1,0,1] }, expected: [[-1,0,1]], note: 'Exact single' },
    { input: { nums: [3,-2,1,0] }, expected: [[-2,-1,3]], note: 'Unsorted input' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 3, maxLen: 3000 } },
  patternExplanation: { pattern: 'Sort + Two Pointers', why: 'Sorting enables two-pointer technique: if sum < target, move left pointer right; if sum > target, move right pointer left. This reduces the inner search from O(n) to O(n) total but avoids nested loops. Critical for k-sum problems.', related: ['tp4','tp17','tp18'] },
  visualDiagram: 'Sorted: [-4, -1, -1, 0, 1, 2]\n\ni=1, fix = -1\n        [-1,  0,  1,  2]\n          L           R\n  -1 + (-1) + 2 = 0 ✓  → [-1,-1,2]\n\n              L   R\n  -1 + 0 + 1 = 0 ✓     → [-1,0,1]\n\nResult: [[-1,-1,2], [-1,0,1]]',
  examples: [
    { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', explanation: 'Two unique triplets that sum to 0' },
    { input: 'nums = [0,1,1]', output: '[]', explanation: 'No triplet sums to 0' },
  ],
  constraints: ['3 ≤ nums.length ≤ 3000', '-10⁵ ≤ nums[i] ≤ 10⁵'],
},

'tp4': {
  description: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis forms a container, such that the container contains the most water.',
  intuition: 'Start with widest container (left=0, right=n-1). The area is min(height[l], height[r]) × (r-l). Move the pointer with smaller height inward — moving the taller one can never increase the area since width decreases and height is bounded by the shorter line.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'Try every pair of lines and compute area.', pseudocode: 'max_area = 0\nfor i in 0..n:\n  for j in i+1..n:\n    area = min(h[i],h[j]) * (j-i)\n    max_area = max(max_area, area)' },
    { name: 'Two Pointers (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Start widest. Move the shorter line inward each time.', pseudocode: 'l, r = 0, n-1\nmax_area = 0\nwhile l < r:\n  area = min(h[l],h[r]) * (r-l)\n  max_area = max(max_area, area)\n  if h[l] < h[r]: l++\n  else: r--' },
  ],
  dryRun: { input: 'height = [1,8,6,2,5,4,8,3,7]', steps: [
    { step: 1, state: 'l=0(1), r=8(7), w=8', action: 'area=min(1,7)*8=8. h[l]<h[r] → l++' },
    { step: 2, state: 'l=1(8), r=8(7), w=7', action: 'area=min(8,7)*7=49. h[r]<h[l] → r--' },
    { step: 3, state: 'l=1(8), r=7(3), w=6', action: 'area=min(8,3)*6=18. h[r]<h[l] → r--' },
    { step: 4, state: 'l=1(8), r=6(8), w=5', action: 'area=min(8,8)*5=40. r-- (equal)' },
    { step: 5, state: '...continue', action: 'max_area = 49 ✓' },
  ]},
  edgeCases: [
    { case: 'height=[1,1]', explanation: 'Minimum case — area = 1' },
    { case: 'height=[1,2,1]', explanation: 'Symmetric — max area = min(1,1)*2=2' },
    { case: 'height=[10000,10000]', explanation: 'Two tall lines — area = 10000' },
    { case: 'height=[1,1,1,1,1]', explanation: 'All same height — widest pair wins' },
    { case: 'height=[1,100,1]', explanation: 'Tall middle line is useless without a tall partner' },
  ],
  visibleTests: [
    { input: { height: [1,8,6,2,5,4,8,3,7] }, expected: 49, note: 'Classic case' },
    { input: { height: [1,1] }, expected: 1, note: 'Minimum' },
    { input: { height: [4,3,2,1,4] }, expected: 16, note: 'Ends are tallest' },
    { input: { height: [1,2,1] }, expected: 2, note: 'Three elements' },
    { input: { height: [2,3,4,5,18,17,6] }, expected: 17, note: 'Best is not widest' },
    { input: { height: [1,1,1,1,1] }, expected: 4, note: 'All same' },
    { input: { height: [5,5,5,5] }, expected: 15, note: 'Uniform height' },
    { input: { height: [1,100,1] }, expected: 2, note: 'Tall middle' },
    { input: { height: [10,9,8,7,6,5,4,3,2,1] }, expected: 25, note: 'Decreasing' },
    { input: { height: [1,2,3,4,5,6,7,8,9,10] }, expected: 25, note: 'Increasing' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 2, maxLen: 10000 } },
  patternExplanation: { pattern: 'Two Pointers (Greedy Shrink)', why: 'Starting from the widest container and shrinking inward is greedy — we only move the shorter line because the area is bounded by the shorter line. Moving the taller line can never increase area since width decreases.', related: ['tp5','tp3'] },
  visualDiagram: 'height = [1, 8, 6, 2, 5, 4, 8, 3, 7]\n\n   8           8\n   |     6     |        7\n   |     |  5  |     |  |\n   |     |  |  4  |  |  |\n   |     |  |  |  |  3  |\n   |     |  2  |  |  |  |\n   1     |  |  |  |  |  |\n   L                    R\n   area = min(1,7)×8 = 8\n\n   After moving L→1:\n      L              R\n   area = min(8,7)×7 = 49 ★',
  examples: [
    { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Lines at index 1 (h=8) and 8 (h=7): min(8,7)×7=49' },
    { input: 'height = [1,1]', output: '1', explanation: 'Only one container possible: 1×1=1' },
  ],
  constraints: ['n == height.length', '2 ≤ n ≤ 10⁵', '0 ≤ height[i] ≤ 10⁴'],
},

'tp5': {
  description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  intuition: 'Water at each position = min(maxLeft, maxRight) - height[i]. Use two pointers from both ends, maintaining running maxLeft and maxRight. Process the side with the smaller max first — that side\'s water is determined.',
  approaches: [
    { name: 'Prefix Max Arrays', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Precompute max height from left and right for each index. Water at i = min(leftMax[i], rightMax[i]) - height[i].', pseudocode: 'leftMax[i] = max(leftMax[i-1], h[i])\nrightMax[i] = max(rightMax[i+1], h[i])\nwater += min(leftMax[i], rightMax[i]) - h[i]' },
    { name: 'Two Pointers (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Two pointers with running maxLeft and maxRight. Process smaller side — its water level is guaranteed.', pseudocode: 'l=0, r=n-1, lmax=0, rmax=0, water=0\nwhile l < r:\n  if h[l] < h[r]:\n    lmax = max(lmax, h[l])\n    water += lmax - h[l]; l++\n  else:\n    rmax = max(rmax, h[r])\n    water += rmax - h[r]; r--' },
  ],
  dryRun: { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', steps: [
    { step: 1, state: 'l=0(0), r=11(1), lmax=0, rmax=0', action: 'h[l]<h[r]: lmax=0, water+=0-0=0, l++' },
    { step: 2, state: 'l=1(1), r=11(1), lmax=1, rmax=0', action: 'h[l]>=h[r]: rmax=1, water+=1-1=0, r--' },
    { step: 3, state: 'l=1(1), r=10(2), lmax=1', action: 'h[l]<h[r]: water+=1-1=0, l++' },
    { step: 4, state: 'l=2(0), r=10(2), lmax=1', action: 'water+=1-0=1, l++' },
    { step: 5, state: '...accumulate water at each valley', action: 'Total water = 6 ✓' },
  ]},
  edgeCases: [
    { case: 'height=[0]', explanation: 'Single bar — no water' },
    { case: 'height=[1,2,3]', explanation: 'Increasing — no valleys, no water' },
    { case: 'height=[3,2,1]', explanation: 'Decreasing — no valleys, no water' },
    { case: 'height=[5,0,5]', explanation: 'Simple pool — traps 5 units' },
    { case: 'height=[0,0,0]', explanation: 'All flat zeros — no water' },
  ],
  visibleTests: [
    { input: { height: [0,1,0,2,1,0,1,3,2,1,2,1] }, expected: 6, note: 'Classic case' },
    { input: { height: [4,2,0,3,2,5] }, expected: 9, note: 'Deep pool' },
    { input: { height: [0] }, expected: 0, note: 'Single bar' },
    { input: { height: [1,2,3] }, expected: 0, note: 'Increasing' },
    { input: { height: [3,2,1] }, expected: 0, note: 'Decreasing' },
    { input: { height: [5,0,5] }, expected: 5, note: 'Simple pool' },
    { input: { height: [0,0,0] }, expected: 0, note: 'All zeros' },
    { input: { height: [3,0,2,0,4] }, expected: 7, note: 'Multiple pools' },
    { input: { height: [1,0,1] }, expected: 1, note: 'Min pool' },
    { input: { height: [2,1,0,1,2] }, expected: 4, note: 'Symmetric valley' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Two Pointers with Running Bounds', why: 'Water at any position depends on the min of left-max and right-max. Two pointers let us determine one side\'s contribution definitively when its max is smaller, avoiding the need to precompute both max arrays.', related: ['tp4','st18'] },
  visualDiagram: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]\n\n         3\n   2     █ 2   2\n   █  1  ████  █\n  0█0 ██0█████1█\n  ─────────────\nWater fills the valleys:\n      ~  ~~~ ~\n  Total trapped = 6',
  examples: [
    { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'Water fills valleys between bars' },
    { input: 'height = [4,2,0,3,2,5]', output: '9', explanation: 'Large pool between height 4 and 5' },
  ],
  constraints: ['n == height.length', '1 ≤ n ≤ 2 × 10⁴', '0 ≤ height[i] ≤ 10⁵'],
},

'tp2': {
  description: 'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.',
  intuition: 'Since the array is sorted, we can use two pointers from both ends. If the sum is too small, increment the left pointer to get a larger value. If the sum is too large, decrement the right pointer to get a smaller value.',
  approaches: [
    { name: 'Two Pointers (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Initialize left and right pointers. Move them based on sum comparison.', pseudocode: 'l, r = 0, len(nums)-1\nwhile l < r:\n  s = nums[l] + nums[r]\n  if s == target: return [l+1, r+1]\n  elif s < target: l += 1\n  else: r -= 1' }
  ],
  dryRun: { input: 'numbers = [2,7,11,15], target = 9', steps: [
    { step: 1, state: 'l=0(2), r=3(15)', action: '2+15=17 > 9, so r--' },
    { step: 2, state: 'l=0(2), r=2(11)', action: '2+11=13 > 9, so r--' },
    { step: 3, state: 'l=0(2), r=1(7)', action: '2+7=9 == 9, return [1,2] ✓' }
  ]},
  edgeCases: [
    { case: 'numbers=[2,3,4], target=6', explanation: 'Result is [1,3]' },
    { case: 'numbers=[-1,0], target=-1', explanation: 'Result is [1,2]' }
  ],
  visibleTests: [
    { input: { numbers: [2,7,11,15], target: 9 }, expected: [1,2], note: 'Basic' },
    { input: { numbers: [2,3,4], target: 6 }, expected: [1,3], note: 'Basic 2' },
    { input: { numbers: [-1,0], target: -1 }, expected: [1,2], note: 'Negative numbers' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 2, maxLen: 10000 } },
  patternExplanation: { pattern: 'Two Pointers on Sorted Array', why: 'A sorted array allows deterministic adjustment of the sum by moving boundaries.', related: ['a1', 'tp3'] },
  visualDiagram: 'numbers = [2, 7, 11, 15], target = 9\nL=2, R=15, sum=17. 17 > 9 -> move R left\nL=2, R=11, sum=13. 13 > 9 -> move R left\nL=2, R=7, sum=9. 9 == 9 -> FOUND',
  examples: [
    { input: 'numbers = [2,7,11,15], target = 9', output: '[1,2]', explanation: '2 + 7 = 9' }
  ],
  constraints: ['2 <= numbers.length <= 3 * 10^4', '-1000 <= numbers[i] <= 1000']
},

'tp6': {
  description: 'Given a string s, return true if the s can be palindrome after deleting at most one character from it.',
  intuition: 'Use two pointers from ends. If a mismatch is found, we have two options: either skip the left character or skip the right character. If either resulting substring is a palindrome, return true.',
  approaches: [
    { name: 'Two Pointers with Substring Check', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Check from outside in. On mismatch, check if skipping left or right makes it valid.', pseudocode: 'l, r = 0, len(s)-1\nwhile l < r:\n  if s[l] != s[r]:\n    return isPalindrome(s[l+1:r+1]) or isPalindrome(s[l:r])\n  l += 1; r -= 1\nreturn true' }
  ],
  dryRun: { input: 's = "abca"', steps: [
    { step: 1, state: 'l=0(a), r=3(a)', action: 'Match, move inward.' },
    { step: 2, state: 'l=1(b), r=2(c)', action: 'Mismatch! Try skip left ("c") or skip right ("b").' },
    { step: 3, state: 'Check "c"', action: 'Palindrome ✓' }
  ]},
  edgeCases: [
    { case: 's="aba"', explanation: 'Already palindrome, 0 deletions needed.' },
    { case: 's="abc"', explanation: 'Cannot be palindrome with 1 deletion.' }
  ],
  visibleTests: [
    { input: { s: 'aba' }, expected: true, note: 'Already palindrome' },
    { input: { s: 'abca' }, expected: true, note: 'Skip c or b' },
    { input: { s: 'abc' }, expected: false, note: 'Needs 2 skips' }
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 50000 } },
  patternExplanation: { pattern: 'Two Pointers (Inward)', why: 'Allows one fault-tolerant divergence path.', related: ['tp1'] },
  visualDiagram: '"abca"\nL=a, R=a -> match\nL=b, R=c -> mismatch\nTry: "b" == "b" (skip c) -> true\nOr try: "c" == "c" (skip b) -> true',
  examples: [
    { input: 's="abca"', output: 'true', explanation: 'Delete c to get aba' }
  ],
  constraints: ['1 <= s.length <= 10^5']
},

'tp7': {
  description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  intuition: 'The water above any bar is determined by min(max_left_height, max_right_height) - height[i]. Using two pointers from both ends, we can track the maximum heights seen so far from left and right, and safely compute the trapped water at the pointer with the smaller max.',
  approaches: [
    { name: 'Two Pointers (Optimal)', complexity: { time: 'O(N)', space: 'O(1)' }, description: 'Maintain left and right pointers and their respective max heights. Move the pointer with the smaller max height inward.', pseudocode: 'l, r = 0, len(h)-1\nmax_l, max_r = 0, 0\nres = 0\nwhile l < r:\n  if h[l] < h[r]:\n    if h[l] >= max_l: max_l = h[l]\n    else: res += max_l - h[l]\n    l += 1\n  else:\n    if h[r] >= max_r: max_r = h[r]\n    else: res += max_r - h[r]\n    r -= 1\nreturn res' }
  ],
  dryRun: { input: 'height=[0,1,0,2,1,0,1,3,2,1,2,1]', steps: [
    { step: 1, state: 'l=0, r=11', action: 'h[0] < h[11] (0 < 1). max_l=0. l++' },
    { step: 2, state: 'l=1, r=11', action: 'h[1] == h[11] (1 == 1). max_r=1. r--' },
    { step: 3, state: 'l=1, r=10', action: 'h[1] < h[10] (1 < 2). max_l=1. l++' },
    { step: 4, state: 'l=2, r=10', action: 'h[2] < h[10] (0 < 2). h[2] < max_l (0 < 1). res += 1 - 0 = 1. l++' },
    { step: 5, state: 'Continue...', action: 'Total water trapped is 6. ✓' }
  ]},
  edgeCases: [
    { case: 'Array length < 3', explanation: 'Cannot trap water, returns 0.' },
    { case: 'Sorted array (ascending or descending)', explanation: 'No depressions, returns 0.' }
  ],
  visibleTests: [
    { input: { height: [0,1,0,2,1,0,1,3,2,1,2,1] }, expected: 6, note: 'Classic case' },
    { input: { height: [4,2,0,3,2,5] }, expected: 9, note: 'Another profile' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 0, maxLen: 20000 } },
  patternExplanation: { pattern: 'Two Pointers (Min/Max Tracking)', why: 'When a result at an index depends on the minimum of two extremes (left and right bounds), moving two pointers inward from the extremes is optimal.', related: ['tp8'] },
  visualDiagram: '       # \n   #www##w# \n_#w##w######\nTotal water (w) = 6 units.',
  examples: [
    { input: 'height=[0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: '6 units of rain water are being trapped.' }
  ],
  constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5']
},

'tp8': {
  description: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water.',
  intuition: 'The area is determined by the shorter line and the distance between the lines. Start with the maximum width (pointers at both ends). To maximize area, we must keep the taller line and move the pointer of the shorter line inward, hoping to find a taller line to compensate for the reduced width.',
  approaches: [
    { name: 'Two Pointers (Greedy)', complexity: { time: 'O(N)', space: 'O(1)' }, description: 'Pointers at start and end. Calculate area, update max area, and move the pointer pointing to the shorter line.', pseudocode: 'l, r = 0, len(height)-1\nmax_area = 0\nwhile l < r:\n  area = (r - l) * min(height[l], height[r])\n  max_area = max(max_area, area)\n  if height[l] < height[r]: l += 1\n  else: r -= 1\nreturn max_area' }
  ],
  dryRun: { input: 'height=[1,8,6,2,5,4,8,3,7]', steps: [
    { step: 1, state: 'l=0(val=1), r=8(val=7)', action: 'area = 8 * 1 = 8. max=8. Move l++' },
    { step: 2, state: 'l=1(val=8), r=8(val=7)', action: 'area = 7 * 7 = 49. max=49. Move r--' },
    { step: 3, state: 'l=1(val=8), r=7(val=3)', action: 'area = 6 * 3 = 18. max=49. Move r--' },
    { step: 4, state: 'Finish traversal', action: 'Max area is 49. ✓' }
  ]},
  edgeCases: [
    { case: 'All same heights', explanation: 'Max area is at max width.' },
    { case: 'Array length 2', explanation: 'Only one possible container.' }
  ],
  visibleTests: [
    { input: { height: [1,8,6,2,5,4,8,3,7] }, expected: 49, note: 'Classic case' },
    { input: { height: [1,1] }, expected: 1, note: 'Minimum length' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 2, maxLen: 100000 } },
  patternExplanation: { pattern: 'Two Pointers (Greedy Inward)', why: 'We start with the maximum possible width. Any move inward decreases width, so we only move the bottleneck (the shorter height) to have a chance at increasing the area.', related: ['tp7'] },
  visualDiagram: 'Indices: 0 1 2 3 4 5 6 7 8\nHeights: 1 8 6 2 5 4 8 3 7\nMax Area between index 1 (height 8) and index 8 (height 7).\nArea = (8-1) * min(8,7) = 7 * 7 = 49.',
  examples: [
    { input: 'height=[1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Max area is between the two 8s and 7.' }
  ],
  constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4']
}
};


