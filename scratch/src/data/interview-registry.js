import { TECHNICAL_QUESTIONS } from './interview-questions-technical.js';
import { BEHAVIORAL_QUESTIONS } from './interview-questions-behavioral.js';
import { HR_QUESTIONS } from './interview-questions-hr.js';

// ============================================
// INTERVIEW REGISTRY — Single source of truth
// Categories, Roles, Companies, Questions, Skills
// ============================================

export const INTERVIEW_CATEGORIES = [
  {
    id: 'technical',
    name: 'Technical',
    icon: 'code-2',
    color: '#3B75C8',
    description: 'DSA, system design, OOP, databases, OS, and networking.',
    subcategories: [
      { id: 'dsa', name: 'DSA & Algorithms' },
      { id: 'system-design', name: 'System Design' },
      { id: 'oop', name: 'OOP & Design Patterns' },
      { id: 'database', name: 'Database & SQL' },
      { id: 'os', name: 'OS & Concurrency' },
      { id: 'networking', name: 'Networking & Web' }
    ]
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    icon: 'users',
    color: '#8B5CF6',
    description: 'Leadership, conflict, teamwork, failure, and initiative.',
    subcategories: [
      { id: 'leadership', name: 'Leadership' },
      { id: 'conflict', name: 'Conflict Resolution' },
      { id: 'teamwork', name: 'Teamwork' },
      { id: 'failure', name: 'Failure & Learning' },
      { id: 'initiative', name: 'Initiative & Ownership' },
      { id: 'communication', name: 'Communication' }
    ]
  },
  {
    id: 'hr',
    name: 'HR',
    icon: 'briefcase',
    color: '#10B981',
    description: 'Motivation, salary, culture fit, goals, and situations.',
    subcategories: [
      { id: 'motivation', name: 'Motivation / Why Us' },
      { id: 'salary', name: 'Salary & Negotiation' },
      { id: 'culture', name: 'Culture Fit' },
      { id: 'career', name: 'Career Goals' },
      { id: 'weaknesses', name: 'Strengths & Weaknesses' },
      { id: 'situational', name: 'Situational' }
    ]
  }
];

export const INTERVIEW_ROLES = [
  { id: 'sde', name: 'Software Engineer (SDE)', tags: ['dsa', 'oop', 'algorithms', 'agile'] },
  { id: 'backend', name: 'Backend Engineer', tags: ['system-design', 'database', 'networking', 'os', 'api', 'kafka'] },
  { id: 'frontend', name: 'Frontend Engineer', tags: ['javascript', 'react', 'css', 'dom', 'web'] },
  { id: 'data', name: 'Data Engineer', tags: ['database', 'sql', 'python', 'pipeline', 'etl'] },
  { id: 'fullstack', name: 'Full Stack', tags: ['dsa', 'system-design', 'database', 'javascript', 'react'] }
];

export const INTERVIEW_COMPANIES = [
  { id: 'google', name: 'Google', focus: ['dsa', 'system-design', 'behavioral'], rounds: ['Phone Screen', '4-5 Onsite', 'Team Match'], difficulty: 'Hard' },
  { id: 'amazon', name: 'Amazon', focus: ['leadership (LPs)', 'system-design', 'behavioral'], rounds: ['OA', 'Phone', '4 Onsite (LP+DSA)'], difficulty: 'Hard' },
  { id: 'meta', name: 'Meta', focus: ['dsa', 'frontend/backend', 'behavioral'], rounds: ['Phone', '4 Onsite (Jedi)'], difficulty: 'Hard' },
  { id: 'microsoft', name: 'Microsoft', focus: ['oop', 'system-design', 'teamwork'], rounds: ['OA', 'Phone', '4 Onsite'], difficulty: 'Medium' },
  { id: 'apple', name: 'Apple', focus: ['os', 'hardware/software', 'culture'], rounds: ['Phone', 'FaceTime', '6 Onsite'], difficulty: 'Hard' },
  { id: 'netflix', name: 'Netflix', focus: ['culture', 'system-design', 'senior-level'], rounds: ['Phone', 'Take-home', '5 Onsite'], difficulty: 'Hard' },
  { id: 'uber', name: 'Uber', focus: ['system-design', 'architecture', 'dsa'], rounds: ['Phone', '4 Onsite'], difficulty: 'Hard' },
  { id: 'stripe', name: 'Stripe', focus: ['bug-squashing', 'system-design', 'practical'], rounds: ['Byteboard', 'Integration', 'System Design'], difficulty: 'Hard' },
  { id: 'spotify', name: 'Spotify', focus: ['culture', 'agile', 'data'], rounds: ['Phone', 'Coding', 'System Design', 'Values'], difficulty: 'Medium' },
  { id: 'adobe', name: 'Adobe', focus: ['oop', 'architecture', 'behavioral'], rounds: ['Phone', 'Coding', 'Onsite'], difficulty: 'Medium' },
  { id: 'startups', name: 'Startups (Y-Combinator)', focus: ['fullstack', 'initiative', 'speed'], rounds: ['Founder Chat', 'Take-home', 'Pair Programming'], difficulty: 'Medium' },
  { id: 'enterprise', name: 'Enterprise (Banks/Insurance)', focus: ['java/c#', 'database', 'process'], rounds: ['HR', 'Technical Screen', 'Manager Chat'], difficulty: 'Easy' }
];

// Single unified array for all 120 questions
export const INTERVIEW_QUESTIONS = [
  ...TECHNICAL_QUESTIONS,
  ...BEHAVIORAL_QUESTIONS,
  ...HR_QUESTIONS
];

// Skill synonym dictionary for Resume Parsing
export const SKILL_DICTIONARY = {
  'javascript': { aliases: ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js', 'node.js', 'nodejs', 'node'], tags: ['javascript', 'frontend', 'web'] },
  'react': { aliases: ['reactjs', 'react.js', 'react native', 'react hooks', 'redux', 'next.js', 'nextjs'], tags: ['react', 'frontend', 'javascript'] },
  'python': { aliases: ['py', 'python3', 'cpython', 'django', 'flask', 'fastapi'], tags: ['python', 'backend', 'data'] },
  'java': { aliases: ['jdk', 'jvm', 'spring', 'spring boot', 'hibernate'], tags: ['java', 'backend', 'enterprise', 'oop'] },
  'csharp': { aliases: ['c#', '.net', 'dotnet', 'asp.net'], tags: ['c#', 'backend', 'enterprise', 'oop'] },
  'cpp': { aliases: ['c++', 'cplusplus'], tags: ['c++', 'system', 'os', 'pointers'] },
  'sql': { aliases: ['mysql', 'postgresql', 'postgres', 'sqlite', 'tsql', 'pl/sql', 'oracle db', 'sql server'], tags: ['sql', 'database', 'data'] },
  'nosql': { aliases: ['mongodb', 'cassandra', 'dynamodb', 'couchbase', 'cosmosdb'], tags: ['nosql', 'database', 'system-design'] },
  'system design': { aliases: ['sys design', 'hld', 'high level design', 'lld', 'low level design', 'architecture', 'microservices', 'distributed systems'], tags: ['system-design', 'hld'] },
  'data structures': { aliases: ['ds', 'dsa', 'algorithms', 'algo', 'competitive programming', 'cp'], tags: ['dsa', 'data-structures', 'algorithms'] },
  'aws': { aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'], tags: ['aws', 'cloud', 'devops'] },
  'docker': { aliases: ['containerization', 'containers', 'dockerfile', 'docker compose'], tags: ['docker', 'devops'] },
  'kubernetes': { aliases: ['k8s', 'kubectl', 'helm', 'container orchestration'], tags: ['kubernetes', 'devops'] },
  'machine learning': { aliases: ['ml', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'ai', 'keras'], tags: ['ml', 'data', 'ai'] },
  'git': { aliases: ['github', 'gitlab', 'version control', 'vcs', 'bitbucket'], tags: ['git', 'devops', 'version-control'] },
  'rest': { aliases: ['rest api', 'restful', 'api design', 'http api', 'openapi', 'swagger'], tags: ['api', 'backend', 'networking'] },
  'graphql': { aliases: ['gql', 'apollo graphql'], tags: ['graphql', 'api', 'frontend'] },
  'css': { aliases: ['css3', 'tailwind', 'sass', 'scss', 'styled components', 'less'], tags: ['css', 'frontend'] },
  'html': { aliases: ['html5', 'markup', 'dom'], tags: ['html', 'frontend', 'dom'] },
  'typescript': { aliases: ['ts'], tags: ['typescript', 'frontend', 'javascript'] },
  'go': { aliases: ['golang'], tags: ['go', 'backend', 'system'] },
  'rust': { aliases: ['cargo'], tags: ['rust', 'backend', 'system'] },
  'redis': { aliases: ['memcached', 'cache', 'caching'], tags: ['redis', 'cache', 'system-design'] },
  'kafka': { aliases: ['rabbitmq', 'sqs', 'message bus', 'event broker', 'pub/sub', 'pubsub'], tags: ['kafka', 'messaging', 'async', 'system-design'] },
  'linux': { aliases: ['ubuntu', 'centos', 'bash', 'shell', 'unix'], tags: ['linux', 'os', 'devops'] },
  'agile': { aliases: ['scrum', 'kanban', 'sprints'], tags: ['agile', 'process'] },
  'testing': { aliases: ['tdd', 'bdd', 'jest', 'cypress', 'selenium', 'junit', 'pytest', 'mocha', 'chai'], tags: ['testing', 'qa'] }
};

// ============================================
// LOOKUP HELPERS
// ============================================

export function getQuestionsByCategory(categoryId) {
  return INTERVIEW_QUESTIONS.filter(q => q.category === categoryId);
}

export function getQuestionsByCompany(companyId) {
  if (!companyId || companyId === 'any') return INTERVIEW_QUESTIONS;
  return INTERVIEW_QUESTIONS.filter(q => q.companies.includes(companyId.toLowerCase()));
}

export function getQuestionsByRole(roleId) {
  if (!roleId || roleId === 'any') return INTERVIEW_QUESTIONS;
  return INTERVIEW_QUESTIONS.filter(q => q.roles.includes(roleId.toLowerCase()));
}

export function getQuestionById(id) {
  return INTERVIEW_QUESTIONS.find(q => q.id === id);
}

export function getCategoryById(id) {
  return INTERVIEW_CATEGORIES.find(c => c.id === id);
}

export function getCategoryStats(categoryId) {
  const qs = getQuestionsByCategory(categoryId);
  return {
    total: qs.length,
    easy: qs.filter(q => q.difficulty === 'Easy').length,
    medium: qs.filter(q => q.difficulty === 'Medium').length,
    hard: qs.filter(q => q.difficulty === 'Hard').length
  };
}

export function parseResumeSkills(resumeText) {
  const normalized = resumeText.toLowerCase().replace(/[^\w\s+#.]/g, ' ');
  const tokens = normalized.split(/\s+/);
  
  const matches = new Set();
  
  for (const [canonical, data] of Object.entries(SKILL_DICTIONARY)) {
    // Check canonical name
    if (normalized.includes(canonical)) {
      matches.add(canonical);
      continue;
    }
    // Check aliases
    for (const alias of data.aliases) {
      // If alias has space, check string include, else check exact token
      if (alias.includes(' ') && normalized.includes(alias)) {
        matches.add(canonical);
        break;
      } else if (tokens.includes(alias)) {
        matches.add(canonical);
        break;
      }
    }
  }
  
  return Array.from(matches);
}

export function getQuestionsByTags(tagsArray) {
  if (!tagsArray || tagsArray.length === 0) return [];
  
  // Score questions based on tag intersection
  const scored = INTERVIEW_QUESTIONS.map(q => {
    let score = 0;
    q.tags.forEach(t => {
      if (tagsArray.includes(t)) score++;
    });
    return { question: q, score };
  }).filter(item => item.score > 0);
  
  // Sort descending by score
  return scored.sort((a, b) => b.score - a.score).map(item => item.question);
}
