#!/usr/bin/env node
/**
 * Backfill `starter_code.cpp` into the curriculum seed files.
 *
 * WHY THIS EXISTS
 * ---------------
 * The C++ harness knows the function name, the argument order and every type from
 * the problem's `cpp_signature` — but the *user* is told none of it. No problem
 * shipped a `cpp` entry in `starter_code`, so a C++ user opened an empty editor and
 * had to guess the entrypoint name and its types from the prose. Guessing wrong is
 * not a wrong answer, it is a compile error against a function nobody asked them to
 * write. The signature already contains everything needed to hand them the
 * declaration, so this generates it.
 *
 * THE SEED FILES ARE THE SOURCE OF TRUTH, NOT THE DATABASE.
 * Writing straight to Postgres would be undone by the next `npm run seed:learning`.
 * This edits server/data/learning/problems/<topic>/<pattern>.json in place; run the
 * seeder afterwards to push the result to the database.
 *
 * WHAT IT GENERATES
 * -----------------
 *   class Solution { public: <ret> <fn>(<args>) { ... } };
 *
 * in LeetCode's shape, because that is what a C++ interview candidate has already
 * seen. Three details are deliberate:
 *
 *   - Vectors are taken by non-const reference and primitives by value, which is
 *     what LeetCode emits. The harness passes named locals, so either binds; the
 *     point is that the declaration looks like the one the user expects rather than
 *     like a harness artefact.
 *   - The body is `return {};`, not empty. An empty body with a non-void return type
 *     is undefined behaviour: the first submission would fail with a garbage value or
 *     a crash that has nothing to do with the user's reasoning. `return {};` makes an
 *     untouched starter a deterministic Wrong Answer.
 *   - `class Solution` is emitted even though the harness accepts a free function
 *     too (it reads the call shape off the submitted code). Showing one concrete
 *     shape is more useful than describing two.
 *
 * Types come from CPP_TYPE_MAP in server/learning-engine/execution-engine.js —
 * imported, not copied, so a starter can never name a type the harness would then
 * refuse to compile.
 *
 * FAILURE IS LOUD BY DESIGN
 * -------------------------
 * A problem whose signature the harness would reject is reported and left alone. No
 * starter at all is a blank editor, which the user can work around; a starter naming
 * an unsupported type is a compile error they cannot.
 *
 * USAGE
 *   node server/scripts/backfill-cpp-starters.js              # dry run (default)
 *   node server/scripts/backfill-cpp-starters.js --write      # edit the files
 *   node server/scripts/backfill-cpp-starters.js --write --force
 *                                                   # also replace existing ones
 *   node server/scripts/backfill-cpp-starters.js --print <slug>
 *                                                   # show one rendered starter
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyInsertions, assertOnlyKeysAdded, findObjectBlock, findSlug, insertObjectMember,
} from './lib/seed-json-edit.js';
import { renderCppStarter } from './lib/cpp-infer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const PRINT_AT = process.argv.indexOf('--print');
const PRINT_SLUG = PRINT_AT === -1 ? null : process.argv[PRINT_AT + 1];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Rendering lives in ./lib/cpp-infer.mjs, shared with build-authored-problems.js so
// a regenerated pattern file produces byte-identical starters to a backfilled one.
// ---------------------------------------------------------------------------
const renderStarter = renderCppStarter;

/**
 * Where to splice the starter in, and the exact text to splice.
 *
 * The starter is a member of `starter_code`, so unlike cpp_signature it goes inside
 * that block rather than after it.
 */
function planInsertion(raw, slug, code) {
  const found = findSlug(raw, slug);
  if (found.error) return found;

  const block = findObjectBlock(raw, found.at, 'starter_code');
  if (block.error) return block;

  return insertObjectMember(raw, block, `"cpp": ${JSON.stringify(code)}`);
}

// ---------------------------------------------------------------------------
// Walk the seed files
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

const stats = { total: 0, generated: 0, kept: 0, skipped: 0, failed: 0, filesChanged: 0 };
const failures = [];
const generatedRows = [];

for (const file of seedFiles()) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
  const insertions = [];

  for (const problem of list) {
    stats.total += 1;

    if (PRINT_SLUG) {
      if (problem.slug !== PRINT_SLUG) continue;
      const out = renderStarter(problem.cpp_signature || {});
      if (out.error) {
        console.error(c.red(`${problem.slug}: ${out.error}`));
        process.exit(1);
      }
      console.log(out.code);
      process.exit(0);
    }

    if (!problem.cpp_signature) {
      // Nothing to generate from, and the validator now rejects a cpp starter
      // without a signature anyway.
      stats.skipped += 1;
      continue;
    }
    if (problem.starter_code?.cpp && !FORCE) { stats.kept += 1; continue; }

    const out = renderStarter(problem.cpp_signature);
    if (out.error) {
      stats.failed += 1;
      failures.push({ slug: problem.slug, reason: out.error });
      continue;
    }

    if (WRITE) {
      if (problem.starter_code?.cpp) {
        // --force would need to replace the existing member, not add a second
        // one, which is a different (and riskier) edit than this script makes.
        stats.failed += 1;
        failures.push({
          slug: problem.slug,
          reason: '--force cannot replace an existing starter_code.cpp; remove it by hand first',
        });
        continue;
      }
      const plan = planInsertion(raw, problem.slug, out.code);
      if (plan.error) {
        stats.failed += 1;
        failures.push({ slug: problem.slug, reason: plan.error });
        continue;
      }
      insertions.push(plan);
    }

    stats.generated += 1;
    generatedRows.push({ slug: problem.slug, summary: out.summary });
  }

  if (WRITE && insertions.length) {
    const next = applyInsertions(raw, insertions);
    // The edit is only trustworthy if the result still parses and differs from the
    // original in nothing but the added key.
    if (!assertOnlyKeysAdded(raw, next, ['starter_code.cpp'])) {
      throw new Error(`refusing to write ${file}: the edit changed data other than starter_code.cpp`);
    }
    fs.writeFileSync(file, next, 'utf8');
    stats.filesChanged += 1;
  }
}

if (PRINT_SLUG) {
  console.error(c.red(`no problem with slug "${PRINT_SLUG}"`));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(c.bold(`\n=== starter_code.cpp backfill ${WRITE ? '(WRITING)' : '(dry run)'} ===\n`));

for (const { slug, summary } of generatedRows) {
  console.log(`  ${c.green('+')} ${slug.padEnd(52)} ${summary}`);
}

if (failures.length) {
  console.log(c.bold(c.yellow(`\n${failures.length} problem(s) left without a C++ starter:\n`)));
  for (const f of failures) console.log(`  ${c.red('!')} ${f.slug}\n      ${c.dim(f.reason)}`);
}

console.log(
  `\n${stats.total} problems: ${c.green(`${stats.generated} generated`)}, ` +
  `${stats.kept} already had one, ${stats.skipped} have no cpp_signature, ` +
  `${failures.length ? c.red(`${stats.failed} failed`) : '0 failed'}`,
);

if (WRITE) {
  console.log(`${stats.filesChanged} seed file(s) rewritten. Run ${c.bold('npm run seed:learning')} to apply.\n`);
} else {
  console.log(c.dim('Nothing written. Re-run with --write to edit the seed files.\n'));
}

process.exit(failures.length ? 1 : 0);
