// Dynamic Programming — Production Problem Content
export const dpContent = {
'dp1': {
  description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  intuition: 'The number of ways to reach step n = ways to reach step n-1 (then take 1 step) + ways to reach step n-2 (then take 2 steps). This is exactly the Fibonacci sequence. Base cases: 1 way to reach step 0 or step 1.',
  approaches: [
    { name: 'Recursion (Naive)', complexity: { time: 'O(2ⁿ)', space: 'O(n)' }, description: 'Recursively compute ways(n) = ways(n-1) + ways(n-2). Exponential due to overlapping subproblems.', pseudocode: 'def climb(n):\n  if n <= 1: return 1\n  return climb(n-1) + climb(n-2)' },
    { name: 'DP Table', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Build bottom-up: dp[i] = dp[i-1] + dp[i-2].', pseudocode: 'dp = [0]*(n+1)\ndp[0] = dp[1] = 1\nfor i in 2..n:\n  dp[i] = dp[i-1] + dp[i-2]\nreturn dp[n]' },
    { name: 'Space-Optimized (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Only need previous two values. Use two variables instead of an array.', pseudocode: 'a, b = 1, 1\nfor i in 2..n:\n  a, b = b, a+b\nreturn b' },
  ],
  dryRun: { input: 'n = 5', steps: [
    { step: 1, state: 'a=1, b=1 (steps 0,1)', action: 'Base cases' },
    { step: 2, state: 'i=2: a=1, b=2', action: 'ways(2) = 1+1 = 2' },
    { step: 3, state: 'i=3: a=2, b=3', action: 'ways(3) = 1+2 = 3' },
    { step: 4, state: 'i=4: a=3, b=5', action: 'ways(4) = 2+3 = 5' },
    { step: 5, state: 'i=5: a=5, b=8', action: 'ways(5) = 3+5 = 8 ✓' },
  ]},
  edgeCases: [
    { case: 'n=0', explanation: '0 steps — 1 way (do nothing)' },
    { case: 'n=1', explanation: '1 step — only 1 way' },
    { case: 'n=2', explanation: '2 ways: (1+1) or (2)' },
    { case: 'n=45', explanation: 'Large n — result is 1,836,311,903 (fits in 32-bit)' },
    { case: 'n=3', explanation: '3 ways: (1+1+1), (1+2), (2+1)' },
  ],
  visibleTests: [
    { input: { n: 2 }, expected: 2, note: '(1+1) or (2)' },
    { input: { n: 3 }, expected: 3, note: '(1+1+1), (1+2), (2+1)' },
    { input: { n: 1 }, expected: 1, note: 'Single step' },
    { input: { n: 5 }, expected: 8, note: 'Fibonacci(6)' },
    { input: { n: 10 }, expected: 89, note: 'Medium' },
    { input: { n: 0 }, expected: 1, note: 'Zero steps' },
    { input: { n: 4 }, expected: 5, note: '5 ways' },
    { input: { n: 20 }, expected: 10946, note: 'Large' },
    { input: { n: 6 }, expected: 13, note: 'Six steps' },
    { input: { n: 7 }, expected: 21, note: 'Seven steps' },
  ],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 0, maxLen: 45 } },
  patternExplanation: { pattern: '1D Dynamic Programming (Fibonacci variant)', why: 'This is the entry point to DP. The recurrence dp[i] = dp[i-1] + dp[i-2] is the Fibonacci pattern. The key insight is that the current state only depends on the two previous states, enabling O(1) space optimization.', related: ['dp2','dp3'] },
  visualDiagram: 'n = 5\n\nStep:  0   1   2   3   4   5\nWays:  1   1   2   3   5   8\n             ↗↗  ↗↗  ↗↗  ↗↗\n       dp[i] = dp[i-1] + dp[i-2]\n\nPaths to step 5:\n1+1+1+1+1, 1+1+1+2, 1+1+2+1, 1+2+1+1,\n2+1+1+1, 1+2+2, 2+1+2, 2+2+1 = 8 ways',
  examples: [
    { input: 'n = 2', output: '2', explanation: '(1+1) and (2)' },
    { input: 'n = 3', output: '3', explanation: '(1+1+1), (1+2), (2+1)' },
  ],
  constraints: ['1 ≤ n ≤ 45'],
},

'dp4': {
  description: 'Given a string s, find the longest palindromic substring in s.',
  intuition: 'Every palindrome has a center. Expand from each center (both odd and even length) outward while characters match. Track the longest expansion found.',
  approaches: [
    { name: 'Brute Force', complexity: { time: 'O(n³)', space: 'O(1)' }, description: 'Check every substring, verify if palindrome.', pseudocode: 'for i in 0..n:\n  for j in i..n:\n    if isPalindrome(s[i..j]):\n      update max' },
    { name: 'Expand Around Center (Optimal)', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'For each index, expand outward for both odd and even length palindromes.', pseudocode: 'for i in 0..n:\n  # odd length\n  l, r = i, i\n  while l>=0 and r<n and s[l]==s[r]: l--; r++\n  update max with s[l+1..r]\n  # even length\n  l, r = i, i+1\n  while l>=0 and r<n and s[l]==s[r]: l--; r++\n  update max with s[l+1..r]' },
    { name: 'DP Table', complexity: { time: 'O(n²)', space: 'O(n²)' }, description: 'dp[i][j] = true if s[i..j] is palindrome. dp[i][j] = s[i]==s[j] && dp[i+1][j-1].', pseudocode: 'dp[i][i] = true\nfor len in 2..n:\n  for i in 0..n-len:\n    j = i+len-1\n    dp[i][j] = s[i]==s[j] && (len==2 || dp[i+1][j-1])' },
  ],
  dryRun: { input: 's = "babad"', steps: [
    { step: 1, state: 'center=0 "b"', action: 'Odd: "b" len=1. Even: "ba" no match' },
    { step: 2, state: 'center=1 "a"', action: 'Odd: expand "bab" len=3 ★. Even: "ab" no' },
    { step: 3, state: 'center=2 "b"', action: 'Odd: expand "aba" len=3. Even: "ba" no' },
    { step: 4, state: 'center=3 "e"', action: 'Odd: "e" len=1. Even: "ed" no' },
    { step: 5, state: 'center=4 "d"', action: 'Odd: "d" len=1. Max = "bab" (or "aba") ✓' },
  ]},
  edgeCases: [
    { case: 's="a"', explanation: 'Single char — itself is the palindrome' },
    { case: 's="ac"', explanation: 'No palindrome > length 1 — return "a"' },
    { case: 's="aa"', explanation: 'Even-length palindrome' },
    { case: 's="aaa"', explanation: 'All same chars — entire string' },
    { case: 's="abacdfgdcaba"', explanation: 'Multiple palindromes — find longest' },
  ],
  visibleTests: [
    { input: { s: 'babad' }, expected: 'bab', note: '"aba" also valid' },
    { input: { s: 'cbbd' }, expected: 'bb', note: 'Even length' },
    { input: { s: 'a' }, expected: 'a', note: 'Single char' },
    { input: { s: 'ac' }, expected: 'a', note: 'No multi-char palindrome' },
    { input: { s: 'aa' }, expected: 'aa', note: 'Two same' },
    { input: { s: 'aaa' }, expected: 'aaa', note: 'All same' },
    { input: { s: 'racecar' }, expected: 'racecar', note: 'Full palindrome' },
    { input: { s: 'abcba' }, expected: 'abcba', note: 'Full odd' },
    { input: { s: 'abcd' }, expected: 'a', note: 'No palindrome' },
    { input: { s: 'aacabdkacaa' }, expected: 'aca', note: 'Mid palindrome' },
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: 'Expand Around Center / Palindrome DP', why: 'Palindromes have a symmetric center. Expanding from each center exploits this symmetry, checking O(n) centers with O(n) expansion each. This is simpler and more space-efficient than the DP table approach for this specific problem.', related: ['dp5'] },
  visualDiagram: 's = "b a b a d"\n\nCenter at index 1 ("a"):\n  Expand: b[a]b → "bab" ✓ (palindrome)\n  Expand: [b a b] → len=3 ★\n  Can\'t expand: index -1\n\nCenter at index 2 ("b"):\n  Expand: a[b]a → "aba" ✓ (palindrome)\n  Expand: [a b a] → len=3\n\nLongest = "bab" (length 3)',
  examples: [
    { input: 's = "babad"', output: '"bab"', explanation: '"bab" is a palindromic substring (also "aba")' },
    { input: 's = "cbbd"', output: '"bb"', explanation: 'Even-length palindrome' },
  ],
  constraints: ['1 ≤ s.length ≤ 1000', 's consists of only digits and English letters'],
},

'dp7': {
  description: 'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. You cannot rob two adjacent houses. Given an integer array nums representing money at each house, return the maximum amount you can rob.',
  intuition: 'At each house, you have two choices: rob it (add its value to the best of two houses ago) or skip it (keep the best from the previous house). dp[i] = max(dp[i-1], dp[i-2] + nums[i]).',
  approaches: [
    { name: 'DP Array', complexity: { time: 'O(n)', space: 'O(n)' }, description: 'Build dp[i] = max(skip=dp[i-1], rob=dp[i-2]+nums[i]).', pseudocode: 'dp[0] = nums[0]\ndp[1] = max(nums[0], nums[1])\nfor i in 2..n:\n  dp[i] = max(dp[i-1], dp[i-2]+nums[i])\nreturn dp[n-1]' },
    { name: 'Space-Optimized (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Only need two previous values.', pseudocode: 'prev2 = 0, prev1 = 0\nfor num in nums:\n  curr = max(prev1, prev2 + num)\n  prev2 = prev1\n  prev1 = curr\nreturn prev1' },
  ],
  dryRun: { input: 'nums = [2,7,9,3,1]', steps: [
    { step: 1, state: 'num=2, prev2=0, prev1=0', action: 'curr=max(0,0+2)=2. prev2=0,prev1=2' },
    { step: 2, state: 'num=7, prev2=0, prev1=2', action: 'curr=max(2,0+7)=7. prev2=2,prev1=7' },
    { step: 3, state: 'num=9, prev2=2, prev1=7', action: 'curr=max(7,2+9)=11. prev2=7,prev1=11' },
    { step: 4, state: 'num=3, prev2=7, prev1=11', action: 'curr=max(11,7+3)=11. prev2=11,prev1=11' },
    { step: 5, state: 'num=1, prev2=11, prev1=11', action: 'curr=max(11,11+1)=12. Answer: 12 ✓' },
  ]},
  edgeCases: [
    { case: 'nums=[0]', explanation: 'Single house with $0 — rob for $0' },
    { case: 'nums=[100]', explanation: 'Single house — rob it' },
    { case: 'nums=[1,2]', explanation: 'Two houses — rob the larger one' },
    { case: 'nums=[2,1,1,2]', explanation: 'Rob first and last: 2+2=4' },
    { case: 'nums=[0,0,0,0]', explanation: 'All empty houses — max is 0' },
  ],
  visibleTests: [
    { input: { nums: [1,2,3,1] }, expected: 4, note: 'Rob house 1 and 3' },
    { input: { nums: [2,7,9,3,1] }, expected: 12, note: 'Rob houses 1,3,5' },
    { input: { nums: [0] }, expected: 0, note: 'Empty house' },
    { input: { nums: [100] }, expected: 100, note: 'Single rich house' },
    { input: { nums: [1,2] }, expected: 2, note: 'Two houses' },
    { input: { nums: [2,1,1,2] }, expected: 4, note: 'First+last' },
    { input: { nums: [1,3,1,3,100] }, expected: 103, note: 'Skip to jackpot' },
    { input: { nums: [5,5,5,5,5] }, expected: 15, note: 'Alternating' },
    { input: { nums: [10,1,1,10] }, expected: 20, note: 'First+last' },
    { input: { nums: [1,2,3,4,5,6] }, expected: 12, note: 'Even indices: 2+4+6' },
  ],
  hiddenTestConfig: { generator: 'dpArray', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: 'Include/Exclude DP', why: 'At each step, you make a binary choice: include this element (and skip previous) or exclude it (and keep previous best). This "take or skip" pattern appears in many DP problems: coin change, knapsack, job scheduling.', related: ['dp1','dp8'] },
  visualDiagram: 'nums = [2, 7, 9, 3, 1]\n\nHouse:  0  1  2  3  4\nMoney:  2  7  9  3  1\n\nChoices at each house:\n  Rob 0:  2\n  Rob 1:  7          (skip 0)\n  Rob 2:  2+9=11     (skip 1, rob 0+2)\n  Rob 3:  max(11, 7+3)=11  (skip 3)\n  Rob 4:  max(11, 11+1)=12 (rob 2+4) ★\n\nOptimal: rob houses 0, 2, 4 → 2+9+1 = 12',
  examples: [
    { input: 'nums = [1,2,3,1]', output: '4', explanation: 'Rob house 1 ($1) + house 3 ($3) = $4' },
    { input: 'nums = [2,7,9,3,1]', output: '12', explanation: 'Rob house 1 ($2) + house 3 ($9) + house 5 ($1) = $12' },
  ],
  constraints: ['1 ≤ nums.length ≤ 100', '0 ≤ nums[i] ≤ 400'],
},

'dp2': {
  description: 'You are given an integer array coins and an amount. Return the fewest number of coins needed to make up that amount. If impossible, return -1.',
  intuition: 'dp[i] = min coins to make amount i. For each coin, dp[i] = min(dp[i], dp[i-coin]+1). Base case: dp[0]=0.',
  approaches: [{ name: 'Bottom-Up DP', complexity: { time: 'O(amount×n)', space: 'O(amount)' }, description: 'Build table from 0 to amount.', pseudocode: 'dp = [inf]*(amount+1)\ndp[0] = 0\nfor i in 1..amount:\n  for coin in coins:\n    if coin<=i: dp[i] = min(dp[i], dp[i-coin]+1)\nreturn dp[amount] if dp[amount]!=inf else -1' }],
  dryRun: { input: 'coins=[1,5,10], amount=11', steps: [{ step: 1, state: 'dp[0]=0', action: 'Base' }, { step: 2, state: 'dp[1]=1, dp[5]=1, dp[10]=1', action: 'Single coins' }, { step: 3, state: 'dp[11]=min(dp[10]+1, dp[6]+1)=2', action: '10+1=11 → 2 coins ✓' }] },
  edgeCases: [{ case: 'amount=0', explanation: '0 coins needed' }, { case: 'coins=[2], amount=3', explanation: 'Impossible → -1' }, { case: 'coins=[1], amount=10000', explanation: '10000 coins' }, { case: 'coins=[1,2,5], amount=11', explanation: '5+5+1=3 coins' }, { case: 'coins=[3,7], amount=1', explanation: 'Impossible' }],
  visibleTests: [{ input: { coins: [1,5,11], amount: 11 }, expected: 1, note: 'Exact coin' }, { input: { coins: [2], amount: 3 }, expected: -1, note: 'Impossible' }, { input: { coins: [1], amount: 0 }, expected: 0, note: 'Zero amount' }, { input: { coins: [1,2,5], amount: 11 }, expected: 3, note: '5+5+1' }, { input: { coins: [1], amount: 1 }, expected: 1, note: 'Single' }, { input: { coins: [1], amount: 2 }, expected: 2, note: 'Two ones' }, { input: { coins: [2,5,10,1], amount: 27 }, expected: 4, note: '10+10+5+2' }, { input: { coins: [186,419,83,408], amount: 6249 }, expected: 20, note: 'Large' }, { input: { coins: [3,7,405,436], amount: 8839 }, expected: 25, note: 'Complex' }, { input: { coins: [2], amount: 1 }, expected: -1, note: 'Odd impossible' }],
  hiddenTestConfig: { generator: 'dpArray', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Unbounded Knapsack DP', why: 'Each coin can be used unlimited times. dp[i] tries each coin and takes the min. This is the unbounded knapsack pattern — each item can be picked multiple times.', related: ['dp1','dp7','rc9'] },
  visualDiagram: 'coins=[1,5,11], amount=11\n\nAmount: 0  1  2  3  4  5  6  7  8  9  10  11\ndp:     0  1  2  3  4  1  2  3  4  5   2   1\n                          ↑5              ↑11',
  examples: [{ input: 'coins=[1,5,11], amount=11', output: '1', explanation: 'Single 11-coin' }],
  constraints: ['1 ≤ coins.length ≤ 12', '1 ≤ coins[i] ≤ 2³¹-1', '0 ≤ amount ≤ 10⁴'],
},

'dp3': {
  description: 'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.',
  intuition: 'If characters match, extend the LCS from both strings minus last char. If not, take the max of removing last char from either string. dp[i][j] = LCS of text1[0..i-1] and text2[0..j-1].',
  approaches: [{ name: '2D DP', complexity: { time: 'O(m×n)', space: 'O(m×n)' }, description: 'Build table. If chars match, dp[i][j]=dp[i-1][j-1]+1. Else max(dp[i-1][j], dp[i][j-1]).', pseudocode: 'for i in 1..m:\n  for j in 1..n:\n    if t1[i-1]==t2[j-1]: dp[i][j]=dp[i-1][j-1]+1\n    else: dp[i][j]=max(dp[i-1][j], dp[i][j-1])' }],
  dryRun: { input: 'text1="abcde", text2="ace"', steps: [{ step: 1, state: 'a==a → dp[1][1]=1', action: 'Match a' }, { step: 2, state: 'c==c → dp[3][2]=2', action: 'Match c' }, { step: 3, state: 'e==e → dp[5][3]=3', action: 'Match e. LCS="ace" len=3 ✓' }] },
  edgeCases: [{ case: 'text1="", text2="abc"', explanation: '0 — empty string' }, { case: 'text1="abc", text2="abc"', explanation: '3 — identical' }, { case: 'text1="abc", text2="def"', explanation: '0 — no common chars' }, { case: 'text1="a", text2="a"', explanation: '1 — single match' }, { case: 'text1="abcba", text2="abcbcba"', explanation: '5 — "abcba"' }],
  visibleTests: [{ input: { text1: 'abcde', text2: 'ace' }, expected: 3, note: '"ace"' }, { input: { text1: 'abc', text2: 'abc' }, expected: 3, note: 'Identical' }, { input: { text1: 'abc', text2: 'def' }, expected: 0, note: 'No match' }, { input: { text1: '', text2: 'abc' }, expected: 0, note: 'Empty' }, { input: { text1: 'a', text2: 'a' }, expected: 1, note: 'Single' }, { input: { text1: 'abcba', text2: 'abcbcba' }, expected: 5, note: 'Long LCS' }, { input: { text1: 'bsbininm', text2: 'jmjkbkjkv' }, expected: 1, note: 'Short LCS' }, { input: { text1: 'oxcpqrsvwf', text2: 'shmtulqrypy' }, expected: 2, note: 'Medium' }, { input: { text1: 'hofubmnylkra', text2: 'pqhgxgdofcvmr' }, expected: 5, note: 'Complex' }, { input: { text1: 'ab', text2: 'ba' }, expected: 1, note: 'Crossed' }],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 0, maxLen: 1000 } },
  patternExplanation: { pattern: '2D Subsequence DP', why: 'LCS is the foundational 2D DP problem. The two dimensions represent prefixes of each string. This pattern directly extends to edit distance, shortest common supersequence, and diff algorithms.', related: ['sr18','dp4'] },
  visualDiagram: '    "" a c e\n""   0 0 0 0\na    0 1 1 1\nb    0 1 1 1\nc    0 1 2 2\nd    0 1 2 2\ne    0 1 2 3 ← LCS length = 3\n\nLCS = "ace"',
  examples: [{ input: 'text1="abcde", text2="ace"', output: '3', explanation: 'LCS is "ace"' }],
  constraints: ['1 ≤ text1.length, text2.length ≤ 1000', 'Lowercase English letters only'],
},

'dp5': {
  description: 'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.',
  intuition: 'dp[i] = true if s[0..i-1] can be segmented. For each position, check all words: if dp[i-len(word)] is true and s[i-len..i] matches word, then dp[i] = true.',
  approaches: [{ name: 'Bottom-Up DP', complexity: { time: 'O(n²×m)', space: 'O(n)' }, description: 'dp[i] checks if any word ends at position i with a valid prefix.', pseudocode: 'dp = [false]*(n+1)\ndp[0] = true\nfor i in 1..n:\n  for word in wordDict:\n    if i>=len(word) and dp[i-len(word)]:\n      if s[i-len(word):i]==word: dp[i]=true' }],
  dryRun: { input: 's="leetcode", wordDict=["leet","code"]', steps: [{ step: 1, state: 'dp[0]=true', action: 'Base' }, { step: 2, state: 'i=4: "leet" matches, dp[0]=true', action: 'dp[4]=true' }, { step: 3, state: 'i=8: "code" matches, dp[4]=true', action: 'dp[8]=true ✓' }] },
  edgeCases: [{ case: 's="a", dict=["a"]', explanation: 'Exact match → true' }, { case: 's="ab", dict=["a"]', explanation: '"b" not in dict → false' }, { case: 's="aaaa", dict=["a","aa"]', explanation: 'Multiple ways → true' }, { case: 's="catsandog", dict=["cats","dog","sand","and","cat"]', explanation: 'No valid segmentation → false' }, { case: 's="", dict=["a"]', explanation: 'Empty string → true' }],
  visibleTests: [{ input: { s: 'leetcode', wordDict: ['leet','code'] }, expected: true, note: 'Classic' }, { input: { s: 'applepenapple', wordDict: ['apple','pen'] }, expected: true, note: 'Reuse' }, { input: { s: 'catsandog', wordDict: ['cats','dog','sand','and','cat'] }, expected: false, note: 'No valid split' }, { input: { s: 'a', wordDict: ['a'] }, expected: true, note: 'Exact' }, { input: { s: 'ab', wordDict: ['a'] }, expected: false, note: 'Partial' }, { input: { s: 'aaaa', wordDict: ['a','aa'] }, expected: true, note: 'Multiple' }, { input: { s: 'cars', wordDict: ['car','ca','rs'] }, expected: true, note: 'Overlap' }, { input: { s: 'abcd', wordDict: ['a','abc','b','cd'] }, expected: true, note: 'a+b+cd' }, { input: { s: 'bb', wordDict: ['a','b','bbb','bbbb'] }, expected: true, note: 'b+b' }, { input: { s: 'goalspecial', wordDict: ['go','goal','goals','special'] }, expected: true, note: 'Greedy fails' }],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 300 } },
  patternExplanation: { pattern: 'String Segmentation DP', why: 'Each position in the string is a potential cut point. DP checks if we can reach position i from any valid earlier position using a dictionary word. This avoids exponential backtracking.', related: ['bt7','sr24'] },
  visualDiagram: 's = "leetcode"  dict = ["leet","code"]\n\nPosition: 0  1  2  3  4  5  6  7  8\n           l  e  e  t  c  o  d  e\ndp:       T  F  F  F  T  F  F  F  T\n                       ↑leet      ↑code',
  examples: [{ input: 's="leetcode", wordDict=["leet","code"]', output: 'true', explanation: '"leet" + "code"' }],
  constraints: ['1 ≤ s.length ≤ 300', '1 ≤ wordDict.length ≤ 1000', '1 ≤ wordDict[i].length ≤ 20'],
},

'dp8': {
  description: 'There is a robot on an m x n grid. The robot starts at top-left and can only move right or down. How many unique paths are there to reach the bottom-right corner?',
  intuition: 'dp[i][j] = paths to reach (i,j) = dp[i-1][j] + dp[i][j-1]. First row and first column are all 1s (only one way to reach them).',
  approaches: [{ name: '2D DP', complexity: { time: 'O(m×n)', space: 'O(m×n)' }, description: 'Fill grid. Each cell = sum of top + left.', pseudocode: 'dp[0][j] = dp[i][0] = 1\nfor i in 1..m:\n  for j in 1..n:\n    dp[i][j] = dp[i-1][j] + dp[i][j-1]' }, { name: '1D DP', complexity: { time: 'O(m×n)', space: 'O(n)' }, description: 'Single row, update in-place.', pseudocode: 'dp = [1]*n\nfor i in 1..m:\n  for j in 1..n:\n    dp[j] += dp[j-1]' }],
  dryRun: { input: 'm=3, n=3', steps: [{ step: 1, state: 'Row 0: [1,1,1]', action: 'Only right moves' }, { step: 2, state: 'Row 1: [1,2,3]', action: 'dp[1][1]=1+1=2, dp[1][2]=1+2=3' }, { step: 3, state: 'Row 2: [1,3,6]', action: 'dp[2][2]=3+3=6 ✓' }] },
  edgeCases: [{ case: 'm=1, n=1', explanation: 'Already at target → 1 path' }, { case: 'm=1, n=n', explanation: 'Single row → 1 path (all right)' }, { case: 'm=m, n=1', explanation: 'Single column → 1 path (all down)' }, { case: 'm=100, n=100', explanation: 'Very large — use DP not recursion' }, { case: 'm=2, n=2', explanation: '2 paths: right-down or down-right' }],
  visibleTests: [{ input: { m: 3, n: 7 }, expected: 28, note: 'Classic' }, { input: { m: 3, n: 2 }, expected: 3, note: 'Small' }, { input: { m: 1, n: 1 }, expected: 1, note: 'Single cell' }, { input: { m: 1, n: 5 }, expected: 1, note: 'Single row' }, { input: { m: 5, n: 1 }, expected: 1, note: 'Single col' }, { input: { m: 2, n: 2 }, expected: 2, note: '2 paths' }, { input: { m: 3, n: 3 }, expected: 6, note: '6 paths' }, { input: { m: 4, n: 4 }, expected: 20, note: '20 paths' }, { input: { m: 10, n: 10 }, expected: 48620, note: 'Large' }, { input: { m: 2, n: 3 }, expected: 3, note: 'Rectangle' }],
  hiddenTestConfig: { generator: 'generic', constraints: { minLen: 1, maxLen: 100 } },
  patternExplanation: { pattern: 'Grid Path DP', why: 'Each cell\'s path count depends only on the cell above and to the left. This grid DP pattern extends to obstacles, minimum path sum, and multi-dimensional pathfinding.', related: ['dp7','bt11'] },
  visualDiagram: 'm=3, n=3\n\n1 → 1 → 1\n↓    ↓    ↓\n1 → 2 → 3\n↓    ↓    ↓\n1 → 3 → 6 ★\n\nEach cell = top + left\nAnswer: 6 unique paths',
  examples: [{ input: 'm=3, n=7', output: '28', explanation: 'C(8,2) = 28 paths' }],
  constraints: ['1 ≤ m, n ≤ 100'],
},

'dp10': {
  description: 'Given weights and values of n items, put these items in a knapsack of capacity W to get the maximum total value. Each item can only be used once.',
  intuition: 'dp[i][w] = max value using first i items with capacity w. For each item: either include it (if it fits) or exclude it. dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i]).',
  approaches: [{ name: '2D DP', complexity: { time: 'O(n×W)', space: 'O(n×W)' }, description: 'Build table. Each cell = max of including or excluding current item.', pseudocode: 'for i in 1..n:\n  for w in 0..W:\n    dp[i][w] = dp[i-1][w]\n    if wt[i-1]<=w:\n      dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i-1]]+val[i-1])' }, { name: '1D DP', complexity: { time: 'O(n×W)', space: 'O(W)' }, description: 'Iterate weights backwards to avoid reusing items.', pseudocode: 'for i in 0..n:\n  for w in W..wt[i] (backwards):\n    dp[w] = max(dp[w], dp[w-wt[i]]+val[i])' }],
  dryRun: { input: 'W=7, weights=[1,3,4,5], values=[1,4,5,7]', steps: [{ step: 1, state: 'Item 0 (w=1,v=1)', action: 'Fill capacities 1-7 with value 1' }, { step: 2, state: 'Item 1 (w=3,v=4)', action: 'Cap 3: max(1,4)=4, Cap 4: max(1,4+1)=5' }, { step: 3, state: 'Continue...', action: 'Cap 7: max val = 9 (items 1+2: 4+5) ✓' }] },
  edgeCases: [{ case: 'W=0', explanation: 'No capacity → value 0' }, { case: 'All items too heavy', explanation: 'None fit → value 0' }, { case: 'Single item fits', explanation: 'Take it' }, { case: 'All items fit', explanation: 'Take all' }, { case: 'W very large', explanation: 'Take all items' }],
  visibleTests: [{ input: { W: 7, weights: [1,3,4,5], values: [1,4,5,7] }, expected: 9, note: 'Items 1+2' }, { input: { W: 0, weights: [1], values: [1] }, expected: 0, note: 'No capacity' }, { input: { W: 10, weights: [1,2,3], values: [10,20,30] }, expected: 60, note: 'All fit' }, { input: { W: 5, weights: [10], values: [100] }, expected: 0, note: 'Too heavy' }, { input: { W: 50, weights: [10,20,30], values: [60,100,120] }, expected: 220, note: 'Classic' }, { input: { W: 4, weights: [1,1,1,1], values: [1,2,3,4] }, expected: 10, note: 'All fit' }, { input: { W: 3, weights: [2,2], values: [3,3] }, expected: 3, note: 'Only one fits' }, { input: { W: 6, weights: [1,2,3,5], values: [1,5,8,9] }, expected: 13, note: '2+3→5+8=13' }, { input: { W: 1, weights: [1], values: [1] }, expected: 1, note: 'Exact fit' }, { input: { W: 100, weights: [50,50,50], values: [10,20,30] }, expected: 50, note: 'Two of three fit' }],
  hiddenTestConfig: { generator: 'dpArray', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: '0/1 Knapsack', why: 'The classic DP pattern: for each item, include or exclude. The 1D optimization iterates capacity backwards to prevent reusing items. This pattern is the basis for subset sum, partition, and target sum problems.', related: ['dp2','dp7','bt15'] },
  visualDiagram: 'W=7, items: (w=1,v=1)(w=3,v=4)(w=4,v=5)(w=5,v=7)\n\n     0  1  2  3  4  5  6  7\n  0: 0  0  0  0  0  0  0  0\n  1: 0  1  1  1  1  1  1  1\n  2: 0  1  1  4  5  5  5  5\n  3: 0  1  1  4  5  6  6  9 ★\n  4: 0  1  1  4  5  7  8  9',
  examples: [{ input: 'W=7, weights=[1,3,4,5], values=[1,4,5,7]', output: '9', explanation: 'Items with weights 3+4=7, values 4+5=9' }],
  constraints: ['1 ≤ n ≤ 1000', '1 ≤ W ≤ 1000', '1 ≤ weights[i], values[i] ≤ 1000'],
},

'dp6': {
  description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
  intuition: 'Kadane\'s Algorithm: The maximum subarray ending at index i is either just nums[i], or nums[i] + the maximum subarray ending at i-1. Track the max seen so far.',
  approaches: [
    { name: 'Kadane\'s Algorithm (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Keep track of current sum and max sum. If current sum drops below 0, reset it.', pseudocode: 'max_sum = cur_sum = nums[0]\nfor i in 1..n-1:\n  cur_sum = max(nums[i], cur_sum + nums[i])\n  max_sum = max(max_sum, cur_sum)\nreturn max_sum' }
  ],
  dryRun: { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', steps: [
    { step: 1, state: 'i=0, num=-2', action: 'cur=-2, max=-2' },
    { step: 2, state: 'i=1, num=1', action: 'cur=max(1, -2+1)=1, max=1' },
    { step: 3, state: 'i=2, num=-3', action: 'cur=max(-3, 1-3)=-2, max=1' },
    { step: 4, state: 'i=3, num=4', action: 'cur=max(4, -2+4)=4, max=4' },
    { step: 5, state: 'i=4..6', action: 'cur=6, max=6 (subarray [4,-1,2,1]) ✓' }
  ]},
  edgeCases: [
    { case: 'All negative numbers', explanation: 'Returns the largest negative number (closest to 0).' },
    { case: 'Single element', explanation: 'Returns that element.' }
  ],
  visibleTests: [
    { input: { nums: [-2,1,-3,4,-1,2,1,-5,4] }, expected: 6, note: 'Classic case' },
    { input: { nums: [1] }, expected: 1, note: 'Single' },
    { input: { nums: [5,4,-1,7,8] }, expected: 23, note: 'All positive mostly' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 100000 } },
  patternExplanation: { pattern: 'Kadane\'s / 1D DP', why: 'Classic example of 1D DP optimized to O(1) space since state depends only on the previous element.', related: ['a12'] },
  visualDiagram: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]\n            [----------]\n             Sum = 6',
  examples: [
    { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: '[4,-1,2,1] has the largest sum = 6.' }
  ],
  constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4']
},

'dp9': {
  description: 'Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have the following three operations permitted on a word: Insert a character, Delete a character, Replace a character.',
  intuition: 'Use 2D DP. dp[i][j] represents the min operations to convert word1[0..i] to word2[0..j]. If characters match, no operation needed. Otherwise, take the min of insert, delete, or replace plus 1.',
  approaches: [
    { name: '2D DP', complexity: { time: 'O(m*n)', space: 'O(m*n)' }, description: 'Build a DP table from bottom up.', pseudocode: 'dp = [[0]*(n+1) for _ in range(m+1)]\nfor i in 0..m: dp[i][0] = i\nfor j in 0..n: dp[0][j] = j\nfor i in 1..m:\n  for j in 1..n:\n    if word1[i-1] == word2[j-1]: dp[i][j] = dp[i-1][j-1]\n    else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\nreturn dp[m][n]' }
  ],
  dryRun: { input: 'word1="horse", word2="ros"', steps: [
    { step: 1, state: 'Initialization', action: 'Set first row and col to 0,1,2...' },
    { step: 2, state: 'h!=r', action: 'dp[1][1] = 1 + min(1,1,0) = 1' },
    { step: 3, state: 'continue', action: 'Result in dp[5][3] = 3' }
  ]},
  edgeCases: [
    { case: 'One string is empty', explanation: 'Cost is the length of the other string (all insertions or deletions).' },
    { case: 'Strings are identical', explanation: 'Cost is 0.' }
  ],
  visibleTests: [
    { input: { word1: "horse", word2: "ros" }, expected: 3, note: 'horse -> rorse -> rose -> ros' },
    { input: { word1: "intention", word2: "execution" }, expected: 5, note: 'Longer words' }
  ],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 0, maxLen: 500 } },
  patternExplanation: { pattern: '2D DP (String alignment)', why: 'Standard 2D DP for comparing prefixes of two sequences.', related: ['dp3'] },
  visualDiagram: '    ∅ r o s\n  ∅ 0 1 2 3\n  h 1 1 2 3\n  o 2 2 1 2\n  r 3 2 2 2\n  s 4 3 3 2\n  e 5 4 4 3',
  examples: [
    { input: 'word1="horse", word2="ros"', output: '3', explanation: 'replace h with r, delete r, delete e' }
  ],
  constraints: ['0 <= word1.length, word2.length <= 500']
},

'dp11': {
  description: 'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.',
  intuition: 'We can use dynamic programming. Let dp[i] be true if s[0..i-1] can be segmented. To find if dp[i] is true, we check if there exists a j < i such that dp[j] is true and s[j..i-1] is in wordDict.',
  approaches: [
    { name: '1D Dynamic Programming (Optimal)', complexity: { time: 'O(n^2 * m)', space: 'O(n)' }, description: 'dp[i] represents if s[:i] can be broken into words. m is max word length.', pseudocode: 'dp = [false] * (len(s) + 1)\ndp[0] = true\nfor i in 1..len(s):\n  for w in wordDict:\n    if i >= len(w) and dp[i-len(w)] and s[i-len(w):i] == w:\n      dp[i] = true; break\nreturn dp[len(s)]' }
  ],
  dryRun: { input: 's="leetcode", wordDict=["leet","code"]', steps: [
    { step: 1, state: 'dp[0]=T', action: 'Initialize' },
    { step: 2, state: 'i=1..3', action: 'No word matches "l", "le", "lee". dp remains false.' },
    { step: 3, state: 'i=4', action: '"leet" matches, dp[4-4]=dp[0]=T -> dp[4]=T' },
    { step: 4, state: 'i=5..7', action: 'No match' },
    { step: 5, state: 'i=8', action: '"code" matches ending at 8. dp[8-4]=dp[4]=T -> dp[8]=T' },
    { step: 6, state: 'Return dp[8] = T', action: 'Success ✓' }
  ]},
  edgeCases: [
    { case: 'Single word matching', explanation: 'Returns true.' },
    { case: 'No match possible', explanation: 'Returns false.' }
  ],
  visibleTests: [
    { input: { s: "leetcode", wordDict: ["leet","code"] }, expected: true, note: 'Classic case' },
    { input: { s: "catsandog", wordDict: ["cats","dog","sand","and","cat"] }, expected: false, note: 'Overlapping words, no valid segmentation' }
  ],
  hiddenTestConfig: { generator: 'wordBreak', constraints: { minLen: 1, maxLen: 300 } },
  patternExplanation: { pattern: '1D DP on Strings', why: 'Often problems asking if a string can be constructed from substrings use 1D DP where dp[i] is the status up to index i.', related: ['dp1'] },
  visualDiagram: 's = l e e t c o d e\ni = 0 1 2 3 4 5 6 7 8\ndp= T F F F T F F F T\n            ↑       ↑\n         "leet"   "code"',
  examples: [
    { input: 's="leetcode", wordDict=["leet","code"]', output: 'true', explanation: 'Return true because "leetcode" can be segmented as "leet code".' }
  ],
  constraints: ['1 <= s.length <= 300', '1 <= wordDict.length <= 1000', '1 <= wordDict[i].length <= 20', 's and wordDict[i] consist of only lowercase English letters.']
},

'dp12': {
  description: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
  intuition: 'Let dp[i] be the length of the LIS ending at index i. For each element i, we look back at all previous elements j. If nums[i] > nums[j], we can append nums[i] to the LIS ending at j. So, dp[i] = max(dp[i], dp[j] + 1).',
  approaches: [
    { name: '1D DP', complexity: { time: 'O(n^2)', space: 'O(n)' }, description: 'Compute LIS ending at each index.', pseudocode: 'dp = [1] * len(nums)\nfor i in 1..n:\n  for j in 0..i-1:\n    if nums[i] > nums[j]:\n      dp[i] = max(dp[i], dp[j] + 1)\nreturn max(dp)' },
    { name: 'Binary Search (Optimal)', complexity: { time: 'O(n log n)', space: 'O(n)' }, description: 'Maintain an array "sub" of the smallest ending elements for subsequences of each length.', pseudocode: 'sub = []\nfor x in nums:\n  idx = binary_search(sub, x)\n  if idx == len(sub): sub.append(x)\n  else: sub[idx] = x\nreturn len(sub)' }
  ],
  dryRun: { input: 'nums=[10,9,2,5,3,7,101,18]', steps: [
    { step: 1, state: 'x=10', action: 'sub=[10]' },
    { step: 2, state: 'x=9', action: 'Replace 10 -> sub=[9]' },
    { step: 3, state: 'x=2', action: 'Replace 9 -> sub=[2]' },
    { step: 4, state: 'x=5', action: 'Append -> sub=[2,5]' },
    { step: 5, state: 'x=3', action: 'Replace 5 -> sub=[2,3]' },
    { step: 6, state: 'x=7,101', action: 'Append -> sub=[2,3,7,101]' },
    { step: 7, state: 'x=18', action: 'Replace 101 -> sub=[2,3,7,18]. Length is 4 ✓' }
  ]},
  edgeCases: [
    { case: 'Already sorted', explanation: 'Result is array length.' },
    { case: 'Reverse sorted', explanation: 'Result is 1.' }
  ],
  visibleTests: [
    { input: { nums: [10,9,2,5,3,7,101,18] }, expected: 4, note: 'Classic case' },
    { input: { nums: [7,7,7,7,7,7,7] }, expected: 1, note: 'All same elements' }
  ],
  hiddenTestConfig: { generator: 'genericArray', constraints: { minLen: 1, maxLen: 2500 } },
  patternExplanation: { pattern: 'Subsequence DP / Patience Sorting', why: 'The O(n log n) solution uses binary search to build a simulated subsequence array. It doesn\'t store the actual LIS, but stores the optimal ending values for an LIS of length k.', related: ['dp6'] },
  visualDiagram: 'nums: 10, 9, 2, 5, 3, 7, 101, 18\nDP:    1  1  1  2  2  3   4   4\nSub:  [2, 3, 7, 18] -> len = 4',
  examples: [
    { input: 'nums=[10,9,2,5,3,7,101,18]', output: '4', explanation: 'The longest increasing subsequence is [2,3,7,101], therefore the length is 4.' }
  ],
  constraints: ['1 <= nums.length <= 2500', '-10^4 <= nums[i] <= 10^4']
}
};


