#!/usr/bin/env node
/**
 * Grade the authored reference solutions through the real execution path.
 *
 * WHY THIS EXISTS ON TOP OF THE BUILD
 * -----------------------------------
 * build-authored-problems.js proves the two reference solutions and the brute force
 * agree, and that they reproduce the hand-stated example answers. All of that runs
 * in-process, so it says nothing about the part between a user pressing Submit and a
 * verdict appearing:
 *
 *   - does the harness find the right entrypoint in this particular source,
 *   - does it bind the payload keys to the parameters correctly,
 *   - does the sandbox's language runtime agree with the local one,
 *   - and does the grader's comparison accept the reference's output shape?
 *
 * A problem can be internally consistent and still be ungradeable. This script
 * submits the reference solution to the provider against the **seeded database**
 * cases and requires every case to pass. A single failure means users would see
 * Wrong Answer on a correct solution.
 *
 * It also submits a deliberately broken control — the untouched starter — and
 * requires it to be rejected. A checker that only ever sees correct code cannot
 * tell a working grader from one that passes everything.
 *
 * COST
 * ----
 * Roughly 2 provider requests per test case per language, and no batch endpoint on
 * Paiza. A full run over every authored problem in both languages is a few thousand
 * requests, so the default is one problem per pattern. Widen it deliberately.
 *
 *   node server/scripts/check-authored-problems.js                  # one per pattern
 *   node server/scripts/check-authored-problems.js --all
 *   node server/scripts/check-authored-problems.js --slug house-robber
 *   node server/scripts/check-authored-problems.js --language python
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pkg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true, quiet: true });

// Force real execution: under mock every submission passes without running, which is
// exactly the failure this script exists to rule out.
if (String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}

const { runExecution } = await import('../learning-engine/execution-engine.js');
const { Pool } = pkg;

const AUTHORING_DIR = path.join(__dirname, '..', 'data', 'learning', 'authoring');

const argv = process.argv.slice(2);
const flagValues = (name) => argv.reduce((acc, a, i) => (a === name && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const ONLY = new Set(flagValues('--slug'));
const ALL = argv.includes('--all');
const LANGUAGES = flagValues('--language').length ? flagValues('--language') : ['javascript', 'python'];
const CONCURRENCY = Math.max(1, Number(flagValues('--concurrency')[0]) || 3);

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Collect the reference solutions from the authoring specs
// ---------------------------------------------------------------------------

const candidates = [];
for (const topic of fs.readdirSync(AUTHORING_DIR)) {
  if (topic === 'lib') continue;
  const dir = path.join(AUTHORING_DIR, topic);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.mjs')) continue;
    const spec = (await import(`file://${path.join(dir, file)}`)).default;
    for (const problem of spec.problems) {
      candidates.push({
        pattern: `${spec.topic}/${spec.pattern}`,
        slug: problem.slug,
        js: problem.optimal.js,
        py: problem.optimal.py,
      });
    }
  }
}

let targets = candidates;
if (ONLY.size) {
  targets = candidates.filter((t) => ONLY.has(t.slug));
} else if (!ALL) {
  // One per pattern: enough to exercise every distinct payload shape without a few
  // thousand requests against a free endpoint.
  const seen = new Set();
  targets = candidates.filter((t) => (seen.has(t.pattern) ? false : seen.add(t.pattern)));
}

if (!targets.length) {
  console.error(c.red('no authored problems matched'));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load the seeded cases — the ones a real submission would be graded against
// ---------------------------------------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

async function loadProblem(slug) {
  const { rows } = await pool.query(
    'SELECT id, title, cpp_signature, starter_code FROM problems WHERE slug = $1',
    [slug],
  );
  if (!rows.length) throw new Error('not seeded — run npm run seed:learning');
  const { rows: cases } = await pool.query(
    `SELECT id, input_payload, expected_output, is_hidden, order_index
       FROM test_cases WHERE problem_id = $1 ORDER BY order_index`,
    [rows[0].id],
  );
  if (!cases.length) throw new Error('no seeded test cases');
  return { ...rows[0], testCases: cases };
}

async function runPool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }));
  return results;
}

async function check(target) {
  let problem;
  try {
    problem = await loadProblem(target.slug);
  } catch (e) {
    return { ...target, rows: [{ language: '-', ok: false, detail: e.message }] };
  }

  const rows = [];
  for (const language of LANGUAGES) {
    const code = language === 'python' ? target.py : target.js;
    const out = await runExecution({
      code,
      language,
      testCases: problem.testCases,
      cpp_signature: problem.cpp_signature || null,
    });
    const ok = out.total > 0 && out.pass_count === out.total;
    const bad = out.results.find((r) => !r.passed);
    rows.push({
      language,
      ok,
      passed: out.pass_count,
      total: out.total,
      detail: ok ? '' : `${bad?.error_kind || 'unknown'} on case ${(bad?.test_index ?? 0) + 1}: ` +
        `expected ${JSON.stringify(bad?.expected)} got ${JSON.stringify(bad?.actual)} ${String(bad?.stderr || '').slice(0, 200)}`,
    });
  }

  // The untouched starter must NOT pass. If it does, the verdict is not real.
  const starter = problem.starter_code?.javascript;
  if (starter) {
    const ctrl = await runExecution({
      code: starter,
      language: 'javascript',
      testCases: problem.testCases,
      cpp_signature: problem.cpp_signature || null,
    });
    rows.push({
      language: 'control (empty starter)',
      ok: ctrl.pass_count < ctrl.total,
      passed: ctrl.pass_count,
      total: ctrl.total,
      detail: ctrl.pass_count < ctrl.total ? '' : 'the empty starter was ACCEPTED — the verdict is not real',
    });
  }

  return { ...target, rows };
}

console.log(c.bold('\n=== authored reference solutions through the real execution path ==='));
console.log(c.dim(`provider=${process.env.EXECUTION_PROVIDER}  problems=${targets.length}  ` +
  `languages=${LANGUAGES.join(', ')}  concurrency=${CONCURRENCY}\n`));

const t0 = Date.now();
const results = await runPool(targets, CONCURRENCY, check);
await pool.end();

let failures = 0;
for (const r of results) {
  const allOk = r.rows.every((row) => row.ok);
  if (!allOk) failures += 1;
  console.log(`${allOk ? c.green('PASS') : c.red('FAIL')} ${r.slug}  ${c.dim(r.pattern)}`);
  for (const row of r.rows) {
    const mark = row.ok ? c.green('  ok  ') : c.red(' FAIL ');
    console.log(`   ${mark}${row.language.padEnd(24)} ${row.passed ?? '-'}/${row.total ?? '-'}  ${row.detail ? c.red(row.detail) : ''}`);
  }
}

console.log(
  `\n${results.length} problem(s) in ${((Date.now() - t0) / 1000).toFixed(0)}s: ` +
  (failures ? c.red(`${failures} failed`) : c.green('every reference solution is graded Accepted, every control rejected')),
);
console.log('');
process.exit(failures ? 1 : 0);
