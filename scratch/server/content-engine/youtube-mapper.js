import { normalizeName } from '../domain-engine/request-context.js';
import { normalizeSubjectForApi } from './subject-tree-service.js';

const FALLBACK_CHANNELS = [
  'takeUforward',
  'NeetCode',
  'Gaurav Sen',
  'Hussein Nasser',
  'ByteByteGo',
];

function normalizePayload(subjectOrPayload, chapter, topic, subtopic, options) {
  if (typeof subjectOrPayload === 'object' && subjectOrPayload) {
    return subjectOrPayload;
  }

  return {
    subject: subjectOrPayload,
    chapter,
    topic,
    subtopic,
    ...(options || {}),
  };
}

function toYouTubeSearchUrl(parts) {
  const query = parts.filter(Boolean).join(' ');
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildFallbackVideos(subject, topic, subtopic, companyTag = '') {
  const company = normalizeName(companyTag);

  return FALLBACK_CHANNELS.slice(0, 4).map((channel, index) => ({
    id: `fallback-${index + 1}`,
    title: `${subject} · ${topic} · ${subtopic} (${channel})`,
    url: toYouTubeSearchUrl([subject, topic, subtopic, company, channel]),
    company_tag: company || null,
    source: 'curated-search',
  }));
}

function dedupeVideos(videos) {
  const seen = new Set();
  const unique = [];
  for (const video of videos) {
    const key = `${video.title || ''}|${video.url || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(video);
  }
  return unique;
}

export async function getYoutubeLinksForSubtopic(subjectOrPayload, chapter, topic, subtopic, options = {}) {
  const payload = normalizePayload(subjectOrPayload, chapter, topic, subtopic, options);
  const pgPool = payload.pgPool || null;

  const subject = normalizeSubjectForApi(payload.subject);
  const normalizedTopic = normalizeName(payload.topic) || 'Foundations';
  const normalizedSubtopic = normalizeName(payload.subtopic) || 'Overview';
  const normalizedCompany = normalizeName(payload.companyTag || payload.company || '');

  const collected = [];

  if (pgPool) {
    try {
      const params = [subject, normalizedTopic];
      let whereCompany = '';

      if (normalizedCompany) {
        params.push(normalizedCompany);
        whereCompany = ' AND (company_tag IS NULL OR LOWER(company_tag) = LOWER($3))';
      }

      const dbRows = await pgPool.query(
        `
          SELECT id, title, video_url, company_tag
          FROM youtube_links
          WHERE LOWER(subject) = LOWER($1)
            AND LOWER(topic) = LOWER($2)
            ${whereCompany}
          ORDER BY created_at DESC
          LIMIT 12
        `,
        params
      );

      for (const row of dbRows.rows || []) {
        collected.push({
          id: row.id,
          title: row.title || `${subject} · ${normalizedTopic}`,
          url: row.video_url,
          company_tag: row.company_tag || null,
          source: 'domain-db',
        });
      }
    } catch (_) {
      // Fall through to learning_topics/fallback strategy.
    }

    try {
      const learningRows = await pgPool.query(
        `
          SELECT lt.curated_video_links
          FROM learning_topics lt
          WHERE LOWER(lt.title) = LOWER($1)
          ORDER BY lt.order_index ASC
          LIMIT 1
        `,
        [normalizedTopic]
      );

      const links = learningRows.rows?.[0]?.curated_video_links;
      if (Array.isArray(links)) {
        links.forEach((url, idx) => {
          collected.push({
            id: `learning-${idx + 1}`,
            title: `${subject} · ${normalizedTopic} (Curated ${idx + 1})`,
            url,
            company_tag: null,
            source: 'learning-topics',
          });
        });
      }
    } catch (_) {
      // Fall through to fallback strategy.
    }
  }

  if (collected.length === 0) {
    collected.push(...buildFallbackVideos(subject, normalizedTopic, normalizedSubtopic, normalizedCompany));
  }

  return dedupeVideos(collected).slice(0, 12);
}
