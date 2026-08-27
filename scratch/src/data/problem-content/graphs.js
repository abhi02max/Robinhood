// Graphs — Production Problem Content
export const graphsContent = {
'g1': {
  description: 'Given an m x n 2D binary grid which represents a map of "1"s (land) and "0"s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
  intuition: 'Scan the grid. When you find a "1", it\'s a new island — run DFS/BFS to mark all connected land as visited. Count how many times you trigger a new search.',
  approaches: [
    { name: 'DFS Flood Fill', complexity: { time: 'O(m×n)', space: 'O(m×n)' }, description: 'For each unvisited "1", DFS mark all connected "1"s. Increment island count.', pseudocode: 'count = 0\nfor i,j in grid:\n  if grid[i][j] == "1":\n    dfs(i, j)  # marks all connected as "0"\n    count++\nreturn count' },
    { name: 'BFS', complexity: { time: 'O(m×n)', space: 'O(min(m,n))' }, description: 'Same approach but using BFS queue instead of recursive DFS.', pseudocode: 'Same logic, queue-based traversal' },
  ],
  dryRun: { input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', steps: [
    { step: 1, state: '(0,0)="1" → new island #1', action: 'DFS marks (0,0),(0,1),(1,0) as visited' },
    { step: 2, state: '(2,2)="1" → new island #2', action: 'DFS marks (2,2)' },
    { step: 3, state: 'Scan complete', action: 'Count = 2 ✓' },
  ]},
  edgeCases: [
    { case: 'grid=[["0"]]', explanation: 'All water — 0 islands' },
    { case: 'grid=[["1"]]', explanation: 'Single land cell — 1 island' },
    { case: 'All "1"s', explanation: 'Entire grid is one island' },
    { case: 'Checkerboard pattern', explanation: 'Every other cell — each "1" is its own island' },
    { case: 'Single row/column', explanation: 'Linear grid — connected components in 1D' },
  ],
  visibleTests: [
    { input: { grid: [['1','1','1','1','0'],['1','1','0','1','0'],['1','1','0','0','0'],['0','0','0','0','0']] }, expected: 1, note: 'One large island' },
    { input: { grid: [['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']] }, expected: 3, note: 'Three islands' },
    { input: { grid: [['0']] }, expected: 0, note: 'All water' },
    { input: { grid: [['1']] }, expected: 1, note: 'Single cell' },
    { input: { grid: [['1','0','1'],['0','1','0'],['1','0','1']] }, expected: 5, note: 'Checkerboard' },
    { input: { grid: [['1','1','1'],['1','1','1'],['1','1','1']] }, expected: 1, note: 'All land' },
    { input: { grid: [['0','0','0'],['0','0','0']] }, expected: 0, note: 'All zeros' },
    { input: { grid: [['1','0','1','0','1']] }, expected: 3, note: 'Single row' },
    { input: { grid: [['1'],['0'],['1'],['0'],['1']] }, expected: 3, note: 'Single col' },
    { input: { grid: [['1','1','0','0'],['0','1','1','0'],['0','0','1','0'],['1','0','0','1']] }, expected: 3, note: 'Complex' },
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 300 } },
  patternExplanation: { pattern: 'Grid DFS/BFS (Connected Components)', why: 'Counting islands is counting connected components in a grid graph. DFS/BFS flood fill marks visited cells, preventing double-counting. This pattern is the foundation for all grid traversal problems.', related: ['g8','g17','g11'] },
  visualDiagram: 'Grid:           Islands:\n1 1 0 0 0       ■ ■ . . .\n1 1 0 0 0       ■ ■ . . .  → Island 1\n0 0 1 0 0       . . ■ . .  → Island 2\n0 0 0 1 1       . . . ■ ■  → Island 3\n\nCount = 3',
  examples: [
    { input: 'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]', output: '2', explanation: 'Top-left cluster and bottom-right cell' },
  ],
  constraints: ['m == grid.length', 'n == grid[i].length', '1 ≤ m, n ≤ 300', 'grid[i][j] is "0" or "1"'],
},

'g4': {
  description: 'There are a total of numCourses courses you have to take. Some courses have prerequisites. Given the total number and a list of prerequisite pairs, determine if it is possible to finish all courses.',
  intuition: 'This is cycle detection in a directed graph. If the prerequisite graph has a cycle, you can\'t finish all courses. Use topological sort (BFS with in-degree) or DFS with visited states.',
  approaches: [
    { name: 'BFS Topological Sort (Kahn\'s)', complexity: { time: 'O(V+E)', space: 'O(V+E)' }, description: 'Compute in-degrees. Start BFS from nodes with 0 in-degree. If all nodes are processed, no cycle.', pseudocode: 'indegree = [0]*n\nfor a,b in prereqs: indegree[a]++\nqueue = [i for i if indegree[i]==0]\ncount = 0\nwhile queue:\n  node = queue.pop()\n  count++\n  for neighbor in adj[node]:\n    indegree[neighbor]--\n    if indegree[neighbor]==0: queue.append(neighbor)\nreturn count == n' },
    { name: 'DFS Cycle Detection', complexity: { time: 'O(V+E)', space: 'O(V+E)' }, description: 'DFS with 3 states: unvisited, in-progress, done. If we visit an in-progress node, cycle exists.', pseudocode: 'state = [0]*n  # 0=unvisited, 1=in-progress, 2=done\ndef dfs(node):\n  if state[node]==1: return false  # cycle!\n  if state[node]==2: return true\n  state[node] = 1\n  for nei in adj[node]:\n    if !dfs(nei): return false\n  state[node] = 2\n  return true' },
  ],
  dryRun: { input: 'numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]', steps: [
    { step: 1, state: 'indegree=[0,1,1,2]', action: 'Course 0 has 0 prereqs → start' },
    { step: 2, state: 'Process 0 → reduce 1,2', action: 'indegree=[0,0,0,2], queue=[1,2]' },
    { step: 3, state: 'Process 1 → reduce 3', action: 'indegree=[0,0,0,1]' },
    { step: 4, state: 'Process 2 → reduce 3', action: 'indegree=[0,0,0,0], queue=[3]' },
    { step: 5, state: 'Process 3', action: 'count=4 == numCourses → true ✓' },
  ]},
  edgeCases: [
    { case: 'numCourses=1, prereqs=[]', explanation: 'No prerequisites — always possible' },
    { case: 'numCourses=2, prereqs=[[0,1],[1,0]]', explanation: 'Mutual dependency cycle — impossible' },
    { case: 'numCourses=3, prereqs=[]', explanation: 'No dependencies — all independent' },
    { case: 'Linear chain: 0→1→2→3', explanation: 'No cycle — possible in order' },
    { case: 'Self-loop: [[0,0]]', explanation: 'Course requires itself — impossible' },
  ],
  visibleTests: [
    { input: { numCourses: 2, prerequisites: [[1,0]] }, expected: true, note: 'Simple dependency' },
    { input: { numCourses: 2, prerequisites: [[1,0],[0,1]] }, expected: false, note: 'Cycle' },
    { input: { numCourses: 1, prerequisites: [] }, expected: true, note: 'No prereqs' },
    { input: { numCourses: 4, prerequisites: [[1,0],[2,0],[3,1],[3,2]] }, expected: true, note: 'Diamond' },
    { input: { numCourses: 3, prerequisites: [[0,1],[1,2],[2,0]] }, expected: false, note: '3-cycle' },
    { input: { numCourses: 5, prerequisites: [] }, expected: true, note: 'All independent' },
    { input: { numCourses: 3, prerequisites: [[1,0],[2,1]] }, expected: true, note: 'Chain' },
    { input: { numCourses: 4, prerequisites: [[0,1],[3,1],[1,3],[3,2]] }, expected: false, note: 'Complex cycle' },
    { input: { numCourses: 2, prerequisites: [[0,1]] }, expected: true, note: 'Reverse order' },
    { input: { numCourses: 6, prerequisites: [[1,0],[2,1],[3,2],[4,3],[5,4]] }, expected: true, note: 'Long chain' },
  ],
  hiddenTestConfig: { generator: 'graphProblem', constraints: { minLen: 1, maxLen: 2000 } },
  patternExplanation: { pattern: 'Topological Sort / Cycle Detection', why: 'Course prerequisites form a directed graph. Completing all courses requires a valid topological ordering, which exists if and only if the graph is a DAG (no cycles). Kahn\'s algorithm (BFS) naturally detects cycles.', related: ['g5','ga6','ga7'] },
  visualDiagram: 'Prerequisites: [[1,0],[2,0],[3,1],[3,2]]\n\n  0 → 1 → 3\n  ↓       ↑\n  2 ──────┘\n\nTopological order: 0, 1, 2, 3 (or 0, 2, 1, 3)\nNo cycle → Can finish all courses ✓',
  examples: [
    { input: 'numCourses=2, prerequisites=[[1,0]]', output: 'true', explanation: 'Take course 0 first, then 1' },
    { input: 'numCourses=2, prerequisites=[[1,0],[0,1]]', output: 'false', explanation: 'Circular dependency' },
  ],
  constraints: ['1 ≤ numCourses ≤ 2000', '0 ≤ prerequisites.length ≤ 5000', 'prerequisites[i].length == 2', 'No duplicate edges'],
},

'g8': {
  description: 'You are given an m x n grid where each cell can have one of three values: 0 (empty), 1 (fresh orange), 2 (rotten orange). Every minute, any fresh orange adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh orange remains. If impossible, return -1.',
  intuition: 'Multi-source BFS: start from ALL rotten oranges simultaneously. Each BFS level = 1 minute. After BFS completes, check if any fresh oranges remain.',
  approaches: [
    { name: 'Multi-Source BFS (Optimal)', complexity: { time: 'O(m×n)', space: 'O(m×n)' }, description: 'Enqueue all rotten oranges. BFS level by level. Count fresh oranges; if any remain after BFS, return -1.', pseudocode: 'queue = all (i,j) where grid[i][j]==2\nfresh_count = count of 1s\nminutes = 0\nwhile queue and fresh_count > 0:\n  minutes++\n  for each in current level:\n    for each neighbor:\n      if grid[nei]==1:\n        grid[nei]=2\n        fresh_count--\n        queue.append(nei)\nreturn -1 if fresh_count > 0 else minutes' },
  ],
  dryRun: { input: 'grid=[[2,1,1],[1,1,0],[0,1,1]]', steps: [
    { step: 1, state: 'Rotten: (0,0). Fresh=6', action: 'Queue: [(0,0)]' },
    { step: 2, state: 'Min 1: (0,0) rots (0,1),(1,0)', action: 'Fresh=4' },
    { step: 3, state: 'Min 2: (0,1) rots (0,2), (1,0) rots (1,1)', action: 'Fresh=2' },
    { step: 4, state: 'Min 3: (1,1) rots (2,1)', action: 'Fresh=1' },
    { step: 5, state: 'Min 4: (2,1) rots (2,2)', action: 'Fresh=0 → answer: 4 ✓' },
  ]},
  edgeCases: [
    { case: 'grid=[[0]]', explanation: 'No oranges — 0 minutes' },
    { case: 'grid=[[2]]', explanation: 'Only rotten — 0 minutes' },
    { case: 'grid=[[1]]', explanation: 'Only fresh, no rotten — impossible, return -1' },
    { case: 'grid=[[2,1,1],[0,0,0],[1,1,2]]', explanation: 'Disconnected fresh oranges — check reachability' },
    { case: 'grid=[[2,2,2]]', explanation: 'All already rotten — 0 minutes' },
  ],
  visibleTests: [
    { input: { grid: [[2,1,1],[1,1,0],[0,1,1]] }, expected: 4, note: 'Classic case' },
    { input: { grid: [[2,1,1],[0,1,1],[1,0,1]] }, expected: -1, note: 'Unreachable' },
    { input: { grid: [[0,2]] }, expected: 0, note: 'No fresh' },
    { input: { grid: [[0]] }, expected: 0, note: 'Empty' },
    { input: { grid: [[1]] }, expected: -1, note: 'No rotten source' },
    { input: { grid: [[2,2],[1,1]] }, expected: 1, note: 'Two sources' },
    { input: { grid: [[1,2,1,1,2,1,1]] }, expected: 2, note: 'Linear' },
    { input: { grid: [[2,1,1],[1,1,1],[1,1,2]] }, expected: 2, note: 'Two corners' },
    { input: { grid: [[0,0,0],[0,0,0]] }, expected: 0, note: 'All empty' },
    { input: { grid: [[2,0,1]] }, expected: -1, note: 'Blocked by empty' },
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 100 } },
  patternExplanation: { pattern: 'Multi-Source BFS', why: 'When you have multiple starting points spreading simultaneously, multi-source BFS handles this naturally — enqueue all sources at level 0. Each BFS level represents one time unit. This pattern also applies to "nearest 0" and "walls and gates" problems.', related: ['g10','g9','g16'] },
  visualDiagram: 'Time 0:  2 1 1    Time 1:  2 2 1    Time 2:  2 2 2\n         1 1 0             2 1 0             2 2 0\n         0 1 1             0 1 1             0 2 1\n\nTime 3:  2 2 2    Time 4:  2 2 2\n         2 2 0             2 2 0\n         0 2 1             0 2 2  ← all rotten!\n\nAnswer: 4 minutes',
  examples: [
    { input: 'grid=[[2,1,1],[1,1,0],[0,1,1]]', output: '4', explanation: 'Rot spreads from top-left over 4 minutes' },
    { input: 'grid=[[2,1,1],[0,1,1],[1,0,1]]', output: '-1', explanation: 'Bottom-left orange is unreachable' },
  ],
  constraints: ['m == grid.length', 'n == grid[i].length', '1 ≤ m, n ≤ 10', 'grid[i][j] is 0, 1, or 2'],
},

'g2': {
  description: 'Given a reference of a node in a connected undirected graph. Return a deep copy (clone) of the graph.',
  intuition: 'We can traverse the graph using DFS or BFS. Since it\'s a graph, there might be cycles. We must use a hash map to keep track of already cloned nodes to avoid infinite loops.',
  approaches: [
    { name: 'DFS with HashMap (Optimal)', complexity: { time: 'O(V+E)', space: 'O(V)' }, description: 'Recursively clone nodes, storing them in a hash map to handle cycles.', pseudocode: 'clones = {}\ndef clone(node):\n  if not node: return null\n  if node in clones: return clones[node]\n  cloned_node = Node(node.val)\n  clones[node] = cloned_node\n  for nei in node.neighbors:\n    cloned_node.neighbors.append(clone(nei))\n  return cloned_node' }
  ],
  dryRun: { input: 'adjList = [[2,4],[1,3],[2,4],[1,3]]', steps: [
    { step: 1, state: 'Visit 1', action: 'Create Clone(1), add to map' },
    { step: 2, state: 'Neighbors of 1: 2, 4', action: 'Visit 2' },
    { step: 3, state: 'Visit 2', action: 'Create Clone(2), add to map' },
    { step: 4, state: 'Neighbors of 2: 1, 3', action: 'Neighbor 1 is in map! Link it.' },
    { step: 5, state: 'Complete traversal', action: 'All nodes cloned and linked ✓' }
  ]},
  edgeCases: [
    { case: 'Empty graph', explanation: 'Return null.' },
    { case: 'Single node', explanation: 'Graph with one node, empty neighbors.' }
  ],
  visibleTests: [
    { input: { adjList: [[2,4],[1,3],[2,4],[1,3]] }, expected: [[2,4],[1,3],[2,4],[1,3]], note: 'Classic square graph' },
    { input: { adjList: [[]] }, expected: [[]], note: 'Single node' },
    { input: { adjList: [] }, expected: [], note: 'Empty' }
  ],
  hiddenTestConfig: { generator: 'graphProblem', constraints: { minLen: 0, maxLen: 100 } },
  patternExplanation: { pattern: 'Graph Traversal with State Map', why: 'Essential pattern for traversing graphs with cycles. The hash map bridges the original object graph with the new object graph.', related: ['g1', 'g4'] },
  visualDiagram: 'Original:    Clone:\n 1 -- 2       1\'-- 2\'\n |    |       |    |\n 4 -- 3       4\'-- 3\'',
  examples: [
    { input: 'adjList = [[2,4],[1,3],[2,4],[1,3]]', output: '[[2,4],[1,3],[2,4],[1,3]]', explanation: 'A deep copy of the original graph.' }
  ],
  constraints: ['0 <= Node.val <= 100', 'Node.val is unique for each node.', 'There are no repeated edges and no self-loops in the graph.']
},

'g3': {
  description: 'You are given an m x n binary matrix grid. An island is a group of 1s connected 4-directionally. Return the maximum area of an island in grid. If there is no island, return 0.',
  intuition: 'Like counting islands, but instead of just counting the island, we want to count the number of cells in it. A DFS that returns the area of the connected component works perfectly.',
  approaches: [
    { name: 'DFS (Optimal)', complexity: { time: 'O(m*n)', space: 'O(m*n)' }, description: 'Run DFS from each unvisited 1, returning the total count of 1s in that island.', pseudocode: 'def dfs(r, c):\n  if out_of_bounds or grid[r][c] == 0: return 0\n  grid[r][c] = 0\n  return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1)' }
  ],
  dryRun: { input: 'grid=[[1,1,0],[1,0,0],[0,0,1]]', steps: [
    { step: 1, state: '(0,0)=1', action: 'dfs(0,0) starts' },
    { step: 2, state: '(0,1)=1, (1,0)=1', action: 'dfs finds 3 connected 1s' },
    { step: 3, state: 'max_area=3', action: 'Update max' },
    { step: 4, state: '(2,2)=1', action: 'dfs finds 1 connected 1' },
    { step: 5, state: 'Return max_area', action: 'Result 3 ✓' }
  ]},
  edgeCases: [
    { case: 'All 0s', explanation: 'Max area is 0.' },
    { case: 'All 1s', explanation: 'Max area is m * n.' }
  ],
  visibleTests: [
    { input: { grid: [[1,1,0],[1,0,0],[0,0,1]] }, expected: 3, note: 'Basic' },
    { input: { grid: [[0,0,0,0]] }, expected: 0, note: 'All zeros' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 50 } },
  patternExplanation: { pattern: 'DFS with Accumulation', why: 'Similar to flood fill but we accumulate a value (area) across recursive calls.', related: ['g1'] },
  visualDiagram: '1 1 0\n1 0 0\n0 0 1\n\nIsland 1 Area = 3\nIsland 2 Area = 1\nMax Area = 3',
  examples: [
    { input: 'grid = [[1,1,0],[1,0,0],[0,0,1]]', output: '3', explanation: 'Top left island has area 3.' }
  ],
  constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 50', 'grid[i][j] is either 0 or 1.']
},

'g5': {
  description: 'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.',
  intuition: 'This is a direct application of Topological Sort. We need to find an ordering of nodes in a Directed Acyclic Graph (DAG) such that for every directed edge u -> v, u comes before v. If there is a cycle, no such ordering exists.',
  approaches: [
    { name: 'Kahn\'s Algorithm (BFS)', complexity: { time: 'O(V+E)', space: 'O(V+E)' }, description: 'Compute in-degrees of all nodes. Start with nodes having in-degree 0. As you process a node, decrement in-degrees of its neighbors. If a neighbor reaches 0, add it to the queue.', pseudocode: 'adj = [[] for _ in range(N)]\nindegree = [0] * N\nfor dest, src in prereqs:\n  adj[src].append(dest)\n  indegree[dest] += 1\nq = [i for i in range(N) if indegree[i] == 0]\nres = []\nwhile q:\n  node = q.pop(0)\n  res.append(node)\n  for nei in adj[node]:\n    indegree[nei] -= 1\n    if indegree[nei] == 0: q.append(nei)\nreturn res if len(res) == N else []' }
  ],
  dryRun: { input: 'numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]', steps: [
    { step: 1, state: 'indegree=[0,1,1,2]', action: 'Queue=[0]' },
    { step: 2, state: 'Pop 0', action: 'res=[0]. Neighbors: 1, 2. Decrement indegrees -> indegree=[0,0,0,2]. Queue=[1,2]' },
    { step: 3, state: 'Pop 1', action: 'res=[0,1]. Neighbors: 3. Decrement -> indegree=[0,0,0,1]. Queue=[2]' },
    { step: 4, state: 'Pop 2', action: 'res=[0,1,2]. Neighbors: 3. Decrement -> indegree=[0,0,0,0]. Queue=[3]' },
    { step: 5, state: 'Pop 3', action: 'res=[0,1,2,3]. Queue=[] -> Return res. ✓' }
  ]},
  edgeCases: [
    { case: 'Cycle exists', explanation: 'e.g. [[1,0],[0,1]]. Result length will be less than N, returns [].' },
    { case: 'Disconnected components', explanation: 'Queue handles all components as long as indegree is 0.' }
  ],
  visibleTests: [
    { input: { numCourses: 4, prerequisites: [[1,0],[2,0],[3,1],[3,2]] }, expected: [0,1,2,3], note: 'Classic case' },
    { input: { numCourses: 2, prerequisites: [[1,0]] }, expected: [0,1], note: 'Basic' },
    { input: { numCourses: 2, prerequisites: [[1,0],[0,1]] }, expected: [], note: 'Cycle' }
  ],
  hiddenTestConfig: { generator: 'graphProblem', constraints: { minLen: 1, maxLen: 2000 } },
  patternExplanation: { pattern: 'Topological Sort', why: 'Extracting a valid dependency resolution order is exactly what topological sort does.', related: ['g4'] },
  visualDiagram: '    0\n   / \\\n  1   2\n   \\ /\n    3\nOrder: 0 -> 1 -> 2 -> 3',
  examples: [
    { input: 'numCourses=2, prerequisites=[[1,0]]', output: '[0,1]', explanation: 'Take course 0 before course 1.' }
  ],
  constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= numCourses * (numCourses - 1)', 'prerequisites[i].length == 2']
},

'g6': {
  description: 'There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific touches the left and top edges, Atlantic touches right and bottom edges. The island is partitioned into a grid of square cells, with heights. Water flows from any cell to adjacent cells with equal or lower height. Return a 2D list of grid coordinates result where result[i] = [ri, ci] denotes that rain water can flow from cell (ri, ci) to BOTH oceans.',
  intuition: 'Instead of starting from every cell and checking if it reaches both oceans (which repeats work), start from the oceans and flow UPHILL (to equal or higher heights). Track which cells can be reached from the Pacific, and which from the Atlantic. The intersection of both sets is our answer.',
  approaches: [
    { name: 'Multi-Source DFS/BFS Uphill (Optimal)', complexity: { time: 'O(m*n)', space: 'O(m*n)' }, description: 'Run DFS/BFS from all Pacific border cells marking reachable nodes. Do the same for Atlantic. Find intersection.', pseudocode: 'def dfs(r, c, reachable_set, prev_height):\n  if out_of_bounds or (r,c) in reachable_set or heights[r][c] < prev_height: return\n  reachable_set.add((r,c))\n  dfs(r+1,c,reachable_set,heights[r][c])...\n# Start DFS from borders\nfor r in 0..m: dfs(r, 0, pac, 0); dfs(r, n-1, atl, 0)\nfor c in 0..n: dfs(0, c, pac, 0); dfs(m-1, c, atl, 0)\nreturn pac.intersection(atl)' }
  ],
  dryRun: { input: 'heights=[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]', steps: [
    { step: 1, state: 'Pacific DFS', action: 'Starts from top row and left col. Flows to higher elements.' },
    { step: 2, state: 'Atlantic DFS', action: 'Starts from bottom row and right col. Flows to higher elements.' },
    { step: 3, state: 'Intersection', action: 'Cells like (0,4) [val 5], (1,3) [val 4] are in both sets.' }
  ]},
  edgeCases: [
    { case: '1x1 matrix', explanation: 'Touches both oceans.' },
    { case: 'All same heights', explanation: 'All cells touch both oceans.' }
  ],
  visibleTests: [
    { input: { heights: [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]] }, expected: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]], note: 'Classic case' },
    { input: { heights: [[1]] }, expected: [[0,0]], note: 'Single element' }
  ],
  hiddenTestConfig: { generator: 'matrixProblem', constraints: { minLen: 1, maxLen: 200 } },
  patternExplanation: { pattern: 'Reverse Thinking / Multi-Source Traversal', why: 'Instead of finding paths FROM all sources TO a destination, find paths FROM the destination TO all sources. This reduces complexity significantly.', related: ['g8'] },
  visualDiagram: 'P A C I F I C\n  1  2  2  3 (5) A\n  3  2  3 (4)(4) T\n  2  4 (5) 3  1  L\n (6)(7) 1  4  5  A\n (5) 1  1  2  4  N\n                 T\n(x) can reach both.',
  examples: [
    { input: 'heights=[[2,1],[1,2]]', output: '[[0,0],[0,1],[1,0],[1,1]]', explanation: 'All cells reach both.' }
  ],
  constraints: ['m == heights.length', 'n == heights[i].length', '1 <= m, n <= 200', '0 <= heights[i][j] <= 10^5']
}
};


