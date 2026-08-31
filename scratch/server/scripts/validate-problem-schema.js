/**
 * validate-problem-schema.js
 *
 * Zero-dependency validator for problem JSON files at
 *   server/data/learning/problems/<topic-slug>/<pattern-slug>.json
 *
 * Files declaring `"schema_version": "2.0"` are held to the strict v2
 * contract documented in PROBLEM_SCHEMA.md. Files without that field are
 * treated as legacy v1 and skipped by this validator (the seeder still
 * enforces FK integrity on them separately).
 *
 * Usage:
 *
 *   # CLI mode — exits non-zero on any violation, prints full report.
 *   node server/scripts/validate-problem-schema.js
 *
 *   # Targeted CLI mode — validate one or more specific files.
 *   node server/scripts/validate-problem-schema.js path/to/file.json [...]
 *
 *   # Library mode — call from another module.
 *   import { validateAllProblemFiles, validateProblemBundle } from './validate-problem-schema.js';
 *   const report = await validateAllProblemFiles({ problemsDir });
 *   if (!report.ok) throw new Error(report.errors.join('\n'));
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// Path helpers
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DEFAULT_PROBLEMS_DIR = path.resolve(__dirname, '..', 'data', 'learning', 'problems');

// -----------------------------------------------------------------------------
// Primitive checks
// -----------------------------------------------------------------------------
const SLUG_RE       = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMPLEXITY_RE = /^O\(.+\)$/;
const URL_RE        = /^https?:\/\//;

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function isString(v, minLen = 0, maxLen = Infinity) {
  return typeof v === 'string' && v.length >= minLen && v.length <= maxLen;
}
function isStringArray(v, minItems = 0, maxItems = Infinity, minStrLen = 0) {
  if (!Array.isArray(v)) return false;
  if (v.length < minItems || v.length > maxItems) return false;
  return v.every((s) => isString(s, minStrLen));
}

// -----------------------------------------------------------------------------
// Field validators — each returns an array of error messages (empty == valid)
// -----------------------------------------------------------------------------
function checkSlug(value, fieldPath) {
  const errs = [];
  if (!isString(value, 2, 80)) {
    errs.push(`${fieldPath}: must be a 2..80 char string`);
  } else if (!SLUG_RE.test(value)) {
    errs.push(`${fieldPath}: must be kebab-case (got "${value}")`);
  }
  return errs;
}

function checkComplexity(value, fieldPath) {
  if (!isString(value, 4)) return [`${fieldPath}: must be a string`];
  if (!COMPLEXITY_RE.test(value)) return [`${fieldPath}: must match O(...) (got "${value}")`];
  return [];
}

function checkExample(ex, p) {
  const errs = [];
  if (!isPlainObject(ex)) return [`${p}: must be an object`];
  const allowed = new Set(['input', 'output', 'explanation']);
  for (const k of Object.keys(ex)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }
  if (!isString(ex.input, 1))       errs.push(`${p}.input: required non-empty string`);
  if (!isString(ex.output, 1))      errs.push(`${p}.output: required non-empty string`);
  if (!isString(ex.explanation, 1)) errs.push(`${p}.explanation: required non-empty string`);
  return errs;
}

function checkApproach(ap, p) {
  const errs = [];
  if (!isPlainObject(ap)) return [`${p}: must be an object`];
  const allowed = new Set(['name', 'summary', 'intuition', 'steps', 'code', 'time_complexity', 'space_complexity']);
  for (const k of Object.keys(ap)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }
  if (!isString(ap.name, 2))       errs.push(`${p}.name: required (>= 2 chars)`);
  if (!isString(ap.summary, 10))   errs.push(`${p}.summary: required (>= 10 chars)`);
  if (!isString(ap.intuition, 40)) errs.push(`${p}.intuition: required (>= 40 chars; multi-paragraph reasoning)`);
  if (!isStringArray(ap.steps, 2, Infinity, 4)) {
    errs.push(`${p}.steps: required string[] with >= 2 entries (each >= 4 chars)`);
  }
  if (!isPlainObject(ap.code)) {
    errs.push(`${p}.code: required object {javascript, python}`);
  } else {
    const codeAllowed = new Set(['javascript', 'python']);
    for (const k of Object.keys(ap.code)) {
      if (!codeAllowed.has(k)) errs.push(`${p}.code: unknown language "${k}"`);
    }
    if (!isString(ap.code.javascript, 10)) errs.push(`${p}.code.javascript: required (>= 10 chars; full reference solution)`);
    if (!isString(ap.code.python, 10))     errs.push(`${p}.code.python: required (>= 10 chars; full reference solution)`);
  }
  errs.push(...checkComplexity(ap.time_complexity,  `${p}.time_complexity`));
  errs.push(...checkComplexity(ap.space_complexity, `${p}.space_complexity`));
  return errs;
}

function checkTestCase(tc, p, seenOrder) {
  const errs = [];
  if (!isPlainObject(tc)) return [`${p}: must be an object`];
  const allowed = new Set(['input_payload', 'expected_output', 'is_hidden', 'order_index', 'label']);
  for (const k of Object.keys(tc)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }
  if (!('input_payload' in tc))    errs.push(`${p}.input_payload: required`);
  if (!('expected_output' in tc))  errs.push(`${p}.expected_output: required (may be null, false, 0, etc.)`);
  if (typeof tc.is_hidden !== 'boolean') errs.push(`${p}.is_hidden: required boolean`);
  if (!Number.isInteger(tc.order_index) || tc.order_index < 1) {
    errs.push(`${p}.order_index: required positive integer`);
  } else if (seenOrder.has(tc.order_index)) {
    errs.push(`${p}.order_index: duplicate value ${tc.order_index} (must be unique within problem)`);
  } else {
    seenOrder.add(tc.order_index);
  }
  if ('label' in tc && !isString(tc.label, 2)) errs.push(`${p}.label: must be a string of >= 2 chars when present`);
  return errs;
}

function checkRelatedProblem(rp, p) {
  const errs = [];
  if (!isPlainObject(rp)) return [`${p}: must be an object`];
  const allowed = new Set(['slug', 'title', 'difficulty']);
  for (const k of Object.keys(rp)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }
  errs.push(...checkSlug(rp.slug, `${p}.slug`));
  if (!isString(rp.title, 3)) errs.push(`${p}.title: required (>= 3 chars)`);
  if (!['Easy', 'Medium', 'Hard'].includes(rp.difficulty)) {
    errs.push(`${p}.difficulty: must be Easy|Medium|Hard (got "${rp.difficulty}")`);
  }
  return errs;
}

function checkCppSignature(sig, p) {
  const errs = [];
  if (!isPlainObject(sig)) return [`${p}: must be an object`];
  const allowed = new Set(['fn', 'class', 'args', 'ret']);
  for (const k of Object.keys(sig)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }
  if (!isString(sig.fn, 1)) errs.push(`${p}.fn: required non-empty string`);
  if ('class' in sig && !isString(sig.class, 1)) errs.push(`${p}.class: must be a non-empty string when present`);
  if (!isString(sig.ret, 1)) errs.push(`${p}.ret: required non-empty string`);
  if (!Array.isArray(sig.args)) {
    errs.push(`${p}.args: required array`);
  } else {
    sig.args.forEach((arg, index) => {
      const argPath = `${p}.args[${index}]`;
      if (!isPlainObject(arg)) {
        errs.push(`${argPath}: must be an object`);
        return;
      }
      const keys = Object.keys(arg);
      if (keys.some((key) => !['name', 'type'].includes(key))) errs.push(`${argPath}: only name and type are allowed`);
      if (!isString(arg.name, 1)) errs.push(`${argPath}.name: required non-empty string`);
      if (!isString(arg.type, 1)) errs.push(`${argPath}.type: required non-empty string`);
    });
  }
  return errs;
}

function checkProblem(pr, p) {
  const errs = [];
  if (!isPlainObject(pr)) return [`${p}: must be an object`];

  const required = new Set([
    'slug', 'title', 'difficulty', 'tags',
    'description', 'real_world_analogy',
    'examples', 'constraints', 'edge_cases', 'hints',
    'approaches', 'starter_code',
    'time_complexity', 'space_complexity',
    'test_cases',
  ]);
  const allowed = new Set([...required, 'companies', 'related_problems', 'video_url', 'cpp_signature']);
  for (const k of required) {
    if (!(k in pr)) errs.push(`${p}.${k}: required field is missing`);
  }
  for (const k of Object.keys(pr)) {
    if (!allowed.has(k)) errs.push(`${p}: unknown field "${k}"`);
  }

  // Identity
  errs.push(...checkSlug(pr.slug, `${p}.slug`));
  if (!isString(pr.title, 3, 120)) errs.push(`${p}.title: 3..120 chars required`);
  if (!['Easy', 'Medium', 'Hard'].includes(pr.difficulty)) {
    errs.push(`${p}.difficulty: must be Easy|Medium|Hard`);
  }
  if (!isStringArray(pr.tags, 2, Infinity, 2)) {
    errs.push(`${p}.tags: required string[] with >= 2 entries`);
  }

  // Body
  if (!isString(pr.description, 80)) errs.push(`${p}.description: required (>= 80 chars markdown)`);
  if (!isString(pr.real_world_analogy, 30)) {
    errs.push(`${p}.real_world_analogy: required (>= 30 chars; concrete real-world mapping)`);
  }

  if (!Array.isArray(pr.examples) || pr.examples.length < 3 || pr.examples.length > 5) {
    errs.push(`${p}.examples: required array of 3..5 items (got ${Array.isArray(pr.examples) ? pr.examples.length : 'non-array'})`);
  } else {
    pr.examples.forEach((ex, i) => errs.push(...checkExample(ex, `${p}.examples[${i}]`)));
  }

  if (!isStringArray(pr.constraints, 1, Infinity, 4)) {
    errs.push(`${p}.constraints: required string[] with >= 1 entry`);
  }
  if (!isStringArray(pr.edge_cases, 3, Infinity, 4)) {
    errs.push(`${p}.edge_cases: required string[] with >= 3 entries`);
  }
  if (!isStringArray(pr.hints, 2, 5, 20)) {
    errs.push(`${p}.hints: required string[] of 2..5 entries (each >= 20 chars; progressive)`);
  }

  // Approaches
  if (!Array.isArray(pr.approaches) || pr.approaches.length < 2) {
    errs.push(`${p}.approaches: required array of >= 2 items (brute + optimal at minimum)`);
  } else {
    pr.approaches.forEach((ap, i) => errs.push(...checkApproach(ap, `${p}.approaches[${i}]`)));
  }

  // Starter code
  if (!isPlainObject(pr.starter_code)) {
    errs.push(`${p}.starter_code: required object {javascript, python}`);
  } else {
    // javascript and python are required; the signature-driven languages are
    // optional but permitted. Their harnesses take their shape from
    // `cpp_signature` (the canonical signature, despite the C++-era name), so a
    // starter is a courtesy to the user rather than a requirement. They are
    // generated by server/scripts/backfill-<lang>-starters.js and by the authoring
    // pipeline.
    const SIGNATURE_DRIVEN = ['cpp', 'java', 'c'];
    const codeAllowed = new Set(['javascript', 'python', ...SIGNATURE_DRIVEN]);
    for (const k of Object.keys(pr.starter_code)) {
      if (!codeAllowed.has(k)) errs.push(`${p}.starter_code: unknown language "${k}"`);
    }
    if (!isString(pr.starter_code.javascript, 10)) errs.push(`${p}.starter_code.javascript: required (>= 10 chars)`);
    if (!isString(pr.starter_code.python, 10))     errs.push(`${p}.starter_code.python: required (>= 10 chars)`);

    for (const lang of SIGNATURE_DRIVEN) {
      if (!(lang in pr.starter_code)) continue;
      if (!isString(pr.starter_code[lang], 10)) {
        errs.push(`${p}.starter_code.${lang}: must be a string of >= 10 chars when present`);
      }
      // A starter with no signature behind it is a trap: the editor shows a method to
      // fill in and the submission is then rejected with "no signature configured".
      if (!('cpp_signature' in pr)) {
        errs.push(`${p}.starter_code.${lang}: present without cpp_signature — ${lang} submissions would be rejected`);
      }
    }
  }

  // Complexity
  errs.push(...checkComplexity(pr.time_complexity,  `${p}.time_complexity`));
  errs.push(...checkComplexity(pr.space_complexity, `${p}.space_complexity`));

  // Test cases
  if (!Array.isArray(pr.test_cases) || pr.test_cases.length < 10 || pr.test_cases.length > 25) {
    errs.push(`${p}.test_cases: required array of 10..25 items (got ${Array.isArray(pr.test_cases) ? pr.test_cases.length : 'non-array'})`);
  } else {
    const seenOrder = new Set();
    let visible = 0, hidden = 0;
    pr.test_cases.forEach((tc, i) => {
      errs.push(...checkTestCase(tc, `${p}.test_cases[${i}]`, seenOrder));
      if (tc?.is_hidden === true) hidden++;
      else if (tc?.is_hidden === false) visible++;
    });
    if (visible < 4) errs.push(`${p}.test_cases: requires >= 4 visible cases (got ${visible})`);
    if (hidden < 5)  errs.push(`${p}.test_cases: requires >= 5 hidden cases (got ${hidden})`);
  }

  // Optional fields
  if ('companies' in pr && !isStringArray(pr.companies, 0, Infinity, 2)) {
    errs.push(`${p}.companies: must be string[] when present`);
  }
  if ('related_problems' in pr) {
    if (!Array.isArray(pr.related_problems)) {
      errs.push(`${p}.related_problems: must be an array when present`);
    } else {
      pr.related_problems.forEach((rp, i) => errs.push(...checkRelatedProblem(rp, `${p}.related_problems[${i}]`)));
    }
  }
  if ('video_url' in pr && (!isString(pr.video_url, 8) || !URL_RE.test(pr.video_url))) {
    errs.push(`${p}.video_url: must be an http(s) URL when present`);
  }
  if ('cpp_signature' in pr) {
    errs.push(...checkCppSignature(pr.cpp_signature, `${p}.cpp_signature`));
  }

  return errs;
}

// -----------------------------------------------------------------------------
// Bundle-level validator
// -----------------------------------------------------------------------------
/**
 * @param {object} bundle Parsed JSON of a single problem-bundle file.
 * @param {string} fileLabel A short label (e.g. "topic/pattern.json") used in error messages.
 * @returns {{ ok: boolean, version: '1' | '2.0', errors: string[] }}
 */
export function validateProblemBundle(bundle, fileLabel = '<bundle>') {
  const errors = [];

  if (!isPlainObject(bundle)) {
    return { ok: false, version: '1', errors: [`${fileLabel}: top-level value must be a JSON object`] };
  }

  const version = bundle.schema_version === '2.0' ? '2.0' : '1';
  if (version === '1') {
    // v1 legacy: this validator only checks v2. The seeder still enforces FK
    // integrity on legacy files separately.
    return { ok: true, version: '1', errors: [] };
  }

  // -- Strict v2 validation begins here --

  // `$schema` is an editor-hint convention for JSON-Schema-aware IDEs; we
  // accept it but it's not required.
  const requiredTop = new Set(['schema_version', 'topic_slug', 'pattern_slug', 'problems']);
  const allowedTop  = new Set([...requiredTop, '$schema']);
  for (const k of Object.keys(bundle)) {
    if (!allowedTop.has(k)) errors.push(`${fileLabel}: unknown top-level field "${k}"`);
  }
  for (const k of requiredTop) {
    if (!(k in bundle)) errors.push(`${fileLabel}: required top-level field "${k}" is missing`);
  }
  if ('$schema' in bundle && typeof bundle.$schema !== 'string') {
    errors.push(`${fileLabel}.$schema: must be a string when present`);
  }

  if ('topic_slug' in bundle)   errors.push(...checkSlug(bundle.topic_slug,   `${fileLabel}.topic_slug`));
  if ('pattern_slug' in bundle) errors.push(...checkSlug(bundle.pattern_slug, `${fileLabel}.pattern_slug`));

  if (!Array.isArray(bundle.problems) || bundle.problems.length < 1) {
    errors.push(`${fileLabel}.problems: required non-empty array`);
  } else {
    const seenSlugs = new Set();
    bundle.problems.forEach((pr, i) => {
      const slug = pr?.slug;
      if (typeof slug === 'string') {
        if (seenSlugs.has(slug)) {
          errors.push(`${fileLabel}.problems[${i}].slug: duplicate slug "${slug}" within bundle`);
        } else {
          seenSlugs.add(slug);
        }
      }
      errors.push(...checkProblem(pr, `${fileLabel}.problems[${i}]`));
    });
  }

  return { ok: errors.length === 0, version: '2.0', errors };
}

// -----------------------------------------------------------------------------
// Filesystem walker
// -----------------------------------------------------------------------------
/**
 * Recursively find all *.json files under a directory.
 */
async function findJsonFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await findJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Validate every problem-bundle file under the given directory.
 *
 * @param {{ problemsDir?: string, files?: string[] }} opts
 * @returns {Promise<{ ok: boolean, errors: string[], stats: object }>}
 */
export async function validateAllProblemFiles({ problemsDir = DEFAULT_PROBLEMS_DIR, files } = {}) {
  const targets = Array.isArray(files) && files.length > 0 ? files : await findJsonFiles(problemsDir);
  const allErrors = [];
  let v2Files = 0, v1Files = 0, totalProblems = 0;

  for (const file of targets) {
    const rel = path.relative(process.cwd(), file);
    let parsed;
    try {
      const raw = await fs.readFile(file, 'utf8');
      parsed = JSON.parse(raw);
    } catch (err) {
      allErrors.push(`${rel}: ${err instanceof SyntaxError ? `JSON parse error — ${err.message}` : err.message}`);
      continue;
    }
    const result = validateProblemBundle(parsed, rel);
    if (result.version === '2.0') {
      v2Files++;
      totalProblems += Array.isArray(parsed?.problems) ? parsed.problems.length : 0;
    } else {
      v1Files++;
    }
    allErrors.push(...result.errors);
  }

  return {
    ok: allErrors.length === 0,
    errors: allErrors,
    stats: {
      filesScanned: targets.length,
      v2Files,
      v1Files,
      v2Problems: totalProblems,
    },
  };
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------
async function runCli() {
  const argv = process.argv.slice(2);
  const explicitFiles = argv.filter((a) => !a.startsWith('--'));
  const opts = explicitFiles.length > 0 ? { files: explicitFiles.map((f) => path.resolve(f)) } : {};

  console.log('[validate-problem-schema] starting...');
  const report = await validateAllProblemFiles(opts);

  console.log(`[validate-problem-schema] scanned ${report.stats.filesScanned} file(s) — v2: ${report.stats.v2Files} (${report.stats.v2Problems} problems), v1 legacy: ${report.stats.v1Files}`);

  if (report.ok) {
    console.log('[validate-problem-schema] OK — every v2 file passes strict validation.');
    process.exit(0);
  }

  console.error(`[validate-problem-schema] FAIL — ${report.errors.length} violation(s):\n`);
  for (const err of report.errors) {
    console.error('  ' + err);
  }
  process.exit(1);
}

// Run CLI iff invoked directly (not when imported as a library).
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runCli().catch((err) => {
    console.error('[validate-problem-schema] crashed:', err);
    process.exit(2);
  });
}
