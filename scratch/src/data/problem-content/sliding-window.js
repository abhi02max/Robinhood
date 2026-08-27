// Sliding Window — Production Problem Content
export const slidingWindowContent = {
'sw2': {
  description: 'Given a string s, find the length of the longest substring without repeating characters.',
  intuition: 'Use a sliding window with a set to track characters in the current window. Expand right to include new characters. When a duplicate is found, shrink from the left until the duplicate is removed.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n³)', space: 'O(n)' }, description: 'Check every substring for uniqueness. For each start, expand end while characters are unique.', pseudocode: 'for i in 0..n:\n  for j in i..n:\n    if allUnique(s[i..j]):\n      max_len = max(max_len, j-i+1)' },
    { name: 'Sliding Window + Set', complexity: { time: 'O(n)', space: 'O(min(n,26))' }, description: 'Expand window right. If duplicate, move left past the duplicate. Track max window size.', pseudocode: 'seen = set(), l = 0, max_len = 0\nfor r in 0..n:\n  while s[r] in seen:\n    seen.remove(s[l]); l++\n  seen.add(s[r])\n  max_len = max(max_len, r-l+1)' },
    { name: 'Sliding Window + Map (Optimal)', complexity: { time: 'O(n)', space: 'O(min(n,26))' }, description: 'Store last index of each char. When duplicate found, jump left pointer directly past the previous occurrence.', pseudocode: 'last = {}, l = 0, max_len = 0\nfor r in 0..n:\n  if s[r] in last and last[s[r]] >= l:\n    l = last[s[r]] + 1\n  last[s[r]] = r\n  max_len = max(max_len, r-l+1)' },
  ],
  dryRun: { input: 's = "abcabcbb"', steps: [
    { step: 1, state: 'r=0(a), l=0, seen={a}', action: 'len=1' },
    { step: 2, state: 'r=1(b), l=0, seen={a,b}', action: 'len=2' },
    { step: 3, state: 'r=2(c), l=0, seen={a,b,c}', action: 'len=3 ★' },
    { step: 4, state: 'r=3(a), dup! l→1, seen={b,c,a}', action: 'len=3' },
    { step: 5, state: 'r=4(b), dup! l→2, seen={c,a,b}', action: 'len=3' },
    { step: 6, state: 'r=5(c), dup! l→3, seen={a,b,c}', action: 'len=3' },
    { step: 7, state: 'r=6(b), dup! l→5', action: 'len=2. Answer: 3 ✓' },
  ]},
  edgeCases: [
    { case: 's=""', explanation: 'Empty string — length 0' },
    { case: 's="a"', explanation: 'Single char — length 1' },
    { case: 's="aaaaaa"', explanation: 'All same — every window of size >1 has dup, answer is 1' },
    { case: 's="abcdefg"', explanation: 'All unique — entire string is the answer' },
    { case: 's="dvdf"', explanation: 'Non-contiguous duplicate — "vdf" is valid, length 3' },
  ],
  visibleTests: [
    { input: { s: 'abcabcbb' }, expected: 3, note: '"abc"' },
    { input: { s: 'bbbbb' }, expected: 1, note: 'All same' },
    { input: { s: 'pwwkew' }, expected: 3, note: '"wke"' },
    { input: { s: '' }, expected: 0, note: 'Empty' },
    { input: { s: 'a' }, expected: 1, note: 'Single' },
    { input: { s: 'dvdf' }, expected: 3, note: '"vdf"' },
    { input: { s: 'abcdefghij' }, expected: 10, note: 'All unique' },
    { input: { s: 'aab' }, expected: 2, note: '"ab"' },
    { input: { s: 'abba' }, expected: 2, note: '"ab" or "ba"' },
    { input: { s: 'tmmzuxt' }, expected: 5, note: '"mzuxt"' },
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 0, maxLen: 5000 } },
  patternExplanation: { pattern: 'Variable-Size Sliding Window', why: 'This is the canonical variable window problem. The window expands when the condition is met (all unique) and contracts when violated (duplicate found). The key insight is that the left pointer never moves backward, giving amortized O(n).', related: ['sw3','sw5'] },
  visualDiagram: 's = "a b c a b c b b"\n\n[a]b c a b c b b   len=1\n[a b]c a b c b b   len=2\n[a b c]a b c b b   len=3 ★\n a[b c a]b c b b   len=3 (a dup → slide)\n a b[c a b]c b b   len=3 (b dup → slide)\n\nMax length = 3',
  examples: [
    { input: 's = "abcabcbb"', output: '3', explanation: '"abc" is the longest substring without repeating' },
    { input: 's = "bbbbb"', output: '1', explanation: 'Every character is same, max is 1' },
  ],
  constraints: ['0 ≤ s.length ≤ 5 × 10⁴', 's consists of English letters, digits, symbols and spaces'],
},

'sw5': {
  description: 'Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such window, return "".',
  intuition: 'Use a sliding window. Expand right to include characters. Track how many of t\'s characters are satisfied. Once all satisfied, shrink from left to find minimum window. Use a frequency map for t and a counter for matched characters.',
  approaches: [
    { name: 'Sliding Window (Optimal)', complexity: { time: 'O(n+m)', space: 'O(m)' }, description: 'Expand right pointer, counting matched chars. When all matched, try shrinking left to minimize window size.', pseudocode: 'need = Counter(t), have = 0, required = len(need)\nfor r in 0..len(s):\n  if s[r] in need:\n    window[s[r]]++\n    if window[s[r]] == need[s[r]]: have++\n  while have == required:\n    update min window\n    if s[l] in need:\n      window[s[l]]--\n      if window[s[l]] < need[s[l]]: have--\n    l++' },
  ],
  dryRun: { input: 's="ADOBECODEBANC", t="ABC"', steps: [
    { step: 1, state: 'need={A:1,B:1,C:1}, have=0', action: 'Initialize' },
    { step: 2, state: 'r=0(A), have=1', action: 'A matched' },
    { step: 3, state: 'r=3(B), have=2', action: 'B matched' },
    { step: 4, state: 'r=5(C), have=3 → valid!', action: 'Window "ADOBEC" len=6' },
    { step: 5, state: 'Shrink: l=1, lose A, have=2', action: 'Expand again...' },
    { step: 6, state: 'r=10(A), have=3 → valid!', action: 'Window "CODEBA" len=6' },
    { step: 7, state: 'Shrink to "BANC", have=3', action: 'Window "BANC" len=4 ★ min' },
  ]},
  edgeCases: [
    { case: 's="a", t="a"', explanation: 'Exact match — return "a"' },
    { case: 's="a", t="aa"', explanation: 'Need 2 a\'s but only 1 available — return ""' },
    { case: 's="a", t="b"', explanation: 'Character not in s — return ""' },
    { case: 's="abc", t="cba"', explanation: 'Entire string is the window — return "abc"' },
    { case: 's="aa", t="aa"', explanation: 'Exact duplicate match — return "aa"' },
  ],
  visibleTests: [
    { input: { s: 'ADOBECODEBANC', t: 'ABC' }, expected: 'BANC', note: 'Classic case' },
    { input: { s: 'a', t: 'a' }, expected: 'a', note: 'Exact match' },
    { input: { s: 'a', t: 'aa' }, expected: '', note: 'Not enough chars' },
    { input: { s: 'abc', t: 'cba' }, expected: 'abc', note: 'Full string' },
    { input: { s: 'a', t: 'b' }, expected: '', note: 'Missing char' },
    { input: { s: 'aa', t: 'aa' }, expected: 'aa', note: 'Dup match' },
    { input: { s: 'bba', t: 'ab' }, expected: 'ba', note: 'At end' },
    { input: { s: 'acbbaca', t: 'aba' }, expected: 'baca', note: 'Complex' },
    { input: { s: 'cabwefgewcwaefgcf', t: 'cae' }, expected: 'cwae', note: 'Mid-string' },
    { input: { s: 'aaaaaab', t: 'ab' }, expected: 'ab', note: 'Late match' },
  ],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 1, maxLen: 5000 } },
  patternExplanation: { pattern: 'Minimum Window Substring', why: 'This is the hardest sliding window pattern. The key is the "have/need" counter system that tracks how many distinct characters are fully satisfied, enabling O(1) validity checks instead of comparing full frequency maps.', related: ['sw4','sw15'] },
  visualDiagram: 's = "A D O B E C O D E B A N C"\n     └─────────────┘           "ADOBEC" len=6\n                     └───────────────┘\n                         └─────────┘\n                             └───┘ "BANC" len=4 ★\nt = "ABC"\nMinimum window containing A,B,C = "BANC"',
  examples: [
    { input: 's="ADOBECODEBANC", t="ABC"', output: '"BANC"', explanation: '"BANC" contains A, B, and C with minimum length' },
    { input: 's="a", t="a"', output: '"a"', explanation: 'Exact match' },
  ],
  constraints: ['1 ≤ s.length, t.length ≤ 10⁵', 's and t consist of uppercase and lowercase English letters'],
},

'sw6': {
  description: 'You are given an array of integers nums. There is a sliding window of size k which moves from left to right. Return the max value in each window position.',
  intuition: 'Use a monotonic decreasing deque. The front of the deque is always the max of the current window. Remove elements from the back if they are smaller than the incoming element (they can never be the max). Remove from front if they\'re outside the window.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n·k)', space: 'O(1)' }, description: 'For each window, scan all k elements to find the max.', pseudocode: 'for i in 0..n-k:\n  result.append(max(nums[i..i+k]))' },
    { name: 'Monotonic Deque (Optimal)', complexity: { time: 'O(n)', space: 'O(k)' }, description: 'Maintain a deque of indices in decreasing order of values. Front is always the current max.', pseudocode: 'deque = []\nfor i in 0..n:\n  while deque and nums[i]>=nums[deque[-1]]: deque.pop()\n  deque.append(i)\n  if deque[0] <= i-k: deque.popleft()\n  if i >= k-1: result.append(nums[deque[0]])' },
  ],
  dryRun: { input: 'nums=[1,3,-1,-3,5,3,6,7], k=3', steps: [
    { step: 1, state: 'i=0, deq=[0]', action: 'Add 1' },
    { step: 2, state: 'i=1, 3>1→pop 0, deq=[1]', action: 'Add 3' },
    { step: 3, state: 'i=2, deq=[1,2]', action: 'Window [1,3,-1], max=3 ✓' },
    { step: 4, state: 'i=3, deq=[1,3]', action: 'Window [3,-1,-3], max=3 ✓' },
    { step: 5, state: 'i=4, 5>-3,5>3→pop, deq=[4]', action: 'Window [-1,-3,5], max=5 ✓' },
    { step: 6, state: 'i=5, deq=[4,5]', action: 'Window [-3,5,3], max=5 ✓' },
    { step: 7, state: 'i=6, 6>3,6>5→pop, deq=[6]', action: 'Window [5,3,6], max=6 ✓' },
    { step: 8, state: 'i=7, 7>6→pop, deq=[7]', action: 'Window [3,6,7], max=7 ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[1], k=1', explanation: 'Single element, window=1 — return [1]' },
    { case: 'nums=[1,2,3,4], k=4', explanation: 'Window is entire array — return [4]' },
    { case: 'nums=[4,3,2,1], k=2', explanation: 'Decreasing — maxes are [4,3,2]' },
    { case: 'nums=[1,1,1,1], k=2', explanation: 'All same — all maxes are 1' },
    { case: 'nums=[-1,-2,-3], k=2', explanation: 'All negative — maxes are [-1,-2]' },
  ],
  visibleTests: [
    { input: { nums: [1,3,-1,-3,5,3,6,7], k: 3 }, expected: [3,3,5,5,6,7], note: 'Classic case' },
    { input: { nums: [1], k: 1 }, expected: [1], note: 'Single element' },
    { input: { nums: [1,2,3,4], k: 4 }, expected: [4], note: 'Full window' },
    { input: { nums: [4,3,2,1], k: 2 }, expected: [4,3,2], note: 'Decreasing' },
    { input: { nums: [1,1,1,1], k: 2 }, expected: [1,1,1], note: 'All same' },
    { input: { nums: [-1,-2,-3], k: 2 }, expected: [-1,-2], note: 'Negatives' },
    { input: { nums: [7,2,4], k: 2 }, expected: [7,4], note: 'Small array' },
    { input: { nums: [1,3,1,2,0,5], k: 3 }, expected: [3,3,2,5], note: 'Mixed' },
    { input: { nums: [9,10,9,-7,-4,-8,2,-6], k: 5 }, expected: [10,10,9,2], note: 'Complex' },
    { input: { nums: [1,2,3], k: 1 }, expected: [1,2,3], note: 'Window size 1' },
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Monotonic Deque', why: 'Monotonic deques maintain elements in sorted order within a sliding window. By discarding elements that can never be useful (smaller values behind larger ones), we achieve O(1) amortized per-element max/min queries.', related: ['st5','q3'] },
  visualDiagram: 'nums = [1, 3, -1, -3, 5, 3, 6, 7], k=3\n\nWindow:  [1,3,-1]   max=3\n         [3,-1,-3]  max=3\n         [-1,-3,5]  max=5\n         [-3,5,3]   max=5\n         [5,3,6]    max=6\n         [3,6,7]    max=7\n\nDeque keeps indices of decreasing values\nFront = always the current window max',
  examples: [
    { input: 'nums=[1,3,-1,-3,5,3,6,7], k=3', output: '[3,3,5,5,6,7]', explanation: 'Max of each window of size 3' },
    { input: 'nums=[1], k=1', output: '[1]', explanation: 'Single element' },
  ],
  constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴', '1 ≤ k ≤ nums.length'],
},

'sw1': {
  description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
  intuition: 'We want to find the maximum difference between two prices, where the smaller price comes before the larger one. We can keep track of the minimum price seen so far and check the profit if we sell at the current price.',
  approaches: [
    { name: 'One Pass (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Track the minimum price seen so far. For each price, calculate profit and update max profit.', pseudocode: 'min_price = inf\nmax_profit = 0\nfor price in prices:\n  if price < min_price: min_price = price\n  elif price - min_price > max_profit: max_profit = price - min_price\nreturn max_profit' }
  ],
  dryRun: { input: 'prices = [7,1,5,3,6,4]', steps: [
    { step: 1, state: 'p=7', action: 'min_price=7, max_profit=0' },
    { step: 2, state: 'p=1', action: '1 < 7 -> min_price=1' },
    { step: 3, state: 'p=5', action: '5-1=4 > 0 -> max_profit=4' },
    { step: 4, state: 'p=3', action: '3-1=2 < 4' },
    { step: 5, state: 'p=6', action: '6-1=5 > 4 -> max_profit=5 ✓' }
  ]},
  edgeCases: [
    { case: 'prices=[7,6,4,3,1]', explanation: 'Decreasing prices, no profit possible. Returns 0.' },
    { case: 'prices=[1]', explanation: 'Single price, no transaction possible.' }
  ],
  visibleTests: [
    { input: { prices: [7,1,5,3,6,4] }, expected: 5, note: 'Classic case' },
    { input: { prices: [7,6,4,3,1] }, expected: 0, note: 'Decreasing' },
    { input: { prices: [2,4,1] }, expected: 2, note: 'Small array' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'State Tracking', why: 'Often viewed as a sliding window where the left edge is the minimum seen so far.', related: ['a6'] },
  visualDiagram: 'Prices: 7 1 5 3 6 4\nmin_p:  7 1 1 1 1 1\nprofit: 0 0 4 2 5 3\nMax profit = 5',
  examples: [
    { input: 'prices=[7,1,5,3,6,4]', output: '5', explanation: 'Buy at 1, sell at 6' }
  ],
  constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4']
},

'sw3': {
  description: 'You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times. Return the length of the longest substring containing the same letter you can get after performing the above operations.',
  intuition: 'Use a sliding window. Track the count of the most frequent character in the current window. If window size - max_count > k, the window is invalid and we must shrink it from the left.',
  approaches: [
    { name: 'Sliding Window', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Expand right, update max frequency. If invalid, shrink left.', pseudocode: 'counts = {}\nmax_f = 0, l = 0, res = 0\nfor r in 0..len(s):\n  counts[s[r]] += 1\n  max_f = max(max_f, counts[s[r]])\n  if (r - l + 1) - max_f > k:\n    counts[s[l]] -= 1\n    l += 1\n  res = max(res, r - l + 1)\nreturn res' }
  ],
  dryRun: { input: 's="AABABBA", k=1', steps: [
    { step: 1, state: 'r=0..2 "AAB"', action: 'max_f=2(A). len-max_f = 3-2 = 1 <= 1' },
    { step: 2, state: 'r=3 "AABA"', action: 'max_f=3(A). len-max_f = 4-3 = 1 <= 1. res=4' },
    { step: 3, state: 'r=4 "AABAB"', action: 'len(5)-max_f(3)=2 > 1 -> l++, window "ABAB"' },
    { step: 4, state: 'continue', action: 'res=4 ✓' }
  ]},
  edgeCases: [
    { case: 'k = 0', explanation: 'Same as longest substring of repeating characters.' },
    { case: 'k >= len(s)', explanation: 'Can change all characters -> return len(s).' }
  ],
  visibleTests: [
    { input: { s: 'ABAB', k: 2 }, expected: 4, note: 'Change both' },
    { input: { s: 'AABABBA', k: 1 }, expected: 4, note: 'Classic case' }
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Sliding Window with Max Frequency', why: 'The condition for valid window depends entirely on the single most frequent element.', related: ['sw2', 'sw5'] },
  visualDiagram: '"AABABBA", k=1\nWindow "AABA" -> 3 As, 1 B. 4-3=1 <= k. Valid.\nWindow "AABAB" -> 3 As, 2 Bs. 5-3=2 > k. Invalid.',
  examples: [
    { input: 's="ABAB", k=2', output: '4', explanation: 'Replace 2 Bs to get AAAA.' }
  ],
  constraints: ['1 <= s.length <= 10^5', '0 <= k <= s.length']
},

'sw4': {
  description: 'Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".',
  intuition: 'Use a sliding window. Expand the right pointer to find a valid window (contains all chars of t). Once valid, shrink the left pointer to make it as small as possible while remaining valid.',
  approaches: [
    { name: 'Sliding Window + Hash Map (Optimal)', complexity: { time: 'O(m+n)', space: 'O(1)' }, description: 'Track required character counts from t. Track current window counts. Maintain a "have" vs "need" counter.', pseudocode: 'need = Counter(t)\nhave, required = 0, len(need)\nres, resLen = [-1, -1], infinity\nl = 0\nfor r in range(len(s)):\n  c = s[r]\n  window[c] += 1\n  if c in need and window[c] == need[c]: have += 1\n  while have == required:\n    if (r - l + 1) < resLen:\n      res = [l, r]\n      resLen = r - l + 1\n    window[s[l]] -= 1\n    if s[l] in need and window[s[l]] < need[s[l]]: have -= 1\n    l += 1\nreturn s[res[0]:res[1]+1] if resLen != infinity else ""' }
  ],
  dryRun: { input: 's="ADOBECODEBANC", t="ABC"', steps: [
    { step: 1, state: 'r expands to "ADOBEC"', action: 'Valid window found. len=6. l=0. Try shrinking l.' },
    { step: 2, state: 'l moves to 1', action: '"DOBEC" is invalid. Missing "A".' },
    { step: 3, state: 'r expands to "CODEBA"', action: 'Valid window "DOBECODEBA". Shrink l.' },
    { step: 4, state: 'r expands to end', action: 'Valid window "BANC", len=4. Best so far.' },
    { step: 5, state: 'Return "BANC"', action: 'Length 4 is optimal ✓' }
  ]},
  edgeCases: [
    { case: 's length < t length', explanation: 'Impossible, return "".' },
    { case: 't has duplicates', explanation: 'Counter correctly handles multiple required occurrences.' }
  ],
  visibleTests: [
    { input: { s: 'ADOBECODEBANC', t: 'ABC' }, expected: 'BANC', note: 'Classic case' },
    { input: { s: 'a', t: 'a' }, expected: 'a', note: 'Same string' },
    { input: { s: 'a', t: 'aa' }, expected: '', note: 'Impossible duplicate requirement' }
  ],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Variable Sliding Window (Shrinking)', why: 'The condition (contains all characters) is monotonic; once met, adding more characters keeps it met. This means we can optimally shrink from the left once a condition is satisfied.', related: ['sw3'] },
  visualDiagram: 's = ADOBECODEBANC, t = ABC\n\n[A D O B E C] O D E B A N C  (Valid, len 6)\n A D O B E [C O D E B A] N C (Valid, len 6)\n A D O B E C O D E [B A N C] (Valid, len 4)\nShortest is BANC.',
  examples: [
    { input: 's="ADOBECODEBANC", t="ABC"', output: '"BANC"', explanation: 'Minimum window containing A, B, C.' }
  ],
  constraints: ['m == s.length', 'n == t.length', '1 <= m, n <= 10^5', 's and t consist of uppercase and lowercase English letters.']
},

'sw7': {
  description: 'You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position. Return the max sliding window.',
  intuition: 'We need to find the maximum in a moving window efficiently. A monotonic decreasing deque can store indices of potential maximums. The front of the deque will always be the maximum for the current window.',
  approaches: [
    { name: 'Monotonic Deque (Optimal)', complexity: { time: 'O(N)', space: 'O(k)' }, description: 'Maintain a deque of indices. Remove indices out of window. Remove indices of smaller elements from the back before adding the current element.', pseudocode: 'q = collections.deque()\nres = []\nfor i, n in enumerate(nums):\n  while q and q[0] < i - k + 1: q.popleft() # out of window\n  while q and nums[q[-1]] < n: q.pop() # smaller elements\n  q.append(i)\n  if i >= k - 1: res.append(nums[q[0]])\nreturn res' }
  ],
  dryRun: { input: 'nums=[1,3,-1,-3,5,3,6,7], k=3', steps: [
    { step: 1, state: 'i=0, n=1', action: 'q=[0] (val=1)' },
    { step: 2, state: 'i=1, n=3', action: '3>1 -> pop 0. q=[1] (val=3)' },
    { step: 3, state: 'i=2, n=-1', action: '-1<3 -> append 2. q=[1,2]. Window full! res=[3]' },
    { step: 4, state: 'i=3, n=-3', action: '-3<-1 -> append 3. q=[1,2,3]. res=[3,3]' },
    { step: 5, state: 'i=4, n=5', action: '5>all -> pop all. q=[4]. res=[3,3,5]' },
    { step: 6, state: 'Continue...', action: 'res=[3,3,5,5,6,7] ✓' }
  ]},
  edgeCases: [
    { case: 'k == 1', explanation: 'Returns the original array.' },
    { case: 'Array strictly decreasing', explanation: 'Deque is always full of size k.' }
  ],
  visibleTests: [
    { input: { nums: [1,3,-1,-3,5,3,6,7], k: 3 }, expected: [3,3,5,5,6,7], note: 'Classic case' },
    { input: { nums: [1], k: 1 }, expected: [1], note: 'Single element' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Fixed Sliding Window + Monotonic Deque', why: 'When you need continuous access to a moving extremum (max/min) in a fixed-size window, a monotonic deque provides O(1) amortized time per element.', related: ['st1'] },
  visualDiagram: 'Window           Max\n[1  3  -1] -3  5  3  6  7    3\n 1 [3  -1  -3] 5  3  6  7    3\n 1  3 [-1  -3  5] 3  6  7    5\n 1  3  -1 [-3  5  3] 6  7    5\n 1  3  -1  -3 [5  3  6] 7    6\n 1  3  -1  -3  5 [3  6  7]   7',
  examples: [
    { input: 'nums=[1,3,-1,-3,5,3,6,7], k=3', output: '[3,3,5,5,6,7]', explanation: 'Max for each window.' }
  ],
  constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', '1 <= k <= nums.length']
}
};


