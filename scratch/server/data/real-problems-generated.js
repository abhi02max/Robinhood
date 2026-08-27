export const PROBLEMS = [
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Easy",
    "title": "Two Sum",
    "slug": "two-sum",
    "leetcode_link": "https://leetcode.com/problems/two-sum",
    "description": "Given an array of integers nums&nbsp;and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\n\nExample 2:\n\n\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n\n\nExample 3:\n\n\nInput: nums = [3,3], target = 6\nOutput: [0,1]\n\n\n&nbsp;\nConstraints:\n\n\n\t2 &lt;= nums.length &lt;= 104\n\t-109 &lt;= nums[i] &lt;= 109\n\t-109 &lt;= target &lt;= 109\n\tOnly one valid answer exists.\n\n\n&nbsp;\nFollow-up:&nbsp;Can you come up with an algorithm that is less than O(n2)&nbsp;time complexity?...",
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        "input": "nums = [3,2,4], target = 6",
        "output": "[1,2]",
        "explanation": ""
      },
      {
        "input": "nums = [3,3], target = 6",
        "output": "[0,1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def twoSum(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int[] TwoSum(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "twoSum",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "vector<int>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            2,
            7,
            11,
            15
          ],
          "target": 9
        },
        "expected": [
          0,
          1
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            3,
            2,
            4
          ],
          "target": 6
        },
        "expected": [
          1,
          2
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            3,
            3
          ],
          "target": 6
        },
        "expected": [
          0,
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Medium",
    "title": "Longest Substring Without Repeating Characters",
    "slug": "longest-substring-without-repeating-characters",
    "leetcode_link": "https://leetcode.com/problems/longest-substring-without-repeating-characters",
    "description": "Given a string s, find the length of the longest substring without duplicate characters.\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;abcabcbb&quot;\nOutput: 3\nExplanation: The answer is &quot;abc&quot;, with the length of 3. Note that &quot;bca&quot; and &quot;cab&quot; are also correct answers.\n\n\nExample 2:\n\n\nInput: s = &quot;bbbbb&quot;\nOutput: 1\nExplanation: The answer is &quot;b&quot;, with the length of 1.\n\n\nExample 3:\n\n\nInput: s = &quot;pwwkew&quot;\nOutput: 3\nExplanation: The answer is &quot;wke&quot;, with the length of 3.\nNotice that the answer must be a substring, &quot;pwke&quot; is a subsequence and not a substring.\n\n\n&nbsp;\nConstraints:\n\n\n\t0 &lt;= s.length &lt;= 5 * 104\n\ts consists of English letters, digits, symbols and spaces.\n\n...",
    "examples": [
      {
        "input": "s = &quot;abcabcbb&quot;",
        "output": "3",
        "explanation": "The answer is &quot;abc&quot;, with the length of 3. Note that"
      },
      {
        "input": "s = &quot;bbbbb&quot;",
        "output": "1",
        "explanation": "The answer is &quot;b&quot;, with the length of 1."
      },
      {
        "input": "s = &quot;pwwkew&quot;",
        "output": "3",
        "explanation": "The answer is &quot;wke&quot;, with the length of 3.\nNotice that the answer must be a substring, &quot;pwke&quot; is a subsequence and not a substring."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def lengthOfLongestSubstring(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
      "c": "int lengthOfLongestSubstring(char* s) {\n    \n}",
      "csharp": "public class Solution {\n    public int LengthOfLongestSubstring(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "lengthOfLongestSubstring",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "3",
        "hidden": false
      },
      {
        "input": {},
        "expected": "1",
        "hidden": false
      },
      {
        "input": {},
        "expected": "3",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Medium",
    "title": "Integer to Roman",
    "slug": "integer-to-roman",
    "leetcode_link": "https://leetcode.com/problems/integer-to-roman",
    "description": "Seven different symbols represent Roman numerals with the following values:\n\n\n\t\n\t\t\n\t\t\tSymbol\n\t\t\tValue\n\t\t\n\t\n\t\n\t\t\n\t\t\tI\n\t\t\t1\n\t\t\n\t\t\n\t\t\tV\n\t\t\t5\n\t\t\n\t\t\n\t\t\tX\n\t\t\t10\n\t\t\n\t\t\n\t\t\tL\n\t\t\t50\n\t\t\n\t\t\n\t\t\tC\n\t\t\t100\n\t\t\n\t\t\n\t\t\tD\n\t\t\t500\n\t\t\n\t\t\n\t\t\tM\n\t\t\t1000\n\t\t\n\t\n\n\nRoman numerals are formed by appending&nbsp;the conversions of&nbsp;decimal place values&nbsp;from highest to lowest. Converting a decimal place value into a Roman numeral has the following rules:\n\n\n\tIf the value does not start with 4 or&nbsp;9, select the symbol of the maximal value that can be subtracted from the input, append that symbol to the result, subtract its value, and convert the remainder to a Roman numeral.\n\tIf the value starts with 4 or 9 use the&nbsp;subtractive form&nbsp;representing&nbsp;one symbol subtracted from the following symbol, for exa...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} num\n * @return {string}\n */\nvar intToRoman = function(num) {\n    \n};",
      "python": "class Solution(object):\n    def intToRoman(self, num):\n        \"\"\"\n        :type num: int\n        :rtype: str\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    string intToRoman(int num) {\n        \n    }\n};",
      "c": "char* intToRoman(int num) {\n    \n}",
      "csharp": "public class Solution {\n    public string IntToRoman(int num) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "intToRoman",
      "class": "Solution",
      "args": [
        {
          "name": "num",
          "type": "int"
        }
      ],
      "ret": "string"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Easy",
    "title": "Roman to Integer",
    "slug": "roman-to-integer",
    "leetcode_link": "https://leetcode.com/problems/roman-to-integer",
    "description": "Roman numerals are represented by seven different symbols:&nbsp;I, V, X, L, C, D and M.\n\n\nSymbol       Value\nI             1\nV             5\nX             10\nL             50\nC             100\nD             500\nM             1000\n\nFor example,&nbsp;2 is written as II&nbsp;in Roman numeral, just two ones added together. 12 is written as&nbsp;XII, which is simply X + II. The number 27 is written as XXVII, which is XX + V + II.\n\nRoman numerals are usually written largest to smallest from left to right. However, the numeral for four is not IIII. Instead, the number four is written as IV. Because the one is before the five we subtract it making four. The same principle applies to the number nine, which is written as IX. There are six instances where subtraction is used:\n\n\n\tI can be placed befor...",
    "examples": [
      {
        "input": "s = &quot;III&quot;",
        "output": "3",
        "explanation": "III = 3."
      },
      {
        "input": "s = &quot;LVIII&quot;",
        "output": "58",
        "explanation": "L = 50, V= 5, III = 3."
      },
      {
        "input": "s = &quot;MCMXCIV&quot;",
        "output": "1994",
        "explanation": "M = 1000, CM = 900, XC = 90 and IV = 4."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {number}\n */\nvar romanToInt = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def romanToInt(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int romanToInt(string s) {\n        \n    }\n};",
      "c": "int romanToInt(char* s) {\n    \n}",
      "csharp": "public class Solution {\n    public int RomanToInt(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "romanToInt",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "3",
        "hidden": false
      },
      {
        "input": {},
        "expected": "58",
        "hidden": false
      },
      {
        "input": {},
        "expected": "1994",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Medium",
    "title": "Letter Combinations of a Phone Number",
    "slug": "letter-combinations-of-a-phone-number",
    "leetcode_link": "https://leetcode.com/problems/letter-combinations-of-a-phone-number",
    "description": "Given a string containing digits from 2-9 inclusive, return all possible letter combinations that the number could represent. Return the answer in any order.\n\nA mapping of digits to letters (just like on the telephone buttons) is given below. Note that 1 does not map to any letters.\n\n&nbsp;\nExample 1:\n\n\nInput: digits = &quot;23&quot;\nOutput: [&quot;ad&quot;,&quot;ae&quot;,&quot;af&quot;,&quot;bd&quot;,&quot;be&quot;,&quot;bf&quot;,&quot;cd&quot;,&quot;ce&quot;,&quot;cf&quot;]\n\n\nExample 2:\n\n\nInput: digits = &quot;2&quot;\nOutput: [&quot;a&quot;,&quot;b&quot;,&quot;c&quot;]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= digits.length &lt;= 4\n\tdigits[i] is a digit in the range [&#39;2&#39;, &#39;9&#39;].\n\n...",
    "examples": [
      {
        "input": "digits = &quot;23&quot;",
        "output": "[&quot;ad&quot;,&quot;ae&quot;,&quot;af&quot;,&quot;bd&quot;,&quot;be&quot;,&quot;bf&quot;,&quot;cd&quot;,&quot;ce&quot;,&quot;cf&quot;]",
        "explanation": ""
      },
      {
        "input": "digits = &quot;2&quot;",
        "output": "[&quot;a&quot;,&quot;b&quot;,&quot;c&quot;]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} digits\n * @return {string[]}\n */\nvar letterCombinations = function(digits) {\n    \n};",
      "python": "class Solution(object):\n    def letterCombinations(self, digits):\n        \"\"\"\n        :type digits: str\n        :rtype: List[str]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<string> letterCombinations(string digits) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nchar** letterCombinations(char* digits, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<string> LetterCombinations(string digits) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "letterCombinations",
      "class": "Solution",
      "args": [
        {
          "name": "digits",
          "type": "string"
        }
      ],
      "ret": "list<string>"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "[&quot;ad&quot;,&quot;ae&quot;,&quot;af&quot;,&quot;bd&quot;,&quot;be&quot;,&quot;bf&quot;,&quot;cd&quot;,&quot;ce&quot;,&quot;cf&quot;]",
        "hidden": false
      },
      {
        "input": {},
        "expected": "[&quot;a&quot;,&quot;b&quot;,&quot;c&quot;]",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Hard",
    "title": "Substring with Concatenation of All Words",
    "slug": "substring-with-concatenation-of-all-words",
    "leetcode_link": "https://leetcode.com/problems/substring-with-concatenation-of-all-words",
    "description": "You are given a string s and an array of strings words. All the strings of words are of the same length.\n\nA concatenated string is a string that exactly contains all the strings of any permutation of words concatenated.\n\n\n\tFor example, if words = [&quot;ab&quot;,&quot;cd&quot;,&quot;ef&quot;], then &quot;abcdef&quot;, &quot;abefcd&quot;, &quot;cdabef&quot;, &quot;cdefab&quot;, &quot;efabcd&quot;, and &quot;efcdab&quot; are all concatenated strings. &quot;acdbef&quot; is not a concatenated string because it is not the concatenation of any permutation of words.\n\n\nReturn an array of the starting indices of all the concatenated substrings in s. You can return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;barfoothefoobarman&quot;, words = [&quot;foo&quot;,&quot;bar&quot;]\n\nOutp...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @param {string[]} words\n * @return {number[]}\n */\nvar findSubstring = function(s, words) {\n    \n};",
      "python": "class Solution(object):\n    def findSubstring(self, s, words):\n        \"\"\"\n        :type s: str\n        :type words: List[str]\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<int> findSubstring(string s, vector<string>& words) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* findSubstring(char* s, char** words, int wordsSize, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<int> FindSubstring(string s, string[] words) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findSubstring",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        },
        {
          "name": "words",
          "type": "vector<string>"
        }
      ],
      "ret": "list<integer>"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Medium",
    "title": "Valid Sudoku",
    "slug": "valid-sudoku",
    "leetcode_link": "https://leetcode.com/problems/valid-sudoku",
    "description": "Determine if a&nbsp;9 x 9 Sudoku board&nbsp;is valid.&nbsp;Only the filled cells need to be validated&nbsp;according to the following rules:\n\n\n\tEach row&nbsp;must contain the&nbsp;digits&nbsp;1-9 without repetition.\n\tEach column must contain the digits&nbsp;1-9&nbsp;without repetition.\n\tEach of the nine&nbsp;3 x 3 sub-boxes of the grid must contain the digits&nbsp;1-9&nbsp;without repetition.\n\n\nNote:\n\n\n\tA Sudoku board (partially filled) could be valid but is not necessarily solvable.\n\tOnly the filled cells need to be validated according to the mentioned&nbsp;rules.\n\n\n&nbsp;\nExample 1:\n\n\nInput: board = \n[[&quot;5&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;]\n,[&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;,&qu...",
    "examples": [
      {
        "input": "board = \n[[&quot;5&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;]\n,[&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;]\n,[&quot;.&quot;,&quot;9&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;]\n,[&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;3&quot;]\n,[&quot;4&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;]\n,[&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;]\n,[&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;8&quot;,&quot;.&quot;]\n,[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;4&quot;,&quot;1&quot;,&quot;9&quot;,&quot;.&quot;,&quot;.&quot;,&quot;5&quot;]\n,[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;9&quot;]]",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "board = \n[[&quot;8&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;]\n,[&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;]\n,[&quot;.&quot;,&quot;9&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;]\n,[&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;3&quot;]\n,[&quot;4&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;]\n,[&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;]\n,[&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;8&quot;,&quot;.&quot;]\n,[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;4&quot;,&quot;1&quot;,&quot;9&quot;,&quot;.&quot;,&quot;.&quot;,&quot;5&quot;]\n,[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;9&quot;]]",
        "output": "false",
        "explanation": "Same as Example 1, except with the"
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {character[][]} board\n * @return {boolean}\n */\nvar isValidSudoku = function(board) {\n    \n};",
      "python": "class Solution(object):\n    def isValidSudoku(self, board):\n        \"\"\"\n        :type board: List[List[str]]\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool isValidSudoku(vector<vector<char>>& board) {\n        \n    }\n};",
      "c": "bool isValidSudoku(char** board, int boardSize, int* boardColSize) {\n    \n}",
      "csharp": "public class Solution {\n    public bool IsValidSudoku(char[][] board) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isValidSudoku",
      "class": "Solution",
      "args": [
        {
          "name": "board",
          "type": "character[][]"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "true",
        "hidden": false
      },
      {
        "input": {},
        "expected": "false",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Hard",
    "title": "Sudoku Solver",
    "slug": "sudoku-solver",
    "leetcode_link": "https://leetcode.com/problems/sudoku-solver",
    "description": "Write a program to solve a Sudoku puzzle by filling the empty cells.\n\nA sudoku solution must satisfy all of the following rules:\n\n\n\tEach of the digits 1-9 must occur exactly once in each row.\n\tEach of the digits 1-9 must occur exactly once in each column.\n\tEach of the digits 1-9 must occur exactly once in each of the 9 3x3 sub-boxes of the grid.\n\n\nThe &#39;.&#39; character indicates empty cells.\n\n&nbsp;\nExample 1:\n\n\nInput: board = [[&quot;5&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;],[&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;],[&quot;.&quot;,&quot;9&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&q...",
    "examples": [
      {
        "input": "board = [[&quot;5&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;],[&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;],[&quot;.&quot;,&quot;9&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;],[&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;3&quot;],[&quot;4&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;3&quot;,&quot;.&quot;,&quot;.&quot;,&quot;1&quot;],[&quot;7&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;6&quot;],[&quot;.&quot;,&quot;6&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;2&quot;,&quot;8&quot;,&quot;.&quot;],[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;4&quot;,&quot;1&quot;,&quot;9&quot;,&quot;.&quot;,&quot;.&quot;,&quot;5&quot;],[&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;.&quot;,&quot;8&quot;,&quot;.&quot;,&quot;.&quot;,&quot;7&quot;,&quot;9&quot;]]",
        "output": "[[&quot;5&quot;,&quot;3&quot;,&quot;4&quot;,&quot;6&quot;,&quot;7&quot;,&quot;8&quot;,&quot;9&quot;,&quot;1&quot;,&quot;2&quot;],[&quot;6&quot;,&quot;7&quot;,&quot;2&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;3&quot;,&quot;4&quot;,&quot;8&quot;],[&quot;1&quot;,&quot;9&quot;,&quot;8&quot;,&quot;3&quot;,&quot;4&quot;,&quot;2&quot;,&quot;5&quot;,&quot;6&quot;,&quot;7&quot;],[&quot;8&quot;,&quot;5&quot;,&quot;9&quot;,&quot;7&quot;,&quot;6&quot;,&quot;1&quot;,&quot;4&quot;,&quot;2&quot;,&quot;3&quot;],[&quot;4&quot;,&quot;2&quot;,&quot;6&quot;,&quot;8&quot;,&quot;5&quot;,&quot;3&quot;,&quot;7&quot;,&quot;9&quot;,&quot;1&quot;],[&quot;7&quot;,&quot;1&quot;,&quot;3&quot;,&quot;9&quot;,&quot;2&quot;,&quot;4&quot;,&quot;8&quot;,&quot;5&quot;,&quot;6&quot;],[&quot;9&quot;,&quot;6&quot;,&quot;1&quot;,&quot;5&quot;,&quot;3&quot;,&quot;7&quot;,&quot;2&quot;,&quot;8&quot;,&quot;4&quot;],[&quot;2&quot;,&quot;8&quot;,&quot;7&quot;,&quot;4&quot;,&quot;1&quot;,&quot;9&quot;,&quot;6&quot;,&quot;3&quot;,&quot;5&quot;],[&quot;3&quot;,&quot;4&quot;,&quot;5&quot;,&quot;2&quot;,&quot;8&quot;,&quot;6&quot;,&quot;1&quot;,&quot;7&quot;,&quot;9&quot;]]",
        "explanation": "&nbsp;The input board is shown above and the only valid solution is shown below:"
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {character[][]} board\n * @return {void} Do not return anything, modify board in-place instead.\n */\nvar solveSudoku = function(board) {\n    \n};",
      "python": "class Solution(object):\n    def solveSudoku(self, board):\n        \"\"\"\n        :type board: List[List[str]]\n        :rtype: None Do not return anything, modify board in-place instead.\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    void solveSudoku(vector<vector<char>>& board) {\n        \n    }\n};",
      "c": "void solveSudoku(char** board, int boardSize, int* boardColSize) {\n    \n}",
      "csharp": "public class Solution {\n    public void SolveSudoku(char[][] board) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "solveSudoku",
      "class": "Solution",
      "args": [
        {
          "name": "board",
          "type": "character[][]"
        }
      ],
      "ret": "void"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "[[&quot;5&quot;,&quot;3&quot;,&quot;4&quot;,&quot;6&quot;,&quot;7&quot;,&quot;8&quot;,&quot;9&quot;,&quot;1&quot;,&quot;2&quot;],[&quot;6&quot;,&quot;7&quot;,&quot;2&quot;,&quot;1&quot;,&quot;9&quot;,&quot;5&quot;,&quot;3&quot;,&quot;4&quot;,&quot;8&quot;],[&quot;1&quot;,&quot;9&quot;,&quot;8&quot;,&quot;3&quot;,&quot;4&quot;,&quot;2&quot;,&quot;5&quot;,&quot;6&quot;,&quot;7&quot;],[&quot;8&quot;,&quot;5&quot;,&quot;9&quot;,&quot;7&quot;,&quot;6&quot;,&quot;1&quot;,&quot;4&quot;,&quot;2&quot;,&quot;3&quot;],[&quot;4&quot;,&quot;2&quot;,&quot;6&quot;,&quot;8&quot;,&quot;5&quot;,&quot;3&quot;,&quot;7&quot;,&quot;9&quot;,&quot;1&quot;],[&quot;7&quot;,&quot;1&quot;,&quot;3&quot;,&quot;9&quot;,&quot;2&quot;,&quot;4&quot;,&quot;8&quot;,&quot;5&quot;,&quot;6&quot;],[&quot;9&quot;,&quot;6&quot;,&quot;1&quot;,&quot;5&quot;,&quot;3&quot;,&quot;7&quot;,&quot;2&quot;,&quot;8&quot;,&quot;4&quot;],[&quot;2&quot;,&quot;8&quot;,&quot;7&quot;,&quot;4&quot;,&quot;1&quot;,&quot;9&quot;,&quot;6&quot;,&quot;3&quot;,&quot;5&quot;],[&quot;3&quot;,&quot;4&quot;,&quot;5&quot;,&quot;2&quot;,&quot;8&quot;,&quot;6&quot;,&quot;1&quot;,&quot;7&quot;,&quot;9&quot;]]",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Hard",
    "title": "First Missing Positive",
    "slug": "first-missing-positive",
    "leetcode_link": "https://leetcode.com/problems/first-missing-positive",
    "description": "Given an unsorted integer array nums. Return the smallest positive integer that is not present in nums.\n\nYou must implement an algorithm that runs in O(n) time and uses O(1) auxiliary space.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,2,0]\nOutput: 3\nExplanation: The numbers in the range [1,2] are all in the array.\n\n\nExample 2:\n\n\nInput: nums = [3,4,-1,1]\nOutput: 2\nExplanation: 1 is in the array but 2 is missing.\n\n\nExample 3:\n\n\nInput: nums = [7,8,9,11,12]\nOutput: 1\nExplanation: The smallest positive integer 1 is missing.\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 105\n\t-231 &lt;= nums[i] &lt;= 231 - 1\n\n...",
    "examples": [
      {
        "input": "nums = [1,2,0]",
        "output": "3",
        "explanation": "The numbers in the range [1,2] are all in the array."
      },
      {
        "input": "nums = [3,4,-1,1]",
        "output": "2",
        "explanation": "1 is in the array but 2 is missing."
      },
      {
        "input": "nums = [7,8,9,11,12]",
        "output": "1",
        "explanation": "The smallest positive integer 1 is missing."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar firstMissingPositive = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def firstMissingPositive(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int firstMissingPositive(vector<int>& nums) {\n        \n    }\n};",
      "c": "int firstMissingPositive(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int FirstMissingPositive(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "firstMissingPositive",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            0
          ]
        },
        "expected": 3,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            3,
            4,
            -1,
            1
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            7,
            8,
            9,
            11,
            12
          ]
        },
        "expected": 1,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Arrays & Hashing",
    "pattern": "Hash Map",
    "difficulty": "Medium",
    "title": "Group Anagrams",
    "slug": "group-anagrams",
    "leetcode_link": "https://leetcode.com/problems/group-anagrams",
    "description": "Given an array of strings strs, group the anagrams together. You can return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: strs = [&quot;eat&quot;,&quot;tea&quot;,&quot;tan&quot;,&quot;ate&quot;,&quot;nat&quot;,&quot;bat&quot;]\n\nOutput: [[&quot;bat&quot;],[&quot;nat&quot;,&quot;tan&quot;],[&quot;ate&quot;,&quot;eat&quot;,&quot;tea&quot;]]\n\nExplanation:\n\n\n\tThere is no string in strs that can be rearranged to form &quot;bat&quot;.\n\tThe strings &quot;nat&quot; and &quot;tan&quot; are anagrams as they can be rearranged to form each other.\n\tThe strings &quot;ate&quot;, &quot;eat&quot;, and &quot;tea&quot; are anagrams as they can be rearranged to form each other.\n\n\n\nExample 2:\n\n\nInput: strs = [&quot;&quot;]\n\nOutput: [[&quot;&quot;]]\n\n\nExample 3:\n\n\nInput: strs = [&quot;a&quot;]\n\nOutput: [[...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string[]} strs\n * @return {string[][]}\n */\nvar groupAnagrams = function(strs) {\n    \n};",
      "python": "class Solution(object):\n    def groupAnagrams(self, strs):\n        \"\"\"\n        :type strs: List[str]\n        :rtype: List[List[str]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nchar*** groupAnagrams(char** strs, int strsSize, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<string>> GroupAnagrams(string[] strs) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "groupAnagrams",
      "class": "Solution",
      "args": [
        {
          "name": "strs",
          "type": "vector<string>"
        }
      ],
      "ret": "list<list<string>>"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "leetcode_link": "https://leetcode.com/problems/longest-palindromic-substring",
    "description": "Given a string s, return the longest palindromic substring in s.\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;babad&quot;\nOutput: &quot;bab&quot;\nExplanation: &quot;aba&quot; is also a valid answer.\n\n\nExample 2:\n\n\nInput: s = &quot;cbbd&quot;\nOutput: &quot;bb&quot;\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= s.length &lt;= 1000\n\ts consist of only digits and English letters.\n\n...",
    "examples": [
      {
        "input": "s = &quot;babad&quot;",
        "output": "&quot;bab&quot;",
        "explanation": "&quot;aba&quot; is also a valid answer."
      },
      {
        "input": "s = &quot;cbbd&quot;",
        "output": "&quot;bb&quot;",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {string}\n */\nvar longestPalindrome = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def longestPalindrome(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: str\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    string longestPalindrome(string s) {\n        \n    }\n};",
      "c": "char* longestPalindrome(char* s) {\n    \n}",
      "csharp": "public class Solution {\n    public string LongestPalindrome(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "longestPalindrome",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "string"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "&quot;bab&quot;",
        "hidden": false
      },
      {
        "input": {},
        "expected": "&quot;bb&quot;",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "Container With Most Water",
    "slug": "container-with-most-water",
    "leetcode_link": "https://leetcode.com/problems/container-with-most-water",
    "description": "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.\n\nNotice that you may not slant the container.\n\n&nbsp;\nExample 1:\n\n\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\nExplanation: The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49.\n\n\nExample 2:\n\n\nInput: height = [1,1]\nOutput: 1\n\n\n&nbsp;\nConstraints:\n\n\n\tn == height.length\n\t2 &lt;= n &lt;= 105\n\t0 &lt;= height[i] &lt;= 104\n\n...",
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7]",
        "output": "49",
        "explanation": "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49."
      },
      {
        "input": "height = [1,1]",
        "output": "1",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} height\n * @return {number}\n */\nvar maxArea = function(height) {\n    \n};",
      "python": "class Solution(object):\n    def maxArea(self, height):\n        \"\"\"\n        :type height: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};",
      "c": "int maxArea(int* height, int heightSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int MaxArea(int[] height) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "maxArea",
      "class": "Solution",
      "args": [
        {
          "name": "height",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "height": [
            1,
            8,
            6,
            2,
            5,
            4,
            8,
            3,
            7
          ]
        },
        "expected": 49,
        "hidden": false
      },
      {
        "input": {
          "height": [
            1,
            1
          ]
        },
        "expected": 1,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "3Sum",
    "slug": "3sum",
    "leetcode_link": "https://leetcode.com/problems/3sum",
    "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]\nExplanation: \nnums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.\nnums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0.\nnums[0] + nums[3] + nums[4] = (-1) + 2 + (-1) = 0.\nThe distinct triplets are [-1,0,1] and [-1,-1,2].\nNotice that the order of the output and the order of the triplets does not matter.\n\n\nExample 2:\n\n\nInput: nums = [0,1,1]\nOutput: []\nExplanation: The only possible triplet does not sum up to 0.\n\n\nExample 3:\n\n\nInput: nums = [0,0,0]\nOutput: [[0,0,0]]\nExplanation: The only possible triple...",
    "examples": [
      {
        "input": "nums = [-1,0,1,2,-1,-4]",
        "output": "[[-1,-1,2],[-1,0,1]]",
        "explanation": "nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.\nnums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0.\nnums[0] + nums[3] + nums[4] = (-1) + 2 + (-1) = 0.\nThe distinct triplets are [-1,0,1] and [-1,-1,2].\nNotice that the order of the output and the order of the triplets does not matter."
      },
      {
        "input": "nums = [0,1,1]",
        "output": "[]",
        "explanation": "The only possible triplet does not sum up to 0."
      },
      {
        "input": "nums = [0,0,0]",
        "output": "[[0,0,0]]",
        "explanation": "The only possible triplet sums up to 0."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nvar threeSum = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def threeSum(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** threeSum(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> ThreeSum(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "threeSum",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            -1,
            0,
            1,
            2,
            -1,
            -4
          ]
        },
        "expected": [
          [
            -1,
            -1,
            2
          ],
          [
            -1,
            0,
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            1,
            1
          ]
        },
        "expected": [],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            0,
            0
          ]
        },
        "expected": [
          [
            0,
            0,
            0
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "3Sum Closest",
    "slug": "3sum-closest",
    "leetcode_link": "https://leetcode.com/problems/3sum-closest",
    "description": "Given an integer array nums of length n and an integer target, find three integers at distinct indices in nums such that the sum is closest to target.\n\nReturn the sum of the three integers.\n\nYou may assume that each input would have exactly one solution.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [-1,2,1,-4], target = 1\nOutput: 2\nExplanation: The sum that is closest to the target is 2. (-1 + 2 + 1 = 2).\n\n\nExample 2:\n\n\nInput: nums = [0,0,0], target = 1\nOutput: 0\nExplanation: The sum that is closest to the target is 0. (0 + 0 + 0 = 0).\n\n\n&nbsp;\nConstraints:\n\n\n\t3 &lt;= nums.length &lt;= 500\n\t-1000 &lt;= nums[i] &lt;= 1000\n\t-104 &lt;= target &lt;= 104\n\n...",
    "examples": [
      {
        "input": "nums = [-1,2,1,-4], target = 1",
        "output": "2",
        "explanation": "The sum that is closest to the target is 2. (-1 + 2 + 1 = 2)."
      },
      {
        "input": "nums = [0,0,0], target = 1",
        "output": "0",
        "explanation": "The sum that is closest to the target is 0. (0 + 0 + 0 = 0)."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nvar threeSumClosest = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def threeSumClosest(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int threeSumClosest(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "int threeSumClosest(int* nums, int numsSize, int target) {\n    \n}",
      "csharp": "public class Solution {\n    public int ThreeSumClosest(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "threeSumClosest",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            -1,
            2,
            1,
            -4
          ],
          "target": 1
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            0,
            0
          ],
          "target": 1
        },
        "expected": 0,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "4Sum",
    "slug": "4sum",
    "leetcode_link": "https://leetcode.com/problems/4sum",
    "description": "Given an array nums of n integers, return an array of all the unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that:\n\n\n\t0 &lt;= a, b, c, d&nbsp;&lt; n\n\ta, b, c, and d are distinct.\n\tnums[a] + nums[b] + nums[c] + nums[d] == target\n\n\nYou may return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,0,-1,0,-2,2], target = 0\nOutput: [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]\n\n\nExample 2:\n\n\nInput: nums = [2,2,2,2,2], target = 8\nOutput: [[2,2,2,2]]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 200\n\t-109 &lt;= nums[i] &lt;= 109\n\t-109 &lt;= target &lt;= 109\n\n...",
    "examples": [
      {
        "input": "nums = [1,0,-1,0,-2,2], target = 0",
        "output": "[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]",
        "explanation": ""
      },
      {
        "input": "nums = [2,2,2,2,2], target = 8",
        "output": "[[2,2,2,2]]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[][]}\n */\nvar fourSum = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def fourSum(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> fourSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** fourSum(int* nums, int numsSize, int target, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> FourSum(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "fourSum",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            0,
            -1,
            0,
            -2,
            2
          ],
          "target": 0
        },
        "expected": [
          [
            -2,
            -1,
            1,
            2
          ],
          [
            -2,
            0,
            0,
            2
          ],
          [
            -1,
            0,
            0,
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            2,
            2,
            2,
            2,
            2
          ],
          "target": 8
        },
        "expected": [
          [
            2,
            2,
            2,
            2
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "Remove Nth Node From End of List",
    "slug": "remove-nth-node-from-end-of-list",
    "leetcode_link": "https://leetcode.com/problems/remove-nth-node-from-end-of-list",
    "description": "Given the head of a linked list, remove the nth node from the end of the list and return its head.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,4,5], n = 2\nOutput: [1,2,3,5]\n\n\nExample 2:\n\n\nInput: head = [1], n = 1\nOutput: []\n\n\nExample 3:\n\n\nInput: head = [1,2], n = 1\nOutput: [1]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is sz.\n\t1 &lt;= sz &lt;= 30\n\t0 &lt;= Node.val &lt;= 100\n\t1 &lt;= n &lt;= sz\n\n\n&nbsp;\nFollow up: Could you do this in one pass?\n...",
    "examples": [
      {
        "input": "head = [1,2,3,4,5], n = 2",
        "output": "[1,2,3,5]",
        "explanation": ""
      },
      {
        "input": "head = [1], n = 1",
        "output": "[]",
        "explanation": ""
      },
      {
        "input": "head = [1,2], n = 1",
        "output": "[1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @param {number} n\n * @return {ListNode}\n */\nvar removeNthFromEnd = function(head, n) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def removeNthFromEnd(self, head, n):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :type n: int\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* removeNthFromEnd(ListNode* head, int n) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* removeNthFromEnd(struct ListNode* head, int n) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode RemoveNthFromEnd(ListNode head, int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "removeNthFromEnd",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        },
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4,
            5
          ],
          "n": 2
        },
        "expected": [
          1,
          2,
          3,
          5
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1
          ],
          "n": 1
        },
        "expected": [],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1,
            2
          ],
          "n": 1
        },
        "expected": [
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Easy",
    "title": "Remove Duplicates from Sorted Array",
    "slug": "remove-duplicates-from-sorted-array",
    "leetcode_link": "https://leetcode.com/problems/remove-duplicates-from-sorted-array",
    "description": "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same.\n\nConsider the number of unique elements in&nbsp;nums to be k​​​​​​​​​​​​​​. After removing duplicates, return the number of unique elements&nbsp;k.\n\nThe first&nbsp;k&nbsp;elements of&nbsp;nums&nbsp;should contain the unique numbers in sorted order. The remaining elements beyond index&nbsp;k - 1&nbsp;can be ignored.\n\nCustom Judge:\n\nThe judge will test your solution with the following code:\n\n\nint[] nums = [...]; // Input array\nint[] expectedNums = [...]; // The expected answer with correct length\n\nint k = removeDuplicates(nums); // Calls your implementation\n\nassert k == expectedNums.length;\nfor ...",
    "examples": [
      {
        "input": "nums = [1,1,2]",
        "output": "2, nums = [1,2,_]",
        "explanation": "Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively.\nIt does not matter what you leave beyond the returned k (hence they are underscores)."
      },
      {
        "input": "nums = [0,0,1,1,1,2,2,3,3,4]",
        "output": "5, nums = [0,1,2,3,4,_,_,_,_,_]",
        "explanation": "Your function should return k = 5, with the first five elements of nums being 0, 1, 2, 3, and 4 respectively.\nIt does not matter what you leave beyond the returned k (hence they are underscores)."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar removeDuplicates = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def removeDuplicates(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int removeDuplicates(vector<int>& nums) {\n        \n    }\n};",
      "c": "int removeDuplicates(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int RemoveDuplicates(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "removeDuplicates",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            1,
            2
          ]
        },
        "expected": "2, nums = [1,2,_]",
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            0,
            1,
            1,
            1,
            2,
            2,
            3,
            3,
            4
          ]
        },
        "expected": "5, nums = [0,1,2,3,4,_,_,_,_,_]",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Easy",
    "title": "Remove Element",
    "slug": "remove-element",
    "leetcode_link": "https://leetcode.com/problems/remove-element",
    "description": "Given an integer array nums and an integer val, remove all occurrences of val in nums in-place. The order of the elements may be changed. Then return the number of elements in nums which are not equal to val.\n\nConsider the number of elements in nums which are not equal to val be k, to get accepted, you need to do the following things:\n\n\n\tChange the array nums such that the first k elements of nums contain the elements which are not equal to val. The remaining elements of nums are not important as well as the size of nums.\n\tReturn k.\n\n\nCustom Judge:\n\nThe judge will test your solution with the following code:\n\n\nint[] nums = [...]; // Input array\nint val = ...; // Value to remove\nint[] expectedNums = [...]; // The expected answer with correct length.\n                            // It is sorte...",
    "examples": [
      {
        "input": "nums = [3,2,2,3], val = 3",
        "output": "2, nums = [2,2,_,_]",
        "explanation": "Your function should return k = 2, with the first two elements of nums being 2.\nIt does not matter what you leave beyond the returned k (hence they are underscores)."
      },
      {
        "input": "nums = [0,1,2,2,3,0,4,2], val = 2",
        "output": "5, nums = [0,1,4,0,3,_,_,_]",
        "explanation": "Your function should return k = 5, with the first five elements of nums containing 0, 0, 1, 3, and 4.\nNote that the five elements can be returned in any order.\nIt does not matter what you leave beyond the returned k (hence they are underscores)."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} val\n * @return {number}\n */\nvar removeElement = function(nums, val) {\n    \n};",
      "python": "class Solution(object):\n    def removeElement(self, nums, val):\n        \"\"\"\n        :type nums: List[int]\n        :type val: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int removeElement(vector<int>& nums, int val) {\n        \n    }\n};",
      "c": "int removeElement(int* nums, int numsSize, int val) {\n    \n}",
      "csharp": "public class Solution {\n    public int RemoveElement(int[] nums, int val) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "removeElement",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "val",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            3,
            2,
            2,
            3
          ],
          "val": 3
        },
        "expected": "2, nums = [2,2,_,_]",
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            1,
            2,
            2,
            3,
            0,
            4,
            2
          ],
          "val": 2
        },
        "expected": "5, nums = [0,1,4,0,3,_,_,_]",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Easy",
    "title": "Find the Index of the First Occurrence in a String",
    "slug": "find-the-index-of-the-first-occurrence-in-a-string",
    "leetcode_link": "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string",
    "description": "Given two strings needle and haystack, return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack.\n\n&nbsp;\nExample 1:\n\n\nInput: haystack = &quot;sadbutsad&quot;, needle = &quot;sad&quot;\nOutput: 0\nExplanation: &quot;sad&quot; occurs at index 0 and 6.\nThe first occurrence is at index 0, so we return 0.\n\n\nExample 2:\n\n\nInput: haystack = &quot;leetcode&quot;, needle = &quot;leeto&quot;\nOutput: -1\nExplanation: &quot;leeto&quot; did not occur in &quot;leetcode&quot;, so we return -1.\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= haystack.length, needle.length &lt;= 104\n\thaystack and needle consist of only lowercase English characters.\n\n...",
    "examples": [
      {
        "input": "haystack = &quot;sadbutsad&quot;, needle = &quot;sad&quot;",
        "output": "0",
        "explanation": "&quot;sad&quot; occurs at index 0 and 6.\nThe first occurrence is at index 0, so we return 0."
      },
      {
        "input": "haystack = &quot;leetcode&quot;, needle = &quot;leeto&quot;",
        "output": "-1",
        "explanation": "&quot;leeto&quot; did not occur in &quot;leetcode&quot;, so we return -1."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} haystack\n * @param {string} needle\n * @return {number}\n */\nvar strStr = function(haystack, needle) {\n    \n};",
      "python": "class Solution(object):\n    def strStr(self, haystack, needle):\n        \"\"\"\n        :type haystack: str\n        :type needle: str\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int strStr(string haystack, string needle) {\n        \n    }\n};",
      "c": "int strStr(char* haystack, char* needle) {\n    \n}",
      "csharp": "public class Solution {\n    public int StrStr(string haystack, string needle) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "strStr",
      "class": "Solution",
      "args": [
        {
          "name": "haystack",
          "type": "string"
        },
        {
          "name": "needle",
          "type": "string"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "0",
        "hidden": false
      },
      {
        "input": {},
        "expected": "-1",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Two Pointers",
    "pattern": "Opposite Direction",
    "difficulty": "Medium",
    "title": "Next Permutation",
    "slug": "next-permutation",
    "leetcode_link": "https://leetcode.com/problems/next-permutation",
    "description": "A permutation of an array of integers is an arrangement of its members into a sequence or linear order.\n\n\n\tFor example, for arr = [1,2,3], the following are all the permutations of arr: [1,2,3], [1,3,2], [2, 1, 3], [2, 3, 1], [3,1,2], [3,2,1].\n\n\nThe next permutation of an array of integers is the next lexicographically greater permutation of its integer. More formally, if all the permutations of the array are sorted in one container according to their lexicographical order, then the next permutation of that array is the permutation that follows it in the sorted container. If such arrangement is not possible, the array must be rearranged as the lowest possible order (i.e., sorted in ascending order).\n\n\n\tFor example, the next permutation of arr = [1,2,3] is [1,3,2].\n\tSimilarly, the next perm...",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[1,3,2]",
        "explanation": ""
      },
      {
        "input": "nums = [3,2,1]",
        "output": "[1,2,3]",
        "explanation": ""
      },
      {
        "input": "nums = [1,1,5]",
        "output": "[1,5,1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {void} Do not return anything, modify nums in-place instead.\n */\nvar nextPermutation = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def nextPermutation(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: None Do not return anything, modify nums in-place instead.\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    void nextPermutation(vector<int>& nums) {\n        \n    }\n};",
      "c": "void nextPermutation(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public void NextPermutation(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "nextPermutation",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "void"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            3
          ]
        },
        "expected": [
          1,
          3,
          2
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            3,
            2,
            1
          ]
        },
        "expected": [
          1,
          2,
          3
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            1,
            5
          ]
        },
        "expected": [
          1,
          5,
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Hard",
    "title": "Minimum Window Substring",
    "slug": "minimum-window-substring",
    "leetcode_link": "https://leetcode.com/problems/minimum-window-substring",
    "description": "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string &quot;&quot;.\n\nThe testcases will be generated such that the answer is unique.\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;ADOBECODEBANC&quot;, t = &quot;ABC&quot;\nOutput: &quot;BANC&quot;\nExplanation: The minimum window substring &quot;BANC&quot; includes &#39;A&#39;, &#39;B&#39;, and &#39;C&#39; from string t.\n\n\nExample 2:\n\n\nInput: s = &quot;a&quot;, t = &quot;a&quot;\nOutput: &quot;a&quot;\nExplanation: The entire string s is the minimum window.\n\n\nExample 3:\n\n\nInput: s = &quot;a&quot;, t = &quot;aa&quot;\nOutput: &quot;&quot;\nExplanation: Both &#39;a&#39;s from t ...",
    "examples": [
      {
        "input": "s = &quot;ADOBECODEBANC&quot;, t = &quot;ABC&quot;",
        "output": "&quot;BANC&quot;",
        "explanation": "The minimum window substring &quot;BANC&quot; includes &#39;A&#39;, &#39;B&#39;, and &#39;C&#39; from string t."
      },
      {
        "input": "s = &quot;a&quot;, t = &quot;a&quot;",
        "output": "&quot;a&quot;",
        "explanation": "The entire string s is the minimum window."
      },
      {
        "input": "s = &quot;a&quot;, t = &quot;aa&quot;",
        "output": "&quot;&quot;",
        "explanation": "Both &#39;a&#39;s from t must be included in the window.\nSince the largest window of s only has one &#39;a&#39;, return empty string."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @param {string} t\n * @return {string}\n */\nvar minWindow = function(s, t) {\n    \n};",
      "python": "class Solution(object):\n    def minWindow(self, s, t):\n        \"\"\"\n        :type s: str\n        :type t: str\n        :rtype: str\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    string minWindow(string s, string t) {\n        \n    }\n};",
      "c": "char* minWindow(char* s, char* t) {\n    \n}",
      "csharp": "public class Solution {\n    public string MinWindow(string s, string t) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "minWindow",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        },
        {
          "name": "t",
          "type": "string"
        }
      ],
      "ret": "string"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "&quot;BANC&quot;",
        "hidden": false
      },
      {
        "input": {},
        "expected": "&quot;a&quot;",
        "hidden": false
      },
      {
        "input": {},
        "expected": "&quot;&quot;",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Medium",
    "title": "Longest Substring with At Most Two Distinct Characters",
    "slug": "longest-substring-with-at-most-two-distinct-characters",
    "leetcode_link": "https://leetcode.com/problems/longest-substring-with-at-most-two-distinct-characters",
    "description": "...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "",
      "python": "",
      "cpp": "",
      "c": "",
      "csharp": ""
    },
    "cpp_signature": {
      "fn": "lengthOfLongestSubstringTwoDistinct",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Medium",
    "title": "Repeated DNA Sequences",
    "slug": "repeated-dna-sequences",
    "leetcode_link": "https://leetcode.com/problems/repeated-dna-sequences",
    "description": "The DNA sequence is composed of a series of nucleotides abbreviated as &#39;A&#39;, &#39;C&#39;, &#39;G&#39;, and &#39;T&#39;.\n\n\n\tFor example, &quot;ACGAATTCCG&quot; is a DNA sequence.\n\n\nWhen studying DNA, it is useful to identify repeated sequences within the DNA.\n\nGiven a string s that represents a DNA sequence, return all the 10-letter-long sequences (substrings) that occur more than once in a DNA molecule. You may return the answer in any order.\n\n&nbsp;\nExample 1:\nInput: s = \"AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT\"\nOutput: [\"AAAAACCCCC\",\"CCCCCAAAAA\"]\nExample 2:\nInput: s = \"AAAAAAAAAAAAA\"\nOutput: [\"AAAAAAAAAA\"]\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= s.length &lt;= 105\n\ts[i] is either &#39;A&#39;, &#39;C&#39;, &#39;G&#39;, or &#39;T&#39;.\n\n...",
    "examples": [
      {
        "input": "s = \"AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT\"",
        "output": "[\"AAAAACCCCC\",\"CCCCCAAAAA\"]",
        "explanation": ""
      },
      {
        "input": "s = \"AAAAAAAAAAAAA\"",
        "output": "[\"AAAAAAAAAA\"]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {string[]}\n */\nvar findRepeatedDnaSequences = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def findRepeatedDnaSequences(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: List[str]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<string> findRepeatedDnaSequences(string s) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nchar** findRepeatedDnaSequences(char* s, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<string> FindRepeatedDnaSequences(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findRepeatedDnaSequences",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "list<string>"
    },
    "test_cases": [
      {
        "input": {
          "s": "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"
        },
        "expected": [
          "AAAAACCCCC",
          "CCCCCAAAAA"
        ],
        "hidden": false
      },
      {
        "input": {
          "s": "AAAAAAAAAAAAA"
        },
        "expected": [
          "AAAAAAAAAA"
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Medium",
    "title": "Minimum Size Subarray Sum",
    "slug": "minimum-size-subarray-sum",
    "leetcode_link": "https://leetcode.com/problems/minimum-size-subarray-sum",
    "description": "Given an array of positive integers nums and a positive integer target, return the minimal length of a subarray whose sum is greater than or equal to target. If there is no such subarray, return 0 instead.\n\n&nbsp;\nExample 1:\n\n\nInput: target = 7, nums = [2,3,1,2,4,3]\nOutput: 2\nExplanation: The subarray [4,3] has the minimal length under the problem constraint.\n\n\nExample 2:\n\n\nInput: target = 4, nums = [1,4,4]\nOutput: 1\n\n\nExample 3:\n\n\nInput: target = 11, nums = [1,1,1,1,1,1,1,1]\nOutput: 0\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= target &lt;= 109\n\t1 &lt;= nums.length &lt;= 105\n\t1 &lt;= nums[i] &lt;= 104\n\n\n&nbsp;\nFollow up: If you have figured out the O(n) solution, try coding another solution of which the time complexity is O(n log(n))....",
    "examples": [
      {
        "input": "target = 7, nums = [2,3,1,2,4,3]",
        "output": "2",
        "explanation": "The subarray [4,3] has the minimal length under the problem constraint."
      },
      {
        "input": "target = 4, nums = [1,4,4]",
        "output": "1",
        "explanation": ""
      },
      {
        "input": "target = 11, nums = [1,1,1,1,1,1,1,1]",
        "output": "0",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} target\n * @param {number[]} nums\n * @return {number}\n */\nvar minSubArrayLen = function(target, nums) {\n    \n};",
      "python": "class Solution(object):\n    def minSubArrayLen(self, target, nums):\n        \"\"\"\n        :type target: int\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int minSubArrayLen(int target, vector<int>& nums) {\n        \n    }\n};",
      "c": "int minSubArrayLen(int target, int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int MinSubArrayLen(int target, int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "minSubArrayLen",
      "class": "Solution",
      "args": [
        {
          "name": "target",
          "type": "int"
        },
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "target": 7,
          "nums": [
            2,
            3,
            1,
            2,
            4,
            3
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "target": 4,
          "nums": [
            1,
            4,
            4
          ]
        },
        "expected": 1,
        "hidden": false
      },
      {
        "input": {
          "target": 11,
          "nums": [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ]
        },
        "expected": 0,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Easy",
    "title": "Contains Duplicate II",
    "slug": "contains-duplicate-ii",
    "leetcode_link": "https://leetcode.com/problems/contains-duplicate-ii",
    "description": "Given an integer array nums and an integer k, return true if there are two distinct indices i and j in the array such that nums[i] == nums[j] and abs(i - j) &lt;= k.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,2,3,1], k = 3\nOutput: true\n\n\nExample 2:\n\n\nInput: nums = [1,0,1,1], k = 1\nOutput: true\n\n\nExample 3:\n\n\nInput: nums = [1,2,3,1,2,3], k = 2\nOutput: false\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 105\n\t-109 &lt;= nums[i] &lt;= 109\n\t0 &lt;= k &lt;= 105\n\n...",
    "examples": [
      {
        "input": "nums = [1,2,3,1], k = 3",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "nums = [1,0,1,1], k = 1",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "nums = [1,2,3,1,2,3], k = 2",
        "output": "false",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {boolean}\n */\nvar containsNearbyDuplicate = function(nums, k) {\n    \n};",
      "python": "class Solution(object):\n    def containsNearbyDuplicate(self, nums, k):\n        \"\"\"\n        :type nums: List[int]\n        :type k: int\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool containsNearbyDuplicate(vector<int>& nums, int k) {\n        \n    }\n};",
      "c": "bool containsNearbyDuplicate(int* nums, int numsSize, int k) {\n    \n}",
      "csharp": "public class Solution {\n    public bool ContainsNearbyDuplicate(int[] nums, int k) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "containsNearbyDuplicate",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            3,
            1
          ],
          "k": 3
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            0,
            1,
            1
          ],
          "k": 1
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            2,
            3,
            1,
            2,
            3
          ],
          "k": 2
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Hard",
    "title": "Contains Duplicate III",
    "slug": "contains-duplicate-iii",
    "leetcode_link": "https://leetcode.com/problems/contains-duplicate-iii",
    "description": "You are given an integer array nums and two integers indexDiff and valueDiff.\n\nFind a pair of indices (i, j) such that:\n\n\n\ti != j,\n\tabs(i - j) &lt;= indexDiff.\n\tabs(nums[i] - nums[j]) &lt;= valueDiff, and\n\n\nReturn true if such pair exists or false otherwise.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,2,3,1], indexDiff = 3, valueDiff = 0\nOutput: true\nExplanation: We can choose (i, j) = (0, 3).\nWe satisfy the three conditions:\ni != j --&gt; 0 != 3\nabs(i - j) &lt;= indexDiff --&gt; abs(0 - 3) &lt;= 3\nabs(nums[i] - nums[j]) &lt;= valueDiff --&gt; abs(1 - 1) &lt;= 0\n\n\nExample 2:\n\n\nInput: nums = [1,5,9,1,5,9], indexDiff = 2, valueDiff = 3\nOutput: false\nExplanation: After trying all the possible pairs (i, j), we cannot satisfy the three conditions, so we return false.\n\n\n&nbsp;\nConstraints:\n\n\n\t2 &lt;= ...",
    "examples": [
      {
        "input": "nums = [1,2,3,1], indexDiff = 3, valueDiff = 0",
        "output": "true",
        "explanation": "We can choose (i, j) = (0, 3).\nWe satisfy the three conditions:\ni != j --&gt; 0 != 3\nabs(i - j) &lt;= indexDiff --&gt; abs(0 - 3) &lt;= 3\nabs(nums[i] - nums[j]) &lt;= valueDiff --&gt; abs(1 - 1) &lt;= 0"
      },
      {
        "input": "nums = [1,5,9,1,5,9], indexDiff = 2, valueDiff = 3",
        "output": "false",
        "explanation": "After trying all the possible pairs (i, j), we cannot satisfy the three conditions, so we return false."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} indexDiff\n * @param {number} valueDiff\n * @return {boolean}\n */\nvar containsNearbyAlmostDuplicate = function(nums, indexDiff, valueDiff) {\n    \n};",
      "python": "class Solution(object):\n    def containsNearbyAlmostDuplicate(self, nums, indexDiff, valueDiff):\n        \"\"\"\n        :type nums: List[int]\n        :type indexDiff: int\n        :type valueDiff: int\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool containsNearbyAlmostDuplicate(vector<int>& nums, int indexDiff, int valueDiff) {\n        \n    }\n};",
      "c": "bool containsNearbyAlmostDuplicate(int* nums, int numsSize, int indexDiff, int valueDiff) {\n    \n}",
      "csharp": "public class Solution {\n    public bool ContainsNearbyAlmostDuplicate(int[] nums, int indexDiff, int valueDiff) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "containsNearbyAlmostDuplicate",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "indexDiff",
          "type": "int"
        },
        {
          "name": "valueDiff",
          "type": "int"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            3,
            1
          ],
          "indexDiff": 3,
          "valueDiff": 0
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            5,
            9,
            1,
            5,
            9
          ],
          "indexDiff": 2,
          "valueDiff": 3
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Hard",
    "title": "Sliding Window Maximum",
    "slug": "sliding-window-maximum",
    "leetcode_link": "https://leetcode.com/problems/sliding-window-maximum",
    "description": "You are given an array of integers&nbsp;nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.\n\nReturn the max sliding window.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,3,-1,-3,5,3,6,7], k = 3\nOutput: [3,3,5,5,6,7]\nExplanation: \nWindow position                Max\n---------------               -----\n[1  3  -1] -3  5  3  6  7       3\n 1 [3  -1  -3] 5  3  6  7       3\n 1  3 [-1  -3  5] 3  6  7       5\n 1  3  -1 [-3  5  3] 6  7       5\n 1  3  -1  -3 [5  3  6] 7       6\n 1  3  -1  -3  5 [3  6  7]      7\n\n\nExample 2:\n\n\nInput: nums = [1], k = 1\nOutput: [1]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 105\n\t-104 &lt;= nums[i] &lt;= 104\n\t1 &l...",
    "examples": [
      {
        "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        "output": "[3,3,5,5,6,7]",
        "explanation": "Window position                Max\n---------------               -----\n[1  3  -1] -3  5  3  6  7"
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number[]}\n */\nvar maxSlidingWindow = function(nums, k) {\n    \n};",
      "python": "class Solution(object):\n    def maxSlidingWindow(self, nums, k):\n        \"\"\"\n        :type nums: List[int]\n        :type k: int\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* maxSlidingWindow(int* nums, int numsSize, int k, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int[] MaxSlidingWindow(int[] nums, int k) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "maxSlidingWindow",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "vector<int>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            3,
            -1,
            -3,
            5,
            3,
            6,
            7
          ],
          "k": 3
        },
        "expected": [
          3,
          3,
          5,
          5,
          6,
          7
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1
          ],
          "k": 1
        },
        "expected": [
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Sliding Window",
    "pattern": "Variable Window",
    "difficulty": "Medium",
    "title": "Longest Substring with At Most K Distinct Characters",
    "slug": "longest-substring-with-at-most-k-distinct-characters",
    "leetcode_link": "https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters",
    "description": "...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "",
      "python": "",
      "cpp": "",
      "c": "",
      "csharp": ""
    },
    "cpp_signature": {
      "fn": "lengthOfLongestSubstringKDistinct",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Easy",
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "leetcode_link": "https://leetcode.com/problems/valid-parentheses",
    "description": "Given a string s containing just the characters &#39;(&#39;, &#39;)&#39;, &#39;{&#39;, &#39;}&#39;, &#39;[&#39; and &#39;]&#39;, determine if the input string is valid.\n\nAn input string is valid if:\n\n\n\tOpen brackets must be closed by the same type of brackets.\n\tOpen brackets must be closed in the correct order.\n\tEvery close bracket has a corresponding open bracket of the same type.\n\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;()&quot;\n\nOutput: true\n\n\nExample 2:\n\n\nInput: s = &quot;()[]{}&quot;\n\nOutput: true\n\n\nExample 3:\n\n\nInput: s = &quot;(]&quot;\n\nOutput: false\n\n\nExample 4:\n\n\nInput: s = &quot;([])&quot;\n\nOutput: true\n\n\nExample 5:\n\n\nInput: s = &quot;([)]&quot;\n\nOutput: false\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= s.length &lt;= 104\n\ts consists of parentheses only &#39;()[]{}&#39;.\n\n...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def isValid(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};",
      "c": "bool isValid(char* s) {\n    \n}",
      "csharp": "public class Solution {\n    public bool IsValid(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isValid",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Hard",
    "title": "Longest Valid Parentheses",
    "slug": "longest-valid-parentheses",
    "leetcode_link": "https://leetcode.com/problems/longest-valid-parentheses",
    "description": "Given a string containing just the characters &#39;(&#39; and &#39;)&#39;, return the length of the longest valid (well-formed) parentheses substring.\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;(()&quot;\nOutput: 2\nExplanation: The longest valid parentheses substring is &quot;()&quot;.\n\n\nExample 2:\n\n\nInput: s = &quot;)()())&quot;\nOutput: 4\nExplanation: The longest valid parentheses substring is &quot;()()&quot;.\n\n\nExample 3:\n\n\nInput: s = &quot;&quot;\nOutput: 0\n\n\n&nbsp;\nConstraints:\n\n\n\t0 &lt;= s.length &lt;= 3 * 104\n\ts[i] is &#39;(&#39;, or &#39;)&#39;.\n\n...",
    "examples": [
      {
        "input": "s = &quot;(()&quot;",
        "output": "2",
        "explanation": "The longest valid parentheses substring is &quot;()&quot;."
      },
      {
        "input": "s = &quot;)()())&quot;",
        "output": "4",
        "explanation": "The longest valid parentheses substring is &quot;()()&quot;."
      },
      {
        "input": "s = &quot;&quot;",
        "output": "0",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @return {number}\n */\nvar longestValidParentheses = function(s) {\n    \n};",
      "python": "class Solution(object):\n    def longestValidParentheses(self, s):\n        \"\"\"\n        :type s: str\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int longestValidParentheses(string s) {\n        \n    }\n};",
      "c": "int longestValidParentheses(char* s) {\n    \n}",
      "csharp": "public class Solution {\n    public int LongestValidParentheses(string s) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "longestValidParentheses",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "2",
        "hidden": false
      },
      {
        "input": {},
        "expected": "4",
        "hidden": false
      },
      {
        "input": {},
        "expected": "0",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Hard",
    "title": "Trapping Rain Water",
    "slug": "trapping-rain-water",
    "leetcode_link": "https://leetcode.com/problems/trapping-rain-water",
    "description": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\n&nbsp;\nExample 1:\n\n\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\nExplanation: The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped.\n\n\nExample 2:\n\n\nInput: height = [4,2,0,3,2,5]\nOutput: 9\n\n\n&nbsp;\nConstraints:\n\n\n\tn == height.length\n\t1 &lt;= n &lt;= 2 * 104\n\t0 &lt;= height[i] &lt;= 105\n\n...",
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6",
        "explanation": "The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped."
      },
      {
        "input": "height = [4,2,0,3,2,5]",
        "output": "9",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} height\n * @return {number}\n */\nvar trap = function(height) {\n    \n};",
      "python": "class Solution(object):\n    def trap(self, height):\n        \"\"\"\n        :type height: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        \n    }\n};",
      "c": "int trap(int* height, int heightSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int Trap(int[] height) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "trap",
      "class": "Solution",
      "args": [
        {
          "name": "height",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "height": [
            0,
            1,
            0,
            2,
            1,
            0,
            1,
            3,
            2,
            1,
            2,
            1
          ]
        },
        "expected": 6,
        "hidden": false
      },
      {
        "input": {
          "height": [
            4,
            2,
            0,
            3,
            2,
            5
          ]
        },
        "expected": 9,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Medium",
    "title": "Simplify Path",
    "slug": "simplify-path",
    "leetcode_link": "https://leetcode.com/problems/simplify-path",
    "description": "You are given an absolute path for a Unix-style file system, which always begins with a slash &#39;/&#39;. Your task is to transform this absolute path into its simplified canonical path.\n\nThe rules of a Unix-style file system are as follows:\n\n\n\tA single period &#39;.&#39; represents the current directory.\n\tA double period &#39;..&#39; represents the previous/parent directory.\n\tMultiple consecutive slashes such as &#39;//&#39; and &#39;///&#39; are treated as a single slash &#39;/&#39;.\n\tAny sequence of periods that does not match the rules above should be treated as a valid directory or file name. For example, &#39;...&#39; and &#39;....&#39; are valid directory or file names.\n\n\nThe simplified canonical path should follow these rules:\n\n\n\tThe path must start with a single slash &#39;/&#39;...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} path\n * @return {string}\n */\nvar simplifyPath = function(path) {\n    \n};",
      "python": "class Solution(object):\n    def simplifyPath(self, path):\n        \"\"\"\n        :type path: str\n        :rtype: str\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    string simplifyPath(string path) {\n        \n    }\n};",
      "c": "char* simplifyPath(char* path) {\n    \n}",
      "csharp": "public class Solution {\n    public string SimplifyPath(string path) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "simplifyPath",
      "class": "Solution",
      "args": [
        {
          "name": "path",
          "type": "string"
        }
      ],
      "ret": "string"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Hard",
    "title": "Largest Rectangle in Histogram",
    "slug": "largest-rectangle-in-histogram",
    "leetcode_link": "https://leetcode.com/problems/largest-rectangle-in-histogram",
    "description": "Given an array of integers heights representing the histogram&#39;s bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.\n\n&nbsp;\nExample 1:\n\n\nInput: heights = [2,1,5,6,2,3]\nOutput: 10\nExplanation: The above is a histogram where width of each bar is 1.\nThe largest rectangle is shown in the red area, which has an area = 10 units.\n\n\nExample 2:\n\n\nInput: heights = [2,4]\nOutput: 4\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= heights.length &lt;= 105\n\t0 &lt;= heights[i] &lt;= 104\n\n...",
    "examples": [
      {
        "input": "heights = [2,1,5,6,2,3]",
        "output": "10",
        "explanation": "The above is a histogram where width of each bar is 1.\nThe largest rectangle is shown in the red area, which has an area = 10 units."
      },
      {
        "input": "heights = [2,4]",
        "output": "4",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} heights\n * @return {number}\n */\nvar largestRectangleArea = function(heights) {\n    \n};",
      "python": "class Solution(object):\n    def largestRectangleArea(self, heights):\n        \"\"\"\n        :type heights: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int largestRectangleArea(vector<int>& heights) {\n        \n    }\n};",
      "c": "int largestRectangleArea(int* heights, int heightsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int LargestRectangleArea(int[] heights) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "largestRectangleArea",
      "class": "Solution",
      "args": [
        {
          "name": "heights",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "heights": [
            2,
            1,
            5,
            6,
            2,
            3
          ]
        },
        "expected": 10,
        "hidden": false
      },
      {
        "input": {
          "heights": [
            2,
            4
          ]
        },
        "expected": 4,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Hard",
    "title": "Maximal Rectangle",
    "slug": "maximal-rectangle",
    "leetcode_link": "https://leetcode.com/problems/maximal-rectangle",
    "description": "Given a rows x cols&nbsp;binary matrix filled with 0&#39;s and 1&#39;s, find the largest rectangle containing only 1&#39;s and return its area.\n\n&nbsp;\nExample 1:\n\n\nInput: matrix = [[&quot;1&quot;,&quot;0&quot;,&quot;1&quot;,&quot;0&quot;,&quot;0&quot;],[&quot;1&quot;,&quot;0&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;],[&quot;1&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;],[&quot;1&quot;,&quot;0&quot;,&quot;0&quot;,&quot;1&quot;,&quot;0&quot;]]\nOutput: 6\nExplanation: The maximal rectangle is shown in the above picture.\n\n\nExample 2:\n\n\nInput: matrix = [[&quot;0&quot;]]\nOutput: 0\n\n\nExample 3:\n\n\nInput: matrix = [[&quot;1&quot;]]\nOutput: 1\n\n\n&nbsp;\nConstraints:\n\n\n\trows == matrix.length\n\tcols == matrix[i].length\n\t1 &lt;= rows, cols &lt;= 200\n\tmatrix[i][j] is &#39;0&#39; or ...",
    "examples": [
      {
        "input": "matrix = [[&quot;1&quot;,&quot;0&quot;,&quot;1&quot;,&quot;0&quot;,&quot;0&quot;],[&quot;1&quot;,&quot;0&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;],[&quot;1&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;,&quot;1&quot;],[&quot;1&quot;,&quot;0&quot;,&quot;0&quot;,&quot;1&quot;,&quot;0&quot;]]",
        "output": "6",
        "explanation": "The maximal rectangle is shown in the above picture."
      },
      {
        "input": "matrix = [[&quot;0&quot;]]",
        "output": "0",
        "explanation": ""
      },
      {
        "input": "matrix = [[&quot;1&quot;]]",
        "output": "1",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {character[][]} matrix\n * @return {number}\n */\nvar maximalRectangle = function(matrix) {\n    \n};",
      "python": "class Solution(object):\n    def maximalRectangle(self, matrix):\n        \"\"\"\n        :type matrix: List[List[str]]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int maximalRectangle(vector<vector<char>>& matrix) {\n        \n    }\n};",
      "c": "int maximalRectangle(char** matrix, int matrixSize, int* matrixColSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int MaximalRectangle(char[][] matrix) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "maximalRectangle",
      "class": "Solution",
      "args": [
        {
          "name": "matrix",
          "type": "character[][]"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "6",
        "hidden": false
      },
      {
        "input": {},
        "expected": "0",
        "hidden": false
      },
      {
        "input": {},
        "expected": "1",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Easy",
    "title": "Binary Tree Inorder Traversal",
    "slug": "binary-tree-inorder-traversal",
    "leetcode_link": "https://leetcode.com/problems/binary-tree-inorder-traversal",
    "description": "Given the root of a binary tree, return the inorder traversal of its nodes&#39; values.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,null,2,3]\n\nOutput: [1,3,2]\n\nExplanation:\n\n\n\n\nExample 2:\n\n\nInput: root = [1,2,3,4,5,null,8,null,null,6,7,9]\n\nOutput: [4,2,6,5,7,1,3,9,8]\n\nExplanation:\n\n\n\n\nExample 3:\n\n\nInput: root = []\n\nOutput: []\n\n\nExample 4:\n\n\nInput: root = [1]\n\nOutput: [1]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 100].\n\t-100 &lt;= Node.val &lt;= 100\n\n\n&nbsp;\nFollow up: Recursive solution is trivial, could you do it iteratively?...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[]}\n */\nvar inorderTraversal = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def inorderTraversal(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<int> inorderTraversal(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* inorderTraversal(struct TreeNode* root, int* returnSize) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<int> InorderTraversal(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "inorderTraversal",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "list<integer>"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Medium",
    "title": "Flatten Binary Tree to Linked List",
    "slug": "flatten-binary-tree-to-linked-list",
    "leetcode_link": "https://leetcode.com/problems/flatten-binary-tree-to-linked-list",
    "description": "Given the root of a binary tree, flatten the tree into a &quot;linked list&quot;:\n\n\n\tThe &quot;linked list&quot; should use the same TreeNode class where the right child pointer points to the next node in the list and the left child pointer is always null.\n\tThe &quot;linked list&quot; should be in the same order as a pre-order traversal of the binary tree.\n\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,2,5,3,4,null,6]\nOutput: [1,null,2,null,3,null,4,null,5,null,6]\n\n\nExample 2:\n\n\nInput: root = []\nOutput: []\n\n\nExample 3:\n\n\nInput: root = [0]\nOutput: [0]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 2000].\n\t-100 &lt;= Node.val &lt;= 100\n\n\n&nbsp;\nFollow up: Can you flatten the tree in-place (with O(1) extra space)?...",
    "examples": [
      {
        "input": "root = [1,2,5,3,4,null,6]",
        "output": "[1,null,2,null,3,null,4,null,5,null,6]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      },
      {
        "input": "root = [0]",
        "output": "[0]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {void} Do not return anything, modify root in-place instead.\n */\nvar flatten = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def flatten(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: None Do not return anything, modify root in-place instead.\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    void flatten(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nvoid flatten(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public void Flatten(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "flatten",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "void"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            1,
            2,
            5,
            3,
            4,
            null,
            6
          ]
        },
        "expected": [
          1,
          null,
          2,
          null,
          3,
          null,
          4,
          null,
          5,
          null,
          6
        ],
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      },
      {
        "input": {
          "root": [
            0
          ]
        },
        "expected": [
          0
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Medium",
    "title": "Reorder List",
    "slug": "reorder-list",
    "leetcode_link": "https://leetcode.com/problems/reorder-list",
    "description": "You are given the head of a singly linked-list. The list can be represented as:\n\n\nL0 &rarr; L1 &rarr; &hellip; &rarr; Ln - 1 &rarr; Ln\n\n\nReorder the list to be on the following form:\n\n\nL0 &rarr; Ln &rarr; L1 &rarr; Ln - 1 &rarr; L2 &rarr; Ln - 2 &rarr; &hellip;\n\n\nYou may not modify the values in the list&#39;s nodes. Only nodes themselves may be changed.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,4]\nOutput: [1,4,2,3]\n\n\nExample 2:\n\n\nInput: head = [1,2,3,4,5]\nOutput: [1,5,2,4,3]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is in the range [1, 5 * 104].\n\t1 &lt;= Node.val &lt;= 1000\n\n...",
    "examples": [
      {
        "input": "head = [1,2,3,4]",
        "output": "[1,4,2,3]",
        "explanation": ""
      },
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[1,5,2,4,3]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {void} Do not return anything, modify head in-place instead.\n */\nvar reorderList = function(head) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def reorderList(self, head):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :rtype: None Do not return anything, modify head in-place instead.\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    void reorderList(ListNode* head) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nvoid reorderList(struct ListNode* head) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public void ReorderList(ListNode head) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "reorderList",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        }
      ],
      "ret": "void"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4
          ]
        },
        "expected": [
          1,
          4,
          2,
          3
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4,
            5
          ]
        },
        "expected": [
          1,
          5,
          2,
          4,
          3
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Stack",
    "pattern": "Monotonic Stack",
    "difficulty": "Easy",
    "title": "Binary Tree Preorder Traversal",
    "slug": "binary-tree-preorder-traversal",
    "leetcode_link": "https://leetcode.com/problems/binary-tree-preorder-traversal",
    "description": "Given the root of a binary tree, return the preorder traversal of its nodes&#39; values.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,null,2,3]\n\nOutput: [1,2,3]\n\nExplanation:\n\n\n\n\nExample 2:\n\n\nInput: root = [1,2,3,4,5,null,8,null,null,6,7,9]\n\nOutput: [1,2,4,5,6,7,3,8,9]\n\nExplanation:\n\n\n\n\nExample 3:\n\n\nInput: root = []\n\nOutput: []\n\n\nExample 4:\n\n\nInput: root = [1]\n\nOutput: [1]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 100].\n\t-100 &lt;= Node.val &lt;= 100\n\n\n&nbsp;\nFollow up: Recursive solution is trivial, could you do it iteratively?\n...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[]}\n */\nvar preorderTraversal = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def preorderTraversal(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<int> preorderTraversal(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* preorderTraversal(struct TreeNode* root, int* returnSize) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<int> PreorderTraversal(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "preorderTraversal",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "list<integer>"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Hard",
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "leetcode_link": "https://leetcode.com/problems/median-of-two-sorted-arrays",
    "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).\n\n&nbsp;\nExample 1:\n\n\nInput: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000\nExplanation: merged array = [1,2,3] and median is 2.\n\n\nExample 2:\n\n\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.50000\nExplanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.\n\n\n&nbsp;\nConstraints:\n\n\n\tnums1.length == m\n\tnums2.length == n\n\t0 &lt;= m &lt;= 1000\n\t0 &lt;= n &lt;= 1000\n\t1 &lt;= m + n &lt;= 2000\n\t-106 &lt;= nums1[i], nums2[i] &lt;= 106\n\n...",
    "examples": [
      {
        "input": "nums1 = [1,3], nums2 = [2]",
        "output": "2.00000",
        "explanation": "merged array = [1,2,3] and median is 2."
      },
      {
        "input": "nums1 = [1,2], nums2 = [3,4]",
        "output": "2.50000",
        "explanation": "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums1\n * @param {number[]} nums2\n * @return {number}\n */\nvar findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
      "python": "class Solution(object):\n    def findMedianSortedArrays(self, nums1, nums2):\n        \"\"\"\n        :type nums1: List[int]\n        :type nums2: List[int]\n        :rtype: float\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        \n    }\n};",
      "c": "double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {\n    \n}",
      "csharp": "public class Solution {\n    public double FindMedianSortedArrays(int[] nums1, int[] nums2) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findMedianSortedArrays",
      "class": "Solution",
      "args": [
        {
          "name": "nums1",
          "type": "vector<int>"
        },
        {
          "name": "nums2",
          "type": "vector<int>"
        }
      ],
      "ret": "double"
    },
    "test_cases": [
      {
        "input": {
          "nums1": [
            1,
            3
          ],
          "nums2": [
            2
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums1": [
            1,
            2
          ],
          "nums2": [
            3,
            4
          ]
        },
        "expected": 2.5,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "leetcode_link": "https://leetcode.com/problems/search-in-rotated-sorted-array",
    "description": "There is an integer array nums sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, nums is possibly left rotated at an unknown index k (1 &lt;= k &lt; nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,5,6,7] might be left rotated by&nbsp;3&nbsp;indices and become [4,5,6,7,0,1,2].\n\nGiven the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\n&nbsp;\nExample 1:\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4\nExample 2:\nInput: nums = [4,5,6,7,0,1,2], target = 3\nOutput: -1\nExample 3:\nInput: nums = [1], targ...",
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0",
        "output": "4",
        "explanation": ""
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3",
        "output": "-1",
        "explanation": ""
      },
      {
        "input": "nums = [1], target = 0",
        "output": "-1",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nvar search = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def search(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "int search(int* nums, int numsSize, int target) {\n    \n}",
      "csharp": "public class Solution {\n    public int Search(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "search",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            4,
            5,
            6,
            7,
            0,
            1,
            2
          ],
          "target": 0
        },
        "expected": 4,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            4,
            5,
            6,
            7,
            0,
            1,
            2
          ],
          "target": 3
        },
        "expected": -1,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1
          ],
          "target": 0
        },
        "expected": -1,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Find First and Last Position of Element in Sorted Array",
    "slug": "find-first-and-last-position-of-element-in-sorted-array",
    "leetcode_link": "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array",
    "description": "Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value.\n\nIf target is not found in the array, return [-1, -1].\n\nYou must&nbsp;write an algorithm with&nbsp;O(log n) runtime complexity.\n\n&nbsp;\nExample 1:\nInput: nums = [5,7,7,8,8,10], target = 8\nOutput: [3,4]\nExample 2:\nInput: nums = [5,7,7,8,8,10], target = 6\nOutput: [-1,-1]\nExample 3:\nInput: nums = [], target = 0\nOutput: [-1,-1]\n\n&nbsp;\nConstraints:\n\n\n\t0 &lt;= nums.length &lt;= 105\n\t-109&nbsp;&lt;= nums[i]&nbsp;&lt;= 109\n\tnums is a non-decreasing array.\n\t-109&nbsp;&lt;= target&nbsp;&lt;= 109\n\n...",
    "examples": [
      {
        "input": "nums = [5,7,7,8,8,10], target = 8",
        "output": "[3,4]",
        "explanation": ""
      },
      {
        "input": "nums = [5,7,7,8,8,10], target = 6",
        "output": "[-1,-1]",
        "explanation": ""
      },
      {
        "input": "nums = [], target = 0",
        "output": "[-1,-1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar searchRange = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def searchRange(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: List[int]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<int> searchRange(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* searchRange(int* nums, int numsSize, int target, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int[] SearchRange(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "searchRange",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "vector<int>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            5,
            7,
            7,
            8,
            8,
            10
          ],
          "target": 8
        },
        "expected": [
          3,
          4
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            5,
            7,
            7,
            8,
            8,
            10
          ],
          "target": 6
        },
        "expected": [
          -1,
          -1
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [],
          "target": 0
        },
        "expected": [
          -1,
          -1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Easy",
    "title": "Search Insert Position",
    "slug": "search-insert-position",
    "leetcode_link": "https://leetcode.com/problems/search-insert-position",
    "description": "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.\n\nYou must&nbsp;write an algorithm with&nbsp;O(log n) runtime complexity.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,3,5,6], target = 5\nOutput: 2\n\n\nExample 2:\n\n\nInput: nums = [1,3,5,6], target = 2\nOutput: 1\n\n\nExample 3:\n\n\nInput: nums = [1,3,5,6], target = 7\nOutput: 4\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 104\n\t-104 &lt;= nums[i] &lt;= 104\n\tnums contains distinct values sorted in ascending order.\n\t-104 &lt;= target &lt;= 104\n\n...",
    "examples": [
      {
        "input": "nums = [1,3,5,6], target = 5",
        "output": "2",
        "explanation": ""
      },
      {
        "input": "nums = [1,3,5,6], target = 2",
        "output": "1",
        "explanation": ""
      },
      {
        "input": "nums = [1,3,5,6], target = 7",
        "output": "4",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nvar searchInsert = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def searchInsert(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int searchInsert(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "int searchInsert(int* nums, int numsSize, int target) {\n    \n}",
      "csharp": "public class Solution {\n    public int SearchInsert(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "searchInsert",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            3,
            5,
            6
          ],
          "target": 5
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            3,
            5,
            6
          ],
          "target": 2
        },
        "expected": 1,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            3,
            5,
            6
          ],
          "target": 7
        },
        "expected": 4,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Easy",
    "title": "Sqrt(x)",
    "slug": "sqrtx",
    "leetcode_link": "https://leetcode.com/problems/sqrtx",
    "description": "Given a non-negative integer x, return the square root of x rounded down to the nearest integer. The returned integer should be non-negative as well.\n\nYou must not use any built-in exponent function or operator.\n\n\n\tFor example, do not use pow(x, 0.5) in c++ or x ** 0.5 in python.\n\n\n&nbsp;\nExample 1:\n\n\nInput: x = 4\nOutput: 2\nExplanation: The square root of 4 is 2, so we return 2.\n\n\nExample 2:\n\n\nInput: x = 8\nOutput: 2\nExplanation: The square root of 8 is 2.82842..., and since we round it down to the nearest integer, 2 is returned.\n\n\n&nbsp;\nConstraints:\n\n\n\t0 &lt;= x &lt;= 231 - 1\n\n...",
    "examples": [
      {
        "input": "x = 4",
        "output": "2",
        "explanation": "The square root of 4 is 2, so we return 2."
      },
      {
        "input": "x = 8",
        "output": "2",
        "explanation": "The square root of 8 is 2.82842..., and since we round it down to the nearest integer, 2 is returned."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} x\n * @return {number}\n */\nvar mySqrt = function(x) {\n    \n};",
      "python": "class Solution(object):\n    def mySqrt(self, x):\n        \"\"\"\n        :type x: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int mySqrt(int x) {\n        \n    }\n};",
      "c": "int mySqrt(int x) {\n    \n}",
      "csharp": "public class Solution {\n    public int MySqrt(int x) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "mySqrt",
      "class": "Solution",
      "args": [
        {
          "name": "x",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "x": 4
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "x": 8
        },
        "expected": 2,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Search a 2D Matrix",
    "slug": "search-a-2d-matrix",
    "leetcode_link": "https://leetcode.com/problems/search-a-2d-matrix",
    "description": "You are given an m x n integer matrix matrix with the following two properties:\n\n\n\tEach row is sorted in non-decreasing order.\n\tThe first integer of each row is greater than the last integer of the previous row.\n\n\nGiven an integer target, return true if target is in matrix or false otherwise.\n\nYou must write a solution in O(log(m * n)) time complexity.\n\n&nbsp;\nExample 1:\n\n\nInput: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3\nOutput: true\n\n\nExample 2:\n\n\nInput: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13\nOutput: false\n\n\n&nbsp;\nConstraints:\n\n\n\tm == matrix.length\n\tn == matrix[i].length\n\t1 &lt;= m, n &lt;= 100\n\t-104 &lt;= matrix[i][j], target &lt;= 104\n\n...",
    "examples": [
      {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13",
        "output": "false",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[][]} matrix\n * @param {number} target\n * @return {boolean}\n */\nvar searchMatrix = function(matrix, target) {\n    \n};",
      "python": "class Solution(object):\n    def searchMatrix(self, matrix, target):\n        \"\"\"\n        :type matrix: List[List[int]]\n        :type target: int\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool searchMatrix(vector<vector<int>>& matrix, int target) {\n        \n    }\n};",
      "c": "bool searchMatrix(int** matrix, int matrixSize, int* matrixColSize, int target) {\n    \n}",
      "csharp": "public class Solution {\n    public bool SearchMatrix(int[][] matrix, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "searchMatrix",
      "class": "Solution",
      "args": [
        {
          "name": "matrix",
          "type": "vector<vector<int>>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "matrix": [
            [
              1,
              3,
              5,
              7
            ],
            [
              10,
              11,
              16,
              20
            ],
            [
              23,
              30,
              34,
              60
            ]
          ],
          "target": 3
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "matrix": [
            [
              1,
              3,
              5,
              7
            ],
            [
              10,
              11,
              16,
              20
            ],
            [
              23,
              30,
              34,
              60
            ]
          ],
          "target": 13
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Search in Rotated Sorted Array II",
    "slug": "search-in-rotated-sorted-array-ii",
    "leetcode_link": "https://leetcode.com/problems/search-in-rotated-sorted-array-ii",
    "description": "There is an integer array nums sorted in non-decreasing order (not necessarily with distinct values).\n\nBefore being passed to your function, nums is rotated at an unknown pivot index k (0 &lt;= k &lt; nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,4,4,5,6,6,7] might be rotated at pivot index 5 and become [4,5,6,6,7,0,1,2,4,4].\n\nGiven the array nums after the rotation and an integer target, return true if target is in nums, or false if it is not in nums.\n\nYou must decrease the overall operation steps as much as possible.\n\n&nbsp;\nExample 1:\nInput: nums = [2,5,6,0,0,1,2], target = 0\nOutput: true\nExample 2:\nInput: nums = [2,5,6,0,0,1,2], target = 3\nOutput: false\n\n&nbsp;\nConstraints:\n\n\n\t1 &l...",
    "examples": [
      {
        "input": "nums = [2,5,6,0,0,1,2], target = 0",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "nums = [2,5,6,0,0,1,2], target = 3",
        "output": "false",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {boolean}\n */\nvar search = function(nums, target) {\n    \n};",
      "python": "class Solution(object):\n    def search(self, nums, target):\n        \"\"\"\n        :type nums: List[int]\n        :type target: int\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool search(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "bool search(int* nums, int numsSize, int target) {\n    \n}",
      "csharp": "public class Solution {\n    public bool Search(int[] nums, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "search",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            2,
            5,
            6,
            0,
            0,
            1,
            2
          ],
          "target": 0
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            2,
            5,
            6,
            0,
            0,
            1,
            2
          ],
          "target": 3
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "leetcode_link": "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array",
    "description": "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. For example, the array nums = [0,1,2,4,5,6,7] might become:\n\n\n\t[4,5,6,7,0,1,2] if it was rotated 4 times.\n\t[0,1,2,4,5,6,7] if it was rotated 7 times.\n\n\nNotice that rotating an array [a[0], a[1], a[2], ..., a[n-1]] 1 time results in the array [a[n-1], a[0], a[1], a[2], ..., a[n-2]].\n\nGiven the sorted rotated array nums of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in&nbsp;O(log n) time.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [3,4,5,1,2]\nOutput: 1\nExplanation: The original array was [1,2,3,4,5] rotated 3 times.\n\n\nExample 2:\n\n\nInput: nums = [4,5,6,7,0,1,2]\nOutput: 0\nExplanation: The original array was [0,1,2,4,5,6,7] and it was rotated 4 times.\n\n\nExample ...",
    "examples": [
      {
        "input": "nums = [3,4,5,1,2]",
        "output": "1",
        "explanation": "The original array was [1,2,3,4,5] rotated 3 times."
      },
      {
        "input": "nums = [4,5,6,7,0,1,2]",
        "output": "0",
        "explanation": "The original array was [0,1,2,4,5,6,7] and it was rotated 4 times."
      },
      {
        "input": "nums = [11,13,15,17]",
        "output": "11",
        "explanation": "The original array was [11,13,15,17] and it was rotated 4 times."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar findMin = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def findMin(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        \n    }\n};",
      "c": "int findMin(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int FindMin(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findMin",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            3,
            4,
            5,
            1,
            2
          ]
        },
        "expected": 1,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            4,
            5,
            6,
            7,
            0,
            1,
            2
          ]
        },
        "expected": 0,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            11,
            13,
            15,
            17
          ]
        },
        "expected": 11,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Hard",
    "title": "Find Minimum in Rotated Sorted Array II",
    "slug": "find-minimum-in-rotated-sorted-array-ii",
    "leetcode_link": "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii",
    "description": "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. For example, the array nums = [0,1,4,4,5,6,7] might become:\n\n\n\t[4,5,6,7,0,1,4] if it was rotated 4 times.\n\t[0,1,4,4,5,6,7] if it was rotated 7 times.\n\n\nNotice that rotating an array [a[0], a[1], a[2], ..., a[n-1]] 1 time results in the array [a[n-1], a[0], a[1], a[2], ..., a[n-2]].\n\nGiven the sorted rotated array nums that may contain duplicates, return the minimum element of this array.\n\nYou must decrease the overall operation steps as much as possible.\n\n&nbsp;\nExample 1:\nInput: nums = [1,3,5]\nOutput: 1\nExample 2:\nInput: nums = [2,2,2,0,1]\nOutput: 0\n\n&nbsp;\nConstraints:\n\n\n\tn == nums.length\n\t1 &lt;= n &lt;= 5000\n\t-5000 &lt;= nums[i] &lt;= 5000\n\tnums is sorted and rotated between 1 and n times.\n\n\n&nbsp;...",
    "examples": [
      {
        "input": "nums = [1,3,5]",
        "output": "1",
        "explanation": ""
      },
      {
        "input": "nums = [2,2,2,0,1]",
        "output": "0",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar findMin = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def findMin(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        \n    }\n};",
      "c": "int findMin(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int FindMin(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findMin",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            3,
            5
          ]
        },
        "expected": 1,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            2,
            2,
            2,
            0,
            1
          ]
        },
        "expected": 0,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Binary Search",
    "pattern": "Search in Rotated",
    "difficulty": "Medium",
    "title": "Find Peak Element",
    "slug": "find-peak-element",
    "leetcode_link": "https://leetcode.com/problems/find-peak-element",
    "description": "A peak element is an element that is strictly greater than its neighbors.\n\nGiven a 0-indexed integer array nums, find a peak element, and return its index. If the array contains multiple peaks, return the index to any of the peaks.\n\nYou may imagine that nums[-1] = nums[n] = -&infin;. In other words, an element is always considered to be strictly greater than a neighbor that is outside the array.\n\nYou must write an algorithm that runs in O(log n) time.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,2,3,1]\nOutput: 2\nExplanation: 3 is a peak element and your function should return the index number 2.\n\nExample 2:\n\n\nInput: nums = [1,2,1,3,5,6,4]\nOutput: 5\nExplanation: Your function can return either index number 1 where the peak element is 2, or index number 5 where the peak element is 6.\n\n&nbsp;\nConstr...",
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "2",
        "explanation": "3 is a peak element and your function should return the index number 2."
      },
      {
        "input": "nums = [1,2,1,3,5,6,4]",
        "output": "5",
        "explanation": "Your function can return either index number 1 where the peak element is 2, or index number 5 where the peak element is 6."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar findPeakElement = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def findPeakElement(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int findPeakElement(vector<int>& nums) {\n        \n    }\n};",
      "c": "int findPeakElement(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int FindPeakElement(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "findPeakElement",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            3,
            1
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            2,
            1,
            3,
            5,
            6,
            4
          ]
        },
        "expected": 5,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Medium",
    "title": "Add Two Numbers",
    "slug": "add-two-numbers",
    "leetcode_link": "https://leetcode.com/problems/add-two-numbers",
    "description": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum&nbsp;as a linked list.\n\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.\n\n&nbsp;\nExample 1:\n\n\nInput: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]\nExplanation: 342 + 465 = 807.\n\n\nExample 2:\n\n\nInput: l1 = [0], l2 = [0]\nOutput: [0]\n\n\nExample 3:\n\n\nInput: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]\nOutput: [8,9,9,9,0,0,0,1]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in each linked list is in the range [1, 100].\n\t0 &lt;= Node.val &lt;= 9\n\tIt is guaranteed that the list represents a number that does not have leading zeros.\n\n...",
    "examples": [
      {
        "input": "l1 = [2,4,3], l2 = [5,6,4]",
        "output": "[7,0,8]",
        "explanation": "342 + 465 = 807."
      },
      {
        "input": "l1 = [0], l2 = [0]",
        "output": "[0]",
        "explanation": ""
      },
      {
        "input": "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]",
        "output": "[8,9,9,9,0,0,0,1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} l1\n * @param {ListNode} l2\n * @return {ListNode}\n */\nvar addTwoNumbers = function(l1, l2) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def addTwoNumbers(self, l1, l2):\n        \"\"\"\n        :type l1: Optional[ListNode]\n        :type l2: Optional[ListNode]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* addTwoNumbers(struct ListNode* l1, struct ListNode* l2) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode AddTwoNumbers(ListNode l1, ListNode l2) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "addTwoNumbers",
      "class": "Solution",
      "args": [
        {
          "name": "l1",
          "type": "ListNode"
        },
        {
          "name": "l2",
          "type": "ListNode"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "l1": [
            2,
            4,
            3
          ],
          "l2": [
            5,
            6,
            4
          ]
        },
        "expected": [
          7,
          0,
          8
        ],
        "hidden": false
      },
      {
        "input": {
          "l1": [
            0
          ],
          "l2": [
            0
          ]
        },
        "expected": [
          0
        ],
        "hidden": false
      },
      {
        "input": {
          "l1": [
            9,
            9,
            9,
            9,
            9,
            9,
            9
          ],
          "l2": [
            9,
            9,
            9,
            9
          ]
        },
        "expected": [
          8,
          9,
          9,
          9,
          0,
          0,
          0,
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Easy",
    "title": "Merge Two Sorted Lists",
    "slug": "merge-two-sorted-lists",
    "leetcode_link": "https://leetcode.com/problems/merge-two-sorted-lists",
    "description": "You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n&nbsp;\nExample 1:\n\n\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n\n\nExample 2:\n\n\nInput: list1 = [], list2 = []\nOutput: []\n\n\nExample 3:\n\n\nInput: list1 = [], list2 = [0]\nOutput: [0]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in both lists is in the range [0, 50].\n\t-100 &lt;= Node.val &lt;= 100\n\tBoth list1 and list2 are sorted in non-decreasing order.\n\n...",
    "examples": [
      {
        "input": "list1 = [1,2,4], list2 = [1,3,4]",
        "output": "[1,1,2,3,4,4]",
        "explanation": ""
      },
      {
        "input": "list1 = [], list2 = []",
        "output": "[]",
        "explanation": ""
      },
      {
        "input": "list1 = [], list2 = [0]",
        "output": "[0]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} list1\n * @param {ListNode} list2\n * @return {ListNode}\n */\nvar mergeTwoLists = function(list1, list2) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def mergeTwoLists(self, list1, list2):\n        \"\"\"\n        :type list1: Optional[ListNode]\n        :type list2: Optional[ListNode]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* mergeTwoLists(struct ListNode* list1, struct ListNode* list2) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode MergeTwoLists(ListNode list1, ListNode list2) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "mergeTwoLists",
      "class": "Solution",
      "args": [
        {
          "name": "list1",
          "type": "ListNode"
        },
        {
          "name": "list2",
          "type": "ListNode"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "list1": [
            1,
            2,
            4
          ],
          "list2": [
            1,
            3,
            4
          ]
        },
        "expected": [
          1,
          1,
          2,
          3,
          4,
          4
        ],
        "hidden": false
      },
      {
        "input": {
          "list1": [],
          "list2": []
        },
        "expected": [],
        "hidden": false
      },
      {
        "input": {
          "list1": [],
          "list2": [
            0
          ]
        },
        "expected": [
          0
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Hard",
    "title": "Merge k Sorted Lists",
    "slug": "merge-k-sorted-lists",
    "leetcode_link": "https://leetcode.com/problems/merge-k-sorted-lists",
    "description": "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.\n\n&nbsp;\nExample 1:\n\n\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\nExplanation: The linked-lists are:\n[\n  1-&gt;4-&gt;5,\n  1-&gt;3-&gt;4,\n  2-&gt;6\n]\nmerging them into one sorted linked list:\n1-&gt;1-&gt;2-&gt;3-&gt;4-&gt;4-&gt;5-&gt;6\n\n\nExample 2:\n\n\nInput: lists = []\nOutput: []\n\n\nExample 3:\n\n\nInput: lists = [[]]\nOutput: []\n\n\n&nbsp;\nConstraints:\n\n\n\tk == lists.length\n\t0 &lt;= k &lt;= 104\n\t0 &lt;= lists[i].length &lt;= 500\n\t-104 &lt;= lists[i][j] &lt;= 104\n\tlists[i] is sorted in ascending order.\n\tThe sum of lists[i].length will not exceed 104.\n\n...",
    "examples": [
      {
        "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
        "output": "[1,1,2,3,4,4,5,6]",
        "explanation": "The linked-lists are:\n[\n  1-&gt;4-&gt;5,\n  1-&gt;3-&gt;4,\n  2-&gt;6\n]\nmerging them into one sorted linked list:\n1-&gt;1-&gt;2-&gt;3-&gt;4-&gt;4-&gt;5-&gt;6"
      },
      {
        "input": "lists = []",
        "output": "[]",
        "explanation": ""
      },
      {
        "input": "lists = [[]]",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode[]} lists\n * @return {ListNode}\n */\nvar mergeKLists = function(lists) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def mergeKLists(self, lists):\n        \"\"\"\n        :type lists: List[Optional[ListNode]]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* mergeKLists(struct ListNode** lists, int listsSize) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode MergeKLists(ListNode[] lists) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "mergeKLists",
      "class": "Solution",
      "args": [
        {
          "name": "lists",
          "type": "ListNode[]"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "lists": [
            [
              1,
              4,
              5
            ],
            [
              1,
              3,
              4
            ],
            [
              2,
              6
            ]
          ]
        },
        "expected": [
          1,
          1,
          2,
          3,
          4,
          4,
          5,
          6
        ],
        "hidden": false
      },
      {
        "input": {
          "lists": []
        },
        "expected": [],
        "hidden": false
      },
      {
        "input": {
          "lists": [
            []
          ]
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Medium",
    "title": "Swap Nodes in Pairs",
    "slug": "swap-nodes-in-pairs",
    "leetcode_link": "https://leetcode.com/problems/swap-nodes-in-pairs",
    "description": "Given a&nbsp;linked list, swap every two adjacent nodes and return its head. You must solve the problem without&nbsp;modifying the values in the list&#39;s nodes (i.e., only nodes themselves may be changed.)\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,4]\n\nOutput: [2,1,4,3]\n\nExplanation:\n\n\n\n\nExample 2:\n\n\nInput: head = []\n\nOutput: []\n\n\nExample 3:\n\n\nInput: head = [1]\n\nOutput: [1]\n\n\nExample 4:\n\n\nInput: head = [1,2,3]\n\nOutput: [2,1,3]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the&nbsp;list&nbsp;is in the range [0, 100].\n\t0 &lt;= Node.val &lt;= 100\n\n...",
    "examples": [],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar swapPairs = function(head) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def swapPairs(self, head):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* swapPairs(ListNode* head) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* swapPairs(struct ListNode* head) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode SwapPairs(ListNode head) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "swapPairs",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {},
        "expected": {},
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Hard",
    "title": "Reverse Nodes in k-Group",
    "slug": "reverse-nodes-in-k-group",
    "leetcode_link": "https://leetcode.com/problems/reverse-nodes-in-k-group",
    "description": "Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.\n\nk is a positive integer and is less than or equal to the length of the linked list. If the number of nodes is not a multiple of k then left-out nodes, in the end, should remain as it is.\n\nYou may not alter the values in the list&#39;s nodes, only nodes themselves may be changed.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,4,5], k = 2\nOutput: [2,1,4,3,5]\n\n\nExample 2:\n\n\nInput: head = [1,2,3,4,5], k = 3\nOutput: [3,2,1,4,5]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is n.\n\t1 &lt;= k &lt;= n &lt;= 5000\n\t0 &lt;= Node.val &lt;= 1000\n\n\n&nbsp;\nFollow-up: Can you solve the problem in O(1) extra memory space?\n...",
    "examples": [
      {
        "input": "head = [1,2,3,4,5], k = 2",
        "output": "[2,1,4,3,5]",
        "explanation": ""
      },
      {
        "input": "head = [1,2,3,4,5], k = 3",
        "output": "[3,2,1,4,5]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @param {number} k\n * @return {ListNode}\n */\nvar reverseKGroup = function(head, k) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def reverseKGroup(self, head, k):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :type k: int\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* reverseKGroup(ListNode* head, int k) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* reverseKGroup(struct ListNode* head, int k) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode ReverseKGroup(ListNode head, int k) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "reverseKGroup",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4,
            5
          ],
          "k": 2
        },
        "expected": [
          2,
          1,
          4,
          3,
          5
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4,
            5
          ],
          "k": 3
        },
        "expected": [
          3,
          2,
          1,
          4,
          5
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Medium",
    "title": "Rotate List",
    "slug": "rotate-list",
    "leetcode_link": "https://leetcode.com/problems/rotate-list",
    "description": "Given the head of a linked&nbsp;list, rotate the list to the right by k places.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,4,5], k = 2\nOutput: [4,5,1,2,3]\n\n\nExample 2:\n\n\nInput: head = [0,1,2], k = 4\nOutput: [2,0,1]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is in the range [0, 500].\n\t-100 &lt;= Node.val &lt;= 100\n\t0 &lt;= k &lt;= 2 * 109\n\n...",
    "examples": [
      {
        "input": "head = [1,2,3,4,5], k = 2",
        "output": "[4,5,1,2,3]",
        "explanation": ""
      },
      {
        "input": "head = [0,1,2], k = 4",
        "output": "[2,0,1]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @param {number} k\n * @return {ListNode}\n */\nvar rotateRight = function(head, k) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def rotateRight(self, head, k):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :type k: int\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* rotateRight(ListNode* head, int k) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* rotateRight(struct ListNode* head, int k) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode RotateRight(ListNode head, int k) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "rotateRight",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            2,
            3,
            4,
            5
          ],
          "k": 2
        },
        "expected": [
          4,
          5,
          1,
          2,
          3
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            0,
            1,
            2
          ],
          "k": 4
        },
        "expected": [
          2,
          0,
          1
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Medium",
    "title": "Remove Duplicates from Sorted List II",
    "slug": "remove-duplicates-from-sorted-list-ii",
    "leetcode_link": "https://leetcode.com/problems/remove-duplicates-from-sorted-list-ii",
    "description": "Given the head of a sorted linked list, delete all nodes that have duplicate numbers, leaving only distinct numbers from the original list. Return the linked list sorted as well.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,2,3,3,4,4,5]\nOutput: [1,2,5]\n\n\nExample 2:\n\n\nInput: head = [1,1,1,2,3]\nOutput: [2,3]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is in the range [0, 300].\n\t-100 &lt;= Node.val &lt;= 100\n\tThe list is guaranteed to be sorted in ascending order.\n\n...",
    "examples": [
      {
        "input": "head = [1,2,3,3,4,4,5]",
        "output": "[1,2,5]",
        "explanation": ""
      },
      {
        "input": "head = [1,1,1,2,3]",
        "output": "[2,3]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar deleteDuplicates = function(head) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def deleteDuplicates(self, head):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* deleteDuplicates(ListNode* head) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* deleteDuplicates(struct ListNode* head) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode DeleteDuplicates(ListNode head) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "deleteDuplicates",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            2,
            3,
            3,
            4,
            4,
            5
          ]
        },
        "expected": [
          1,
          2,
          5
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1,
            1,
            1,
            2,
            3
          ]
        },
        "expected": [
          2,
          3
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Easy",
    "title": "Remove Duplicates from Sorted List",
    "slug": "remove-duplicates-from-sorted-list",
    "leetcode_link": "https://leetcode.com/problems/remove-duplicates-from-sorted-list",
    "description": "Given the head of a sorted linked list, delete all duplicates such that each element appears only once. Return the linked list sorted as well.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,1,2]\nOutput: [1,2]\n\n\nExample 2:\n\n\nInput: head = [1,1,2,3,3]\nOutput: [1,2,3]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is in the range [0, 300].\n\t-100 &lt;= Node.val &lt;= 100\n\tThe list is guaranteed to be sorted in ascending order.\n\n...",
    "examples": [
      {
        "input": "head = [1,1,2]",
        "output": "[1,2]",
        "explanation": ""
      },
      {
        "input": "head = [1,1,2,3,3]",
        "output": "[1,2,3]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar deleteDuplicates = function(head) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def deleteDuplicates(self, head):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* deleteDuplicates(ListNode* head) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* deleteDuplicates(struct ListNode* head) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode DeleteDuplicates(ListNode head) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "deleteDuplicates",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            1,
            2
          ]
        },
        "expected": [
          1,
          2
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            1,
            1,
            2,
            3,
            3
          ]
        },
        "expected": [
          1,
          2,
          3
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Linked List",
    "pattern": "Reversal",
    "difficulty": "Medium",
    "title": "Partition List",
    "slug": "partition-list",
    "leetcode_link": "https://leetcode.com/problems/partition-list",
    "description": "Given the head of a linked list and a value x, partition it such that all nodes less than x come before nodes greater than or equal to x.\n\nYou should preserve the original relative order of the nodes in each of the two partitions.\n\n&nbsp;\nExample 1:\n\n\nInput: head = [1,4,3,2,5,2], x = 3\nOutput: [1,2,2,4,3,5]\n\n\nExample 2:\n\n\nInput: head = [2,1], x = 2\nOutput: [1,2]\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the list is in the range [0, 200].\n\t-100 &lt;= Node.val &lt;= 100\n\t-200 &lt;= x &lt;= 200\n\n...",
    "examples": [
      {
        "input": "head = [1,4,3,2,5,2], x = 3",
        "output": "[1,2,2,4,3,5]",
        "explanation": ""
      },
      {
        "input": "head = [2,1], x = 2",
        "output": "[1,2]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @param {number} x\n * @return {ListNode}\n */\nvar partition = function(head, x) {\n    \n};",
      "python": "# Definition for singly-linked list.\n# class ListNode(object):\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution(object):\n    def partition(self, head, x):\n        \"\"\"\n        :type head: Optional[ListNode]\n        :type x: int\n        :rtype: Optional[ListNode]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* partition(ListNode* head, int x) {\n        \n    }\n};",
      "c": "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* partition(struct ListNode* head, int x) {\n    \n}",
      "csharp": "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     public int val;\n *     public ListNode next;\n *     public ListNode(int val=0, ListNode next=null) {\n *         this.val = val;\n *         this.next = next;\n *     }\n * }\n */\npublic class Solution {\n    public ListNode Partition(ListNode head, int x) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "partition",
      "class": "Solution",
      "args": [
        {
          "name": "head",
          "type": "ListNode"
        },
        {
          "name": "x",
          "type": "int"
        }
      ],
      "ret": "ListNode"
    },
    "test_cases": [
      {
        "input": {
          "head": [
            1,
            4,
            3,
            2,
            5,
            2
          ],
          "x": 3
        },
        "expected": [
          1,
          2,
          2,
          4,
          3,
          5
        ],
        "hidden": false
      },
      {
        "input": {
          "head": [
            2,
            1
          ],
          "x": 2
        },
        "expected": [
          1,
          2
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Unique Binary Search Trees II",
    "slug": "unique-binary-search-trees-ii",
    "leetcode_link": "https://leetcode.com/problems/unique-binary-search-trees-ii",
    "description": "Given an integer n, return all the structurally unique BST&#39;s (binary search trees), which has exactly n nodes of unique values from 1 to n. Return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: n = 3\nOutput: [[1,null,2,null,3],[1,null,3,2],[2,1,3],[3,1,null,null,2],[3,2,null,1]]\n\n\nExample 2:\n\n\nInput: n = 1\nOutput: [[1]]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 8\n\n...",
    "examples": [
      {
        "input": "n = 3",
        "output": "[[1,null,2,null,3],[1,null,3,2],[2,1,3],[3,1,null,null,2],[3,2,null,1]]",
        "explanation": ""
      },
      {
        "input": "n = 1",
        "output": "[[1]]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {number} n\n * @return {TreeNode[]}\n */\nvar generateTrees = function(n) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def generateTrees(self, n):\n        \"\"\"\n        :type n: int\n        :rtype: List[Optional[TreeNode]]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<TreeNode*> generateTrees(int n) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nstruct TreeNode** generateTrees(int n, int* returnSize) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<TreeNode> GenerateTrees(int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "generateTrees",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "list<TreeNode>"
    },
    "test_cases": [
      {
        "input": {
          "n": 3
        },
        "expected": [
          [
            1,
            null,
            2,
            null,
            3
          ],
          [
            1,
            null,
            3,
            2
          ],
          [
            2,
            1,
            3
          ],
          [
            3,
            1,
            null,
            null,
            2
          ],
          [
            3,
            2,
            null,
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "n": 1
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Unique Binary Search Trees",
    "slug": "unique-binary-search-trees",
    "leetcode_link": "https://leetcode.com/problems/unique-binary-search-trees",
    "description": "Given an integer n, return the number of structurally unique BST&#39;s (binary search trees) which has exactly n nodes of unique values from 1 to n.\n\n&nbsp;\nExample 1:\n\n\nInput: n = 3\nOutput: 5\n\n\nExample 2:\n\n\nInput: n = 1\nOutput: 1\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 19\n\n...",
    "examples": [
      {
        "input": "n = 3",
        "output": "5",
        "explanation": ""
      },
      {
        "input": "n = 1",
        "output": "1",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} n\n * @return {number}\n */\nvar numTrees = function(n) {\n    \n};",
      "python": "class Solution(object):\n    def numTrees(self, n):\n        \"\"\"\n        :type n: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int numTrees(int n) {\n        \n    }\n};",
      "c": "int numTrees(int n) {\n    \n}",
      "csharp": "public class Solution {\n    public int NumTrees(int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "numTrees",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "n": 3
        },
        "expected": 5,
        "hidden": false
      },
      {
        "input": {
          "n": 1
        },
        "expected": 1,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "leetcode_link": "https://leetcode.com/problems/validate-binary-search-tree",
    "description": "Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n\n\n\tThe left subtree of a node contains only nodes with keys&nbsp;strictly less than the node&#39;s key.\n\tThe right subtree of a node contains only nodes with keys strictly greater than the node&#39;s key.\n\tBoth the left and right subtrees must also be binary search trees.\n\n\n&nbsp;\nExample 1:\n\n\nInput: root = [2,1,3]\nOutput: true\n\n\nExample 2:\n\n\nInput: root = [5,1,4,null,null,3,6]\nOutput: false\nExplanation: The root node&#39;s value is 5 but its right child&#39;s value is 4.\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [1, 104].\n\t-231 &lt;= Node.val &lt;= 231 - 1\n\n...",
    "examples": [
      {
        "input": "root = [2,1,3]",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "root = [5,1,4,null,null,3,6]",
        "output": "false",
        "explanation": "The root node&#39;s value is 5 but its right child&#39;s value is 4."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {boolean}\n */\nvar isValidBST = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def isValidBST(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nbool isValidBST(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public bool IsValidBST(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isValidBST",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            2,
            1,
            3
          ]
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "root": [
            5,
            1,
            4,
            null,
            null,
            3,
            6
          ]
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Recover Binary Search Tree",
    "slug": "recover-binary-search-tree",
    "leetcode_link": "https://leetcode.com/problems/recover-binary-search-tree",
    "description": "You are given the root of a binary search tree (BST), where the values of exactly two nodes of the tree were swapped by mistake. Recover the tree without changing its structure.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,3,null,null,2]\nOutput: [3,1,null,null,2]\nExplanation: 3 cannot be a left child of 1 because 3 &gt; 1. Swapping 1 and 3 makes the BST valid.\n\n\nExample 2:\n\n\nInput: root = [3,1,4,null,null,2]\nOutput: [2,1,4,null,null,3]\nExplanation: 2 cannot be in the right subtree of 3 because 2 &lt; 3. Swapping 2 and 3 makes the BST valid.\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [2, 1000].\n\t-231 &lt;= Node.val &lt;= 231 - 1\n\n\n&nbsp;\nFollow up: A solution using O(n) space is pretty straight-forward. Could you devise a constant O(1) space solution?...",
    "examples": [
      {
        "input": "root = [1,3,null,null,2]",
        "output": "[3,1,null,null,2]",
        "explanation": "3 cannot be a left child of 1 because 3 &gt; 1. Swapping 1 and 3 makes the BST valid."
      },
      {
        "input": "root = [3,1,4,null,null,2]",
        "output": "[2,1,4,null,null,3]",
        "explanation": "2 cannot be in the right subtree of 3 because 2 &lt; 3. Swapping 2 and 3 makes the BST valid."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {void} Do not return anything, modify root in-place instead.\n */\nvar recoverTree = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def recoverTree(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: None Do not return anything, modify root in-place instead.\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    void recoverTree(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nvoid recoverTree(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public void RecoverTree(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "recoverTree",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "void"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            1,
            3,
            null,
            null,
            2
          ]
        },
        "expected": [
          3,
          1,
          null,
          null,
          2
        ],
        "hidden": false
      },
      {
        "input": {
          "root": [
            3,
            1,
            4,
            null,
            null,
            2
          ]
        },
        "expected": [
          2,
          1,
          4,
          null,
          null,
          3
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Easy",
    "title": "Same Tree",
    "slug": "same-tree",
    "leetcode_link": "https://leetcode.com/problems/same-tree",
    "description": "Given the roots of two binary trees p and q, write a function to check if they are the same or not.\n\nTwo binary trees are considered the same if they are structurally identical, and the nodes have the same value.\n\n&nbsp;\nExample 1:\n\n\nInput: p = [1,2,3], q = [1,2,3]\nOutput: true\n\n\nExample 2:\n\n\nInput: p = [1,2], q = [1,null,2]\nOutput: false\n\n\nExample 3:\n\n\nInput: p = [1,2,1], q = [1,1,2]\nOutput: false\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in both trees is in the range [0, 100].\n\t-104 &lt;= Node.val &lt;= 104\n\n...",
    "examples": [
      {
        "input": "p = [1,2,3], q = [1,2,3]",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "p = [1,2], q = [1,null,2]",
        "output": "false",
        "explanation": ""
      },
      {
        "input": "p = [1,2,1], q = [1,1,2]",
        "output": "false",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} p\n * @param {TreeNode} q\n * @return {boolean}\n */\nvar isSameTree = function(p, q) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def isSameTree(self, p, q):\n        \"\"\"\n        :type p: Optional[TreeNode]\n        :type q: Optional[TreeNode]\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    bool isSameTree(TreeNode* p, TreeNode* q) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nbool isSameTree(struct TreeNode* p, struct TreeNode* q) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public bool IsSameTree(TreeNode p, TreeNode q) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isSameTree",
      "class": "Solution",
      "args": [
        {
          "name": "p",
          "type": "TreeNode"
        },
        {
          "name": "q",
          "type": "TreeNode"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "p": [
            1,
            2,
            3
          ],
          "q": [
            1,
            2,
            3
          ]
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "p": [
            1,
            2
          ],
          "q": [
            1,
            null,
            2
          ]
        },
        "expected": false,
        "hidden": false
      },
      {
        "input": {
          "p": [
            1,
            2,
            1
          ],
          "q": [
            1,
            1,
            2
          ]
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Easy",
    "title": "Symmetric Tree",
    "slug": "symmetric-tree",
    "leetcode_link": "https://leetcode.com/problems/symmetric-tree",
    "description": "Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,2,2,3,4,4,3]\nOutput: true\n\n\nExample 2:\n\n\nInput: root = [1,2,2,null,3,null,3]\nOutput: false\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [1, 1000].\n\t-100 &lt;= Node.val &lt;= 100\n\n\n&nbsp;\nFollow up: Could you solve it both recursively and iteratively?...",
    "examples": [
      {
        "input": "root = [1,2,2,3,4,4,3]",
        "output": "true",
        "explanation": ""
      },
      {
        "input": "root = [1,2,2,null,3,null,3]",
        "output": "false",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {boolean}\n */\nvar isSymmetric = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def isSymmetric(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    bool isSymmetric(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nbool isSymmetric(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public bool IsSymmetric(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isSymmetric",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            1,
            2,
            2,
            3,
            4,
            4,
            3
          ]
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "root": [
            1,
            2,
            2,
            null,
            3,
            null,
            3
          ]
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "leetcode_link": "https://leetcode.com/problems/binary-tree-level-order-traversal",
    "description": "Given the root of a binary tree, return the level order traversal of its nodes&#39; values. (i.e., from left to right, level by level).\n\n&nbsp;\nExample 1:\n\n\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]\n\n\nExample 2:\n\n\nInput: root = [1]\nOutput: [[1]]\n\n\nExample 3:\n\n\nInput: root = []\nOutput: []\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 2000].\n\t-1000 &lt;= Node.val &lt;= 1000\n\n...",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[3],[9,20],[15,7]]",
        "explanation": ""
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[][]}\n */\nvar levelOrder = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def levelOrder(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** levelOrder(struct TreeNode* root, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<IList<int>> LevelOrder(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "levelOrder",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            3,
            9,
            20,
            null,
            null,
            15,
            7
          ]
        },
        "expected": [
          [
            3
          ],
          [
            9,
            20
          ],
          [
            15,
            7
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": [
            1
          ]
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Medium",
    "title": "Binary Tree Zigzag Level Order Traversal",
    "slug": "binary-tree-zigzag-level-order-traversal",
    "leetcode_link": "https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal",
    "description": "Given the root of a binary tree, return the zigzag level order traversal of its nodes&#39; values. (i.e., from left to right, then right to left for the next level and alternate between).\n\n&nbsp;\nExample 1:\n\n\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[20,9],[15,7]]\n\n\nExample 2:\n\n\nInput: root = [1]\nOutput: [[1]]\n\n\nExample 3:\n\n\nInput: root = []\nOutput: []\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 2000].\n\t-100 &lt;= Node.val &lt;= 100\n\n...",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[3],[20,9],[15,7]]",
        "explanation": ""
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[][]}\n */\nvar zigzagLevelOrder = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def zigzagLevelOrder(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<vector<int>> zigzagLevelOrder(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** zigzagLevelOrder(struct TreeNode* root, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<IList<int>> ZigzagLevelOrder(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "zigzagLevelOrder",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            3,
            9,
            20,
            null,
            null,
            15,
            7
          ]
        },
        "expected": [
          [
            3
          ],
          [
            20,
            9
          ],
          [
            15,
            7
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": [
            1
          ]
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Trees",
    "pattern": "DFS",
    "difficulty": "Easy",
    "title": "Maximum Depth of Binary Tree",
    "slug": "maximum-depth-of-binary-tree",
    "leetcode_link": "https://leetcode.com/problems/maximum-depth-of-binary-tree",
    "description": "Given the root of a binary tree, return its maximum depth.\n\nA binary tree&#39;s maximum depth&nbsp;is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3\n\n\nExample 2:\n\n\nInput: root = [1,null,2]\nOutput: 2\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 104].\n\t-100 &lt;= Node.val &lt;= 100\n\n...",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "3",
        "explanation": ""
      },
      {
        "input": "root = [1,null,2]",
        "output": "2",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number}\n */\nvar maxDepth = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def maxDepth(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nint maxDepth(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public int MaxDepth(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "maxDepth",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            3,
            9,
            20,
            null,
            null,
            15,
            7
          ]
        },
        "expected": 3,
        "hidden": false
      },
      {
        "input": {
          "root": [
            1,
            null,
            2
          ]
        },
        "expected": 2,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Graphs",
    "pattern": "BFS",
    "difficulty": "Medium",
    "title": "Binary Tree Level Order Traversal II",
    "slug": "binary-tree-level-order-traversal-ii",
    "leetcode_link": "https://leetcode.com/problems/binary-tree-level-order-traversal-ii",
    "description": "Given the root of a binary tree, return the bottom-up level order traversal of its nodes&#39; values. (i.e., from left to right, level by level from leaf to root).\n\n&nbsp;\nExample 1:\n\n\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[15,7],[9,20],[3]]\n\n\nExample 2:\n\n\nInput: root = [1]\nOutput: [[1]]\n\n\nExample 3:\n\n\nInput: root = []\nOutput: []\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 2000].\n\t-1000 &lt;= Node.val &lt;= 1000\n\n...",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[15,7],[9,20],[3]]",
        "explanation": ""
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[][]}\n */\nvar levelOrderBottom = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def levelOrderBottom(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    vector<vector<int>> levelOrderBottom(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\n/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** levelOrderBottom(struct TreeNode* root, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public IList<IList<int>> LevelOrderBottom(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "levelOrderBottom",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            3,
            9,
            20,
            null,
            null,
            15,
            7
          ]
        },
        "expected": [
          [
            15,
            7
          ],
          [
            9,
            20
          ],
          [
            3
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": [
            1
          ]
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Graphs",
    "pattern": "BFS",
    "difficulty": "Easy",
    "title": "Minimum Depth of Binary Tree",
    "slug": "minimum-depth-of-binary-tree",
    "leetcode_link": "https://leetcode.com/problems/minimum-depth-of-binary-tree",
    "description": "Given a binary tree, find its minimum depth.\n\nThe minimum depth is the number of nodes along the shortest path from the root node down to the nearest leaf node.\n\nNote:&nbsp;A leaf is a node with no children.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [3,9,20,null,null,15,7]\nOutput: 2\n\n\nExample 2:\n\n\nInput: root = [2,null,3,null,4,null,5,null,6]\nOutput: 5\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 105].\n\t-1000 &lt;= Node.val &lt;= 1000\n\n...",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "2",
        "explanation": ""
      },
      {
        "input": "root = [2,null,3,null,4,null,5,null,6]",
        "output": "5",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number}\n */\nvar minDepth = function(root) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def minDepth(self, root):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    int minDepth(TreeNode* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nint minDepth(struct TreeNode* root) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public int MinDepth(TreeNode root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "minDepth",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            3,
            9,
            20,
            null,
            null,
            15,
            7
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "root": [
            2,
            null,
            3,
            null,
            4,
            null,
            5,
            null,
            6
          ]
        },
        "expected": 5,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Graphs",
    "pattern": "BFS",
    "difficulty": "Easy",
    "title": "Path Sum",
    "slug": "path-sum",
    "leetcode_link": "https://leetcode.com/problems/path-sum",
    "description": "Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.\n\nA leaf is a node with no children.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22\nOutput: true\nExplanation: The root-to-leaf path with the target sum is shown.\n\n\nExample 2:\n\n\nInput: root = [1,2,3], targetSum = 5\nOutput: false\nExplanation: There are two root-to-leaf paths in the tree:\n(1 --&gt; 2): The sum is 3.\n(1 --&gt; 3): The sum is 4.\nThere is no root-to-leaf path with sum = 5.\n\n\nExample 3:\n\n\nInput: root = [], targetSum = 0\nOutput: false\nExplanation: Since the tree is empty, there are no root-to-leaf paths.\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in...",
    "examples": [
      {
        "input": "root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22",
        "output": "true",
        "explanation": "The root-to-leaf path with the target sum is shown."
      },
      {
        "input": "root = [1,2,3], targetSum = 5",
        "output": "false",
        "explanation": "There are two root-to-leaf paths in the tree:\n(1 --&gt; 2): The sum is 3.\n(1 --&gt; 3): The sum is 4.\nThere is no root-to-leaf path with sum = 5."
      },
      {
        "input": "root = [], targetSum = 0",
        "output": "false",
        "explanation": "Since the tree is empty, there are no root-to-leaf paths."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @param {number} targetSum\n * @return {boolean}\n */\nvar hasPathSum = function(root, targetSum) {\n    \n};",
      "python": "# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution(object):\n    def hasPathSum(self, root, targetSum):\n        \"\"\"\n        :type root: Optional[TreeNode]\n        :type targetSum: int\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    bool hasPathSum(TreeNode* root, int targetSum) {\n        \n    }\n};",
      "c": "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     struct TreeNode *left;\n *     struct TreeNode *right;\n * };\n */\nbool hasPathSum(struct TreeNode* root, int targetSum) {\n    \n}",
      "csharp": "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\npublic class Solution {\n    public bool HasPathSum(TreeNode root, int targetSum) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "hasPathSum",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        },
        {
          "name": "targetSum",
          "type": "int"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            5,
            4,
            8,
            11,
            null,
            13,
            4,
            7,
            2,
            null,
            null,
            null,
            1
          ],
          "targetSum": 22
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "root": [
            1,
            2,
            3
          ],
          "targetSum": 5
        },
        "expected": false,
        "hidden": false
      },
      {
        "input": {
          "root": [],
          "targetSum": 0
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Graphs",
    "pattern": "BFS",
    "difficulty": "Medium",
    "title": "Populating Next Right Pointers in Each Node",
    "slug": "populating-next-right-pointers-in-each-node",
    "leetcode_link": "https://leetcode.com/problems/populating-next-right-pointers-in-each-node",
    "description": "You are given a perfect binary tree where all leaves are on the same level, and every parent has two children. The binary tree has the following definition:\n\n\nstruct Node {\n  int val;\n  Node *left;\n  Node *right;\n  Node *next;\n}\n\n\nPopulate each next pointer to point to its next right node. If there is no next right node, the next pointer should be set to NULL.\n\nInitially, all next pointers are set to NULL.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,2,3,4,5,6,7]\nOutput: [1,#,2,3,#,4,5,6,7,#]\nExplanation: Given the above perfect binary tree (Figure A), your function should populate each next pointer to point to its next right node, just like in Figure B. The serialized output is in level order as connected by the next pointers, with &#39;#&#39; signifying the end of each level.\n\n\nExample 2:\n\n\nInp...",
    "examples": [
      {
        "input": "root = [1,2,3,4,5,6,7]",
        "output": "[1,#,2,3,#,4,5,6,7,#]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * // Definition for a _Node.\n * function _Node(val, left, right, next) {\n *    this.val = val === undefined ? null : val;\n *    this.left = left === undefined ? null : left;\n *    this.right = right === undefined ? null : right;\n *    this.next = next === undefined ? null : next;\n * };\n */\n\n/**\n * @param {_Node} root\n * @return {_Node}\n */\nvar connect = function(root) {\n    \n};",
      "python": "\"\"\"\n# Definition for a Node.\nclass Node(object):\n    def __init__(self, val=0, left=None, right=None, next=None):\n        self.val = val\n        self.left = left\n        self.right = right\n        self.next = next\n\"\"\"\n\nclass Solution(object):\n    def connect(self, root):\n        \"\"\"\n        :type root: Node\n        :rtype: Node\n        \"\"\"\n        ",
      "cpp": "/*\n// Definition for a Node.\nclass Node {\npublic:\n    int val;\n    Node* left;\n    Node* right;\n    Node* next;\n\n    Node() : val(0), left(NULL), right(NULL), next(NULL) {}\n\n    Node(int _val) : val(_val), left(NULL), right(NULL), next(NULL) {}\n\n    Node(int _val, Node* _left, Node* _right, Node* _next)\n        : val(_val), left(_left), right(_right), next(_next) {}\n};\n*/\n\nclass Solution {\npublic:\n    Node* connect(Node* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a Node.\n * struct Node {\n *     int val;\n *     struct Node *left;\n *     struct Node *right;\n *     struct Node *next;\n * };\n */\n\nstruct Node* connect(struct Node* root) {\n\t\n}",
      "csharp": "/*\n// Definition for a Node.\npublic class Node {\n    public int val;\n    public Node left;\n    public Node right;\n    public Node next;\n\n    public Node() {}\n\n    public Node(int _val) {\n        val = _val;\n    }\n\n    public Node(int _val, Node _left, Node _right, Node _next) {\n        val = _val;\n        left = _left;\n        right = _right;\n        next = _next;\n    }\n}\n*/\n\npublic class Solution {\n    public Node Connect(Node root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "connect",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "TreeNode"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            1,
            2,
            3,
            4,
            5,
            6,
            7
          ]
        },
        "expected": "[1,#,2,3,#,4,5,6,7,#]",
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Graphs",
    "pattern": "BFS",
    "difficulty": "Medium",
    "title": "Populating Next Right Pointers in Each Node II",
    "slug": "populating-next-right-pointers-in-each-node-ii",
    "leetcode_link": "https://leetcode.com/problems/populating-next-right-pointers-in-each-node-ii",
    "description": "Given a binary tree\n\n\nstruct Node {\n  int val;\n  Node *left;\n  Node *right;\n  Node *next;\n}\n\n\nPopulate each next pointer to point to its next right node. If there is no next right node, the next pointer should be set to NULL.\n\nInitially, all next pointers are set to NULL.\n\n&nbsp;\nExample 1:\n\n\nInput: root = [1,2,3,4,5,null,7]\nOutput: [1,#,2,3,#,4,5,7,#]\nExplanation: Given the above binary tree (Figure A), your function should populate each next pointer to point to its next right node, just like in Figure B. The serialized output is in level order as connected by the next pointers, with &#39;#&#39; signifying the end of each level.\n\n\nExample 2:\n\n\nInput: root = []\nOutput: []\n\n\n&nbsp;\nConstraints:\n\n\n\tThe number of nodes in the tree is in the range [0, 6000].\n\t-100 &lt;= Node.val &lt;= 100\n\n\n&n...",
    "examples": [
      {
        "input": "root = [1,2,3,4,5,null,7]",
        "output": "[1,#,2,3,#,4,5,7,#]",
        "explanation": ""
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * // Definition for a _Node.\n * function _Node(val, left, right, next) {\n *    this.val = val === undefined ? null : val;\n *    this.left = left === undefined ? null : left;\n *    this.right = right === undefined ? null : right;\n *    this.next = next === undefined ? null : next;\n * };\n */\n\n/**\n * @param {_Node} root\n * @return {_Node}\n */\nvar connect = function(root) {\n    \n};",
      "python": "\"\"\"\n# Definition for a Node.\nclass Node(object):\n    def __init__(self, val=0, left=None, right=None, next=None):\n        self.val = val\n        self.left = left\n        self.right = right\n        self.next = next\n\"\"\"\n\nclass Solution(object):\n    def connect(self, root):\n        \"\"\"\n        :type root: Node\n        :rtype: Node\n        \"\"\"\n        ",
      "cpp": "/*\n// Definition for a Node.\nclass Node {\npublic:\n    int val;\n    Node* left;\n    Node* right;\n    Node* next;\n\n    Node() : val(0), left(NULL), right(NULL), next(NULL) {}\n\n    Node(int _val) : val(_val), left(NULL), right(NULL), next(NULL) {}\n\n    Node(int _val, Node* _left, Node* _right, Node* _next)\n        : val(_val), left(_left), right(_right), next(_next) {}\n};\n*/\n\nclass Solution {\npublic:\n    Node* connect(Node* root) {\n        \n    }\n};",
      "c": "/**\n * Definition for a Node.\n * struct Node {\n *     int val;\n *     struct Node *left;\n *     struct Node *right;\n *     struct Node *next;\n * };\n */\n\nstruct Node* connect(struct Node* root) {\n\t\n}",
      "csharp": "/*\n// Definition for a Node.\npublic class Node {\n    public int val;\n    public Node left;\n    public Node right;\n    public Node next;\n\n    public Node() {}\n\n    public Node(int _val) {\n        val = _val;\n    }\n\n    public Node(int _val, Node _left, Node _right, Node _next) {\n        val = _val;\n        left = _left;\n        right = _right;\n        next = _next;\n    }\n}\n*/\n\npublic class Solution {\n    public Node Connect(Node root) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "connect",
      "class": "Solution",
      "args": [
        {
          "name": "root",
          "type": "TreeNode"
        }
      ],
      "ret": "TreeNode"
    },
    "test_cases": [
      {
        "input": {
          "root": [
            1,
            2,
            3,
            4,
            5,
            null,
            7
          ]
        },
        "expected": "[1,#,2,3,#,4,5,7,#]",
        "hidden": false
      },
      {
        "input": {
          "root": []
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Hard",
    "title": "Regular Expression Matching",
    "slug": "regular-expression-matching",
    "leetcode_link": "https://leetcode.com/problems/regular-expression-matching",
    "description": "Given an input string s&nbsp;and a pattern p, implement regular expression matching with support for &#39;.&#39; and &#39;*&#39; where:\n\n\n\t&#39;.&#39; Matches any single character.​​​​\n\t&#39;*&#39; Matches zero or more of the preceding element.\n\n\nReturn a boolean indicating whether the matching covers the entire input string (not partial).\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;aa&quot;, p = &quot;a&quot;\nOutput: false\nExplanation: &quot;a&quot; does not match the entire string &quot;aa&quot;.\n\n\nExample 2:\n\n\nInput: s = &quot;aa&quot;, p = &quot;a*&quot;\nOutput: true\nExplanation: &#39;*&#39; means zero or more of the preceding element, &#39;a&#39;. Therefore, by repeating &#39;a&#39; once, it becomes &quot;aa&quot;.\n\n\nExample 3:\n\n\nInput: s = &quot;ab&quot;, p = &quot;.*&quot;\nOutput: true\nEx...",
    "examples": [
      {
        "input": "s = &quot;aa&quot;, p = &quot;a&quot;",
        "output": "false",
        "explanation": "&quot;a&quot; does not match the entire string &quot;aa&quot;."
      },
      {
        "input": "s = &quot;aa&quot;, p = &quot;a*&quot;",
        "output": "true",
        "explanation": "&#39;*&#39; means zero or more of the preceding element, &#39;a&#39;. Therefore, by repeating &#39;a&#39; once, it becomes &quot;aa&quot;."
      },
      {
        "input": "s = &quot;ab&quot;, p = &quot;.*&quot;",
        "output": "true",
        "explanation": "&quot;.*&quot; means &quot;zero or more (*) of any character (.)&quot;."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @param {string} p\n * @return {boolean}\n */\nvar isMatch = function(s, p) {\n    \n};",
      "python": "class Solution(object):\n    def isMatch(self, s, p):\n        \"\"\"\n        :type s: str\n        :type p: str\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool isMatch(string s, string p) {\n        \n    }\n};",
      "c": "bool isMatch(char* s, char* p) {\n    \n}",
      "csharp": "public class Solution {\n    public bool IsMatch(string s, string p) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isMatch",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        },
        {
          "name": "p",
          "type": "string"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "false",
        "hidden": false
      },
      {
        "input": {},
        "expected": "true",
        "hidden": false
      },
      {
        "input": {},
        "expected": "true",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Medium",
    "title": "Generate Parentheses",
    "slug": "generate-parentheses",
    "leetcode_link": "https://leetcode.com/problems/generate-parentheses",
    "description": "Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.\n\n&nbsp;\nExample 1:\nInput: n = 3\nOutput: [\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]\nExample 2:\nInput: n = 1\nOutput: [\"()\"]\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 8\n\n...",
    "examples": [
      {
        "input": "n = 3",
        "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]",
        "explanation": ""
      },
      {
        "input": "n = 1",
        "output": "[\"()\"]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} n\n * @return {string[]}\n */\nvar generateParenthesis = function(n) {\n    \n};",
      "python": "class Solution(object):\n    def generateParenthesis(self, n):\n        \"\"\"\n        :type n: int\n        :rtype: List[str]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<string> generateParenthesis(int n) {\n        \n    }\n};",
      "c": "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nchar** generateParenthesis(int n, int* returnSize) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<string> GenerateParenthesis(int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "generateParenthesis",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "list<string>"
    },
    "test_cases": [
      {
        "input": {
          "n": 3
        },
        "expected": [
          "((()))",
          "(()())",
          "(())()",
          "()(())",
          "()()()"
        ],
        "hidden": false
      },
      {
        "input": {
          "n": 1
        },
        "expected": [
          "()"
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Hard",
    "title": "Wildcard Matching",
    "slug": "wildcard-matching",
    "leetcode_link": "https://leetcode.com/problems/wildcard-matching",
    "description": "Given an input string (s) and a pattern (p), implement wildcard pattern matching with support for &#39;?&#39; and &#39;*&#39; where:\n\n\n\t&#39;?&#39; Matches any single character.\n\t&#39;*&#39; Matches any sequence of characters (including the empty sequence).\n\n\nThe matching should cover the entire input string (not partial).\n\n&nbsp;\nExample 1:\n\n\nInput: s = &quot;aa&quot;, p = &quot;a&quot;\nOutput: false\nExplanation: &quot;a&quot; does not match the entire string &quot;aa&quot;.\n\n\nExample 2:\n\n\nInput: s = &quot;aa&quot;, p = &quot;*&quot;\nOutput: true\nExplanation:&nbsp;&#39;*&#39; matches any sequence.\n\n\nExample 3:\n\n\nInput: s = &quot;cb&quot;, p = &quot;?a&quot;\nOutput: false\nExplanation:&nbsp;&#39;?&#39; matches &#39;c&#39;, but the second letter is &#39;a&#39;, which does not match &#39;b&#3...",
    "examples": [
      {
        "input": "s = &quot;aa&quot;, p = &quot;a&quot;",
        "output": "false",
        "explanation": "&quot;a&quot; does not match the entire string &quot;aa&quot;."
      },
      {
        "input": "s = &quot;aa&quot;, p = &quot;*&quot;",
        "output": "true",
        "explanation": "&nbsp;&#39;*&#39; matches any sequence."
      },
      {
        "input": "s = &quot;cb&quot;, p = &quot;?a&quot;",
        "output": "false",
        "explanation": "&nbsp;&#39;?&#39; matches &#39;c&#39;, but the second letter is &#39;a&#39;, which does not match &#39;b&#39;."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {string} s\n * @param {string} p\n * @return {boolean}\n */\nvar isMatch = function(s, p) {\n    \n};",
      "python": "class Solution(object):\n    def isMatch(self, s, p):\n        \"\"\"\n        :type s: str\n        :type p: str\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool isMatch(string s, string p) {\n        \n    }\n};",
      "c": "bool isMatch(char* s, char* p) {\n    \n}",
      "csharp": "public class Solution {\n    public bool IsMatch(string s, string p) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "isMatch",
      "class": "Solution",
      "args": [
        {
          "name": "s",
          "type": "string"
        },
        {
          "name": "p",
          "type": "string"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {},
        "expected": "false",
        "hidden": false
      },
      {
        "input": {},
        "expected": "true",
        "hidden": false
      },
      {
        "input": {},
        "expected": "false",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Medium",
    "title": "Jump Game II",
    "slug": "jump-game-ii",
    "leetcode_link": "https://leetcode.com/problems/jump-game-ii",
    "description": "You are given a 0-indexed array of integers nums of length n. You are initially positioned at&nbsp;index 0.\n\nEach element nums[i] represents the maximum length of a forward jump from index i. In other words, if you are at index i, you can jump to any index (i + j)&nbsp;where:\n\n\n\t0 &lt;= j &lt;= nums[i] and\n\ti + j &lt; n\n\n\nReturn the minimum number of jumps to reach index n - 1. The test cases are generated such that you can reach index&nbsp;n - 1.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [2,3,1,1,4]\nOutput: 2\nExplanation: The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index.\n\n\nExample 2:\n\n\nInput: nums = [2,3,0,1,4]\nOutput: 2\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 104\n\t0 &lt;= nums[i] &lt;= 1000\n\tIt&#39;s guaranteed th...",
    "examples": [
      {
        "input": "nums = [2,3,1,1,4]",
        "output": "2",
        "explanation": "The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index."
      },
      {
        "input": "nums = [2,3,0,1,4]",
        "output": "2",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar jump = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def jump(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int jump(vector<int>& nums) {\n        \n    }\n};",
      "c": "int jump(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int Jump(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "jump",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            2,
            3,
            1,
            1,
            4
          ]
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            2,
            3,
            0,
            1,
            4
          ]
        },
        "expected": 2,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Medium",
    "title": "Maximum Subarray",
    "slug": "maximum-subarray",
    "leetcode_link": "https://leetcode.com/problems/maximum-subarray",
    "description": "Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n\n\nExample 2:\n\n\nInput: nums = [1]\nOutput: 1\nExplanation: The subarray [1] has the largest sum 1.\n\n\nExample 3:\n\n\nInput: nums = [5,4,-1,7,8]\nOutput: 23\nExplanation: The subarray [5,4,-1,7,8] has the largest sum 23.\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 105\n\t-104 &lt;= nums[i] &lt;= 104\n\n\n&nbsp;\nFollow up: If you have figured out the O(n) solution, try coding another solution using the divide and conquer approach, which is more subtle.\n...",
    "examples": [
      {
        "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum 6."
      },
      {
        "input": "nums = [1]",
        "output": "1",
        "explanation": "The subarray [1] has the largest sum 1."
      },
      {
        "input": "nums = [5,4,-1,7,8]",
        "output": "23",
        "explanation": "The subarray [5,4,-1,7,8] has the largest sum 23."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar maxSubArray = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def maxSubArray(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        \n    }\n};",
      "c": "int maxSubArray(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public int MaxSubArray(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "maxSubArray",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            -2,
            1,
            -3,
            4,
            -1,
            2,
            1,
            -5,
            4
          ]
        },
        "expected": 6,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1
          ]
        },
        "expected": 1,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            5,
            4,
            -1,
            7,
            8
          ]
        },
        "expected": 23,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Medium",
    "title": "Jump Game",
    "slug": "jump-game",
    "leetcode_link": "https://leetcode.com/problems/jump-game",
    "description": "You are given an integer array nums. You are initially positioned at the array&#39;s first index, and each element in the array represents your maximum jump length at that position.\n\nReturn true if you can reach the last index, or false otherwise.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [2,3,1,1,4]\nOutput: true\nExplanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.\n\n\nExample 2:\n\n\nInput: nums = [3,2,1,0,4]\nOutput: false\nExplanation: You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index.\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 104\n\t0 &lt;= nums[i] &lt;= 105\n\n...",
    "examples": [
      {
        "input": "nums = [2,3,1,1,4]",
        "output": "true",
        "explanation": "Jump 1 step from index 0 to 1, then 3 steps to the last index."
      },
      {
        "input": "nums = [3,2,1,0,4]",
        "output": "false",
        "explanation": "You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {boolean}\n */\nvar canJump = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def canJump(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: bool\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    bool canJump(vector<int>& nums) {\n        \n    }\n};",
      "c": "bool canJump(int* nums, int numsSize) {\n    \n}",
      "csharp": "public class Solution {\n    public bool CanJump(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "canJump",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "bool"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            2,
            3,
            1,
            1,
            4
          ]
        },
        "expected": true,
        "hidden": false
      },
      {
        "input": {
          "nums": [
            3,
            2,
            1,
            0,
            4
          ]
        },
        "expected": false,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Dynamic Programming",
    "pattern": "1D DP",
    "difficulty": "Medium",
    "title": "Unique Paths",
    "slug": "unique-paths",
    "leetcode_link": "https://leetcode.com/problems/unique-paths",
    "description": "There is a robot on an m x n grid. The robot is initially located at the top-left corner (i.e., grid[0][0]). The robot tries to move to the bottom-right corner (i.e., grid[m - 1][n - 1]). The robot can only move either down or right at any point in time.\n\nGiven the two integers m and n, return the number of possible unique paths that the robot can take to reach the bottom-right corner.\n\nThe test cases are generated so that the answer will be less than or equal to 2 * 109.\n\n&nbsp;\nExample 1:\n\n\nInput: m = 3, n = 7\nOutput: 28\n\n\nExample 2:\n\n\nInput: m = 3, n = 2\nOutput: 3\nExplanation: From the top-left corner, there are a total of 3 ways to reach the bottom-right corner:\n1. Right -&gt; Down -&gt; Down\n2. Down -&gt; Down -&gt; Right\n3. Down -&gt; Right -&gt; Down\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;=...",
    "examples": [
      {
        "input": "m = 3, n = 7",
        "output": "28",
        "explanation": ""
      },
      {
        "input": "m = 3, n = 2",
        "output": "3",
        "explanation": "From the top-left corner, there are a total of 3 ways to reach the bottom-right corner:\n1. Right -&gt; Down -&gt; Down\n2. Down -&gt; Down -&gt; Right\n3. Down -&gt; Right -&gt; Down"
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} m\n * @param {number} n\n * @return {number}\n */\nvar uniquePaths = function(m, n) {\n    \n};",
      "python": "class Solution(object):\n    def uniquePaths(self, m, n):\n        \"\"\"\n        :type m: int\n        :type n: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        \n    }\n};",
      "c": "int uniquePaths(int m, int n) {\n    \n}",
      "csharp": "public class Solution {\n    public int UniquePaths(int m, int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "uniquePaths",
      "class": "Solution",
      "args": [
        {
          "name": "m",
          "type": "int"
        },
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "m": 3,
          "n": 7
        },
        "expected": 28,
        "hidden": false
      },
      {
        "input": {
          "m": 3,
          "n": 2
        },
        "expected": 3,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Medium",
    "title": "Combination Sum",
    "slug": "combination-sum",
    "leetcode_link": "https://leetcode.com/problems/combination-sum",
    "description": "Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. You may return the combinations in any order.\n\nThe same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.\n\nThe test cases are generated such that the number of unique combinations that sum up to target is less than 150 combinations for the given input.\n\n&nbsp;\nExample 1:\n\n\nInput: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]\nExplanation:\n2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.\n7 is a candidate, and 7 = 7.\nThese are the only two combinations.\n\n\nExample 2:\n\n\n...",
    "examples": [
      {
        "input": "candidates = [2,3,6,7], target = 7",
        "output": "[[2,2,3],[7]]",
        "explanation": "2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.\n7 is a candidate, and 7 = 7.\nThese are the only two combinations."
      },
      {
        "input": "candidates = [2,3,5], target = 8",
        "output": "[[2,2,2,2],[2,3,3],[3,5]]",
        "explanation": ""
      },
      {
        "input": "candidates = [2], target = 1",
        "output": "[]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} candidates\n * @param {number} target\n * @return {number[][]}\n */\nvar combinationSum = function(candidates, target) {\n    \n};",
      "python": "class Solution(object):\n    def combinationSum(self, candidates, target):\n        \"\"\"\n        :type candidates: List[int]\n        :type target: int\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** combinationSum(int* candidates, int candidatesSize, int target, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> CombinationSum(int[] candidates, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "combinationSum",
      "class": "Solution",
      "args": [
        {
          "name": "candidates",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "candidates": [
            2,
            3,
            6,
            7
          ],
          "target": 7
        },
        "expected": [
          [
            2,
            2,
            3
          ],
          [
            7
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "candidates": [
            2,
            3,
            5
          ],
          "target": 8
        },
        "expected": [
          [
            2,
            2,
            2,
            2
          ],
          [
            2,
            3,
            3
          ],
          [
            3,
            5
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "candidates": [
            2
          ],
          "target": 1
        },
        "expected": [],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Medium",
    "title": "Combination Sum II",
    "slug": "combination-sum-ii",
    "leetcode_link": "https://leetcode.com/problems/combination-sum-ii",
    "description": "Given a collection of candidate numbers (candidates) and a target number (target), find all unique combinations in candidates&nbsp;where the candidate numbers sum to target.\n\nEach number in candidates&nbsp;may only be used once in the combination.\n\nNote:&nbsp;The solution set must not contain duplicate combinations.\n\n&nbsp;\nExample 1:\n\n\nInput: candidates = [10,1,2,7,6,1,5], target = 8\nOutput: \n[\n[1,1,6],\n[1,2,5],\n[1,7],\n[2,6]\n]\n\n\nExample 2:\n\n\nInput: candidates = [2,5,2,1,2], target = 5\nOutput: \n[\n[1,2,2],\n[5]\n]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;=&nbsp;candidates.length &lt;= 100\n\t1 &lt;=&nbsp;candidates[i] &lt;= 50\n\t1 &lt;= target &lt;= 30\n\n...",
    "examples": [
      {
        "input": "candidates = [10,1,2,7,6,1,5], target = 8",
        "output": "[\n[1,1,6],\n[1,2,5],\n[1,7],\n[2,6]\n]",
        "explanation": ""
      },
      {
        "input": "candidates = [2,5,2,1,2], target = 5",
        "output": "[\n[1,2,2],\n[5]\n]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} candidates\n * @param {number} target\n * @return {number[][]}\n */\nvar combinationSum2 = function(candidates, target) {\n    \n};",
      "python": "class Solution(object):\n    def combinationSum2(self, candidates, target):\n        \"\"\"\n        :type candidates: List[int]\n        :type target: int\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** combinationSum2(int* candidates, int candidatesSize, int target, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> CombinationSum2(int[] candidates, int target) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "combinationSum2",
      "class": "Solution",
      "args": [
        {
          "name": "candidates",
          "type": "vector<int>"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "candidates": [
            10,
            1,
            2,
            7,
            6,
            1,
            5
          ],
          "target": 8
        },
        "expected": [
          [
            1,
            1,
            6
          ],
          [
            1,
            2,
            5
          ],
          [
            1,
            7
          ],
          [
            2,
            6
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "candidates": [
            2,
            5,
            2,
            1,
            2
          ],
          "target": 5
        },
        "expected": [
          [
            1,
            2,
            2
          ],
          [
            5
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Medium",
    "title": "Permutations",
    "slug": "permutations",
    "leetcode_link": "https://leetcode.com/problems/permutations",
    "description": "Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.\n\n&nbsp;\nExample 1:\nInput: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]\nExample 2:\nInput: nums = [0,1]\nOutput: [[0,1],[1,0]]\nExample 3:\nInput: nums = [1]\nOutput: [[1]]\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 6\n\t-10 &lt;= nums[i] &lt;= 10\n\tAll the integers of nums are unique.\n\n...",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        "explanation": ""
      },
      {
        "input": "nums = [0,1]",
        "output": "[[0,1],[1,0]]",
        "explanation": ""
      },
      {
        "input": "nums = [1]",
        "output": "[[1]]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nvar permute = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def permute(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** permute(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> Permute(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "permute",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            2,
            3
          ]
        },
        "expected": [
          [
            1,
            2,
            3
          ],
          [
            1,
            3,
            2
          ],
          [
            2,
            1,
            3
          ],
          [
            2,
            3,
            1
          ],
          [
            3,
            1,
            2
          ],
          [
            3,
            2,
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            0,
            1
          ]
        },
        "expected": [
          [
            0,
            1
          ],
          [
            1,
            0
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1
          ]
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Medium",
    "title": "Permutations II",
    "slug": "permutations-ii",
    "leetcode_link": "https://leetcode.com/problems/permutations-ii",
    "description": "Given a collection of numbers, nums,&nbsp;that might contain duplicates, return all possible unique permutations in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: nums = [1,1,2]\nOutput:\n[[1,1,2],\n [1,2,1],\n [2,1,1]]\n\n\nExample 2:\n\n\nInput: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= nums.length &lt;= 8\n\t-10 &lt;= nums[i] &lt;= 10\n\n...",
    "examples": [
      {
        "input": "nums = [1,1,2]",
        "output": "[[1,1,2],\n [1,2,1],\n [2,1,1]]",
        "explanation": ""
      },
      {
        "input": "nums = [1,2,3]",
        "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nvar permuteUnique = function(nums) {\n    \n};",
      "python": "class Solution(object):\n    def permuteUnique(self, nums):\n        \"\"\"\n        :type nums: List[int]\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> permuteUnique(vector<int>& nums) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** permuteUnique(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> PermuteUnique(int[] nums) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "permuteUnique",
      "class": "Solution",
      "args": [
        {
          "name": "nums",
          "type": "vector<int>"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "nums": [
            1,
            1,
            2
          ]
        },
        "expected": [
          [
            1,
            1,
            2
          ],
          [
            1,
            2,
            1
          ],
          [
            2,
            1,
            1
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "nums": [
            1,
            2,
            3
          ]
        },
        "expected": [
          [
            1,
            2,
            3
          ],
          [
            1,
            3,
            2
          ],
          [
            2,
            1,
            3
          ],
          [
            2,
            3,
            1
          ],
          [
            3,
            1,
            2
          ],
          [
            3,
            2,
            1
          ]
        ],
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Hard",
    "title": "N-Queens",
    "slug": "n-queens",
    "leetcode_link": "https://leetcode.com/problems/n-queens",
    "description": "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.\n\nEach solution contains a distinct board configuration of the n-queens&#39; placement, where &#39;Q&#39; and &#39;.&#39; both indicate a queen and an empty space, respectively.\n\n&nbsp;\nExample 1:\n\n\nInput: n = 4\nOutput: [[&quot;.Q..&quot;,&quot;...Q&quot;,&quot;Q...&quot;,&quot;..Q.&quot;],[&quot;..Q.&quot;,&quot;Q...&quot;,&quot;...Q&quot;,&quot;.Q..&quot;]]\nExplanation: There exist two distinct solutions to the 4-queens puzzle as shown above\n\n\nExample 2:\n\n\nInput: n = 1\nOutput: [[&quot;Q&quot;]]\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 9\n\n...",
    "examples": [
      {
        "input": "n = 4",
        "output": "[[&quot;.Q..&quot;,&quot;...Q&quot;,&quot;Q...&quot;,&quot;..Q.&quot;],[&quot;..Q.&quot;,&quot;Q...&quot;,&quot;...Q&quot;,&quot;.Q..&quot;]]",
        "explanation": "There exist two distinct solutions to the 4-queens puzzle as shown above"
      },
      {
        "input": "n = 1",
        "output": "[[&quot;Q&quot;]]",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} n\n * @return {string[][]}\n */\nvar solveNQueens = function(n) {\n    \n};",
      "python": "class Solution(object):\n    def solveNQueens(self, n):\n        \"\"\"\n        :type n: int\n        :rtype: List[List[str]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> solveNQueens(int n) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nchar*** solveNQueens(int n, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<string>> SolveNQueens(int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "solveNQueens",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "list<list<string>>"
    },
    "test_cases": [
      {
        "input": {
          "n": 4
        },
        "expected": "[[&quot;.Q..&quot;,&quot;...Q&quot;,&quot;Q...&quot;,&quot;..Q.&quot;],[&quot;..Q.&quot;,&quot;Q...&quot;,&quot;...Q&quot;,&quot;.Q..&quot;]]",
        "hidden": false
      },
      {
        "input": {
          "n": 1
        },
        "expected": "[[&quot;Q&quot;]]",
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Hard",
    "title": "N-Queens II",
    "slug": "n-queens-ii",
    "leetcode_link": "https://leetcode.com/problems/n-queens-ii",
    "description": "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return the number of distinct solutions to the&nbsp;n-queens puzzle.\n\n&nbsp;\nExample 1:\n\n\nInput: n = 4\nOutput: 2\nExplanation: There are two distinct solutions to the 4-queens puzzle as shown.\n\n\nExample 2:\n\n\nInput: n = 1\nOutput: 1\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 9\n\n...",
    "examples": [
      {
        "input": "n = 4",
        "output": "2",
        "explanation": "There are two distinct solutions to the 4-queens puzzle as shown."
      },
      {
        "input": "n = 1",
        "output": "1",
        "explanation": ""
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} n\n * @return {number}\n */\nvar totalNQueens = function(n) {\n    \n};",
      "python": "class Solution(object):\n    def totalNQueens(self, n):\n        \"\"\"\n        :type n: int\n        :rtype: int\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    int totalNQueens(int n) {\n        \n    }\n};",
      "c": "int totalNQueens(int n) {\n    \n}",
      "csharp": "public class Solution {\n    public int TotalNQueens(int n) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "totalNQueens",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "ret": "int"
    },
    "test_cases": [
      {
        "input": {
          "n": 4
        },
        "expected": 2,
        "hidden": false
      },
      {
        "input": {
          "n": 1
        },
        "expected": 1,
        "hidden": false
      }
    ]
  },
  {
    "topic": "Backtracking",
    "pattern": "Combinations",
    "difficulty": "Medium",
    "title": "Combinations",
    "slug": "combinations",
    "leetcode_link": "https://leetcode.com/problems/combinations",
    "description": "Given two integers n and k, return all possible combinations of k numbers chosen from the range [1, n].\n\nYou may return the answer in any order.\n\n&nbsp;\nExample 1:\n\n\nInput: n = 4, k = 2\nOutput: [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]\nExplanation: There are 4 choose 2 = 6 total combinations.\nNote that combinations are unordered, i.e., [1,2] and [2,1] are considered to be the same combination.\n\n\nExample 2:\n\n\nInput: n = 1, k = 1\nOutput: [[1]]\nExplanation: There is 1 choose 1 = 1 total combination.\n\n\n&nbsp;\nConstraints:\n\n\n\t1 &lt;= n &lt;= 20\n\t1 &lt;= k &lt;= n\n\n...",
    "examples": [
      {
        "input": "n = 4, k = 2",
        "output": "[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]",
        "explanation": "There are 4 choose 2 = 6 total combinations.\nNote that combinations are unordered, i.e., [1,2] and [2,1] are considered to be the same combination."
      },
      {
        "input": "n = 1, k = 1",
        "output": "[[1]]",
        "explanation": "There is 1 choose 1 = 1 total combination."
      }
    ],
    "constraints": [],
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "starter_code": {
      "javascript": "/**\n * @param {number} n\n * @param {number} k\n * @return {number[][]}\n */\nvar combine = function(n, k) {\n    \n};",
      "python": "class Solution(object):\n    def combine(self, n, k):\n        \"\"\"\n        :type n: int\n        :type k: int\n        :rtype: List[List[int]]\n        \"\"\"\n        ",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combine(int n, int k) {\n        \n    }\n};",
      "c": "/**\n * Return an array of arrays of size *returnSize.\n * The sizes of the arrays are returned as *returnColumnSizes array.\n * Note: Both returned array and *columnSizes array must be malloced, assume caller calls free().\n */\nint** combine(int n, int k, int* returnSize, int** returnColumnSizes) {\n    \n}",
      "csharp": "public class Solution {\n    public IList<IList<int>> Combine(int n, int k) {\n        \n    }\n}"
    },
    "cpp_signature": {
      "fn": "combine",
      "class": "Solution",
      "args": [
        {
          "name": "n",
          "type": "int"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "ret": "list<list<integer>>"
    },
    "test_cases": [
      {
        "input": {
          "n": 4,
          "k": 2
        },
        "expected": [
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            2,
            3
          ],
          [
            2,
            4
          ],
          [
            3,
            4
          ]
        ],
        "hidden": false
      },
      {
        "input": {
          "n": 1,
          "k": 1
        },
        "expected": [
          [
            1
          ]
        ],
        "hidden": false
      }
    ]
  }
];