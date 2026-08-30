#!/usr/bin/env node
/**
 * Build curriculum seed files from authoring specs.
 *
 *   server/data/learning/authoring/<topic>/<pattern>.mjs
 *       -> server/data/learning/problems/<topic>/<pattern>.json
 *
 * WHY A BUILD STEP
 * ----------------
 * The seed JSON is the source of truth the seeder reads, but `expected_output` on
 * every test case is not something a human should be typing. The spec carries two
 * independently written reference solutions and a list of inputs; the build runs them,
 * cross-checks them against each other, against the brute force, and against the
 * hand-stated answers in the worked examples, and only then writes the JSON. A
 * disagreement is a build failure, not a problem that ships and grades correct code
 * as wrong.
 *
 * The emitted JSON is committed. It is the artefact the seeder and the validator see,
 * and it stays reviewable as a diff.
 *
 * AFTER RUNNING THIS
 * ------------------
 *   node server/scripts/validate-problem-schema.js
 *   node server/scripts/backfill-cpp-signatures.js --write   # C++ types from the data
 *   node server/scripts/backfill-cpp-starters.js --write     # C++ starter from those
 *   npm run seed:learning
 *
 * USAGE
 *   node server/scripts/build-authored-problems.js                  # everything
 *   node server/scripts/build-authored-problems.js arrays           # one topic
 *   node server/scripts/build-authored-problems.js arrays/prefix-sum
 *   node server/scripts/build-authored-problems.js --check          # verify only, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProblem, renderBundle } from '../data/learning/authoring/lib/authoring.mjs';
import { validateProblemBundle } from './validate-problem-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTHORING_DIR = path.join(__dirname, '..', 'data', 'learning', 'authoring');
const PROBLEMS_DIR = path.join(__dirname, '..', 'data', 'learning', 'problems');

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const filters = args.filter((a) => !a.startsWith('--'));

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function specFiles() {
  const out = [];
  if (!fs.existsSync(AUTHORING_DIR)) return out;
  for (const topic of fs.readdirSync(AUTHORING_DIR)) {
    if (topic === 'lib') continue;
    const dir = path.join(AUTHORING_DIR, topic);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mjs')) continue;
      const pattern = file.replace(/\.mjs$/, '');
      const key = `${topic}/${pattern}`;
      if (filters.length && !filters.some((f) => key === f || topic === f)) continue;
      out.push({ topic, pattern, key, file: path.join(dir, file) });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

const targets = specFiles();
if (!targets.length) {
  console.error(c.red(`no authoring specs matched${filters.length ? ` ${filters.join(', ')}` : ''}`));
  process.exit(1);
}

console.log(c.bold(`\n=== building authored problems ${CHECK_ONLY ? '(check only)' : ''} ===\n`));

let built = 0;
let problemCount = 0;
let caseCount = 0;
const failures = [];
const cppSkipped = [];

for (const target of targets) {
  const mod = await import(`file://${target.file}`);
  const spec = mod.default;

  if (spec.topic !== target.topic || spec.pattern !== target.pattern) {
    failures.push(`${target.key}: spec declares ${spec.topic}/${spec.pattern}, which does not match its path`);
    continue;
  }

  const problems = [];
  let failedHere = false;
  for (const problemSpec of spec.problems) {
    try {
      problems.push(buildProblem(problemSpec, { topic: spec.topic, pattern: spec.pattern }));
    } catch (e) {
      failures.push(`${target.key}: ${e.message}`);
      failedHere = true;
    }
  }
  if (failedHere) continue;

  const bundle = { topic: spec.topic, pattern: spec.pattern, problems };
  const text = renderBundle(bundle);

  // Validate the emitted text, not the in-memory object: a rendering bug that
  // produces valid-looking JSON with the wrong shape has to be caught here.
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    failures.push(`${target.key}: emitted JSON does not parse — ${e.message}`);
    continue;
  }
  const report = validateProblemBundle(parsed, `${target.key}.json`);
  if (!report.ok) {
    failures.push(`${target.key}: schema violations\n      ${report.errors.join('\n      ')}`);
    continue;
  }

  const outPath = path.join(PROBLEMS_DIR, target.topic, `${target.pattern}.json`);
  const cases = problems.reduce((n, p) => n + p.test_cases.length, 0);
  const unchanged = fs.existsSync(outPath) && fs.readFileSync(outPath, 'utf8') === text;

  if (!CHECK_ONLY && !unchanged) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, text, 'utf8');
  }

  built += 1;
  problemCount += problems.length;
  caseCount += cases;
  const state = CHECK_ONLY ? c.dim('checked') : unchanged ? c.dim('unchanged') : c.green('written');
  console.log(
    `  ${c.green('OK')} ${target.key.padEnd(46)} ${String(problems.length).padStart(2)} problems, ` +
    `${String(cases).padStart(3)} cases  ${state}`,
  );
  for (const p of problems) {
    const visible = p.test_cases.filter((t) => !t.is_hidden).length;
    console.log(`       ${c.dim(`${p.slug} (${p.difficulty}) — ${visible} visible / ${p.test_cases.length - visible} hidden`)}`);
    if (p.__cppSkipped) {
      cppSkipped.push(`${p.slug}: ${p.__cppSkipped}`);
      console.log(`       ${c.yellow(`no C++: ${p.__cppSkipped}`)}`);
    }
  }
}

if (cppSkipped.length) {
  console.log(c.bold(c.yellow(`\n${cppSkipped.length} problem(s) are JavaScript/Python only:\n`)));
  for (const s of cppSkipped) console.log(`  ${c.yellow('-')} ${s}`);
}

if (failures.length) {
  console.log(c.bold(c.red(`\n${failures.length} failure(s):\n`)));
  for (const f of failures) console.log(`  ${c.red('!')} ${f}`);
}

console.log(
  `\n${built}/${targets.length} pattern file(s), ${problemCount} problems, ${caseCount} test cases. ` +
  (failures.length ? c.red('BUILD FAILED') : c.green('all references agree')),
);
console.log('');

process.exit(failures.length ? 1 : 0);
