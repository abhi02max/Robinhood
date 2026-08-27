import {
  getSubject,
  getSubtopic,
  listSubjects,
  normalizeSubjectName,
  subjectToApiName,
  toSlug,
} from '../pages/experience-data.js';
// Phase A migration note (Apr 2026):
// Was `import { allProblems } from './problems.js';` — a static import. We now
// read from the hydrated /api/learning/problems-index cache. All call sites
// here are inside helper functions invoked AFTER hydration completes (the
// content-registry is consumed by experience pages that render post-boot),
// so the cache is reliably populated by the time these helpers run.
import { getAllProblems } from '../utils/problems-cache.js';
import { getLearnToProblemsRoute, inferCategoryFromTopic } from './product-flow.js';

const CURATED_OVERRIDES = {
  // Optional manual overrides keyed by subject/topic/subtopic slug.
  // This stays empty by default and can be expanded without changing callers.
};

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });

  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function buildYoutubeSearchUrl(parts = []) {
  const query = parts.filter(Boolean).join(' ');
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function normalizeProblemDifficulty(level = '') {
  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'hard') return 'Hard';
  return 'Medium';
}

function buildFallbackExplanation(context) {
  return `In ${context.subtopicName}, focus on the core idea first, then apply it to practical interview-style scenarios in ${context.topicName}.`;
}

function normalizeRegistryProblems(context) {
  const registryProblems = Array.isArray(context?.subtopicNode?.problems)
    ? context.subtopicNode.problems
    : [];

  if (registryProblems.length) {
    return registryProblems;
  }

  return [
    {
      level: 'easy',
      item: `Solve one foundational coding problem that applies ${context.subtopicName} basics.`,
    },
    {
      level: 'medium',
      item: `Solve one medium interview problem combining ${context.subtopicName} with edge-case handling.`,
    },
    {
      level: 'hard',
      item: `Solve one hard problem requiring optimization trade-offs for ${context.subtopicName}.`,
    },
  ];
}

function normalizeCompanyPool(companies) {
  if (!companies) return [];
  if (Array.isArray(companies)) {
    return companies.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof companies === 'object') {
    return [
      ...(Array.isArray(companies.highFrequency) ? companies.highFrequency : []),
      ...(Array.isArray(companies.mediumFrequency) ? companies.mediumFrequency : []),
      ...(Array.isArray(companies.lowFrequency) ? companies.lowFrequency : []),
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  return [];
}

function scoreProblemCandidate(problem, desiredDifficulty, desiredCategory, preferredCompanies) {
  let score = 0;

  if (desiredDifficulty && problem?.difficulty === desiredDifficulty) {
    score += 50;
  }

  if (desiredCategory && problem?.category === desiredCategory) {
    score += 35;
  }

  const companies = Array.isArray(problem?.companies) ? problem.companies : [];
  if (preferredCompanies.size && companies.some((company) => preferredCompanies.has(String(company || '').toLowerCase()))) {
    score += 20;
  }

  score += Math.min(5, companies.length);
  return score;
}

function pickProblemCandidate({ desiredDifficulty, desiredCategory, preferredCompanies, usedProblemIds }) {
  const scoredSelection = (pool) => {
    if (!pool.length) return null;

    let bestCandidate = null;
    let bestScore = -Infinity;
    pool.forEach((problem) => {
      const score = scoreProblemCandidate(problem, desiredDifficulty, desiredCategory, preferredCompanies);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = problem;
      }
    });
    return bestCandidate;
  };

  const cachedProblems = getAllProblems();
  const unusedPool = cachedProblems.filter((problem) => problem?.id && !usedProblemIds.has(problem.id));
  const fromUnused = scoredSelection(unusedPool);
  if (fromUnused) return fromUnused;

  const fullPool = cachedProblems.filter((problem) => problem?.id);
  return scoredSelection(fullPool);
}

function buildRegistryProblemItems(context) {
  const registryProblems = normalizeRegistryProblems(context);

  const preferredCompanies = new Set(
    normalizeCompanyPool(context?.subtopicNode?.companies).map((company) => company.toLowerCase())
  );
  const desiredCategory = inferCategoryFromTopic(context.topicName, context.subjectName);
  const usedProblemIds = new Set();
  
  const theorySubjects = ['os', 'cn', 'dbms', 'oops'];
  const isTheory = theorySubjects.includes(String(context.subjectSlug).toLowerCase()) || theorySubjects.includes(String(context.subjectName).toLowerCase());

  return registryProblems.map((registryProblem, index) => {
    const level = String(registryProblem?.level || 'medium').toLowerCase();
    const desiredDifficulty = normalizeProblemDifficulty(level);
    
    let mappedProblem = null;
    if (!isTheory) {
        mappedProblem = pickProblemCandidate({
          desiredDifficulty,
          desiredCategory,
          preferredCompanies,
          usedProblemIds,
        });

        if (mappedProblem?.id) {
          usedProblemIds.add(mappedProblem.id);
        }
    }

    const safeMappedProblem = mappedProblem || (!isTheory ? getAllProblems()[0] : null);

    return {
      id: `${context.subtopicSlug}-problem-${index + 1}`,
      level,
      prompt: String(registryProblem?.item || 'Practice this concept with one curated problem.'),
      mappedProblemId: safeMappedProblem?.id || null,
      mappedProblemTitle: safeMappedProblem?.title || `Practice ${context.subtopicName}`,
      route: safeMappedProblem?.id ? `/problem/${safeMappedProblem.id}` : '#practice',
      category: safeMappedProblem?.category || desiredCategory,
      difficulty: safeMappedProblem?.difficulty || desiredDifficulty,
      isTheory,
    };
  });
}

function buildApiUrls(context) {
  const subject = encodeURIComponent(subjectToApiName(context.subjectName));
  const topic = encodeURIComponent(context.topicName);
  const chapter = context.chapterName || 'General';
  const subtopic = context.subtopicName || 'Overview';

  const pdfBase = `/api/content/pdf/${subject}/${topic}`;
  const notesBase = `/api/content/notes/${subject}/${topic}`;
  const youtubeBase = `/api/content/youtube/${subject}/${topic}`;

  return {
    pdfUrl: withQuery(pdfBase, { chapter, subtopic }),
    pdfMarkdownUrl: withQuery(pdfBase, { format: 'markdown', chapter, subtopic }),
    notesUrl: notesBase,
    notesMarkdownUrl: withQuery(notesBase, { format: 'markdown', item: 1 }),
    youtubeUrl: withQuery(youtubeBase, { subtopic }),
  };
}

function mergeRegistryEntry(baseEntry, overrideEntry) {
  if (!overrideEntry || typeof overrideEntry !== 'object') return baseEntry;

  const merged = { ...baseEntry };

  Object.entries(overrideEntry).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      merged[key] = value;
      return;
    }

    if (value && typeof value === 'object') {
      const baseValue = merged[key] && typeof merged[key] === 'object' ? merged[key] : {};
      merged[key] = mergeRegistryEntry(baseValue, value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function getOverrideEntry(context) {
  const subjectOverrides = CURATED_OVERRIDES[context.subjectSlug] || null;
  if (!subjectOverrides) return null;

  const topicOverrides = subjectOverrides[context.topicSlug] || null;
  if (!topicOverrides) return null;

  return topicOverrides[context.subtopicSlug] || null;
}

function buildBaseEntry(context) {
  const urls = buildApiUrls(context);
  const explanation = String(
    context?.subtopicNode?.explanation
    || buildFallbackExplanation(context)
  );
  const primaryYoutubeUrl = String(
    context?.subtopicNode?.youtubeLink
    || buildYoutubeSearchUrl([context.subjectName, context.topicName, context.subtopicName, 'interview'])
  );
  const problemItems = buildRegistryProblemItems(context);
  const defaultProblemRoute = problemItems.find((item) => item.route)?.route
    || getLearnToProblemsRoute(context.subjectName, context.topicName);

  return {
    subject: context.subjectName,
    subjectTitle: context.subjectTitle,
    chapter: context.chapterName,
    topic: context.topicName,
    subtopic: context.subtopicName,
    explanation,
    pdf: {
      source: 'content-api',
      url: urls.pdfUrl,
      markdownUrl: urls.pdfMarkdownUrl,
      title: `${context.subtopicName} handout`,
    },
    notes: {
      source: 'content-api',
      url: urls.notesUrl,
      markdownUrl: urls.notesMarkdownUrl,
      fallbackItems: [
        {
          title: `${context.subtopicName} quick notes`,
          url: urls.notesMarkdownUrl,
        },
      ],
    },
    youtube: {
      source: 'curriculum-registry',
      primaryUrl: primaryYoutubeUrl,
      url: urls.youtubeUrl,
      fallbackItems: [
        {
          title: `${context.subtopicName} primary lesson`,
          url: primaryYoutubeUrl,
        },
        {
          title: `${context.subtopicName} fundamentals`,
          url: buildYoutubeSearchUrl([context.subjectName, context.topicName, context.subtopicName, 'fundamentals']),
        },
        {
          title: `${context.subtopicName} interview prep`,
          url: buildYoutubeSearchUrl([context.subjectName, context.topicName, context.subtopicName, 'interview prep']),
        },
        {
          title: `${context.subtopicName} solved examples`,
          url: buildYoutubeSearchUrl([context.subjectName, context.topicName, context.subtopicName, 'solved examples']),
        },
      ],
    },
    problems: {
      route: defaultProblemRoute,
      items: problemItems,
    },
  };
}

function buildEntryFromContext(context) {
  const baseEntry = buildBaseEntry(context);
  const overrideEntry = getOverrideEntry(context);
  return mergeRegistryEntry(baseEntry, overrideEntry);
}

export function resolveSubtopicContext(params = {}) {
  const resolvedSubtopic = getSubtopic(params.subject, params.topic, params.subtopic);

  const subjectName = resolvedSubtopic.subject?.name || normalizeSubjectName(params.subject);
  const subjectTitle = resolvedSubtopic.subject?.title || subjectName;
  const topicName = resolvedSubtopic.topic?.name || 'Foundations';
  const chapterName = resolvedSubtopic.chapterName || topicName;
  const subtopics = Array.isArray(resolvedSubtopic.topic?.subtopics) && resolvedSubtopic.topic.subtopics.length
    ? resolvedSubtopic.topic.subtopics.map((subtopic) => subtopic.name || 'Overview')
    : ['Overview'];
  const subtopicName = resolvedSubtopic.subtopic?.name || subtopics[0] || 'Overview';

  return {
    subjectName,
    subjectTitle,
    subjectSlug: resolvedSubtopic.subject?.slug || toSlug(subjectName),
    chapterName,
    topicName,
    topicSlug: toSlug(topicName),
    subtopicName,
    subtopicSlug: toSlug(subtopicName),
    subtopics,
    subjectNode: resolvedSubtopic.subject,
    topicNode: resolvedSubtopic.topic,
    subtopicNode: resolvedSubtopic.subtopic,
  };
}

export function getSubtopicContentRegistryEntry(params = {}) {
  const context = resolveSubtopicContext(params);
  return buildEntryFromContext(context);
}

export function buildSubjectTopicSubtopicRegistry(subjectNames = []) {
  const requestedSubjects = Array.isArray(subjectNames) && subjectNames.length
    ? subjectNames.map((name) => normalizeSubjectName(name))
    : listSubjects().map((item) => item.name);

  const registry = {};

  requestedSubjects.forEach((subjectName) => {
    const normalizedSubject = normalizeSubjectName(subjectName);
    const subject = getSubject(normalizedSubject);

    if (!registry[subject.name]) {
      registry[subject.name] = {};
    }

    (subject.topics || []).forEach((topicNode) => {
      const topicName = topicNode?.name || 'Foundations';
      if (!registry[subject.name][topicName]) {
        registry[subject.name][topicName] = {
          chapter: topicName,
          subtopics: {},
        };
      }

      const topicSubtopics = Array.isArray(topicNode?.subtopics) && topicNode.subtopics.length
        ? topicNode.subtopics
        : [{ name: 'Overview' }];

      topicSubtopics.forEach((subtopicNode) => {
        const context = resolveSubtopicContext({
          subject: subject.id,
          topic: topicName,
          subtopic: subtopicNode?.name || 'Overview',
        });

        registry[subject.name][topicName].subtopics[context.subtopicName] = buildEntryFromContext(context);
      });
    });
  });

  return registry;
}

export default {
  buildSubjectTopicSubtopicRegistry,
  getSubtopicContentRegistryEntry,
  resolveSubtopicContext,
};
