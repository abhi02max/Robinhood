// Binary Search Tree — Production Problem Content
export const bstContent = {
'bst1': {
  description: 'Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.',
  intuition: 'An inorder traversal of a BST visits nodes in strictly increasing order. We just need to do an inorder traversal and stop at the kth node.',
  approaches: [
    { name: 'Iterative Inorder (Optimal)', complexity: { time: 'O(H + k)', space: 'O(H)' }, description: 'Use a stack to simulate inorder traversal. Count down k as we pop nodes.', pseudocode: 'stack = []\ncurr = root\nwhile stack or curr:\n  while curr:\n    stack.append(curr)\n    curr = curr.left\n  curr = stack.pop()\n  k -= 1\n  if k == 0: return curr.val\n  curr = curr.right' },
    { name: 'Recursive Inorder', complexity: { time: 'O(N)', space: 'O(N)' }, description: 'Build an array of inorder values, then return arr[k-1].', pseudocode: 'def inorder(node):\n  if not node: return []\n  return inorder(node.left) + [node.val] + inorder(node.right)\nreturn inorder(root)[k-1]' }
  ],
  dryRun: { input: 'root=[3,1,4,null,2], k=1', steps: [
    { step: 1, state: 'curr=3, push 3, curr=1', action: 'Go left' },
    { step: 2, state: 'curr=1, push 1, curr=null', action: 'Go left' },
    { step: 3, state: 'pop 1, k=0', action: 'k reached 0. Return 1 ✓' }
  ]},
  edgeCases: [
    { case: 'k = 1', explanation: 'Smallest element, left-most leaf.' },
    { case: 'k = n', explanation: 'Largest element, right-most leaf.' }
  ],
  visibleTests: [
    { input: { root: [3,1,4,null,2], k: 1 }, expected: 1, note: 'Smallest' },
    { input: { root: [5,3,6,2,4,null,null,1], k: 3 }, expected: 3, note: 'Mid element' }
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Inorder Traversal of BST', why: 'Inorder guarantees sorted order in a BST. Iterative stack allows us to stop early at k, saving time.', related: ['t10', 'bst2'] },
  visualDiagram: '   3\n  / \\\n 1   4\n  \\\n   2\n\nInorder: 1, 2, 3, 4. k=1 -> 1',
  examples: [
    { input: 'root=[3,1,4,null,2], k=1', output: '1', explanation: '1 is the smallest.' }
  ],
  constraints: ['1 <= k <= n <= 10^4']
},

'bst2': {
  description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).',
  intuition: 'Each node must be strictly greater than all ancestors in its left subtree, and strictly less than all ancestors in its right subtree. We can pass a valid range (min, max) down the recursion tree.',
  approaches: [
    { name: 'Recursive Range Check', complexity: { time: 'O(N)', space: 'O(H)' }, description: 'Check if each node value falls within its allowed (min, max) bounds.', pseudocode: 'def validate(node, low, high):\n  if not node: return true\n  if node.val <= low or node.val >= high: return false\n  return validate(node.left, low, node.val) and validate(node.right, node.val, high)' }
  ],
  dryRun: { input: 'root=[5,1,4,null,null,3,6]', steps: [
    { step: 1, state: 'node=5, (-inf, inf)', action: 'Valid.' },
    { step: 2, state: 'node=1, (-inf, 5)', action: 'Valid.' },
    { step: 3, state: 'node=4, (5, inf)', action: '4 is NOT > 5. Invalid!' },
    { step: 4, state: 'Return false', action: 'Tree is not a BST.' }
  ]},
  edgeCases: [
    { case: 'Single node', explanation: 'Always valid.' },
    { case: 'Duplicates', explanation: 'BST strictly enforces uniqueness (< and >), so duplicates return false.' }
  ],
  visibleTests: [
    { input: { root: [2,1,3] }, expected: true, note: 'Valid' },
    { input: { root: [5,1,4,null,null,3,6] }, expected: false, note: 'Invalid at right child' }
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Top-Down Range Passing', why: 'Essential for any problem that requires verifying properties against all ancestors, not just direct parents.', related: ['bst1', 't10'] },
  visualDiagram: '    5\n   / \\\n  1   4    <-- 4 is in right subtree of 5, but 4 < 5. Invalid.\n     / \\\n    3   6',
  examples: [
    { input: 'root=[5,1,4,null,null,3,6]', output: 'false', explanation: 'Root is 5, but its right child is 4.' }
  ],
  constraints: ['1 <= n <= 10^4', '-2^31 <= Node.val <= 2^31 - 1']
},

'bst3': {
  description: 'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.',
  intuition: 'In a BST, if both p and q are less than the root, their LCA must be in the left subtree. If both are greater, it must be in the right subtree. If they split (one is less, one is greater, or one equals the root), the current root is the LCA.',
  approaches: [
    { name: 'Iterative Splitting (Optimal)', complexity: { time: 'O(H)', space: 'O(1)' }, description: 'Traverse down. Stop when p and q diverge.', pseudocode: 'curr = root\nwhile curr:\n  if p.val < curr.val and q.val < curr.val:\n    curr = curr.left\n  elif p.val > curr.val and q.val > curr.val:\n    curr = curr.right\n  else:\n    return curr' }
  ],
  dryRun: { input: 'root=[6,2,8,0,4,7,9,null,null,3,5], p=2, q=8', steps: [
    { step: 1, state: 'curr=6', action: 'p=2 < 6, q=8 > 6. They split!' },
    { step: 2, state: 'Return curr', action: 'LCA is 6.' }
  ]},
  edgeCases: [
    { case: 'p is ancestor of q', explanation: 'Current node will equal p, dropping into the `else` block and returning p.' }
  ],
  visibleTests: [
    { input: { root: [6,2,8,0,4,7,9,null,null,3,5], p: 2, q: 8 }, expected: 6, note: 'Split at root' },
    { input: { root: [6,2,8,0,4,7,9,null,null,3,5], p: 2, q: 4 }, expected: 2, note: 'Ancestor' }
  ],
  hiddenTestConfig: { generator: 'treeProblem', constraints: { minLen: 2, maxLen: 100000 } },
  patternExplanation: { pattern: 'BST Split Point', why: 'The LCA in a BST is exclusively determined by the first node whose value lies between p and q.', related: ['t8'] },
  visualDiagram: '        6  <-- LCA of 2 and 8\n       / \\\n      2   8\n     / \\\n    0   4',
  examples: [
    { input: 'root=[6,2,8,0,4,7,9,null,null,3,5], p=2, q=8', output: '6', explanation: 'LCA is 6.' }
  ],
  constraints: ['2 <= n <= 10^5', 'p and q will exist in the BST.', 'p != q']
}
};
