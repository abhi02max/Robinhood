#!/usr/bin/env node
/**
 * Backfill `starter_code.java` into the curriculum seed files.
 *
 * The 8 pattern files produced by the authoring pipeline get their Java starter from
 * the builder. The 5 legacy v1 files predate it and are hand-maintained, so their 60
 * problems need this.
 *
 * CAPABILITY IS DERIVED, NOT ASSUMED
 * ----------------------------------
 * A problem gets a Java starter only when `languageSupportsSignature('java', ...)`
 * says Java can express every argument and return type in its signature. Marking all
 * 96 problems as Java-capable because Java happens to have a harness would hand a
 * user a method to fill in on a problem whose submission is then rejected.
 *
 * THE SEED FILES ARE THE SOURCE OF TRUTH, NOT THE DATABASE.
 * Writing straight to Postgres would be undone by the next `npm run seed:learning`.
 *
 *   node server/scripts/backfill-java-starters.js              # dry run (default)
 *   node server/scripts/backfill-java-starters.js --write
 *   node server/scripts/backfill-java-starters.js --print <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyInsertions, assertOnlyKeysAdded, findObjectBlock, findSlug, insertObjectMember,
} from './lib/seed-json-edit.js';
import { renderJavaStarter } from '../languages/java.js';
import { languageSupportsSignature } from '../languages/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const WRITE = process.argv.includes('--write');
const PRINT_AT = process.argv.indexOf('--print');
const PRINT_SLUG = PRINT_AT === -1 ? null : process.argv[PRINT_AT + 1];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

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

const stats = { total: 0, generated: 0, kept: 0, incapable: 0, failed: 0, filesChanged: 0 };
const rows = [];
const skipped = [];
const failures = [];

for (const file of seedFiles()) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
  const insertions = [];

  for (const problem of list) {
    stats.total += 1;

    if (PRINT_SLUG) {
      if (problem.slug !== PRINT_SLUG) continue;
      const out = renderJavaStarter(problem.cpp_signature || {});
      if (out.error) { console.error(c.red(`${problem.slug}: ${out.error}`)); process.exit(1); }
      console.log(out.code);
      process.exit(0);
    }

    const verdict = languageSupportsSignature('java', problem.cpp_signature);
    if (!verdict.supported) {
      stats.incapable += 1;
      skipped.push({ slug: problem.slug, reason: verdict.reason });
      continue;
    }
    if (problem.starter_code?.java) { stats.kept += 1; continue; }

    const out = renderJavaStarter(problem.cpp_signature);
    if (out.error) {
      stats.failed += 1;
      failures.push({ slug: problem.slug, reason: out.error });
      continue;
    }

    if (WRITE) {
      const found = findSlug(raw, problem.slug);
      if (found.error) { stats.failed += 1; failures.push({ slug: problem.slug, reason: found.error }); continue; }
      const block = findObjectBlock(raw, found.at, 'starter_code');
      if (block.error) { stats.failed += 1; failures.push({ slug: problem.slug, reason: block.error }); continue; }
      const plan = insertObjectMember(raw, block, `"java": ${JSON.stringify(out.code)}`);
      if (plan.error) { stats.failed += 1; failures.push({ slug: problem.slug, reason: plan.error }); continue; }
      insertions.push(plan);
    }

    stats.generated += 1;
    rows.push({ slug: problem.slug, summary: out.summary });
  }

  if (WRITE && insertions.length) {
    const next = applyInsertions(raw, insertions);
    if (!assertOnlyKeysAdded(raw, next, ['starter_code.java'])) {
      throw new Error(`refusing to write ${file}: the edit changed data other than starter_code.java`);
    }
    fs.writeFileSync(file, next, 'utf8');
    stats.filesChanged += 1;
  }
}

if (PRINT_SLUG) { console.error(c.red(`no problem with slug "${PRINT_SLUG}"`)); process.exit(1); }

console.log(c.bold(`\n=== starter_code.java backfill ${WRITE ? '(WRITING)' : '(dry run)'} ===\n`));
for (const { slug, summary } of rows) {
  console.log(`  ${c.green('+')} ${slug.padEnd(52)} ${summary}`);
}
if (skipped.length) {
  console.log(c.bold(c.yellow(`\n${skipped.length} problem(s) Java cannot express:\n`)));
  for (const s of skipped) console.log(`  ${c.yellow('-')} ${s.slug}\n      ${c.dim(s.reason)}`);
}
if (failures.length) {
  console.log(c.bold(c.red(`\n${failures.length} failure(s):\n`)));
  for (const f of failures) console.log(`  ${c.red('!')} ${f.slug}\n      ${c.dim(f.reason)}`);
}
console.log(
  `\n${stats.total} problems: ${c.green(`${stats.generated} generated`)}, ${stats.kept} already had one, `
  + `${stats.incapable} not Java-capable, ${failures.length ? c.red(`${stats.failed} failed`) : '0 failed'}`,
);
console.log(WRITE
  ? `${stats.filesChanged} seed file(s) rewritten. Run ${c.bold('npm run seed:learning')} to apply.\n`
  : c.dim('Nothing written. Re-run with --write to edit the seed files.\n'));

process.exit(failures.length ? 1 : 0);
