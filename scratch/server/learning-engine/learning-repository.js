/**
 * Repository layer — pure SQL, no HTTP, no business logic.
 *
 * Each export is a thin function over the connection pool. Queries are
 * carefully ordered so we never make N+1 calls from the service layer.
 */

import pool from './db.js';

// -------------------------------------------------------------------------
// Topics
// -------------------------------------------------------------------------

/**
 * List all topics ordered by curriculum sequence.
 * @returns {Promise<Array<{id, name, slug, description, order_index}>>}
 */
export async function listTopics() {
  const { rows } = await pool.query(
    `SELECT id, name, slug, description, order_index
     FROM topics
     ORDER BY order_index ASC, name ASC`
  );
  return rows;
}

// -------------------------------------------------------------------------
// Patterns
// -------------------------------------------------------------------------

/**
 * List patterns under a topic, with the number of problems per pattern
 * computed in a single SQL query (no N+1).
 * @param {string} topicId UUID
 */
export async function listPatternsByTopicId(topicId) {
  const { rows } = await pool.query(
    `SELECT
        p.id,
        p.name,
        p.slug,
        p.explanation,
        p.when_to_use,
        p.intuition,
        p.order_index,
        COALESCE(pc.cnt, 0)::int AS problem_count
     FROM patterns p
     LEFT JOIN (
       SELECT pattern_id, COUNT(*)::int AS cnt
       FROM problems
       GROUP BY pattern_id
     ) pc ON pc.pattern_id = p.id
     WHERE p.topic_id = $1
     ORDER BY p.order_index ASC, p.name ASC`,
    [topicId]
  );
  return rows;
}

/**
 * Confirm a topic exists by id. Returns id or null.
 */
export async function getTopicIdById(topicId) {
  const { rows } = await pool.query(
    `SELECT id FROM topics WHERE id = $1 LIMIT 1`,
    [topicId]
  );
  return rows[0]?.id ?? null;
}

// -------------------------------------------------------------------------
// Problems (list)
// -------------------------------------------------------------------------

/**
 * List problems under a pattern. Light projection — just the fields the
 * problem-listing UI needs.
 */
export async function listProblemsByPatternId(patternId) {
  const { rows } = await pool.query(
    `SELECT id, title, slug, difficulty, tags
     FROM problems
     WHERE pattern_id = $1
     ORDER BY
       CASE difficulty
         WHEN 'Easy'   THEN 1
         WHEN 'Medium' THEN 2
         WHEN 'Hard'   THEN 3
         ELSE 4
       END,
       title ASC`,
    [patternId]
  );
  return rows;
}

/**
 * Confirm a pattern exists by id. Returns id or null.
 */
export async function getPatternIdById(patternId) {
  const { rows } = await pool.query(
    `SELECT id FROM patterns WHERE id = $1 LIMIT 1`,
    [patternId]
  );
  return rows[0]?.id ?? null;
}

// -------------------------------------------------------------------------
// Compact cross-cutting projection — used by the legacy-page migration to
// power list/dashboard surfaces (revision queue, concept map, sheets, etc.)
// without re-fetching topic+pattern joins per row.
// -------------------------------------------------------------------------

/**
 * Flat index of every problem with its topic + pattern context. Returns
 * the minimum fields needed for client-side filtering / search / progress
 * computation. NO heavy fields (description, examples, starter_code, etc.).
 */
export async function listProblemsIndex() {
  const { rows } = await pool.query(
    `SELECT
        pr.id,
        pr.slug,
        pr.title,
        pr.difficulty,
        pr.tags,
        t.id   AS topic_id,
        t.slug AS topic_slug,
        t.name AS topic_name,
        pa.id   AS pattern_id,
        pa.slug AS pattern_slug,
        pa.name AS pattern_name
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     ORDER BY t.order_index ASC,
              pa.order_index ASC,
              CASE pr.difficulty
                WHEN 'Easy'   THEN 1
                WHEN 'Medium' THEN 2
                WHEN 'Hard'   THEN 3
                ELSE 4
              END,
              pr.title ASC`
  );
  return rows;
}

/**
 * Pick a single problem by deterministic offset (0..N-1) wrapping around the
 * total problem count. Used by the dashboard "DSA drill of the day" feature
 * to give each (user, day) pair a stable suggestion without random I/O.
 *
 * Returns null when the problems table is empty.
 */
export async function getProblemByOrdinalOffset(seedIndex) {
  const safeSeed = Number.isFinite(Number(seedIndex)) ? Math.abs(Math.trunc(Number(seedIndex))) : 0;
  const { rows } = await pool.query(
    `WITH ordered AS (
       SELECT
         pr.id, pr.slug, pr.title, pr.difficulty,
         t.slug  AS topic_slug,
         t.name  AS topic_name,
         pa.slug AS pattern_slug,
         pa.name AS pattern_name,
         (ROW_NUMBER() OVER (ORDER BY pr.id) - 1) AS rn,
         COUNT(*) OVER ()                         AS total
       FROM problems pr
       JOIN patterns pa ON pa.id = pr.pattern_id
       JOIN topics   t  ON t.id  = pa.topic_id
     )
     SELECT id, slug, title, difficulty, topic_slug, topic_name, pattern_slug, pattern_name
     FROM ordered
     WHERE total > 0 AND rn = ($1::bigint % total)
     LIMIT 1`,
    [safeSeed]
  );
  return rows[0] || null;
}

/**
 * Filter the problem index by topic slug and/or list of company slugs. The
 * companies filter is a NO-OP today because the schema does not yet model
 * company tagging (problems.tags[] holds algorithmic tags only). Kept as
 * a parameter so the controller contract stays stable when companies land.
 */
export async function listProblemsForLegacyEndpoint({ topicSlug = null } = {}) {
  const params = [];
  const where = [];
  if (topicSlug) {
    params.push(String(topicSlug).toLowerCase());
    where.push(`LOWER(t.slug) = $${params.length}`);
  }
  const sql = `SELECT
       pr.id,
       pr.slug,
       pr.title,
       pr.difficulty,
       pr.tags,
       t.slug  AS topic_slug,
       t.name  AS topic_name,
       pa.slug AS pattern_slug,
       pa.name AS pattern_name
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY t.order_index ASC, pa.order_index ASC, pr.title ASC`;
  const { rows } = await pool.query(sql, params);
  return rows;
}

// -------------------------------------------------------------------------
// Single problem (full detail) + visible test cases
// -------------------------------------------------------------------------

/**
 * Fetch a problem and its VISIBLE test cases in a single round-trip.
 * Returns null if the problem doesn't exist.
 *
 * Internal helper — pass any column predicate ("id" or "slug") and the
 * matching parameter value. Keeps the SELECT list and second round-trip
 * identical so both lookups return the same shape.
 */
async function getProblemDetailBy(column, value) {
  // Whitelist the column to keep this safely interpolated into SQL.
  const SAFE_COLS = new Set(['id', 'slug']);
  if (!SAFE_COLS.has(column)) {
    throw new Error(`getProblemDetailBy: unsupported column "${column}"`);
  }

  const probRes = await pool.query(
    `SELECT id, pattern_id, title, slug, difficulty, description,
            examples, constraints, edge_cases, starter_code,
            approach_brute, approach_optimal, tags,
            time_complexity, space_complexity
     FROM problems
     WHERE ${column} = $1
     LIMIT 1`,
    [value]
  );
  if (probRes.rows.length === 0) return null;

  const problem = probRes.rows[0];
  const tcRes = await pool.query(
    `SELECT id, input_payload, expected_output, order_index
     FROM test_cases
     WHERE problem_id = $1 AND is_hidden = false
     ORDER BY order_index ASC, id ASC`,
    [problem.id]
  );

  return { problem, visible_test_cases: tcRes.rows };
}

/**
 * UUID-keyed lookup. Retained for any internal caller that already holds
 * the problem's primary key (e.g. the submission pipeline).
 */
export async function getProblemDetailById(problemId) {
  return getProblemDetailBy('id', problemId);
}

/**
 * Slug-keyed lookup — used by the public GET /problem/:slug route.
 * Returns null if no problem matches the slug.
 */
export async function getProblemDetailBySlug(slug) {
  return getProblemDetailBy('slug', slug);
}

// -------------------------------------------------------------------------
// Submission flow — needs ALL test cases (visible + hidden)
// -------------------------------------------------------------------------

/**
 * Fetch all test cases for a problem (used by the submit pipeline only).
 * @param {string} problemId UUID
 */
export async function listAllTestCasesForProblem(problemId) {
  const { rows } = await pool.query(
    `SELECT id, input_payload, expected_output, is_hidden, order_index
     FROM test_cases
     WHERE problem_id = $1
     ORDER BY order_index ASC, id ASC`,
    [problemId]
  );
  return rows;
}

/**
 * Fetch ONLY the visible test cases for a problem, by problem UUID.
 *
 * Used by the new POST /api/execute/run path (the "Run" button) — runs
 * are ephemeral and must never expose hidden cases. Distinct from the
 * existing slug-based detail loader because the run path receives a
 * problem UUID directly from the editor state.
 *
 * Indexed by `idx_test_cases_problem` (defined in schema-master.sql).
 *
 * @param {string} problemId UUID
 * @returns {Promise<Array<{id, input_payload, expected_output, is_hidden, order_index}>>}
 */
export async function getVisibleTestCases(problemId) {
  const { rows } = await pool.query(
    `SELECT id, input_payload, expected_output, is_hidden, order_index
     FROM test_cases
     WHERE problem_id = $1 AND is_hidden = false
     ORDER BY order_index ASC, id ASC`,
    [problemId]
  );
  return rows;
}

/**
 * Verify a problem exists and return minimal metadata needed for execution,
 * including the per-problem C++ harness signature (null when the problem
 * does not opt into C++).
 */
export async function getProblemForSubmission(problemId) {
  const { rows } = await pool.query(
    `SELECT id, title, slug, cpp_signature
     FROM problems
     WHERE id = $1
     LIMIT 1`,
    [problemId]
  );
  return rows[0] ?? null;
}

/**
 * Persist a submission record. Returns the newly created row.
 */
export async function insertSubmission({
  userId,
  problemId,
  language,
  code,
  status,
  executionTimeMs,
  memoryUsedBytes,
  passCount,
  failCases,
}) {
  const { rows } = await pool.query(
    `INSERT INTO submissions
       (user_id, problem_id, language, code, status,
        execution_time_ms, memory_used_bytes, pass_count, fail_cases)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, status, execution_time_ms, memory_used_bytes,
               pass_count, fail_cases, created_at`,
    [
      userId,
      problemId,
      language,
      code,
      status,
      executionTimeMs,
      memoryUsedBytes,
      passCount,
      JSON.stringify(failCases || []),
    ]
  );
  return rows[0];
}

// -------------------------------------------------------------------------
// Attempt history & pattern stats (Phase 4: Learning Loop)
// -------------------------------------------------------------------------

/**
 * Fetch all submissions for a user+problem, most recent first.
 * Lightweight projection — no code column to keep response small.
 */
export async function getSubmissionHistory(userId, problemId) {
  const { rows } = await pool.query(
    `SELECT id, status, language, execution_time_ms, memory_used_bytes,
            pass_count, created_at
     FROM submissions
     WHERE user_id = $1 AND problem_id = $2
     ORDER BY created_at DESC`,
    [userId, problemId]
  );
  return rows;
}

/**
 * Get the pattern name + topic name for a given problem.
 */
export async function getProblemPatternContext(problemId) {
  const { rows } = await pool.query(
    `SELECT pa.name AS pattern_name, pa.slug AS pattern_slug,
            t.name  AS topic_name,   t.slug  AS topic_slug
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     WHERE pr.id = $1
     LIMIT 1`,
    [problemId]
  );
  return rows[0] || null;
}

/**
 * Aggregate user performance per pattern:
 *   pattern_name, topic_name, total_attempts, solved_count,
 *   total_problems_attempted, accepted_count
 */
export async function getUserPatternStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       pa.name  AS pattern_name,
       pa.slug  AS pattern_slug,
       t.name   AS topic_name,
       COUNT(s.id)::int                                    AS total_submissions,
       COUNT(DISTINCT s.problem_id)::int                   AS problems_attempted,
       COUNT(DISTINCT CASE WHEN s.status = 'Accepted'
                           THEN s.problem_id END)::int     AS problems_solved,
       COUNT(CASE WHEN s.status = 'Accepted'
                  THEN 1 END)::int                         AS accepted_count,
       ROUND(AVG(s.execution_time_ms))::int                AS avg_runtime_ms
     FROM submissions s
     JOIN problems pr ON pr.id = s.problem_id
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     WHERE s.user_id = $1
     GROUP BY pa.id, pa.name, pa.slug, t.name
     ORDER BY total_submissions DESC`,
    [userId]
  );
  return rows;
}

// -------------------------------------------------------------------------
// Phase 5: Adaptive Learning Engine — queries
// -------------------------------------------------------------------------

/**
 * Enriched per-pattern stats: includes avg attempts-per-solve and
 * avg time-per-solve for mastery scoring.
 */
export async function getUserPatternStatsDetailed(userId) {
  const { rows } = await pool.query(
    `WITH per_problem AS (
       SELECT
         pr.pattern_id,
         s.problem_id,
         COUNT(s.id)::int                                       AS attempts,
         bool_or(s.status = 'Accepted')                         AS solved,
         MAX(CASE WHEN s.status = 'Accepted'
                  THEN s.execution_time_ms END)::int            AS solve_runtime_ms,
         EXTRACT(EPOCH FROM (MAX(s.created_at) - MIN(s.created_at)))::int AS time_span_secs
       FROM submissions s
       JOIN problems pr ON pr.id = s.problem_id
       WHERE s.user_id = $1
       GROUP BY pr.pattern_id, s.problem_id
     )
     SELECT
       pa.id   AS pattern_id,
       pa.name AS pattern_name,
       pa.slug AS pattern_slug,
       t.name  AS topic_name,
       t.slug  AS topic_slug,
       COUNT(pp.problem_id)::int                           AS problems_attempted,
       COUNT(CASE WHEN pp.solved THEN 1 END)::int          AS problems_solved,
       COALESCE(SUM(pp.attempts), 0)::int                  AS total_submissions,
       ROUND(AVG(CASE WHEN pp.solved THEN pp.attempts END), 2)  AS avg_attempts_per_solve,
       ROUND(AVG(CASE WHEN pp.solved THEN pp.time_span_secs END))::int AS avg_solve_time_secs,
       ROUND(AVG(CASE WHEN pp.solved THEN pp.solve_runtime_ms END))::int AS avg_runtime_ms
     FROM per_problem pp
     JOIN patterns pa ON pa.id = pp.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     GROUP BY pa.id, pa.name, pa.slug, t.name, t.slug
     ORDER BY total_submissions DESC`,
    [userId]
  );
  return rows;
}

/**
 * Fetch candidate problems for recommendation. Returns unsolved problems
 * (or not yet attempted) in the same pattern or weak patterns, ranked
 * by difficulty progression.
 *
 * @param {string}   userId
 * @param {string[]} patternIds   — patterns to pull candidates from
 * @param {string}   preferDifficulty — 'Easy' | 'Medium' | 'Hard'
 * @param {number}   limit
 */
export async function getNextProblemCandidates(userId, patternIds, preferDifficulty, limit = 3) {
  if (!patternIds || patternIds.length === 0) return [];

  const { rows } = await pool.query(
    `SELECT
       pr.id, pr.slug, pr.title, pr.difficulty,
       pa.name AS pattern_name, pa.slug AS pattern_slug,
       t.name  AS topic_name,
       CASE
         WHEN pr.difficulty = $3 THEN 0
         WHEN pr.difficulty = 'Easy'   THEN 1
         WHEN pr.difficulty = 'Medium' THEN 2
         ELSE 3
       END AS diff_rank
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     WHERE pr.pattern_id = ANY($2::uuid[])
       AND NOT EXISTS (
         SELECT 1 FROM submissions s
         WHERE s.user_id = $1
           AND s.problem_id = pr.id
           AND s.status = 'Accepted'
       )
     ORDER BY
       diff_rank ASC,
       CASE pr.difficulty
         WHEN 'Easy'   THEN 1
         WHEN 'Medium' THEN 2
         WHEN 'Hard'   THEN 3
         ELSE 4
       END,
       pr.title ASC
     LIMIT $4`,
    [userId, patternIds, preferDifficulty || 'Medium', limit]
  );
  return rows;
}

/**
 * Fallback: get any unsolved problem across all patterns.
 */
export async function getUnsolvedProblemFallback(userId, preferDifficulty, limit = 3) {
  const { rows } = await pool.query(
    `SELECT
       pr.id, pr.slug, pr.title, pr.difficulty,
       pa.name AS pattern_name, pa.slug AS pattern_slug,
       t.name  AS topic_name
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     JOIN topics   t  ON t.id  = pa.topic_id
     WHERE NOT EXISTS (
       SELECT 1 FROM submissions s
       WHERE s.user_id = $1
         AND s.problem_id = pr.id
         AND s.status = 'Accepted'
     )
     ORDER BY
       CASE pr.difficulty
         WHEN $2 THEN 0
         WHEN 'Easy'   THEN 1
         WHEN 'Medium' THEN 2
         ELSE 3
       END,
       t.order_index ASC,
       pa.order_index ASC,
       pr.title ASC
     LIMIT $3`,
    [userId, preferDifficulty || 'Easy', limit]
  );
  return rows;
}

// -------------------------------------------------------------------------
// Phase 6: Intelligence Layer — queries
// -------------------------------------------------------------------------

/**
 * Fetch ALL submissions for a user with fail_cases JSONB for error analysis.
 * Returns newest-first. Includes problem context for pattern association.
 */
export async function getUserSubmissionsWithDetails(userId) {
  const { rows } = await pool.query(
    `SELECT
       s.id, s.problem_id, s.status, s.language,
       s.execution_time_ms, s.memory_used_bytes,
       s.pass_count, s.fail_cases, s.created_at,
       pr.title AS problem_title, pr.slug AS problem_slug,
       pa.name AS pattern_name, pa.slug AS pattern_slug
     FROM submissions s
     JOIN problems pr ON pr.id = s.problem_id
     JOIN patterns pa ON pa.id = pr.pattern_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Fetch all patterns with prerequisites + topic context for learning path graph.
 */
export async function getAllPatternsWithPrereqs() {
  const { rows } = await pool.query(
    `SELECT
       pa.id, pa.slug, pa.name, pa.order_index,
       pa.prerequisites,
       pa.explanation, pa.when_to_use, pa.intuition,
       t.name AS topic_name, t.slug AS topic_slug
     FROM patterns pa
     JOIN topics t ON t.id = pa.topic_id
     ORDER BY t.order_index ASC, pa.order_index ASC`
  );
  return rows;
}

// -------------------------------------------------------------------------
// Phase 7: Code Intelligence Engine — queries
// -------------------------------------------------------------------------

/**
 * Fetch problem complexity expectations (time_complexity, space_complexity).
 */
export async function getProblemComplexity(problemId) {
  const { rows } = await pool.query(
    `SELECT pr.time_complexity, pr.space_complexity,
            pa.name AS pattern_name, pa.slug AS pattern_slug
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     WHERE pr.id = $1 LIMIT 1`,
    [problemId]
  );
  return rows[0] || null;
}

/**
 * Fetch the latest submission code for a user+problem.
 */
export async function getLatestSubmissionCode(userId, problemId) {
  const { rows } = await pool.query(
    `SELECT code, language FROM submissions
     WHERE user_id = $1 AND problem_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, problemId]
  );
  return rows[0] || null;
}

// -------------------------------------------------------------------------
// Phase 8: Knowledge Graph — aggregate queries
// -------------------------------------------------------------------------

/**
 * Aggregate submission stats per problem across ALL users.
 */
export async function getAggregateByProblem() {
  const { rows } = await pool.query(
    `SELECT
       pr.id AS problem_id, pr.title, pr.slug,
       pa.name AS pattern_name,
       COUNT(s.id)::int AS total_submissions,
       COUNT(DISTINCT s.user_id)::int AS total_users,
       COUNT(DISTINCT CASE WHEN s.status='Accepted' THEN s.user_id END)::int AS solved_users,
       COUNT(CASE WHEN s.status='Accepted' THEN 1 END)::int AS accepted,
       COUNT(CASE WHEN s.status='Wrong Answer' THEN 1 END)::int AS wrong_answer,
       COUNT(CASE WHEN s.status='Time Limit Exceeded' THEN 1 END)::int AS tle,
       COUNT(CASE WHEN s.status='Runtime Error' THEN 1 END)::int AS runtime_error,
       ROUND(AVG(CASE WHEN s.status='Accepted' THEN s.execution_time_ms END)::numeric / 1000, 1) AS avg_time_secs,
       ROUND(COUNT(s.id)::numeric / NULLIF(COUNT(DISTINCT s.user_id), 0), 1) AS avg_attempts
     FROM problems pr
     JOIN patterns pa ON pa.id = pr.pattern_id
     LEFT JOIN submissions s ON s.problem_id = pr.id
     GROUP BY pr.id, pr.title, pr.slug, pa.name
     ORDER BY total_submissions DESC`
  );
  return rows;
}

/**
 * Aggregate submission stats per pattern across ALL users.
 */
export async function getAggregateByPattern() {
  const { rows } = await pool.query(
    `SELECT
       pa.slug AS pattern_slug, pa.name AS pattern_name,
       t.name AS topic_name,
       COUNT(s.id)::int AS total_submissions,
       COUNT(DISTINCT s.user_id)::int AS total_users,
       COUNT(DISTINCT CASE WHEN s.status='Accepted' THEN s.user_id END)::int AS solved_users,
       COUNT(CASE WHEN s.status='Wrong Answer' THEN 1 END)::int AS wrong_answer,
       COUNT(CASE WHEN s.status='Time Limit Exceeded' THEN 1 END)::int AS tle,
       COUNT(CASE WHEN s.status='Runtime Error' THEN 1 END)::int AS runtime_error,
       ROUND(COUNT(s.id)::numeric / NULLIF(COUNT(DISTINCT s.user_id), 0), 1) AS avg_attempts
     FROM patterns pa
     JOIN topics t ON t.id = pa.topic_id
     LEFT JOIN problems pr ON pr.pattern_id = pa.id
     LEFT JOIN submissions s ON s.problem_id = pr.id
     GROUP BY pa.slug, pa.name, t.name
     ORDER BY total_submissions DESC`
  );
  return rows;
}

/**
 * Pattern transition data: for users who solved pattern A then attempted
 * pattern B, track success rates.
 */
export async function getPatternTransitions() {
  const { rows } = await pool.query(
    `WITH user_pattern_solve AS (
       SELECT DISTINCT s.user_id, pa.name AS pattern_name,
              MIN(s.created_at) AS first_solve
       FROM submissions s
       JOIN problems pr ON pr.id = s.problem_id
       JOIN patterns pa ON pa.id = pr.pattern_id
       WHERE s.status = 'Accepted'
       GROUP BY s.user_id, pa.name
     ),
     transitions AS (
       SELECT a.pattern_name AS from_pattern,
              b.pattern_name AS to_pattern,
              b.user_id
       FROM user_pattern_solve a
       JOIN user_pattern_solve b ON a.user_id = b.user_id
            AND a.pattern_name != b.pattern_name
            AND b.first_solve > a.first_solve
     ),
     attempt_counts AS (
       SELECT t.from_pattern, t.to_pattern, t.user_id,
              COUNT(s.id) AS attempts
       FROM transitions t
       JOIN patterns pa ON pa.name = t.to_pattern
       JOIN problems pr ON pr.pattern_id = pa.id
       JOIN submissions s ON s.problem_id = pr.id AND s.user_id = t.user_id
       GROUP BY t.from_pattern, t.to_pattern, t.user_id
     )
     SELECT
       from_pattern, to_pattern,
       COUNT(DISTINCT user_id)::int AS users_attempted,
       COUNT(DISTINCT user_id)::int AS users_succeeded,
       ROUND(AVG(attempts)::numeric, 1) AS avg_attempts_to_first_solve
     FROM attempt_counts
     GROUP BY from_pattern, to_pattern
     HAVING COUNT(DISTINCT user_id) >= 1
     ORDER BY users_attempted DESC
     LIMIT 50`
  );
  return rows;
}

/**
 * Fetch problem-level insights for a specific problem (for UI display).
 */
export async function getProblemCommunityStats(problemId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(s.id)::int AS total_submissions,
       COUNT(DISTINCT s.user_id)::int AS total_users,
       COUNT(DISTINCT CASE WHEN s.status='Accepted' THEN s.user_id END)::int AS solved_users,
       COUNT(CASE WHEN s.status='Wrong Answer' THEN 1 END)::int AS wrong_answer,
       COUNT(CASE WHEN s.status='Time Limit Exceeded' THEN 1 END)::int AS tle,
       COUNT(CASE WHEN s.status='Runtime Error' THEN 1 END)::int AS runtime_error,
       ROUND(AVG(CASE WHEN s.status='Accepted' THEN s.execution_time_ms END)::numeric, 0) AS avg_runtime_ms,
       ROUND(COUNT(s.id)::numeric / NULLIF(COUNT(DISTINCT s.user_id), 0), 1) AS avg_attempts
     FROM submissions s
     WHERE s.problem_id = $1`,
    [problemId]
  );
  return rows[0] || null;
}

// -------------------------------------------------------------------------
// Phase 9: Predictive Intelligence — queries
// -------------------------------------------------------------------------

/**
 * Get recent submissions for velocity/risk analysis (newest first, limit 100).
 */
export async function getSubmissionTimeline(userId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.problem_id, s.status, s.language,
            s.execution_time_ms, s.created_at,
            pa.name AS pattern_name
     FROM submissions s
     JOIN problems pr ON pr.id = s.problem_id
     JOIN patterns pa ON pa.id = pr.pattern_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

/**
 * Count total patterns in the system.
 */
export async function getTotalPatternCount() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM patterns`);
  return rows[0]?.count || 0;
}
