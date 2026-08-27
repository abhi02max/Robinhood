import { orchestrateAIRequest } from '../ai-gateway.js';
import { normalizeName, toSlug } from '../domain-engine/request-context.js';
import { getSubjectTree, normalizeSubjectForApi } from './subject-tree-service.js';

function buildOutline(chapter, topic, subtopic) {
  return [
    `Core intuition of ${topic}`,
    `Visual mental model for ${subtopic}`,
    `${topic} trade-offs and failure modes`,
    `Interview discussion points for ${chapter}`,
    `Quick revision checklist`,
  ];
}

function buildFallbackMarkdown({ subject, chapter, topic, subtopic, outline }) {
  return [
    `# ${subject} - ${topic}`,
    '',
    `## Context`,
    `- Chapter: ${chapter}`,
    `- Focus subtopic: ${subtopic}`,
    `- Goal: Build a beginner-to-interview understanding in one pass.`,
    '',
    '## Learning Outline',
    ...outline.map((item) => `- ${item}`),
    '',
    '## Study Flow',
    '1. Build intuition first and avoid memorizing definitions in isolation.',
    '2. Dry-run one example and narrate invariants at each transition.',
    '3. Explain one trade-off and one failure mode to make your answer interview-ready.',
    '4. End with a quick revision summary in three bullets.',
    '',
    '## Interview Drill',
    '- Explain this concept to a beginner in 30 seconds.',
    '- Explain the same concept to an interviewer with constraints and trade-offs.',
    '- Mention how to validate correctness with one test scenario.',
  ].join('\n');
}

async function tryAiEnrichment(redisClient, { subject, chapter, topic, subtopic }) {
  const system = [
    'You are a senior CS mentor creating a compact learning handout.',
    'Respond in plain markdown only, no code fences.',
    'Keep the structure: Core Idea, Visual Model, Common Pitfalls, Interview Drill, Revision Cheatsheet.',
  ].join(' ');

  const user = [
    `Subject: ${subject}`,
    `Chapter: ${chapter}`,
    `Topic: ${topic}`,
    `Subtopic: ${subtopic}`,
    'Create concise markdown that is practical and interview-oriented.',
  ].join('\n');

  const result = await orchestrateAIRequest(redisClient, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    userId: 'content-engine',
    problemId: `${subject}:${topic}`,
    actionType: 'pdf-handout',
    options: {
      temperature: 0.25,
      maxTokens: 700,
    },
  });

  if (!result?.success || !result.content) {
    return null;
  }

  return {
    markdown: String(result.content).trim(),
    provider: result.provider,
    model: result.model,
    cached: result.fromCache,
  };
}

export async function generatePdfForTopic(subjectOrPayload, chapter, topic, subtopic, context = {}) {
  const payload = typeof subjectOrPayload === 'object' && subjectOrPayload
    ? subjectOrPayload
    : {
        subject: subjectOrPayload,
        chapter,
        topic,
        subtopic,
        ...context,
      };

  const pgPool = payload.pgPool || null;
  const redisClient = payload.redisClient || null;

  const subject = normalizeSubjectForApi(payload.subject);
  const normalizedTopic = normalizeName(payload.topic) || 'Foundations';
  const normalizedSubtopic = normalizeName(payload.subtopic) || 'Overview';

  const tree = await getSubjectTree(pgPool, subject);
  const chapterMatch = (tree.chapters || []).find((item) =>
    (item.topics || []).some((candidate) => toSlug(candidate.name) === toSlug(normalizedTopic))
  );
  const resolvedChapter = normalizeName(payload.chapter) || chapterMatch?.name || 'Core';

  const outline = buildOutline(resolvedChapter, normalizedTopic, normalizedSubtopic);
  const fallbackMarkdown = buildFallbackMarkdown({
    subject,
    chapter: resolvedChapter,
    topic: normalizedTopic,
    subtopic: normalizedSubtopic,
    outline,
  });

  let ai = null;
  try {
    ai = await tryAiEnrichment(redisClient, {
      subject,
      chapter: resolvedChapter,
      topic: normalizedTopic,
      subtopic: normalizedSubtopic,
    });
  } catch (_) {
    ai = null;
  }

  const encodedSubject = encodeURIComponent(subject);
  const encodedTopic = encodeURIComponent(normalizedTopic);
  const encodedSubtopic = encodeURIComponent(normalizedSubtopic);
  const previewUrl = `/api/content/pdf/${encodedSubject}/${encodedTopic}?format=markdown&subtopic=${encodedSubtopic}`;

  return {
    status: 'ready',
    subject,
    chapter: resolvedChapter,
    topic: normalizedTopic,
    subtopic: normalizedSubtopic,
    outline,
    markdown: ai?.markdown || fallbackMarkdown,
    url: previewUrl,
    generatedAt: new Date().toISOString(),
    provider: ai?.provider || 'curriculum-fallback',
    model: ai?.model || null,
    cached: Boolean(ai?.cached),
  };
}
