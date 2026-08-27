#!/usr/bin/env node
/**
 * scratch/scripts/baseline/verify.mjs
 *
 * Per-sprint baseline verifier for the platform-architecture-consolidation
 * spec. Implements the seven post-sprint checks defined in design.md
 * ("Sprint 7 — Hard Preservation Verification") and writes a PASS/FAIL
 * summary to scratch/docs/sprint-<N>-exit.md.
 *
 * Checks:
 *   1. (7.3)  Schema dirs/files untouched vs Spec_Baseline.
 *   2. (7.4)  Intelligence engines + learning-service + execution-engine
 *             byte-identical vs Spec_Baseline.
 *      (7.5)  Sprint 6 carve-out: only addition of learning-context.js
 *             permitted under scratch/server/learning-engine/.
 *   3. (7.12) scratch/server/{index.js, middleware/, auth/} untouched.
 *   4. (7.10) react / react-dom / next / express version pins in
 *             scratch/package.json untouched vs Spec_Baseline.
 *   5. (2.7)  scratch/src/app/problem/[id]/hooks/{useEditor,useProblem,
 *             useSubmission}.ts byte-identical vs Spec_Baseline.
 *   6. (7.8)  `npx tsc --noEmit` exits 0 from scratch/.
 *   7. (7.6)  `npx playwright test` exits 0 from workspace root.
 *   8. ()     `npm run gate:regression` exits 0 from scratch/.
 *
 * Usage:
 *   node scratch/scripts/baseline/verify.mjs --sprint 1
 *   SPRINT=2 node scratch/scripts/baseline/verify.mjs
 *   node scratch/scripts/baseline/verify.mjs --sprint 6 --skip-playwright
 *
 * Exits 0 on PASS, 1 on FAIL, 2 on usage error.
 *
 * Requirements: 2.7, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10, 7.12.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scratch/scripts/baseline/verify.mjs -> scratch/
const SCRATCH_DIR = path.resolve(__dirname, '..', '..');
// scratch/ -> repo root
const WORKSPACE_DIR = path.resolve(SCRATCH_DIR, '..');

// --------------------------------------------------------------------------
// Path constants — keep these in sync with requirements.md and design.md.
// --------------------------------------------------------------------------

// 7.4: byte-identical vs Spec_Baseline (intelligence engines + service +
// execution-engine source files).
const ENGINE_FILES = [
  'scratch/server/learning-engine/intelligence-engine.js',
  'scratch/server/learning-engine/predictive-engine.js',
  'scratch/server/learning-engine/code-analysis-engine.js',
  'scratch/server/learning-engine/knowledge-graph-engine.js',
  'scratch/server/learning-engine/learning-service.js',
  'scratch/server/learning-engine/execution-engine.js',
];

// 7.5: only this file may be ADDED under scratch/server/learning-engine/
// post-Sprint-6.
const SPRINT6_PERMITTED_ADDITION =
  'scratch/server/learning-engine/learning-context.js';

// 7.12: byte-identical vs Spec_Baseline.
const SERVER_GUARDED_PATHS = [
  'scratch/server/index.js',
  'scratch/server/middleware',
  'scratch/server/auth',
];

// 7.10: pinned dependency keys in scratch/package.json.
const PINNED_DEPS = ['react', 'react-dom', 'next', 'express'];

// 2.7: hooks that MUST stay byte-identical to Spec_Baseline at every sprint.
// Path uses the literal Next.js dynamic-route segment "[id]".
const HOOK_FILES = [
  'scratch/src/app/problem/[id]/hooks/useEditor.ts',
  'scratch/src/app/problem/[id]/hooks/useProblem.ts',
  'scratch/src/app/problem/[id]/hooks/useSubmission.ts',
];

// --------------------------------------------------------------------------
// CLI parsing.
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { sprint: null, skip: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sprint' || a === '-s') {
      out.sprint = argv[++i];
    } else if (a.startsWith('--sprint=')) {
      out.sprint = a.slice('--sprint='.length);
    } else if (a === '--skip-playwright') {
      out.skip.add('playwright');
    } else if (a === '--skip-tsc') {
      out.skip.add('tsc');
    } else if (a === '--skip-gate') {
      out.skip.add('gate');
    } else if (a === '--skip-spawns') {
      out.skip.add('playwright');
      out.skip.add('tsc');
      out.skip.add('gate');
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  if (!out.sprint && process.env.SPRINT) out.sprint = process.env.SPRINT;
  if (process.env.VERIFY_SKIP) {
    for (const s of process.env.VERIFY_SKIP.split(',')) out.skip.add(s.trim());
  }
  return out;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scratch/scripts/baseline/verify.mjs --sprint <N> [flags]',
      '',
      'Flags:',
      '  --sprint <N>, -s <N>   Sprint number (1-6). Required (or set $SPRINT).',
      '  --skip-tsc             Skip the `tsc --noEmit` check.',
      '  --skip-playwright      Skip the `playwright test` check.',
      '  --skip-gate            Skip the `npm run gate:regression` check.',
      '  --skip-spawns          Skip all three subprocess checks.',
      '  --help, -h             Show this help.',
      '',
      'Env vars:',
      '  SPRINT                 Same as --sprint.',
      '  VERIFY_SKIP            Comma-separated subset of: tsc,playwright,gate.',
      '',
      'Output: scratch/docs/sprint-<N>-exit.md',
      '',
    ].join('\n'),
  );
}

// --------------------------------------------------------------------------
// Spec_Baseline resolution.
// --------------------------------------------------------------------------

function readBaseline() {
  const p = path.join(SCRATCH_DIR, 'docs', 'spec-baseline.md');
  if (!existsSync(p)) {
    return {
      sha: null,
      source: p,
      error: `spec-baseline.md not found at ${path.relative(WORKSPACE_DIR, p)}`,
    };
  }
  const txt = readFileSync(p, 'utf8');
  const full = txt.match(/\b[0-9a-f]{40}\b/i);
  const short = txt.match(/\b[0-9a-f]{7,12}\b/i);
  const sha = (full && full[0]) || (short && short[0]) || null;
  if (!sha) {
    return {
      sha: null,
      source: p,
      error: 'no git sha found in spec-baseline.md (expected 7-40 hex chars)',
    };
  }
  // Verify the sha resolves to a commit.
  const r = spawnSync('git', ['rev-parse', '--verify', `${sha}^{commit}`], {
    cwd: WORKSPACE_DIR,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    return {
      sha: null,
      source: p,
      error: `git rev-parse failed for ${sha}: ${(r.stderr || '').trim()}`,
    };
  }
  return { sha: r.stdout.trim(), source: p };
}

// --------------------------------------------------------------------------
// Git helpers.
// --------------------------------------------------------------------------

function git(args) {
  return spawnSync('git', args, {
    cwd: WORKSPACE_DIR,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function gitDiffNameStatus(baseline, paths) {
  const r = git([
    'diff',
    '--name-status',
    '-M',
    `${baseline}..HEAD`,
    '--',
    ...paths,
  ]);
  if (r.status !== 0) {
    return {
      ok: false,
      error: (r.stderr || '').trim() || `git exited ${r.status}`,
      entries: [],
    };
  }
  const entries = r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t/);
      // For renames the line is "Rxxx\told\tnew" — record the new path.
      const status = parts[0];
      const file = parts[parts.length - 1];
      return { status, file };
    });
  return { ok: true, entries };
}

function gitShow(ref, file) {
  const r = git(['show', `${ref}:${file}`]);
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || '').trim() };
  }
  return { ok: true, content: r.stdout };
}

// --------------------------------------------------------------------------
// Individual checks.
// --------------------------------------------------------------------------

// 7.3 — schema files under scratch/server/scripts/ and any *.sql under
// scratch/server/.
function check_7_3_schema(baseline) {
  const name = '7.3 schema dirs/files untouched';
  const a = gitDiffNameStatus(baseline, ['scratch/server/scripts']);
  if (!a.ok) {
    return { ok: false, name, detail: `git error: ${a.error}` };
  }
  // Use git pathspec :(glob) magic to match all *.sql under scratch/server/.
  const b = gitDiffNameStatus(baseline, [':(glob)scratch/server/**/*.sql']);
  if (!b.ok) {
    return { ok: false, name, detail: `git error: ${b.error}` };
  }
  const seen = new Map();
  for (const e of [...a.entries, ...b.entries]) {
    seen.set(e.file, e.status);
  }
  if (seen.size === 0) {
    return {
      ok: true,
      name,
      detail:
        'no diffs under scratch/server/scripts/ or scratch/server/**/*.sql',
    };
  }
  const list = [...seen.entries()]
    .map(([f, s]) => `${s}\t${f}`)
    .join('\n  ');
  return { ok: false, name, detail: `Modified files:\n  ${list}` };
}

// 7.4/7.5 — engine files byte-identical, with Sprint 6 carve-out for
// learning-context.js addition.
function check_7_4_7_5_engines(baseline, sprintNum) {
  const namePre = '7.4 intelligence/service/execution engines untouched';
  const namePost =
    '7.4/7.5 engines untouched modulo Sprint 6 facade addition';

  // Strict per-file check: none of the engine/service/execution files may
  // change at any sprint.
  const r = gitDiffNameStatus(baseline, ENGINE_FILES);
  if (!r.ok) {
    return {
      ok: false,
      name: sprintNum >= 6 ? namePost : namePre,
      detail: `git error: ${r.error}`,
    };
  }
  if (r.entries.length > 0) {
    const list = r.entries
      .map((e) => `${e.status}\t${e.file}`)
      .join('\n  ');
    return {
      ok: false,
      name: sprintNum >= 6 ? namePost : namePre,
      detail: `Engine files modified vs Spec_Baseline:\n  ${list}`,
    };
  }

  // Directory-level check: nothing else under scratch/server/learning-engine/
  // may change either, except the Sprint 6 facade addition.
  const dir = gitDiffNameStatus(baseline, [
    'scratch/server/learning-engine',
  ]);
  if (!dir.ok) {
    return {
      ok: false,
      name: sprintNum >= 6 ? namePost : namePre,
      detail: `git error: ${dir.error}`,
    };
  }

  if (sprintNum >= 6) {
    const offending = dir.entries.filter(
      (e) => !(e.status === 'A' && e.file === SPRINT6_PERMITTED_ADDITION),
    );
    if (offending.length > 0) {
      const list = offending
        .map((e) => `${e.status}\t${e.file}`)
        .join('\n  ');
      return {
        ok: false,
        name: namePost,
        detail:
          `Disallowed changes under scratch/server/learning-engine/:\n  ${list}\n` +
          `(Only "A\t${SPRINT6_PERMITTED_ADDITION}" is permitted post-Sprint-6.)`,
      };
    }
    const added = dir.entries.find(
      (e) => e.status === 'A' && e.file === SPRINT6_PERMITTED_ADDITION,
    );
    return {
      ok: true,
      name: namePost,
      detail: added
        ? `only ${SPRINT6_PERMITTED_ADDITION} added`
        : 'no diffs under scratch/server/learning-engine/',
    };
  }

  // Pre-Sprint-6: no additions/changes anywhere under learning-engine.
  if (dir.entries.length > 0) {
    const list = dir.entries
      .map((e) => `${e.status}\t${e.file}`)
      .join('\n  ');
    return {
      ok: false,
      name: namePre,
      detail:
        `Pre-Sprint-6 changes detected under scratch/server/learning-engine/:\n  ${list}`,
    };
  }
  return {
    ok: true,
    name: namePre,
    detail: 'no diffs under scratch/server/learning-engine/',
  };
}

// 7.12 — server index/middleware/auth byte-identical.
function check_7_12_server_guarded(baseline) {
  const name = '7.12 server index/middleware/auth untouched';
  const r = gitDiffNameStatus(baseline, SERVER_GUARDED_PATHS);
  if (!r.ok) {
    return { ok: false, name, detail: `git error: ${r.error}` };
  }
  if (r.entries.length === 0) {
    return { ok: true, name, detail: 'no diffs' };
  }
  const list = r.entries
    .map((e) => `${e.status}\t${e.file}`)
    .join('\n  ');
  return { ok: false, name, detail: `Modified:\n  ${list}` };
}

// 7.10 — react/react-dom/next/express version specifiers byte-identical.
function check_7_10_pkg_pins(baseline) {
  const name = '7.10 react/react-dom/next/express pins untouched';
  const head = gitShow('HEAD', 'scratch/package.json');
  if (!head.ok) {
    return {
      ok: false,
      name,
      detail: `git show HEAD:scratch/package.json failed: ${head.error}`,
    };
  }
  const base = gitShow(baseline, 'scratch/package.json');
  if (!base.ok) {
    return {
      ok: false,
      name,
      detail: `git show ${baseline}:scratch/package.json failed: ${base.error}`,
    };
  }
  let hPkg;
  let bPkg;
  try {
    hPkg = JSON.parse(head.content);
  } catch (e) {
    return {
      ok: false,
      name,
      detail: `HEAD scratch/package.json parse error: ${e.message}`,
    };
  }
  try {
    bPkg = JSON.parse(base.content);
  } catch (e) {
    return {
      ok: false,
      name,
      detail: `Spec_Baseline scratch/package.json parse error: ${e.message}`,
    };
  }
  const hd = {
    ...(hPkg.dependencies || {}),
    ...(hPkg.devDependencies || {}),
  };
  const bd = {
    ...(bPkg.dependencies || {}),
    ...(bPkg.devDependencies || {}),
  };
  const drift = [];
  for (const dep of PINNED_DEPS) {
    if (hd[dep] !== bd[dep]) {
      drift.push({
        dep,
        baseline: bd[dep] === undefined ? '(missing)' : bd[dep],
        head: hd[dep] === undefined ? '(missing)' : hd[dep],
      });
    }
  }
  if (drift.length === 0) {
    const summary = PINNED_DEPS.map(
      (d) => `${d}=${hd[d] === undefined ? '(missing)' : hd[d]}`,
    ).join(' ');
    return { ok: true, name, detail: `pins unchanged: ${summary}` };
  }
  const detail = drift
    .map((d) => `${d.dep}: ${d.baseline} -> ${d.head}`)
    .join('; ');
  return { ok: false, name, detail: `Pinned dep drift: ${detail}` };
}

// 2.7 — useEditor / useProblem / useSubmission byte-identical vs
// Spec_Baseline. Exported function names, parameter lists, parameter types,
// and return-value types are all preserved as a consequence of an empty diff.
function check_2_7_hooks(baseline) {
  const name =
    '2.7 useEditor/useProblem/useSubmission byte-identical to Spec_Baseline';
  const r = gitDiffNameStatus(baseline, HOOK_FILES);
  if (!r.ok) {
    return { ok: false, name, detail: `git error: ${r.error}` };
  }
  if (r.entries.length === 0) {
    return { ok: true, name, detail: 'no diffs across hook trio' };
  }
  const list = r.entries
    .map((e) => `${e.status}\t${e.file}`)
    .join('\n  ');
  return {
    ok: false,
    name,
    detail: `Hook files modified vs Spec_Baseline:\n  ${list}`,
  };
}

// --------------------------------------------------------------------------
// Subprocess checks (slow).
// --------------------------------------------------------------------------

function runShell(name, command, args, cwd, skip) {
  if (skip) {
    return { ok: false, name, detail: 'SKIPPED via flag/env', skipped: true };
  }
  const rel = path.relative(WORKSPACE_DIR, cwd) || '.';
  process.stdout.write(
    `\n[verify] running ${name}: ${command} ${args.join(' ')} (cwd=${rel})\n`,
  );
  const r = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  if (r.error) {
    return { ok: false, name, detail: `spawn error: ${r.error.message}` };
  }
  if (r.status === 0) {
    return { ok: true, name, detail: 'exit 0' };
  }
  return { ok: false, name, detail: `exit ${r.status}` };
}

function check_7_8_tsc(skip) {
  return runShell(
    '7.8 tsc --noEmit clean',
    'npx',
    ['tsc', '--noEmit'],
    SCRATCH_DIR,
    skip,
  );
}

function check_7_6_playwright(skip) {
  return runShell(
    '7.6 playwright test passing',
    'npx',
    ['playwright', 'test'],
    WORKSPACE_DIR,
    skip,
  );
}

function check_gate_regression(skip) {
  return runShell(
    'gate:regression passing',
    'npm',
    ['run', 'gate:regression'],
    SCRATCH_DIR,
    skip,
  );
}

// --------------------------------------------------------------------------
// Reporting.
// --------------------------------------------------------------------------

function statusTag(r) {
  if (r.skipped) return 'SKIP';
  return r.ok ? 'PASS' : 'FAIL';
}

function writeExitReport(sprint, results, summary, baselineInfo) {
  const docsDir = path.join(SCRATCH_DIR, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  const out = path.join(docsDir, `sprint-${sprint}-exit.md`);
  const ts = new Date().toISOString();

  const lines = [];
  // Single-line PASS/FAIL summary first (mandated by task description).
  lines.push(
    `Sprint ${sprint} exit: ${summary.overall} (${summary.passed} pass, ${summary.failed} fail, ${summary.skipped} skip / ${summary.total} total) — ${ts}`,
  );
  lines.push('');
  lines.push(`# Sprint ${sprint} Exit Report`);
  lines.push('');
  lines.push(
    `Generated by \`scratch/scripts/baseline/verify.mjs\` at ${ts}.`,
  );
  if (baselineInfo && baselineInfo.sha) {
    lines.push('');
    lines.push(`**Spec_Baseline**: \`${baselineInfo.sha}\``);
  } else if (baselineInfo) {
    lines.push('');
    lines.push(`**Spec_Baseline**: _unresolved — ${baselineInfo.error}_`);
  }
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  lines.push('| Check | Status | Detail |');
  lines.push('|---|---|---|');
  for (const r of results) {
    const detail = (r.detail || '').split(/\r?\n/)[0];
    lines.push(
      `| ${r.name} | ${statusTag(r)} | ${detail.replace(/\|/g, '\\|')} |`,
    );
  }
  lines.push('');
  const failures = results.filter((r) => !r.ok && !r.skipped);
  if (failures.length > 0) {
    lines.push('## Failure Details');
    lines.push('');
    for (const f of failures) {
      lines.push(`### ${f.name}`);
      lines.push('');
      lines.push('```');
      lines.push(f.detail || '(no detail)');
      lines.push('```');
      lines.push('');
    }
  }

  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  return out;
}

// --------------------------------------------------------------------------
// Main.
// --------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (!args.sprint) {
    process.stderr.write(
      'verify.mjs: missing sprint number. Pass --sprint <N> or set SPRINT.\n',
    );
    printHelp();
    process.exit(2);
  }
  const sprintRaw = String(args.sprint).trim();
  const sprintNum = Number.parseInt(sprintRaw, 10);
  if (!Number.isFinite(sprintNum) || sprintNum < 1) {
    process.stderr.write(
      `verify.mjs: invalid sprint number "${sprintRaw}". Must be a positive integer.\n`,
    );
    process.exit(2);
  }

  const baseline = readBaseline();
  const results = [];

  if (!baseline.sha) {
    const detail = `Spec_Baseline unresolved: ${baseline.error}`;
    results.push({ ok: false, name: '7.3 schema dirs/files untouched', detail });
    results.push({
      ok: false,
      name:
        sprintNum >= 6
          ? '7.4/7.5 engines untouched modulo Sprint 6 facade addition'
          : '7.4 intelligence/service/execution engines untouched',
      detail,
    });
    results.push({
      ok: false,
      name: '7.12 server index/middleware/auth untouched',
      detail,
    });
    results.push({
      ok: false,
      name: '7.10 react/react-dom/next/express pins untouched',
      detail,
    });
    results.push({
      ok: false,
      name:
        '2.7 useEditor/useProblem/useSubmission byte-identical to Spec_Baseline',
      detail,
    });
    process.stderr.write(`[verify] ${detail}\n`);
  } else {
    const rel = path.relative(WORKSPACE_DIR, baseline.source);
    process.stdout.write(
      `[verify] Spec_Baseline: ${baseline.sha} (from ${rel})\n`,
    );
    results.push(check_7_3_schema(baseline.sha));
    results.push(check_7_4_7_5_engines(baseline.sha, sprintNum));
    results.push(check_7_12_server_guarded(baseline.sha));
    results.push(check_7_10_pkg_pins(baseline.sha));
    results.push(check_2_7_hooks(baseline.sha));
  }

  results.push(check_7_8_tsc(args.skip.has('tsc')));
  results.push(check_7_6_playwright(args.skip.has('playwright')));
  results.push(check_gate_regression(args.skip.has('gate')));

  const failed = results.filter((r) => !r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const passed = results.filter((r) => r.ok).length;
  const overall = failed === 0 ? 'PASS' : 'FAIL';
  const summary = {
    overall,
    failed,
    skipped,
    passed,
    total: results.length,
  };

  process.stdout.write('\n');
  process.stdout.write(
    `[verify] Sprint ${sprintNum} summary: ${overall} ` +
      `(${passed} pass, ${failed} fail, ${skipped} skip / ${results.length} total)\n`,
  );
  for (const r of results) {
    const tag = statusTag(r);
    const firstLine = (r.detail || '').split(/\r?\n/)[0];
    process.stdout.write(`  [${tag}] ${r.name} — ${firstLine}\n`);
  }

  const reportPath = writeExitReport(sprintNum, results, summary, baseline);
  process.stdout.write(
    `[verify] Exit report: ${path.relative(WORKSPACE_DIR, reportPath)}\n`,
  );

  process.exit(failed === 0 ? 0 : 1);
}

main();
