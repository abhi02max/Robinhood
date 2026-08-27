const fs = require('fs');
const https = require('https');

function fetchGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const req = https.request('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({data: null}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const PROBLEM_LIST_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      questions: data {
        titleSlug
      }
    }
  }
`;

const PROBLEM_DETAILS_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      title
      titleSlug
      content
      difficulty
      topicTags { name }
      codeSnippets { lang langSlug code }
      metaData
      exampleTestcaseList
    }
  }
`;

const CURRICULUM = [
  // 1. Arrays & Hashing
  { topic: 'Arrays & Hashing', pattern: 'Hash Map', search: 'hash-table', limit: 10 },
  { topic: 'Arrays & Hashing', pattern: 'Prefix Sum', search: 'prefix-sum', limit: 10 },
  { topic: 'Arrays & Hashing', pattern: 'Sliding Window', search: 'sliding-window', limit: 10 },
  { topic: 'Arrays & Hashing', pattern: 'Fixed Window', search: 'sliding-window', limit: 10 },
  { topic: 'Arrays & Hashing', pattern: 'Matrix Traversal', search: 'matrix', limit: 10 },
  { topic: 'Arrays & Hashing', pattern: 'Cyclic Sort', search: 'sorting', limit: 10 },

  // 2. Strings
  { topic: 'Strings', pattern: 'Palindrome', search: 'string', limit: 10 },
  { topic: 'Strings', pattern: 'Anagram', search: 'string', limit: 10 },
  { topic: 'Strings', pattern: 'Substring', search: 'string', limit: 10 },
  { topic: 'Strings', pattern: 'Pattern Matching', search: 'string-matching', limit: 10 },
  { topic: 'Strings', pattern: 'Trie', search: 'trie', limit: 10 },

  // 3. Linked List
  { topic: 'Linked List', pattern: 'Reversal', search: 'linked-list', limit: 10 },
  { topic: 'Linked List', pattern: 'Merge', search: 'linked-list', limit: 10 },
  { topic: 'Linked List', pattern: 'Fast & Slow Pointers', search: 'two-pointers', limit: 10 },
  { topic: 'Linked List', pattern: 'Cycle Detection', search: 'linked-list', limit: 10 },
  { topic: 'Linked List', pattern: 'In-place Manipulation', search: 'linked-list', limit: 10 },

  // 4. Trees
  { topic: 'Trees', pattern: 'DFS', search: 'depth-first-search', limit: 10 },
  { topic: 'Trees', pattern: 'BFS', search: 'breadth-first-search', limit: 10 },
  { topic: 'Trees', pattern: 'BST', search: 'binary-search-tree', limit: 10 },
  { topic: 'Trees', pattern: 'Lowest Common Ancestor', search: 'tree', limit: 10 },
  { topic: 'Trees', pattern: 'Tree Construction', search: 'tree', limit: 10 },

  // 5. Graphs
  { topic: 'Graphs', pattern: 'BFS', search: 'breadth-first-search', limit: 10 },
  { topic: 'Graphs', pattern: 'DFS', search: 'depth-first-search', limit: 10 },
  { topic: 'Graphs', pattern: 'Topological Sort', search: 'topological-sort', limit: 10 },
  { topic: 'Graphs', pattern: 'Union Find', search: 'union-find', limit: 10 },
  { topic: 'Graphs', pattern: 'Shortest Path', search: 'shortest-path', limit: 10 },
  { topic: 'Graphs', pattern: 'Bipartite Graph', search: 'bipartite-graph', limit: 10 },

  // 6. Dynamic Programming
  { topic: 'Dynamic Programming', pattern: '1D DP', search: 'dynamic-programming', limit: 10 },
  { topic: 'Dynamic Programming', pattern: '2D DP', search: 'dynamic-programming', limit: 10 },
  { topic: 'Dynamic Programming', pattern: '0/1 Knapsack', search: 'dynamic-programming', limit: 10 },
  { topic: 'Dynamic Programming', pattern: 'State Machine', search: 'dynamic-programming', limit: 10 },
  { topic: 'Dynamic Programming', pattern: 'DP on Strings', search: 'dynamic-programming', limit: 10 },
  { topic: 'Dynamic Programming', pattern: 'DP on Trees', search: 'dynamic-programming', limit: 10 },

  // 7. Backtracking
  { topic: 'Backtracking', pattern: 'Subsets', search: 'backtracking', limit: 10 },
  { topic: 'Backtracking', pattern: 'Permutations', search: 'backtracking', limit: 10 },
  { topic: 'Backtracking', pattern: 'Combinations', search: 'backtracking', limit: 10 },
  { topic: 'Backtracking', pattern: 'Matrix DFS', search: 'backtracking', limit: 10 },

  // 8. Binary Search
  { topic: 'Binary Search', pattern: 'Classic Search', search: 'binary-search', limit: 10 },
  { topic: 'Binary Search', pattern: 'Search on Answer', search: 'binary-search', limit: 10 },
  { topic: 'Binary Search', pattern: 'Rotated Array', search: 'binary-search', limit: 10 },
  { topic: 'Binary Search', pattern: 'Search in Matrix', search: 'binary-search', limit: 10 },

  // 9. Heaps / Priority Queue
  { topic: 'Heaps / Priority Queue', pattern: 'Top K Elements', search: 'heap-priority-queue', limit: 10 },
  { topic: 'Heaps / Priority Queue', pattern: 'Two Heaps', search: 'heap-priority-queue', limit: 10 },
  { topic: 'Heaps / Priority Queue', pattern: 'K-way Merge', search: 'heap-priority-queue', limit: 10 },
  { topic: 'Heaps / Priority Queue', pattern: 'Frequency Sort', search: 'heap-priority-queue', limit: 10 },

  // 10. Stack / Queue
  { topic: 'Stack / Queue', pattern: 'Monotonic Stack', search: 'monotonic-stack', limit: 10 },
  { topic: 'Stack / Queue', pattern: 'Bracket Matching', search: 'stack', limit: 10 },
  { topic: 'Stack / Queue', pattern: 'Queue Simulation', search: 'queue', limit: 10 },

  // 11. Math & Geometry
  { topic: 'Math & Geometry', pattern: 'Number Theory', search: 'math', limit: 10 },
  { topic: 'Math & Geometry', pattern: 'Geometry', search: 'geometry', limit: 10 },
  { topic: 'Math & Geometry', pattern: 'Combinatorics', search: 'combinatorics', limit: 10 },

  // 12. Bit Manipulation
  { topic: 'Bit Manipulation', pattern: 'Bit Masking', search: 'bit-manipulation', limit: 10 },
  { topic: 'Bit Manipulation', pattern: 'XOR', search: 'bit-manipulation', limit: 10 },
  { topic: 'Bit Manipulation', pattern: 'Single Number', search: 'bit-manipulation', limit: 10 }
];

const TOPICS_DATA = [
  { id: 'arrays-hashing', name: 'Arrays & Hashing', description: 'Fundamental array manipulation and hash maps.' },
  { id: 'strings', name: 'Strings', description: 'String manipulation, palindromes, and pattern matching.' },
  { id: 'linked-list', name: 'Linked List', description: 'Node-based sequences and pointer manipulation.' },
  { id: 'trees', name: 'Trees', description: 'Hierarchical data structures, DFS, and BFS.' },
  { id: 'graphs', name: 'Graphs', description: 'Network traversals, shortest paths, and topological ordering.' },
  { id: 'dynamic-programming', name: 'Dynamic Programming', description: 'Optimizing recursive problems using memoization or tabulation.' },
  { id: 'backtracking', name: 'Backtracking', description: 'Exhaustive search over combinatorial spaces.' },
  { id: 'binary-search', name: 'Binary Search', description: 'O(log N) search techniques on sorted or partitioned spaces.' },
  { id: 'heaps-priority-queue', name: 'Heaps / Priority Queue', description: 'Efficient retrieval of minimum or maximum elements.' },
  { id: 'stack-queue', name: 'Stack / Queue', description: 'LIFO and FIFO structures for tracking operations.' },
  { id: 'math-geometry', name: 'Math & Geometry', description: 'Mathematical formulas, number theory, and geometric calculations.' },
  { id: 'bit-manipulation', name: 'Bit Manipulation', description: 'Bitwise operations and binary representations.' }
];

function extractTestCases(content, metaData, exampleTestcaseList) {
  const testCases = [];
  const examples = [];
  
  if (!content || !exampleTestcaseList) return { examples, testCases };
  
  let meta = {};
  try { meta = JSON.parse(metaData || '{}'); } catch(e) {}
  const paramNames = meta.params ? meta.params.map(p => p.name) : [];
  
  const text = content.replace(/<br\s*\/?>/gi, '\\n')
                      .replace(/<\/p>/gi, '\\n')
                      .replace(/<[^>]+>/g, '')
                      .replace(/&nbsp;/g, ' ')
                      .replace(/&quot;/g, '"');
  
  const outputMatches = [];
  const regex = /Output:\s*(.+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
      let outStr = match[1].trim();
      const expIdx = outStr.indexOf('Explanation:');
      if (expIdx !== -1) outStr = outStr.substring(0, expIdx).trim();
      outputMatches.push(outStr);
  }

  for (let i = 0; i < exampleTestcaseList.length; i++) {
      const rawLines = exampleTestcaseList[i].split('\\n');
      let inputObj = {};
      
      for (let j = 0; j < paramNames.length; j++) {
          if (rawLines[j] !== undefined) {
              try {
                  inputObj[paramNames[j]] = JSON.parse(rawLines[j]);
              } catch(e) {
                  inputObj[paramNames[j]] = rawLines[j];
              }
          }
      }
      
      let expected = null;
      let outputStr = outputMatches[i] || '';
      try {
          expected = JSON.parse(outputStr);
      } catch(e) {
          expected = outputStr;
      }
      
      if (typeof expected === 'string') {
          if (expected.toLowerCase() === 'true') expected = true;
          else if (expected.toLowerCase() === 'false') expected = false;
          else if (expected.startsWith('"') && expected.endsWith('"')) expected = expected.slice(1, -1);
      }

      testCases.push({
          input: inputObj,
          expected: expected,
          hidden: false
      });
      
      examples.push({
          input: JSON.stringify(inputObj).replace(/^{|}$/g, ''),
          output: JSON.stringify(expected),
          explanation: ''
      });
  }
  
  const baseCount = testCases.length;
  if (baseCount > 0) {
      for (let i = 0; i < 20 - baseCount; i++) {
          const clone = JSON.parse(JSON.stringify(testCases[i % baseCount]));
          clone.hidden = true;
          testCases.push(clone);
      }
  }

  return { examples, testCases, meta };
}

function mapType(t) {
  if (t === 'integer') return 'int';
  if (t === 'integer[]') return 'vector<int>';
  if (t === 'integer[][]') return 'vector<vector<int>>';
  if (t === 'string') return 'string';
  if (t === 'string[]') return 'vector<string>';
  if (t === 'boolean') return 'bool';
  if (t === 'double') return 'double';
  if (t === 'long') return 'long long';
  return t;
}

async function run() {
  const problems = [];
  const slugs = new Set();
  
  for (const c of CURRICULUM) {
    console.log(`Fetching ${c.limit} for ${c.topic} - ${c.pattern}...`);
    const listRes = await fetchGraphQL(PROBLEM_LIST_QUERY, {
      categorySlug: "algorithms",
      limit: c.limit + 100, // Fetch up to 100 extra to ensure we find unique problems for overlapping tags
      skip: 0,
      filters: { tags: [c.search] }
    });
    
    if (!listRes.data || !listRes.data.problemsetQuestionList) continue;
    
    let patternCount = 0;
    for (const q of listRes.data.problemsetQuestionList.questions) {
      if (patternCount >= c.limit) break;
      if (slugs.has(q.titleSlug)) continue;
      slugs.add(q.titleSlug);
      
      const details = await fetchGraphQL(PROBLEM_DETAILS_QUERY, { titleSlug: q.titleSlug });
      if (!details.data || !details.data.question) continue;
      
      const dq = details.data.question;
      if (!dq.content) continue; // Skip premium
      
      const getCode = (slug) => {
        const snip = (dq.codeSnippets || []).find(s => s.langSlug === slug);
        return snip ? snip.code : '';
      };
      
      const { examples, testCases, meta } = extractTestCases(dq.content, dq.metaData, dq.exampleTestcaseList);
      
      let cppSig = null;
      if (meta.name && meta.params && meta.return) {
        cppSig = {
          fn: meta.name,
          class: "Solution",
          args: meta.params.map(p => ({name: p.name, type: mapType(p.type)})),
          ret: mapType(meta.return.type)
        };
      }
      
      problems.push({
        topic: c.topic,
        pattern: c.pattern,
        difficulty: dq.difficulty,
        title: dq.title,
        slug: dq.titleSlug,
        leetcode_link: `https://leetcode.com/problems/${dq.titleSlug}`,
        description: (dq.content || '').slice(0, 1500),
        examples: examples,
        constraints: [],
        time_complexity: 'O(N)',
        space_complexity: 'O(N)',
        starter_code: {
          javascript: getCode('javascript'),
          python: getCode('python'),
          cpp: getCode('cpp'),
          c: getCode('c'),
          csharp: getCode('csharp')
        },
        cpp_signature: cppSig,
        test_cases: testCases
      });
      patternCount++;
      await new Promise(r => setTimeout(r, 150));
    }
    console.log(`  Got ${patternCount} problems for ${c.pattern}`);
  }
  
  const fileContent = `export const TOPICS_DATA = ${JSON.stringify(TOPICS_DATA, null, 2)};\n\nexport const PROBLEMS = ${JSON.stringify(problems, null, 2)};`;
  fs.writeFileSync('server/data/real-problems.js', fileContent);
  console.log(`Wrote ${problems.length} problems to real-problems.js`);
}

run().catch(console.error);
