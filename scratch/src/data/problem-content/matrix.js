// Matrix — Production Problem Content
export const matrixContent = {
'mx1': {
  description: 'Given an m x n matrix, return all elements of the matrix in spiral order.',
  intuition: 'Maintain four boundaries: top, bottom, left, right. Traverse top row (left to right), right column (top to bottom), bottom row (right to left), and left column (bottom to top). Shrink boundaries after each traversal.',
  approaches: [
    { name: 'Boundary Simulation', complexity: { time: 'O(m*n)', space: 'O(1)' }, description: 'Simulate the spiral using 4 pointers for boundaries.', pseudocode: 'while top<=bottom and left<=right:\n  for col in left..right: add(matrix[top][col])\n  top++\n  for row in top..bottom: add(matrix[row][right])\n  right--\n  if top<=bottom:\n    for col in right..left: add(matrix[bottom][col])\n    bottom--\n  if left<=right:\n    for row in bottom..top: add(matrix[row][left])\n    left--' }
  ],
  dryRun: { input: '[[1,2,3],[4,5,6],[7,8,9]]', steps: [
    { step: 1, state: 'top=0', action: 'Traverse [1,2,3], top becomes 1' },
    { step: 2, state: 'right=2', action: 'Traverse [6,9], right becomes 1' },
    { step: 3, state: 'bottom=2', action: 'Traverse [8,7], bottom becomes 1' },
    { step: 4, state: 'left=0', action: 'Traverse [4], left becomes 1' },
    { step: 5, state: 'top=1', action: 'Traverse [5], done.' }
  ]},
  edgeCases: [
    { case: '1D array (1 row or 1 col)', explanation: 'Handled correctly by boundary checks before reverse traversals.' },
    { case: 'Empty matrix', explanation: 'Return empty array.' }
  ],
  visibleTests: [
    { input: { matrix: [[1,2,3],[4,5,6],[7,8,9]] }, expected: [1,2,3,6,9,8,7,4,5], note: '3x3 matrix' },
    { input: { matrix: [[1,2,3,4],[5,6,7,8],[9,10,11,12]] }, expected: [1,2,3,4,8,12,11,10,9,5,6,7], note: '3x4 matrix' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 10 } },
  patternExplanation: { pattern: 'Matrix Simulation', why: 'A direct simulation of the process using boundaries avoids complex math or state tracking.', related: ['mx2'] },
  visualDiagram: '1 → 2 → 3\n        ↓\n4 → 5   6\n↑       ↓\n7 ← 8 ← 9',
  examples: [
    { input: 'matrix = [[1,2,3],[4,5,6],[7,8,9]]', output: '[1,2,3,6,9,8,7,4,5]', explanation: 'Spiral order.' }
  ],
  constraints: ['1 <= m, n <= 10', '-100 <= matrix[i][j] <= 100']
},

'mx2': {
  description: 'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise). You have to rotate the image in-place, which means you have to modify the input 2D matrix directly.',
  intuition: 'A clockwise 90-degree rotation can be achieved by first transposing the matrix (swapping elements across the main diagonal), and then reversing each row.',
  approaches: [
    { name: 'Transpose and Reverse', complexity: { time: 'O(n^2)', space: 'O(1)' }, description: 'Transpose the matrix then reverse each row.', pseudocode: 'for i in 0..n:\n  for j in i..n:\n    swap(matrix[i][j], matrix[j][i])\nfor i in 0..n:\n  matrix[i].reverse()' },
    { name: 'Rotate Four Cells', complexity: { time: 'O(n^2)', space: 'O(1)' }, description: 'Rotate cells in groups of four starting from the outermost ring to the center.', pseudocode: 'for i in 0..n//2:\n  for j in i..n-i-1:\n    temp = matrix[i][j]\n    matrix[i][j] = matrix[n-1-j][i]\n    matrix[n-1-j][i] = matrix[n-1-i][n-1-j]\n    matrix[n-1-i][n-1-j] = matrix[j][n-1-i]\n    matrix[j][n-1-i] = temp' }
  ],
  dryRun: { input: 'matrix = [[1,2,3],[4,5,6],[7,8,9]]', steps: [
    { step: 1, state: 'Transpose', action: '[[1,4,7],[2,5,8],[3,6,9]]' },
    { step: 2, state: 'Reverse Rows', action: '[[7,4,1],[8,5,2],[9,6,3]] ✓' }
  ]},
  edgeCases: [
    { case: '1x1 matrix', explanation: 'Nothing happens, returns itself.' }
  ],
  visibleTests: [
    { input: { matrix: [[1,2,3],[4,5,6],[7,8,9]] }, expected: [[7,4,1],[8,5,2],[9,6,3]], note: '3x3 matrix' },
    { input: { matrix: [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]] }, expected: [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]], note: '4x4 matrix' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 20 } },
  patternExplanation: { pattern: 'Matrix Transformations', why: 'Mathematical properties of matrices allow decomposing complex rotations into simpler operations like transpose and reverse.', related: ['mx1'] },
  visualDiagram: '1 2 3      1 4 7      7 4 1\n4 5 6  ->  2 5 8  ->  8 5 2\n7 8 9      3 6 9      9 6 3\nTransposed  ->  Reversed rows',
  examples: [
    { input: 'matrix=[[1,2],[3,4]]', output: '[[3,1],[4,2]]', explanation: 'Rotated 90 deg clockwise.' }
  ],
  constraints: ['n == matrix.length == matrix[i].length', '1 <= n <= 20', '-1000 <= matrix[i][j] <= 1000']
},

'mx3': {
  description: 'Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.',
  intuition: 'We can use DFS with backtracking. For each cell, if it matches the first letter of the word, we start a DFS to find the rest of the word, marking cells as visited (e.g. replacing with a special character) to avoid reusing them.',
  approaches: [
    { name: 'DFS with Backtracking (Optimal)', complexity: { time: 'O(m*n*4^L)', space: 'O(L)' }, description: 'DFS from each matching starting cell. L is word length.', pseudocode: 'def dfs(r, c, i):\n  if i == len(word): return true\n  if out_of_bounds or board[r][c] != word[i]: return false\n  temp = board[r][c]\n  board[r][c] = "#"\n  res = dfs(r+1,c,i+1) or dfs(r-1,c,i+1) or dfs(r,c+1,i+1) or dfs(r,c-1,i+1)\n  board[r][c] = temp\n  return res' }
  ],
  dryRun: { input: 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="ABCCED"', steps: [
    { step: 1, state: 'Start at (0,0)="A"', action: 'dfs(0,0,0)' },
    { step: 2, state: 'Next "B" at (0,1)', action: 'dfs(0,1,1)' },
    { step: 3, state: 'Next "C" at (0,2)', action: 'dfs(0,2,2)' },
    { step: 4, state: 'Next "C" at (1,2)', action: 'dfs(1,2,3)' },
    { step: 5, state: 'Next "E" at (2,2)', action: 'dfs(2,2,4)' },
    { step: 6, state: 'Next "D" at (2,1)', action: 'dfs(2,1,5) -> success! ✓' }
  ]},
  edgeCases: [
    { case: 'Word longer than total cells', explanation: 'Impossible, return false.' },
    { case: 'Single cell board', explanation: 'Matches if single char matches.' }
  ],
  visibleTests: [
    { input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCCED" }, expected: true, note: 'Classic snake' },
    { input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCB" }, expected: false, note: 'Self-intersecting' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 6 } },
  patternExplanation: { pattern: 'Backtracking on Grid', why: 'Similar to standard backtracking, but the state space is the grid cells and transitions are adjacent cells.', related: ['rc9'] },
  visualDiagram: 'A B C E\nS F C S\nA D E E\n\nWord = "ABCCED"\nPath: A(0,0)->B(0,1)->C(0,2)->C(1,2)->E(2,2)->D(2,1)',
  examples: [
    { input: 'board=[["A","B"],["C","D"]], word="ACDB"', output: 'true', explanation: 'A->C->D->B' }
  ],
  constraints: ['m == board.length', 'n == board[i].length', '1 <= m, n <= 6', '1 <= word.length <= 15']
}
};

