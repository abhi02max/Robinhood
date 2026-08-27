import { normalizeName, isUuid } from '../domain-engine/request-context.js';
import { getSubjectTree, normalizeSubjectForApi } from './subject-tree-service.js';

function deriveTitle(fileUrl, metadata, index) {
  const explicit = metadata?.title || metadata?.name || metadata?.label;
  if (explicit) return String(explicit);

  const fileName = String(fileUrl || '').split('/').pop() || '';
  if (fileName) return fileName;

  return `Mapped note ${index + 1}`;
}

function buildCurriculumFallbackNotes(subject, topic, tree) {
  const chapter = (tree.chapters || []).find((item) =>
    (item.topics || []).some((candidate) => normalizeName(candidate.name).toLowerCase() === normalizeName(topic).toLowerCase())
  );

  const topicNode = chapter?.topics?.find((candidate) =>
    normalizeName(candidate.name).toLowerCase() === normalizeName(topic).toLowerCase()
  );

  const subtopics = topicNode?.subtopics || ['Core intuition', 'Interview framing', 'Revision checklist'];
  const now = new Date().toISOString();

  return subtopics.slice(0, 4).map((subtopic, idx) => ({
    id: `fallback-${idx + 1}`,
    title: `${normalizeName(topic)} - ${normalizeName(subtopic)}`,
    file_url: `/api/content/notes/${encodeURIComponent(subject)}/${encodeURIComponent(topic)}?format=markdown&item=${idx + 1}`,
    metadata: {
      source: 'curriculum-fallback',
      chapter: chapter?.name || 'Core',
      summary: `Study notes for ${normalizeName(subtopic)} under ${normalizeName(topic)}.`,
    },
    created_at: now,
  }));
}

function normalizeFetchPayload(subjectOrPayload, chapter, topic, options) {
  if (typeof subjectOrPayload === 'object' && subjectOrPayload) {
    return subjectOrPayload;
  }

  return {
    subject: subjectOrPayload,
    chapter,
    topic,
    ...(options || {}),
  };
}

function toNoteResponse(rows) {
  return rows.map((row, index) => ({
    id: row.id,
    title: deriveTitle(row.file_url, row.metadata, index),
    file_url: row.file_url,
    metadata: row.metadata || {},
    created_at: row.created_at,
  }));
}

export async function uploadCustomNotes(fileOrPayload, metadata, options = {}) {
  const payload = typeof fileOrPayload === 'object' && fileOrPayload && fileOrPayload.subject
    ? fileOrPayload
    : {
        file: fileOrPayload,
        metadata,
        ...options,
      };

  const pgPool = payload.pgPool || null;
  if (!pgPool) {
    return {
      success: false,
      errorType: 'DB_UNAVAILABLE',
      reason: 'PostgreSQL pool is unavailable for note upload.',
    };
  }

  const userId = payload.userId;
  if (!isUuid(userId)) {
    return {
      success: false,
      errorType: 'VALIDATION_ERROR',
      reason: 'A valid UUID userId is required to upload notes.',
    };
  }

  const subject = normalizeSubjectForApi(payload.subject || payload.metadata?.subject || 'DSA');
  const topic = normalizeName(payload.topic || payload.metadata?.topic || 'Foundations');
  const fileUrl = normalizeName(payload.fileUrl || payload.metadata?.fileUrl || payload.file?.url || payload.file) || null;

  if (!fileUrl) {
    return {
      success: false,
      errorType: 'VALIDATION_ERROR',
      reason: 'fileUrl is required to upload notes.',
    };
  }

  const noteMetadata = {
    ...(payload.metadata || {}),
    uploadedAt: new Date().toISOString(),
  };

  const insert = await pgPool.query(
    `
      INSERT INTO notes (user_id, subject, topic, file_url, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, subject, topic, file_url, metadata, created_at
    `,
    [userId, subject, topic, fileUrl, JSON.stringify(noteMetadata)]
  );

  return {
    success: true,
    note: toNoteResponse(insert.rows)[0],
  };
}

export async function fetchNotesForTopic(subjectOrPayload, chapter, topic, options = {}) {
  const payload = normalizeFetchPayload(subjectOrPayload, chapter, topic, options);
  const subject = normalizeSubjectForApi(payload.subject);
  const normalizedTopic = normalizeName(payload.topic);
  const pgPool = payload.pgPool || null;
  const userId = payload.userId;

  if (pgPool) {
    try {
      let query;
      let params;

      if (isUuid(userId)) {
        query = `
          SELECT id, file_url, metadata, created_at
          FROM notes
          WHERE user_id = $1
            AND LOWER(subject) = LOWER($2)
            AND LOWER(topic) = LOWER($3)
          ORDER BY created_at DESC
          LIMIT 10
        `;
        params = [userId, subject, normalizedTopic];
      } else {
        query = `
          SELECT id, file_url, metadata, created_at
          FROM notes
          WHERE LOWER(subject) = LOWER($1)
            AND LOWER(topic) = LOWER($2)
          ORDER BY created_at DESC
          LIMIT 10
        `;
        params = [subject, normalizedTopic];
      }

      const result = await pgPool.query(query, params);
      if (result.rows.length) {
        return toNoteResponse(result.rows);
      }
    } catch (_) {
      // Fall back to curriculum-derived notes.
    }
  }

  const tree = await getSubjectTree(pgPool, subject);
  return buildCurriculumFallbackNotes(subject, normalizedTopic, tree);
}
