const fs = require('fs');
const path = require('path');

function generateTestCases() {
    const testCases = [];
    
    // Helper to calculate expected output
    function solve(s) {
        let max = 0;
        let start = 0;
        let seen = new Map();
        for (let i = 0; i < s.length; i++) {
            if (seen.has(s[i]) && seen.get(s[i]) >= start) {
                start = seen.get(s[i]) + 1;
            }
            max = Math.max(max, i - start + 1);
            seen.set(s[i], i);
        }
        return max;
    }

    // Helper to add case
    function addCase(inputStr, isHidden) {
        testCases.push({
            input_payload: { s: inputStr },
            expected_output: solve(inputStr),
            is_hidden: isHidden,
            order_index: testCases.length
        });
    }

    // === VISIBLE CASES (5) ===
    addCase("abcabcbb", false); // Example 1
    addCase("bbbbb", false);    // Example 2
    addCase("pwwkew", false);   // Example 3
    addCase("", false);         // Edge: Empty
    addCase(" ", false);        // Edge: Single space

    // === HIDDEN CASES (45) ===
    
    // Small edge cases (5)
    addCase("au", true);
    addCase("dvdf", true);
    addCase("aab", true);
    addCase("tmmzuxt", true);
    addCase("abcdefghijklmnopqrstuvwxyz", true); // All unique

    // Random strings of increasing length to test O(N^2) TLE (40)
    const lengths = [
        100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000 
    ];
    
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()_+";
    
    for (let i = 0; i < 40; i++) {
        const length = lengths[i % lengths.length];
        let str = '';
        // Mix between highly repetitive and highly random to test different window constraints
        const uniqueness = Math.random();
        
        for (let j = 0; j < length; j++) {
            if (uniqueness > 0.8) {
                // Highly repetitive (small alphabet)
                str += chars[Math.floor(Math.random() * 3)];
            } else if (uniqueness < 0.2) {
                // Highly unique (large alphabet, less collisions)
                str += chars[Math.floor(Math.random() * chars.length)];
            } else {
                // Normal
                str += chars[Math.floor(Math.random() * 26)];
            }
        }
        addCase(str, true);
    }

    return testCases;
}

const problemData = {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    topic: "Arrays & Strings",
    pattern: "Sliding Window",
    tags: [
        { type: "Company", value: "Amazon" },
        { type: "Company", value: "Microsoft" },
        { type: "Company", value: "Meta" },
        { type: "Concept", value: "Hash Table" },
        { type: "Concept", value: "Sliding Window" }
    ],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A **substring** is a contiguous non-empty sequence of characters within a string.`,
    examples: [
        {
            input: 's = "abcabcbb"',
            output: '3',
            explanation: 'The answer is "abc", with the length of 3.'
        },
        {
            input: 's = "bbbbb"',
            output: '1',
            explanation: 'The answer is "b", with the length of 1.'
        },
        {
            input: 's = "pwwkew"',
            output: '3',
            explanation: 'The answer is "wke", with the length of 3. Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.'
        }
    ],
    constraints: [
        "0 <= s.length <= 5 * 10^4",
        "s consists of English letters, digits, symbols and spaces."
    ],
    edge_cases: [
        "Empty string (length 0)",
        "String with only one character",
        "String with all identical characters",
        "String with all unique characters",
        "String containing spaces and special symbols"
    ],
    approach_brute: `**Brute Force Approach**
Check all possible substrings of the given string. For each substring, check if it contains all unique characters.
1. Generate all substrings.
2. For each substring, use a Set to verify if all characters are unique.
3. Keep track of the maximum length found.`,
    approach_optimal: `**Sliding Window Approach (Optimized)**
Use two pointers (\`left\` and \`right\`) to represent a window. Use a HashMap to store the last seen index of each character.
1. Iterate \`right\` pointer through the string.
2. If the character at \`right\` is already in the map AND its index is >= \`left\`, move \`left\` to \`map.get(s[right]) + 1\`.
3. Update the maximum length as \`right - left + 1\`.
4. Update the character's index in the map.`,
    time_complexity: {
        brute: "O(N^3)",
        optimal: "O(N)"
    },
    space_complexity: {
        brute: "O(min(N, M)) where M is charset size",
        optimal: "O(min(N, M)) where M is charset size"
    },
    test_cases: generateTestCases()
};

const outputPath = path.join(__dirname, '..', 'longest-substring.json');
fs.writeFileSync(outputPath, JSON.stringify(problemData, null, 2));

console.log(`Generated problem data with ${problemData.test_cases.length} test cases at ${outputPath}`);
