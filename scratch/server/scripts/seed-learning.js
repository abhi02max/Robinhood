/**
 * Learning curriculum seeder.
 *
 * Reads:
 *   server/data/learning/topics.json
 *   server/data/learning/patterns/<topic-slug>.json
 *   server/data/learning/problems/<topic-slug>/<pattern-slug>.json
 *
 * Inserts (in order, inside a single transaction) into:
 *   topics → patterns → problems → test_cases
 *
 * Idempotent: re-running the seeder UPSERTs on slug; test_cases for a
 * problem are wiped and re-inserted to avoid silent duplication.
 *
 * Run with:
 *   npm run seed:learning
 *   DATABASE_URL=postgres://... npm run seed:learning
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAllProblemFiles } from './validate-problem-schema.js';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both env files. .env.local wins so per-developer overrides
// (e.g. an alternate DB on a different port) take precedence.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true });

const DATA_ROOT    = path.join(__dirname, '..', 'data', 'learning');
const TOPICS_FILE  = path.join(DATA_ROOT, 'topics.json');
const PATTERNS_DIR = path.join(DATA_ROOT, 'patterns');
const PROBLEMS_DIR = path.join(DATA_ROOT, 'problems');

const MIN_TEST_CASES = 10;

// Connection precedence:
//   1. DATABASE_URL  (from .env.local — wins)
//   2. discrete POSTGRES_* vars
//   3. docker-compose defaults from this project (robinhood@127.0.0.1:5433)
// No 'postgres' superuser fallback — that was the source of the prior bug.
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER     || 'robinhood'}:${
                  process.env.POSTGRES_PASSWORD || 'robinhood'}@${
                  process.env.POSTGRES_HOST     || '127.0.0.1'}:${
                  process.env.POSTGRES_PORT     || '5433'}/${
                  process.env.POSTGRES_DB       || 'robinhood'}`;

/**
 * Strip the password out of a connection string before it is printed.
 *
 * A managed-Postgres URL carries the password inline, so printing it raw put the
 * live credential into every terminal scrollback, CI log and screenshot of a seed
 * run. The summary at the bottom of this file already redacted; the startup line
 * did not.
 */
export function redactConnectionString(url) {
  return String(url).replace(/:[^:@/]+@/, ':***@');
}

console.log('Using DB:', redactConnectionString(connectionString));

const pool = new Pool({ connectionString });

// -------------------------------------------------------------------------
// console helpers
// -------------------------------------------------------------------------
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

const stats = {
  topics:    { inserted: 0, updated: 0, skipped: 0 },
  patterns:  { inserted: 0, updated: 0, skipped: 0 },
  problems:  { inserted: 0, updated: 0, skipped: 0 },
  testCases: { inserted: 0, replaced: 0 },
  warnings:  [],
};

function warn(msg) {
  stats.warnings.push(msg);
}

// -------------------------------------------------------------------------
// io helpers
// -------------------------------------------------------------------------
async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${p}: ${e.message}`);
  }
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function requireFields(obj, fields, ctx) {
  const missing = fields.filter(
    (f) => obj[f] === undefined || obj[f] === null || obj[f] === ''
  );
  if (missing.length) {
    throw new Error(`[${ctx}] missing required fields: ${missing.join(', ')}`);
  }
}

async function* walkJsonFiles(dir) {
  if (!(await exists(dir))) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkJsonFiles(full);
    } else if (e.isFile() && e.name.endsWith('.json')) {
      yield full;
    }
  }
}

// -------------------------------------------------------------------------
// 0. STRICT INTEGRITY VALIDATION (pre-flight, no DB writes)
//
// Walks topics → patterns → problems → test_cases up-front and accumulates
// EVERY data-integrity violation into a single list. If the list is
// non-empty the seeder aborts BEFORE opening a DB transaction, with the
// complete report printed in one go (no piecemeal silent skipping).
//
// This is intentionally redundant with the throw-on-violation paths inside
// seedPatterns / seedProblemFile — those exist as defense-in-depth, but
// this pre-flight is the canonical fail-fast surface.
// -------------------------------------------------------------------------
async function validateDataIntegrity() {
  const violations = [];
  let topicSlugs = new Set();
  const patternSlugs = new Set();
  const patternsByTopic = new Map();

  // ---- topics.json ------------------------------------------------------
  if (!(await exists(TOPICS_FILE))) {
    violations.push(`topics.json not found at ${TOPICS_FILE}`);
    return { violations, topicSlugs, patternSlugs, patternsByTopic };
  }
  let topicsData;
  try {
    topicsData = await readJson(TOPICS_FILE);
  } catch (e) {
    violations.push(`topics.json: ${e.message}`);
    return { violations, topicSlugs, patternSlugs, patternsByTopic };
  }
  for (const t of (topicsData.topics || [])) {
    if (!t.slug)        { violations.push(`topics.json: topic entry missing slug`); continue; }
    if (!t.name)        violations.push(`topics.json: topic "${t.slug}" missing name`);
    if (!t.description) violations.push(`topics.json: topic "${t.slug}" missing description`);
    if (topicSlugs.has(t.slug)) violations.push(`topics.json: duplicate topic slug "${t.slug}"`);
    topicSlugs.add(t.slug);
  }

  // ---- patterns/*.json -------------------------------------------------
  if (!(await exists(PATTERNS_DIR))) {
    violations.push(`patterns/ directory missing at ${PATTERNS_DIR}`);
  } else {
    const patternFiles = (await fs.readdir(PATTERNS_DIR))
      .filter((f) => f.endsWith('.json'))
      .sort();
    for (const file of patternFiles) {
      const filePath = path.join(PATTERNS_DIR, file);
      let data;
      try {
        data = await readJson(filePath);
      } catch (e) {
        violations.push(`patterns/${file}: ${e.message}`);
        continue;
      }
      const ts = data.topic_slug;
      if (!ts) {
        violations.push(`patterns/${file}: missing top-level topic_slug`);
        continue;
      }
      if (!topicSlugs.has(ts)) {
        violations.push(`patterns/${file}: topic_slug "${ts}" is not declared in topics.json`);
      }
      if (!patternsByTopic.has(ts)) patternsByTopic.set(ts, []);
      for (const p of (data.patterns || [])) {
        if (!p.slug) { violations.push(`patterns/${file}: pattern entry missing slug`); continue; }
        if (!p.name) violations.push(`patterns/${file}: pattern "${p.slug}" missing name`);
        if (patternSlugs.has(p.slug)) {
          violations.push(`patterns/${file}: duplicate pattern slug "${p.slug}" (already declared elsewhere)`);
        }
        patternSlugs.add(p.slug);
        patternsByTopic.get(ts).push(p.slug);
      }
    }
  }

  // ---- problems/**/*.json ----------------------------------------------
  if (await exists(PROBLEMS_DIR)) {
    const seenSlugs = new Set();
    for await (const filePath of walkJsonFiles(PROBLEMS_DIR)) {
      const rel = path.relative(DATA_ROOT, filePath);
      let data;
      try {
        data = await readJson(filePath);
      } catch (e) {
        violations.push(`${rel}: invalid JSON: ${e.message}`);
        continue;
      }
      const ts = data.topic_slug;
      const ps = data.pattern_slug;
      if (!ts) violations.push(`${rel}: missing top-level topic_slug`);
      if (!ps) violations.push(`${rel}: missing top-level pattern_slug`);
      if (ts && !topicSlugs.has(ts)) violations.push(`${rel}: topic_slug "${ts}" is not declared in topics.json`);
      if (ps && !patternSlugs.has(ps)) violations.push(`${rel}: pattern_slug "${ps}" is not declared in any patterns/*.json`);
      if (ts && ps && patternSlugs.has(ps) && topicSlugs.has(ts)) {
        const allowed = patternsByTopic.get(ts) || [];
        if (!allowed.includes(ps)) {
          const ownerTopics = [...patternsByTopic.entries()]
            .filter(([, v]) => v.includes(ps))
            .map(([k]) => `"${k}"`)
            .join(', ') || '(none)';
          violations.push(`${rel}: pattern_slug "${ps}" exists but is NOT a child of topic "${ts}" — actual owner topic(s): ${ownerTopics}`);
        }
      }
      for (const p of (data.problems || [])) {
        const pid = p.slug || '<unknown>';
        const need = ['slug', 'title', 'difficulty', 'description', 'time_complexity', 'space_complexity'];
        const missing = need.filter((k) => p[k] === undefined || p[k] === null || p[k] === '');
        if (missing.length) {
          violations.push(`${rel}: problem "${pid}" missing required fields: ${missing.join(', ')}`);
        }
        if (p.slug) {
          if (seenSlugs.has(p.slug)) {
            violations.push(`${rel}: duplicate problem slug "${p.slug}" (already declared in another file)`);
          }
          seenSlugs.add(p.slug);
        }
        if (p.difficulty && !['Easy', 'Medium', 'Hard'].includes(p.difficulty)) {
          violations.push(`${rel}: problem "${pid}" has invalid difficulty "${p.difficulty}" (must be Easy|Medium|Hard)`);
        }
        const tests = Array.isArray(p.test_cases) ? p.test_cases : [];
        if (tests.length < MIN_TEST_CASES) {
          violations.push(`${rel}: problem "${pid}" has only ${tests.length} test cases (minimum ${MIN_TEST_CASES})`);
        }
        for (let i = 0; i < tests.length; i++) {
          const tc = tests[i];
          if (tc.input_payload === undefined || tc.expected_output === undefined) {
            violations.push(`${rel}: problem "${pid}" test_case[${i}] missing input_payload or expected_output`);
          }
        }
      }
    }
  }

  // ---- v2 schema-strict validation -------------------------------------
  // Cross-checks every bundle file declaring `"schema_version": "2.0"`
  // against the strict v2 contract. Legacy v1 files are no-ops here and
  // continue to be governed by the FK / required-field checks above.
  const schemaReport = await validateAllProblemFiles({ problemsDir: PROBLEMS_DIR });
  for (const err of schemaReport.errors) {
    violations.push(`schema-v2: ${err}`);
  }

  return { violations, topicSlugs, patternSlugs, patternsByTopic, schemaReport };
}

// -------------------------------------------------------------------------
// v2 → v1 DB-column adapter.
//
// The DB schema currently has flat `approach_brute` and `approach_optimal`
// string columns. v2 problems express approaches as a structured array with
// per-approach intuition + reference code. To stay forward-compatible without
// changing the DB schema in this phase, we project the structured data into
// the legacy columns: brute = first approach, optimal = last approach. Each
// projected string concatenates the approach summary and intuition so the
// existing UI surfaces stay populated until Phase 3 introduces JSONB columns
// for the structured form.
// -------------------------------------------------------------------------
function compileApproachStrings(p) {
  if (Array.isArray(p.approaches) && p.approaches.length >= 2) {
    const first = p.approaches[0] || {};
    const last  = p.approaches[p.approaches.length - 1] || {};
    const fmt = (a) => {
      const summary   = String(a.summary   || '').trim();
      const intuition = String(a.intuition || '').trim();
      return [summary, intuition].filter(Boolean).join('\n\n');
    };
    return { brute: fmt(first), optimal: fmt(last) };
  }
  return { brute: p.approach_brute || '', optimal: p.approach_optimal || '' };
}

// -------------------------------------------------------------------------
// 1. topics
// -------------------------------------------------------------------------
async function seedTopics(client) {
  if (!(await exists(TOPICS_FILE))) {
    throw new Error(`topics.json not found at ${TOPICS_FILE}`);
  }
  const data = await readJson(TOPICS_FILE);
  const topics = data.topics || [];

  const seen = new Set();
  const slugToId = new Map();

  for (const t of topics) {
    requireFields(t, ['slug', 'name', 'description'], `topic:${t.slug || '<unknown>'}`);
    if (seen.has(t.slug)) {
      throw new Error(`Duplicate topic slug in topics.json: ${t.slug}`);
    }
    seen.add(t.slug);

    const r = await client.query(
      `INSERT INTO topics (name, slug, description, order_index)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET
         name        = EXCLUDED.name,
         description = EXCLUDED.description,
         order_index = EXCLUDED.order_index,
         updated_at  = NOW()
       RETURNING id, (xmax = 0) AS inserted`,
      [t.name, t.slug, t.description, t.order_index ?? 0]
    );
    const { id, inserted } = r.rows[0];
    slugToId.set(t.slug, id);
    if (inserted) stats.topics.inserted++; else stats.topics.updated++;
  }

  return slugToId;
}

// -------------------------------------------------------------------------
// 2. patterns
// -------------------------------------------------------------------------
async function seedPatterns(client, topicSlugToId) {
  if (!(await exists(PATTERNS_DIR))) {
    warn(`patterns/ directory missing at ${PATTERNS_DIR}`);
    return new Map();
  }

  const files = (await fs.readdir(PATTERNS_DIR))
    .filter((f) => f.endsWith('.json'))
    .sort();

  const seen = new Set();
  const slugToId = new Map();

  for (const file of files) {
    const filePath = path.join(PATTERNS_DIR, file);
    let data;
    try {
      data = await readJson(filePath);
    } catch (e) {
      warn(`patterns/${file}: ${e.message}`);
      continue;
    }

    const topicSlug = data.topic_slug;
    const topicId = topicSlugToId.get(topicSlug);
    if (!topicId) {
      // Defense-in-depth: pre-flight should have caught this. Hard fail.
      throw new Error(`patterns/${file}: topic_slug "${topicSlug}" not in topics`);
    }

    for (const p of data.patterns || []) {
      requireFields(p, ['slug', 'name'], `pattern:${p.slug || '<unknown>'} (${file})`);
      if (seen.has(p.slug)) {
        throw new Error(`Duplicate pattern slug across files: ${p.slug}`);
      }
      seen.add(p.slug);

      // The patterns JSON uses `explanation` as the canonical description.
      const description = p.explanation || p.description || p.name;
      const explanation = p.explanation || '';
      const whenToUse   = p.when_to_use || '';
      const intuition   = p.intuition   || '';

      const r = await client.query(
        `INSERT INTO patterns
           (topic_id, name, slug, description, explanation, when_to_use, intuition, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET
           topic_id     = EXCLUDED.topic_id,
           name         = EXCLUDED.name,
           description  = EXCLUDED.description,
           explanation  = EXCLUDED.explanation,
           when_to_use  = EXCLUDED.when_to_use,
           intuition    = EXCLUDED.intuition,
           order_index  = EXCLUDED.order_index,
           updated_at   = NOW()
         RETURNING id, (xmax = 0) AS inserted`,
        [topicId, p.name, p.slug, description, explanation, whenToUse, intuition, p.order_index ?? 0]
      );
      const { id, inserted } = r.rows[0];
      slugToId.set(p.slug, id);
      if (inserted) stats.patterns.inserted++; else stats.patterns.updated++;
    }
  }

  return slugToId;
}

// -------------------------------------------------------------------------
// 3 + 4. problems (with their nested test_cases)
// -------------------------------------------------------------------------
async function seedProblemFile(client, filePath, patternSlugToId, seenProblems) {
  let data;
  try {
    data = await readJson(filePath);
  } catch (e) {
    warn(`${path.relative(DATA_ROOT, filePath)}: ${e.message}`);
    return;
  }

  const patternSlug = data.pattern_slug;
  const patternId = patternSlugToId.get(patternSlug);
  if (!patternId) {
    // Defense-in-depth: pre-flight should have caught this. Hard fail.
    throw new Error(`${path.relative(DATA_ROOT, filePath)}: pattern_slug "${patternSlug}" not in patterns`);
  }

  for (const p of data.problems || []) {
    // Defense-in-depth: pre-flight should have caught all of these.
    requireFields(
      p,
      ['slug', 'title', 'difficulty', 'description', 'time_complexity', 'space_complexity'],
      `problem:${p.slug || '<unknown>'} (${path.basename(filePath)})`
    );

    if (seenProblems.has(p.slug)) {
      throw new Error(`Duplicate problem slug across files: ${p.slug}`);
    }
    seenProblems.add(p.slug);

    if (!['Easy', 'Medium', 'Hard'].includes(p.difficulty)) {
      throw new Error(`problem ${p.slug}: invalid difficulty "${p.difficulty}"`);
    }

    const tests = Array.isArray(p.test_cases) ? p.test_cases : [];
    if (tests.length < MIN_TEST_CASES) {
      throw new Error(`problem ${p.slug}: only ${tests.length} test cases (< ${MIN_TEST_CASES})`);
    }

    const approachStrings = compileApproachStrings(p);
    // Optional per-problem C++ harness signature. When present, the problem
    // accepts C++ submissions through the Phase 2 execution-service façade.
    // When absent, C++ submissions return a clean "not supported" error.
    const cppSignature = (p.cpp_signature && typeof p.cpp_signature === 'object')
      ? JSON.stringify(p.cpp_signature)
      : null;
    const r = await client.query(
      `INSERT INTO problems
         (pattern_id, title, slug, difficulty, description, examples, constraints,
          edge_cases, starter_code, approach_brute, approach_optimal, tags,
          time_complexity, space_complexity, cpp_signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (slug) DO UPDATE SET
         pattern_id       = EXCLUDED.pattern_id,
         title            = EXCLUDED.title,
         difficulty       = EXCLUDED.difficulty,
         description      = EXCLUDED.description,
         examples         = EXCLUDED.examples,
         constraints      = EXCLUDED.constraints,
         edge_cases       = EXCLUDED.edge_cases,
         starter_code     = EXCLUDED.starter_code,
         approach_brute   = EXCLUDED.approach_brute,
         approach_optimal = EXCLUDED.approach_optimal,
         tags             = EXCLUDED.tags,
         time_complexity  = EXCLUDED.time_complexity,
         space_complexity = EXCLUDED.space_complexity,
         cpp_signature    = EXCLUDED.cpp_signature,
         updated_at       = NOW()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        patternId,
        p.title,
        p.slug,
        p.difficulty,
        p.description,
        JSON.stringify(p.examples       || []),
        JSON.stringify(p.constraints    || []),
        JSON.stringify(p.edge_cases     || []),
        JSON.stringify(p.starter_code   || {}),
        approachStrings.brute,
        approachStrings.optimal,
        Array.isArray(p.tags) ? p.tags : [],
        p.time_complexity,
        p.space_complexity,
        cppSignature,
      ]
    );
    const { id: problemId, inserted } = r.rows[0];
    if (inserted) stats.problems.inserted++; else stats.problems.updated++;

    // test_cases: replace strategy (no unique key on test_cases, so we wipe + reinsert)
    const del = await client.query(`DELETE FROM test_cases WHERE problem_id = $1`, [problemId]);
    if (del.rowCount > 0) stats.testCases.replaced += del.rowCount;

    for (let i = 0; i < tests.length; i++) {
      const tc = tests[i];
      if (tc.input_payload === undefined || tc.expected_output === undefined) {
        // Defense-in-depth: pre-flight should have caught this. Hard fail.
        throw new Error(`problem ${p.slug}: test_case[${i}] missing input_payload or expected_output`);
      }
      await client.query(
        `INSERT INTO test_cases
           (problem_id, input_payload, expected_output, is_hidden, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          problemId,
          JSON.stringify(tc.input_payload),
          JSON.stringify(tc.expected_output),
          tc.is_hidden ?? true,
          tc.order_index ?? i + 1,
        ]
      );
      stats.testCases.inserted++;
    }
  }
}

async function seedProblems(client, patternSlugToId) {
  const seenProblems = new Set();
  for await (const filePath of walkJsonFiles(PROBLEMS_DIR)) {
    await seedProblemFile(client, filePath, patternSlugToId, seenProblems);
  }
}

// -------------------------------------------------------------------------
// main
// -------------------------------------------------------------------------
function fmtCounts(k) {
  const s = stats[k];
  const parts = [`${s.inserted} inserted`, `${s.updated} updated`];
  if (s.skipped) parts.push(`${s.skipped} skipped`);
  return parts.join(', ');
}

async function main() {
  console.log(c.bold(c.cyan('\n=== LEARNING DATA SEEDER ===')));
  console.log(c.dim(`DB    : ${redactConnectionString(connectionString)}`));
  console.log(c.dim(`Data  : ${DATA_ROOT}\n`));

  // -----------------------------------------------------------------
  // [0/3] STRICT INTEGRITY CHECK — runs WITHOUT a DB connection.
  //
  // If any violation is found, the seeder exits non-zero with the FULL
  // report. No transaction is opened, no rows are touched. "Silent skip"
  // is impossible by construction.
  // -----------------------------------------------------------------
  process.stdout.write(c.dim('  [0/3] integrity ... '));
  const { violations, topicSlugs, patternSlugs } = await validateDataIntegrity();
  if (violations.length > 0) {
    console.log(c.red('FAIL'));
    console.error(c.red(`\n✗ Integrity check failed with ${violations.length} violation(s):`));
    for (const v of violations) console.error(c.red('  · ' + v));
    console.error(c.red(`\nNo database writes were performed. Fix the violations above and re-run.\n`));
    process.exit(1);
  }
  console.log(
    c.green('done')
    + c.dim(`  (0 violations · ${topicSlugs.size} topics, ${patternSlugs.size} patterns scanned)`)
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    process.stdout.write(c.dim('  [1/3] topics    ... '));
    const topicSlugToId = await seedTopics(client);
    console.log(c.green('done') + c.dim(`  (${topicSlugToId.size} topics in scope)`));

    process.stdout.write(c.dim('  [2/3] patterns  ... '));
    const patternSlugToId = await seedPatterns(client, topicSlugToId);
    console.log(c.green('done') + c.dim(`  (${patternSlugToId.size} patterns in scope)`));

    process.stdout.write(c.dim('  [3/3] problems  ... '));
    await seedProblems(client, patternSlugToId);
    console.log(c.green('done'));

    await client.query('COMMIT');

    console.log(c.bold(c.green('\n✓ Seed completed successfully\n')));
    console.log(`  Topics inserted     : ${c.cyan(fmtCounts('topics'))}`);
    console.log(`  Patterns inserted   : ${c.cyan(fmtCounts('patterns'))}`);
    console.log(`  Problems inserted   : ${c.cyan(fmtCounts('problems'))}`);
    console.log(
      `  Test cases inserted : ${c.cyan(
        `${stats.testCases.inserted} inserted` +
          (stats.testCases.replaced ? `, ${stats.testCases.replaced} replaced` : '')
      )}`
    );

    if (stats.warnings.length) {
      console.log(c.yellow(`\n⚠ ${stats.warnings.length} warning(s):`));
      for (const w of stats.warnings) console.log(c.yellow('  · ' + w));
    } else {
      console.log(c.dim('\n  no warnings'));
    }
    console.log('');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(c.red('\n✗ Seed FAILED — transaction rolled back'));
    console.error(c.red('  ' + e.message));
    if (process.env.DEBUG) console.error(e.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
