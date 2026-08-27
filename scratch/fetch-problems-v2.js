import fs from 'fs';
import https from 'https';

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
  { topic: 'Arrays & Hashing', pattern: 'Hash Map', search: 'hash-table', limit: 10 },
  { topic: 'Two Pointers', pattern: 'Opposite Direction', search: 'two-pointers', limit: 10 },
  { topic: 'Sliding Window', pattern: 'Variable Window', search: 'sliding-window', limit: 10 },
  { topic: 'Stack', pattern: 'Monotonic Stack', search: 'stack', limit: 10 },
  { topic: 'Binary Search', pattern: 'Search in Rotated', search: 'binary-search', limit: 10 },
  { topic: 'Linked List', pattern: 'Reversal', search: 'linked-list', limit: 10 },
  { topic: 'Trees', pattern: 'DFS', search: 'tree', limit: 10 },
  { topic: 'Graphs', pattern: 'BFS', search: 'breadth-first-search', limit: 10 },
  { topic: 'Dynamic Programming', pattern: '1D DP', search: 'dynamic-programming', limit: 10 },
  { topic: 'Backtracking', pattern: 'Combinations', search: 'backtracking', limit: 10 }
];

function extractExamples(content, metaData) {
  const examples = [];
  const testCases = [];
  
  if (!content) return { examples, testCases };
  
  const regex = /<strong[^>]*>Input:<\/strong>([^<]+)<strong[^>]*>Output:<\/strong>([^<]+)(?:<strong[^>]*>Explanation:<\/strong>([^<]+))?/g;
  let match;
  let i = 0;
  
  while ((match = regex.exec(content)) !== null) {
    let inputStr = match[1].trim();
    let outputStr = match[2].trim();
    let explanation = match[3] ? match[3].trim() : '';
    
    examples.push({
      input: inputStr,
      output: outputStr,
      explanation: explanation
    });
    
    // Parse inputStr into JSON object based on metaData
    let parsedInput = {};
    let parsedOutput = null;
    
    try {
      const meta = JSON.parse(metaData || '{}');
      if (meta.params) {
        // crude parsing
        const parts = inputStr.split(', ');
        for(let p of parts) {
            let [k, v] = p.split(' = ');
            if (v) parsedInput[k] = JSON.parse(v.replace(/'/g, '"'));
        }
      }
      parsedOutput = JSON.parse(outputStr.replace(/'/g, '"'));
    } catch(e) {
      parsedOutput = outputStr; // string fallback
    }
    
    testCases.push({
      input: parsedInput,
      expected: parsedOutput,
      hidden: false
    });
    i++;
  }
  return { examples, testCases };
}

async function run() {
  const problems = [];
  const slugs = new Set();
  
  for (const c of CURRICULUM) {
    console.log(`Fetching ${c.limit} for ${c.topic} - ${c.pattern}...`);
    const listRes = await fetchGraphQL(PROBLEM_LIST_QUERY, {
      categorySlug: "algorithms",
      limit: c.limit,
      skip: 0,
      filters: { tags: [c.search] }
    });
    
    if (!listRes.data || !listRes.data.problemsetQuestionList) continue;
    
    for (const q of listRes.data.problemsetQuestionList.questions) {
      if (slugs.has(q.titleSlug)) continue;
      slugs.add(q.titleSlug);
      
      console.log(`  Processing ${q.titleSlug}...`);
      const details = await fetchGraphQL(PROBLEM_DETAILS_QUERY, { titleSlug: q.titleSlug });
      if (!details.data || !details.data.question) continue;
      
      const dq = details.data.question;
      const getCode = (slug) => {
        const snip = (dq.codeSnippets || []).find(s => s.langSlug === slug);
        return snip ? snip.code : '';
      };
      
      const { examples, testCases } = extractExamples(dq.content, dq.metaData);
      
      let cppSig = null;
      try {
        let meta = JSON.parse(dq.metaData);
        if (meta.name && meta.params && meta.return) {
          cppSig = {
            fn: meta.name,
            class: "Solution",
            args: meta.params.map(p => ({name: p.name, type: mapType(p.type)})),
            ret: mapType(meta.return.type)
          };
        }
      } catch(e) {}
      
      problems.push({
        topic: c.topic,
        pattern: c.pattern,
        difficulty: dq.difficulty,
        title: dq.title,
        slug: dq.titleSlug,
        leetcode_link: `https://leetcode.com/problems/${dq.titleSlug}`,
        description: (dq.content || '').replace(/<[^>]+>/g, '').slice(0, 800) + '...',
        examples: examples,
        constraints: [],
        time_complexity: 'O(?)',
        space_complexity: 'O(?)',
        starter_code: {
          javascript: getCode('javascript'),
          python: getCode('python'),
          cpp: getCode('cpp'),
          c: getCode('c'),
          csharp: getCode('csharp')
        },
        cpp_signature: cppSig,
        test_cases: testCases.length > 0 ? testCases : [{ input: {}, expected: {}, hidden: false }]
      });
      await new Promise(r => setTimeout(r, 400));
    }
  }
  
  const fileContent = `export const PROBLEMS = ${JSON.stringify(problems, null, 2)};`;
  fs.writeFileSync('server/data/real-problems-generated.js', fileContent);
  console.log(`Wrote ${problems.length} problems to real-problems-generated.js`);
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

run().catch(console.error);
