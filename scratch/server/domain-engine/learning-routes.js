import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/robinhood'
});

// Dummy auth
const requireAuth = (req, res, next) => {
    req.user = req.user || { id: '00000000-0000-0000-0000-000000000000' };
    next();
};

// GET /api/learning/topics
router.get('/topics', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM topics ORDER BY order_index');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/learning/patterns/:topicId
router.get('/patterns/:topicId', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM patterns WHERE topic_id = $1 ORDER BY order_index', [req.params.topicId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/learning/problems/:patternId
router.get('/problems/:patternId', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, title, slug, difficulty FROM problems WHERE pattern_id = $1 ORDER BY created_at', [req.params.patternId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/learning/problem/:id
router.get('/problem/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM problems WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
        
        const problem = rows[0];
        
        // Fetch visible test cases only
        const { rows: testCases } = await db.query('SELECT input_payload, expected_output FROM test_cases WHERE problem_id = $1 AND is_hidden = false ORDER BY order_index', [problem.id]);
        
        res.json({
            ...problem,
            test_cases: testCases
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/learning/submit
router.post('/submit', requireAuth, async (req, res) => {
    try {
        const { problemId, language, code } = req.body;
        const userId = req.user.id;

        // Fetch all test cases
        const { rows: testCases } = await db.query('SELECT * FROM test_cases WHERE problem_id = $1', [problemId]);
        
        if (testCases.length === 0) {
            return res.status(400).json({ error: 'No test cases found for this problem' });
        }

        // Mock Validation Logic
        let passCount = 0;
        let failCases = [];
        
        for (const tc of testCases) {
            // In a real system, send code + tc to Judge0
            // Here we simulate validation (e.g. 90% pass rate)
            const passed = Math.random() > 0.1; 
            if (passed) {
                passCount++;
            } else {
                failCases.push(tc.input_payload);
            }
        }

        const status = passCount === testCases.length ? 'Accepted' : 'Wrong Answer';

        const { rows: subRows } = await db.query(
            `INSERT INTO submissions (user_id, problem_id, language, code, status, execution_time_ms, memory_used_bytes, pass_count, fail_cases) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [userId, problemId, language, code, status, Math.floor(Math.random() * 50) + 10, Math.floor(Math.random() * 1000) + 1000, passCount, JSON.stringify(failCases)]
        );

        res.json({
            submissionId: subRows[0].id,
            status: subRows[0].status,
            passCount: subRows[0].pass_count,
            totalCases: testCases.length,
            failCases: subRows[0].fail_cases,
            runtime: subRows[0].execution_time_ms
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/learning/submissions/:problemId
router.get('/submissions/:problemId', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM submissions WHERE problem_id = $1 AND user_id = $2 ORDER BY created_at DESC', [req.params.problemId, req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
