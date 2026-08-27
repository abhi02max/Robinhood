// Strings — Production Problem Content
export const stringsContent = {
'sr3': {
  description: 'Given a string s, return the longest palindromic substring in s.',
  intuition: 'Every palindrome has a center. Expand around each center (odd and even length) outward while characters match. Track the longest found.',
  approaches: [
    { name: 'Expand Around Center', complexity: { time: 'O(n²)', space: 'O(1)' }, description: 'For each index, expand outward for both odd and even centers.', pseudocode: 'for i in 0..n:\n  odd = expand(s, i, i)\n  even = expand(s, i, i+1)\n  update max' },
  ],
  dryRun: { input: 's="babad"', steps: [
    { step: 1, state: 'center=1 "a"', action: 'Expand: "bab" len=3 ★' },
    { step: 2, state: 'center=2 "b"', action: 'Expand: "aba" len=3' },
    { step: 3, state: 'No expansion > 3', action: 'Result: "bab" ✓' },
  ]},
  edgeCases: [
    { case: 's="a"', explanation: 'Single char is palindrome' },
    { case: 's="ac"', explanation: 'No multi-char palindrome' },
    { case: 's="racecar"', explanation: 'Entire string is palindrome' },
    { case: 's="aaa"', explanation: 'All same — entire string' },
    { case: 's=""', explanation: 'Empty string' },
  ],
  visibleTests: [
    { input: { s: 'babad' }, expected: 'bab', note: 'Or "aba"' },
    { input: { s: 'cbbd' }, expected: 'bb', note: 'Even length' },
    { input: { s: 'a' }, expected: 'a', note: 'Single' },
    { input: { s: 'racecar' }, expected: 'racecar', note: 'Full' },
    { input: { s: 'abcba' }, expected: 'abcba', note: 'Odd full' },
    { input: { s: 'aaa' }, expected: 'aaa', note: 'All same' },
    { input: { s: 'abcd' }, expected: 'a', note: 'No palindrome' },
    { input: { s: 'aa' }, expected: 'aa', note: 'Two same' },
    { input: { s: 'aaaa' }, expected: 'aaaa', note: 'Four same' },
    { input: { s: 'xyzabcbaxyz' }, expected: 'xyzabcbaxyz', note: 'Full palindrome' },
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: 'Expand Around Center', why: 'Palindromes are symmetric around a center. Expanding from each of 2n-1 possible centers gives O(n²). This is simpler than DP and uses O(1) space.', related: ['sr4','sr1'] },
  visualDiagram: 's = "babad"\n\nCenter at "a" (index 1):\n  b [a] b → "bab" ✓ palindrome, len=3\n\nCenter at "b" (index 2):\n  a [b] a → "aba" ✓ palindrome, len=3\n\nLongest = 3 → "bab"',
  examples: [
    { input: 's="babad"', output: '"bab"', explanation: '"bab" or "aba" are valid' },
    { input: 's="cbbd"', output: '"bb"', explanation: 'Even-length palindrome' },
  ],
  constraints: ['1 ≤ s.length ≤ 1000', 's consists of digits and English letters'],
},

'sr18': {
  description: 'Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have three operations: insert, delete, or replace a character.',
  intuition: 'Classic DP: dp[i][j] = min edits to convert word1[0..i-1] to word2[0..j-1]. If chars match, dp[i][j] = dp[i-1][j-1]. Otherwise, take min of insert, delete, replace + 1.',
  approaches: [
    { name: '2D DP', complexity: { time: 'O(m×n)', space: 'O(m×n)' }, description: 'Build a table. dp[i][j] = min operations for first i chars of word1 and first j chars of word2.', pseudocode: 'dp[0][j] = j; dp[i][0] = i\nfor i in 1..m:\n  for j in 1..n:\n    if w1[i-1]==w2[j-1]: dp[i][j]=dp[i-1][j-1]\n    else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])' },
  ],
  dryRun: { input: 'word1="horse", word2="ros"', steps: [
    { step: 1, state: 'dp table: base row [0,1,2,3], base col [0,1,2,3,4,5]', action: 'Initialize' },
    { step: 2, state: 'h vs r: mismatch → 1+min(0,1,1)=1', action: 'Replace h→r' },
    { step: 3, state: 'Fill remaining cells', action: 'dp[5][3] = 3' },
    { step: 4, state: 'Operations: replace h→r, delete r, delete e', action: 'horse → rorse → rose → ros = 3 ✓' },
  ]},
  edgeCases: [
    { case: 'word1="", word2="abc"', explanation: '3 insertions' },
    { case: 'word1="abc", word2=""', explanation: '3 deletions' },
    { case: 'word1="abc", word2="abc"', explanation: '0 operations — already equal' },
    { case: 'word1="a", word2="b"', explanation: '1 replacement' },
    { case: 'word1="", word2=""', explanation: '0 operations' },
  ],
  visibleTests: [
    { input: { word1: 'horse', word2: 'ros' }, expected: 3, note: 'Classic' },
    { input: { word1: 'intention', word2: 'execution' }, expected: 5, note: 'Longer' },
    { input: { word1: '', word2: 'abc' }, expected: 3, note: 'Insert all' },
    { input: { word1: 'abc', word2: '' }, expected: 3, note: 'Delete all' },
    { input: { word1: 'abc', word2: 'abc' }, expected: 0, note: 'Equal' },
    { input: { word1: 'a', word2: 'b' }, expected: 1, note: 'Replace' },
    { input: { word1: '', word2: '' }, expected: 0, note: 'Both empty' },
    { input: { word1: 'kitten', word2: 'sitting' }, expected: 3, note: 'Classic example' },
    { input: { word1: 'sunday', word2: 'saturday' }, expected: 3, note: 'Insert+replace' },
    { input: { word1: 'abcdef', word2: 'azced' }, expected: 3, note: 'Mixed operations' },
  ],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 0, maxLen: 500 } },
  patternExplanation: { pattern: 'Edit Distance DP', why: 'Edit distance is the classic 2D DP problem. Each cell represents a subproblem, and the three operations map to three adjacent cells. This pattern extends to LCS, sequence alignment, and diff algorithms.', related: ['sr24','dp4'] },
  visualDiagram: '    ""  r  o  s\n""   0  1  2  3\nh    1  1  2  3\no    2  2  1  2\nr    3  2  2  2\ns    4  3  3  2\ne    5  4  4  3 ← answer\n\nhorse → rorse (replace h→r)\nrorse → rose (remove r)\nrose → ros (remove e)\nTotal: 3 operations',
  examples: [
    { input: 'word1="horse", word2="ros"', output: '3', explanation: 'Replace h→r, remove r, remove e' },
    { input: 'word1="intention", word2="execution"', output: '5', explanation: '5 operations needed' },
  ],
  constraints: ['0 ≤ word1.length, word2.length ≤ 500', 'Lowercase English letters only'],
},

'sr1': {
  description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
  intuition: 'If the lengths are different, they can\'t be anagrams. Otherwise, count the frequency of characters in both strings. If the frequency counts are identical, they are anagrams.',
  approaches: [
    { name: 'Character Counting (Optimal)', complexity: { time: 'O(n)', space: 'O(1)' }, description: 'Use an array of size 26 to count character frequencies.', pseudocode: 'if len(s) != len(t): return false\ncounts = [0] * 26\nfor i in 0..len(s):\n  counts[s[i]] += 1\n  counts[t[i]] -= 1\nfor c in counts:\n  if c != 0: return false\nreturn true' },
    { name: 'Sorting', complexity: { time: 'O(n log n)', space: 'O(n)' }, description: 'Sort both strings and compare them.', pseudocode: 'return sorted(s) == sorted(t)' }
  ],
  dryRun: { input: 's="anagram", t="nagaram"', steps: [
    { step: 1, state: 'i=0', action: 'counts[a]++, counts[n]--' },
    { step: 2, state: 'i=1', action: 'counts[n]++, counts[a]--' },
    { step: 3, state: 'Finish loop', action: 'All counts cancel out to 0.' },
    { step: 4, state: 'Check counts', action: 'All 0 -> true ✓' }
  ]},
  edgeCases: [
    { case: 'Different lengths', explanation: 'Returns false immediately.' },
    { case: 'Empty strings', explanation: 'Returns true.' }
  ],
  visibleTests: [
    { input: { s: 'anagram', t: 'nagaram' }, expected: true, note: 'Classic' },
    { input: { s: 'rat', t: 'car' }, expected: false, note: 'Different characters' }
  ],
  hiddenTestConfig: { generator: 'twoStrings', constraints: { minLen: 1, maxLen: 50000 } },
  patternExplanation: { pattern: 'Character Frequency Map', why: 'Using an array of size 26 for English letters provides O(1) space counting.', related: ['sr2', 'sw5'] },
  visualDiagram: 's = "anagram" -> {a:3, n:1, g:1, r:1, m:1}\nt = "nagaram" -> {a:3, n:1, g:1, r:1, m:1}\nBoth maps match exactly.',
  examples: [
    { input: 's="anagram", t="nagaram"', output: 'true', explanation: 'Same characters' }
  ],
  constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters.']
},

'sr2': {
  description: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
  intuition: 'Anagrams will always have the same character frequency or the same sorted string. We can use the sorted string (or a character count tuple) as a key in a hash map to group them.',
  approaches: [
    { name: 'Hash Map with Character Counts (Optimal)', complexity: { time: 'O(N * K)', space: 'O(N * K)' }, description: 'Use a tuple of 26 character counts as the hash map key.', pseudocode: 'groups = {}\nfor s in strs:\n  count = [0] * 26\n  for c in s: count[c] += 1\n  key = tuple(count)\n  groups[key].append(s)\nreturn groups.values()' }
  ],
  dryRun: { input: 'strs=["eat","tea","tan","ate","nat","bat"]', steps: [
    { step: 1, state: 's="eat"', action: 'key=(a:1, e:1, t:1), groups[key]=["eat"]' },
    { step: 2, state: 's="tea"', action: 'key=(a:1, e:1, t:1), groups[key]=["eat", "tea"]' },
    { step: 3, state: 's="tan"', action: 'key=(a:1, n:1, t:1), groups[key]=["tan"]' },
    { step: 4, state: 'End', action: 'Return all group lists.' }
  ]},
  edgeCases: [
    { case: 'strs=[""]', explanation: 'Returns [[""]].' },
    { case: 'strs=["a"]', explanation: 'Returns [["a"]].' }
  ],
  visibleTests: [
    { input: { strs: ["eat","tea","tan","ate","nat","bat"] }, expected: [["bat"],["nat","tan"],["ate","eat","tea"]], note: 'Basic' },
    { input: { strs: [""] }, expected: [[""]], note: 'Empty' }
  ],
  hiddenTestConfig: { generator: 'arrayOfString', constraints: { minLen: 1, maxLen: 10000 } },
  patternExplanation: { pattern: 'Grouping by Hashed Features', why: 'When grouping items that share a defining property regardless of order, hashing that normalized property is highly efficient.', related: ['sr1'] },
  visualDiagram: '"eat", "tea", "ate" -> sort to "aet" -> Group 1\n"tan", "nat" -> sort to "ant" -> Group 2\n"bat" -> sort to "abt" -> Group 3',
  examples: [
    { input: 'strs=["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', explanation: 'Grouped by anagrams.' }
  ],
  constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'strs[i] consists of lowercase English letters.']
},

'sr4': {
  description: 'Given a string s, return the longest palindromic substring in s.',
  intuition: 'A palindrome mirrors around its center. There are 2n-1 possible centers (n letters and n-1 spaces between letters). We can expand outwards from each center to find the longest palindrome.',
  approaches: [
    { name: 'Expand Around Center (Optimal)', complexity: { time: 'O(N^2)', space: 'O(1)' }, description: 'For each character (and each pair of characters), expand outwards as long as it forms a palindrome.', pseudocode: 'res = ""\ndef expand(l, r):\n  while l>=0 and r<len(s) and s[l]==s[r]:\n    l-=1; r+=1\n  return s[l+1:r]\nfor i in range(len(s)):\n  odd = expand(i, i)\n  even = expand(i, i+1)\n  if len(odd) > len(res): res = odd\n  if len(even) > len(res): res = even\nreturn res' }
  ],
  dryRun: { input: 's="babad"', steps: [
    { step: 1, state: 'i=0 (\'b\')', action: 'Odd: "b". Even: ""' },
    { step: 2, state: 'i=1 (\'a\')', action: 'Odd: "bab". Even: ""' },
    { step: 3, state: 'i=2 (\'b\')', action: 'Odd: "aba". Even: ""' },
    { step: 4, state: 'i=3 (\'a\')', action: 'Odd: "a". Even: ""' },
    { step: 5, state: 'End', action: 'Max is "bab" (or "aba"). ✓' }
  ]},
  edgeCases: [
    { case: 'All same characters', explanation: 'Correctly expands to the full string.' },
    { case: 'No palindromes > 1 char', explanation: 'Returns the first character.' }
  ],
  visibleTests: [
    { input: { s: "babad" }, expected: "bab", note: 'Odd length palindrome' },
    { input: { s: "cbbd" }, expected: "bb", note: 'Even length palindrome' }
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: 'Expand from Center', why: 'Palindromes are symmetric. Checking symmetry from the center out is more efficient than checking all possible substrings (O(N^3)).', related: ['sr5'] },
  visualDiagram: 'b a b a d\n  ^\nExpand left to b, right to b.\nb a b is a palindrome.',
  examples: [
    { input: 's="babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' }
  ],
  constraints: ['1 <= s.length <= 1000', 's consist of only digits and English letters.']
},

'sr5': {
  description: 'Given a string s, return the number of palindromic substrings in it. A substring is a contiguous sequence of characters within the string.',
  intuition: 'Similar to finding the longest palindrome, we can expand around every possible center. Each time we successfully expand, we found another valid palindromic substring.',
  approaches: [
    { name: 'Expand Around Center (Optimal)', complexity: { time: 'O(N^2)', space: 'O(1)' }, description: 'Count palindromes expanding from each single and double character center.', pseudocode: 'count = 0\ndef expand(l, r):\n  c = 0\n  while l>=0 and r<len(s) and s[l]==s[r]:\n    c+=1; l-=1; r+=1\n  return c\nfor i in range(len(s)):\n  count += expand(i, i)\n  count += expand(i, i+1)\nreturn count' }
  ],
  dryRun: { input: 's="aaa"', steps: [
    { step: 1, state: 'i=0', action: 'odd: "a" (1). even: "aa" (1). total=2' },
    { step: 2, state: 'i=1', action: 'odd: "a", "aaa" (2). even: "aa" (1). total=2+3=5' },
    { step: 3, state: 'i=2', action: 'odd: "a" (1). even: "" (0). total=5+1=6' },
    { step: 4, state: 'End', action: 'Total palindromes: 6 ✓' }
  ]},
  edgeCases: [
    { case: 'Empty string', explanation: 'Loop doesn\'t run, returns 0.' },
    { case: 'All distinct characters', explanation: 'Returns length of string (each char is a palindrome).' }
  ],
  visibleTests: [
    { input: { s: "abc" }, expected: 3, note: 'All single chars' },
    { input: { s: "aaa" }, expected: 6, note: 'Overlapping palindromes' }
  ],
  hiddenTestConfig: { generator: 'stringProblem', constraints: { minLen: 1, maxLen: 1000 } },
  patternExplanation: { pattern: 'Expand from Center (Counting)', why: 'Reuses the exact same logic as Longest Palindromic Substring, but tracks the count of successful expansions instead of the max boundaries.', related: ['sr4'] },
  visualDiagram: 'a a a\nValid substrings: "a" (x3), "aa" (x2), "aaa" (x1). Total = 6.',
  examples: [
    { input: 's="aaa"', output: '6', explanation: 'Six palindromic strings: "a", "a", "a", "aa", "aa", "aaa".' }
  ],
  constraints: ['1 <= s.length <= 1000', 's consists of lowercase English letters.']
}
};


