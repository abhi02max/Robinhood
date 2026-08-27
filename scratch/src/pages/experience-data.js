import curriculumRegistry from '../data/curriculum-registry.json' with { type: 'json' };

const SUBJECT_CODE_BY_ID = {
  os: 'OS',
  dbms: 'DBMS',
  cn: 'CN',
  oops: 'OOPS',
  sql: 'SQL',
};

const REGISTRY_SUBJECTS = Array.isArray(curriculumRegistry?.subjects)
  ? curriculumRegistry.subjects
  : [];

const DEFAULT_SUBJECT_ID = REGISTRY_SUBJECTS[0]?.id || 'os';

const SUBJECTS_BY_ID = new Map();
const SUBJECTS_BY_NAME = new Map();
const SUBJECTS_BY_SLUG = new Map();

const LEGACY_SUBJECT_ALIAS_TO_ID = {
  os: 'os',
  'operating-systems': 'os',
  'operating-systems-and-processes': 'os',
  dbms: 'dbms',
  'database-management-systems': 'dbms',
  cn: 'cn',
  'computer-networks': 'cn',
  oops: 'oops',
  oop: 'oops',
  'object-oriented-programming-and-design': 'oops',
  sql: 'sql',
  dsa: 'os',
  'system-design': 'cn',
  hld: 'cn',
  lld: 'oops',
  technical: 'os',
  behavioral: 'oops',
  hr: 'oops',
  'technical-interview': 'os',
};

function normalizeSubtopicNode(subtopicNode = {}) {
  const companies = subtopicNode?.companies && typeof subtopicNode.companies === 'object'
    ? subtopicNode.companies
    : { highFrequency: [], mediumFrequency: [] };

  return {
    id: String(subtopicNode?.id || ''),
    name: String(subtopicNode?.name || 'Overview'),
    explanation: String(subtopicNode?.explanation || 'No explanation available yet for this subtopic.'),
    youtubeLink: String(subtopicNode?.youtubeLink || ''),
    problems: Array.isArray(subtopicNode?.problems) ? subtopicNode.problems : [],
    companies,
  };
}

function normalizeTopicNode(topicNode = {}) {
  const subtopics = Array.isArray(topicNode?.subtopics)
    ? topicNode.subtopics.map((subtopic) => normalizeSubtopicNode(subtopic))
    : [];

  return {
    id: String(topicNode?.id || ''),
    name: String(topicNode?.name || 'Foundations'),
    subtopics,
  };
}

function registerSubjectNode(subjectNode = {}) {
  const subjectId = String(subjectNode?.id || '').trim().toLowerCase();
  if (!subjectId) return;

  const normalizedSubject = {
    id: subjectId,
    code: SUBJECT_CODE_BY_ID[subjectId] || String(subjectId || DEFAULT_SUBJECT_ID).toUpperCase(),
    name: String(subjectNode?.name || subjectId.toUpperCase()),
    topics: Array.isArray(subjectNode?.topics)
      ? subjectNode.topics.map((topic) => normalizeTopicNode(topic))
      : [],
  };

  SUBJECTS_BY_ID.set(normalizedSubject.id, normalizedSubject);
  SUBJECTS_BY_NAME.set(normalizedSubject.name.toLowerCase(), normalizedSubject.id);
  SUBJECTS_BY_SLUG.set(toSlug(normalizedSubject.name), normalizedSubject.id);
  SUBJECTS_BY_SLUG.set(toSlug(normalizedSubject.code), normalizedSubject.id);
  SUBJECTS_BY_SLUG.set(normalizedSubject.id, normalizedSubject.id);
}

REGISTRY_SUBJECTS.forEach((subject) => {
  registerSubjectNode(subject);
});

export const REQUIRED_SUBJECTS = REGISTRY_SUBJECTS.map((subject) => {
  const normalizedId = String(subject?.id || '').toLowerCase();
  return SUBJECT_CODE_BY_ID[normalizedId] || normalizedId.toUpperCase();
});

export function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPlaceholderSubject() {
  return {
    id: DEFAULT_SUBJECT_ID,
    code: SUBJECT_CODE_BY_ID[DEFAULT_SUBJECT_ID] || 'OS',
    name: 'Operating Systems',
    topics: [],
  };
}

function resolveSubjectId(raw) {
  const input = decodeURIComponent(String(raw || '')).trim();
  if (!input) return DEFAULT_SUBJECT_ID;

  const lowered = input.toLowerCase();
  if (SUBJECTS_BY_NAME.has(lowered)) return SUBJECTS_BY_NAME.get(lowered);

  const slug = toSlug(input);
  if (SUBJECTS_BY_ID.has(slug)) return slug;
  if (SUBJECTS_BY_SLUG.has(slug)) return SUBJECTS_BY_SLUG.get(slug);

  const aliasId = LEGACY_SUBJECT_ALIAS_TO_ID[slug];
  if (aliasId && SUBJECTS_BY_ID.has(aliasId)) return aliasId;

  return DEFAULT_SUBJECT_ID;
}

function getTopicFallback(requested = '') {
  return {
    id: 'topic-overview',
    name: requested ? `Topic: ${requested}` : 'Foundations',
    subtopics: [
      {
        id: 'overview',
        name: 'Overview',
        explanation: 'Content for this topic will appear once the registry entry is available.',
        youtubeLink: '',
        problems: [],
        companies: { highFrequency: [], mediumFrequency: [] },
      },
    ],
  };
}

function getSubtopicFallback(requested = '') {
  return {
    id: 'overview',
    name: requested ? `Subtopic: ${requested}` : 'Overview',
    explanation: 'Content for this subtopic is not available yet. Use the topic overview and practice flow to continue learning.',
    youtubeLink: '',
    problems: [],
    companies: { highFrequency: [], mediumFrequency: [] },
  };
}

export function getSubject(subjectInput = '') {
  const subjectId = resolveSubjectId(subjectInput);
  const rawSubject = SUBJECTS_BY_ID.get(subjectId) || getPlaceholderSubject();
  const topics = Array.isArray(rawSubject.topics)
    ? rawSubject.topics.map((topic) => normalizeTopicNode(topic))
    : [];

  return {
    id: rawSubject.id,
    code: rawSubject.code || SUBJECT_CODE_BY_ID[rawSubject.id] || String(rawSubject.id || DEFAULT_SUBJECT_ID).toUpperCase(),
    name: rawSubject.code || SUBJECT_CODE_BY_ID[rawSubject.id] || String(rawSubject.id || DEFAULT_SUBJECT_ID).toUpperCase(),
    title: rawSubject.name || rawSubject.code || String(rawSubject.id || DEFAULT_SUBJECT_ID).toUpperCase(),
    slug: rawSubject.id || DEFAULT_SUBJECT_ID,
    topics,
  };
}

export function getTopic(subjectInput = '', topicInput = '') {
  const subject = getSubject(subjectInput);
  const topics = Array.isArray(subject.topics) ? subject.topics : [];
  const requested = String(topicInput || '').trim();
  const requestedSlug = toSlug(requested);

  const match = topics.find((topic) => {
    if (!requested) return false;
    return (
      topic.name.toLowerCase() === requested.toLowerCase()
      || toSlug(topic.name) === requestedSlug
      || (topic.id && (topic.id === requested || toSlug(topic.id) === requestedSlug))
    );
  });

  const topic = match || (!requested ? topics[0] : getTopicFallback(requested));

  return {
    subject,
    topic: topic || getTopicFallback(),
    topicIndex: Math.max(0, topics.findIndex((item) => item.id === (topic?.id || ''))),
    chapterName: topic?.name || 'Core Topic',
  };
}

export function getSubtopic(subjectInput = '', topicInput = '', subtopicInput = '') {
  const resolvedTopic = getTopic(subjectInput, topicInput);
  const topicSubtopics = Array.isArray(resolvedTopic.topic?.subtopics) && resolvedTopic.topic.subtopics.length
    ? resolvedTopic.topic.subtopics.map((subtopic) => normalizeSubtopicNode(subtopic))
    : [getSubtopicFallback()];
  const requested = decodeURIComponent(String(subtopicInput || '')).trim();
  const requestedSlug = toSlug(requested);

  const match = topicSubtopics.find((subtopic) => {
    if (!requested) return false;
    return (
      subtopic.name.toLowerCase() === requested.toLowerCase()
      || toSlug(subtopic.name) === requestedSlug
      || (subtopic.id && (subtopic.id === requested || toSlug(subtopic.id) === requestedSlug))
    );
  });

  const subtopic = match || (!requested ? topicSubtopics[0] : getSubtopicFallback(requested));

  return {
    subject: resolvedTopic.subject,
    topic: {
      ...resolvedTopic.topic,
      subtopics: topicSubtopics,
    },
    subtopic: subtopic || getSubtopicFallback(),
    topicIndex: resolvedTopic.topicIndex,
    subtopicIndex: Math.max(0, topicSubtopics.findIndex((item) => item.id === (subtopic?.id || ''))),
    chapterName: resolvedTopic.chapterName,
  };
}

export function normalizeSubjectName(raw) {
  return getSubject(raw).name;
}

export function subjectToApiName(subjectName) {
  return getSubject(subjectName).code;
}

export function listSubjects() {
  return REGISTRY_SUBJECTS.map((subjectNode) => {
    const subject = getSubject(subjectNode?.id || DEFAULT_SUBJECT_ID);
    return {
      id: subject.id,
      name: subject.name,
      title: subject.title,
      slug: subject.slug,
    };
  });
}

export function getSubjectTree(subjectName) {
  const subject = getSubject(subjectName);

  const chapters = (subject.topics || []).map((topic) => ({
    name: topic.name || 'Core Topic',
    topics: [
      {
        name: topic.name || 'Foundations',
        subtopics: (topic.subtopics || []).map((subtopic) => subtopic.name || 'Overview'),
      },
    ],
  }));

  if (!chapters.length) {
    chapters.push({
      name: 'Core Topic',
      topics: [
        {
          name: 'Foundations',
          subtopics: ['Overview'],
        },
      ],
    });
  }

  return {
    subject: subject.name,
    subjectTitle: subject.title,
    subjectId: subject.id,
    chapters,
  };
}

export function findTopicInTree(subjectName, topicName) {
  const resolvedTopic = getTopic(subjectName, topicName);
  const tree = getSubjectTree(resolvedTopic.subject.id);

  const chapter = tree.chapters.find((entry) =>
    (entry.topics || []).some((topic) => toSlug(topic.name) === toSlug(resolvedTopic.topic.name))
  ) || tree.chapters[0] || {
    name: 'Core Topic',
    topics: [{ name: resolvedTopic.topic.name || 'Foundations', subtopics: ['Overview'] }],
  };

  const topic = (chapter.topics || []).find((entry) =>
    toSlug(entry.name) === toSlug(resolvedTopic.topic.name)
  ) || chapter.topics?.[0] || {
    name: resolvedTopic.topic.name || 'Foundations',
    subtopics: ['Overview'],
  };

  return {
    chapter,
    topic,
    tree,
  };
}
