#!/usr/bin/env node
/**
 * scratch/scripts/baseline/capture-pp-selectors.mjs
 *
 * Sprint 3, Task 7.1: Capture pre-Sprint-3 Pp_Class_Selector baseline.
 *
 * Walks scratch/tests/*.spec.ts, extracts every literal `.pp-*` / `.pp2-*`
 * CSS selector token (including BEM modifiers like `.pp-tab--active`), and
 * writes a snapshot to scratch/scripts/baseline/pp-selectors.json.
 *
 * The snapshot is consumed by Task 7.9 (Pp_Class_Selector additivity
 * verification) to assert that Sprint 3's data-testid additions are
 * purely additive — every recorded selector must continue to match the
 * same DOM element set after Sprint 3.
 *
 * Selector grammar:
 *   /\bpp2?-[a-zA-Z0-9_-]+\b/g
 *   - Word-boundary anchored on both sides.
 *   - Captures `pp-` and `pp2-` prefixes.
 *   - Captures BEM-style suffixes: `__element`, `--modifier`.
 *
 * Why a word boundary, not a literal leading `.`:
 * The Playwright suite references Pp_Class_Selector tokens in three forms,
 * all of which target the same underlying CSS classname:
 *   1. Dot-prefixed CSS selectors:    `page.locator('.pp-tab')`
 *   2. Regex literals on classnames:  `toHaveClass(/pp-tab--active/)`
 *   3. Quoted classname substrings:   `cls.toContain('pp-collapsible--open')`
 * The Pp_Class_Selector definition in requirements.md is "an existing CSS
 * classname matching the `pp-*` or `pp2-*` prefix that the current Playwright
 * suite already targets" — i.e. the classname itself, independent of how the
 * source string spells it. The word-boundary regex captures every literal
 * occurrence, which is what Task 7.9's additivity check needs.
 *
 * Dynamic alternations like `pp-status-banner--(accepted|wrong|tle|error)`
 * are recorded as their literal prefix `pp-status-banner`; the modifier
 * classes are asserted at runtime by the test that owns the regex and do not
 * need to be enumerated here.
 *
 * Requirements: 3.6.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scratch/scripts/baseline/ -> scratch/
const SCRATCH_DIR = path.resolve(__dirname, '..', '..');
const TESTS_DIR = path.join(SCRATCH_DIR, 'tests');
const OUTPUT_PATH = path.join(__dirname, 'pp-selectors.json');
const SPEC_BASELINE_DOC = path.join(SCRATCH_DIR, 'docs', 'spec-baseline.md');

const SELECTOR_RE = /\bpp2?-[a-zA-Z0-9_-]+\b/g;

function readSpecBaselineSha() {
  const md = readFileSync(SPEC_BASELINE_DOC, 'utf8');
  // Match a 40-char hex git SHA from the spec-baseline doc.
  const m = md.match(/`([0-9a-f]{40})`/);
  if (!m) {
    throw new Error(
      `Could not find a 40-char git SHA in ${SPEC_BASELINE_DOC}`,
    );
  }
  return m[1];
}

function extractSelectorsFromFile(absPath) {
  const src = readFileSync(absPath, 'utf8');
  const found = new Set();
  for (const match of src.matchAll(SELECTOR_RE)) {
    found.add(match[0]);
  }
  return [...found].sort();
}

function main() {
  const specBaselineSha = readSpecBaselineSha();
  const specFiles = readdirSync(TESTS_DIR)
    .filter((name) => name.endsWith('.spec.ts'))
    .sort();

  const filesEntry = {};
  const allSelectors = new Set();

  for (const name of specFiles) {
    const abs = path.join(TESTS_DIR, name);
    const selectors = extractSelectorsFromFile(abs);
    filesEntry[name] = selectors;
    for (const s of selectors) allSelectors.add(s);
  }

  const snapshot = {
    spec_baseline_sha: specBaselineSha,
    captured_at: new Date().toISOString(),
    source_glob: 'scratch/tests/*.spec.ts',
    selector_pattern: '\\bpp2?-[a-zA-Z0-9_-]+\\b',
    files: filesEntry,
    all_selectors_unique: [...allSelectors].sort(),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  // Brief summary to stdout for the runner.
  const totalUnique = snapshot.all_selectors_unique.length;
  const fileCount = specFiles.length;
  console.log(
    `[capture-pp-selectors] wrote ${path.relative(SCRATCH_DIR, OUTPUT_PATH)} ` +
      `(${totalUnique} unique selectors across ${fileCount} spec files, ` +
      `Spec_Baseline=${specBaselineSha.slice(0, 7)}).`,
  );
}

main();
