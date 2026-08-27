// Trees — Production Problem Content
export const treesContent = {
't1': {
  description: 'Given the root of a binary tree, invert the tree (swap every left and right child), and return its root.',
  intuition: 'At every node, swap its left and right children, then recursively invert the left and right subtrees. This can also be done iteratively with BFS.',
  approaches: [
    { name: 'Recursive (DFS)', complexity: { time: 'O(n)', space: 'O(h)' }, description: 'Swap left and right at each node, then recurse on both children.', pseudocode: 'def invert(root):\n  if !root: return null\n  root.left, root.right = root.right, root.left\n  invert(root.left)\n  invert(root.right)\n  return root' },
    { name: 'Iterative (BFS)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Use a queue. For each node, swap children and enqueue them.', pseudocode: 'queue = [root]\nwhile queue:\n  node = queue.pop()\n  node.left, node.right = node.right, node.left\n  if node.left: queue.append(node.left)\n  if node.right: queue.append(node.right)' },
  ],
  dryRun: { input: 'root = [4,2,7,1,3,6,9]', steps: [
    { step: 1, state: 'node=4, swap: L=7, R=2', action: 'Swap children of root' },
    { step: 2, state: 'node=7, swap: L=9, R=6', action: 'Recurse left subtree' },
    { step: 3, state: 'node=2, swap: L=3, R=1', action: 'Recurse right subtree' },
    { step: 4, state: 'All leaves reached', action: 'Result: [4,7,2,9,6,3,1] ✓' },
  ]},
  edgeCases: [
    { case: 'root=null', explanation: 'Empty tree — return null' },
    { case: 'root=[1]', explanation: 'Single node — no children to swap' },
    { case: 'root=[1,2,null]', explanation: 'One child only — swap with null' },
    { case: 'root=[1,2,3,4,5,6,7]', explanation: 'Complete binary tree — all levels swap' },
    { case: 'root=[1,null,2,null,3]', explanation: 'Skewed tree (right chain) — becomes left chain' },
  ],
  visibleTests: [
    { input: { root: [4,2,7,1,3,6,9] }, expected: [4,7,2,9,6,3,1], note: 'Classic' },
    { input: { root: [2,1,3] }, expected: [2,3,1], note: 'Simple' },
    { input: { root: [] }, expected: [], note: 'Empty' },
    { input: { root: [1] }, expected: [1], note: 'Single' },
    { input: { root: [1,2,null] }, expected: [1,null,2], note: 'One child' },
    { input: { root: [1,2,3,4,5,6,7] }, expected: [1,3,2,7,6,5,4], note: 'Complete' },
    { input: { root: [5,3,8,1,4,7,9] }, expected: [5,8,3,9,7,4,1], note: 'BST invert' },
    { input: { root: [1,2,3] }, expected: [1,3,2], note: 'Three nodes' },
    { input: { root: [1,null,2] }, expected: [1,2,null], note: 'Right only' },
    { input: { root: [10,5,15] }, expected: [10,15,5], note: 'Balanced' },
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 1000 } },
  patternExplanation: { pattern: 'Tree Recursion (DFS)', why: 'Inverting a tree is a pure structural transformation — each subtree can be inverted independently. This makes it a natural fit for recursion. The pattern of "process node, recurse children" is the foundation of all tree DFS problems.', related: ['t2','t3'] },
  visualDiagram: 'Before:       After:\n    4            4\n   / \\          / \\\n  2   7   →   7   2\n / \\ / \\     / \\ / \\\n1  3 6  9   9  6 3  1',
  examples: [
    { input: 'root = [4,2,7,1,3,6,9]', output: '[4,7,2,9,6,3,1]', explanation: 'Every left-right pair is swapped' },
    { input: 'root = [2,1,3]', output: '[2,3,1]', explanation: 'Children swapped' },
  ],
  constraints: ['0 ≤ number of nodes ≤ 100', '-100 ≤ Node.val ≤ 100'],
},

't3': {
  description: 'Given the root of a binary tree, return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
  intuition: 'The depth of a tree = 1 + max(depth of left subtree, depth of right subtree). Base case: null node has depth 0.',
  approaches: [
    { name: 'Recursive DFS (Optimal)', complexity: { time: 'O(n)', space: 'O(h)' }, description: 'Return 1 + max of left and right depths.', pseudocode: 'def maxDepth(root):\n  if !root: return 0\n  return 1 + max(maxDepth(root.left), maxDepth(root.right))' },
    { name: 'Iterative BFS', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Level-order traversal. Count the number of levels.', pseudocode: 'if !root: return 0\nqueue = [root], depth = 0\nwhile queue:\n  depth++\n  for i in range(len(queue)):\n    node = queue.pop(0)\n    if node.left: queue.append(node.left)\n    if node.right: queue.append(node.right)\nreturn depth' },
  ],
  dryRun: { input: 'root = [3,9,20,null,null,15,7]', steps: [
    { step: 1, state: 'root=3', action: '1 + max(depth(9), depth(20))' },
    { step: 2, state: 'node=9, no children', action: 'depth(9) = 1' },
    { step: 3, state: 'node=20, children 15,7', action: 'depth(20) = 1 + max(1,1) = 2' },
    { step: 4, state: 'Back at root', action: '1 + max(1, 2) = 3 ✓' },
  ]},
  edgeCases: [
    { case: 'root=null', explanation: 'Empty tree — depth 0' },
    { case: 'root=[1]', explanation: 'Single node — depth 1' },
    { case: 'root=[1,2,null,3,null,4]', explanation: 'Skewed left — depth equals node count' },
    { case: 'root=[1,2,3,4,5,6,7]', explanation: 'Complete tree — depth = log₂(n)+1 = 3' },
    { case: 'root=[1,null,2,null,3]', explanation: 'Right-skewed — depth 3' },
  ],
  visibleTests: [
    { input: { root: [3,9,20,null,null,15,7] }, expected: 3, note: 'Classic' },
    { input: { root: [1,null,2] }, expected: 2, note: 'Right child' },
    { input: { root: [] }, expected: 0, note: 'Empty' },
    { input: { root: [1] }, expected: 1, note: 'Single' },
    { input: { root: [1,2,3,4,5,6,7] }, expected: 3, note: 'Complete' },
    { input: { root: [1,2,null,3] }, expected: 3, note: 'Left skewed' },
    { input: { root: [1,2,3] }, expected: 2, note: 'Balanced' },
    { input: { root: [0,0,0,0] }, expected: 3, note: 'All zeros' },
    { input: { root: [5,4,null,3,null,2] }, expected: 4, note: 'Deep left' },
    { input: { root: [1,2,3,4,5,null,null,6] }, expected: 4, note: 'Unbalanced' },
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Tree Height / Depth Recursion', why: 'Tree depth is the most natural recursive decomposition — the answer for a node depends only on answers for its children. This "divide and conquer on tree structure" pattern is the basis for most tree problems.', related: ['t1','t5'] },
  visualDiagram: '       3        depth = 3\n      / \\\n     9   20      depth = 2\n        / \\\n       15  7     depth = 1\n\nmaxDepth(3) = 1 + max(\n  maxDepth(9)=1,\n  maxDepth(20)=1+max(1,1)=2\n) = 3',
  examples: [
    { input: 'root = [3,9,20,null,null,15,7]', output: '3', explanation: 'Path: 3→20→15 or 3→20→7' },
    { input: 'root = [1,null,2]', output: '2', explanation: 'Path: 1→2' },
  ],
  constraints: ['0 ≤ number of nodes ≤ 10⁴', '-100 ≤ Node.val ≤ 100'],
},

't7': {
  description: 'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).',
  intuition: 'BFS with a queue. Process one entire level at a time — dequeue all nodes at the current level, collect their values, and enqueue their children for the next level.',
  approaches: [
    { name: 'BFS Queue (Optimal)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Process nodes level by level using a queue.', pseudocode: 'if !root: return []\nqueue = [root], result = []\nwhile queue:\n  level = []\n  for i in range(len(queue)):\n    node = queue.pop(0)\n    level.append(node.val)\n    if node.left: queue.append(node.left)\n    if node.right: queue.append(node.right)\n  result.append(level)\nreturn result' },
    { name: 'DFS with Depth Tracking', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'DFS but track the depth. Append to the appropriate level array.', pseudocode: 'def dfs(node, depth, result):\n  if !node: return\n  if depth == len(result): result.append([])\n  result[depth].append(node.val)\n  dfs(node.left, depth+1, result)\n  dfs(node.right, depth+1, result)' },
  ],
  dryRun: { input: 'root = [3,9,20,null,null,15,7]', steps: [
    { step: 1, state: 'queue=[3]', action: 'Level 0: [3]' },
    { step: 2, state: 'queue=[9,20]', action: 'Level 1: [9,20]' },
    { step: 3, state: 'queue=[15,7]', action: 'Level 2: [15,7]' },
    { step: 4, state: 'queue=[]', action: 'Result: [[3],[9,20],[15,7]] ✓' },
  ]},
  edgeCases: [
    { case: 'root=null', explanation: 'Empty tree — return []' },
    { case: 'root=[1]', explanation: 'Single node — return [[1]]' },
    { case: 'root=[1,2,3,4,5,6,7]', explanation: 'Complete tree — 3 levels' },
    { case: 'root=[1,2,null,3]', explanation: 'Skewed — each level has 1 node' },
    { case: 'root=[1,2,3,null,null,null,4]', explanation: 'Sparse tree — some levels have gaps' },
  ],
  visibleTests: [
    { input: { root: [3,9,20,null,null,15,7] }, expected: [[3],[9,20],[15,7]], note: 'Classic' },
    { input: { root: [1] }, expected: [[1]], note: 'Single' },
    { input: { root: [] }, expected: [], note: 'Empty' },
    { input: { root: [1,2,3,4,5,6,7] }, expected: [[1],[2,3],[4,5,6,7]], note: 'Complete' },
    { input: { root: [1,2,null,3] }, expected: [[1],[2],[3]], note: 'Left skew' },
    { input: { root: [1,2,3] }, expected: [[1],[2,3]], note: 'Simple balanced' },
    { input: { root: [5,4,8,11,null,13,4,7,2,null,null,null,1] }, expected: [[5],[4,8],[11,13,4],[7,2,1]], note: 'Complex' },
    { input: { root: [1,null,2,null,3] }, expected: [[1],[2],[3]], note: 'Right skew' },
    { input: { root: [0,1,2,3,4,5,6,7] }, expected: [[0],[1,2],[3,4,5,6],[7]], note: 'Dense' },
    { input: { root: [10,5,15,3,7,12,20] }, expected: [[10],[5,15],[3,7,12,20]], note: 'BST levels' },
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 2000 } },
  patternExplanation: { pattern: 'BFS Level-Order Traversal', why: 'BFS naturally processes nodes level by level. The key technique is processing all nodes at the current level before moving to the next (using the queue size as the level boundary). This pattern extends to zigzag, right side view, and average of levels.', related: ['t8','t9'] },
  visualDiagram: '       3          Level 0: [3]\n      / \\\n     9   20        Level 1: [9, 20]\n        / \\\n       15  7       Level 2: [15, 7]\n\nBFS Queue progression:\n[3] → process → [9, 20]\n[9, 20] → process → [15, 7]\n[15, 7] → process → []\n\nResult: [[3], [9,20], [15,7]]',
  examples: [
    { input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]', explanation: 'Three levels' },
    { input: 'root = [1]', output: '[[1]]', explanation: 'Single level' },
  ],
  constraints: ['0 ≤ number of nodes ≤ 2000', '-1000 ≤ Node.val ≤ 1000'],
},

't5': {
  description: 'Given the root of a binary tree, return the length of the diameter of the tree. The diameter is the longest path between any two nodes (may not pass through root).',
  intuition: 'At each node, the longest path through it = left height + right height. Track the global max while computing heights recursively.',
  approaches: [{ name: 'DFS Height + Global Max', complexity: { time: 'O(n)', space: 'O(h)' }, description: 'Compute height recursively. At each node, update global max with left_h + right_h.', pseudocode: 'max_d = 0\ndef height(node):\n  if !node: return 0\n  l = height(node.left)\n  r = height(node.right)\n  max_d = max(max_d, l+r)\n  return 1 + max(l, r)' }],
  dryRun: { input: 'root=[1,2,3,4,5]', steps: [{ step: 1, state: 'node=4, h=1', action: 'Leaf' }, { step: 2, state: 'node=5, h=1', action: 'Leaf' }, { step: 3, state: 'node=2, l=1,r=1', action: 'diameter=2, h=2' }, { step: 4, state: 'node=3, l=0,r=0', action: 'diameter=0' }, { step: 5, state: 'node=1, l=2,r=1', action: 'diameter=3 ★ Answer: 3 ✓' }] },
  edgeCases: [{ case: 'root=[1]', explanation: '0 — no edges' }, { case: 'root=null', explanation: '0' }, { case: 'root=[1,2,3]', explanation: 'Diameter 2 through root' }, { case: 'Skewed tree', explanation: 'Diameter = n-1 edges' }, { case: 'Diameter not through root', explanation: 'Can be in subtree' }],
  visibleTests: [{ input: { root: [1,2,3,4,5] }, expected: 3, note: '4→2→1→3' }, { input: { root: [1,2] }, expected: 1, note: 'One edge' }, { input: { root: [1] }, expected: 0, note: 'Single' }, { input: { root: [] }, expected: 0, note: 'Empty' }, { input: { root: [1,2,3] }, expected: 2, note: 'Through root' }, { input: { root: [1,2,null,3,null,4] }, expected: 3, note: 'Left chain' }, { input: { root: [1,2,3,4,5,6,7] }, expected: 4, note: 'Complete' }, { input: { root: [1,2,3,4,5,null,null,6,7,null,8] }, expected: 5, note: 'Deep left' }, { input: { root: [4,2,null,1,3] }, expected: 2, note: 'Subtree diameter' }, { input: { root: [1,2,3,null,4,null,5] }, expected: 4, note: 'Zigzag' }],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Post-Order with Global State', why: 'The diameter through a node = left height + right height. By computing heights bottom-up and tracking the max, we get O(n). The key insight is that the answer may not pass through the root.', related: ['t3','bt_17'] },
  visualDiagram: '    1\n   / \\\n  2   3\n / \\\n4   5\n\nDiameter: 4 → 2 → 1 → 3 = 3 edges\nAt node 2: l=1, r=1, path=2\nAt node 1: l=2, r=1, path=3 ★',
  examples: [{ input: 'root=[1,2,3,4,5]', output: '3', explanation: 'Path: 4→2→1→3 or 5→2→1→3' }],
  constraints: ['0 ≤ number of nodes ≤ 10⁴', '-100 ≤ Node.val ≤ 100'],
},

't8': {
  description: 'Given a binary tree and two nodes p and q, find their lowest common ancestor (LCA). The LCA is the deepest node that has both p and q as descendants.',
  intuition: 'Recursively search left and right subtrees. If both sides return non-null, current node is the LCA. If only one side returns non-null, that side contains both nodes.',
  approaches: [{ name: 'Recursive DFS', complexity: { time: 'O(n)', space: 'O(h)' }, description: 'If current node is p or q, return it. Recurse both sides. If both return non-null, current is LCA.', pseudocode: 'def lca(root, p, q):\n  if !root or root==p or root==q: return root\n  left = lca(root.left, p, q)\n  right = lca(root.right, p, q)\n  if left and right: return root\n  return left or right' }],
  dryRun: { input: 'root=[3,5,1,6,2,0,8], p=5, q=1', steps: [{ step: 1, state: 'root=3', action: 'Search left(5) and right(1)' }, { step: 2, state: 'root.left=5==p', action: 'Return 5 (left side)' }, { step: 3, state: 'root.right=1==q', action: 'Return 1 (right side)' }, { step: 4, state: 'Both non-null at root=3', action: 'LCA = 3 ✓' }] },
  edgeCases: [{ case: 'p is ancestor of q', explanation: 'p itself is the LCA' }, { case: 'p == root', explanation: 'Root is LCA' }, { case: 'p and q are siblings', explanation: 'Parent is LCA' }, { case: 'p and q are same', explanation: 'p itself is LCA' }, { case: 'Deep tree, p and q at leaves', explanation: 'LCA is their common ancestor' }],
  visibleTests: [{ input: { root: [3,5,1,6,2,0,8,null,null,7,4], p: 5, q: 1 }, expected: 3, note: 'Root is LCA' }, { input: { root: [3,5,1,6,2,0,8,null,null,7,4], p: 5, q: 4 }, expected: 5, note: 'p is ancestor' }, { input: { root: [1,2], p: 1, q: 2 }, expected: 1, note: 'Root-child' }, { input: { root: [3,5,1], p: 5, q: 1 }, expected: 3, note: 'Siblings' }, { input: { root: [1,2,3,4,5,6,7], p: 4, q: 5 }, expected: 2, note: 'Left subtree' }, { input: { root: [1,2,3,4,5,6,7], p: 6, q: 7 }, expected: 3, note: 'Right subtree' }, { input: { root: [1,2,3,4,5,6,7], p: 4, q: 7 }, expected: 1, note: 'Cross subtrees' }, { input: { root: [1,2,3,4,5,6,7], p: 2, q: 3 }, expected: 1, note: 'Children of root' }, { input: { root: [1,2,null,3], p: 2, q: 3 }, expected: 2, note: 'Left chain' }, { input: { root: [5,3,8,1,4,7,9], p: 1, q: 4 }, expected: 3, note: 'BST LCA' }],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 2, maxLen: 10000 } },
  patternExplanation: { pattern: 'LCA via Recursive Search', why: 'The recursion elegantly handles all cases: if both subtrees contain a target, current node is the split point (LCA). If only one side has both targets, propagate that result up. O(n) time with a single pass.', related: ['bst3','bt_8'] },
  visualDiagram: '       3\n      / \\\n     5   1\n    / \\ / \\\n   6  2 0  8\n     / \\\n    7   4\n\nLCA(5, 1) = 3  (split at root)\nLCA(5, 4) = 5  (p is ancestor)',
  examples: [{ input: 'root=[3,5,1,6,2,0,8,null,null,7,4], p=5, q=1', output: '3', explanation: 'Root 3 has 5 in left and 1 in right subtree' }],
  constraints: ['2 ≤ number of nodes ≤ 10⁵', '-10⁹ ≤ Node.val ≤ 10⁹', 'p ≠ q', 'p and q exist in the tree'],
},

't10': {
  description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST has left < root < right for all nodes.',
  intuition: 'Pass valid range (min, max) to each node. A node is valid if its value is within the range and both subtrees are valid with updated ranges.',
  approaches: [{ name: 'Recursive with Range', complexity: { time: 'O(n)', space: 'O(h)' }, description: 'Each node must be within (min, max). Update range as you recurse.', pseudocode: 'def isValid(node, lo, hi):\n  if !node: return true\n  if node.val<=lo or node.val>=hi: return false\n  return isValid(node.left, lo, node.val) and\n         isValid(node.right, node.val, hi)' }, { name: 'Inorder Traversal', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Inorder of BST should be strictly increasing.', pseudocode: 'prev = -inf\ndef inorder(node):\n  if !node: return true\n  if !inorder(node.left): return false\n  if node.val<=prev: return false\n  prev = node.val\n  return inorder(node.right)' }],
  dryRun: { input: 'root=[2,1,3]', steps: [{ step: 1, state: 'node=2, range=(-∞,∞)', action: '2 is valid' }, { step: 2, state: 'node=1, range=(-∞,2)', action: '1<2 valid' }, { step: 3, state: 'node=3, range=(2,∞)', action: '3>2 valid → true ✓' }] },
  edgeCases: [{ case: 'root=[1]', explanation: 'Single node — always valid' }, { case: 'root=[5,1,4,null,null,3,6]', explanation: 'Right child 4<5 → invalid' }, { case: 'root=[2,2,2]', explanation: 'Equal values → invalid (strict inequality)' }, { case: 'root=[5,4,6,null,null,3,7]', explanation: '3<5 in right subtree → invalid' }, { case: 'root=null', explanation: 'Empty → valid' }],
  visibleTests: [{ input: { root: [2,1,3] }, expected: true, note: 'Valid BST' }, { input: { root: [5,1,4,null,null,3,6] }, expected: false, note: '4<5 right child' }, { input: { root: [1] }, expected: true, note: 'Single' }, { input: { root: [] }, expected: true, note: 'Empty' }, { input: { root: [2,2,2] }, expected: false, note: 'Equal values' }, { input: { root: [5,3,7,2,4,6,8] }, expected: true, note: 'Full BST' }, { input: { root: [10,5,15,null,null,6,20] }, expected: false, note: '6<10 in right' }, { input: { root: [1,null,2,null,3] }, expected: true, note: 'Right chain' }, { input: { root: [3,null,30,10] }, expected: false, note: '10<30 but 10<3 issue' }, { input: { root: [120,70,140,50,100,130,160] }, expected: true, note: 'Large BST' }],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'BST Property Validation', why: 'The range-passing technique ensures each node satisfies the BST invariant relative to ALL ancestors, not just its parent. A common mistake is only checking parent — but a node in the right subtree must also be greater than all ancestors above.', related: ['bst1','bst2'] },
  visualDiagram: '    5\n   / \\\n  1   4    ← 4 < 5 in right subtree → INVALID\n     / \\\n    3   6\n\n    2\n   / \\\n  1   3    ← 1<2<3 → VALID BST',
  examples: [{ input: 'root=[2,1,3]', output: 'true', explanation: '1<2<3' }, { input: 'root=[5,1,4,null,null,3,6]', output: 'false', explanation: '4 is in right subtree but < 5' }],
  constraints: ['0 ≤ number of nodes ≤ 10⁴', '-2³¹ ≤ Node.val ≤ 2³¹-1'],
},

't2': {
  description: 'Given the root of a binary tree, return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
  intuition: 'The maximum depth of a tree is 1 plus the maximum of the depths of its left and right subtrees. This naturally translates to a recursive DFS or a level-by-level BFS.',
  approaches: [
    { name: 'Recursive DFS (Optimal)', complexity: { time: 'O(N)', space: 'O(H)' }, description: 'Recursively compute the depth of left and right children, returning 1 + max(left, right).', pseudocode: 'def maxDepth(node):\n  if not node: return 0\n  return 1 + max(maxDepth(node.left), maxDepth(node.right))' },
    { name: 'Iterative BFS', complexity: { time: 'O(N)', space: 'O(W)' }, description: 'Level order traversal. Each level processed increments depth by 1.', pseudocode: 'queue = [root]\ndepth = 0\nwhile queue:\n  depth += 1\n  for i in len(queue):\n    node = queue.pop()\n    if node.left: queue.push(node.left)\n    if node.right: queue.push(node.right)\nreturn depth' }
  ],
  dryRun: { input: 'root=[3,9,20,null,null,15,7]', steps: [
    { step: 1, state: 'node=3', action: 'Needs maxDepth(9) and maxDepth(20)' },
    { step: 2, state: 'node=9', action: 'Returns 1 + max(0,0) = 1' },
    { step: 3, state: 'node=20', action: 'Needs maxDepth(15) and maxDepth(7)' },
    { step: 4, state: 'node=15, 7', action: 'Both return 1' },
    { step: 5, state: 'node=20', action: 'Returns 1 + max(1,1) = 2' },
    { step: 6, state: 'node=3', action: 'Returns 1 + max(1,2) = 3 ✓' }
  ]},
  edgeCases: [
    { case: 'Empty tree', explanation: 'Returns 0 immediately.' },
    { case: 'Single node', explanation: 'Returns 1.' },
    { case: 'Unbalanced tree', explanation: 'A line of nodes (linked list) returns N.' }
  ],
  visibleTests: [
    { input: { root: [3,9,20,null,null,15,7] }, expected: 3, note: 'Classic case' },
    { input: { root: [1,null,2] }, expected: 2, note: 'Right leaning' }
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Tree Post-Order Traversal', why: 'We need the result from children before computing the result for the parent, which is the essence of post-order DFS.', related: ['t5', 't10'] },
  visualDiagram: '    3   <-- Level 1 (Depth 3)\n   / \\\n  9  20 <-- Level 2\n    /  \\\n   15   7 <-- Level 3\nMaximum depth is 3.',
  examples: [
    { input: 'root=[3,9,20,null,null,15,7]', output: '3', explanation: 'Longest path is 3->20->15.' }
  ],
  constraints: ['0 <= number of nodes <= 10^4', '-100 <= Node.val <= 100']
},

't4': {
  description: 'Given the roots of two binary trees p and q, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.',
  intuition: 'We can traverse both trees simultaneously. At each step, we check if the current nodes are both null, both non-null with the same value, or different. If they are the same, we recursively check their left and right subtrees.',
  approaches: [
    { name: 'Recursive DFS (Optimal)', complexity: { time: 'O(N)', space: 'O(H)' }, description: 'Recursively check if current nodes match, and if their left and right subtrees match.', pseudocode: 'def isSameTree(p, q):\n  if not p and not q: return true\n  if not p or not q: return false\n  if p.val != q.val: return false\n  return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)' }
  ],
  dryRun: { input: 'p=[1,2,3], q=[1,2,3]', steps: [
    { step: 1, state: 'p=1, q=1', action: 'Match. Recurse left and right.' },
    { step: 2, state: 'p.left=2, q.left=2', action: 'Match. Both children null -> return true.' },
    { step: 3, state: 'p.right=3, q.right=3', action: 'Match. Both children null -> return true.' },
    { step: 4, state: 'Root', action: 'Both sides true. Return true. ✓' }
  ]},
  edgeCases: [
    { case: 'Both trees empty', explanation: 'Returns true immediately.' },
    { case: 'One empty, one not', explanation: 'Returns false.' },
    { case: 'Same structure, different values', explanation: 'Fails at value check, returns false.' }
  ],
  visibleTests: [
    { input: { p: [1,2,3], q: [1,2,3] }, expected: true, note: 'Identical' },
    { input: { p: [1,2], q: [1,null,2] }, expected: false, note: 'Different structure' }
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 0, maxLen: 100 } },
  patternExplanation: { pattern: 'Simultaneous Traversal', why: 'Traversing two data structures in tandem allows point-by-point comparison.', related: ['t7'] },
  visualDiagram: 'Tree p:   1       Tree q:   1\n         / \\               / \\\n        2   3             2   3\np(1) == q(1)\np(2) == q(2)\np(3) == q(3)\nStructurally and value-wise identical.',
  examples: [
    { input: 'p=[1,2,3], q=[1,2,3]', output: 'true', explanation: 'Both trees match exactly.' }
  ],
  constraints: ['0 <= number of nodes in both trees <= 100', '-10^4 <= Node.val <= 10^4']
}
};
