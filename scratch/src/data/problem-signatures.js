// ============================================
// ROBINHOOD — PROBLEM SIGNATURES
// Language-specific function signatures and templates
// ============================================

/**
 * Signature definitions for each problem
 * Keys match problem IDs from problems.js
 */
export const problemSignatures = {
  // ===== ARRAYS & HASHING =====
  'a1': {
    title: 'Two Sum',
    signatures: {
      cpp: 'vector<int> twoSum(vector<int>& nums, int target)',
      java: 'public int[] twoSum(int[] nums, int target)',
      python: 'def twoSum(self, nums: List[int], target: int) -> List[int]:',
      javascript: 'function twoSum(nums, target)',
      csharp: 'public int[] TwoSum(int[] nums, int target)',
    },
    templates: {
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        // Your code here
        
    }
}`,
    },
  },

  'a2': {
    title: 'Contains Duplicate',
    signatures: {
      cpp: 'bool containsDuplicate(vector<int>& nums)',
      java: 'public boolean containsDuplicate(int[] nums)',
      python: 'def containsDuplicate(self, nums: List[int]) -> bool:',
      javascript: 'function containsDuplicate(nums)',
      csharp: 'public bool ContainsDuplicate(int[] nums)',
    },
    templates: {
      cpp: `#include <vector>
#include <unordered_set>
using namespace std;

class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        // Your code here
        
    }
}`,
    },
  },

  'a3': {
    title: 'Valid Anagram',
    signatures: {
      cpp: 'bool isAnagram(string s, string t)',
      java: 'public boolean isAnagram(String s, String t)',
      python: 'def isAnagram(self, s: str, t: str) -> bool:',
      javascript: 'function isAnagram(s, t)',
      csharp: 'public bool IsAnagram(string s, string t)',
    },
    templates: {
      cpp: `#include <string>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool isAnagram(string s, string t) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public boolean isAnagram(String s, String t) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # Your code here
        pass`,
      javascript: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function isAnagram(s, t) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public bool IsAnagram(string s, string t) {
        // Your code here
        
    }
}`,
    },
  },

  'a4': {
    title: 'Group Anagrams',
    signatures: {
      cpp: 'vector<vector<string>> groupAnagrams(vector<string>& strs)',
      java: 'public List<List<String>> groupAnagrams(String[] strs)',
      python: 'def groupAnagrams(self, strs: List[str]) -> List[List[str]]:',
      javascript: 'function groupAnagrams(strs)',
      csharp: 'public IList<IList<string>> GroupAnagrams(string[] strs)',
    },
    templates: {
      cpp: `#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
function groupAnagrams(strs) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public IList<IList<string>> GroupAnagrams(string[] strs) {
        // Your code here
        
    }
}`,
    },
  },

  'a5': {
    title: 'Top K Frequent Elements',
    signatures: {
      cpp: 'vector<int> topKFrequent(vector<int>& nums, int k)',
      java: 'public int[] topKFrequent(int[] nums, int k)',
      python: 'def topKFrequent(self, nums: List[int], k: int) -> List[int]:',
      javascript: 'function topKFrequent(nums, k)',
      csharp: 'public int[] TopKFrequent(int[] nums, int k)',
    },
    templates: {
      cpp: `#include <vector>
#include <unordered_map>
#include <queue>
using namespace std;

class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
function topKFrequent(nums, k) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        // Your code here
        
    }
}`,
    },
  },

  'a6': {
    title: 'Product of Array Except Self',
    signatures: {
      cpp: 'vector<int> productExceptSelf(vector<int>& nums)',
      java: 'public int[] productExceptSelf(int[] nums)',
      python: 'def productExceptSelf(self, nums: List[int]) -> List[int]:',
      javascript: 'function productExceptSelf(nums)',
      csharp: 'public int[] ProductExceptSelf(int[] nums)',
    },
    templates: {
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int[] productExceptSelf(int[] nums) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number[]}
 */
function productExceptSelf(nums) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        // Your code here
        
    }
}`,
    },
  },

  'a13': {
    title: 'Maximum Subarray',
    signatures: {
      cpp: 'int maxSubArray(vector<int>& nums)',
      java: 'public int maxSubArray(int[] nums)',
      python: 'def maxSubArray(self, nums: List[int]) -> int:',
      javascript: 'function maxSubArray(nums)',
      csharp: 'public int MaxSubArray(int[] nums)',
    },
    templates: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Your code here (Kadane's Algorithm)
        
    }
};`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Your code here (Kadane's Algorithm)
        
    }
}`,
      python: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Your code here (Kadane's Algorithm)
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
    // Your code here (Kadane's Algorithm)
    
}`,
      csharp: `public class Solution {
    public int MaxSubArray(int[] nums) {
        // Your code here (Kadane's Algorithm)
        
    }
}`,
    },
  },

  'a23': {
    title: '3Sum',
    signatures: {
      cpp: 'vector<vector<int>> threeSum(vector<int>& nums)',
      java: 'public List<List<Integer>> threeSum(int[] nums)',
      python: 'def threeSum(self, nums: List[int]) -> List[List[int]]:',
      javascript: 'function threeSum(nums)',
      csharp: 'public IList<IList<int>> ThreeSum(int[] nums)',
    },
    templates: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public IList<IList<int>> ThreeSum(int[] nums) {
        // Your code here
        
    }
}`,
    },
  },

  'a26': {
    title: 'Trapping Rain Water',
    signatures: {
      cpp: 'int trap(vector<int>& height)',
      java: 'public int trap(int[] height)',
      python: 'def trap(self, height: List[int]) -> int:',
      javascript: 'function trap(height)',
      csharp: 'public int Trap(int[] height)',
    },
    templates: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int trap(vector<int>& height) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int trap(int[] height) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def trap(self, height: List[int]) -> int:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int Trap(int[] height) {
        // Your code here
        
    }
}`,
    },
  },

  'a28': {
    title: 'Spiral Matrix',
    signatures: {
      cpp: 'vector<int> spiralOrder(vector<vector<int>>& matrix)',
      java: 'public List<Integer> spiralOrder(int[][] matrix)',
      python: 'def spiralOrder(self, matrix: List[List[int]]) -> List[int]:',
      javascript: 'function spiralOrder(matrix)',
      csharp: 'public IList<int> SpiralOrder(int[][] matrix)',
    },
    templates: {
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        // Your code here
        
    }
};`,
      java: `import java.util.*;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[][]} matrix
 * @return {number[]}
 */
function spiralOrder(matrix) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public IList<int> SpiralOrder(int[][] matrix) {
        // Your code here
        
    }
}`,
    },
  },

  // ===== BINARY SEARCH =====
  'bs1': {
    title: 'Binary Search',
    signatures: {
      cpp: 'int search(vector<int>& nums, int target)',
      java: 'public int search(int[] nums, int target)',
      python: 'def search(self, nums: List[int], target: int) -> int:',
      javascript: 'function search(nums, target)',
      csharp: 'public int Search(int[] nums, int target)',
    },
    templates: {
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int Search(int[] nums, int target) {
        // Your code here
        
    }
}`,
    },
  },

  // ===== LINKED LIST =====
  'll1': {
    title: 'Reverse Linked List',
    signatures: {
      cpp: 'ListNode* reverseList(ListNode* head)',
      java: 'public ListNode reverseList(ListNode head)',
      python: 'def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:',
      javascript: 'function reverseList(head)',
      csharp: 'public ListNode ReverseList(ListNode head)',
    },
    templates: {
      cpp: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Your code here
        
    }
};`,
      java: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode reverseList(ListNode head) {
        // Your code here
        
    }
}`,
      python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # Your code here
        pass`,
      javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function reverseList(head) {
    // Your code here
    
}`,
      csharp: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     public int val;
 *     public ListNode next;
 *     public ListNode(int val=0, ListNode next=null) {
 *         this.val = val;
 *         this.next = next;
 *     }
 * }
 */
public class Solution {
    public ListNode ReverseList(ListNode head) {
        // Your code here
        
    }
}`,
    },
  },

  // ===== BINARY TREE =====
  'bt1': {
    title: 'Inorder Traversal',
    signatures: {
      cpp: 'vector<int> inorderTraversal(TreeNode* root)',
      java: 'public List<Integer> inorderTraversal(TreeNode root)',
      python: 'def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:',
      javascript: 'function inorderTraversal(root)',
      csharp: 'public IList<int> InorderTraversal(TreeNode root)',
    },
    templates: {
      cpp: `/**
 * Definition for a binary tree node.
 * struct TreeNode {
 *     int val;
 *     TreeNode *left;
 *     TreeNode *right;
 *     TreeNode() : val(0), left(nullptr), right(nullptr) {}
 *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
 *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
 * };
 */
class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        // Your code here
        
    }
};`,
      java: `/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        // Your code here
        
    }
}`,
      python: `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        # Your code here
        pass`,
      javascript: `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
function inorderTraversal(root) {
    // Your code here
    
}`,
      csharp: `/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     public int val;
 *     public TreeNode left;
 *     public TreeNode right;
 *     public TreeNode(int val=0, TreeNode left=null, TreeNode right=null) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
public class Solution {
    public IList<int> InorderTraversal(TreeNode root) {
        // Your code here
        
    }
}`,
    },
  },

  // ===== DYNAMIC PROGRAMMING =====
  'dp1': {
    title: 'Climbing Stairs',
    signatures: {
      cpp: 'int climbStairs(int n)',
      java: 'public int climbStairs(int n)',
      python: 'def climbStairs(self, n: int) -> int:',
      javascript: 'function climbStairs(n)',
      csharp: 'public int ClimbStairs(int n)',
    },
    templates: {
      cpp: `class Solution {
public:
    int climbStairs(int n) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int climbStairs(int n) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def climbStairs(self, n: int) -> int:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int ClimbStairs(int n) {
        // Your code here
        
    }
}`,
    },
  },

  'dp2': {
    title: 'House Robber',
    signatures: {
      cpp: 'int rob(vector<int>& nums)',
      java: 'public int rob(int[] nums)',
      python: 'def rob(self, nums: List[int]) -> int:',
      javascript: 'function rob(nums)',
      csharp: 'public int Rob(int[] nums)',
    },
    templates: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int rob(vector<int>& nums) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int rob(int[] nums) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def rob(self, nums: List[int]) -> int:
        # Your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function rob(nums) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int Rob(int[] nums) {
        // Your code here
        
    }
}`,
    },
  },

  // ===== GRAPH =====
  'g1': {
    title: 'Number of Islands',
    signatures: {
      cpp: 'int numIslands(vector<vector<char>>& grid)',
      java: 'public int numIslands(char[][] grid)',
      python: 'def numIslands(self, grid: List[List[str]]) -> int:',
      javascript: 'function numIslands(grid)',
      csharp: 'public int NumIslands(char[][] grid)',
    },
    templates: {
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Your code here
        
    }
};`,
      java: `class Solution {
    public int numIslands(char[][] grid) {
        // Your code here
        
    }
}`,
      python: `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # Your code here
        pass`,
      javascript: `/**
 * @param {character[][]} grid
 * @return {number}
 */
function numIslands(grid) {
    // Your code here
    
}`,
      csharp: `public class Solution {
    public int NumIslands(char[][] grid) {
        // Your code here
        
    }
}`,
    },
  },
};

/**
 * Get signature for a problem and language
 */
export function getSignature(problemId, language) {
  const problem = problemSignatures[problemId];
  if (!problem) return null;
  
  const lang = language.toLowerCase();
  const langMap = {
    'c++': 'cpp',
    'c#': 'csharp',
    'javascript': 'javascript',
    'js': 'javascript',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'cpp': 'cpp',
  };
  
  const normalizedLang = langMap[lang] || lang;
  return problem.signatures?.[normalizedLang] || null;
}

/**
 * Get template for a problem and language
 */
export function getTemplate(problemId, language) {
  const problem = problemSignatures[problemId];
  if (!problem) return null;
  
  const lang = language.toLowerCase();
  const langMap = {
    'c++': 'cpp',
    'c#': 'csharp',
    'javascript': 'javascript',
    'js': 'javascript',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'cpp': 'cpp',
  };
  
  const normalizedLang = langMap[lang] || lang;
  return problem.templates?.[normalizedLang] || null;
}

/**
 * Generate a fallback signature based on problem title and common patterns
 */
export function generateFallbackSignature(problemTitle, language, category) {
  const title = problemTitle || 'solve';
  const funcName = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  const patterns = {
    cpp: {
      arrays: `vector<int> ${funcName}(vector<int>& nums)`,
      strings: `string ${funcName}(string s)`,
      tree: `TreeNode* ${funcName}(TreeNode* root)`,
      graph: `int ${funcName}(vector<vector<int>>& graph)`,
      default: `int ${funcName}(vector<int>& input)`,
    },
    java: {
      arrays: `public int[] ${funcName}(int[] nums)`,
      strings: `public String ${funcName}(String s)`,
      tree: `public TreeNode ${funcName}(TreeNode root)`,
      graph: `public int ${funcName}(int[][] graph)`,
      default: `public int ${funcName}(int[] input)`,
    },
    python: {
      arrays: `def ${funcName}(self, nums: List[int]) -> List[int]:`,
      strings: `def ${funcName}(self, s: str) -> str:`,
      tree: `def ${funcName}(self, root: Optional[TreeNode]) -> Optional[TreeNode]:`,
      graph: `def ${funcName}(self, graph: List[List[int]]) -> int:`,
      default: `def ${funcName}(self, input: List[int]) -> int:`,
    },
    javascript: {
      arrays: `function ${funcName}(nums)`,
      strings: `function ${funcName}(s)`,
      tree: `function ${funcName}(root)`,
      graph: `function ${funcName}(graph)`,
      default: `function ${funcName}(input)`,
    },
    csharp: {
      arrays: `public int[] ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(int[] nums)`,
      strings: `public string ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(string s)`,
      tree: `public TreeNode ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(TreeNode root)`,
      graph: `public int ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(int[][] graph)`,
      default: `public int ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(int[] input)`,
    },
  };
  
  const lang = language.toLowerCase();
  const langMap = { 'c++': 'cpp', 'c#': 'csharp', 'js': 'javascript', 'py': 'python' };
  const normalizedLang = langMap[lang] || lang;
  
  const catKey = (category || '').toLowerCase();
  let categoryType = 'default';
  if (catKey.includes('array') || catKey.includes('hash') || catKey.includes('pointer')) categoryType = 'arrays';
  if (catKey.includes('string')) categoryType = 'strings';
  if (catKey.includes('tree') || catKey.includes('bst')) categoryType = 'tree';
  if (catKey.includes('graph')) categoryType = 'graph';
  
  return patterns[normalizedLang]?.[categoryType] || patterns[normalizedLang]?.default || `function ${funcName}()`;
}

/**
 * Get all available languages
 */
export const SUPPORTED_LANGUAGES = [
  { id: 'cpp', name: 'C++', monacoId: 'cpp' },
  { id: 'java', name: 'Java', monacoId: 'java' },
  { id: 'python', name: 'Python', monacoId: 'python' },
  { id: 'javascript', name: 'JavaScript', monacoId: 'javascript' },
  { id: 'csharp', name: 'C#', monacoId: 'csharp' },
];
