import fs from "node:fs/promises";
import path from "node:path";

const DATA_ROOT = path.resolve("server/data/learning");
const PATTERNS_DIR = path.join(DATA_ROOT, "patterns");
const PROBLEMS_DIR = path.join(DATA_ROOT, "problems");
const TOPICS_FILE = path.join(DATA_ROOT, "topics.json");

async function readJson(p) { return JSON.parse(await fs.readFile(p, "utf8")); }

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith(".json")) yield full;
  }
}

const topics = await readJson(TOPICS_FILE);
const topicSlugs = new Set(topics.topics.map(t => t.slug));
console.log(`topics: ${topicSlugs.size} -> ${[...topicSlugs].join(", ")}`);

const patternSlugs = new Set();
const patternsByTopic = new Map();
const patternFiles = (await fs.readdir(PATTERNS_DIR)).filter(f => f.endsWith(".json")).sort();
for (const f of patternFiles) {
  const j = await readJson(path.join(PATTERNS_DIR, f));
  if (!topicSlugs.has(j.topic_slug)) console.error(`  PATTERN FILE ${f} references unknown topic_slug "${j.topic_slug}"`);
  if (!patternsByTopic.has(j.topic_slug)) patternsByTopic.set(j.topic_slug, []);
  for (const p of j.patterns || []) {
    patternSlugs.add(p.slug);
    patternsByTopic.get(j.topic_slug).push(p.slug);
  }
}
console.log(`patterns: ${patternSlugs.size} known across ${patternsByTopic.size} topic files`);

console.log(`\n=== PROBLEM FILES AUDIT ===`);
let problemFileCount = 0;
const missing = [];
const ok = [];
for await (const f of walk(PROBLEMS_DIR)) {
  problemFileCount++;
  const rel = path.relative(DATA_ROOT, f);
  const j = await readJson(f);
  const ts = j.topic_slug;
  const ps = j.pattern_slug;
  const probCount = (j.problems || []).length;
  const tsKnown = topicSlugs.has(ts);
  const psKnown = patternSlugs.has(ps);
  const psBelongsToTs = (patternsByTopic.get(ts) || []).includes(ps);
  if (!tsKnown || !psKnown || !psBelongsToTs) {
    missing.push({ rel, ts, ps, probCount, tsKnown, psKnown, psBelongsToTs });
  } else {
    ok.push({ rel, ts, ps, probCount });
  }
}
console.log(`scanned: ${problemFileCount} problem files`);
console.log(`OK     : ${ok.length} files (${ok.reduce((s,x)=>s+x.probCount,0)} problems)`);
console.log(`BROKEN : ${missing.length} files (${missing.reduce((s,x)=>s+x.probCount,0)} problems)`);
if (missing.length) {
  console.log(`\n=== BROKEN REFS (each line = one problem file) ===`);
  for (const m of missing) {
    const why = [];
    if (!m.tsKnown) why.push(`topic_slug "${m.ts}" UNKNOWN`);
    if (!m.psKnown) why.push(`pattern_slug "${m.ps}" UNKNOWN`);
    else if (!m.psBelongsToTs) why.push(`pattern "${m.ps}" exists but NOT under topic "${m.ts}"`);
    console.log(`  ${m.rel} (${m.probCount} problems): ${why.join(" | ")}`);
  }
}

console.log(`\n=== PATTERN COVERAGE GAP (patterns with NO problem file) ===`);
const usedPatterns = new Set(ok.map(x => x.ps));
const unusedPatterns = [...patternSlugs].filter(ps => !usedPatterns.has(ps));
console.log(`unused patterns: ${unusedPatterns.length} / ${patternSlugs.size}`);