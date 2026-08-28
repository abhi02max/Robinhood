import express from 'express';
import pool from '../learning-engine/db.js';

const router = express.Router();

// Uses the centralized pool, as the previous comment here recommended. The
// shared pool attaches an 'error' listener and sets idleTimeoutMillis; a bare
// `new Pool()` has neither, and an unhandled Pool 'error' event -- which pg
// raises when the server drops an idle client -- terminates the process. See
// the longer note in domain-engine/learning-routes.js.

/**
 * @route GET /api/workspace/:problemId
 * @desc Get the Notion-like workspace for a specific problem and user
 */
router.get('/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id; // Assuming auth middleware attaches user

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT id, content, last_synced_at 
      FROM user_notes 
      WHERE user_id = $1 AND problem_id = $2
    `;
    const { rows } = await pool.query(query, [userId, problemId]);

    if (rows.length === 0) {
      // Return empty CRDT structure if no notes exist yet
      return res.json({ content: [] });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Workspace fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/workspace/:problemId
 * @desc Auto-save or update the workspace content (CRDT blocks)
 */
router.post('/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    const { content } = req.body; // JSON array of blocks
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content || !Array.isArray(content)) {
      return res.status(400).json({ error: 'Invalid content format. Expected array of blocks.' });
    }

    const query = `
      INSERT INTO user_notes (user_id, problem_id, content, last_synced_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE -- This assumes conflict on composite or we need to upsert by user_id/problem_id
      SET content = EXCLUDED.content, last_synced_at = NOW()
      RETURNING id, last_synced_at
    `;
    
    // Actually, in the schema I defined, id is the primary key. 
    // To do upsert properly without a UNIQUE constraint on (user_id, problem_id), we'd better check first.
    // Let's modify logic to fetch and update or insert.
    
    const checkQuery = 'SELECT id FROM user_notes WHERE user_id = $1 AND problem_id = $2';
    const existing = await pool.query(checkQuery, [userId, problemId]);
    
    if (existing.rows.length > 0) {
      // Update
      const updateQuery = 'UPDATE user_notes SET content = $1, last_synced_at = NOW() WHERE id = $2 RETURNING id, last_synced_at';
      const result = await pool.query(updateQuery, [JSON.stringify(content), existing.rows[0].id]);
      return res.json(result.rows[0]);
    } else {
      // Insert
      const insertQuery = 'INSERT INTO user_notes (user_id, problem_id, content) VALUES ($1, $2, $3) RETURNING id, last_synced_at';
      const result = await pool.query(insertQuery, [userId, problemId, JSON.stringify(content)]);
      return res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Workspace save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
