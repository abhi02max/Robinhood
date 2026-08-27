// Backtracking & Recursion — Production Problem Content
export const backtrackingContent = {
'rc5': {
  description: 'Given an integer array nums of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets.',
  intuition: 'At each element, make a binary choice: include it or exclude it. Recursively build subsets by branching at each index.',
  approaches: [
    { name: 'Backtracking', complexity: { time: 'O(n·2ⁿ)', space: 'O(n)' }, description: 'For each element, include or exclude. Generate all 2ⁿ combinations.', pseudocode: 'def backtrack(i, current):\n  if i == n:\n    result.append(current[:])\n    return\n  # exclude nums[i]\n  backtrack(i+1, current)\n  # include nums[i]\n  current.append(nums[i])\n  backtrack(i+1, current)\n  current.pop()' },
    { name: 'Iterative', complexity: { time: 'O(n·2ⁿ)', space: 'O(2ⁿ)' }, description: 'Start with [[]]. For each number, add it to every existing subset.', pseudocode: 'result = [[]]\nfor num in nums:\n  result += [s+[num] for s in result]\nreturn result' },
  ],
  dryRun: { input: 'nums=[1,2,3]', steps: [
    { step: 1, state: 'Start with [[]]', action: 'Add 1: [[], [1]]' },
    { step: 2, state: '[[], [1]]', action: 'Add 2: [[], [1], [2], [1,2]]' },
    { step: 3, state: '[[], [1], [2], [1,2]]', action: 'Add 3: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]] ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[]', explanation: 'Empty array — result is [[]]' },
    { case: 'nums=[0]', explanation: 'Single element — [[], [0]]' },
    { case: 'nums=[1,2,3,4,5,6,7,8,9,10]', explanation: 'Large — 2¹⁰ = 1024 subsets' },
    { case: 'nums=[-1,0,1]', explanation: 'Negative/zero — treated same as positive' },
    { case: 'nums=[100]', explanation: 'Large value — [[], [100]]' },
  ],
  visibleTests: [
    { input: { nums: [1,2,3] }, expected: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]], note: 'Classic' },
    { input: { nums: [0] }, expected: [[],[0]], note: 'Single' },
    { input: { nums: [1,2] }, expected: [[],[1],[2],[1,2]], note: 'Two elements' },
    { input: { nums: [] }, expected: [[]], note: 'Empty' },
    { input: { nums: [5,10] }, expected: [[],[5],[10],[5,10]], note: 'Larger values' },
    { input: { nums: [-1,0,1] }, expected: [[],[-1],[0],[-1,0],[1],[-1,1],[0,1],[-1,0,1]], note: 'Mixed signs' },
    { input: { nums: [1] }, expected: [[],[1]], note: 'One element' },
    { input: { nums: [3,4,5] }, expected: [[],[3],[4],[3,4],[5],[3,5],[4,5],[3,4,5]], note: 'Sequential' },
    { input: { nums: [1,2,3,4] }, expected: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3],[4],[1,4],[2,4],[1,2,4],[3,4],[1,3,4],[2,3,4],[1,2,3,4]], note: '16 subsets' },
    { input: { nums: [7] }, expected: [[],[7]], note: 'Single larger' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 0, maxLen: 10 } },
  patternExplanation: { pattern: 'Subset Generation (Include/Exclude)', why: 'The include/exclude branching at each element generates all 2ⁿ subsets. This decision tree is the foundation of all backtracking problems — combinations, permutations, and partition problems all follow this template.', related: ['rc6','rc7','rc9'] },
  visualDiagram: 'nums = [1, 2, 3]\n\n                    []\n                 /      \\\n               []        [1]\n             /    \\     /    \\\n           []    [2]  [1]  [1,2]\n          / \\   / \\  / \\   / \\\n        [] [3] [2][2,3][1][1,3][1,2][1,2,3]\n\n2³ = 8 subsets total',
  examples: [
    { input: 'nums = [1,2,3]', output: '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]', explanation: '8 subsets (2³)' },
    { input: 'nums = [0]', output: '[[],[0]]', explanation: '2 subsets' },
  ],
  constraints: ['1 ≤ nums.length ≤ 10', '-10 ≤ nums[i] ≤ 10', 'All elements are unique'],
},

'bt1': {
  description: 'The n-queens puzzle is the problem of placing n queens on an n×n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions.',
  intuition: 'Place queens row by row. For each row, try each column. Check if the placement is valid (no same column, no same diagonal). Backtrack if no valid placement exists in a row.',
  approaches: [
    { name: 'Backtracking with Pruning', complexity: { time: 'O(n!)', space: 'O(n²)' }, description: 'Try each column in current row. Validate against previous queens. Recurse to next row.', pseudocode: 'def solve(row, cols, diag1, diag2, board):\n  if row == n: result.append(board); return\n  for col in 0..n:\n    if col∉cols and (row-col)∉diag1 and (row+col)∉diag2:\n      place queen at (row,col)\n      solve(row+1, ...)\n      remove queen' },
  ],
  dryRun: { input: 'n = 4', steps: [
    { step: 1, state: 'Row 0: try col 0', action: 'Place Q at (0,0)' },
    { step: 2, state: 'Row 1: col 0,1 invalid, try col 2', action: 'Place Q at (1,2)' },
    { step: 3, state: 'Row 2: all invalid', action: 'Backtrack! Remove (1,2), try (1,3)' },
    { step: 4, state: 'Row 2: try col 1', action: 'Place Q at (2,1)' },
    { step: 5, state: 'Row 3: all invalid', action: 'Backtrack further... Eventually find [1,3,0,2]' },
  ]},
  edgeCases: [
    { case: 'n=1', explanation: 'Single queen — 1 solution' },
    { case: 'n=2', explanation: 'No valid placement — 0 solutions' },
    { case: 'n=3', explanation: 'No valid placement — 0 solutions' },
    { case: 'n=4', explanation: '2 solutions' },
    { case: 'n=8', explanation: '92 solutions — classic chess problem' },
  ],
  visibleTests: [
    { input: { n: 4 }, expected: [['.Q..','...Q','Q...','..Q.'],['..Q.','Q...','...Q','.Q..']], note: '2 solutions' },
    { input: { n: 1 }, expected: [['Q']], note: 'Single' },
    { input: { n: 2 }, expected: [], note: 'No solution' },
    { input: { n: 3 }, expected: [], note: 'No solution' },
    { input: { n: 5 }, expected: '10 solutions', note: '10 arrangements' },
    { input: { n: 6 }, expected: '4 solutions', note: '4 arrangements' },
    { input: { n: 7 }, expected: '40 solutions', note: '40 arrangements' },
    { input: { n: 8 }, expected: '92 solutions', note: '92 arrangements' },
    { input: { n: 9 }, expected: '352 solutions', note: '352 arrangements' },
    { input: { n: 4 }, expected: 2, note: 'Count = 2' },
  ],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 1, maxLen: 9 } },
  patternExplanation: { pattern: 'Constraint Backtracking', why: 'N-Queens is the canonical backtracking problem. The key optimization is tracking columns, main diagonals (row-col), and anti-diagonals (row+col) in sets for O(1) validity checks. This prunes the search space from n^n to roughly n!.', related: ['bt3','bt6'] },
  visualDiagram: 'n = 4, Solution 1:     Solution 2:\n\n  . Q . .              . . Q .\n  . . . Q              Q . . .\n  Q . . .              . . . Q\n  . . Q .              . Q . .\n\nQ at (0,1)(1,3)(2,0)(3,2)  Q at (0,2)(1,0)(2,3)(3,1)\n\nNo two queens share row, column, or diagonal ✓',
  examples: [
    { input: 'n = 4', output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]', explanation: 'Two valid arrangements' },
    { input: 'n = 1', output: '[["Q"]]', explanation: 'Single queen' },
  ],
  constraints: ['1 ≤ n ≤ 9'],
},

'rc7': {
  description: 'Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.',
  intuition: 'Build permutations by choosing each unused element at each position. Use backtracking: pick an element, recurse for remaining positions, then undo the pick.',
  approaches: [
    { name: 'Backtracking with Used Array', complexity: { time: 'O(n·n!)', space: 'O(n)' }, description: 'Track used elements. At each level, try all unused elements.', pseudocode: 'def backtrack(current, used):\n  if len(current) == n:\n    result.append(current[:])\n    return\n  for i in 0..n:\n    if !used[i]:\n      used[i] = true\n      current.append(nums[i])\n      backtrack(current, used)\n      current.pop()\n      used[i] = false' },
    { name: 'Swap-based', complexity: { time: 'O(n·n!)', space: 'O(n)' }, description: 'Fix elements by swapping. At position i, try swapping with each position j >= i.', pseudocode: 'def permute(start):\n  if start == n:\n    result.append(nums[:])\n    return\n  for i in start..n:\n    swap(nums[start], nums[i])\n    permute(start+1)\n    swap(nums[start], nums[i])' },
  ],
  dryRun: { input: 'nums=[1,2,3]', steps: [
    { step: 1, state: 'Pick 1 first', action: '[1] → pick 2 → [1,2] → pick 3 → [1,2,3] ✓' },
    { step: 2, state: 'Backtrack', action: '[1] → pick 3 → [1,3] → pick 2 → [1,3,2] ✓' },
    { step: 3, state: 'Pick 2 first', action: '[2,1,3] ✓, [2,3,1] ✓' },
    { step: 4, state: 'Pick 3 first', action: '[3,1,2] ✓, [3,2,1] ✓. Total: 6 = 3!' },
  ]},
  edgeCases: [
    { case: 'nums=[1]', explanation: 'Single element — one permutation [1]' },
    { case: 'nums=[0,1]', explanation: 'Two elements — [0,1] and [1,0]' },
    { case: 'nums=[1,2,3,4]', explanation: '4! = 24 permutations' },
    { case: 'nums=[-1,0,1]', explanation: 'Mixed signs — 6 permutations' },
    { case: 'nums=[1,2,3,4,5,6]', explanation: '6! = 720 permutations (stress test)' },
  ],
  visibleTests: [
    { input: { nums: [1,2,3] }, expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]], note: '3!=6' },
    { input: { nums: [0,1] }, expected: [[0,1],[1,0]], note: '2!=2' },
    { input: { nums: [1] }, expected: [[1]], note: '1!=1' },
    { input: { nums: [5,4,6] }, expected: [[5,4,6],[5,6,4],[4,5,6],[4,6,5],[6,5,4],[6,4,5]], note: 'Unsorted' },
    { input: { nums: [-1,0,1] }, expected: [[-1,0,1],[-1,1,0],[0,-1,1],[0,1,-1],[1,-1,0],[1,0,-1]], note: 'Mixed' },
    { input: { nums: [1,2] }, expected: [[1,2],[2,1]], note: 'Two' },
    { input: { nums: [7] }, expected: [[7]], note: 'Single large' },
    { input: { nums: [3,2,1] }, expected: [[3,2,1],[3,1,2],[2,3,1],[2,1,3],[1,3,2],[1,2,3]], note: 'Reverse' },
    { input: { nums: [0] }, expected: [[0]], note: 'Zero' },
    { input: { nums: [10,20] }, expected: [[10,20],[20,10]], note: 'Tens' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 6 } },
  patternExplanation: { pattern: 'Permutation Generation', why: 'Permutations require trying every element at every position. The backtracking pattern of "choose, explore, unchoose" generates exactly n! permutations without duplicates. The used-array approach is more intuitive; swap-based avoids extra space.', related: ['rc8','rc5','rc9'] },
  visualDiagram: 'nums = [1, 2, 3]\n\n              []\n          /    |    \\\n        [1]   [2]   [3]\n       / \\   / \\   / \\\n    [1,2][1,3][2,1][2,3][3,1][3,2]\n      |    |    |    |    |    |\n   [123][132][213][231][312][321]\n\n3! = 6 permutations',
  examples: [
    { input: 'nums = [1,2,3]', output: '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]', explanation: 'All 6 orderings' },
    { input: 'nums = [0,1]', output: '[[0,1],[1,0]]', explanation: 'All 2 orderings' },
  ],
  constraints: ['1 ≤ nums.length ≤ 6', '-10 ≤ nums[i] ≤ 10', 'All elements are unique'],
},

'rc9': {
  description: 'Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be used unlimited times.',
  intuition: 'Backtrack through candidates. At each step, either include the current candidate (can reuse) or move to next candidate. Stop when sum exceeds target.',
  approaches: [
    { name: 'Backtracking', complexity: { time: 'O(n^(t/min))', space: 'O(t/min)' }, description: 'For each candidate, include it (repeat allowed) or skip to next. Prune when sum exceeds target.', pseudocode: 'def backtrack(start, target, current):\n  if target == 0:\n    result.append(current[:]); return\n  for i in start..n:\n    if candidates[i] > target: break\n    current.append(candidates[i])\n    backtrack(i, target-candidates[i], current)  # i, not i+1\n    current.pop()' },
  ],
  dryRun: { input: 'candidates=[2,3,6,7], target=7', steps: [
    { step: 1, state: 'start=0, target=7', action: 'Try 2: [2], target=5' },
    { step: 2, state: '[2], target=5', action: 'Try 2: [2,2], target=3' },
    { step: 3, state: '[2,2], target=3', action: 'Try 2: [2,2,2], target=1 → try 3: too big → backtrack' },
    { step: 4, state: '[2,2], target=3', action: 'Try 3: [2,2,3], target=0 ✓ Found!' },
    { step: 5, state: 'Continue exploration', action: 'Try 7: [7], target=0 ✓ Found! Result: [[2,2,3],[7]]' },
  ]},
  edgeCases: [
    { case: 'candidates=[2], target=1', explanation: 'No combination possible — return []' },
    { case: 'candidates=[1], target=3', explanation: '1+1+1=3 — one combination' },
    { case: 'candidates=[2], target=6', explanation: '2+2+2=6 — one combination' },
    { case: 'candidates=[7,3,2], target=1', explanation: 'All candidates > target — empty' },
    { case: 'candidates=[1], target=1', explanation: 'Exact match — [[1]]' },
  ],
  visibleTests: [
    { input: { candidates: [2,3,6,7], target: 7 }, expected: [[2,2,3],[7]], note: 'Classic' },
    { input: { candidates: [2,3,5], target: 8 }, expected: [[2,2,2,2],[2,3,3],[3,5]], note: 'Multiple' },
    { input: { candidates: [2], target: 1 }, expected: [], note: 'Impossible' },
    { input: { candidates: [1], target: 1 }, expected: [[1]], note: 'Exact' },
    { input: { candidates: [1], target: 3 }, expected: [[1,1,1]], note: 'Repeat' },
    { input: { candidates: [1,2], target: 4 }, expected: [[1,1,1,1],[1,1,2],[2,2]], note: 'Two candidates' },
    { input: { candidates: [7,3,2], target: 18 }, expected: [[2,2,2,2,2,2,2,2,2],[2,2,2,2,2,2,3,3],[2,2,2,2,3,7],[2,2,2,3,3,3,3],[2,2,7,7],[2,3,3,3,7],[3,3,3,3,3,3],[7,7,2,2]], note: 'Many combos' },
    { input: { candidates: [5,10,15], target: 30 }, expected: [[5,5,5,5,5,5],[5,5,5,15],[5,5,10,10],[5,10,15],[10,10,10],[15,15]], note: 'Multiples' },
    { input: { candidates: [3], target: 9 }, expected: [[3,3,3]], note: 'Single repeat' },
    { input: { candidates: [8,7,4,3], target: 11 }, expected: [[3,4,4],[3,8],[4,7]], note: 'Unsorted' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 30 } },
  patternExplanation: { pattern: 'Unbounded Combination Search', why: 'The key difference from standard combinations is passing i (not i+1) to allow reuse. This "stay at same index" pattern models unbounded choices (like unbounded knapsack). Sorting and pruning (skip when candidate > remaining) drastically reduces the search space.', related: ['rc10','rc5','dp7'] },
  visualDiagram: 'candidates = [2,3,6,7], target = 7\n\nDecision tree:\n              7\n         /    |    \\    \\\n       5(+2) 4(+3) 1(+6) 0(+7)✓\n      / |     |           \n    3  2  1  1(+3)✓      \n   / |    |              \n  1  0✓ -1             \n  |  [2,2,3]\n  ×\n\nResult: [[2,2,3], [7]]',
  examples: [
    { input: 'candidates=[2,3,6,7], target=7', output: '[[2,2,3],[7]]', explanation: '2+2+3=7 and 7=7' },
    { input: 'candidates=[2,3,5], target=8', output: '[[2,2,2,2],[2,3,3],[3,5]]', explanation: 'Three ways to make 8' },
  ],
  constraints: ['1 ≤ candidates.length ≤ 30', '2 ≤ candidates[i] ≤ 40', 'All elements are distinct', '1 ≤ target ≤ 40'],
},

'rc3': {
  description: 'Given two integers n and k, return all possible combinations of k numbers chosen from the range [1, n]. You may return the answer in any order.',
  intuition: 'We need all combinations of size k. We can use backtracking to explore all paths. To avoid permutations (like [1,2] and [2,1]), we enforce that the next chosen number must be strictly greater than the previously chosen number.',
  approaches: [
    { name: 'Backtracking (Optimal)', complexity: { time: 'O(k * (n choose k))', space: 'O(k)' }, description: 'Recursively pick elements from start to n. Once the combination length is k, add to results.', pseudocode: 'def backtrack(start, comb):\n  if len(comb) == k:\n    res.append(comb.copy()); return\n  for i in range(start, n + 1):\n    comb.append(i)\n    backtrack(i + 1, comb)\n    comb.pop()' }
  ],
  dryRun: { input: 'n=4, k=2', steps: [
    { step: 1, state: 'c=[]', action: 'Try 1 -> c=[1]' },
    { step: 2, state: 'c=[1]', action: 'Try 2 -> c=[1,2]. Len is 2, save it. Pop 2.' },
    { step: 3, state: 'c=[1]', action: 'Try 3 -> c=[1,3]. Len is 2, save it. Pop 3.' },
    { step: 4, state: 'c=[1]', action: 'Try 4 -> c=[1,4]. Save. Pop 4. Pop 1.' },
    { step: 5, state: 'c=[]', action: 'Try 2 -> c=[2], etc.' }
  ]},
  edgeCases: [
    { case: 'k = 1', explanation: 'Returns [[1], [2], ..., [n]].' },
    { case: 'k = n', explanation: 'Returns [[1, 2, ..., n]].' }
  ],
  visibleTests: [
    { input: { n: 4, k: 2 }, expected: [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]], note: 'Classic case' },
    { input: { n: 1, k: 1 }, expected: [[1]], note: 'Minimum bounds' }
  ],
  hiddenTestConfig: { generator: 'combinations', constraints: { maxN: 20, maxK: 20 } },
  patternExplanation: { pattern: 'Combinatorics Backtracking', why: 'Using a "start" index parameter in the recursive loop strictly enforces an ordering (1->2->3), which naturally prevents duplicate combinations.', related: ['rc1'] },
  visualDiagram: '       []\n    /  |  \\\n  [1] [2] [3]\n  /|   |   |\n[2][3][3] [4]\n(Tree pruned to show combinations of size 2)',
  examples: [
    { input: 'n=4, k=2', output: '[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]', explanation: 'All pairs from 1 to 4.' }
  ],
  constraints: ['1 <= n <= 20', '1 <= k <= n']
},

'rc4': {
  description: 'Given an integer array nums that may contain duplicates, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.',
  intuition: 'Similar to subsets, but we have duplicates. If we sort the array, identical elements will be adjacent. During backtracking, if we choose NOT to include an element, we must skip all subsequent identical elements to prevent generating the same subset again.',
  approaches: [
    { name: 'Backtracking with Duplicate Skipping', complexity: { time: 'O(N * 2^N)', space: 'O(N)' }, description: 'Sort array. Backtrack by either including the element or skipping it (and all its duplicates).', pseudocode: 'nums.sort()\ndef backtrack(i, subset):\n  if i == len(nums):\n    res.append(subset.copy()); return\n  # Include nums[i]\n  subset.append(nums[i])\n  backtrack(i + 1, subset)\n  subset.pop()\n  # Skip nums[i] and all duplicates\n  while i + 1 < len(nums) and nums[i] == nums[i+1]: i += 1\n  backtrack(i + 1, subset)' }
  ],
  dryRun: { input: 'nums=[1,2,2]', steps: [
    { step: 1, state: 'i=0, sub=[]', action: 'Include 1 -> sub=[1]' },
    { step: 2, state: 'i=1, sub=[1]', action: 'Include 2 -> sub=[1,2]' },
    { step: 3, state: 'i=2, sub=[1,2]', action: 'Include 2 -> sub=[1,2,2]. End -> save.' },
    { step: 4, state: 'i=2, sub=[1,2]', action: 'Skip 2 -> sub=[1,2]. End -> save.' },
    { step: 5, state: 'i=1, sub=[1]', action: 'Skip 2. Skip duplicate 2s -> i=2. End -> save [1].' }
  ]},
  edgeCases: [
    { case: 'All same elements', explanation: 'Returns [], [1], [1,1], etc.' },
    { case: 'No duplicates', explanation: 'Works identical to standard subsets.' }
  ],
  visibleTests: [
    { input: { nums: [1,2,2] }, expected: [[],[1],[1,2],[1,2,2],[2],[2,2]], note: 'Classic case' },
    { input: { nums: [0] }, expected: [[],[0]], note: 'Single element' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10 } },
  patternExplanation: { pattern: 'Duplicate Skipping in Backtracking', why: 'Sorting groups duplicates. By skipping identical elements in the "do not include" branch, we prevent identical sibling subtrees from generating the same combinations.', related: ['rc7'] },
  visualDiagram: '          []\n       /      \\\n     [1]       []\n    /   \\     /  \\\n [1,2]  [1] [2]  []\n  /  \\   /   / \\\n..  ..  ..  .. ..\n(Subsets like [1,2] from skipping first 2 but taking second 2 are pruned.)',
  examples: [
    { input: 'nums=[1,2,2]', output: '[[],[1],[1,2],[1,2,2],[2],[2,2]]', explanation: 'Notice [1,2] appears only once.' }
  ],
  constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10']
}
};

