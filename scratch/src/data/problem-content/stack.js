// Stack — Production Problem Content
export const stackContent = {
'st1': {
  description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.',
  intuition: 'Push every opening bracket onto a stack. When you encounter a closing bracket, check if the top of the stack is the matching opening bracket. If not, or if the stack is empty, it\'s invalid. At the end, the stack must be empty.',
  approaches: [
    { name: 'Stack (Optimal)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Use a stack. Push opening brackets. For closing brackets, pop and verify match.', pseudocode: 'stack = []\nmatch = {")":"(", "]":"[", "}":"{"}\nfor c in s:\n  if c in "([{": stack.push(c)\n  else:\n    if !stack or stack.pop() != match[c]: return false\nreturn stack is empty' },
  ],
  dryRun: { input: 's = "({[]})"', steps: [
    { step: 1, state: 'c="(", stack=["("]', action: 'Push opening' },
    { step: 2, state: 'c="{", stack=["(","{"]', action: 'Push opening' },
    { step: 3, state: 'c="[", stack=["(","{","["]', action: 'Push opening' },
    { step: 4, state: 'c="]", pop="[", match ✓', action: 'stack=["(","{"]' },
    { step: 5, state: 'c="}", pop="{", match ✓', action: 'stack=["("]' },
    { step: 6, state: 'c=")", pop="(", match ✓', action: 'stack=[] → valid ✓' },
  ]},
  edgeCases: [
    { case: 's=""', explanation: 'Empty string is valid' },
    { case: 's="("', explanation: 'Single opening — unmatched, invalid' },
    { case: 's=")"', explanation: 'Single closing — nothing to match, invalid' },
    { case: 's="(]"', explanation: 'Mismatched types — invalid' },
    { case: 's="([)]"', explanation: 'Incorrect nesting order — invalid' },
  ],
  visibleTests: [
    { input: { s: '()' }, expected: true, note: 'Simple pair' },
    { input: { s: '()[]{}' }, expected: true, note: 'All types' },
    { input: { s: '(]' }, expected: false, note: 'Mismatch' },
    { input: { s: '([)]' }, expected: false, note: 'Wrong order' },
    { input: { s: '{[]}' }, expected: true, note: 'Nested' },
    { input: { s: '' }, expected: true, note: 'Empty' },
    { input: { s: '(' }, expected: false, note: 'Unmatched open' },
    { input: { s: ')' }, expected: false, note: 'Unmatched close' },
    { input: { s: '(((())))' }, expected: true, note: 'Deep nesting' },
    { input: { s: '({[}])' }, expected: false, note: 'Complex invalid' },
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 0, maxLen: 10000 } },
  patternExplanation: { pattern: 'Stack for Matching', why: 'Bracket matching requires LIFO ordering — the most recent opening bracket must match the next closing bracket. Stacks naturally enforce this nesting structure.', related: ['st4','st16'] },
  visualDiagram: 's = "({[]})" \n\nStack:  []  →  [(]  →  [({]  →  [({[]  \n        →  pop ] matches [  →  [({]\n        →  pop } matches {  →  [(]\n        →  pop ) matches (  →  []\n        Stack empty → VALID ✓',
  examples: [
    { input: 's = "()"', output: 'true', explanation: 'Opening and closing parentheses match' },
    { input: 's = "(]"', output: 'false', explanation: '( does not match ]' },
  ],
  constraints: ['1 ≤ s.length ≤ 10⁴', 's consists of parentheses only: ()[]{}'],
},

'st5': {
  description: 'Given an array of integers temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day with warmer temperature, put 0.',
  intuition: 'Use a monotonic decreasing stack of indices. For each new temperature, pop all stack elements with lower temperature — each popped element has found its "next warmer day". The difference in indices is the answer.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'For each day, scan forward to find the first warmer day.', pseudocode: 'for i in 0..n:\n  for j in i+1..n:\n    if temps[j] > temps[i]:\n      ans[i] = j - i; break' },
    { name: 'Monotonic Stack (Optimal)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Maintain a stack of indices with decreasing temperatures. Pop when a warmer day is found.', pseudocode: 'stack = []\nfor i in 0..n:\n  while stack and temps[i] > temps[stack[-1]]:\n    j = stack.pop()\n    ans[j] = i - j\n  stack.push(i)' },
  ],
  dryRun: { input: 'temps = [73,74,75,71,69,72,76,73]', steps: [
    { step: 1, state: 'i=0(73), stack=[0]', action: 'Push' },
    { step: 2, state: 'i=1(74>73), pop 0, ans[0]=1', action: 'stack=[1]' },
    { step: 3, state: 'i=2(75>74), pop 1, ans[1]=1', action: 'stack=[2]' },
    { step: 4, state: 'i=3(71<75), stack=[2,3]', action: 'Push' },
    { step: 5, state: 'i=4(69<71), stack=[2,3,4]', action: 'Push' },
    { step: 6, state: 'i=5(72>69,72>71), pop 4→ans[4]=1, pop 3→ans[3]=2', action: 'stack=[2,5]' },
    { step: 7, state: 'i=6(76>72,76>75), pop 5→ans[5]=1, pop 2→ans[2]=4', action: 'stack=[6]' },
    { step: 8, state: 'i=7(73<76), stack=[6,7]', action: 'Remaining get 0. Answer: [1,1,4,2,1,1,0,0]' },
  ]},
  edgeCases: [
    { case: 'temps=[30]', explanation: 'Single day — no future warmer day, answer [0]' },
    { case: 'temps=[100,99,98]', explanation: 'Decreasing — no warmer future for any, all zeros' },
    { case: 'temps=[30,40,50]', explanation: 'Increasing — each waits 1 day' },
    { case: 'temps=[50,50,50]', explanation: 'All same — equal is not warmer, all zeros' },
    { case: 'temps=[30,60,90]', explanation: 'Strictly increasing — [1,1,0]' },
  ],
  visibleTests: [
    { input: { temperatures: [73,74,75,71,69,72,76,73] }, expected: [1,1,4,2,1,1,0,0], note: 'Classic case' },
    { input: { temperatures: [30,40,50,60] }, expected: [1,1,1,0], note: 'Increasing' },
    { input: { temperatures: [30,60,90] }, expected: [1,1,0], note: 'Strictly increasing' },
    { input: { temperatures: [90,60,30] }, expected: [0,0,0], note: 'Decreasing' },
    { input: { temperatures: [50,50,50] }, expected: [0,0,0], note: 'All same' },
    { input: { temperatures: [30] }, expected: [0], note: 'Single' },
    { input: { temperatures: [55,38,53,81,61,93,97,32,43,78] }, expected: [3,1,1,2,1,1,0,1,1,0], note: 'Complex' },
    { input: { temperatures: [34,80,80,34,34,80,80,80,80,34] }, expected: [1,0,0,2,1,0,0,0,0,0], note: 'Plateau' },
    { input: { temperatures: [70,71] }, expected: [1,0], note: 'Two elements' },
    { input: { temperatures: [71,70] }, expected: [0,0], note: 'Two decreasing' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Monotonic Stack (Next Greater Element)', why: 'Finding the "next greater element" for each position is the canonical monotonic stack problem. The stack maintains a decreasing sequence — each pop represents finding the answer for that index. Every element is pushed and popped at most once, giving O(n).', related: ['st8','st9','st7'] },
  visualDiagram: 'temps = [73, 74, 75, 71, 69, 72, 76, 73]\n\nDay:     0   1   2   3   4   5   6   7\n         73  74  75  71  69  72  76  73\nAnswer:  1   1   4   2   1   1   0   0\n         └→1 └→2 └──────→6\n                   └──→5 └→5 └→6\n\nEach arrow shows "next warmer day"',
  examples: [
    { input: 'temperatures = [73,74,75,71,69,72,76,73]', output: '[1,1,4,2,1,1,0,0]', explanation: 'Day 0 waits 1 day for 74, day 2 waits 4 days for 76' },
    { input: 'temperatures = [30,40,50,60]', output: '[1,1,1,0]', explanation: 'Each day waits 1 day except last' },
  ],
  constraints: ['1 ≤ temperatures.length ≤ 10⁵', '30 ≤ temperatures[i] ≤ 100'],
},

'st7': {
  description: 'Given an array of integers heights representing the histogram\'s bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.',
  intuition: 'Use a monotonic increasing stack. When we encounter a bar shorter than the stack top, the top bar\'s maximum rectangle width is determined. Pop and calculate area using the current index and the new stack top as boundaries.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'For each bar, expand left and right while bars are >= current height. Calculate area.', pseudocode: 'for i in 0..n:\n  h = heights[i]\n  l = r = i\n  while l>0 and heights[l-1]>=h: l--\n  while r<n-1 and heights[r+1]>=h: r++\n  area = h * (r-l+1)\n  max_area = max(max_area, area)' },
    { name: 'Monotonic Stack (Optimal)', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Stack stores indices of increasing heights. When a shorter bar is found, pop and compute area.', pseudocode: 'stack = [-1]  # sentinel\nmax_area = 0\nfor i in 0..n:\n  while stack[-1]!=-1 and h[i]<=h[stack[-1]]:\n    height = h[stack.pop()]\n    width = i - stack[-1] - 1\n    max_area = max(max_area, height*width)\n  stack.push(i)\n# flush remaining\nwhile stack[-1]!=-1:\n  height = h[stack.pop()]\n  width = n - stack[-1] - 1\n  max_area = max(max_area, height*width)' },
  ],
  dryRun: { input: 'heights = [2,1,5,6,2,3]', steps: [
    { step: 1, state: 'i=0(2), stack=[-1,0]', action: 'Push' },
    { step: 2, state: 'i=1(1<2), pop 0: h=2, w=1-(-1)-1=1, area=2', action: 'stack=[-1,1]' },
    { step: 3, state: 'i=2(5), stack=[-1,1,2]', action: 'Push' },
    { step: 4, state: 'i=3(6), stack=[-1,1,2,3]', action: 'Push' },
    { step: 5, state: 'i=4(2<6), pop 3: h=6, w=4-2-1=1, area=6', action: 'Pop 2: h=5, w=4-1-1=2, area=10 ★' },
    { step: 6, state: 'Flush: pop remaining', action: 'max_area = 10 ✓' },
  ]},
  edgeCases: [
    { case: 'heights=[1]', explanation: 'Single bar — area is 1' },
    { case: 'heights=[1,1,1,1]', explanation: 'All same height — area = 4×1 = 4' },
    { case: 'heights=[5,4,3,2,1]', explanation: 'Decreasing — each bar triggers pop' },
    { case: 'heights=[1,2,3,4,5]', explanation: 'Increasing — all popped at flush stage' },
    { case: 'heights=[0]', explanation: 'Zero height — area is 0' },
  ],
  visibleTests: [
    { input: { heights: [2,1,5,6,2,3] }, expected: 10, note: 'Classic case (5×2)' },
    { input: { heights: [2,4] }, expected: 4, note: 'Two bars' },
    { input: { heights: [1] }, expected: 1, note: 'Single bar' },
    { input: { heights: [1,1,1,1] }, expected: 4, note: 'All same' },
    { input: { heights: [5,4,3,2,1] }, expected: 9, note: 'Decreasing (3×3)' },
    { input: { heights: [1,2,3,4,5] }, expected: 9, note: 'Increasing (3×3)' },
    { input: { heights: [0] }, expected: 0, note: 'Zero height' },
    { input: { heights: [6,2,5,4,5,1,6] }, expected: 12, note: 'Complex (4×3)' },
    { input: { heights: [2,2,2,2,2,2] }, expected: 12, note: 'Uniform (2×6)' },
    { input: { heights: [4,2,0,3,2,5] }, expected: 6, note: 'Has zero' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Monotonic Stack (Area Computation)', why: 'The stack maintains increasing heights. When a shorter bar appears, we know the popped bar\'s rectangle can\'t extend further right. The width extends from the new stack top to the current index. This pattern is the basis for maximal rectangle in matrix.', related: ['st15','st18'] },
  visualDiagram: 'heights = [2, 1, 5, 6, 2, 3]\n\n     6\n   5 █\n   █ █     3\n 2 █ █ 2 2 █\n █ █ █ █ █ █\n █ █ █ █ █ █\n 0 1 2 3 4 5\n\n   ┌───┐\n   │5×2│ = 10 ★ (bars 2-3, height 5)\n   └───┘',
  examples: [
    { input: 'heights = [2,1,5,6,2,3]', output: '10', explanation: 'Rectangle of height 5, width 2 (indices 2-3)' },
    { input: 'heights = [2,4]', output: '4', explanation: 'Single bar of height 4' },
  ],
  constraints: ['1 ≤ heights.length ≤ 10⁵', '0 ≤ heights[i] ≤ 10⁴'],
},

'st2': {
  description: 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time. Implement the MinStack class.',
  intuition: 'Store pairs of (value, current_min) in the stack. When pushing, current_min = min(val, previous current_min).',
  approaches: [
    { name: 'Stack of Pairs', complexity: { time: 'O(1)', space: 'O(n)' }, description: 'Store a tuple (val, min_so_far) on each push.', pseudocode: 'class MinStack:\n  def __init__(self): self.stack = []\n  def push(self, val):\n    min_val = min(val, self.stack[-1][1]) if self.stack else val\n    self.stack.append((val, min_val))\n  def pop(self): self.stack.pop()\n  def top(self): return self.stack[-1][0]\n  def getMin(self): return self.stack[-1][1]' }
  ],
  dryRun: { input: 'push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()', steps: [
    { step: 1, state: 'push(-2)', action: 'stack=[(-2,-2)]' },
    { step: 2, state: 'push(0)', action: 'stack=[(-2,-2), (0,-2)]' },
    { step: 3, state: 'push(-3)', action: 'stack=[(-2,-2), (0,-2), (-3,-3)]' },
    { step: 4, state: 'getMin()', action: 'Return -3' },
    { step: 5, state: 'pop()', action: 'stack=[(-2,-2), (0,-2)]' },
    { step: 6, state: 'top()', action: 'Return 0' },
    { step: 7, state: 'getMin()', action: 'Return -2' }
  ]},
  edgeCases: [
    { case: 'Duplicate minimums', explanation: 'Works naturally since min is tracked per state.' },
    { case: 'All same elements', explanation: 'Min stays the same.' }
  ],
  visibleTests: [
    { input: { ops: ["MinStack","push","push","push","getMin","pop","top","getMin"], args: [[],[-2],[0],[-3],[],[],[],[]] }, expected: [null,null,null,null,-3,null,0,-2], note: 'Basic' }
  ],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 1, maxLen: 30000 } },
  patternExplanation: { pattern: 'State Augmented Stack', why: 'A stack\'s state only changes at the top. Augmenting elements with properties of the stack at that point in time allows O(1) query of aggregate properties.', related: ['st1'] },
  visualDiagram: 'Stack state:\nTop -> (-3, min=-3)\n       ( 0, min=-2)\nBot -> (-2, min=-2)',
  examples: [
    { input: 'push(-2), push(0), push(-3), getMin()', output: '-3', explanation: 'Min is -3' }
  ],
  constraints: ['-2^31 <= val <= 2^31 - 1', 'pop, top and getMin will always be called on non-empty stacks.']
},

'st3': {
  description: 'Evaluate the value of an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, *, and /.',
  intuition: 'Iterate through tokens. Push numbers to a stack. When an operator is seen, pop two numbers, evaluate, and push the result back.',
  approaches: [
    { name: 'Stack Evaluation', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Standard RPN evaluation algorithm using a stack.', pseudocode: 'stack = []\nfor t in tokens:\n  if t in "+-*/":\n    b, a = stack.pop(), stack.pop()\n    stack.push(eval(a, b, t))\n  else:\n    stack.push(int(t))\nreturn stack[-1]' }
  ],
  dryRun: { input: '["2","1","+","3","*"]', steps: [
    { step: 1, state: 't="2"', action: 'stack=[2]' },
    { step: 2, state: 't="1"', action: 'stack=[2,1]' },
    { step: 3, state: 't="+"', action: 'pop 1, pop 2. 2+1=3. stack=[3]' },
    { step: 4, state: 't="3"', action: 'stack=[3,3]' },
    { step: 5, state: 't="*"', action: 'pop 3, pop 3. 3*3=9. stack=[9]' }
  ]},
  edgeCases: [
    { case: 'Negative numbers', explanation: 'int(t) handles correctly.' },
    { case: 'Division truncation', explanation: 'Division between two integers should truncate toward zero.' },
    { case: 'Single number', explanation: 'Returns the number.' }
  ],
  visibleTests: [
    { input: { tokens: ["2","1","+","3","*"] }, expected: 9, note: 'Basic addition and multiplication' },
    { input: { tokens: ["4","13","5","/","+"] }, expected: 6, note: 'Division truncation' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Postfix Evaluation', why: 'RPN uniquely identifies operations without parentheses. Stack perfectly models the nested evaluations.', related: ['st1'] },
  visualDiagram: '["2", "1", "+", "3", "*"]\nStack:\n[2]\n[2, 1]\n[3] (2+1)\n[3, 3]\n[9] (3*3)',
  examples: [
    { input: 'tokens = ["2","1","+","3","*"]', output: '9', explanation: '((2 + 1) * 3) = 9' }
  ],
  constraints: ['1 <= tokens.length <= 10^4', 'tokens[i] is either an operator: "+", "-", "*", or "/", or an integer.']
},

'st4': {
  description: 'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
  intuition: 'We can build the string one character at a time. We can add a "(" if we haven\'t used all n of them. We can add a ")" only if we have more open parentheses currently unclosed than we have closed parentheses.',
  approaches: [
    { name: 'Backtracking (Optimal)', complexity: { time: 'O(4^n / sqrt(n))', space: 'O(n)' }, description: 'Recursively build string, tracking open and closed counts.', pseudocode: 'def backtrack(open, closed, current):\n  if len(current) == 2 * n:\n    res.append(current); return\n  if open < n:\n    backtrack(open+1, closed, current+"(")\n  if closed < open:\n    backtrack(open, closed+1, current+")")' }
  ],
  dryRun: { input: 'n=2', steps: [
    { step: 1, state: 'o=0, c=0, str=""', action: 'Add "(" -> backtrack(1,0,"(")' },
    { step: 2, state: 'o=1, c=0, str="("', action: 'Branch 1: Add "(" -> backtrack(2,0,"(("). Branch 2: Add ")" -> backtrack(1,1,"()")' },
    { step: 3, state: 'Branch 1: o=2, c=0, str="(("', action: 'Can only add ")" -> backtrack(2,1,"(()") -> backtrack(2,2,"(())") -> save' },
    { step: 4, state: 'Branch 2: o=1, c=1, str="()"', action: 'Can only add "(" -> backtrack(2,1,"()(") -> backtrack(2,2,"()()") -> save' }
  ]},
  edgeCases: [
    { case: 'n=1', explanation: 'Only "()" is valid.' }
  ],
  visibleTests: [
    { input: { n: 3 }, expected: ["((()))","(()())","(())()","()(())","()()()"], note: 'Classic case' },
    { input: { n: 1 }, expected: ["()"], note: 'Minimum n' }
  ],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 1, maxLen: 8 } },
  patternExplanation: { pattern: 'State Space Backtracking', why: 'A classic backtracking pattern where valid next steps depend entirely on the counts of previously placed elements.', related: ['rc1'] },
  visualDiagram: '                 ""\n                /  \n              "(" \n             /   \\\n          "(("   "()"\n          /        \\\n      "(()"       "()("\n       /            \\\n    "(())"        "()()"\n    (Valid)       (Valid)',
  examples: [
    { input: 'n=3', output: '["((()))","(()())","(())()","()(())","()()()"]', explanation: 'All 5 valid combinations.' }
  ],
  constraints: ['1 <= n <= 8']
},

'st6': {
  description: 'Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.',
  intuition: 'We want to find the "next greater element". As we iterate, if we can\'t find a warmer day immediately, we put the current day on a stack. When we finally hit a warmer day, we pop from the stack and compute the difference in days.',
  approaches: [
    { name: 'Monotonic Decreasing Stack (Optimal)', complexity: { time: 'O(N)', space: 'O(N)' }, description: 'Keep a stack of indices whose temperatures haven\'t found a warmer day yet.', pseudocode: 'res = [0] * len(T)\nstack = [] # stores indices\nfor i, t in enumerate(T):\n  while stack and T[stack[-1]] < t:\n    prev_idx = stack.pop()\n    res[prev_idx] = i - prev_idx\n  stack.append(i)\nreturn res' }
  ],
  dryRun: { input: 'T=[73,74,75,71,69,72,76,73]', steps: [
    { step: 1, state: 'i=0, t=73', action: 'stack=[0]' },
    { step: 2, state: 'i=1, t=74', action: '74 > 73. pop 0. res[0] = 1-0 = 1. stack=[1]' },
    { step: 3, state: 'i=2, t=75', action: '75 > 74. pop 1. res[1] = 2-1 = 1. stack=[2]' },
    { step: 4, state: 'i=3..4', action: '71, 69 are smaller. stack=[2,3,4]' },
    { step: 5, state: 'i=5, t=72', action: '72 > 69. pop 4. res[4] = 5-4 = 1. 72 > 71. pop 3. res[3] = 5-3 = 2. stack=[2,5]' },
    { step: 6, state: 'Finish', action: 'All resolved. ✓' }
  ]},
  edgeCases: [
    { case: 'Decreasing temperatures', explanation: 'Stack just grows, res stays 0.' },
    { case: 'All same temperatures', explanation: 'Stack just grows, res stays 0.' }
  ],
  visibleTests: [
    { input: { temperatures: [73,74,75,71,69,72,76,73] }, expected: [1,1,4,2,1,1,0,0], note: 'Classic case' },
    { input: { temperatures: [30,40,50,60] }, expected: [1,1,1,0], note: 'Increasing' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Monotonic Stack', why: 'Finding the "next greater/smaller element" is the textbook use case for a monotonic stack. It stores unsolved problems until a solution arrives.', related: ['st1'] },
  visualDiagram: 'T:   73  74  75  71  69  72  76  73\nAns:  1   1   4   2   1   1   0   0\n75 waits 4 days until 76.',
  examples: [
    { input: 'temperatures=[73,74,75,71,69,72,76,73]', output: '[1,1,4,2,1,1,0,0]', explanation: 'Days to wait.' }
  ],
  constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100']
}
};


