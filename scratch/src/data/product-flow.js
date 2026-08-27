function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

const SUBJECT_DEFAULT_CATEGORY = {
  dsa: 'arrays',
  sql: 'design',
  dbms: 'design',
  oops: 'design',
  'system-design': 'design',
  lld: 'design',
  hld: 'design',
  cn: 'graph-advanced',
  os: 'greedy',
};

const TOPIC_CATEGORY_RULES = [
  { test: /array|string|hash|prefix/i, category: 'arrays' },
  { test: /two pointer/i, category: 'two-pointers' },
  { test: /window/i, category: 'sliding-window' },
  { test: /stack/i, category: 'stack' },
  { test: /queue|deque/i, category: 'queue' },
  { test: /linked list|list/i, category: 'linked-list' },
  { test: /binary search|search/i, category: 'binary-search' },
  { test: /sort/i, category: 'sorting' },
  { test: /matrix/i, category: 'matrix' },
  { test: /recursion/i, category: 'recursion' },
  { test: /backtracking/i, category: 'backtracking' },
  { test: /tree/i, category: 'binary-tree' },
  { test: /graph|bfs|dfs/i, category: 'graph-bfs-dfs' },
  { test: /heap|priority/i, category: 'heap' },
  { test: /dp|dynamic programming/i, category: 'dp-1d' },
  { test: /greedy/i, category: 'greedy' },
  { test: /trie/i, category: 'trie' },
  { test: /segment|bit/i, category: 'segment-tree' },
  { test: /math|number/i, category: 'math' },
  { test: /bit manipulation/i, category: 'bit-manipulation' },
  { test: /design|system/i, category: 'design' },
];

export function inferCategoryFromTopic(topicName, subjectName = '') {
  const topic = String(topicName || '').trim();
  for (const rule of TOPIC_CATEGORY_RULES) {
    if (rule.test.test(topic)) {
      return rule.category;
    }
  }

  const subjectKey = toSlug(subjectName);
  return SUBJECT_DEFAULT_CATEGORY[subjectKey] || 'arrays';
}

export function buildProblemsRoute({
  category = '',
  company = '',
  difficulty = '',
} = {}) {
  return withQuery('/problems', { category, company, difficulty });
}

export function getLearnToProblemsRoute(subjectName, topicName = '') {
  const subjectKey = toSlug(subjectName);
  if (subjectKey === 'sql' || subjectKey === 'dbms') {
    return '/sql-track';
  }
  const category = inferCategoryFromTopic(topicName, subjectName);
  return buildProblemsRoute({ category });
}

export function getInterviewToProblemsRoute(companyName = '') {
  const company = String(companyName || '').trim();
  return buildProblemsRoute({ company });
}

export function getSqlToProblemsRoute(companyName = '', difficulty = '') {
  const company = String(companyName || '').trim();
  return buildProblemsRoute({ company, difficulty });
}

export function getSheetsRoute(sheetSize = 75) {
  const normalized = Number(sheetSize);
  const value = normalized === 300 ? 300 : normalized === 150 ? 150 : 75;
  return withQuery('/sheets', { sheet: value });
}

export function getDebuggerSqlRoute(sql = '', company = '') {
  return withQuery('/debugger', { panel: 'sql', sql, company });
}

export function getDebuggerFailureRoute({ autostart = true, source = '' } = {}) {
  return withQuery('/debugger', {
    panel: 'failed',
    autostart: autostart ? 1 : '',
    source,
  });
}

export function getStartJourneyRoute(entry = 'learn') {
  const key = String(entry || '').trim().toLowerCase();
  if (key === 'interview') return '/interview/mock?type=technical&company=Google';
  if (key === 'sheets') return getSheetsRoute(75);
  if (key === 'sql') return '/sql-track?level=Beginner';
  if (key === 'problems') return '/problems';
  return '/learn/dsa';
}

export const SQL_TRACK_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Interview'];

export default {
  inferCategoryFromTopic,
  buildProblemsRoute,
  getLearnToProblemsRoute,
  getInterviewToProblemsRoute,
  getSqlToProblemsRoute,
  getSheetsRoute,
  getDebuggerSqlRoute,
  getDebuggerFailureRoute,
  getStartJourneyRoute,
  SQL_TRACK_LEVELS,
};
