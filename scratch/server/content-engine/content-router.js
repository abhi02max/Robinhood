import express from 'express';
import { getSubjectTree, normalizeSubjectForApi, SUBJECTS } from './subject-tree-service.js';
import { generatePdfForTopic } from './pdf-engine.js';
import { uploadCustomNotes, fetchNotesForTopic } from './notes-engine.js';
import { getYoutubeLinksForSubtopic } from './youtube-mapper.js';
import { normalizeName, resolveUserIdFromRequest } from '../domain-engine/request-context.js';

const router = express.Router();

function getDomainContext(req) {
  return {
    pgPool: req.app?.locals?.pgPool || null,
    redisClient: req.app?.locals?.redisClient || null,
  };
}

function handleError(res, error, fallbackReason) {
  return res.status(500).json({
    errorType: 'SERVER_ERROR',
    reason: fallbackReason,
    likelyCause: error?.message || 'Unknown error',
  });
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'content-engine' });
});

// Subject structure routes
router.get('/subjects', (req, res) => {
  res.json({ subjects: SUBJECTS });
});

router.get('/subject/:subject', async (req, res) => {
  const { subject } = req.params;
  const { pgPool } = getDomainContext(req);

  try {
    const resolvedSubject = normalizeSubjectForApi(subject);
    const tree = await getSubjectTree(pgPool, resolvedSubject);
    return res.json({
      tree,
      requestedSubject: normalizeName(subject),
      resolvedSubject,
    });
  } catch (error) {
    return handleError(res, error, 'Unable to load subject hierarchy.');
  }
});

// PDF Routes
router.get('/pdf/:subject/:topic', async (req, res) => {
  const { subject, topic } = req.params;
  const chapter = normalizeName(req.query.chapter || 'General');
  const subtopic = normalizeName(req.query.subtopic || 'General');
  const format = String(req.query.format || '').toLowerCase();
  const { pgPool, redisClient } = getDomainContext(req);

  try {
    const pdfResponse = await generatePdfForTopic({
      pgPool,
      redisClient,
      subject,
      chapter,
      topic,
      subtopic,
    });

    if (format === 'markdown') {
      return res.type('text/markdown').send(pdfResponse.markdown || 'No markdown content available.');
    }

    return res.json(pdfResponse);
  } catch (error) {
    return handleError(res, error, 'Unable to generate topic learning handout.');
  }
});

// Notes Routes
router.get('/notes/:subject/:topic', async (req, res) => {
  const { subject, topic } = req.params;
  const format = String(req.query.format || '').toLowerCase();
  const markdownItem = Number(req.query.item || 1);
  const { pgPool } = getDomainContext(req);

  try {
    const userId = await resolveUserIdFromRequest(req, { allowAnonymous: false });
    const notes = await fetchNotesForTopic({
      pgPool,
      userId,
      subject,
      topic,
    });

    if (format === 'markdown') {
      const item = notes[Math.max(0, markdownItem - 1)] || notes[0] || null;
      const title = item?.title || `${normalizeName(topic)} Notes`;
      const summary = item?.metadata?.summary || `Study notes for ${normalizeName(topic)} under ${normalizeSubjectForApi(subject)}.`;
      const markdown = [
        `# ${title}`,
        '',
        `- Subject: ${normalizeSubjectForApi(subject)}`,
        `- Topic: ${normalizeName(topic)}`,
        '',
        summary,
      ].join('\n');
      return res.type('text/markdown').send(markdown);
    }

    return res.json({ notes, count: notes.length });
  } catch (error) {
    return handleError(res, error, 'Unable to fetch mapped notes.');
  }
});

router.post('/notes/upload', async (req, res) => {
  const { pgPool } = getDomainContext(req);

  try {
    const userId = await resolveUserIdFromRequest(req, { allowAnonymous: false });
    if (!userId) {
      return res.status(401).json({
        errorType: 'AUTH_ERROR',
        reason: 'Authentication is required to upload notes.',
      });
    }

    const result = await uploadCustomNotes({
      pgPool,
      userId,
      subject: req.body?.subject,
      topic: req.body?.topic,
      fileUrl: req.body?.fileUrl,
      metadata: req.body?.metadata || {},
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, 'Unable to upload notes.');
  }
});

// YouTube Routes
router.get('/youtube/:subject/:topic', async (req, res) => {
  const { subject, topic } = req.params;
  const subtopic = normalizeName(req.query.subtopic || 'General');
  const company = normalizeName(req.query.company || '');
  const { pgPool } = getDomainContext(req);

  try {
    const videos = await getYoutubeLinksForSubtopic({
      pgPool,
      subject,
      topic,
      subtopic,
      companyTag: company,
    });

    return res.json({ videos, count: videos.length });
  } catch (error) {
    return handleError(res, error, 'Unable to map YouTube resources for this topic.');
  }
});

export default router;
