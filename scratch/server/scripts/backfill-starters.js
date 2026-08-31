#!/usr/bin/env node
/**
 * Backfill generated starter code into the curriculum seed files, for any
 * signature-driven language.
 *
 * Replaces the per-language copies. Three near-identical scripts was how the language
 * definitions fragmented in the first place, and a starter renderer is now resolved
 * from the registry rather than hardcoded per script.
 *
 * CAPABILITY IS DERIVED, NOT ASSUMED
 * ----------------------------------
 * A problem gets a starter only when `languageSupportsSignature` says the language can
 * express every argument and return type in its signature. That is what keeps C off
 * the 10 matrix problems instead of handing a user a function to fill in on a problem
 * whose submission is then refused.
 *
 * THE SEED FILES ARE THE SOURCE OF TRUTH, NOT THE DATABASE.
 * Writing straight to Postgres would be undone by the next `npm run seed:learning`.
 *
 *   node server/scripts/backfill-starters.js --language c
 *   node server/scripts/backfill-starters.js --language c --write
 *   node server/scripts/backfill-starters.js --language all --write
 *   node server/scripts/backfill-starters.js --language c --print two-sum-ii-sorted-array
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyInsertions, assertOnlyKeysAdded, findObjectBlock, findSlug, insertObjectMember,
} from './lib/seed-json-edit.js';
import { getLanguage, languageSupportsSignature } from '../languages/registry.js';
import { languagesWithGeneratedStarters, resolveStarterRenderer } from '../languages/starters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const argv = process.argv.slice(2);
const flagValues = (name) => argv.reduce((acc, a, i) => (a === name && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const WRITE = argv.includes('--write');
const PRINT_SLUG = flagValues('--print')[0] || null;
const requested = flagValues('--language');

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const AVAILABLE = languagesWithGeneratedStarters();
const languages = requested.includes('all') || requested.length === 0
  ? AVAILABLE
  : requested.map((r) => getLanguage(r)?.key).filter((k) => k && AVAILABLE.includes(k));

if (!languages.length) {
  console.error(c.red(`--language must be one of: ${AVAILABLE.join(', ')}, all`));
  process.exit(1);
}

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

let exitCode = 0;

for (const language of languages) {
  const def = getLanguage(language);
  const render = resolveStarterRenderer(language);
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
        const out = render(problem.cpp_signature || {});
        if (out.error) { console.error(c.red(`${problem.slug}: ${out.error}`)); process.exit(1); }
        console.log(out.code);
        process.exit(0);
      }

      const verdict = languageSupportsSignature(language, problem.cpp_signature);
      if (!verdict.supported) {
        stats.incapable += 1;
        skipped.push({ slug: problem.slug, reason: verdict.reason });
        continue;
      }
      if (problem.starter_code?.[language]) { stats.kept += 1; continue; }

      const out = render(problem.cpp_signature);
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
        const plan = insertObjectMember(raw, block, `${JSON.stringify(language)}: ${JSON.stringify(out.code)}`);
        if (plan.error) { stats.failed += 1; failures.push({ slug: problem.slug, reason: plan.error }); continue; }
        insertions.push(plan);
      }

      stats.generated += 1;
      rows.push({ slug: problem.slug, summary: out.summary });
    }

    if (WRITE && insertions.length) {
      const next = applyInsertions(raw, insertions);
      if (!assertOnlyKeysAdded(raw, next, [`starter_code.${language}`])) {
        throw new Error(`refusing to write ${file}: the edit changed data other than starter_code.${language}`);
      }
      fs.writeFileSync(file, next, 'utf8');
      stats.filesChanged += 1;
    }
  }

  console.log(c.bold(`\n=== starter_code.${language} backfill ${WRITE ? '(WRITING)' : '(dry run)'} ===\n`));
  for (const { slug, summary } of rows) {
    console.log(`  ${c.green('+')} ${slug.padEnd(52)} ${summary}`);
  }
  if (skipped.length) {
    console.log(c.bold(c.yellow(`\n${skipped.length} problem(s) ${def.displayName} cannot express:\n`)));
    for (const s of skipped) console.log(`  ${c.yellow('-')} ${s.slug}\n      ${c.dim(s.reason)}`);
  }
  if (failures.length) {
    exitCode = 1;
    console.log(c.bold(c.red(`\n${failures.length} failure(s):\n`)));
    for (const f of failures) console.log(`  ${c.red('!')} ${f.slug}\n      ${c.dim(f.reason)}`);
  }
  console.log(
    `\n${stats.total} problems: ${c.green(`${stats.generated} generated`)}, ${stats.kept} already had one, `
    + `${stats.incapable} not ${def.displayName}-capable, ${failures.length ? c.red(`${stats.failed} failed`) : '0 failed'}`,
  );
  if (WRITE) console.log(`${stats.filesChanged} seed file(s) rewritten.`);
}

if (!WRITE) console.log(c.dim('\nNothing written. Re-run with --write to edit the seed files.\n'));
else console.log(`\nRun ${c.bold('npm run seed:learning')} to apply.\n`);

process.exit(exitCode);
