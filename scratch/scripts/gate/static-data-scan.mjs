#!/usr/bin/env node
/**
 * scratch/scripts/gate/static-data-scan.mjs
 *
 * Static-data drift guard for the platform-architecture-consolidation spec
 * (Sprint 9, Requirement 9). Walks the Modern_Route scope and the server
 * scope and detects ES `import`, TS `import type`, and CommonJS `require(...)`
 * specifiers that resolve to `**\/src/data/**`.
 *
 *   * Modern_Route scope — `scratch/src/app/**\/*.{ts,tsx}` excluding
 *     `scratch/src/app/components/legacy-host/**` — is zero-tolerance:
 *     ANY hit is a violation.
 *   * Server scope — `scratch/server/**\/*.js` — honors the allow-list at
 *     `scratch/scripts/gate/allow-list.json`. Any resolved path NOT in
 *     the allow-list is a violation.
 *
 * On violation, the report enumerates `{ importer, specifier, resolved }`
 * for every offender and dumps the full allow-list as JSON.
 *
 * On any unreadable input (allow-list, directory walk error, or file-read
 * error), the script logs the offending path and exits non-zero. It NEVER
 * silently exits 0 when an input could not be read.
 *
 * Wire-up:
 *   `"gate:regression": "node scripts/gate/static-data-scan.mjs"` in
 *   scratch/package.json. Run from the scratch/ workspace as
 *   `npm run gate:regression`.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 7.10.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scratch/scripts/gate/static-data-scan.mjs -> scratch/
const SCRATCH_DIR = path.resolve(__dirname, '..', '..');
// scratch/ -> repo root (workspace).
const WORKSPACE_DIR = path.resolve(SCRATCH_DIR, '..');

const MODERN_ROUTE_ROOT = path.join(SCRATCH_DIR, 'src', 'app');
const MODERN_ROUTE_EXCLUDE = path.join(
  SCRATCH_DIR,
  'src',
  'app',
  'components',
  'legacy-host'
);
const SERVER_ROOT = path.join(SCRATCH_DIR, 'server');
const ALLOW_LIST_PATH = path.join(__dirname, 'allow-list.json');

const MODERN_ROUTE_EXTENSIONS = new Set(['.ts', '.tsx']);
const SERVER_EXTENSIONS = new Set(['.js']);

// Path token marking a static-data file. Forward-slash form to match
// normalized paths regardless of host OS.
const STATIC_DATA_TOKEN = '/src/data/';

// Directories to skip during recursive walks. Defensive: none of these
// should appear inside scratch/src/app or scratch/server in practice, but
// skipping them keeps the gate fast and resilient to local artifacts.
const ALWAYS_SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
]);

// --------------------------------------------------------------------------
// Specifier extraction.
//
// We strip /* ... */ and // ... line comments before regex-matching to keep
// false positives out of the report. We do NOT attempt to strip string
// literals — false positives there are rare and the violation report makes
// any such case immediately obvious to a reviewer.
//
// All three patterns use a negative lookbehind `(?<![A-Za-z0-9_$])` so that
// identifiers like `myrequire` or `re-import` cannot trigger matches.
// --------------------------------------------------------------------------

// `import [type] <bindings> from '<spec>'`
const IMPORT_FROM_RE =
  /(?<![A-Za-z0-9_$])import\s+(?:type\s+)?[\s\S]*?\s+from\s+(['"])([^'"]+)\1/g;
// Side-effect import: `import '<spec>'`
const IMPORT_BARE_RE = /(?<![A-Za-z0-9_$])import\s+(['"])([^'"]+)\1/g;
// CommonJS require: `require('<spec>')`
const REQUIRE_RE =
  /(?<![A-Za-z0-9_$])require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
// Re-export: `export [type] { ... } from '<spec>'` and `export * from '<spec>'`.
// Sprint 1 / Task 2.2 follow-up: re-exports are equivalent to imports for
// the purpose of dragging static-data symbols into Modern_Route surface,
// so the gate must catch them. Without this, a bridge file like
// `scratch/src/app/lib/learning-content.ts` can re-export from
// `../../data/learning-content.js` without tripping the scan.
const EXPORT_FROM_RE =
  /(?<![A-Za-z0-9_$])export\s+(?:type\s+)?(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[\s\S]*?\})\s+from\s+(['"])([^'"]+)\1/g;

const SPECIFIER_PATTERNS = [
  { name: 'import-from', re: IMPORT_FROM_RE },
  { name: 'import-bare', re: IMPORT_BARE_RE },
  { name: 'require', re: REQUIRE_RE },
  { name: 'export-from', re: EXPORT_FROM_RE },
];

// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

function toForwardSlash(p) {
  return p.replace(/\\/g, '/');
}

function workspaceRel(absPath) {
  return toForwardSlash(path.relative(WORKSPACE_DIR, absPath));
}

function readAllowList(absPath) {
  const raw = readFileSync(absPath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(
      'allow-list.json must be a JSON array of workspace-relative paths'
    );
  }
  // Normalize to forward slashes for comparison.
  return new Set(data.map((entry) => toForwardSlash(String(entry))));
}

function stripComments(src) {
  // Strip /* ... */ blocks first, then // line comments. The line-comment
  // pattern preserves the leading anchor character so it does not eat
  // protocol prefixes like `://` inside string literals.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

function isUnderDir(candidatePath, dirPath) {
  // True when candidatePath is dirPath or a descendant of it. Comparison is
  // case-insensitive to handle Windows path casing inconsistencies.
  const candidate = candidatePath.toLowerCase();
  const dir = dirPath.toLowerCase();
  if (candidate === dir) return true;
  return candidate.startsWith(dir + path.sep.toLowerCase());
}

/**
 * Recursive directory walk. Yields absolute paths to files matching
 * `extensions`. Pushes any I/O error into `errors` (so the caller can
 * fail the whole scan) and skips that subtree.
 */
function* walk(rootDir, excludeDir, extensions, errors) {
  let entries;
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch (err) {
    errors.push({
      path: rootDir,
      reason: `readdir failed: ${err && err.message ? err.message : String(err)}`,
    });
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (ALWAYS_SKIP_DIR_NAMES.has(entry.name)) continue;
      if (excludeDir && isUnderDir(fullPath, excludeDir)) continue;
      yield* walk(fullPath, excludeDir, extensions, errors);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.has(ext)) {
        yield fullPath;
      }
    }
  }
}

function collectSpecifiers(filePath, errors) {
  let src;
  try {
    src = readFileSync(filePath, 'utf8');
  } catch (err) {
    errors.push({
      path: filePath,
      reason: `read failed: ${err && err.message ? err.message : String(err)}`,
    });
    return [];
  }
  const cleaned = stripComments(src);
  const specs = [];
  for (const { re } of SPECIFIER_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(cleaned)) !== null) {
      // Group 2 is the specifier in every pattern.
      specs.push(m[2]);
    }
  }
  return specs;
}

/**
 * Resolves a specifier to an absolute filesystem path that we can match
 * against `**\/src/data/**`. Only relative specifiers (`./` or `../`)
 * can land inside the workspace tree we care about. Non-relative
 * specifiers are npm package names — the codebase has no `@/` alias
 * mapped to `src/` (tsconfig only declares `store` -> `store/index.js`)
 * and no other workspace alias resolves into `src/data/`.
 */
function resolveSpecifierAbs(specifier, importerFile) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return path.resolve(path.dirname(importerFile), specifier);
  }
  return null;
}

function isStaticDataPath(absPath) {
  return toForwardSlash(absPath).includes(STATIC_DATA_TOKEN);
}

// --------------------------------------------------------------------------
// Main.
// --------------------------------------------------------------------------

function main() {
  const ioErrors = [];

  let allowList;
  try {
    allowList = readAllowList(ALLOW_LIST_PATH);
  } catch (err) {
    console.error(
      `[gate:regression] FAIL: cannot read allow-list at ${ALLOW_LIST_PATH}: ${
        err && err.message ? err.message : String(err)
      }`
    );
    process.exitCode = 1;
    return;
  }

  const violations = [];

  // Modern_Route scope — zero tolerance.
  for (const file of walk(
    MODERN_ROUTE_ROOT,
    MODERN_ROUTE_EXCLUDE,
    MODERN_ROUTE_EXTENSIONS,
    ioErrors
  )) {
    for (const spec of collectSpecifiers(file, ioErrors)) {
      const resolved = resolveSpecifierAbs(spec, file);
      if (resolved && isStaticDataPath(resolved)) {
        violations.push({
          scope: 'modern-route',
          importer: workspaceRel(file),
          specifier: spec,
          resolved: workspaceRel(resolved),
        });
      }
    }
  }

  // Server scope — allow-list permitted.
  for (const file of walk(SERVER_ROOT, null, SERVER_EXTENSIONS, ioErrors)) {
    for (const spec of collectSpecifiers(file, ioErrors)) {
      const resolved = resolveSpecifierAbs(spec, file);
      if (resolved && isStaticDataPath(resolved)) {
        const rel = workspaceRel(resolved);
        if (!allowList.has(rel)) {
          violations.push({
            scope: 'server',
            importer: workspaceRel(file),
            specifier: spec,
            resolved: rel,
          });
        }
      }
    }
  }

  // I/O errors are unrecoverable: the scan cannot certify clean if it
  // could not read every input. Acceptance Criterion 9.7.
  if (ioErrors.length > 0) {
    console.error(
      `[gate:regression] FAIL: ${ioErrors.length} unreadable input(s):`
    );
    for (const err of ioErrors) {
      console.error(`  - ${err.path}: ${err.reason}`);
    }
    if (violations.length > 0) {
      console.error(
        '[gate:regression] Additional static-data violations also detected:'
      );
      console.error(
        JSON.stringify(
          { violations, allowList: [...allowList] },
          null,
          2
        )
      );
    }
    process.exitCode = 1;
    return;
  }

  if (violations.length > 0) {
    console.error(
      '[gate:regression] FAIL: static-data import violations detected.'
    );
    console.error(
      JSON.stringify(
        { violations, allowList: [...allowList] },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    '[gate:regression] PASS: zero Modern_Route static-data imports; server scope within allow-list.'
  );
}

main();
