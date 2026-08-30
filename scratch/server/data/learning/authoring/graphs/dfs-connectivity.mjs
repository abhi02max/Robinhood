/**
 * Graphs -> DFS for Connectivity & Components.
 *
 * One idea in four dresses: pick an unvisited node, flood everything reachable from
 * it, and that flood is one connected component. Two problems present the graph as a
 * grid where adjacency is implicit, and two present it as an edge list where it has to
 * be built. Counting components, measuring the largest one, and asking whether two
 * specific nodes share one are all the same traversal with a different tally.
 */
export default {
  topic: 'graphs',
  pattern: 'dfs-connectivity',
  problems: [
    // -----------------------------------------------------------------------
    {
      slug: 'number-of-islands',
      title: 'Number of Islands',
      difficulty: 'Medium',
      tags: ['dfs-connectivity', 'grid', 'flood-fill'],
      companies: ['Amazon', 'Facebook', 'Google', 'Microsoft', 'Bloomberg'],
      description:
        'You are given a grid of `"1"` (land) and `"0"` (water) characters, supplied as an array of equal-length strings. Return the number of **islands**.\n\nAn island is a maximal group of land cells connected **horizontally or vertically** — diagonal contact does not connect two cells. All four edges of the grid are surrounded by water.',
      analogy:
        'Counting landmasses on a pixelated satellite image. You put your finger on a land pixel you have not seen before, spread outward across everything it touches until you run out of land, and mark that whole region as counted. Every time you have to start a new spread, that is one more island.',
      constraints: [
        '1 <= grid.length <= 300',
        '1 <= grid[i].length <= 300',
        'Every row has the same length',
        'grid[i][j] is either the character "1" or the character "0"',
      ],
      edgeCases: [
        'A grid of all water — zero islands',
        'A grid of all land — exactly one island',
        'A single cell, land or water',
        'Land cells touching only diagonally, which are separate islands',
        'A single row or single column grid',
        'An island shaped so that a naive scan would count it twice',
      ],
      hints: [
        'Every land cell belongs to exactly one island. How do you make sure you count each island once rather than once per cell?',
        'Scan every cell. When you find unvisited land, that is a new island — increment the count, then flood the entire connected region so its other cells are never counted again.',
        'The flood explores four neighbours: up, down, left, right. Not diagonals.',
        'Track visited cells explicitly, or overwrite land with water as you go. Overwriting mutates the input, which is fine here but worth being deliberate about.',
      ],
      brute: {
        name: 'Recursive Flood Fill with a Visited Set',
        summary: 'Scan for unvisited land, then recursively mark everything reachable from it.',
        intuition:
          'The direct reading. For each cell, if it is land and not yet visited, count one island and recurse into its four neighbours, marking each visited cell so the recursion terminates and so later scan positions skip it.\n\nCorrect and short, and it makes the definition of "island" operational: the recursion visits exactly the maximal connected region. Its weakness is depth — a snake-shaped island covering a 300x300 grid recurses 90,000 frames deep, which overflows the default stack in Python and risks it elsewhere.',
        steps: [
          'Create a visited grid of the same shape.',
          'For each cell that is land and unvisited, increment the count.',
          'Recursively visit its four neighbours, skipping water, out-of-bounds cells, and already-visited cells.',
          'Return the count.',
        ],
        js: '// Helpers must be top-level and declared BEFORE the entry function:\n// the grader treats the last top-level function as your entrypoint.\nfunction floodFrom(grid, visited, row, col) {\n  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return;\n  if (visited[row][col] || grid[row][col] !== "1") return;\n  visited[row][col] = true;\n  floodFrom(grid, visited, row + 1, col);\n  floodFrom(grid, visited, row - 1, col);\n  floodFrom(grid, visited, row, col + 1);\n  floodFrom(grid, visited, row, col - 1);\n}\n\nfunction numIslands(grid) {\n  const rows = grid.length;\n  const cols = grid[0].length;\n  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));\n  let islands = 0;\n  for (let row = 0; row < rows; row++) {\n    for (let col = 0; col < cols; col++) {\n      if (grid[row][col] === "1" && !visited[row][col]) {\n        islands++;\n        floodFrom(grid, visited, row, col);\n      }\n    }\n  }\n  return islands;\n}',
        py: '# Helpers must be top-level and declared BEFORE the entry function:\n# the grader treats the last top-level function as your entrypoint.\ndef flood_from(grid, visited, row, col):\n    if row < 0 or row >= len(grid) or col < 0 or col >= len(grid[0]):\n        return\n    if visited[row][col] or grid[row][col] != "1":\n        return\n    visited[row][col] = True\n    flood_from(grid, visited, row + 1, col)\n    flood_from(grid, visited, row - 1, col)\n    flood_from(grid, visited, row, col + 1)\n    flood_from(grid, visited, row, col - 1)\n\n\ndef num_islands(grid):\n    rows, cols = len(grid), len(grid[0])\n    visited = [[False] * cols for _ in range(rows)]\n    islands = 0\n    for row in range(rows):\n        for col in range(cols):\n            if grid[row][col] == "1" and not visited[row][col]:\n                islands += 1\n                flood_from(grid, visited, row, col)\n    return islands',
        time: 'O(R*C)',
        space: 'O(R*C)',
      },
      optimal: {
        name: 'Iterative Flood Fill with an Explicit Stack',
        summary: 'Same traversal, with the recursion replaced by a stack so the depth is bounded by the heap rather than the call stack.',
        intuition:
          'The algorithm is unchanged: scan for unvisited land, count an island, flood its region. What changes is *where* the pending work lives. Instead of the call stack, keep a list of cells to visit; pop one, mark it, and push its unvisited land neighbours.\n\nThat matters at these constraints. A 300x300 grid can hold a single island of 90,000 cells, and a recursive flood over it needs 90,000 nested frames — comfortably past Python\'s default recursion limit of 1000 and deep enough to be a real risk elsewhere. An explicit stack moves that storage to the heap, where 90,000 entries is nothing.\n\nTwo details keep it honest. Mark a cell visited when it is *popped and processed* (or when pushed — but consistently), otherwise the same cell can be pushed several times by different neighbours and the work multiplies. And the neighbour offsets are the four orthogonal directions only; adding the diagonals silently merges islands the problem says are distinct.\n\nEvery cell is pushed at most once, so the total is O(R*C) time. The visited grid is O(R*C) space, and the stack is bounded by the same.',
        steps: [
          'Create a visited grid of the same shape and set islands = 0.',
          'For each cell that is land and unvisited: increment islands and push it onto a stack, marking it visited.',
          'While the stack is non-empty, pop a cell and push each of its four orthogonal neighbours that is in bounds, is land, and is unvisited — marking each as it is pushed.',
          'Return islands.',
        ],
        js: 'function numIslands(grid) {\n  const rows = grid.length;\n  const cols = grid[0].length;\n  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));\n  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n  let islands = 0;\n  for (let row = 0; row < rows; row++) {\n    for (let col = 0; col < cols; col++) {\n      if (grid[row][col] !== "1" || visited[row][col]) continue;\n      islands++;\n      visited[row][col] = true;\n      const stack = [[row, col]];\n      while (stack.length > 0) {\n        const [r, c] = stack.pop();\n        for (const [dr, dc] of offsets) {\n          const nr = r + dr;\n          const nc = c + dc;\n          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;\n          if (visited[nr][nc] || grid[nr][nc] !== "1") continue;\n          visited[nr][nc] = true;\n          stack.push([nr, nc]);\n        }\n      }\n    }\n  }\n  return islands;\n}',
        py: 'def num_islands(grid):\n    rows, cols = len(grid), len(grid[0])\n    visited = [[False] * cols for _ in range(rows)]\n    offsets = ((1, 0), (-1, 0), (0, 1), (0, -1))\n    islands = 0\n    for row in range(rows):\n        for col in range(cols):\n            if grid[row][col] != "1" or visited[row][col]:\n                continue\n            islands += 1\n            visited[row][col] = True\n            stack = [(row, col)]\n            while stack:\n                r, c = stack.pop()\n                for dr, dc in offsets:\n                    nr, nc = r + dr, c + dc\n                    if nr < 0 or nr >= rows or nc < 0 or nc >= cols:\n                        continue\n                    if visited[nr][nc] or grid[nr][nc] != "1":\n                        continue\n                    visited[nr][nc] = True\n                    stack.append((nr, nc))\n    return islands',
        time: 'O(R*C)',
        space: 'O(R*C)',
      },
      examples: [
        { payload: { grid: ['11110', '11010', '11000', '00000'] }, expect: 1, explanation: 'Every land cell is orthogonally reachable from every other, so it is one island.' },
        { payload: { grid: ['11000', '11000', '00100', '00011'] }, expect: 3, explanation: 'The top-left block, the lone cell at (2,2), and the pair at the bottom right.' },
        { payload: { grid: ['10', '01'] }, expect: 2, explanation: 'The two land cells touch only diagonally, which does not connect them.' },
        { payload: { grid: ['000', '000'] }, expect: 0, explanation: 'All water, so there is nothing to count.' },
      ],
      cases: [
        { payload: { grid: ['1'] }, label: 'single land cell' },
        { payload: { grid: ['0'] }, label: 'single water cell' },
        { payload: { grid: ['111', '111', '111'] }, label: 'all land, one island' },
        { payload: { grid: ['1111111'] }, label: 'single row, one island' },
        { payload: { grid: ['1', '0', '1', '0', '1'] }, label: 'single column, alternating' },
        { payload: { grid: ['101', '010', '101'] }, label: 'checkerboard, all diagonal contact' },
        { payload: { grid: ['11111', '10001', '10101', '10001', '11111'] }, label: 'ring enclosing a separate cell' },
        { payload: { grid: ['1000001', '0111110', '0100010', '0111110', '1000001'] }, label: 'snake-shaped island plus isolated corners' },
        { payload: { grid: ['1111', '0001', '1101', '1001', '1111'] }, label: 'U-shaped island, single component' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'max-area-of-island',
      title: 'Max Area of Island',
      difficulty: 'Medium',
      tags: ['dfs-connectivity', 'grid', 'flood-fill'],
      companies: ['Amazon', 'Google', 'Facebook'],
      description:
        'You are given a binary grid `grid` of `0`s and `1`s as integers. The **area** of an island is the number of cells with value `1` in it, where cells are connected horizontally or vertically.\n\nReturn the maximum area of any island. If there is no island, return `0`.',
      analogy:
        'Measuring the largest lake on a map rather than counting the lakes. The exploration is identical — spread across everything connected — but instead of just noting that you found one, you count the cells as you go and keep the biggest total.',
      constraints: [
        '1 <= grid.length, grid[0].length <= 50',
        'Every row has the same length',
        'grid[i][j] is 0 or 1',
      ],
      edgeCases: [
        'No land at all — the answer is 0',
        'A grid entirely of land, where the area is the whole grid',
        'Several islands of equal maximum area',
        'One large island plus several single cells',
        'Diagonally touching cells, which count as separate islands',
      ],
      hints: [
        'The traversal is the same as counting islands. What should each flood return instead of nothing?',
        'Have the flood return the number of cells it visited, and take the maximum over all the floods you start.',
        'Only cells that are land and not yet visited contribute — otherwise a cell reachable from two directions is counted twice.',
      ],
      brute: {
        name: 'Recount Each Island From Every Cell',
        summary: 'For every land cell, flood from it with a fresh visited grid and measure the region.',
        intuition:
          'Do not try to be clever about which cell starts which island: from every land cell, run a flood with a brand-new visited grid and count the cells reached. Take the maximum. Since a flood from any cell of an island covers that entire island, the maximum is correct.\n\nThe cost is the waste: an island of size K is measured K times, once from each of its cells, so the work is O((R*C)^2) in the worst case. It is here because it is impossible to get wrong, which makes it the oracle for a version that does the bookkeeping properly.',
        steps: [
          'For each land cell:',
          'Create a fresh visited grid and flood from that cell, counting the cells reached.',
          'Track the largest count seen.',
          'Return the largest count, or 0 if there was no land.',
        ],
        js: '// Helpers must be top-level and declared BEFORE the entry function:\n// the grader treats the last top-level function as your entrypoint.\nfunction areaFrom(grid, visited, row, col) {\n  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return 0;\n  if (visited[row][col] || grid[row][col] !== 1) return 0;\n  visited[row][col] = true;\n  return 1\n    + areaFrom(grid, visited, row + 1, col)\n    + areaFrom(grid, visited, row - 1, col)\n    + areaFrom(grid, visited, row, col + 1)\n    + areaFrom(grid, visited, row, col - 1);\n}\n\nfunction maxAreaOfIsland(grid) {\n  const rows = grid.length;\n  const cols = grid[0].length;\n  let best = 0;\n  for (let row = 0; row < rows; row++) {\n    for (let col = 0; col < cols; col++) {\n      if (grid[row][col] !== 1) continue;\n      const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));\n      const area = areaFrom(grid, visited, row, col);\n      if (area > best) best = area;\n    }\n  }\n  return best;\n}',
        py: '# Helpers must be top-level and declared BEFORE the entry function:\n# the grader treats the last top-level function as your entrypoint.\ndef area_from(grid, visited, row, col):\n    if row < 0 or row >= len(grid) or col < 0 or col >= len(grid[0]):\n        return 0\n    if visited[row][col] or grid[row][col] != 1:\n        return 0\n    visited[row][col] = True\n    return (1\n            + area_from(grid, visited, row + 1, col)\n            + area_from(grid, visited, row - 1, col)\n            + area_from(grid, visited, row, col + 1)\n            + area_from(grid, visited, row, col - 1))\n\n\ndef max_area_of_island(grid):\n    rows, cols = len(grid), len(grid[0])\n    best = 0\n    for row in range(rows):\n        for col in range(cols):\n            if grid[row][col] != 1:\n                continue\n            visited = [[False] * cols for _ in range(rows)]\n            best = max(best, area_from(grid, visited, row, col))\n    return best',
        time: 'O((R*C)^2)',
        space: 'O(R*C)',
      },
      optimal: {
        name: 'One Flood Per Island, Counting Cells',
        summary: 'Share a single visited grid across all floods and have each flood return its size.',
        intuition:
          'The waste in the brute force is re-measuring an island once per cell. Sharing one visited grid across every flood removes it: a cell is only ever the starting point of a flood if no earlier flood reached it, which means each island is measured exactly once, from whichever of its cells the scan meets first.\n\nEach flood counts the cells it marks, and the answer is the largest of those counts. The scan then visits every cell once to decide whether to start a flood, and each cell is marked by exactly one flood, so the total is O(R*C).\n\nUsing an explicit stack rather than recursion keeps the depth off the call stack, which is the same reasoning as in Number of Islands — at 50x50 the recursion would survive, but the habit is what transfers to the 300x300 version.\n\nThe answer starts at 0, which also handles the no-land case without a special branch.',
        steps: [
          'Create one visited grid and set best = 0.',
          'For each unvisited land cell, start a flood: push it, mark it, and count cells as they are marked.',
          'Push every in-bounds, unvisited land neighbour, marking each as it is pushed.',
          'Update best with the flood\'s size.',
          'Return best.',
        ],
        js: 'function maxAreaOfIsland(grid) {\n  const rows = grid.length;\n  const cols = grid[0].length;\n  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));\n  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n  let best = 0;\n  for (let row = 0; row < rows; row++) {\n    for (let col = 0; col < cols; col++) {\n      if (grid[row][col] !== 1 || visited[row][col]) continue;\n      visited[row][col] = true;\n      const stack = [[row, col]];\n      let area = 0;\n      while (stack.length > 0) {\n        const [r, c] = stack.pop();\n        area++;\n        for (const [dr, dc] of offsets) {\n          const nr = r + dr;\n          const nc = c + dc;\n          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;\n          if (visited[nr][nc] || grid[nr][nc] !== 1) continue;\n          visited[nr][nc] = true;\n          stack.push([nr, nc]);\n        }\n      }\n      if (area > best) best = area;\n    }\n  }\n  return best;\n}',
        py: 'def max_area_of_island(grid):\n    rows, cols = len(grid), len(grid[0])\n    visited = [[False] * cols for _ in range(rows)]\n    offsets = ((1, 0), (-1, 0), (0, 1), (0, -1))\n    best = 0\n    for row in range(rows):\n        for col in range(cols):\n            if grid[row][col] != 1 or visited[row][col]:\n                continue\n            visited[row][col] = True\n            stack = [(row, col)]\n            area = 0\n            while stack:\n                r, c = stack.pop()\n                area += 1\n                for dr, dc in offsets:\n                    nr, nc = r + dr, c + dc\n                    if nr < 0 or nr >= rows or nc < 0 or nc >= cols:\n                        continue\n                    if visited[nr][nc] or grid[nr][nc] != 1:\n                        continue\n                    visited[nr][nc] = True\n                    stack.append((nr, nc))\n            best = max(best, area)\n    return best',
        time: 'O(R*C)',
        space: 'O(R*C)',
      },
      examples: [
        { payload: { grid: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1]] }, expect: 3, explanation: 'The bottom-right island has three cells; the top-left has three as well — both are size 3, and 3 is the maximum.' },
        { payload: { grid: [[0, 0], [0, 0]] }, expect: 0, explanation: 'No land at all, so the answer is 0.' },
        { payload: { grid: [[1, 1], [1, 1]] }, expect: 4, explanation: 'The whole grid is one island.' },
        { payload: { grid: [[1, 0], [0, 1]] }, expect: 1, explanation: 'Diagonal contact does not connect, so each cell is its own island of area 1.' },
      ],
      cases: [
        { payload: { grid: [[1]] }, label: 'single land cell' },
        { payload: { grid: [[0]] }, label: 'single water cell' },
        { payload: { grid: [[1, 1, 1, 1, 1]] }, label: 'single row island' },
        { payload: { grid: [[1], [1], [1]] }, label: 'single column island' },
        { payload: { grid: [[1, 0, 1], [0, 1, 0], [1, 0, 1]] }, label: 'checkerboard, all areas 1' },
        { payload: { grid: [[1, 1, 0, 1], [1, 1, 0, 1], [0, 0, 0, 1]] }, label: 'two islands of equal maximum area' },
        { payload: { grid: [[1, 1, 1], [0, 0, 0], [1, 1, 1], [0, 0, 0], [1, 1, 1]] }, label: 'three equal stripes' },
        { payload: { grid: [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 0, 1]] }, label: 'plus-shaped island with isolated corners' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'find-if-path-exists-in-graph',
      title: 'Find if Path Exists in Graph',
      difficulty: 'Easy',
      tags: ['dfs-connectivity', 'adjacency-list', 'reachability'],
      companies: ['Amazon', 'Microsoft'],
      description:
        'You are given `n` vertices labelled `0` through `n - 1` and a list of **undirected** edges. Return `true` if there is a path from `source` to `destination`.\n\nThe edge list may contain the same edge more than once, and the graph may be disconnected. A vertex is trivially reachable from itself, so `source == destination` is `true` even when the vertex has no edges at all.',
      analogy:
        'Asking whether two towns are joined by any sequence of roads. You do not need the shortest route or the number of routes — only whether, starting from one town and driving anywhere you can reach, you ever arrive at the other.',
      constraints: [
        '1 <= n <= 2 * 10^5',
        '0 <= edges.length <= 2 * 10^5',
        'edges[i].length == 2',
        '0 <= source, destination, edges[i][0], edges[i][1] <= n - 1',
        'There are no self-loops, but duplicate edges are possible',
      ],
      edgeCases: [
        'source equals destination, including when the vertex is isolated',
        'No edges at all',
        'The destination in a different component — false',
        'Duplicate edges, which must not cause repeated work or a wrong answer',
        'A long path where the destination is the final vertex',
        'A cycle, which must not make the traversal loop forever',
      ],
      hints: [
        'The edges are given as a list. What structure do you need before you can ask "which vertices are adjacent to this one"?',
        'Build an adjacency list: for each edge, add each endpoint to the other\'s neighbour list, because the graph is undirected.',
        'Then flood from the source, marking vertices as visited, and check whether the destination was ever reached.',
        'Marking visited is what terminates the traversal on a cyclic graph, and it also makes duplicate edges harmless.',
      ],
      brute: {
        name: 'Repeatedly Sweep the Edge List',
        summary: 'Grow a reachable set by re-scanning every edge until a full pass adds nothing.',
        intuition:
          'Start with the source in a reachable set. Sweep the whole edge list: whenever one endpoint is reachable and the other is not, add it. Repeat the sweep until a pass makes no change, at which point the set is closed under adjacency — it is exactly the source\'s component.\n\nNo adjacency structure is needed, which makes it easy to trust. The cost is that each sweep is O(E) and there can be O(V) sweeps, so O(V*E) overall. At the constraint limits that is far too slow, but it is a clean statement of what reachability *means*: the smallest set containing the source and closed under edges.',
        steps: [
          'Put the source into a reachable set.',
          'Sweep every edge; if exactly one endpoint is reachable, add the other and note that something changed.',
          'Repeat until a sweep changes nothing.',
          'Return whether the destination is in the set.',
        ],
        js: 'function validPath(n, edges, source, destination) {\n  const reachable = new Set([source]);\n  let changed = true;\n  while (changed) {\n    changed = false;\n    for (const [a, b] of edges) {\n      if (reachable.has(a) && !reachable.has(b)) { reachable.add(b); changed = true; }\n      else if (reachable.has(b) && !reachable.has(a)) { reachable.add(a); changed = true; }\n    }\n  }\n  return reachable.has(destination);\n}',
        py: 'def valid_path(n, edges, source, destination):\n    reachable = {source}\n    changed = True\n    while changed:\n        changed = False\n        for a, b in edges:\n            if a in reachable and b not in reachable:\n                reachable.add(b)\n                changed = True\n            elif b in reachable and a not in reachable:\n                reachable.add(a)\n                changed = True\n    return destination in reachable',
        time: 'O(V*E)',
        space: 'O(V)',
      },
      optimal: {
        name: 'Adjacency List and One Flood',
        summary: 'Build neighbour lists once, then flood from the source with a visited array.',
        intuition:
          'The repeated sweeps waste work because the edge list cannot answer "who is adjacent to this vertex". Build that index once — for each edge add both directions, since the graph is undirected — and the traversal becomes a single flood.\n\nPush the source, mark it, and repeatedly pop a vertex and push its unvisited neighbours. Return true as soon as the destination is marked, or false when the stack empties, which means the whole component has been explored without finding it.\n\nThe visited array does three jobs at once, and all three matter here. It terminates the traversal on cycles. It makes duplicate edges harmless, since the second copy leads to an already-visited vertex. And it bounds the work: each vertex is pushed at most once and each edge inspected at most twice, so the flood is O(V + E) and the build is O(E).\n\nThe source == destination case needs no special handling as long as the check happens after marking the source — a vertex is reachable from itself, including when it is isolated.',
        steps: [
          'Build an adjacency list with both directions for every edge.',
          'Create a visited array, mark the source, and push it onto a stack.',
          'While the stack is non-empty, pop a vertex; return true if it is the destination.',
          'Push each unvisited neighbour, marking it as it is pushed.',
          'Return false once the stack empties.',
        ],
        js: 'function validPath(n, edges, source, destination) {\n  const neighbours = Array.from({ length: n }, () => []);\n  for (const [a, b] of edges) {\n    neighbours[a].push(b);\n    neighbours[b].push(a);\n  }\n  const visited = new Array(n).fill(false);\n  visited[source] = true;\n  const stack = [source];\n  while (stack.length > 0) {\n    const vertex = stack.pop();\n    if (vertex === destination) return true;\n    for (const next of neighbours[vertex]) {\n      if (!visited[next]) {\n        visited[next] = true;\n        stack.push(next);\n      }\n    }\n  }\n  return false;\n}',
        py: 'def valid_path(n, edges, source, destination):\n    neighbours = [[] for _ in range(n)]\n    for a, b in edges:\n        neighbours[a].append(b)\n        neighbours[b].append(a)\n    visited = [False] * n\n    visited[source] = True\n    stack = [source]\n    while stack:\n        vertex = stack.pop()\n        if vertex == destination:\n            return True\n        for nxt in neighbours[vertex]:\n            if not visited[nxt]:\n                visited[nxt] = True\n                stack.append(nxt)\n    return False',
        time: 'O(V + E)',
        space: 'O(V + E)',
      },
      examples: [
        { payload: { n: 3, edges: [[0, 1], [1, 2], [2, 0]], source: 0, destination: 2 }, expect: true, explanation: 'Vertices 0 and 2 are directly joined, and the cycle does not trap the traversal because visited vertices are never revisited.' },
        { payload: { n: 6, edges: [[0, 1], [0, 2], [3, 5], [5, 4], [4, 3]], source: 0, destination: 5 }, expect: false, explanation: 'Vertices 0 and 5 sit in different components, so no path exists.' },
        { payload: { n: 1, edges: [], source: 0, destination: 0 }, expect: true, explanation: 'A vertex is reachable from itself even with no edges.' },
        { payload: { n: 4, edges: [[0, 1], [1, 2], [2, 3]], source: 0, destination: 3 }, expect: true, explanation: 'A straight path, so the traversal has to walk the whole chain.' },
      ],
      cases: [
        { payload: { n: 2, edges: [], source: 0, destination: 1 }, label: 'no edges, different vertices' },
        { payload: { n: 2, edges: [[0, 1]], source: 0, destination: 1 }, label: 'single edge' },
        { payload: { n: 5, edges: [[0, 1], [0, 1], [0, 1]], source: 0, destination: 1 }, label: 'duplicate edges' },
        { payload: { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]], source: 4, destination: 0 }, label: 'path traversed in reverse' },
        { payload: { n: 5, edges: [[0, 1], [1, 2], [3, 4]], source: 2, destination: 3 }, label: 'two components, unreachable' },
        { payload: { n: 4, edges: [[0, 1], [1, 2], [2, 0]], source: 3, destination: 3 }, label: 'isolated vertex to itself' },
        { payload: { n: 6, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], source: 0, destination: 3 }, label: 'ring graph' },
        { payload: { n: 7, edges: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6]], source: 3, destination: 6 }, label: 'two chains, unreachable across' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'number-of-connected-components-in-an-undirected-graph',
      title: 'Number of Connected Components in an Undirected Graph',
      difficulty: 'Medium',
      tags: ['dfs-connectivity', 'adjacency-list', 'components'],
      companies: ['Amazon', 'Google', 'Facebook'],
      description:
        'You are given `n` vertices labelled `0` through `n - 1` and a list of **undirected** edges. Return the number of connected components.\n\nA component is a maximal set of vertices that are all reachable from one another. An isolated vertex with no edges is a component of its own, so a graph with no edges at all has exactly `n` components.',
      analogy:
        'Counting the separate friend groups in a room where you only know who has shaken hands with whom. Pick anyone not yet assigned, find everyone reachable through a chain of handshakes, and that is one group. Repeat until nobody is left over.',
      constraints: [
        '1 <= n <= 2000',
        '0 <= edges.length <= n * (n - 1) / 2',
        'edges[i].length == 2',
        '0 <= edges[i][0], edges[i][1] < n',
        'There are no self-loops or repeated edges',
      ],
      edgeCases: [
        'No edges — every vertex is its own component, so the answer is n',
        'A single component spanning every vertex',
        'A single vertex',
        'Isolated vertices alongside a large component',
        'A cyclic component, which must be counted once',
        'A tree, where the component count is n minus the number of edges',
      ],
      hints: [
        'You already know how to explore everything reachable from one vertex. How does that give you a count of components?',
        'Every flood covers exactly one component. So the number of components is the number of times you have to start a new flood.',
        'Loop over all vertices, and only start a flood from those still unvisited — vertices already reached belong to a component that has been counted.',
        'Isolated vertices need no special case: the flood from one immediately finishes, having counted one component.',
      ],
      brute: {
        name: 'Reachable Set Per Vertex',
        summary: 'Compute the full reachable set from every vertex and count the distinct sets.',
        intuition:
          'Components are equivalence classes of the reachability relation, so computing the reachable set from each vertex and counting how many distinct sets appear is a direct translation of the definition.\n\nUsing the smallest vertex label in each reachable set as its canonical identifier makes the counting concrete: two vertices are in the same component exactly when their sets have the same minimum. The cost is a traversal per vertex, O(V*(V+E)), which is the redundancy the standard solution removes.',
        steps: [
          'Build an adjacency list.',
          'For each vertex, flood to collect its reachable set.',
          'Reduce that set to its smallest label.',
          'Count the distinct labels seen.',
        ],
        js: '// Helpers must be top-level and declared BEFORE the entry function:\n// the grader treats the last top-level function as your entrypoint.\nfunction reachableMin(neighbours, start) {\n  const visited = new Set([start]);\n  const stack = [start];\n  let smallest = start;\n  while (stack.length > 0) {\n    const vertex = stack.pop();\n    if (vertex < smallest) smallest = vertex;\n    for (const next of neighbours[vertex]) {\n      if (!visited.has(next)) {\n        visited.add(next);\n        stack.push(next);\n      }\n    }\n  }\n  return smallest;\n}\n\nfunction countComponents(n, edges) {\n  const neighbours = Array.from({ length: n }, () => []);\n  for (const [a, b] of edges) {\n    neighbours[a].push(b);\n    neighbours[b].push(a);\n  }\n  const roots = new Set();\n  for (let vertex = 0; vertex < n; vertex++) {\n    roots.add(reachableMin(neighbours, vertex));\n  }\n  return roots.size;\n}',
        py: '# Helpers must be top-level and declared BEFORE the entry function:\n# the grader treats the last top-level function as your entrypoint.\ndef reachable_min(neighbours, start):\n    visited = {start}\n    stack = [start]\n    smallest = start\n    while stack:\n        vertex = stack.pop()\n        smallest = min(smallest, vertex)\n        for nxt in neighbours[vertex]:\n            if nxt not in visited:\n                visited.add(nxt)\n                stack.append(nxt)\n    return smallest\n\n\ndef count_components(n, edges):\n    neighbours = [[] for _ in range(n)]\n    for a, b in edges:\n        neighbours[a].append(b)\n        neighbours[b].append(a)\n    roots = set()\n    for vertex in range(n):\n        roots.add(reachable_min(neighbours, vertex))\n    return len(roots)',
        time: 'O(V*(V+E))',
        space: 'O(V+E)',
      },
      optimal: {
        name: 'Count the Floods',
        summary: 'Sweep the vertices with one shared visited array and count how many times a new flood has to start.',
        intuition:
          'One flood covers exactly one component — that is what "maximal set of mutually reachable vertices" means. So instead of computing components and then counting them, count the number of times you *begin* a flood.\n\nShare one visited array across the whole sweep. Walk vertices 0 to n-1; if a vertex is already visited it belongs to a component that has been counted, so skip it. Otherwise increment the count and flood, marking everything in its component.\n\nThat makes the redundancy in the brute force disappear: every vertex is marked exactly once, across all floods put together, so the total work is O(V + E) — the same as a single traversal.\n\nIsolated vertices fall out for free. A flood from one marks only itself and finishes, having correctly counted one component. With no edges the sweep starts n floods and returns n.\n\nUnion-Find solves this problem too, in near-linear time, and is the better tool when edges arrive incrementally. For a fixed edge list a single sweep is simpler and no slower.',
        steps: [
          'Build an adjacency list with both directions per edge.',
          'Create one visited array and set components = 0.',
          'For each vertex that is unvisited: increment components, then flood from it, marking every vertex reached.',
          'Return components.',
        ],
        js: 'function countComponents(n, edges) {\n  const neighbours = Array.from({ length: n }, () => []);\n  for (const [a, b] of edges) {\n    neighbours[a].push(b);\n    neighbours[b].push(a);\n  }\n  const visited = new Array(n).fill(false);\n  let components = 0;\n  for (let start = 0; start < n; start++) {\n    if (visited[start]) continue;\n    components++;\n    visited[start] = true;\n    const stack = [start];\n    while (stack.length > 0) {\n      const vertex = stack.pop();\n      for (const next of neighbours[vertex]) {\n        if (!visited[next]) {\n          visited[next] = true;\n          stack.push(next);\n        }\n      }\n    }\n  }\n  return components;\n}',
        py: 'def count_components(n, edges):\n    neighbours = [[] for _ in range(n)]\n    for a, b in edges:\n        neighbours[a].append(b)\n        neighbours[b].append(a)\n    visited = [False] * n\n    components = 0\n    for start in range(n):\n        if visited[start]:\n            continue\n        components += 1\n        visited[start] = True\n        stack = [start]\n        while stack:\n            vertex = stack.pop()\n            for nxt in neighbours[vertex]:\n                if not visited[nxt]:\n                    visited[nxt] = True\n                    stack.append(nxt)\n    return components',
        time: 'O(V + E)',
        space: 'O(V + E)',
      },
      examples: [
        { payload: { n: 5, edges: [[0, 1], [1, 2], [3, 4]] }, expect: 2, explanation: 'Vertices 0, 1, 2 form one component and 3, 4 form another.' },
        { payload: { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] }, expect: 1, explanation: 'A single chain through every vertex is one component.' },
        { payload: { n: 4, edges: [] }, expect: 4, explanation: 'With no edges every vertex is isolated, so there are as many components as vertices.' },
        { payload: { n: 1, edges: [] }, expect: 1, explanation: 'A single vertex is one component.' },
      ],
      cases: [
        { payload: { n: 2, edges: [] }, label: 'two isolated vertices' },
        { payload: { n: 2, edges: [[0, 1]] }, label: 'single edge joining everything' },
        { payload: { n: 6, edges: [[0, 1], [2, 3], [4, 5]] }, label: 'three disjoint pairs' },
        { payload: { n: 6, edges: [[0, 1], [1, 2], [2, 0]] }, label: 'cycle plus isolated vertices' },
        { payload: { n: 7, edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]] }, label: 'star graph, one component' },
        { payload: { n: 8, edges: [[0, 1], [1, 2], [3, 4], [5, 6]] }, label: 'mixed sizes with one isolated vertex' },
        { payload: { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] }, label: 'dense component with a chord' },
        { payload: { n: 10, edges: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]] }, label: 'five disjoint pairs' },
      ],
    },
  ],
};
