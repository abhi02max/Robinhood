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
      total: totalNum
      questions: data {
        title
        titleSlug
        difficulty
        topicTags { name }
      }
    }
  }
`;

const PROBLEM_DETAILS_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
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
  { topic: 'Arrays & Hashing', pattern: 'Hash Map', search: 'hash-table', limit: 5 },
  { topic: 'Arrays & Hashing', pattern: 'Prefix Sum', search: 'prefix-sum', limit: 5 },
  { topic: 'Two Pointers', pattern: 'Opposite Direction', search: 'two-pointers', limit: 5 },
  { topic: 'Sliding Window', pattern: 'Variable Window', search: 'sliding-window', limit: 5 },
  { topic: 'Stack', pattern: 'Monotonic Stack', search: 'stack', limit: 5 },
  { topic: 'Binary Search', pattern: 'Search in Rotated', search: 'binary-search', limit: 5 },
  { topic: 'Linked List', pattern: 'Reversal', search: 'linked-list', limit: 5 },
  { topic: 'Trees', pattern: 'DFS', search: 'tree', limit: 5 },
  { topic: 'Graphs', pattern: 'BFS', search: 'breadth-first-search', limit: 5 },
  { topic: 'Dynamic Programming', pattern: '1D DP', search: 'dynamic-programming', limit: 5 }
];

async function run() {
  const problems = [];
  
  for (const c of CURRICULUM) {
    console.log(`Fetching ${c.limit} for ${c.topic} - ${c.pattern}...`);
    const listRes = await fetchGraphQL(PROBLEM_LIST_QUERY, {
      categorySlug: "algorithms",
      limit: c.limit,
      skip: 0,
      filters: { tags: [c.search] }
    });
    
    if (!listRes.data || !listRes.data.problemsetQuestionList) {
      console.log('Failed to fetch list for', c.pattern);
      continue;
    }
    
    for (const q of listRes.data.problemsetQuestionList.questions) {
      console.log(`  Details for ${q.titleSlug}...`);
      const details = await fetchGraphQL(PROBLEM_DETAILS_QUERY, { titleSlug: q.titleSlug });
      if (!details.data || !details.data.question) continue;
      
      const dq = details.data.question;
      const getCode = (slug) => {
        const snip = (dq.codeSnippets || []).find(s => s.langSlug === slug);
        return snip ? snip.code : '';
      };
      
      problems.push({
        topic: c.topic,
        pattern: c.pattern,
        difficulty: dq.difficulty,
        title: dq.title,
        slug: dq.titleSlug,
        leetcode_link: `https://leetcode.com/problems/${dq.titleSlug}`,
        description: (dq.content || '').replace(/<[^>]+>/g, '').slice(0, 500) + '...',
        examples: [],
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
        test_cases: [
          { input: {}, expected: {}, hidden: false } // Placeholder, execution needs exact JSON matching.
        ]
      });
      await new Promise(r => setTimeout(r, 500)); // Respect rate limits
    }
  }
  
  const fileContent = `export const PROBLEMS = ${JSON.stringify(problems, null, 2)};`;
  fs.writeFileSync('server/data/real-problems-generated.js', fileContent);
  console.log(`Wrote ${problems.length} problems to real-problems-generated.js`);
}

run().catch(console.error);
