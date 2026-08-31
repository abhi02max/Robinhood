#!/usr/bin/env node
/**
 * Compile check for generated starter code, for any signature-driven language.
 *
 * WHY
 * ---
 * A starter is generated from a problem's signature. If that declaration does not
 * match what the harness generates around it, the user's very first submission — before
 * they have written a line — fails to compile, and the error names harness internals
 * rather than anything they did. A starter that does not compile is worse than none.
 *
 * WHAT IT ASSERTS
 * ---------------
 * For every problem the language can express: submit the untouched starter and require
 * that the verdict is **not** a compile error and not a harness error. That is the whole
 * claim. Starters return a zero value, so Wrong Answer is the expected outcome and
 * counts as success — grading correctness is check-authored-problems.js's job.
 *
 * A problem whose expected output happens to be 0, false, empty or null can pass its
 * one case with the placeholder return. That is reported rather than treated as an
 * error, because it says nothing about whether the starter compiles.
 *
 * CAPABILITY IS DERIVED
 * ---------------------
 * Problems are selected with `languageSupportsSignature`, so a language is only checked
 * against problems it can actually express. Anything excluded is listed with the exact
 * type that caused it.
 *
 * This supersedes the per-language copies: one gate, one set of semantics, and the
 * `--language all` mode is the unified regression matrix.
 *
 *   node server/scripts/check-starters.js --language java
 *   node server/scripts/check-starters.js --language all
 *   node server/scripts/check-starters.js --language cpp --slug 3sum
 *   node server/scripts/check-starters.js --language java --shapes
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true, quiet: true });

// Force real execution: under mock every starter is reported as compiling, which is
// precisely the claim this script exists to test.
if (String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}

const { runExecution } = await import('../learning-engine/execution-engine.js');
const { executableLanguages, getLanguage, languageSupportsSignature } = await import('../languages/registry.js');
// Shared with check-all-starters.js. Two copies of "which files are problems" is exactly
// the kind of duplication that fragmented the language definitions before Phase 2A.
const { loadSeededProblems, signatureShape, representativeCase } = await import('./lib/seeded-problems.mjs');

const argv = process.argv.slice(2);
const flagValues = (name) => argv.reduce((acc, a, i) => (a === name && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const ONLY = new Set(flagValues('--slug'));
const SHAPES_ONLY = argv.includes('--shapes');
const CONCURRENCY = Math.max(1, Number(flagValues('--concurrency')[0]) || 4);
const requested = flagValues('--language');

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Only signature-driven languages have generated starters to check. JavaScript and
// Python take their shape from the submitted source, so there is nothing to compile.
const CHECKABLE = executableLanguages()
  .filter((l) => l.signatureStrategy === 'signature')
  .map((l) => l.key);

const languages = requested.includes('all') || requested.length === 0
  ? CHECKABLE
  : requested.map((r) => getLanguage(r)?.key).filter(Boolean);

if (!languages.length) {
  console.error(c.red(`--language must be one of: ${CHECKABLE.join(', ')}, all`));
  process.exit(1);
}

// Problems come from the seed files — the source of truth, and it means this runs before
// a seed and needs no DATABASE_URL.
const allProblems = loadSeededProblems();

const BAD_KINDS = new Set(['compile_error', 'harness_error']);

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

const summary = [];
let totalFailures = 0;
let totalExecutions = 0;

for (const language of languages) {
  const def = getLanguage(language);
  const targets = [];
  const excluded = [];
  const noStarter = [];

  for (const p of allProblems) {
    if (ONLY.size && !ONLY.has(p.slug)) continue;
    const verdict = languageSupportsSignature(language, p.cpp_signature);
    if (!verdict.supported) { excluded.push({ slug: p.slug, reason: verdict.reason }); continue; }
    const starter = p.starter_code?.[language];
    if (!starter) { noStarter.push(p.slug); continue; }
    const tcase = representativeCase(p);
    if (!tcase) { noStarter.push(p.slug); continue; }
    targets.push({
      slug: p.slug,
      starter,
      sig: p.cpp_signature,
      shape: signatureShape(p.cpp_signature),
      testCase: tcase,
    });
  }

  let selected = targets;
  if (SHAPES_ONLY) {
    const seen = new Set();
    selected = targets.filter((t) => (seen.has(t.shape) ? false : seen.add(t.shape)));
  }

  console.log(c.bold(`\n=== ${def.displayName} starters ===`));
  console.log(c.dim(`provider=${process.env.EXECUTION_PROVIDER}  targets=${selected.length}`
    + `${SHAPES_ONLY ? ' (one per type shape)' : ''}  excluded=${excluded.length}  concurrency=${CONCURRENCY}\n`));

  const t0 = Date.now();
  const results = await runPool(selected, CONCURRENCY, async (target) => {
    try {
      const out = await runExecution({
        code: target.starter,
        language,
        testCases: [target.testCase],
        cpp_signature: target.sig,
      });
      const r = out.results?.[0] || {};
      const kind = r.passed ? 'passed' : (r.error_kind || 'unknown');
      return {
        ...target,
        ok: !BAD_KINDS.has(kind) && kind !== 'unknown',
        kind,
        detail: String(r.stderr || r.message || '').trim(),
      };
    } catch (e) {
      return { ...target, ok: false, kind: 'threw', detail: e.message };
    }
  });
  totalExecutions += results.length;

  for (const r of results) {
    const label = r.ok ? c.green('OK  ') : c.red('FAIL');
    const kindText = r.kind === 'wrong_answer'
      ? c.dim('compiles, wrong answer (expected)')
      : r.kind === 'passed'
        ? c.yellow('compiles, and the placeholder return happens to match this case')
        : r.kind === 'time_limit_exceeded'
          ? c.yellow('compiles, timed out')
          : c.red(r.kind);
    console.log(`${label} ${r.slug.padEnd(52)} ${kindText}`);
    if (!r.ok && r.detail) console.log(`     ${c.dim(r.detail.slice(0, 400))}`);
  }

  const failed = results.filter((r) => !r.ok);
  totalFailures += failed.length + noStarter.length;
  const shapes = new Set(results.map((r) => r.shape));

  if (noStarter.length) {
    console.log(c.red(`\n${noStarter.length} capable problem(s) with NO ${language} starter: ${noStarter.join(', ')}`));
  }
  if (excluded.length) {
    console.log(c.yellow(`\n${excluded.length} problem(s) ${def.displayName} cannot express:`));
    for (const e of excluded) console.log(`  ${c.yellow('-')} ${e.slug}: ${c.dim(e.reason)}`);
  }

  console.log(`\n${results.length} starter(s) across ${shapes.size} type shape(s) in `
    + `${((Date.now() - t0) / 1000).toFixed(0)}s: `
    + (failed.length === 0 && noStarter.length === 0 ? c.green('all compile') : c.red(`${failed.length + noStarter.length} problem(s) failed`)));

  summary.push({
    language: def.displayName,
    checked: results.length,
    shapes: shapes.size,
    excluded: excluded.length,
    failed: failed.length + noStarter.length,
  });
}

// ---------------------------------------------------------------------------
console.log(c.bold('\n=== matrix ===\n'));
console.log(`  ${'language'.padEnd(12)} ${'checked'.padStart(8)} ${'shapes'.padStart(7)} ${'excluded'.padStart(9)} ${'failed'.padStart(7)}`);
for (const s of summary) {
  console.log(`  ${s.language.padEnd(12)} ${String(s.checked).padStart(8)} ${String(s.shapes).padStart(7)} `
    + `${String(s.excluded).padStart(9)} ${(s.failed ? c.red(String(s.failed)) : c.green('0')).padStart(7)}`);
}
console.log(`\n  ${totalExecutions} executions, ${totalFailures ? c.red(`${totalFailures} failures`) : c.green('no failures')}\n`);

process.exit(totalFailures ? 1 : 0);
