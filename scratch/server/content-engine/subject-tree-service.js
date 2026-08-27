import { LEARNING_SUBJECTS } from '../../src/data/learning-content.js';
import {
  getSubjectTree as getExperienceSubjectTree,
  normalizeSubjectName as normalizeExperienceSubjectName,
} from '../../src/pages/experience-data.js';
import { normalizeName, toSlug } from '../domain-engine/request-context.js';

export const SUBJECTS = [
  'DSA',
  'DBMS',
  'OS',
  'CN',
  'OOPS',
  'SQL',
  'System Design',
  'LLD',
  'HLD',
  'Behavioral',
  'HR',
  'Technical Interview',
];

const SUBJECT_ALIASES = new Map([
  ['dsa', 'DSA'],
  ['dbms', 'DBMS'],
  ['database-management-systems', 'DBMS'],
  ['os', 'OS'],
  ['operating-systems', 'OS'],
  ['cn', 'CN'],
  ['computer-networks', 'CN'],
  ['oops', 'OOPS'],
  ['object-oriented-programming-and-design', 'OOPS'],
  ['sql', 'SQL'],
  ['system-design', 'System Design'],
  ['system design', 'System Design'],
  ['lld', 'LLD'],
  ['hld', 'HLD'],
  ['behavioral', 'Behavioral'],
  ['hr', 'HR'],
  ['technical', 'Technical Interview'],
  ['technical-interview', 'Technical Interview'],
  ['technical interview', 'Technical Interview'],
]);

const LEARNING_SUBJECT_ID_BY_API_NAME = {
  CN: 'cn',
  OS: 'os',
  DBMS: 'dbms',
  OOPS: 'oops',
  'System Design': 'system-design',
  LLD: 'system-design',
  HLD: 'system-design',
};

function normalizeApiSubject(subjectName) {
  const normalized = normalizeName(subjectName);
  if (!normalized) return null;

  const direct = SUBJECTS.find((subject) => subject.toLowerCase() === normalized.toLowerCase());
  if (direct) return direct;

  const slug = toSlug(normalized);
  return SUBJECT_ALIASES.get(slug) || SUBJECT_ALIASES.get(normalized.toLowerCase()) || null;
}

function apiToExperienceSubject(apiSubject) {
  if (apiSubject === 'Technical Interview') return 'Technical';
  return normalizeExperienceSubjectName(apiSubject);
}

function cleanSubtopicLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/[.:]\s*$/, '').trim();
}

function deriveSubtopicsFromTopic(topic) {
  const content = topic?.content || {};
  const candidates = [
    ...(Array.isArray(content.revisionNotes) ? content.revisionNotes : []),
    ...(Array.isArray(content.interviewQuestions) ? content.interviewQuestions : []),
    ...(Array.isArray(content.practiceQuestions) ? content.practiceQuestions : []),
    ...(Array.isArray(content.companyUsageExamples) ? content.companyUsageExamples : []),
  ];

  const cleaned = [];
  for (const item of candidates) {
    const label = cleanSubtopicLabel(item);
    if (!label) continue;
    if (!cleaned.includes(label)) cleaned.push(label);
    if (cleaned.length >= 4) break;
  }

  if (cleaned.length === 0) {
    return ['Core intuition', 'Interview framing', 'Common pitfalls'];
  }
  return cleaned;
}

function buildTreeFromExperienceFallback(apiSubject) {
  const experienceSubject = apiToExperienceSubject(apiSubject);
  const tree = getExperienceSubjectTree(experienceSubject);
  const chapters = Array.isArray(tree?.chapters) ? tree.chapters : [];
  return {
    subject: apiSubject,
    chapters,
  };
}

function buildTreeFromLearningBundle(apiSubject) {
  const learningSubjectId = LEARNING_SUBJECT_ID_BY_API_NAME[apiSubject];
  if (!learningSubjectId) return null;

  const subject = LEARNING_SUBJECTS?.[learningSubjectId];
  if (!subject) return null;

  const chapterMap = new Map();
  for (const topic of subject.topics || []) {
    const chapterName = `${topic.stage || 'Core'} Track`;
    if (!chapterMap.has(chapterName)) {
      chapterMap.set(chapterName, []);
    }
    chapterMap.get(chapterName).push({
      name: topic.title,
      subtopics: deriveSubtopicsFromTopic(topic),
    });
  }

  return {
    subject: apiSubject,
    chapters: Array.from(chapterMap.entries()).map(([name, topics]) => ({ name, topics })),
  };
}

function buildTreeFromDomainRows(apiSubject, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const chapterMap = new Map();
  for (const row of rows) {
    const chapterName = cleanSubtopicLabel(row.chapter) || 'Core';
    const topicName = cleanSubtopicLabel(row.topic) || 'Foundations';
    const subtopic = cleanSubtopicLabel(row.subtopic);

    if (!chapterMap.has(chapterName)) {
      chapterMap.set(chapterName, new Map());
    }

    const topicMap = chapterMap.get(chapterName);
    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, []);
    }

    const subtopics = topicMap.get(topicName);
    if (subtopic && !subtopics.includes(subtopic)) {
      subtopics.push(subtopic);
    }
  }

  const chapters = Array.from(chapterMap.entries()).map(([name, topicMap]) => ({
    name,
    topics: Array.from(topicMap.entries()).map(([topicName, subtopics]) => ({
      name: topicName,
      subtopics: subtopics.length ? subtopics : ['Overview'],
    })),
  }));

  return {
    subject: apiSubject,
    chapters,
  };
}

function buildTreeFromLearningRows(apiSubject, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const chapterMap = new Map();
  for (const row of rows) {
    const chapterName = cleanSubtopicLabel(row.stage) || 'Core Track';
    if (!chapterMap.has(chapterName)) {
      chapterMap.set(chapterName, []);
    }

    const content = typeof row.content === 'object' && row.content
      ? row.content
      : {};

    const topic = {
      title: row.topic_title,
      content,
    };

    chapterMap.get(chapterName).push({
      name: cleanSubtopicLabel(row.topic_title) || 'Foundations',
      subtopics: deriveSubtopicsFromTopic(topic),
    });
  }

  return {
    subject: apiSubject,
    chapters: Array.from(chapterMap.entries()).map(([name, topics]) => ({ name, topics })),
  };
}

async function loadTreeFromDomainTable(pgPool, apiSubject) {
  if (!pgPool) return null;
  const aliases = [apiSubject, apiToExperienceSubject(apiSubject)];

  const result = await pgPool.query(
    `
      SELECT chapter, topic, subtopic
      FROM subject_tree
      WHERE LOWER(subject) = ANY($1::text[])
      ORDER BY chapter ASC, topic ASC, id ASC
    `,
    [aliases.map((value) => String(value || '').toLowerCase())]
  );

  return buildTreeFromDomainRows(apiSubject, result.rows || []);
}

async function loadTreeFromLearningTables(pgPool, apiSubject) {
  if (!pgPool) return null;
  const learningSubjectId = LEARNING_SUBJECT_ID_BY_API_NAME[apiSubject];
  if (!learningSubjectId) return null;

  const result = await pgPool.query(
    `
      SELECT
        lt.title AS topic_title,
        lt.stage,
        lt.order_index,
        lt.content
      FROM learning_subjects ls
      JOIN learning_topics lt ON lt.subject_id = ls.id
      WHERE LOWER(ls.id) = LOWER($1)
         OR LOWER(ls.short_title) = LOWER($2)
         OR LOWER(ls.title) = LOWER($3)
      ORDER BY lt.order_index ASC, lt.title ASC
    `,
    [learningSubjectId, apiSubject, apiToExperienceSubject(apiSubject)]
  );

  return buildTreeFromLearningRows(apiSubject, result.rows || []);
}

export async function getSubjectTree(pgPool, subjectName) {
  const apiSubject = normalizeApiSubject(subjectName);
  if (!apiSubject) return null;

  if (pgPool) {
    try {
      const fromDomain = await loadTreeFromDomainTable(pgPool, apiSubject);
      if (fromDomain?.chapters?.length) return fromDomain;
    } catch (_) {
      // Fall through to next strategy.
    }

    try {
      const fromLearning = await loadTreeFromLearningTables(pgPool, apiSubject);
      if (fromLearning?.chapters?.length) return fromLearning;
    } catch (_) {
      // Fall through to static fallback.
    }
  }

  const fromExperience = buildTreeFromExperienceFallback(apiSubject);
  if (fromExperience?.chapters?.length) return fromExperience;

  const fromBundle = buildTreeFromLearningBundle(apiSubject);
  if (fromBundle?.chapters?.length) return fromBundle;

  return { subject: apiSubject, chapters: [] };
}

export function normalizeSubjectForApi(subjectName) {
  return normalizeApiSubject(subjectName);
}
