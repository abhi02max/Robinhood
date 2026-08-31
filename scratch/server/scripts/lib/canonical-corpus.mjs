/**
 * The canonical cross-language corpus.
 *
 * WHY IT EXISTS
 * -------------
 * Every gate before this one proved a type works *incidentally*. `check-starters.js`
 * proves the generated starter compiles, which says nothing about whether values
 * survive the round trip. `check-authored-problems.js` grades real solutions, but only
 * for the seven type shapes the curriculum happens to use, and only in JavaScript and
 * Python. So four canonical types — `long long`, `vector<long long>`, `vector<double>`
 * and `vector<bool>` — were implemented and unit-tested for C++, Java, C and C# across
 * three phases and had **never once executed on a provider**. A unit test asserts the
 * literal we emit; only an execution proves the compiler accepts it and the value comes
 * back unchanged.
 *
 * DESIGN: IDENTITY FUNCTIONS
 * --------------------------
 * Almost every entry echoes its argument back. That is deliberate and it is the cheapest
 * possible way to get full coverage:
 *
 *   - it exercises the type as an ARGUMENT (server -> literal -> compiler) and as a
 *     RETURN (program -> serializer -> JSON -> comparison) in ONE execution, so the
 *     corpus costs half what a separate read-path and write-path suite would;
 *   - the expected output is the input, so there is no reference algorithm to get wrong.
 *     A failure is unambiguously the pipeline's fault, never the test's.
 *
 * The exception is `mix`, which takes four different types in one signature. Identity
 * functions cannot catch an argument-ORDER bug, and C is the language where that matters:
 * every array argument injects a companion `int <name>Size` parameter, so the C
 * parameter list interleaves generated parameters with declared ones. `mix` is the only
 * entry that would fail if that interleaving were wrong.
 *
 * WHAT EACH ENTRY MUST DECLARE
 * ----------------------------
 *   id        stable, used in output and in the JSON report
 *   covers    canonical types this entry proves, for the coverage assertion
 *   edges     which edge conditions its cases cover, for the same reason
 *   sig       the problem signature, in the same shape as `cpp_signature`
 *   cases     test cases in the seeded shape; `expected_output` is the truth
 *   solutions a correct solution per language. A language may be absent ONLY when the
 *             registry says it cannot express the signature, which the gate asserts.
 *   wrong     one incorrect solution per language, to prove rejection actually happens
 *             (optional; the gate uses it where present)
 *
 * Deliberately absent: JSON-payload precision above 2^53. `expected_output` is read from
 * JSON, so a 64-bit value that JavaScript cannot represent exactly cannot be expressed as
 * a test case at all. The corpus goes to 2^53-1 and stops, and that ceiling is a property
 * of the storage format rather than of any language's harness.
 */

// ---------------------------------------------------------------------------
// Edge-condition vocabulary, so coverage can be asserted rather than eyeballed.
// ---------------------------------------------------------------------------
export const EDGES = Object.freeze([
  'empty',
  'singleton',
  'negative',
  'zero',
  'numeric-bound',
  'escaped-string',
  'non-ascii',
  'ragged-matrix',
  'multi-arg-order',
]);

const MAX_SAFE = 9007199254740991; // 2^53 - 1, the JSON ceiling
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

const tc = (i, input, expected, hidden = false) => ({
  id: `c${i}`,
  order_index: i,
  is_hidden: hidden,
  input_payload: input,
  expected_output: expected,
});

// ---------------------------------------------------------------------------

/** @type {Array<object>} */
export const CORPUS = [
  // -------------------------------------------------------------------------
  {
    id: 'int',
    covers: ['int'],
    edges: ['zero', 'negative', 'numeric-bound'],
    sig: { fn: 'echoInt', class: 'Solution', args: [{ name: 'n', type: 'int' }], ret: 'int' },
    cases: [
      tc(1, { n: 0 }, 0),
      tc(2, { n: -7 }, -7),
      // Both 32-bit boundaries. INT_MIN is the interesting one: in C and C++ the token
      // -2147483648 is unary minus applied to 2147483648, which does not fit in an int,
      // so a naive literal emitter produces a value of the wrong TYPE. It still has to
      // arrive as -2147483648.
      tc(3, { n: INT_MAX }, INT_MAX),
      tc(4, { n: INT_MIN }, INT_MIN),
    ],
    solutions: {
      javascript: 'function echoInt(n) {\n  return n;\n}',
      python: 'def echo_int(n):\n    return n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        return n;\n    }\n};',
      java: 'class Solution {\n    public int echoInt(int n) {\n        return n;\n    }\n}',
      c: 'int echoInt(int n) {\n    return n;\n}',
      csharp: 'public class Solution {\n    public int EchoInt(int n) {\n        return n;\n    }\n}',
    },
    wrong: {
      javascript: 'function echoInt(n) {\n  return n + 1;\n}',
      python: 'def echo_int(n):\n    return n + 1',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int echoInt(int n) {\n        return n + 1;\n    }\n};',
      java: 'class Solution {\n    public int echoInt(int n) {\n        return n + 1;\n    }\n}',
      c: 'int echoInt(int n) {\n    return n + 1;\n}',
      csharp: 'public class Solution {\n    public int EchoInt(int n) {\n        return n + 1;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'long-long',
    covers: ['long long'],
    edges: ['zero', 'negative', 'numeric-bound'],
    sig: { fn: 'echoLong', class: 'Solution', args: [{ name: 'n', type: 'long long' }], ret: 'long long' },
    cases: [
      tc(1, { n: 0 }, 0),
      // Past 2^32, so a value that silently truncated to 32 bits would be caught.
      tc(2, { n: 4294967296 }, 4294967296),
      tc(3, { n: MAX_SAFE }, MAX_SAFE),
      tc(4, { n: -MAX_SAFE }, -MAX_SAFE),
    ],
    solutions: {
      javascript: 'function echoLong(n) {\n  return n;\n}',
      python: 'def echo_long(n):\n    return n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    long long echoLong(long long n) {\n        return n;\n    }\n};',
      java: 'class Solution {\n    public long echoLong(long n) {\n        return n;\n    }\n}',
      c: 'long long echoLong(long long n) {\n    return n;\n}',
      csharp: 'public class Solution {\n    public long EchoLong(long n) {\n        return n;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'double',
    covers: ['double'],
    edges: ['negative', 'zero'],
    sig: { fn: 'echoDouble', class: 'Solution', args: [{ name: 'x', type: 'double' }], ret: 'double' },
    cases: [
      // All exactly representable in binary floating point, so a failure means the
      // serializer or the locale, never rounding.
      tc(1, { x: 0.5 }, 0.5),
      tc(2, { x: -3.5 }, -3.5),
      tc(3, { x: 12.75 }, 12.75),
      tc(4, { x: 0.125 }, 0.125),
    ],
    solutions: {
      javascript: 'function echoDouble(x) {\n  return x;\n}',
      python: 'def echo_double(x):\n    return x',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    double echoDouble(double x) {\n        return x;\n    }\n};',
      java: 'class Solution {\n    public double echoDouble(double x) {\n        return x;\n    }\n}',
      c: 'double echoDouble(double x) {\n    return x;\n}',
      csharp: 'public class Solution {\n    public double EchoDouble(double x) {\n        return x;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'bool',
    covers: ['bool'],
    edges: [],
    sig: { fn: 'echoBool', class: 'Solution', args: [{ name: 'flag', type: 'bool' }], ret: 'bool' },
    cases: [
      // The C# hazard lives here: bool.ToString() is "True", which is not JSON.
      tc(1, { flag: true }, true),
      tc(2, { flag: false }, false),
    ],
    solutions: {
      javascript: 'function echoBool(flag) {\n  return flag;\n}',
      python: 'def echo_bool(flag):\n    return flag',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool echoBool(bool flag) {\n        return flag;\n    }\n};',
      java: 'class Solution {\n    public boolean echoBool(boolean flag) {\n        return flag;\n    }\n}',
      c: 'bool echoBool(bool flag) {\n    return flag;\n}',
      csharp: 'public class Solution {\n    public bool EchoBool(bool flag) {\n        return flag;\n    }\n}',
    },
    wrong: {
      javascript: 'function echoBool(flag) {\n  return !flag;\n}',
      python: 'def echo_bool(flag):\n    return not flag',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool echoBool(bool flag) {\n        return !flag;\n    }\n};',
      java: 'class Solution {\n    public boolean echoBool(boolean flag) {\n        return !flag;\n    }\n}',
      c: 'bool echoBool(bool flag) {\n    return !flag;\n}',
      csharp: 'public class Solution {\n    public bool EchoBool(bool flag) {\n        return !flag;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'string',
    covers: ['string'],
    edges: ['empty', 'escaped-string', 'non-ascii'],
    sig: { fn: 'echoString', class: 'Solution', args: [{ name: 's', type: 'string' }], ret: 'string' },
    cases: [
      tc(1, { s: '' }, ''),
      tc(2, { s: 'a' }, 'a'),
      // A quote, a backslash and a non-ASCII character in one value. C escapes bytes in
      // OCTAL rather than hex precisely so that a digit following an escape cannot be
      // absorbed into it.
      tc(3, { s: 'caf\u00e9 "q" \\ x' }, 'caf\u00e9 "q" \\ x'),
      tc(4, { s: 'line\nbreak\ttab' }, 'line\nbreak\ttab'),
    ],
    solutions: {
      javascript: 'function echoString(s) {\n  return s;\n}',
      python: 'def echo_string(s):\n    return s',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    string echoString(string s) {\n        return s;\n    }\n};',
      java: 'class Solution {\n    public String echoString(String s) {\n        return s;\n    }\n}',
      // The harness never frees the return value, so handing back `s` would work. A
      // malloc'd copy is returned instead because that is the contract the starter
      // states, and this is the only place it gets executed.
      c: 'char* echoString(char* s) {\n    char* out = (char*) malloc(strlen(s) + 1);\n    strcpy(out, s);\n    return out;\n}',
      csharp: 'public class Solution {\n    public string EchoString(string s) {\n        return s;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'vector-int',
    covers: ['vector<int>'],
    edges: ['empty', 'singleton', 'negative', 'numeric-bound'],
    sig: { fn: 'echoIntArray', class: 'Solution', args: [{ name: 'nums', type: 'vector<int>' }], ret: 'vector<int>' },
    cases: [
      // Empty in and empty out. In C this is the decision from 2C: a NULL pointer with
      // size 0, serialized as [] rather than null.
      tc(1, { nums: [] }, []),
      tc(2, { nums: [7] }, [7]),
      tc(3, { nums: [-3, 0, INT_MAX, INT_MIN] }, [-3, 0, INT_MAX, INT_MIN]),
      tc(4, { nums: [1, 2, 3] }, [1, 2, 3]),
    ],
    solutions: {
      javascript: 'function echoIntArray(nums) {\n  return nums;\n}',
      python: 'def echo_int_array(nums):\n    return nums',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> echoIntArray(vector<int>& nums) {\n        return nums;\n    }\n};',
      java: 'class Solution {\n    public int[] echoIntArray(int[] nums) {\n        return nums;\n    }\n}',
      c: 'int* echoIntArray(int* nums, int numsSize, int* returnSize) {\n    *returnSize = numsSize;\n    if (numsSize == 0) return NULL;\n    int* out = (int*) malloc(sizeof(int) * numsSize);\n    for (int i = 0; i < numsSize; i++) out[i] = nums[i];\n    return out;\n}',
      csharp: 'public class Solution {\n    public int[] EchoIntArray(int[] nums) {\n        return nums;\n    }\n}',
    },
    wrong: {
      javascript: 'function echoIntArray(nums) {\n  return nums.slice(0, 1);\n}',
      python: 'def echo_int_array(nums):\n    return nums[:1]',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> echoIntArray(vector<int>& nums) {\n        if (nums.empty()) return {0};\n        return {nums[0]};\n    }\n};',
      java: 'class Solution {\n    public int[] echoIntArray(int[] nums) {\n        return new int[] { 99 };\n    }\n}',
      c: 'int* echoIntArray(int* nums, int numsSize, int* returnSize) {\n    *returnSize = 1;\n    int* out = (int*) malloc(sizeof(int));\n    out[0] = 99;\n    return out;\n}',
      csharp: 'public class Solution {\n    public int[] EchoIntArray(int[] nums) {\n        return new int[] { 99 };\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'vector-long-long',
    covers: ['vector<long long>'],
    edges: ['empty', 'negative', 'numeric-bound'],
    sig: { fn: 'echoLongArray', class: 'Solution', args: [{ name: 'nums', type: 'vector<long long>' }], ret: 'vector<long long>' },
    cases: [
      tc(1, { nums: [] }, []),
      tc(2, { nums: [MAX_SAFE, -MAX_SAFE, 0, 4294967296] }, [MAX_SAFE, -MAX_SAFE, 0, 4294967296]),
    ],
    solutions: {
      javascript: 'function echoLongArray(nums) {\n  return nums;\n}',
      python: 'def echo_long_array(nums):\n    return nums',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<long long> echoLongArray(vector<long long>& nums) {\n        return nums;\n    }\n};',
      java: 'class Solution {\n    public long[] echoLongArray(long[] nums) {\n        return nums;\n    }\n}',
      c: 'long long* echoLongArray(long long* nums, int numsSize, int* returnSize) {\n    *returnSize = numsSize;\n    if (numsSize == 0) return NULL;\n    long long* out = (long long*) malloc(sizeof(long long) * numsSize);\n    for (int i = 0; i < numsSize; i++) out[i] = nums[i];\n    return out;\n}',
      csharp: 'public class Solution {\n    public long[] EchoLongArray(long[] nums) {\n        return nums;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'vector-double',
    covers: ['vector<double>'],
    edges: ['empty', 'negative'],
    sig: { fn: 'echoDoubleArray', class: 'Solution', args: [{ name: 'xs', type: 'vector<double>' }], ret: 'vector<double>' },
    cases: [
      tc(1, { xs: [] }, []),
      tc(2, { xs: [-1.5, 0.25, 12.75] }, [-1.5, 0.25, 12.75]),
    ],
    solutions: {
      javascript: 'function echoDoubleArray(xs) {\n  return xs;\n}',
      python: 'def echo_double_array(xs):\n    return xs',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<double> echoDoubleArray(vector<double>& xs) {\n        return xs;\n    }\n};',
      java: 'class Solution {\n    public double[] echoDoubleArray(double[] xs) {\n        return xs;\n    }\n}',
      c: 'double* echoDoubleArray(double* xs, int xsSize, int* returnSize) {\n    *returnSize = xsSize;\n    if (xsSize == 0) return NULL;\n    double* out = (double*) malloc(sizeof(double) * xsSize);\n    for (int i = 0; i < xsSize; i++) out[i] = xs[i];\n    return out;\n}',
      csharp: 'public class Solution {\n    public double[] EchoDoubleArray(double[] xs) {\n        return xs;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'vector-bool',
    covers: ['vector<bool>'],
    edges: ['empty', 'singleton'],
    sig: { fn: 'echoBoolArray', class: 'Solution', args: [{ name: 'flags', type: 'vector<bool>' }], ret: 'vector<bool>' },
    cases: [
      tc(1, { flags: [] }, []),
      tc(2, { flags: [true] }, [true]),
      // C++ specialises vector<bool> as a bitset whose operator[] returns a proxy, not
      // a bool&. Anything that took a reference to an element would not compile.
      tc(3, { flags: [true, false, true, true] }, [true, false, true, true]),
    ],
    solutions: {
      javascript: 'function echoBoolArray(flags) {\n  return flags;\n}',
      python: 'def echo_bool_array(flags):\n    return flags',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<bool> echoBoolArray(vector<bool>& flags) {\n        return flags;\n    }\n};',
      java: 'class Solution {\n    public boolean[] echoBoolArray(boolean[] flags) {\n        return flags;\n    }\n}',
      c: 'bool* echoBoolArray(bool* flags, int flagsSize, int* returnSize) {\n    *returnSize = flagsSize;\n    if (flagsSize == 0) return NULL;\n    bool* out = (bool*) malloc(sizeof(bool) * flagsSize);\n    for (int i = 0; i < flagsSize; i++) out[i] = flags[i];\n    return out;\n}',
      csharp: 'public class Solution {\n    public bool[] EchoBoolArray(bool[] flags) {\n        return flags;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'vector-string',
    covers: ['vector<string>'],
    edges: ['empty', 'escaped-string', 'non-ascii'],
    sig: { fn: 'echoStringArray', class: 'Solution', args: [{ name: 'words', type: 'vector<string>' }], ret: 'vector<string>' },
    cases: [
      tc(1, { words: [] }, []),
      // An empty string INSIDE a non-empty array: a length-prefixed encoding that
      // conflated "no elements" with "an empty element" would pass case 1 and fail here.
      tc(2, { words: ['', 'a'] }, ['', 'a']),
      tc(3, { words: ['caf\u00e9', 'x"y', 'b\\c'] }, ['caf\u00e9', 'x"y', 'b\\c']),
    ],
    solutions: {
      javascript: 'function echoStringArray(words) {\n  return words;\n}',
      python: 'def echo_string_array(words):\n    return words',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> echoStringArray(vector<string>& words) {\n        return words;\n    }\n};',
      java: 'class Solution {\n    public String[] echoStringArray(String[] words) {\n        return words;\n    }\n}',
      c: 'char** echoStringArray(char** words, int wordsSize, int* returnSize) {\n    *returnSize = wordsSize;\n    if (wordsSize == 0) return NULL;\n    char** out = (char**) malloc(sizeof(char*) * wordsSize);\n    for (int i = 0; i < wordsSize; i++) {\n        out[i] = (char*) malloc(strlen(words[i]) + 1);\n        strcpy(out[i], words[i]);\n    }\n    return out;\n}',
      csharp: 'public class Solution {\n    public string[] EchoStringArray(string[] words) {\n        return words;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'matrix',
    covers: ['vector<vector<int>>'],
    edges: ['empty', 'ragged-matrix', 'negative'],
    // C is expected to be UNSUPPORTED here, in both directions. The gate asserts that
    // the registry says so rather than skipping quietly.
    sig: { fn: 'echoMatrix', class: 'Solution', args: [{ name: 'grid', type: 'vector<vector<int>>' }], ret: 'vector<vector<int>>' },
    cases: [
      tc(1, { grid: [] }, []),
      // One EMPTY row. C# needs `new int[][] { new int[] { } }` here, and Java's
      // `{{}}` shorthand is not valid C# at all.
      tc(2, { grid: [[]] }, [[]]),
      tc(3, { grid: [[1, 2], [3], [], [-4, 0, 5]] }, [[1, 2], [3], [], [-4, 0, 5]]),
    ],
    solutions: {
      javascript: 'function echoMatrix(grid) {\n  return grid;\n}',
      python: 'def echo_matrix(grid):\n    return grid',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> echoMatrix(vector<vector<int>>& grid) {\n        return grid;\n    }\n};',
      java: 'class Solution {\n    public int[][] echoMatrix(int[][] grid) {\n        return grid;\n    }\n}',
      csharp: 'public class Solution {\n    public int[][] EchoMatrix(int[][] grid) {\n        return grid;\n    }\n}',
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'mixed-args',
    covers: ['int', 'vector<int>', 'string', 'bool'],
    edges: ['multi-arg-order', 'empty', 'negative'],
    // Four arguments of four different types, with an array in the MIDDLE. In C this
    // becomes `int n, int* nums, int numsSize, char* s, bool flag` -- a generated
    // parameter wedged between two declared ones. No identity function can catch a
    // mistake in that interleaving; this one can.
    sig: {
      fn: 'describe',
      class: 'Solution',
      args: [
        { name: 'n', type: 'int' },
        { name: 'nums', type: 'vector<int>' },
        { name: 's', type: 'string' },
        { name: 'flag', type: 'bool' },
      ],
      ret: 'string',
    },
    cases: [
      tc(1, { n: 3, nums: [1, 2], s: 'ab', flag: true }, 'ab|3|2|true'),
      tc(2, { n: -1, nums: [], s: '', flag: false }, '|-1|0|false'),
      tc(3, { n: 0, nums: [9], s: 'caf\u00e9', flag: true }, 'caf\u00e9|0|1|true'),
    ],
    solutions: {
      javascript: 'function describe(n, nums, s, flag) {\n  return s + "|" + n + "|" + nums.length + "|" + (flag ? "true" : "false");\n}',
      python: 'def describe(n, nums, s, flag):\n    return s + "|" + str(n) + "|" + str(len(nums)) + "|" + ("true" if flag else "false")',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    string describe(int n, vector<int>& nums, string s, bool flag) {\n        return s + "|" + to_string(n) + "|" + to_string((int) nums.size()) + "|" + (flag ? "true" : "false");\n    }\n};',
      java: 'class Solution {\n    public String describe(int n, int[] nums, String s, boolean flag) {\n        return s + "|" + n + "|" + nums.length + "|" + (flag ? "true" : "false");\n    }\n}',
      c: 'char* describe(int n, int* nums, int numsSize, char* s, bool flag) {\n    char* out = (char*) malloc(strlen(s) + 64);\n    sprintf(out, "%s|%d|%d|%s", s, n, numsSize, flag ? "true" : "false");\n    return out;\n}',
      csharp: 'public class Solution {\n    public string Describe(int n, int[] nums, string s, bool flag) {\n        return s + "|" + n + "|" + nums.Length + "|" + (flag ? "true" : "false");\n    }\n}',
    },
    wrong: {
      // Swaps n and the array length, which is exactly the failure a wrong C parameter
      // interleaving would produce.
      javascript: 'function describe(n, nums, s, flag) {\n  return s + "|" + nums.length + "|" + n + "|" + (flag ? "true" : "false");\n}',
      python: 'def describe(n, nums, s, flag):\n    return s + "|" + str(len(nums)) + "|" + str(n) + "|" + ("true" if flag else "false")',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    string describe(int n, vector<int>& nums, string s, bool flag) {\n        return s + "|" + to_string((int) nums.size()) + "|" + to_string(n) + "|" + (flag ? "true" : "false");\n    }\n};',
      java: 'class Solution {\n    public String describe(int n, int[] nums, String s, boolean flag) {\n        return s + "|" + nums.length + "|" + n + "|" + (flag ? "true" : "false");\n    }\n}',
      c: 'char* describe(int n, int* nums, int numsSize, char* s, bool flag) {\n    char* out = (char*) malloc(strlen(s) + 64);\n    sprintf(out, "%s|%d|%d|%s", s, numsSize, n, flag ? "true" : "false");\n    return out;\n}',
      csharp: 'public class Solution {\n    public string Describe(int n, int[] nums, string s, bool flag) {\n        return s + "|" + nums.Length + "|" + n + "|" + (flag ? "true" : "false");\n    }\n}',
    },
  },
];

/** Every canonical type the corpus claims to cover. */
export function coveredTypes() {
  const s = new Set();
  for (const entry of CORPUS) for (const t of entry.covers) s.add(t);
  return [...s];
}

/** Every edge condition the corpus claims to cover. */
export function coveredEdges() {
  const s = new Set();
  for (const entry of CORPUS) for (const e of entry.edges) s.add(e);
  return [...s];
}

export function totalCases() {
  return CORPUS.reduce((n, e) => n + e.cases.length, 0);
}
