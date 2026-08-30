#!/usr/bin/env node
/**
 * Backfill `cpp_signature` into the curriculum seed files.
 *
 * WHY THIS EXISTS
 * ---------------
 * The C++ harness in server/learning-engine/execution-engine.js is generated from
 * a per-problem `cpp_signature` — it has no other way to know the argument types,
 * the return type, or what to call. Exactly one of the 63 seeded problems shipped
 * with one, so C++ submissions failed on the other 62 with "no cpp_signature
 * configured". This infers the missing ones from data that already exists.
 *
 * THE SEED FILES ARE THE SOURCE OF TRUTH, NOT THE DATABASE.
 * Writing straight to Postgres would be undone by the next `npm run seed:learning`.
 * This edits server/data/learning/problems/<topic>/<pattern>.json in place; run the
 * seeder afterwards to push the result to the database.
 *
 * WHAT IT INFERS AND FROM WHERE
 * -----------------------------
 *   fn    the function name in `starter_code.javascript` — the camelCase LeetCode
 *         name. (`starter_code.python` uses snake_case, which C++ should not copy.)
 *   args  the JavaScript parameter list, in that order, so positional C++ arguments
 *         line up with what the problem statement describes. Types come from the
 *         actual values in every test case's `input_payload`.
 *   ret   from every `expected_output` in the test cases.
 *   class always "Solution". The harness reads the call shape off the submitted
 *         code, so this does not force the user into either style.
 *
 * Inference is over ALL test cases, never just the first. A problem whose output is
 * 5 in one case and 12.75 in another is `double`; deciding from case one alone would
 * emit `int` and silently truncate every fractional answer.
 *
 * FAILURE IS LOUD BY DESIGN
 * -------------------------
 * A guessed-wrong type produces a compile error the user cannot act on, so anything
 * this cannot pin down — a type outside CPP_TYPE_MAP, an argument absent from the
 * test data, a key that is always an empty array — is reported and left alone. A
 * problem with no signature says so clearly; a problem with a wrong one lies.
 *
 * USAGE
 *   node server/scripts/backfill-cpp-signatures.js              # dry run (default)
 *   node server/scripts/backfill-cpp-signatures.js --write      # edit the files
 *   node server/scripts/backfill-cpp-signatures.js --write --force
 *                                                   # also replace existing ones
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyInsertions, assertOnlyKeysAdded, findObjectBlock, findSlug,
} from './lib/seed-json-edit.js';
import { inferSignature } from './lib/cpp-infer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Writing: surgical text insertion, not re-serialization
//
// `JSON.stringify(doc, null, 2)` would put every element of every test-case array
// on its own line and turn a 32 KB file into 52 KB of unreviewable diff. The
// helpers in ./lib/seed-json-edit.js insert the new key as text directly after the
// problem's `starter_code` block and leave every other byte alone, so the diff is
// exactly the lines added.
// ---------------------------------------------------------------------------

/** Render the signature in the style of the hand-written kadane one. */
function renderSignature(sig, indent) {
  const inner = `${indent}  `;
  const argLine = (a) => `{ "name": ${JSON.stringify(a.name)}, "type": ${JSON.stringify(a.type)} }`;
  const args = sig.args.length === 1
    ? `[${argLine(sig.args[0])}]`
    : `[\n${sig.args.map((a) => `${inner}  ${argLine(a)}`).join(',\n')}\n${inner}]`;
  return [
    `${indent}"cpp_signature": {`,
    `${inner}"fn": ${JSON.stringify(sig.fn)},`,
    `${inner}"class": ${JSON.stringify(sig.class)},`,
    `${inner}"args": ${args},`,
    `${inner}"ret": ${JSON.stringify(sig.ret)}`,
    `${indent}}`,
  ].join('\n');
}

/**
 * Where to splice the signature in, and the exact text to splice.
 * Returns null with a reason if the file cannot be edited safely by hand.
 */
function planInsertion(raw, slug, sig) {
  const found = findSlug(raw, slug);
  if (found.error) return found;

  const block = findObjectBlock(raw, found.at, 'starter_code');
  if (block.error) return block;

  return { at: block.close + 1, text: `,\n${renderSignature(sig, block.indent)}` };
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

const stats = { total: 0, inferred: 0, kept: 0, failed: 0, filesChanged: 0 };
const failures = [];
const inferredRows = [];

for (const file of seedFiles()) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
  const insertions = [];

  for (const problem of list) {
    stats.total += 1;
    if (problem.cpp_signature && !FORCE) { stats.kept += 1; continue; }

    const result = inferSignature(problem);
    if (result.error) {
      stats.failed += 1;
      failures.push({ slug: problem.slug, reason: result.error });
      continue;
    }

    if (WRITE) {
      const plan = planInsertion(raw, problem.slug, result.signature);
      if (plan.error) {
        stats.failed += 1;
        failures.push({ slug: problem.slug, reason: plan.error });
        continue;
      }
      insertions.push(plan);
    }

    stats.inferred += 1;
    inferredRows.push({ slug: problem.slug, sig: result.signature });
  }

  if (WRITE && insertions.length) {
    const next = applyInsertions(raw, insertions);
    // The edit is only trustworthy if the result still parses and differs from the
    // original in nothing but the added key.
    if (!assertOnlyKeysAdded(raw, next, ['cpp_signature'])) {
      throw new Error(`refusing to write ${file}: the edit changed data other than cpp_signature`);
    }
    fs.writeFileSync(file, next, 'utf8');
    stats.filesChanged += 1;
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(c.bold(`\n=== cpp_signature backfill ${WRITE ? '(WRITING)' : '(dry run)'} ===\n`));

for (const { slug, sig } of inferredRows) {
  const argList = sig.args.map((a) => `${a.type} ${a.name}`).join(', ');
  console.log(`  ${c.green('+')} ${slug.padEnd(52)} ${sig.ret} ${sig.fn}(${argList})`);
}

if (failures.length) {
  console.log(c.bold(c.yellow(`\n${failures.length} problem(s) left without a signature:\n`)));
  for (const f of failures) console.log(`  ${c.red('!')} ${f.slug}\n      ${c.dim(f.reason)}`);
}

console.log(
  `\n${stats.total} problems: ${c.green(`${stats.inferred} inferred`)}, ` +
  `${stats.kept} already had one, ${failures.length ? c.red(`${stats.failed} failed`) : '0 failed'}`,
);

if (WRITE) {
  console.log(`${stats.filesChanged} seed file(s) rewritten. Run ${c.bold('npm run seed:learning')} to apply.\n`);
} else {
  console.log(c.dim('Nothing written. Re-run with --write to edit the seed files.\n'));
}

process.exit(failures.length ? 1 : 0);
