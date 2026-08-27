// Linked List — Production Problem Content
export const linkedListContent = {
'll1': {
  description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  intuition: 'Maintain three pointers: prev, curr, next. At each node, save next, point curr.next to prev, then advance prev and curr. When curr is null, prev is the new head.',
  approaches: [
    { name: 'Iterative (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Reverse pointers one by one using three variables.', pseudocode: 'prev = null, curr = head\nwhile curr:\n  next = curr.next\n  curr.next = prev\n  prev = curr\n  curr = next\nreturn prev' },
    { name: 'Recursive', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Recurse to the end, then reverse pointers on the way back up the call stack.', pseudocode: 'def reverse(head):\n  if !head or !head.next: return head\n  new_head = reverse(head.next)\n  head.next.next = head\n  head.next = null\n  return new_head' },
  ],
  dryRun: { input: 'head = [1,2,3,4,5]', steps: [
    { step: 1, state: 'prev=null, curr=1', action: '1→null, prev=1, curr=2' },
    { step: 2, state: 'prev=1, curr=2', action: '2→1, prev=2, curr=3' },
    { step: 3, state: 'prev=2, curr=3', action: '3→2, prev=3, curr=4' },
    { step: 4, state: 'prev=3, curr=4', action: '4→3, prev=4, curr=5' },
    { step: 5, state: 'prev=4, curr=5', action: '5→4, prev=5, curr=null. New head=5 ✓' },
  ]},
  edgeCases: [
    { case: 'head=[]', explanation: 'Empty list — return null' },
    { case: 'head=[1]', explanation: 'Single node — already reversed' },
    { case: 'head=[1,2]', explanation: 'Two nodes — swap pointers once' },
    { case: 'head=[1,1,1]', explanation: 'Duplicate values — structure matters, not values' },
    { case: 'head=[1,2,3,4,5,6,7,8,9,10]', explanation: 'Long list — verify all pointers flip correctly' },
  ],
  visibleTests: [
    { input: { head: [1,2,3,4,5] }, expected: [5,4,3,2,1], note: 'Classic' },
    { input: { head: [1,2] }, expected: [2,1], note: 'Two nodes' },
    { input: { head: [] }, expected: [], note: 'Empty' },
    { input: { head: [1] }, expected: [1], note: 'Single' },
    { input: { head: [1,1,1] }, expected: [1,1,1], note: 'Duplicates' },
    { input: { head: [5,4,3,2,1] }, expected: [1,2,3,4,5], note: 'Reverse of sorted' },
    { input: { head: [1,2,3] }, expected: [3,2,1], note: 'Three nodes' },
    { input: { head: [10,20,30,40] }, expected: [40,30,20,10], note: 'Larger values' },
    { input: { head: [-1,0,1] }, expected: [1,0,-1], note: 'Negative values' },
    { input: { head: [7] }, expected: [7], note: 'Single large' },
  ],
  hiddenTestConfig: { generator: 'linkedList', constraints: { minLen: 0, maxLen: 5000 } },
  patternExplanation: { pattern: 'Pointer Reversal', why: 'Linked list reversal is the fundamental operation underlying many list problems (reverse groups, palindrome check, etc). The three-pointer technique (prev, curr, next) is a must-know pattern for any linked list manipulation.', related: ['ll3','ll5'] },
  visualDiagram: 'Before: 1 → 2 → 3 → 4 → 5 → null\n\nStep 1: null ← 1    2 → 3 → 4 → 5\nStep 2: null ← 1 ← 2    3 → 4 → 5\nStep 3: null ← 1 ← 2 ← 3    4 → 5\nStep 4: null ← 1 ← 2 ← 3 ← 4    5\nStep 5: null ← 1 ← 2 ← 3 ← 4 ← 5\n\nAfter:  5 → 4 → 3 → 2 → 1 → null',
  examples: [
    { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: 'All pointers reversed' },
    { input: 'head = [1,2]', output: '[2,1]', explanation: 'Simple swap' },
  ],
  constraints: ['0 ≤ number of nodes ≤ 5000', '-5000 ≤ Node.val ≤ 5000'],
},

'll4': {
  description: 'Given the head of a linked list, determine if the linked list has a cycle in it. There is a cycle if some node\'s next pointer points back to a previously visited node.',
  intuition: 'Floyd\'s Cycle Detection: use two pointers moving at different speeds. Slow moves 1 step, fast moves 2 steps. If there\'s a cycle, they will eventually meet. If fast reaches null, there\'s no cycle.',
  approaches: [
    { name: 'Hash Set', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Store visited nodes in a set. If we visit a node twice, there\'s a cycle.', pseudocode: 'visited = set()\ncurr = head\nwhile curr:\n  if curr in visited: return true\n  visited.add(curr)\n  curr = curr.next\nreturn false' },
    { name: 'Floyd\'s Tortoise & Hare (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Slow pointer moves 1 step, fast moves 2. If they meet, cycle exists.', pseudocode: 'slow = fast = head\nwhile fast and fast.next:\n  slow = slow.next\n  fast = fast.next.next\n  if slow == fast: return true\nreturn false' },
  ],
  dryRun: { input: 'head = [3,2,0,-4], pos=1 (cycle at node 2)', steps: [
    { step: 1, state: 'slow=3, fast=3', action: 'Start' },
    { step: 2, state: 'slow=2, fast=0', action: 'slow+1, fast+2' },
    { step: 3, state: 'slow=0, fast=2', action: 'fast loops back through cycle' },
    { step: 4, state: 'slow=-4, fast=-4', action: 'They meet! → cycle exists ✓' },
  ]},
  edgeCases: [
    { case: 'head=null', explanation: 'Empty list — no cycle' },
    { case: 'head=[1]', explanation: 'Single node, no cycle — fast reaches null' },
    { case: 'head=[1], pos=0', explanation: 'Single node pointing to itself — cycle' },
    { case: 'head=[1,2], pos=-1', explanation: 'Two nodes, no cycle' },
    { case: 'head=[1,2], pos=0', explanation: 'Tail points to head — cycle' },
  ],
  visibleTests: [
    { input: { head: [3,2,0,-4], pos: 1 }, expected: true, note: 'Cycle at node 2' },
    { input: { head: [1,2], pos: 0 }, expected: true, note: 'Cycle at head' },
    { input: { head: [1], pos: -1 }, expected: false, note: 'No cycle' },
    { input: { head: [], pos: -1 }, expected: false, note: 'Empty' },
    { input: { head: [1], pos: 0 }, expected: true, note: 'Self-loop' },
    { input: { head: [1,2,3,4,5], pos: -1 }, expected: false, note: 'Long no cycle' },
    { input: { head: [1,2,3,4,5], pos: 2 }, expected: true, note: 'Mid-cycle' },
    { input: { head: [1,2,3,4,5], pos: 4 }, expected: true, note: 'Tail to tail (self)' },
    { input: { head: [1,2,3], pos: 0 }, expected: true, note: 'Cycle to head' },
    { input: { head: [1,2,3,4], pos: -1 }, expected: false, note: 'Four nodes no cycle' },
  ],
  hiddenTestConfig: { generator: 'linkedList', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Floyd\'s Cycle Detection (Tortoise & Hare)', why: 'Two pointers at different speeds will always meet inside a cycle (if one exists) because the fast pointer closes the gap by 1 each iteration. This O(1) space technique is fundamental for cycle detection in any sequence.', related: ['ll5','a20'] },
  visualDiagram: '3 → 2 → 0 → -4\n    ↑           |\n    └───────────┘  (cycle)\n\nslow: 3 → 2 → 0 → -4 → 2 ...\nfast: 3 → 0 → 2 → -4 → 0 → 2...\n                         ↑\n              They meet at node with val 2',
  examples: [
    { input: 'head = [3,2,0,-4], pos = 1', output: 'true', explanation: 'Tail connects to node at index 1' },
    { input: 'head = [1], pos = -1', output: 'false', explanation: 'No cycle' },
  ],
  constraints: ['0 ≤ number of nodes ≤ 10⁴', '-10⁵ ≤ Node.val ≤ 10⁵', 'pos is -1 or a valid index'],
},

'll6': {
  description: 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list by splicing together the nodes. Return the head of the merged linked list.',
  intuition: 'Use a dummy head node. Compare the current nodes of both lists, attach the smaller one to the result, and advance that list\'s pointer. When one list is exhausted, attach the remainder of the other.',
  approaches: [
    { name: 'Iterative (Optimal)', complexity: { time: 'O(n+m)', space: 'O(1)' }, description: 'Dummy node + pointer comparison. Attach smaller node each time.', pseudocode: 'dummy = ListNode(0)\ncurr = dummy\nwhile l1 and l2:\n  if l1.val <= l2.val:\n    curr.next = l1; l1 = l1.next\n  else:\n    curr.next = l2; l2 = l2.next\n  curr = curr.next\ncurr.next = l1 or l2\nreturn dummy.next' },
    { name: 'Recursive', complexity: { time: 'O(n+m)', space: 'O(n+m)' }, description: 'Pick smaller head, recursively merge the rest.', pseudocode: 'def merge(l1, l2):\n  if !l1: return l2\n  if !l2: return l1\n  if l1.val <= l2.val:\n    l1.next = merge(l1.next, l2)\n    return l1\n  else:\n    l2.next = merge(l1, l2.next)\n    return l2' },
  ],
  dryRun: { input: 'l1=[1,2,4], l2=[1,3,4]', steps: [
    { step: 1, state: 'l1=1, l2=1', action: '1<=1 → take l1. result: [1]' },
    { step: 2, state: 'l1=2, l2=1', action: '1<2 → take l2. result: [1,1]' },
    { step: 3, state: 'l1=2, l2=3', action: '2<3 → take l1. result: [1,1,2]' },
    { step: 4, state: 'l1=4, l2=3', action: '3<4 → take l2. result: [1,1,2,3]' },
    { step: 5, state: 'l1=4, l2=4', action: '4<=4 → take l1. result: [1,1,2,3,4]' },
    { step: 6, state: 'l1=null, l2=4', action: 'Attach remaining: [1,1,2,3,4,4] ✓' },
  ]},
  edgeCases: [
    { case: 'l1=[], l2=[]', explanation: 'Both empty — return empty' },
    { case: 'l1=[], l2=[0]', explanation: 'One empty — return the other' },
    { case: 'l1=[1], l2=[2]', explanation: 'Single elements — simple merge' },
    { case: 'l1=[1,3,5], l2=[2,4,6]', explanation: 'Interleaved — alternating picks' },
    { case: 'l1=[1,1,1], l2=[1,1,1]', explanation: 'All duplicates — merge all' },
  ],
  visibleTests: [
    { input: { list1: [1,2,4], list2: [1,3,4] }, expected: [1,1,2,3,4,4], note: 'Classic' },
    { input: { list1: [], list2: [] }, expected: [], note: 'Both empty' },
    { input: { list1: [], list2: [0] }, expected: [0], note: 'One empty' },
    { input: { list1: [1], list2: [2] }, expected: [1,2], note: 'Single each' },
    { input: { list1: [1,3,5], list2: [2,4,6] }, expected: [1,2,3,4,5,6], note: 'Interleaved' },
    { input: { list1: [1,1,1], list2: [1,1,1] }, expected: [1,1,1,1,1,1], note: 'All same' },
    { input: { list1: [5], list2: [1,2,4] }, expected: [1,2,4,5], note: 'One larger' },
    { input: { list1: [1,2,3], list2: [4,5,6] }, expected: [1,2,3,4,5,6], note: 'No interleave' },
    { input: { list1: [-3,-1,0], list2: [-2,1,2] }, expected: [-3,-2,-1,0,1,2], note: 'Negatives' },
    { input: { list1: [2], list2: [1] }, expected: [1,2], note: 'Swap order' },
  ],
  hiddenTestConfig: { generator: 'twoLinkedLists', constraints: { minLen: 0, maxLen: 5000 } },
  patternExplanation: { pattern: 'Merge Two Sorted Sequences', why: 'This is the merge step of merge sort applied to linked lists. The dummy node technique avoids special-casing the head. This pattern extends to merging K sorted lists (using a heap).', related: ['ll7'] },
  visualDiagram: 'l1: 1 → 2 → 4\nl2: 1 → 3 → 4\n\nCompare: 1 ≤ 1 → take l1\n  1 → ?\nCompare: 2 vs 1 → take l2\n  1 → 1 → ?\nCompare: 2 vs 3 → take l1\n  1 → 1 → 2 → ?\n...continues...\n\nResult: 1 → 1 → 2 → 3 → 4 → 4',
  examples: [
    { input: 'list1 = [1,2,4], list2 = [1,3,4]', output: '[1,1,2,3,4,4]', explanation: 'Merge maintaining sorted order' },
    { input: 'list1 = [], list2 = []', output: '[]', explanation: 'Both empty' },
  ],
  constraints: ['0 ≤ list length ≤ 50', '-100 ≤ Node.val ≤ 100', 'Both lists are sorted in non-decreasing order'],
},

'll2': {
  description: 'Given the head of a singly linked list, return the middle node of the linked list. If there are two middle nodes, return the second middle node.',
  intuition: 'Use two pointers, slow and fast. Slow moves one step at a time, fast moves two steps. When fast reaches the end, slow is exactly at the middle.',
  approaches: [
    { name: 'Fast & Slow Pointers (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Advance fast pointer twice as fast as slow pointer.', pseudocode: 'slow = fast = head\nwhile fast and fast.next:\n  slow = slow.next\n  fast = fast.next.next\nreturn slow' }
  ],
  dryRun: { input: 'head=[1,2,3,4,5]', steps: [
    { step: 1, state: 'slow=1, fast=1', action: 'Start' },
    { step: 2, state: 'slow=2, fast=3', action: 'Move pointers' },
    { step: 3, state: 'slow=3, fast=5', action: 'Move pointers' },
    { step: 4, state: 'fast.next is null', action: 'Return slow=3' }
  ]},
  edgeCases: [
    { case: 'Even number of nodes', explanation: 'Returns the second middle node automatically.' },
    { case: 'Single node', explanation: 'Returns head.' }
  ],
  visibleTests: [
    { input: { head: [1,2,3,4,5] }, expected: [3,4,5], note: 'Odd nodes' },
    { input: { head: [1,2,3,4,5,6] }, expected: [4,5,6], note: 'Even nodes' }
  ],
  hiddenTestConfig: { generator: 'linkedList', constraints: { minLen: 1, maxLen: 100 } },
  patternExplanation: { pattern: 'Fast & Slow Pointers', why: 'A classic application of multiple pointers to find positions proportionally without knowing the total length.', related: ['ll4'] },
  visualDiagram: '1 -> 2 -> 3 -> 4 -> 5\n          ^\n          slow\n                    ^\n                    fast',
  examples: [
    { input: 'head=[1,2,3,4,5]', output: '[3,4,5]', explanation: 'The middle node is 3.' }
  ],
  constraints: ['1 <= number of nodes <= 100', '1 <= Node.val <= 100']
},

'll3': {
  description: 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
  intuition: 'We can use a Min-Heap to keep track of the smallest node among the heads of the k lists. We pop the smallest, append it to the result, and push its next node into the heap.',
  approaches: [
    { name: 'Min-Heap (Optimal)', complexity: { time: 'O(N log k)', space: 'O(k)' }, description: 'Use a priority queue of size k.', pseudocode: 'heap = []\nfor list in lists:\n  if list: heap.push((list.val, list))\ndummy = ListNode()\ncurr = dummy\nwhile heap:\n  val, node = heap.pop()\n  curr.next = node\n  curr = curr.next\n  if node.next: heap.push((node.next.val, node.next))\nreturn dummy.next' },
    { name: 'Divide and Conquer', complexity: { time: 'O(N log k)', space: 'O(1)' }, description: 'Pairwise merge lists until 1 is left.', pseudocode: 'while len(lists) > 1:\n  lists.append(mergeTwoLists(lists.pop(0), lists.pop(0)))\nreturn lists[0]' }
  ],
  dryRun: { input: 'lists=[[1,4,5],[1,3,4],[2,6]]', steps: [
    { step: 1, state: 'heap=[1,1,2]', action: 'Initialize with heads' },
    { step: 2, state: 'pop 1, heap=[1,2,4]', action: 'Next node is 4' },
    { step: 3, state: 'pop 1, heap=[2,3,4]', action: 'Next node is 3' },
    { step: 4, state: 'continue until empty', action: 'Result [1,1,2,3,4,4,5,6]' }
  ]},
  edgeCases: [
    { case: 'lists=[]', explanation: 'Returns null.' },
    { case: 'lists=[[],[]]', explanation: 'Empty lists inside array, handled correctly.' }
  ],
  visibleTests: [
    { input: { lists: [[1,4,5],[1,3,4],[2,6]] }, expected: [1,1,2,3,4,4,5,6], note: 'Basic' },
    { input: { lists: [] }, expected: [], note: 'Empty' }
  ],
  hiddenTestConfig: { generator: 'arrayOfLinkedLists', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'K-way Merge', why: 'Using a min-heap efficiently generalizes the 2-pointer merge to k pointers.', related: ['ll6', 'hp3'] },
  visualDiagram: 'lists:\n1->4->5\n1->3->4\n2->6\n\nHeap: [1, 1, 2] -> Pop 1 -> push 4 -> Heap: [1, 2, 4] -> Pop 1 -> push 3...',
  examples: [
    { input: 'lists=[[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', explanation: 'Merged sorted list' }
  ],
  constraints: ['k == lists.length', '0 <= k <= 10^4']
},

'll5': {
  description: 'A linked list of length n is given such that each node contains an additional random pointer, which could point to any node in the list, or null. Construct a deep copy of the list.',
  intuition: 'A standard deep copy creates new nodes and links them, but the random pointers might point to nodes we haven\'t created yet. We can solve this with a hash map mapping original nodes to cloned nodes, or optimally by interleaving the cloned nodes with the original list.',
  approaches: [
    { name: 'Hash Map', complexity: { time: 'O(N)', space: 'O(N)' }, description: 'Map original node to clone. Two passes: first create clones, second assign next/random.', pseudocode: 'clones = {null: null}\ncurr = head\nwhile curr:\n  clones[curr] = Node(curr.val)\n  curr = curr.next\ncurr = head\nwhile curr:\n  clones[curr].next = clones[curr.next]\n  clones[curr].random = clones[curr.random]\n  curr = curr.next\nreturn clones[head]' },
    { name: 'Interleaving (Optimal)', complexity: { time: 'O(N)', space: 'O(1)' }, description: '1. Insert clones after originals. 2. Copy random pointers. 3. Separate lists.', pseudocode: 'curr = head\nwhile curr: # Interleave\n  nxt = curr.next\n  curr.next = Node(curr.val, nxt)\n  curr = nxt\ncurr = head\nwhile curr: # Randoms\n  if curr.random: curr.next.random = curr.random.next\n  curr = curr.next.next\ncurr = head\nres = head.next if head else null\nwhile curr: # Separate\n  clone = curr.next\n  curr.next = clone.next\n  if clone.next: clone.next = clone.next.next\n  curr = curr.next\nreturn res' }
  ],
  dryRun: { input: 'head=[[7,null],[13,0],[11,4],[10,2],[1,0]]', steps: [
    { step: 1, state: 'Interleave', action: '7 -> 7\' -> 13 -> 13\' ...' },
    { step: 2, state: 'Random pointers', action: '13\'.random = 13.random.next = 7\'' },
    { step: 3, state: 'Separate', action: 'Extract the primes (\').' }
  ]},
  edgeCases: [
    { case: 'Empty list', explanation: 'Returns null.' },
    { case: 'Random points to null', explanation: 'Safely maps to null.' }
  ],
  visibleTests: [
    { input: { head: [[7,null],[13,0],[11,4],[10,2],[1,0]] }, expected: [[7,null],[13,0],[11,4],[10,2],[1,0]], note: 'Classic case' },
    { input: { head: [] }, expected: [], note: 'Empty' }
  ],
  hiddenTestConfig: { generator: 'linkedListWithRandom', constraints: { minLen: 0, maxLen: 1000 } },
  patternExplanation: { pattern: 'In-Place Linked List Interleaving', why: 'A clever trick to avoid O(N) hash map space when creating a mapping from original nodes to new nodes. By placing the new node exactly adjacent to the old node, old_node.next becomes the map.', related: ['g2'] },
  visualDiagram: 'Original: A -> B -> C\nInterleaved: A -> A\' -> B -> B\' -> C -> C\'\nRandom Assignment: A\'.random = A.random.next\nSeparated: A\' -> B\' -> C\'',
  examples: [
    { input: 'head=[[1,1],[2,1]]', output: '[[1,1],[2,1]]', explanation: 'Deep copy created.' }
  ],
  constraints: ['0 <= n <= 1000', '-10000 <= Node.val <= 10000', 'Node.random is null or is pointing to some node in the linked list.']
},

'll7': {
  description: 'Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.',
  intuition: 'Imagine two runners on a track. If the track is a straight line, the faster runner will reach the end. If the track has a loop, the faster runner will eventually lap the slower runner.',
  approaches: [
    { name: 'Floyd\'s Cycle Finding Algorithm (Optimal)', complexity: { time: 'O(N)', space: 'O(1)' }, description: 'Use a slow pointer (1 step) and a fast pointer (2 steps). If they meet, there is a cycle.', pseudocode: 'slow, fast = head, head\nwhile fast and fast.next:\n  slow = slow.next\n  fast = fast.next.next\n  if slow == fast: return true\nreturn false' }
  ],
  dryRun: { input: 'head=[3,2,0,-4], pos=1', steps: [
    { step: 1, state: 's=3, f=3', action: 'Move' },
    { step: 2, state: 's=2, f=0', action: 'Move' },
    { step: 3, state: 's=0, f=2', action: 'Move (cycle: -4 -> 2)' },
    { step: 4, state: 's=-4, f=-4', action: 'Match! return true ✓' }
  ]},
  edgeCases: [
    { case: 'Single node, no cycle', explanation: 'fast.next is null -> false.' },
    { case: 'Single node, with cycle', explanation: 'fast and slow meet at node.' },
    { case: 'Empty list', explanation: 'Returns false immediately.' }
  ],
  visibleTests: [
    { input: { head: [3,2,0,-4], pos: 1 }, expected: true, note: 'Classic case' },
    { input: { head: [1,2], pos: 0 }, expected: true, note: 'Two nodes, cycle' },
    { input: { head: [1], pos: -1 }, expected: false, note: 'Single node, no cycle' }
  ],
  hiddenTestConfig: { generator: 'linkedListCycle', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Fast & Slow Pointers', why: 'The definitive O(1) space cycle detection method. Since the fast pointer reduces the distance between them by 1 each step, they are guaranteed to meet if a cycle exists.', related: ['ll2', 'll8'] },
  visualDiagram: '3 -> 2 -> 0 -> -4\n     ^          |\n     |__________|  <-- Cycle\nFast and slow meet at -4.',
  examples: [
    { input: 'head=[3,2,0,-4], pos=1', output: 'true', explanation: 'Tail connects to node index 1.' }
  ],
  constraints: ['The number of the nodes in the list is in the range [0, 10^4].', '-10^5 <= Node.val <= 10^5', 'pos is -1 or a valid index in the linked-list.']
}
};


