// ============================================
// ROBINHOOD ADMIN — Full CRUD API Routes
// Topics, Patterns, Problems, Test Cases,
// Resources, Company Sets, Analytics
// ============================================
import { Router } from 'express';
import { requireAdmin, requireRole, logAdminAction } from './admin-middleware.js';

export function createAdminRouter(pgPool) {
  const router = Router();
  const admin = requireAdmin(pgPool);

  // Apply admin auth to all routes
  router.use(admin);

  // ==================== TOPICS ====================
  router.get('/topics', async (req, res) => {
    try {
      const { rows } = await pgPool.query(
        'SELECT * FROM topics ORDER BY order_index ASC, created_at ASC'
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/topics', requireRole('super_admin', 'admin'), async (req, res) => {
    const { name, slug, description, order_index } = req.body;
    if (!name || !slug) return res.status(400).json({ ok: false, error: 'name and slug required' });
    try {
      const { rows } = await pgPool.query(
        `INSERT INTO topics (name, slug, description, order_index)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, slug, description || '', order_index || 0]
      );
      await logAdminAction(pgPool, req.adminUserId, 'create', 'topic', rows[0].id, { name });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/topics/:id', requireRole('super_admin', 'admin'), async (req, res) => {
    const { name, slug, description, order_index } = req.body;
    try {
      const { rows } = await pgPool.query(
        `UPDATE topics SET name = COALESCE($1, name), slug = COALESCE($2, slug),
         description = COALESCE($3, description), order_index = COALESCE($4, order_index),
         updated_at = NOW() WHERE id = $5 RETURNING *`,
        [name, slug, description, order_index, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Topic not found' });
      await logAdminAction(pgPool, req.adminUserId, 'update', 'topic', req.params.id, { name });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/topics/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM topics WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Topic not found' });
      await logAdminAction(pgPool, req.adminUserId, 'delete', 'topic', req.params.id);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== PATTERNS ====================
  router.get('/patterns', async (req, res) => {
    try {
      const { rows } = await pgPool.query(
        `SELECT pm.*, t.name as topic_name FROM pattern_modules pm
         LEFT JOIN topics t ON pm.topic_id = t.id::text
         ORDER BY pm.order_index ASC`
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      // Fallback to old patterns table
      try {
        const { rows } = await pgPool.query(
          'SELECT p.*, t.name as topic_name FROM patterns p LEFT JOIN topics t ON p.topic_id = t.id ORDER BY p.order_index ASC'
        );
        res.json({ ok: true, items: rows, source: 'legacy' });
      } catch (e2) {
        res.status(500).json({ ok: false, error: e2.message });
      }
    }
  });

  router.post('/patterns', requireRole('super_admin', 'admin'), async (req, res) => {
    const { id, topic_id, name, slug, icon, color, definition, when_to_use, intuition,
            visual_steps, common_mistakes, key_indicators, time_complexity, space_complexity, order_index } = req.body;
    if (!name || !slug || !topic_id) {
      return res.status(400).json({ ok: false, error: 'name, slug, and topic_id required' });
    }
    try {
      const { rows } = await pgPool.query(
        `INSERT INTO pattern_modules (id, topic_id, name, slug, icon, color, definition, when_to_use,
         intuition, visual_steps, common_mistakes, key_indicators, time_complexity, space_complexity, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
        [id || slug, topic_id, name, slug, icon || 'brain', color || '#6366f1',
         definition || '', when_to_use || '', intuition || '',
         JSON.stringify(visual_steps || []), JSON.stringify(common_mistakes || []),
         JSON.stringify(key_indicators || []), time_complexity || '', space_complexity || '',
         order_index || 0]
      );
      await logAdminAction(pgPool, req.adminUserId, 'create', 'pattern', rows[0].id, { name });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/patterns/:id', requireRole('super_admin', 'admin'), async (req, res) => {
    const fields = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;

    const allowed = ['name', 'slug', 'icon', 'color', 'definition', 'when_to_use', 'intuition',
      'time_complexity', 'space_complexity', 'order_index', 'topic_id'];
    const jsonFields = ['visual_steps', 'common_mistakes', 'key_indicators'];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    for (const key of jsonFields) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        values.push(JSON.stringify(fields[key]));
        idx++;
      }
    }

    if (!setClauses.length) return res.status(400).json({ ok: false, error: 'No fields to update' });

    setClauses.push(`updated_at = NOW()`);
    values.push(req.params.id);

    try {
      const { rows } = await pgPool.query(
        `UPDATE pattern_modules SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Pattern not found' });
      await logAdminAction(pgPool, req.adminUserId, 'update', 'pattern', req.params.id, fields);
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/patterns/reorder', requireRole('super_admin', 'admin'), async (req, res) => {
    const { order } = req.body; // [{id, order_index}]
    if (!Array.isArray(order)) return res.status(400).json({ ok: false, error: 'order array required' });
    try {
      for (const item of order) {
        await pgPool.query('UPDATE pattern_modules SET order_index = $1 WHERE id = $2', [item.order_index, item.id]);
      }
      await logAdminAction(pgPool, req.adminUserId, 'reorder', 'pattern', null, { count: order.length });
      res.json({ ok: true, reordered: order.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/patterns/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM pattern_modules WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Pattern not found' });
      await logAdminAction(pgPool, req.adminUserId, 'delete', 'pattern', req.params.id);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Attach learning stages to pattern
  router.post('/patterns/:id/stages', requireRole('super_admin', 'admin'), async (req, res) => {
    const { stages } = req.body; // [{stage_number, title, description, unlock_criteria}]
    if (!Array.isArray(stages)) return res.status(400).json({ ok: false, error: 'stages array required' });
    try {
      const results = [];
      for (const s of stages) {
        const { rows } = await pgPool.query(
          `INSERT INTO pattern_stages (id, pattern_id, stage_number, title, description, unlock_criteria)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (pattern_id, stage_number) DO UPDATE SET title = $4, description = $5, unlock_criteria = $6
           RETURNING *`,
          [`${req.params.id}-s${s.stage_number}`, req.params.id, s.stage_number,
           s.title, s.description, JSON.stringify(s.unlock_criteria || {})]
        );
        results.push(rows[0]);
      }
      await logAdminAction(pgPool, req.adminUserId, 'set_stages', 'pattern', req.params.id, { count: stages.length });
      res.json({ ok: true, items: results });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== PROBLEMS ====================
  router.get('/problems', async (req, res) => {
    const { pattern_id, difficulty, limit = 100, offset = 0 } = req.query;
    try {
      let query = 'SELECT * FROM problems';
      const conditions = [];
      const values = [];
      if (pattern_id) { values.push(pattern_id); conditions.push(`pattern_id = $${values.length}`); }
      if (difficulty) { values.push(difficulty); conditions.push(`difficulty = $${values.length}`); }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC';
      values.push(Number(limit)); query += ` LIMIT $${values.length}`;
      values.push(Number(offset)); query += ` OFFSET $${values.length}`;
      const { rows } = await pgPool.query(query, values);
      res.json({ ok: true, items: rows, total: rows.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/problems', requireRole('super_admin', 'admin', 'editor'), async (req, res) => {
    const { title, slug, difficulty, pattern_id, description, examples, constraints,
            edge_cases, approach_brute, approach_optimal, time_complexity, space_complexity } = req.body;
    if (!title || !slug || !description) {
      return res.status(400).json({ ok: false, error: 'title, slug, description required' });
    }
    try {
      const { rows } = await pgPool.query(
        `INSERT INTO problems (title, slug, difficulty, pattern_id, description, examples,
         constraints, edge_cases, approach_brute, approach_optimal, time_complexity, space_complexity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [title, slug, difficulty || 'Medium', pattern_id || null, description,
         JSON.stringify(examples || []), JSON.stringify(constraints || []),
         JSON.stringify(edge_cases || []), approach_brute || '', approach_optimal || '',
         time_complexity || '', space_complexity || '']
      );
      await logAdminAction(pgPool, req.adminUserId, 'create', 'problem', rows[0].id, { title });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/problems/:id', requireRole('super_admin', 'admin', 'editor'), async (req, res) => {
    const fields = req.body;
    const textFields = ['title', 'slug', 'difficulty', 'description', 'approach_brute',
      'approach_optimal', 'time_complexity', 'space_complexity'];
    const jsonFields = ['examples', 'constraints', 'edge_cases'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of textFields) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`); values.push(fields[key]); idx++;
      }
    }
    for (const key of jsonFields) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`); values.push(JSON.stringify(fields[key])); idx++;
      }
    }
    if (fields.pattern_id !== undefined) {
      setClauses.push(`pattern_id = $${idx}`); values.push(fields.pattern_id); idx++;
    }

    if (!setClauses.length) return res.status(400).json({ ok: false, error: 'No fields to update' });
    setClauses.push('updated_at = NOW()');
    values.push(req.params.id);

    try {
      const { rows } = await pgPool.query(
        `UPDATE problems SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, values
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Problem not found' });
      await logAdminAction(pgPool, req.adminUserId, 'update', 'problem', req.params.id, fields);
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/problems/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM problems WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Problem not found' });
      await logAdminAction(pgPool, req.adminUserId, 'delete', 'problem', req.params.id);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== TEST CASES ====================
  router.get('/problems/:id/test-cases', async (req, res) => {
    try {
      const { rows } = await pgPool.query(
        'SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY order_index ASC',
        [req.params.id]
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/problems/:id/test-cases', requireRole('super_admin', 'admin', 'editor'), async (req, res) => {
    const { test_cases } = req.body; // [{input_payload, expected_output, is_hidden, order_index}]
    if (!Array.isArray(test_cases)) return res.status(400).json({ ok: false, error: 'test_cases array required' });
    try {
      const results = [];
      for (const tc of test_cases) {
        const { rows } = await pgPool.query(
          `INSERT INTO test_cases (problem_id, input_payload, expected_output, is_hidden, order_index)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.params.id, JSON.stringify(tc.input_payload), JSON.stringify(tc.expected_output),
           tc.is_hidden !== false, tc.order_index || 0]
        );
        results.push(rows[0]);
      }
      await logAdminAction(pgPool, req.adminUserId, 'add_test_cases', 'problem', req.params.id, { count: test_cases.length });
      res.json({ ok: true, items: results });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/test-cases/:id', requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM test_cases WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Test case not found' });
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== RESOURCES ====================
  router.get('/resources', async (req, res) => {
    const { resource_type, subject, topic } = req.query;
    try {
      let query = 'SELECT * FROM resources';
      const conditions = [];
      const values = [];
      if (resource_type) { values.push(resource_type); conditions.push(`resource_type = $${values.length}`); }
      if (subject) { values.push(subject); conditions.push(`subject = $${values.length}`); }
      if (topic) { values.push(topic); conditions.push(`topic = $${values.length}`); }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC LIMIT 200';
      const { rows } = await pgPool.query(query, values);
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/resources', requireRole('super_admin', 'admin', 'editor'), async (req, res) => {
    const { resource_type, title, url, subject, topic, subtopic, description, metadata } = req.body;
    if (!resource_type || !title || !url) {
      return res.status(400).json({ ok: false, error: 'resource_type, title, url required' });
    }
    try {
      const { rows } = await pgPool.query(
        `INSERT INTO resources (resource_type, title, url, subject, topic, subtopic, description, metadata, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [resource_type, title, url, subject || null, topic || null, subtopic || null,
         description || '', JSON.stringify(metadata || {}), req.adminUserId]
      );
      await logAdminAction(pgPool, req.adminUserId, 'create', 'resource', rows[0].id, { title, resource_type });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/resources/:id', requireRole('super_admin', 'admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM resources WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Resource not found' });
      await logAdminAction(pgPool, req.adminUserId, 'delete', 'resource', req.params.id);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== COMPANY QUESTION SETS ====================
  router.get('/company-sets', async (req, res) => {
    try {
      const { rows } = await pgPool.query(
        'SELECT * FROM company_question_sets ORDER BY company_name ASC, created_at DESC'
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/company-sets', requireRole('super_admin', 'admin'), async (req, res) => {
    const { company_name, set_name, description, problem_ids, difficulty_mix } = req.body;
    if (!company_name || !set_name) {
      return res.status(400).json({ ok: false, error: 'company_name and set_name required' });
    }
    try {
      const { rows } = await pgPool.query(
        `INSERT INTO company_question_sets (company_name, set_name, description, problem_ids, difficulty_mix, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [company_name, set_name, description || '', problem_ids || [],
         JSON.stringify(difficulty_mix || {}), req.adminUserId]
      );
      await logAdminAction(pgPool, req.adminUserId, 'create', 'company_set', rows[0].id, { company_name, set_name });
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.put('/company-sets/:id', requireRole('super_admin', 'admin'), async (req, res) => {
    const { company_name, set_name, description, problem_ids, difficulty_mix, is_active } = req.body;
    try {
      const { rows } = await pgPool.query(
        `UPDATE company_question_sets SET
         company_name = COALESCE($1, company_name), set_name = COALESCE($2, set_name),
         description = COALESCE($3, description), problem_ids = COALESCE($4, problem_ids),
         difficulty_mix = COALESCE($5, difficulty_mix), is_active = COALESCE($6, is_active),
         updated_at = NOW() WHERE id = $7 RETURNING *`,
        [company_name, set_name, description, problem_ids,
         difficulty_mix ? JSON.stringify(difficulty_mix) : null, is_active, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Set not found' });
      await logAdminAction(pgPool, req.adminUserId, 'update', 'company_set', req.params.id);
      res.json({ ok: true, item: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete('/company-sets/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { rowCount } = await pgPool.query('DELETE FROM company_question_sets WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: 'Set not found' });
      await logAdminAction(pgPool, req.adminUserId, 'delete', 'company_set', req.params.id);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== ANALYTICS ====================
  router.get('/analytics/overview', async (req, res) => {
    try {
      const [users, problems, submissions, resources] = await Promise.all([
        pgPool.query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] })),
        pgPool.query('SELECT COUNT(*) as count FROM problems').catch(() => ({ rows: [{ count: 0 }] })),
        pgPool.query('SELECT COUNT(*) as count FROM submissions').catch(() => ({ rows: [{ count: 0 }] })),
        pgPool.query('SELECT COUNT(*) as count FROM resources').catch(() => ({ rows: [{ count: 0 }] })),
      ]);
      res.json({
        ok: true,
        stats: {
          totalUsers: Number(users.rows[0].count),
          totalProblems: Number(problems.rows[0].count),
          totalSubmissions: Number(submissions.rows[0].count),
          totalResources: Number(resources.rows[0].count),
        },
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/analytics/submissions', async (req, res) => {
    const { days = 30 } = req.query;
    try {
      const { rows } = await pgPool.query(
        `SELECT DATE(created_at) as date, status, COUNT(*) as count
         FROM submissions WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at), status ORDER BY date DESC`,
        [Number(days)]
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/analytics/users', async (req, res) => {
    try {
      const { rows } = await pgPool.query(
        `SELECT u.id, u.name, u.email, u.created_at,
         (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id) as submission_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status = 'Accepted') as accepted_count
         FROM users u ORDER BY u.created_at DESC LIMIT 100`
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get('/analytics/performance', async (req, res) => {
    try {
      const [byDifficulty, byStatus, topProblems] = await Promise.all([
        pgPool.query(
          `SELECT p.difficulty, COUNT(s.id) as total, COUNT(CASE WHEN s.status='Accepted' THEN 1 END) as accepted
           FROM submissions s JOIN problems p ON s.problem_id = p.id
           GROUP BY p.difficulty`
        ).catch(() => ({ rows: [] })),
        pgPool.query(
          'SELECT status, COUNT(*) as count FROM submissions GROUP BY status ORDER BY count DESC'
        ).catch(() => ({ rows: [] })),
        pgPool.query(
          `SELECT p.title, p.difficulty, COUNT(s.id) as attempts,
           COUNT(CASE WHEN s.status='Accepted' THEN 1 END) as accepted
           FROM submissions s JOIN problems p ON s.problem_id = p.id
           GROUP BY p.id, p.title, p.difficulty ORDER BY attempts DESC LIMIT 20`
        ).catch(() => ({ rows: [] })),
      ]);
      res.json({
        ok: true,
        byDifficulty: byDifficulty.rows,
        byStatus: byStatus.rows,
        topProblems: topProblems.rows,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ==================== AUDIT LOG ====================
  router.get('/audit-log', requireRole('super_admin', 'admin'), async (req, res) => {
    const { limit = 50 } = req.query;
    try {
      const { rows } = await pgPool.query(
        `SELECT al.*, u.name as user_name FROM admin_audit_log al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC LIMIT $1`,
        [Number(limit)]
      );
      res.json({ ok: true, items: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

export default createAdminRouter;
