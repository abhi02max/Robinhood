/**
 * Read the authored curriculum straight off disk.
 *
 * The seed files are the source of truth, not the database. Reading them means every
 * gate runs before a seed, needs no DATABASE_URL, and cannot pass because of a stale
 * row that no longer matches what the authors wrote.
 *
 * Extracted from check-starters.js so the unified gate shares one loader rather than a
 * second copy that could drift about which files count as problems.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROBLEMS_DIR = path.join(__dirname, '..', '..', 'data', 'learning', 'problems');

/** Every problem JSON file, sorted so output order is stable across runs. */
export function seedFiles(dir = PROBLEMS_DIR) {
  const out = [];
  for (const topic of fs.readdirSync(dir)) {
    const sub = path.join(dir, topic);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const file of fs.readdirSync(sub)) {
      if (file.endsWith('.json')) out.push(path.join(sub, file));
    }
  }
  return out.sort();
}

/**
 * Every authored problem, flattened.
 *
 * Handles the three shapes the seed files use: `{ problems: [...] }` (v2), a bare array,
 * and a single object.
 */
export function loadSeededProblems(dir = PROBLEMS_DIR) {
  const out = [];
  for (const file of seedFiles(dir)) {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
    for (const p of list) out.push({ ...p, __file: file });
  }
  return out;
}

/** The type shape of a signature, used to deduplicate structurally identical problems. */
export function signatureShape(sig) {
  if (!sig) return 'none';
  return `${sig.ret} <- ${(sig.args || []).map((a) => a.type).join(',')}`;
}

/** The visible test case a compile check should use, or the first one. */
export function representativeCase(problem) {
  const cases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
  const chosen = cases.find((t) => t.is_hidden === false) || cases[0];
  if (!chosen) return null;
  return { ...chosen, id: `${problem.slug}-1`, order_index: chosen.order_index ?? 1 };
}
