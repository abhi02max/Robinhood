#!/usr/bin/env node
/**
 * Compile check for the generated `starter_code.cpp` values.
 *
 * WHY
 * ---
 * server/scripts/backfill-cpp-starters.js hands every problem a C++ declaration
 * derived from its `cpp_signature`. If that declaration does not match what the
 * harness generates around it, the user's very first submission — before they have
 * written a line — fails to compile, and the error names harness internals rather
 * than anything they did. A starter that does not compile is worse than no starter.
 *
 * WHAT IT ASSERTS
 * ---------------
 * For every problem: submit the untouched starter and require that the verdict is
 * **not** a compile error and not a harness error. That is the whole claim. The
 * starter body is `return {};`, so a Wrong Answer is the expected outcome and
 * counts as success here — grading correctness is check-cpp-problems.js's job.
 *
 * A problem whose expected output happens to be 0, false or an empty array can pass
 * its one case with `return {};`. That is reported (`passed`) rather than treated as
 * an error, because it says nothing about whether the starter compiles.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * The seed files, not the database — they are the source of truth, and this way the
 * check runs before a seed and needs no DATABASE_URL. Only network access to the
 * execution provider is required.
 *
 * COST
 * ----
 * One test case per problem, roughly 2 provider requests each, and C++ compiles from
 * scratch every time. 63 problems at 4 in parallel takes a couple of minutes.
 *
 *   node server/scripts/check-cpp-starters.js
 *   node server/scripts/check-cpp-starters.js --slug 3sum --slug valid-parentheses
 *   node server/scripts/check-cpp-starters.js --shapes         # one per distinct type shape
 *   node server/scripts/check-cpp-starters.js --concurrency 2
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true, quiet: true });

// Force real execution: under EXECUTION_PROVIDER=mock every starter would be
// reported as compiling, which is precisely the claim this script is here to test.
if (String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}

const { runExecution } = await import('../learning-engine/execution-engine.js');

const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const argv = process.argv.slice(2);
const flagValues = (name) => argv.reduce((acc, a, i) => (a === name && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const ONLY = new Set(flagValues('--slug'));
const SHAPES_ONLY = argv.includes('--shapes');
const CONCURRENCY = Math.max(1, Number(flagValues('--concurrency')[0]) || 4);

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Collect candidates from the seed files
// ---------------------------------------------------------------------------

function seedFiles() {
  const out = [];
  for (const topic of fs.readdirSync(PROBLEMS_DIR)) {
    const dir = path.join(PROBLEMS_DIR, topic);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.json')) out.push(path.join(dir, file));
    }
  }
  return out.sort();
}

/** The type shape a starter exercises — what actually varies between them. */
function shapeOf(sig) {
  return `${sig.ret} <- ${(sig.args || []).map((a) => a.type).join(',')}`;
}

const candidates = [];
const missing = [];

for (const file of seedFiles()) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
  for (const p of list) {
    if (ONLY.size && !ONLY.has(p.slug)) continue;
    const starter = p.starter_code?.cpp;
    if (!starter || !p.cpp_signature) {
      missing.push({ slug: p.slug, why: !p.cpp_signature ? 'no cpp_signature' : 'no starter_code.cpp' });
      continue;
    }
    // One case is enough: compiling is per-submission, not per-case.
    const cases = Array.isArray(p.test_cases) ? p.test_cases : [];
    const tcase = cases.find((t) => t.is_hidden === false) || cases[0];
    if (!tcase) {
      missing.push({ slug: p.slug, why: 'no test cases' });
      continue;
    }
    candidates.push({
      slug: p.slug,
      starter,
      sig: p.cpp_signature,
      shape: shapeOf(p.cpp_signature),
      testCase: { ...tcase, id: `${p.slug}-1`, order_index: tcase.order_index ?? 1 },
    });
  }
}

let targets = candidates;
if (SHAPES_ONLY) {
  const seen = new Set();
  targets = candidates.filter((t) => (seen.has(t.shape) ? false : seen.add(t.shape)));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const BAD_KINDS = new Set(['compile_error', 'harness_error']);

async function check(target) {
  const t0 = Date.now();
  let out;
  try {
    out = await runExecution({
      code: target.starter,
      language: 'cpp',
      testCases: [target.testCase],
      cpp_signature: target.sig,
    });
  } catch (e) {
    return { ...target, ok: false, kind: 'threw', detail: e.message, secs: (Date.now() - t0) / 1000 };
  }
  const r = out.results?.[0] || {};
  const kind = r.passed ? 'passed' : (r.error_kind || 'unknown');
  return {
    ...target,
    ok: !BAD_KINDS.has(kind) && kind !== 'threw' && kind !== 'unknown',
    kind,
    detail: String(r.stderr || r.message || '').trim(),
    secs: (Date.now() - t0) / 1000,
  };
}

/** Fixed-size worker pool: a free undocumented provider should not be flooded. */
async function runPool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

console.log(c.bold('\n=== generated C++ starter compile check ==='));
console.log(c.dim(`provider=${process.env.EXECUTION_PROVIDER || 'piston (engine default)'}  ` +
  `targets=${targets.length}${SHAPES_ONLY ? ' (one per type shape)' : ''}  concurrency=${CONCURRENCY}\n`));

const t0 = Date.now();
const results = await runPool(targets, CONCURRENCY, check);

for (const r of results) {
  const label = r.ok ? c.green('OK  ') : c.red('FAIL');
  const kindText = r.kind === 'wrong_answer'
    ? c.dim('compiles, wrong answer (expected)')
    : r.kind === 'passed'
      ? c.yellow('compiles, and return {} happens to match this case')
      : r.kind === 'time_limit_exceeded'
        ? c.yellow('compiles, timed out')
        : c.red(r.kind);
  console.log(`${label} ${r.slug.padEnd(52)} ${kindText}`);
  if (!r.ok && r.detail) console.log(`     ${c.dim(r.detail.slice(0, 400))}`);
}

const failed = results.filter((r) => !r.ok);
const shapes = new Set(results.map((r) => r.shape));

if (missing.length) {
  console.log(c.bold(c.yellow(`\n${missing.length} problem(s) not checked:`)));
  for (const m of missing) console.log(`  ${c.yellow('-')} ${m.slug}: ${c.dim(m.why)}`);
}

console.log(
  `\n${results.length} starter(s) across ${shapes.size} distinct type shape(s) in ` +
  `${((Date.now() - t0) / 1000).toFixed(0)}s: ` +
  `${failed.length === 0 ? c.green('all compile') : c.red(`${failed.length} did not compile`)}`,
);
console.log('');

process.exit(failed.length === 0 && missing.length === 0 ? 0 : 1);
