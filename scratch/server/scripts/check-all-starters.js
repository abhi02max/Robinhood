#!/usr/bin/env node
/**
 * THE six-language release gate.
 *
 *     node server/scripts/check-all-starters.js              # local only, no provider
 *     node server/scripts/check-all-starters.js --release     # everything
 *     npm run check:languages                                 # local only
 *     npm run check:languages:release                          # everything
 *
 * WHY ONE COMMAND
 * ---------------
 * By the end of Phase 2D the language subsystem was verified by six scripts with
 * different semantics, and "is the language layer releasable?" had no single answer.
 * Worse, each phase's evidence was a paragraph in a commit message. This is the one
 * command whose exit code means "the six-language application layer is releasable",
 * and `--json` writes the same verdict as a machine-readable artifact.
 *
 * TWO TIERS, AND WHY THE SPLIT IS NOT ARBITRARY
 * ---------------------------------------------
 * Paiza is a free, undocumented endpoint that rations us — Phase 2D took confirmed HTTP
 * 429s during a heavy sweep. Provider executions are the scarce resource, so the gate
 * spends none of them on anything it can prove locally:
 *
 *   LOCAL     registry integrity, capability derivation, starter generation, starter
 *             drift against the seed files, harness generation for every problem/language
 *             pair, and literal serialization for every canonical type.
 *             Cost: 0 executions. Runs in about a second. This tier alone catches every
 *             defect Phase 2A-2D found by generation rather than by running.
 *
 *   PROVIDER  the canonical corpus (each canonical TYPE actually round-trips), the
 *             verdict matrix (each of five outcomes is reported as itself), rejection of
 *             known-wrong controls, and the starter compile matrix.
 *             Cost: bounded and counted. Reported per tier.
 *
 * WHY THE STARTER MATRIX IS SAMPLED BY DEFAULT
 * --------------------------------------------
 * The exhaustive matrix is 374 executions: every one of 96 problems in each of four
 * typed languages, minus C's 10 exclusions. Most of those executions re-prove the same
 * thing — 96 problems reduce to 32 distinct type shapes, so 3 in 4 executions compile a
 * structurally identical program. `--starters` therefore samples one problem per shape
 * (128 executions), and `--exhaustive` runs all 374.
 *
 * The exhaustive run is still required before a release, and not out of caution: a
 * starter is generated from a problem's own signature, so a per-problem defect — a
 * function name that collides with a generated parameter, an argument name that is a
 * reserved word in one language — is invisible to a sampled run. `--release` implies
 * `--exhaustive` for that reason.
 *
 * WHAT IT DOES NOT COVER
 * ----------------------
 * Authenticated submission, persistence and progress are browser concerns and stay in
 * the Playwright suite (`tests/language-submission.spec.ts`), because proving them needs
 * a real session and a real database. This gate reports that it does not cover them
 * rather than implying six-language coverage it does not have.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true, quiet: true });

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const RELEASE = has('--release');
const RUN_CANONICAL = RELEASE || has('--canonical');
const RUN_VERDICTS = RELEASE || has('--verdicts');
const RUN_STARTERS = RELEASE || has('--starters');
const EXHAUSTIVE = RELEASE || has('--exhaustive');
const ANY_PROVIDER = RUN_CANONICAL || RUN_VERDICTS || RUN_STARTERS;
const CONCURRENCY = Math.max(1, Number(val('--concurrency', '4')));
const MAX_RETRIES = Math.max(0, Number(val('--max-retries', '3')));
const JSON_OUT = val('--json', null);
const ONLY_LANGS = argv.reduce((a, x, i) => (x === '--language' && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

// Under `mock` every program is reported as running, which is the claim the provider
// tier exists to test. Force a real provider, but only when a provider tier was asked
// for -- the local tier never touches one.
if (ANY_PROVIDER && String(process.env.EXECUTION_PROVIDER || '').toLowerCase() === 'mock') {
  process.env.EXECUTION_PROVIDER = 'paiza';
}

const { runExecution, buildHarnessProgram } = await import('../learning-engine/execution-engine.js');
const {
  CANONICAL_TYPES, getLanguage, listLanguages, productionLanguages,
  languageSupportsSignature, providerMapping, typeDeclaration,
} = await import('../languages/registry.js');
const { resolveStarterRenderer } = await import('../languages/starters.js');
const { loadSeededProblems, signatureShape, representativeCase } = await import('./lib/seeded-problems.mjs');
const { CORPUS, coveredTypes, coveredEdges, totalCases, EDGES } = await import('./lib/canonical-corpus.mjs');
const { VERDICTS, COMPILE_ERROR_SOURCE, verdictProbe } = await import('./lib/canonical-verdicts.mjs');
const {
  RESULT, ProviderStats, runWithBackoff, classifyExecution, isBlocking,
} = await import('./lib/provider-gate.mjs');

const PROVIDER = String(process.env.EXECUTION_PROVIDER || 'paiza').toLowerCase();

// ---------------------------------------------------------------------------
const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  d: (s) => `\x1b[2m${s}\x1b[0m`,
};
const tick = (ok) => (ok ? c.g('PASS') : c.r('FAIL'));
const head = (s) => console.log(`\n${c.b(`=== ${s} ===`)}\n`);

/** Everything that failed, in one place, so the summary never has to be trusted. */
const problems = [];
const fail = (category, detail) => { problems.push({ category, detail }); };

const report = {
  generated_at: new Date().toISOString(),
  provider: PROVIDER,
  tiers: { local: true, canonical: RUN_CANONICAL, verdicts: RUN_VERDICTS, starters: RUN_STARTERS, exhaustive: EXHAUSTIVE },
  languages: {},
  capability: {},
  local: {},
  canonical: {},
  verdicts: {},
  starters: {},
  provider_stats: null,
  not_covered: [
    'authenticated submission, attempt persistence and progress update (browser suite: tests/language-submission.spec.ts)',
    'Judge0 as the execution provider (never live-validated; see docs/judge0-revalidation.md)',
    'signature types beyond the canonical vocabulary',
  ],
  failures: [],
};

// ---------------------------------------------------------------------------
const allProblems = loadSeededProblems();
const prodLangs = productionLanguages()
  .map((l) => l.key)
  .filter((k) => !ONLY_LANGS.length || ONLY_LANGS.includes(k));

console.log(c.b('\nRobinhood six-language release gate'));
console.log(c.d(`  provider          ${PROVIDER}${ANY_PROVIDER ? '' : ' (unused: local tier only)'}`));
console.log(c.d(`  seeded problems   ${allProblems.length}`));
console.log(c.d(`  production langs  ${prodLangs.join(', ')}`));
console.log(c.d(`  tiers             local${RUN_CANONICAL ? ' + canonical' : ''}${RUN_VERDICTS ? ' + verdicts' : ''}`
  + `${RUN_STARTERS ? ` + starters(${EXHAUSTIVE ? 'exhaustive' : 'sampled'})` : ''}`));
if (!ANY_PROVIDER) {
  console.log(c.d('  hint              --release runs the provider tiers too'));
}

// ===========================================================================
// LOCAL TIER 1 — registry integrity
// ===========================================================================
head('local: registry integrity');

for (const def of listLanguages()) {
  const issues = [];
  if (def.productionEnabled) {
    if (!def.harnessImplemented) issues.push('productionEnabled but no harness');
    if (!def.supportsRun) issues.push('productionEnabled but supportsRun is false');
    if (!def.supportsSubmit) issues.push('productionEnabled but supportsSubmit is false');
    // A production language with no mapping for the ACTIVE provider cannot run at all.
    if (!providerMapping(def.key, PROVIDER)) issues.push(`no ${PROVIDER} provider mapping`);
    if (def.signatureStrategy === 'signature' && !resolveStarterRenderer(def.key)) {
      issues.push('signature-driven but no starter renderer resolves');
    }
    if (def.types !== null) {
      // Every type the language claims must be in the canonical vocabulary, or a
      // problem could declare a type the registry silently accepts and nothing runs.
      for (const t of Object.keys(def.types)) {
        if (!CANONICAL_TYPES.includes(t)) issues.push(`type "${t}" is outside the canonical vocabulary`);
      }
    }
  }
  report.languages[def.key] = {
    display_name: def.displayName,
    production_enabled: def.productionEnabled,
    harness_implemented: def.harnessImplemented,
    supports_run: def.supportsRun,
    supports_submit: def.supportsSubmit,
    signature_strategy: def.signatureStrategy,
    monaco: def.monacoLanguage,
    extension: def.extension,
    providers: Object.fromEntries(Object.entries(def.providers).map(([p, m]) => [p, { id: m.id, verified: !!m.verified, runtime: m.runtimeNote || null }])),
    issues,
  };
  console.log(`${tick(!issues.length)} ${def.displayName.padEnd(12)} ${c.d(issues.length ? issues.join('; ') : `${def.signatureStrategy}, ${def.productionEnabled ? 'production' : 'hidden'}`)}`);
  for (const i of issues) fail('registry', `${def.key}: ${i}`);
}

// ===========================================================================
// LOCAL TIER 2 — capability, derived not declared
// ===========================================================================
head('local: capability matrix (derived from each problem\'s actual types)');

const capability = {};
for (const key of prodLangs) {
  const def = getLanguage(key);
  const capable = [];
  const excluded = [];
  for (const p of allProblems) {
    const v = languageSupportsSignature(key, p.cpp_signature);
    if (v.supported) capable.push(p);
    else excluded.push({ slug: p.slug, reason: v.reason });
  }
  capability[key] = { def, capable, excluded };
  report.capability[key] = {
    total: allProblems.length,
    capable: capable.length,
    excluded: excluded.length,
    exclusions: excluded,
  };
}

for (const key of prodLangs) {
  const { def, capable, excluded } = capability[key];
  console.log(`  ${def.displayName.padEnd(12)} ${String(capable.length).padStart(3)}/${allProblems.length} capable`
    + `  ${String(excluded.length).padStart(2)} excluded`);
}
for (const key of prodLangs) {
  const { def, excluded } = capability[key];
  if (!excluded.length) continue;
  console.log(c.y(`\n  ${def.displayName} cannot express ${excluded.length} problem(s):`));
  for (const e of excluded) console.log(`    ${c.y('-')} ${e.slug.padEnd(52)} ${c.d(e.reason)}`);
}

// ===========================================================================
// LOCAL TIER 3 — starter generation, and drift against the seed files
// ===========================================================================
head('local: starter generation and seed drift');

for (const key of prodLangs) {
  const { def, capable } = capability[key];
  const renderer = resolveStarterRenderer(key);
  if (!renderer) {
    console.log(`${c.d('skip')} ${def.displayName.padEnd(12)} ${c.d('source-parsed language: starters are hand-written in the seed files')}`);
    report.local[`starters_${key}`] = { checked: 0, skipped: 'source-parse' };
    continue;
  }
  let rendered = 0;
  let missing = 0;
  let drifted = 0;
  const errors = [];
  for (const p of capable) {
    const out = renderer(p.cpp_signature);
    if (!out || out.error) {
      errors.push(`${p.slug}: ${out?.error || 'renderer returned nothing'}`);
      continue;
    }
    rendered += 1;
    const seeded = p.starter_code?.[key];
    if (!seeded) { missing += 1; errors.push(`${p.slug}: capable but the seed file has no ${key} starter`); continue; }
    // Drift matters: the editor serves the SEEDED starter, while the harness is built
    // around what the renderer produces now. If they disagree the user is handed a
    // declaration the harness will not call.
    if (seeded.trim() !== out.code.trim()) {
      drifted += 1;
      errors.push(`${p.slug}: seeded ${key} starter differs from the generated one (run backfill-starters.js --language ${key} --write)`);
    }
  }
  const ok = !errors.length;
  console.log(`${tick(ok)} ${def.displayName.padEnd(12)} ${rendered} rendered, ${missing} missing, ${drifted} drifted`);
  for (const e of errors.slice(0, 12)) console.log(`     ${c.r('-')} ${e}`);
  if (errors.length > 12) console.log(c.d(`     ...and ${errors.length - 12} more`));
  for (const e of errors) fail('starter-generation', e);
  report.local[`starters_${key}`] = { checked: capable.length, rendered, missing, drifted, errors };
}

// ===========================================================================
// LOCAL TIER 4 — harness generation for EVERY problem/language pair
// ===========================================================================
head('local: harness generation for every problem/language pair');

let harnessPairs = 0;
for (const key of prodLangs) {
  const { def, capable } = capability[key];
  const errors = [];
  let built = 0;
  let bytes = 0;
  for (const p of capable) {
    const tcase = representativeCase(p);
    if (!tcase) { errors.push(`${p.slug}: no test case to build a harness from`); continue; }
    // Build around the SEEDED starter. That is what a user is handed, so if the pair
    // cannot produce a program from it, their first submission fails on our code.
    const code = p.starter_code?.[key];
    if (!code) { errors.push(`${p.slug}: no ${key} starter to wrap`); continue; }
    try {
      const program = buildHarnessProgram({ language: key, code, cpp_signature: p.cpp_signature, testCase: tcase });
      if (typeof program !== 'string' || !program.trim()) {
        errors.push(`${p.slug}: harness produced an empty program`);
        continue;
      }
      built += 1;
      bytes += program.length;
      harnessPairs += 1;
    } catch (e) {
      errors.push(`${p.slug}: ${e.message}`);
    }
  }
  const ok = !errors.length;
  console.log(`${tick(ok)} ${def.displayName.padEnd(12)} ${built} programs generated, avg ${built ? Math.round(bytes / built) : 0} bytes`);
  for (const e of errors.slice(0, 12)) console.log(`     ${c.r('-')} ${e}`);
  if (errors.length > 12) console.log(c.d(`     ...and ${errors.length - 12} more`));
  for (const e of errors) fail('harness-generation', e);
  report.local[`harness_${key}`] = { built, errors };
}

// ===========================================================================
// LOCAL TIER 5 — canonical corpus coverage, asserted rather than claimed
// ===========================================================================
head('local: canonical corpus coverage');

{
  const covered = new Set(coveredTypes());
  const missingTypes = CANONICAL_TYPES.filter((t) => !covered.has(t));
  const coveredEdgeSet = new Set(coveredEdges());
  const missingEdges = EDGES.filter((e) => !coveredEdgeSet.has(e));

  console.log(`${tick(!missingTypes.length)} every canonical type appears in the corpus `
    + c.d(`(${covered.size}/${CANONICAL_TYPES.length})`));
  if (missingTypes.length) {
    console.log(c.r(`     uncovered: ${missingTypes.join(', ')}`));
    fail('corpus-coverage', `canonical types with no corpus entry: ${missingTypes.join(', ')}`);
  }
  console.log(`${tick(!missingEdges.length)} every declared edge condition appears `
    + c.d(`(${coveredEdgeSet.size}/${EDGES.length})`));
  if (missingEdges.length) {
    console.log(c.r(`     uncovered: ${missingEdges.join(', ')}`));
    fail('corpus-coverage', `edge conditions with no corpus case: ${missingEdges.join(', ')}`);
  }

  // A corpus entry must carry a solution for exactly the languages the registry says
  // can express it. A missing solution would silently reduce coverage; a superfluous
  // one means the corpus and the registry disagree about capability.
  const mismatches = [];
  for (const entry of CORPUS) {
    for (const key of prodLangs) {
      const supported = languageSupportsSignature(key, entry.sig).supported;
      const hasSolution = Boolean(entry.solutions[key]);
      if (supported && !hasSolution) mismatches.push(`${entry.id}: ${key} can express this signature but the corpus has no solution`);
      if (!supported && hasSolution) mismatches.push(`${entry.id}: ${key} cannot express this signature but the corpus has a solution`);
    }
  }
  console.log(`${tick(!mismatches.length)} corpus solutions match registry capability exactly`);
  for (const m of mismatches) { console.log(`     ${c.r('-')} ${m}`); fail('corpus-coverage', m); }

  report.local.corpus = {
    entries: CORPUS.length,
    cases: totalCases(),
    types_covered: [...covered],
    types_missing: missingTypes,
    edges_covered: [...coveredEdgeSet],
    edges_missing: missingEdges,
    capability_mismatches: mismatches,
  };
}

// ===========================================================================
// LOCAL TIER 6 — literal serialization for every language/type pair
// ===========================================================================
head('local: literal serialization for every typed language/type pair');

{
  // Build a harness for each corpus entry without running it. This is what proves the
  // literal emitters handle every canonical type AND every edge value -- an empty array,
  // INT_MIN, an escaped quote, a non-ASCII byte, a ragged matrix -- with zero provider
  // cost. The provider tier then proves the compiler agrees.
  const grid = {};
  for (const key of prodLangs) {
    const def = getLanguage(key);
    grid[key] = {};
    const errors = [];
    for (const entry of CORPUS) {
      if (!entry.solutions[key]) { grid[key][entry.id] = 'n/a'; continue; }
      let okCases = 0;
      for (const tcase of entry.cases) {
        try {
          const program = buildHarnessProgram({
            language: key, code: entry.solutions[key], cpp_signature: entry.sig, testCase: tcase,
          });
          if (typeof program !== 'string' || !program.trim()) throw new Error('empty program');
          okCases += 1;
        } catch (e) {
          errors.push(`${entry.id} case ${tcase.order_index}: ${e.message}`);
        }
      }
      grid[key][entry.id] = okCases === entry.cases.length ? 'ok' : `${okCases}/${entry.cases.length}`;
    }
    const ok = !errors.length;
    console.log(`${tick(ok)} ${def.displayName.padEnd(12)} ${c.d(Object.entries(grid[key]).map(([k, v]) => `${k}=${v}`).join(' '))}`);
    for (const e of errors) { console.log(`     ${c.r('-')} ${e}`); fail('literal-serialization', `${key}: ${e}`); }
  }

  // Also assert the registry can DECLARE every type it claims, per language.
  const declErrors = [];
  for (const key of prodLangs) {
    const def = getLanguage(key);
    if (def.types === null) continue;
    for (const t of Object.keys(def.types)) {
      const decl = typeDeclaration(key, t);
      if (!decl || !decl.decl) declErrors.push(`${key}: type "${t}" has no declaration`);
    }
  }
  console.log(`${tick(!declErrors.length)} every registry type has a declaration`);
  for (const e of declErrors) { console.log(`     ${c.r('-')} ${e}`); fail('literal-serialization', e); }

  report.local.literal_grid = grid;
}

// ===========================================================================
// Provider tiers
// ===========================================================================
const stats = new ProviderStats();
const onRetry = (msg) => console.log(c.y(`     ${msg}`));

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

// ---------------------------------------------------------------------------
// PROVIDER TIER A — the canonical corpus
// ---------------------------------------------------------------------------
if (RUN_CANONICAL) {
  head(`provider: canonical corpus (${CORPUS.length} entries, ${totalCases()} cases per capable language)`);

  const jobs = [];
  for (const key of prodLangs) {
    for (const entry of CORPUS) {
      if (!entry.solutions[key]) {
        report.canonical[`${key}/${entry.id}`] = { result: RESULT.UNSUPPORTED_SIGNATURE, reason: languageSupportsSignature(key, entry.sig).reason || 'no solution and not capable' };
        continue;
      }
      jobs.push({ key, entry, kind: 'reference' });
      if (entry.wrong?.[key]) jobs.push({ key, entry, kind: 'control' });
    }
  }

  const results = await pool(jobs, CONCURRENCY, async (job) => {
    const { key, entry, kind } = job;
    const code = kind === 'reference' ? entry.solutions[key] : entry.wrong[key];
    const expectation = kind === 'reference' ? 'pass' : 'reject';
    const label = `${key}/${entry.id}${kind === 'control' ? ' (control)' : ''}`;
    const r = await runWithBackoff(
      () => runExecution({ code, language: key, testCases: entry.cases, cpp_signature: entry.sig }),
      { expectation, maxRetries: MAX_RETRIES, stats, onRetry, label },
    );
    stats.record(r.result);
    report.canonical[`${key}/${entry.id}${kind === 'control' ? '#control' : ''}`] = {
      result: r.result, reason: r.reason, attempts: r.attempts,
      cases: entry.cases.length, covers: entry.covers, edges: entry.edges,
      http_requests: r.out?.http_requests ?? null,
    };
    if (isBlocking(r.result)) fail('canonical', `${label}: ${r.result} — ${r.reason}`);
    return { ...job, ...r, label };
  });

  for (const key of prodLangs) {
    const mine = results.filter((r) => r.key === key);
    if (!mine.length) continue;
    const def = getLanguage(key);
    const bad = mine.filter((r) => isBlocking(r.result));
    const thr = mine.filter((r) => r.result === RESULT.PROVIDER_THROTTLED);
    console.log(`${tick(!bad.length)} ${def.displayName.padEnd(12)} ${mine.length} executions`
      + `${thr.length ? c.y(`, ${thr.length} throttled`) : ''}`
      + `${bad.length ? c.r(`, ${bad.length} failed`) : ''}`);
    for (const b of [...bad, ...thr]) {
      console.log(`     ${b.result === RESULT.PROVIDER_THROTTLED ? c.y('~') : c.r('-')} ${b.label}: ${b.result} ${c.d(b.reason)}`);
    }
  }
  // A type is only proven for a language if its corpus entry passed there.
  const unsupportedNote = Object.entries(report.canonical).filter(([, v]) => v.result === RESULT.UNSUPPORTED_SIGNATURE);
  if (unsupportedNote.length) {
    console.log(c.y(`\n  ${unsupportedNote.length} pair(s) skipped as UNSUPPORTED_SIGNATURE (expected, and asserted against the registry above):`));
    for (const [k, v] of unsupportedNote) console.log(`    ${c.y('-')} ${k}: ${c.d(v.reason)}`);
  }
}

// ---------------------------------------------------------------------------
// PROVIDER TIER B — the verdict matrix
// ---------------------------------------------------------------------------
if (RUN_VERDICTS) {
  head(`provider: verdict matrix (${VERDICTS.length} verdicts x ${prodLangs.length} languages)`);

  const jobs = [];
  for (const key of prodLangs) for (const verdict of VERDICTS) jobs.push({ key, verdict });

  const results = await pool(jobs, CONCURRENCY, async ({ key, verdict }) => {
    const probe = verdictProbe(key, verdict);
    if (!probe) {
      report.verdicts[`${key}/${verdict}`] = { result: RESULT.UNSUPPORTED_SIGNATURE, reason: 'no probe program declared' };
      fail('verdicts', `${key}/${verdict}: no probe program declared`);
      return { key, verdict, ok: false, observed: null, reason: 'no probe program' };
    }
    const label = `${key}/${verdict}`;
    const r = await runWithBackoff(
      () => runExecution({ code: probe.code, language: key, testCases: probe.cases, cpp_signature: probe.sig }),
      { expectation: 'pass', maxRetries: MAX_RETRIES, stats, onRetry, label },
    );

    // The verdict matrix asks a different question from "did it pass", so read the raw
    // kinds rather than the pass/reject classification.
    const cases = r.out?.results || [];
    const kinds = [...new Set(cases.map((x) => x.error_kind).filter(Boolean))];
    const passed = r.out?.pass_count ?? 0;
    const total = r.out?.total ?? 0;

    let ok;
    let observed;
    if (r.result === RESULT.PROVIDER_THROTTLED || r.result === RESULT.PROVIDER_FAILURE) {
      ok = false;
      observed = r.result;
    } else if (probe.expectPassing) {
      ok = total > 0 && passed === total;
      observed = ok ? 'accepted' : (kinds.join(',') || 'not accepted');
    } else {
      ok = passed < total && kinds.includes(probe.expectKind);
      observed = kinds.join(',') || 'no error kind reported';
    }

    report.verdicts[label] = {
      expected: verdict,
      observed,
      ok,
      compile_error_source: verdict === 'compile_error' ? COMPILE_ERROR_SOURCE[key] : undefined,
      pass_count: passed,
      total,
      provider_result: r.result,
      attempts: r.attempts,
    };
    if (!ok && r.result !== RESULT.PROVIDER_THROTTLED) {
      fail('verdicts', `${label}: expected ${verdict}, observed ${observed}`);
    }
    stats.record(ok ? RESULT.PASS : (r.result === RESULT.PROVIDER_THROTTLED ? RESULT.PROVIDER_THROTTLED : RESULT.PRODUCT_FAILURE));
    return { key, verdict, ok, observed, reason: r.reason, providerResult: r.result };
  });

  const w = 20;
  console.log(`  ${'language'.padEnd(12)}${VERDICTS.map((v) => v.padEnd(w)).join('')}`);
  for (const key of prodLangs) {
    const row = VERDICTS.map((v) => {
      const r = results.find((x) => x.key === key && x.verdict === v);
      const cell = r?.ok ? c.g('ok') : c.r(String(r?.observed || 'FAIL')).slice(0, w + 9);
      return cell.padEnd(w + 9);
    });
    console.log(`  ${getLanguage(key).displayName.padEnd(12)}${row.join('')}`);
  }
  console.log(c.d('\n  compile_error comes from a real compiler for C++/Java/C/C#. JavaScript and Python'));
  console.log(c.d('  have no compile step, so it is a Node/CPython PARSE failure reclassified from'));
  console.log(c.d('  runtime_error (defect D10). The separate local path — no function at all, decided'));
  console.log(c.d('  without touching the provider — is covered by tests/unit/entrypoint-extraction.test.js.'));

  for (const r of results.filter((x) => !x.ok)) {
    console.log(`  ${c.r('-')} ${r.key}/${r.verdict}: observed ${r.observed} ${c.d(r.reason || '')}`);
  }
}

// ---------------------------------------------------------------------------
// PROVIDER TIER C — starter compile matrix
// ---------------------------------------------------------------------------
if (RUN_STARTERS) {
  head(`provider: starter compile matrix (${EXHAUSTIVE ? 'exhaustive' : 'one problem per type shape'})`);

  const BAD = new Set(['compile_error', 'harness_error']);
  const summary = [];

  for (const key of prodLangs) {
    const def = getLanguage(key);
    if (!resolveStarterRenderer(key)) {
      console.log(`${c.d('skip')} ${def.displayName.padEnd(12)} ${c.d('no generated starter to compile')}`);
      continue;
    }
    const { capable, excluded } = capability[key];
    let targets = capable
      .map((p) => ({ p, shape: signatureShape(p.cpp_signature), tcase: representativeCase(p) }))
      .filter((t) => t.tcase && t.p.starter_code?.[key]);

    if (!EXHAUSTIVE) {
      const seen = new Set();
      targets = targets.filter((t) => (seen.has(t.shape) ? false : seen.add(t.shape)));
    }

    const t0 = Date.now();
    const results = await pool(targets, CONCURRENCY, async ({ p, tcase, shape }) => {
      const label = `${key}/${p.slug}`;
      const r = await runWithBackoff(
        () => runExecution({
          code: p.starter_code[key], language: key, testCases: [tcase], cpp_signature: p.cpp_signature,
        }),
        // `any`: a bare starter returns a zero value, so Wrong Answer is the CORRECT
        // outcome and a coincidental pass is meaningless. The only claim is that the
        // program built and ran, judged from error_kind below.
        { expectation: 'any', maxRetries: MAX_RETRIES, stats, onRetry, label },
      );
      const kind = r.out?.results?.[0]?.error_kind || (r.out?.results?.[0]?.passed ? 'passed' : 'unknown');
      const compiled = r.result !== RESULT.PROVIDER_THROTTLED
        && r.result !== RESULT.PROVIDER_FAILURE
        && !BAD.has(kind) && kind !== 'unknown';
      return { slug: p.slug, shape, kind, compiled, providerResult: r.result, reason: r.reason };
    });

    const failed = results.filter((x) => !x.compiled && x.providerResult !== RESULT.PROVIDER_THROTTLED);
    const throttled = results.filter((x) => x.providerResult === RESULT.PROVIDER_THROTTLED);
    const shapes = new Set(results.map((x) => x.shape));

    console.log(`${tick(!failed.length)} ${def.displayName.padEnd(12)} ${results.length} starters, `
      + `${shapes.size} shapes, ${excluded.length} excluded, ${((Date.now() - t0) / 1000).toFixed(0)}s`
      + `${throttled.length ? c.y(`, ${throttled.length} throttled`) : ''}`);
    for (const f of failed) {
      console.log(`     ${c.r('-')} ${f.slug}: ${f.kind} ${c.d(f.reason || '')}`);
      fail('starter-compile', `${key}/${f.slug}: ${f.kind} ${f.reason || ''}`);
    }
    for (const t of throttled) console.log(`     ${c.y('~')} ${t.slug}: throttled after retries, NOT counted as a failure`);

    summary.push({ language: def.displayName, checked: results.length, shapes: shapes.size, excluded: excluded.length, failed: failed.length, throttled: throttled.length });
    report.starters[key] = {
      mode: EXHAUSTIVE ? 'exhaustive' : 'sampled-by-shape',
      checked: results.length, shapes: shapes.size, excluded: excluded.length,
      failed: failed.map((f) => ({ slug: f.slug, kind: f.kind, reason: f.reason })),
      throttled: throttled.map((t) => t.slug),
    };
    for (const r of results) stats.record(r.compiled ? RESULT.PASS : (r.providerResult === RESULT.PROVIDER_THROTTLED ? RESULT.PROVIDER_THROTTLED : RESULT.HARNESS_FAILURE));
  }

  if (summary.length) {
    console.log(`\n  ${'language'.padEnd(12)}${'checked'.padStart(8)}${'shapes'.padStart(8)}${'excluded'.padStart(10)}${'failed'.padStart(8)}${'throttled'.padStart(11)}`);
    for (const s of summary) {
      console.log(`  ${s.language.padEnd(12)}${String(s.checked).padStart(8)}${String(s.shapes).padStart(8)}`
        + `${String(s.excluded).padStart(10)}${(s.failed ? c.r(String(s.failed)) : c.g('0')).padStart(8 + 9)}`
        + `${(s.throttled ? c.y(String(s.throttled)) : '0').padStart(11)}`);
    }
  }
}

// ===========================================================================
// Summary
// ===========================================================================
head('capability matrix');

const starterValid = (key) => {
  const s = report.local[`starters_${key}`];
  if (!s) return '-';
  if (s.skipped) return 'n/a (hand-written)';
  return s.errors?.length ? c.r(`${s.rendered - s.drifted - s.missing}/${s.checked}`) : c.g(`${s.rendered}/${s.checked}`);
};
const providerValidated = (key) => {
  if (!RUN_STARTERS && !RUN_CANONICAL) return c.d('not run');
  const s = report.starters[key];
  const canonicalPairs = Object.entries(report.canonical).filter(([k]) => k.startsWith(`${key}/`));
  const canonicalBad = canonicalPairs.filter(([, v]) => isBlocking(v.result)).length;
  const bits = [];
  if (canonicalPairs.length) bits.push(canonicalBad ? c.r(`corpus ${canonicalPairs.length - canonicalBad}/${canonicalPairs.length}`) : c.g(`corpus ${canonicalPairs.length}`));
  if (s) bits.push(s.failed.length ? c.r(`starters ${s.checked - s.failed.length}/${s.checked}`) : c.g(`starters ${s.checked}`));
  return bits.join(' ') || c.d('not run');
};

console.log(`  ${'language'.padEnd(12)}${'total'.padStart(7)}${'capable'.padStart(9)}${'excl'.padStart(6)}   ${'starter valid'.padEnd(22)}provider validated`);
for (const key of prodLangs) {
  const cap = report.capability[key];
  console.log(`  ${getLanguage(key).displayName.padEnd(12)}${String(cap.total).padStart(7)}`
    + `${String(cap.capable).padStart(9)}${String(cap.excluded).padStart(6)}   `
    + `${starterValid(key).padEnd(22 + 9)}${providerValidated(key)}`);
}

if (ANY_PROVIDER) {
  head('provider execution accounting');
  const s = stats.toJSON();
  console.log(`  executions        ${s.executions}`);
  console.log(`  passes            ${s.passes}`);
  console.log(`  failures          ${s.failures ? c.r(s.failures) : c.g(0)}`);
  console.log(`  throttled (429)   ${s.throttles ? c.y(s.throttles) : 0}`);
  console.log(`  retries spent     ${s.retries}`);
  console.log(`  provider time     ${s.provider_seconds}s`);
  console.log(c.d('\n  A throttle is not a failure. It is recorded because the Paiza -> Judge0 migration'));
  console.log(c.d('  needs to know what this provider rations us at, and because Phase 2D lost time to a'));
  console.log(c.d('  429 that the old gate reported as a harness error.'));
  report.provider_stats = s;
}

report.failures = problems;

head('verdict');
if (!problems.length) {
  console.log(c.g(`  PASS — ${prodLangs.length} production languages, ${allProblems.length} problems, `
    + `${harnessPairs} problem/language harness pairs generated`
    + `${ANY_PROVIDER ? `, ${stats.executions} provider executions` : ', local tier only'}.`));
  if (!ANY_PROVIDER) {
    console.log(c.y('  This run proved GENERATION only. It did not execute anything.'));
    console.log(c.y('  A release needs --release, which compiles and runs every pair on the provider.'));
  }
} else {
  console.log(c.r(`  FAIL — ${problems.length} problem(s):`));
  const byCat = {};
  for (const p of problems) (byCat[p.category] ||= []).push(p.detail);
  for (const [cat, list] of Object.entries(byCat)) {
    console.log(c.r(`\n  ${cat} (${list.length})`));
    for (const d of list.slice(0, 20)) console.log(`    - ${d}`);
    if (list.length > 20) console.log(c.d(`    ...and ${list.length - 20} more`));
  }
}
console.log('');

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  console.log(c.d(`  machine-readable report written to ${JSON_OUT}\n`));
}

process.exit(problems.length ? 1 : 0);
