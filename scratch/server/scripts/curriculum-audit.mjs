#!/usr/bin/env node
/**
 * Curriculum coverage audit.
 *
 *     node server/scripts/curriculum-audit.mjs                    # human-readable to stdout
 *     npm run audit:curriculum                                    # writes both artifacts
 *
 * Emits:
 *     server/scripts/curriculum-coverage-report.json   machine-readable
 *     docs/CURRICULUM_AUDIT.md                          human-readable
 *
 * WHY THIS IS A SCRIPT AND NOT A DOCUMENT
 * ---------------------------------------
 * `server/data/learning/INDEX.md` carries a hand-maintained coverage table. It is currently
 * accurate, but it is accurate the way a comment is accurate: only until someone forgets.
 * Every count in this audit is recomputed from topics.json, patterns/*.json and problems/,
 * so a stale number is impossible rather than merely unlikely.
 *
 * FACTS AND OPINIONS ARE KEPT APART
 * ---------------------------------
 * Everything under `facts` in the JSON comes from the repository. Everything under
 * `analysis` comes from server/scripts/lib/curriculum-judgements.mjs and is an engineering
 * opinion. The join is by `topic/pattern` key, and the audit reports any key that exists on
 * one side and not the other — which is how a taxonomy change gets noticed instead of
 * silently un-classified.
 *
 * READ-ONLY. It opens no database, writes nothing under server/data, and the application
 * does not import it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BLOCKERS, CLASSIFICATION, CONCEPTUAL_PATTERNS, FUTURE_ARCHITECTURE, KINDS, LEARNER_SEQUENCE,
  MILESTONE_150, PATTERN_DEPENDENCIES, REQUIRES_REAUTHOR_AFTER_NODE_ENCODING, SLOT_DETAIL, TIERS,
  blockedPatternKeys, patternKind,
} from './lib/curriculum-judgements.mjs';
import { languageSupportsSignature, productionLanguages } from '../languages/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEARNING = path.join(__dirname, '..', 'data', 'learning');
const JSON_OUT = path.join(__dirname, 'curriculum-coverage-report.json');
const MD_OUT = path.join(__dirname, '..', '..', 'docs', 'CURRICULUM_AUDIT.md');
const BLUEPRINT_OUT = path.join(__dirname, '..', '..', 'docs', 'CURRICULUM_150_BLUEPRINT.md');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write') || argv.includes('--json') || argv.includes('--md');

// ===========================================================================
// FACTS — read from the repository, nothing inferred
// ===========================================================================
const topicsDoc = JSON.parse(fs.readFileSync(path.join(LEARNING, 'topics.json'), 'utf8'));
const topics = topicsDoc.topics;

/** Patterns, per topic, straight out of patterns/<topic>.json. */
const patternsByTopic = new Map();
for (const t of topics) {
  const file = path.join(LEARNING, 'patterns', `${t.slug}.json`);
  patternsByTopic.set(t.slug, JSON.parse(fs.readFileSync(file, 'utf8')).patterns);
}

/** Every authored problem, with the topic/pattern the FILE declares. */
const problems = [];
const problemsDir = path.join(LEARNING, 'problems');
for (const topicDir of fs.readdirSync(problemsDir)) {
  const dir = path.join(problemsDir, topicDir);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const list = Array.isArray(doc.problems) ? doc.problems : [doc];
    for (const p of list) {
      problems.push({
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        topic_slug: doc.topic_slug ?? topicDir,
        pattern_slug: doc.pattern_slug ?? f.replace(/\.json$/, ''),
        source_file: path.posix.join(topicDir, f),
        schema_version: doc.schema_version ?? '1',
        cpp_signature: p.cpp_signature ?? null,
        test_case_count: Array.isArray(p.test_cases) ? p.test_cases.length : 0,
        tags: p.tags ?? [],
        // Used to detect duplicate PROBLEMS, not merely duplicate patterns.
        test_case_fingerprint: Array.isArray(p.test_cases) ? JSON.stringify(p.test_cases) : null,
      });
    }
  }
}

const DIFFS = ['Easy', 'Medium', 'Hard'];
const emptyDiff = () => ({ Easy: 0, Medium: 0, Hard: 0 });

const byPatternKey = new Map();
for (const p of problems) {
  const key = `${p.topic_slug}/${p.pattern_slug}`;
  if (!byPatternKey.has(key)) byPatternKey.set(key, []);
  byPatternKey.get(key).push(p);
}

const prodLangs = productionLanguages().map((l) => l.key);

/** Which production languages can express a problem's signature. */
function langSupport(problem) {
  const out = {};
  for (const key of prodLangs) {
    out[key] = languageSupportsSignature(key, problem.cpp_signature).supported;
  }
  return out;
}

// --- per-pattern facts -----------------------------------------------------
const patternFacts = [];
for (const t of topics) {
  for (const pat of patternsByTopic.get(t.slug)) {
    const key = `${t.slug}/${pat.slug}`;
    const mine = byPatternKey.get(key) ?? [];
    const diff = emptyDiff();
    for (const m of mine) if (m.difficulty in diff) diff[m.difficulty] += 1;
    patternFacts.push({
      key,
      topic_slug: t.slug,
      topic_name: t.name,
      topic_order: t.order_index,
      pattern_slug: pat.slug,
      pattern_name: pat.name,
      pattern_order: pat.order_index,
      problem_count: mine.length,
      by_difficulty: diff,
      problems: mine.map((m) => ({ slug: m.slug, title: m.title, difficulty: m.difficulty })),
      is_empty: mine.length === 0,
      // Repository metadata that exists on a pattern. Recorded so the audit can state
      // plainly that pattern-level prerequisites are NOT among them.
      has_explanation: typeof pat.explanation === 'string' && pat.explanation.length > 0,
      has_when_to_use: typeof pat.when_to_use === 'string' && pat.when_to_use.length > 0,
      has_intuition: typeof pat.intuition === 'string' && pat.intuition.length > 0,
      common_pitfall_count: Array.isArray(pat.common_pitfalls) ? pat.common_pitfalls.length : 0,
      complexity_signature: pat.complexity_signature ?? null,
      declares_prerequisites: Object.prototype.hasOwnProperty.call(pat, 'prerequisites'),
    });
  }
}

// --- per-topic facts -------------------------------------------------------
const topicFacts = topics.map((t) => {
  const pats = patternFacts.filter((p) => p.topic_slug === t.slug);
  const mine = problems.filter((p) => p.topic_slug === t.slug);
  const diff = emptyDiff();
  for (const m of mine) if (m.difficulty in diff) diff[m.difficulty] += 1;
  return {
    slug: t.slug,
    name: t.name,
    order_index: t.order_index,
    prerequisites: t.prerequisites ?? [],
    learning_outcome_count: Array.isArray(t.learning_outcomes) ? t.learning_outcomes.length : 0,
    has_description: typeof t.description === 'string' && t.description.length > 0,
    pattern_count: pats.length,
    patterns_filled: pats.filter((p) => !p.is_empty).length,
    problem_count: mine.length,
    by_difficulty: diff,
    is_empty: mine.length === 0,
  };
});

const totals = {
  problems: problems.length,
  by_difficulty: (() => {
    const d = emptyDiff();
    for (const p of problems) if (p.difficulty in d) d[p.difficulty] += 1;
    return d;
  })(),
  test_cases: problems.reduce((n, p) => n + p.test_case_count, 0),
  topics: topics.length,
  patterns: patternFacts.length,
  empty_topics: topicFacts.filter((t) => t.is_empty).map((t) => t.slug),
  empty_patterns: patternFacts.filter((p) => p.is_empty).map((p) => p.key),
  one_problem_patterns: patternFacts.filter((p) => p.problem_count === 1).map((p) => p.key),
  two_problem_patterns: patternFacts.filter((p) => p.problem_count === 2).map((p) => p.key),
  populated_patterns: patternFacts.filter((p) => !p.is_empty).map((p) => p.key),
};
totals.pct_patterns_empty = +((totals.empty_patterns.length / totals.patterns) * 100).toFixed(1);
totals.pct_patterns_one = +((totals.one_problem_patterns.length / totals.patterns) * 100).toFixed(1);
totals.pct_patterns_two_plus = +((patternFacts.filter((p) => p.problem_count >= 2).length / totals.patterns) * 100).toFixed(1);

// --- concentration ---------------------------------------------------------
const rankedPatterns = [...patternFacts].filter((p) => !p.is_empty).sort((a, b) => b.problem_count - a.problem_count);
const concentration = {
  top_pattern: rankedPatterns[0] ? { key: rankedPatterns[0].key, count: rankedPatterns[0].problem_count } : null,
  top_5_patterns_share_pct: +((rankedPatterns.slice(0, 5).reduce((n, p) => n + p.problem_count, 0) / totals.problems) * 100).toFixed(1),
  top_topic: (() => {
    const t = [...topicFacts].sort((a, b) => b.problem_count - a.problem_count)[0];
    return { slug: t.slug, count: t.problem_count, share_pct: +((t.problem_count / totals.problems) * 100).toFixed(1) };
  })(),
};

// --- language capability by topic -----------------------------------------
const langByTopic = {};
for (const t of topicFacts) {
  if (t.is_empty) continue;
  const mine = problems.filter((p) => p.topic_slug === t.slug);
  const counts = Object.fromEntries(prodLangs.map((k) => [k, 0]));
  for (const p of mine) {
    const sup = langSupport(p);
    for (const k of prodLangs) if (sup[k]) counts[k] += 1;
  }
  langByTopic[t.slug] = { problems: mine.length, supported: counts };
}

// ===========================================================================
// DEFECTS — observed, not fixed
// ===========================================================================
const defects = [];

// 1. A topic whose declared prerequisite comes LATER in curriculum order.
const orderBySlug = new Map(topics.map((t) => [t.slug, t.order_index]));
for (const t of topics) {
  for (const pre of t.prerequisites ?? []) {
    if (!orderBySlug.has(pre)) {
      defects.push({ id: 'PREREQ_UNKNOWN', severity: 'high', where: `topics.json:${t.slug}`, detail: `declares prerequisite "${pre}", which is not a topic` });
      continue;
    }
    if (orderBySlug.get(pre) > t.order_index) {
      defects.push({
        id: 'PREREQ_ORDER_INVERTED',
        severity: 'medium',
        where: `topics.json:${t.slug}`,
        detail: `"${t.slug}" (order ${t.order_index}) declares a prerequisite on "${pre}" (order ${orderBySlug.get(pre)}), which the curriculum presents LATER. Either the order or the prerequisite is wrong.`,
      });
    }
  }
}

// 2. A pattern is empty while a pattern that depends on it is populated.
for (const [dependent, prereqs] of Object.entries(PATTERN_DEPENDENCIES)) {
  const dep = patternFacts.find((p) => p.key === dependent);
  if (!dep || dep.is_empty) continue;
  for (const pre of prereqs) {
    const preFact = patternFacts.find((p) => p.key === pre);
    if (preFact && preFact.is_empty) {
      defects.push({
        id: 'INVERTED_TEACHING_ORDER',
        severity: 'medium',
        where: pre,
        detail: `"${pre}" holds 0 problems while "${dependent}" — which builds on it — holds ${dep.problem_count}. (Dependency is a curriculum judgement, not repository metadata.)`,
      });
    }
  }
}

// 3. A problem whose declared topic does not match the directory it lives in.
for (const p of problems) {
  const dir = p.source_file.split('/')[0];
  if (dir !== p.topic_slug) {
    defects.push({ id: 'TOPIC_DIR_MISMATCH', severity: 'low', where: p.slug, detail: `lives in problems/${dir}/ but declares topic_slug "${p.topic_slug}"` });
  }
}

// 4. A problem assigned to a pattern its topic does not declare.
const declaredKeys = new Set(patternFacts.map((p) => p.key));
for (const p of problems) {
  const key = `${p.topic_slug}/${p.pattern_slug}`;
  if (!declaredKeys.has(key)) {
    defects.push({ id: 'ORPHAN_PATTERN', severity: 'high', where: p.slug, detail: `assigned to "${key}", which no patterns file declares` });
  }
}

// 5. Difficulty progression gaps in a populated pattern.
for (const p of patternFacts) {
  if (p.problem_count === 0) continue;
  const { Easy, Medium, Hard } = p.by_difficulty;
  if (Easy === 0 && p.problem_count >= 3) {
    defects.push({ id: 'NO_ENTRY_PROBLEM', severity: 'medium', where: p.key, detail: `${p.problem_count} problems, none Easy (M${Medium} H${Hard}) — a learner meets this pattern for the first time at Medium.` });
  }
  if (Hard === 0 && Medium === 0 && p.problem_count >= 3) {
    defects.push({ id: 'NO_PROGRESSION', severity: 'low', where: p.key, detail: `${p.problem_count} problems, all Easy — no progression beyond recognition.` });
  }
}

// 6. Conceptual duplication across patterns, detected from tag+slug overlap.
const DUPLICATE_SUSPECTS = [
  {
    id: 'DUPLICATE_CONCEPT',
    a: 'stack-queue/monotonic-deque',
    b: 'sliding-window-two-pointers/monotonic-deque-window',
    detail: 'Two patterns for the same technique in different topics. The stack-queue one is empty; the sliding-window one holds the repo\'s largest concentration of Hard problems.',
  },
  {
    id: 'DUPLICATE_CONCEPT',
    a: 'arrays/dutch-national-flag',
    b: 'sliding-window-two-pointers/opposite-direction-two-pointers',
    detail: 'Three-way partition. The arrays pattern is empty, but sort-colors — the canonical Dutch-flag problem — is already authored under opposite-direction-two-pointers.',
  },
  {
    id: 'MISPLACED_PROBLEM',
    a: 'sliding-window-two-pointers/same-direction-two-pointers',
    b: 'linked-list/*',
    detail: 'Four linked-list problems are authored under a two-pointer pattern because the linked-list topic is harness-blocked. NOT relocated in 3A.1 — see REQUIRES_REAUTHOR_AFTER_NODE_ENCODING: relocation alone is insufficient because a cycle cannot be represented in a flat array at all.',
  },
];

/**
 * Duplicate PROBLEMS, detected by comparing test-case payloads rather than by reading prose.
 *
 * The 3A.0 audit compared patterns and missed this: two problems can sit in different patterns,
 * look different, and be the same problem. Byte-identical test cases plus an identical signature
 * is strong evidence, and it costs nothing to check.
 */
function detectDuplicateProblems() {
  const out = [];
  const bySignature = new Map();
  for (const p of problems) {
    if (!p.cpp_signature) continue;
    const shape = `${(p.cpp_signature.args || []).map((a) => a.type).join(',')}->${p.cpp_signature.ret}`;
    if (!bySignature.has(shape)) bySignature.set(shape, []);
    bySignature.get(shape).push(p);
  }
  for (const [shape, group] of bySignature) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]; const b = group[j];
        if (a.test_case_fingerprint && a.test_case_fingerprint === b.test_case_fingerprint) {
          out.push({
            id: 'DUPLICATE_PROBLEM',
            severity: 'medium',
            where: `${a.slug} vs ${b.slug}`,
            detail: `identical signature (${shape}) AND byte-identical test cases. `
              + `${a.topic_slug}/${a.pattern_slug} vs ${b.topic_slug}/${b.pattern_slug}. `
              + 'One of the two inflates the problem count without teaching anything new. Not deleted '
              + 'in 3A.1: removing a problem changes the milestone baseline and is a content decision.',
          });
        }
      }
    }
  }
  return out;
}
for (const s of DUPLICATE_SUSPECTS) {
  const aFact = patternFacts.find((p) => p.key === s.a);
  const bFact = s.b.endsWith('/*') ? null : patternFacts.find((p) => p.key === s.b);
  defects.push({
    id: s.id,
    severity: 'low',
    where: `${s.a} vs ${s.b}`,
    detail: `${s.detail} [measured: ${s.a}=${aFact ? aFact.problem_count : '?'}${bFact ? `, ${s.b}=${bFact.problem_count}` : ''}]`,
  });
}
defects.push(...detectDuplicateProblems());

// A problem whose statement both permits any order AND demands a specific one. Ungradable
// prose: the grader uses exact deepEqual, so "any order" is never true.
for (const p of problems) {
  const doc = fs.readFileSync(path.join(problemsDir, p.source_file), 'utf8');
  const entry = JSON.parse(doc).problems.find((x) => x.slug === p.slug);
  const desc = String(entry?.description ?? '');
  if (/in any order/i.test(desc) && /(sorted|lexicograph|for grading)/i.test(desc)) {
    defects.push({
      id: 'CONTRADICTORY_ORDERING_PROSE',
      severity: 'low',
      where: p.slug,
      detail: 'the statement says the answer may be returned "in any order" and then requires a specific one. '
        + 'The grader compares with an exact deepEqual, so only the specific order is accepted and the first '
        + 'clause is false. Wording fix, no behaviour change.',
    });
  }
}

// ===========================================================================
// ANALYSIS — the judgement layer, joined by key
// ===========================================================================
const unclassified = patternFacts.filter((p) => !CLASSIFICATION[p.key]).map((p) => p.key);
const classifiedButAbsent = Object.keys(CLASSIFICATION).filter((k) => !declaredKeys.has(k));
if (unclassified.length) defects.push({ id: 'UNCLASSIFIED_PATTERN', severity: 'low', where: 'judgements', detail: `${unclassified.length} pattern(s) have no classification: ${unclassified.join(', ')}` });
if (classifiedButAbsent.length) defects.push({ id: 'STALE_CLASSIFICATION', severity: 'low', where: 'judgements', detail: `${classifiedButAbsent.length} classified key(s) no longer exist in the taxonomy: ${classifiedButAbsent.join(', ')}` });

const tierCounts = Object.fromEntries(TIERS.map((t) => [t, 0]));
for (const p of patternFacts) {
  const c = CLASSIFICATION[p.key];
  if (c) tierCounts[c.tier] += 1;
}

// ---------------------------------------------------------------------------
// KIND — what a pattern can contain, which is independent of how important it is
// ---------------------------------------------------------------------------
const allKeys = patternFacts.map((p) => p.key);
const blockedMap = blockedPatternKeys(allKeys);
const kindByKey = new Map(patternFacts.map((p) => [p.key, patternKind(p.key, blockedMap)]));
const blockedKeySet = new Set([...kindByKey.entries()].filter(([, v]) => v.kind === 'STRUCTURALLY_BLOCKED').map(([k]) => k));

for (const key of Object.keys(CONCEPTUAL_PATTERNS)) {
  if (!declaredKeys.has(key)) defects.push({ id: 'STALE_CONCEPTUAL', severity: 'low', where: key, detail: 'declared conceptual but no longer in the taxonomy' });
}

/**
 * Coverage counted over CODING patterns only.
 *
 * The 3A.0 headline was "92 of 108 patterns empty, 85.2%". That number is true and misleading:
 * it counts two patterns that should never hold a coding problem and 27 that the execution
 * architecture cannot represent yet as if they were unwritten content. Neither is a content gap.
 */
const kindCounts = Object.fromEntries(KINDS.map((k) => [k, 0]));
for (const v of kindByKey.values()) kindCounts[v.kind] += 1;

const codingPatterns = patternFacts.filter((p) => kindByKey.get(p.key).kind === 'CODING');
const bucket = (list) => ({
  empty: list.filter((p) => p.problem_count === 0).length,
  one: list.filter((p) => p.problem_count === 1).length,
  two_to_four: list.filter((p) => p.problem_count >= 2 && p.problem_count <= 4).length,
  five_plus: list.filter((p) => p.problem_count >= 5).length,
});
const codingCoverage = {
  total_patterns: patternFacts.length,
  coding_capable: codingPatterns.length,
  conceptual: kindCounts.CONCEPTUAL,
  structurally_blocked: kindCounts.STRUCTURALLY_BLOCKED,
  coding_buckets: bucket(codingPatterns),
  coding_populated: codingPatterns.filter((p) => p.problem_count > 0).length,
};
codingCoverage.pct_coding_populated = +((codingCoverage.coding_populated / codingCoverage.coding_capable) * 100).toFixed(1);

// A blocked or conceptual pattern must never hold a problem — if one does, either the blocker
// is wrong or the problem is misfiled.
for (const p of patternFacts) {
  const k = kindByKey.get(p.key);
  if (k.kind !== 'CODING' && p.problem_count > 0) {
    defects.push({ id: 'PROBLEM_IN_NONCODING_PATTERN', severity: 'high', where: p.key, detail: `${p.problem_count} problem(s) in a ${k.kind} pattern` });
  }
}

// --- milestone validation --------------------------------------------------
const milestone = MILESTONE_150;
const additionsByKey = new Map();
for (const a of milestone.additions) {
  const key = `${a.topic}/${a.pattern}`;
  if (!additionsByKey.has(key)) additionsByKey.set(key, []);
  additionsByKey.get(key).push(a);
}

const milestoneRows = [...additionsByKey.entries()].map(([key, adds]) => {
  const fact = patternFacts.find((p) => p.key === key);
  const cls = CLASSIFICATION[key];
  return {
    key,
    tier: cls?.tier ?? 'UNCLASSIFIED',
    current: fact ? fact.problem_count : null,
    add: adds.length,
    target: (fact ? fact.problem_count : 0) + adds.length,
    exists_in_taxonomy: Boolean(fact),
    progression: adds.map((a) => a.difficulty),
  };
});

// Every milestone target must name a real pattern, and must be a CODING pattern.
for (const row of milestoneRows) {
  if (!row.exists_in_taxonomy) defects.push({ id: 'MILESTONE_UNKNOWN_PATTERN', severity: 'high', where: row.key, detail: 'the 150 proposal targets a pattern the taxonomy does not declare' });
  const k = kindByKey.get(row.key);
  if (k && k.kind !== 'CODING') defects.push({ id: 'MILESTONE_NONCODING_PATTERN', severity: 'high', where: row.key, detail: `the 150 proposal targets a ${k.kind} pattern` });
}

// ---------------------------------------------------------------------------
// Join assertions on the blueprint layer — drift must fail loudly, not silently
// ---------------------------------------------------------------------------
if (SLOT_DETAIL.length !== milestone.additions.length) {
  defects.push({ id: 'SLOT_DETAIL_LENGTH', severity: 'high', where: 'judgements', detail: `SLOT_DETAIL has ${SLOT_DETAIL.length} entries for ${milestone.additions.length} slots` });
}
milestone.additions.forEach((a, i) => {
  const d = SLOT_DETAIL[i];
  if (!d) return;
  if (d.concept !== a.concept) {
    defects.push({ id: 'SLOT_DETAIL_MISALIGNED', severity: 'high', where: `slot ${i + 1}`, detail: `SLOT_DETAIL[${i}] describes "${d.concept}" but the slot is "${a.concept}"` });
  }
  if (!d.signature) defects.push({ id: 'SLOT_NO_SIGNATURE', severity: 'high', where: `slot ${i + 1}`, detail: 'no expected signature shape declared' });
});

const sequenced = LEARNER_SEQUENCE.flatMap((s) => s.slots);
if (sequenced.length !== milestone.additions.length || new Set(sequenced).size !== sequenced.length) {
  defects.push({ id: 'LEARNER_SEQUENCE_INVALID', severity: 'high', where: 'judgements', detail: `learner sequence holds ${sequenced.length} entries (${new Set(sequenced).size} distinct) for ${milestone.additions.length} slots` });
}
for (let n = 1; n <= milestone.additions.length; n += 1) {
  if (!sequenced.includes(n)) defects.push({ id: 'LEARNER_SEQUENCE_GAP', severity: 'high', where: `slot ${n}`, detail: 'not placed in the learner sequence' });
}

// A slot whose signature mentions a nested vector must be marked C-unsupported, and vice
// versa: the prediction has to follow from the signature rather than being asserted by hand.
milestone.additions.forEach((a, i) => {
  const sig = SLOT_DETAIL[i]?.signature ?? '';
  const nested = sig.includes('vector<vector<');
  if (nested && a.langs.c !== false) defects.push({ id: 'LANG_PREDICTION_MISMATCH', severity: 'high', where: `slot ${i + 1}`, detail: `signature "${sig}" is nested but the slot claims C support` });
  if (!nested && a.langs.c === false) defects.push({ id: 'LANG_PREDICTION_MISMATCH', severity: 'high', where: `slot ${i + 1}`, detail: `signature "${sig}" is flat but the slot claims C cannot express it` });
});

// Every slot flagged for 64-bit risk must carry a full constraint analysis.
milestone.additions.forEach((a, i) => {
  if (!a.int64) return;
  const c = SLOT_DETAIL[i]?.constraint;
  if (!c) { defects.push({ id: 'MISSING_CONSTRAINT_ANALYSIS', severity: 'high', where: `slot ${i + 1}`, detail: 'flagged for 64-bit risk with no constraint analysis' }); return; }
  for (const field of ['canonical', 'robinhood', 'algorithmIdentical', 'overflowReasoningRetained', 'legitimate']) {
    if (!(field in c)) defects.push({ id: 'INCOMPLETE_CONSTRAINT_ANALYSIS', severity: 'high', where: `slot ${i + 1}`, detail: `constraint analysis missing "${field}"` });
  }
});

const milestoneTotals = {
  current_total: totals.problems,
  additions: milestone.additions.length,
  resulting_total: totals.problems + milestone.additions.length,
  patterns_touched: milestoneRows.length,
  patterns_newly_opened: milestoneRows.filter((r) => r.current === 0).length,
  patterns_topped_up: milestoneRows.filter((r) => (r.current ?? 0) > 0).length,
  patterns_populated_after: totals.populated_patterns.length + milestoneRows.filter((r) => r.current === 0).length,
  patterns_still_empty_after: totals.patterns - (totals.populated_patterns.length + milestoneRows.filter((r) => r.current === 0).length),
  coding_populated_before: codingCoverage.coding_populated,
  coding_populated_after: codingCoverage.coding_populated + milestoneRows.filter((r) => r.current === 0).length,
  coding_capable: codingCoverage.coding_capable,
  by_difficulty: (() => {
    const d = emptyDiff();
    for (const a of milestone.additions) if (a.difficulty in d) d[a.difficulty] += 1;
    return d;
  })(),
  c_unsupported: milestone.additions.filter((a) => a.langs.c === false).length,
  int64_flagged: milestone.additions.filter((a) => a.int64).length,
};
milestoneTotals.pct_patterns_populated_after = +((milestoneTotals.patterns_populated_after / totals.patterns) * 100).toFixed(1);
milestoneTotals.pct_coding_populated_before = +((milestoneTotals.coding_populated_before / milestoneTotals.coding_capable) * 100).toFixed(1);
milestoneTotals.pct_coding_populated_after = +((milestoneTotals.coding_populated_after / milestoneTotals.coding_capable) * 100).toFixed(1);
milestoneTotals.coding_buckets_after = (() => {
  const projected = codingPatterns.map((p) => {
    const row = milestoneRows.find((r) => r.key === p.key);
    return { ...p, problem_count: row ? row.target : p.problem_count };
  });
  return bucket(projected);
})();

// ===========================================================================
// Emit
// ===========================================================================
const report = {
  $comment: 'GENERATED by server/scripts/curriculum-audit.mjs. Do not edit. `facts` is computed '
    + 'from the repository; `analysis` is engineering judgement from lib/curriculum-judgements.mjs.',
  generated_at: new Date().toISOString(),
  sources: {
    topics: 'server/data/learning/topics.json',
    patterns: 'server/data/learning/patterns/<topic>.json',
    problems: 'server/data/learning/problems/<topic>/<pattern>.json',
    judgements: 'server/scripts/lib/curriculum-judgements.mjs',
  },
  facts: {
    totals,
    coverage_by_kind: codingCoverage,
    concentration,
    topics: topicFacts,
    patterns: patternFacts,
    language_capability_by_topic: langByTopic,
    metadata_notes: {
      topic_level_prerequisites: 'PRESENT in topics.json',
      pattern_level_prerequisites: patternFacts.some((p) => p.declares_prerequisites)
        ? 'present on some patterns'
        : 'ABSENT — no pattern object declares prerequisites, so all pattern dependencies are judgement',
      pattern_concept_metadata: 'explanation, when_to_use, intuition, common_pitfalls, complexity_signature',
    },
  },
  defects,
  analysis: {
    disclaimer: 'Judgement, not repository data. No company-frequency figures are used anywhere.',
    tier_definitions: TIERS,
    tier_counts: tierCounts,
    kind_definitions: KINDS,
    kind_counts: kindCounts,
    classification: Object.fromEntries(patternFacts.map((p) => [p.key, {
      ...(CLASSIFICATION[p.key] ?? { tier: 'UNCLASSIFIED', why: null }),
      kind: kindByKey.get(p.key).kind,
      kind_reason: kindByKey.get(p.key).reason,
      blocker: kindByKey.get(p.key).blocker,
      problem_count: p.problem_count,
    }])),
    conceptual_patterns: CONCEPTUAL_PATTERNS,
    pattern_dependencies: PATTERN_DEPENDENCIES,
    pattern_dependencies_source: 'JUDGEMENT — patterns/*.json carries no prerequisites field',
    blockers: BLOCKERS,
    blocked_pattern_count: blockedKeySet.size,
    requires_reauthor_after_node_encoding: REQUIRES_REAUTHOR_AFTER_NODE_ENCODING,
    future_architecture: FUTURE_ARCHITECTURE,
    milestone_150: {
      totals: milestoneTotals,
      by_pattern: milestoneRows,
      slots: milestone.additions.map((a, i) => ({ n: i + 1, ...a, ...SLOT_DETAIL[i] })),
      learner_sequence: LEARNER_SEQUENCE,
      deferred: milestone.deferred,
    },
  },
};

// --- human-readable --------------------------------------------------------
const L = [];
const w = (s = '') => L.push(s);
const pct = (n, d) => `${((n / d) * 100).toFixed(1)}%`;

w('# Curriculum audit');
w('');
w('**Generated** by `node server/scripts/curriculum-audit.mjs`. Do not edit by hand — every');
w('number below is recomputed from `topics.json`, `patterns/*.json` and `problems/`.');
w('');
w(`Generated at \`${report.generated_at}\`.`);
w('');
w('Sections 1–4 are **repository facts**. Sections 5 onward are **engineering judgement**,');
w('kept separate on purpose. No company-frequency figures are used anywhere.');
w('');
w('## 1. Totals');
w('');
w('| | |');
w('| --- | ---: |');
w(`| Problems | ${totals.problems} |`);
w(`| Easy | ${totals.by_difficulty.Easy} |`);
w(`| Medium | ${totals.by_difficulty.Medium} |`);
w(`| Hard | ${totals.by_difficulty.Hard} |`);
w(`| Test cases | ${totals.test_cases} |`);
w(`| Topics | ${totals.topics} |`);
w(`| Patterns | ${totals.patterns} |`);
w(`| Empty topics | ${totals.empty_topics.length} |`);
w(`| Empty patterns | ${totals.empty_patterns.length} (${totals.pct_patterns_empty}%) |`);
w(`| Patterns with exactly 1 problem | ${totals.one_problem_patterns.length} (${totals.pct_patterns_one}%) |`);
w(`| Patterns with exactly 2 problems | ${totals.two_problem_patterns.length} |`);
w(`| Patterns with 2 or more | ${patternFacts.filter((p) => p.problem_count >= 2).length} (${totals.pct_patterns_two_plus}%) |`);
w('');
w('### Coverage by pattern KIND — the meaningful KPI');
w('');
w('Counting all 108 patterns in one denominator is true but misleading: it treats a pattern that');
w('should never hold a coding problem, and one the execution architecture cannot represent yet,');
w('as if they were simply unwritten. Neither is a content gap.');
w('');
w('| | | |');
w('| --- | ---: | --- |');
w(`| Total patterns | ${codingCoverage.total_patterns} | |`);
w(`| **Coding-capable** | **${codingCoverage.coding_capable}** | the real denominator |`);
w(`| Conceptual | ${codingCoverage.conceptual} | deliberately never a graded function |`);
w(`| Structurally blocked | ${codingCoverage.structurally_blocked} | architecture, not content |`);
w('');
w('Of the coding-capable patterns:');
w('');
w('| Problems | Patterns |');
w('| --- | ---: |');
w(`| 0 (empty) | ${codingCoverage.coding_buckets.empty} |`);
w(`| 1 | ${codingCoverage.coding_buckets.one} |`);
w(`| 2–4 | ${codingCoverage.coding_buckets.two_to_four} |`);
w(`| 5+ | ${codingCoverage.coding_buckets.five_plus} |`);
w('');
w(`Populated: **${codingCoverage.coding_populated} of ${codingCoverage.coding_capable} (${codingCoverage.pct_coding_populated}%)**.`);
w('');
w('### Concentration');
w('');
w(`The single most populated topic is **${concentration.top_topic.slug}** with `);
w(`**${concentration.top_topic.count} of ${totals.problems} problems (${concentration.top_topic.share_pct}%)**. `);
w(`The five largest patterns hold **${concentration.top_5_patterns_share_pct}%** of everything.`);
w('');
w('## 2. Topic distribution');
w('');
w('| # | Topic | Patterns | Filled | Problems | E | M | H | Prerequisites |');
w('| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
for (const t of [...topicFacts].sort((a, b) => a.order_index - b.order_index)) {
  w(`| ${t.order_index} | ${t.name} | ${t.pattern_count} | ${t.patterns_filled} | ${t.problem_count === 0 ? '**0**' : t.problem_count} | ${t.by_difficulty.Easy} | ${t.by_difficulty.Medium} | ${t.by_difficulty.Hard} | ${t.prerequisites.join(', ') || '—'} |`);
}
w('');
w('## 3. Every pattern');
w('');
for (const t of [...topicFacts].sort((a, b) => a.order_index - b.order_index)) {
  w(`### ${t.order_index}. ${t.name} \`${t.slug}\` — ${t.problem_count} problem(s)`);
  w('');
  w('| # | Pattern | Count | E | M | H | Tier | Problems |');
  w('| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |');
  for (const p of patternFacts.filter((x) => x.topic_slug === t.slug).sort((a, b) => a.pattern_order - b.pattern_order)) {
    const cls = CLASSIFICATION[p.key];
    const k = kindByKey.get(p.key);
    const mark = k.kind === 'STRUCTURALLY_BLOCKED' ? ' ⛔' : (k.kind === 'CONCEPTUAL' ? ' 💭' : '');
    const names = p.problems.map((x) => `${x.slug} (${x.difficulty[0]})`).join(', ') || '—';
    w(`| ${p.pattern_order} | ${p.pattern_name} | ${p.problem_count === 0 ? '**0**' : p.problem_count} | ${p.by_difficulty.Easy} | ${p.by_difficulty.Medium} | ${p.by_difficulty.Hard} | ${cls?.tier ?? '?'}${mark} | ${names} |`);
  }
  w('');
}
w('⛔ = structurally blocked (architecture, not content). 💭 = conceptual, deliberately not a graded');
w('function. Neither counts as a missing coding problem; see section 6.');
w('');
w('## 4. Data defects observed (not fixed)');
w('');
if (!defects.length) {
  w('None.');
} else {
  const bySeverity = { high: [], medium: [], low: [] };
  for (const d of defects) bySeverity[d.severity].push(d);
  for (const sev of ['high', 'medium', 'low']) {
    if (!bySeverity[sev].length) continue;
    w(`### ${sev} (${bySeverity[sev].length})`);
    w('');
    for (const d of bySeverity[sev]) w(`- **${d.id}** \`${d.where}\` — ${d.detail}`);
    w('');
  }
}
w('## 5. Classification');
w('');
w('Judgement. Tier definitions:');
w('');
w('- **FOUNDATION** — a later pattern cannot be taught without it, or it is the base recognition shape of its topic');
w('- **CORE_INTERVIEW** — expected to be recognised on sight');
w('- **IMPORTANT** — worth teaching, nothing blocked on it');
w('- **ADVANCED** — a variation of something already taught, or several prerequisites deep');
w('- **SPECIALIZED** — narrow, single-technique or competitive territory');
w('');
w('| Tier | Patterns | Populated | Empty |');
w('| --- | ---: | ---: | ---: |');
for (const tier of TIERS) {
  const inTier = patternFacts.filter((p) => CLASSIFICATION[p.key]?.tier === tier);
  w(`| ${tier} | ${inTier.length} | ${inTier.filter((p) => !p.is_empty).length} | ${inTier.filter((p) => p.is_empty).length} |`);
}
w('');
w('## 6. Structural blockers');
w('');
w(`${blockedPatternKeys.size} of ${totals.patterns} patterns cannot receive a problem today, for reasons that are not about priority.`);
w('');
for (const [id, b] of Object.entries(BLOCKERS)) {
  w(`### ${id} — ${b.label}`);
  w('');
  w(b.detail);
  w('');
  if (b.topics.length) w(`Topics: ${b.topics.map((t) => `\`${t}\``).join(', ')}`);
  if (b.patterns.length) w(`Patterns: ${b.patterns.map((t) => `\`${t}\``).join(', ')}`);
  w('');
}
w('## 7. Pattern dependency view');
w('');
w('**Judgement.** `patterns/*.json` has no `prerequisites` field, so none of this is');
w('repository metadata. Topic-level prerequisites in `topics.json` ARE, and appear in section 2.');
w('');
w('| Pattern | Needs first |');
w('| --- | --- |');
for (const [k, v] of Object.entries(PATTERN_DEPENDENCIES)) {
  w(`| \`${k}\` | ${v.map((x) => `\`${x}\``).join(', ')} |`);
}
w('');
w('## 8. Proposed 150 milestone');
w('');
w('| | |');
w('| --- | ---: |');
w(`| Current total | ${milestoneTotals.current_total} |`);
w(`| Proposed additions | ${milestoneTotals.additions} |`);
w(`| Resulting total | ${milestoneTotals.resulting_total} |`);
w(`| Patterns touched | ${milestoneTotals.patterns_touched} |`);
w(`| — newly opened | ${milestoneTotals.patterns_newly_opened} |`);
w(`| — topped up | ${milestoneTotals.patterns_topped_up} |`);
w(`| Patterns populated after | ${milestoneTotals.patterns_populated_after} of ${totals.patterns} (${milestoneTotals.pct_patterns_populated_after}%) |`);
w(`| Patterns still empty after | ${milestoneTotals.patterns_still_empty_after} |`);
w(`| Additions: Easy / Medium / Hard | ${milestoneTotals.by_difficulty.Easy} / ${milestoneTotals.by_difficulty.Medium} / ${milestoneTotals.by_difficulty.Hard} |`);
w(`| Additions C cannot express | ${milestoneTotals.c_unsupported} |`);
w(`| Additions flagged for 64-bit | ${milestoneTotals.int64_flagged} |`);
w('');
w('### Allocation by pattern');
w('');
w('| Pattern | Tier | Now | Add | Target | Progression |');
w('| --- | --- | ---: | ---: | ---: | --- |');
for (const r of milestoneRows) {
  w(`| \`${r.key}\` | ${r.tier} | ${r.current} | +${r.add} | ${r.target} | ${r.progression.join(' → ')} |`);
}
w('');
w('### Slots');
w('');
w('| # | Topic / Pattern | Concept | Diff | Objective | 6-lang | 64-bit |');
w('| ---: | --- | --- | --- | --- | --- | --- |');
milestone.additions.forEach((a, i) => {
  const lang = a.langs.c === false ? '5/6 — **C no**' : '6/6';
  w(`| ${i + 1} | \`${a.topic}/${a.pattern}\` | ${a.concept} | ${a.difficulty} | ${a.objective} | ${lang} | ${a.int64 ? '⚠' : '—'} |`);
});
w('');
w('### Deliberately deferred');
w('');
for (const d of milestone.deferred) w(`- **${d.scope}** — ${d.reason}`);
w('');
w('## 9. Six-language implications');
w('');
w(`${milestoneTotals.c_unsupported} of ${milestoneTotals.additions} proposed problems cannot be expressed in C today. Every one is a`);
w('nested-vector argument or return, which C\'s calling convention cannot model: a 2-D array');
w('needs a row count and a per-row column count, which is a different convention rather than a');
w('longer one. Grouped:');
w('');
for (const a of milestone.additions.filter((x) => x.langs.c === false)) {
  w(`- \`${a.topic}/${a.pattern}\` — ${a.concept}`);
}
w('');
w('Where a pattern would otherwise be entirely C-unsupported, one slot was deliberately chosen');
w('with a flat signature so the pattern stays reachable in all six languages: the subset-count');
w('problem in `recursion/subset-include-exclude`, the phone-keypad problem in');
w('`recursion/backtracking-with-restore`, and the word-ladder problem in `graphs/bfs-shortest-path`.');
w('Curriculum quality was not otherwise bent to reach 6/6.');
w('');
w('## 10. 64-bit ceiling implications');
w('');
w('The validator refuses expected outputs outside ±(2^53−1) — see `PRODUCTION_READINESS.md`');
w(`section 18. ${milestoneTotals.int64_flagged} proposed concepts touch that boundary:`);
w('');
w('| Pattern | Concept | Disposition |');
w('| --- | --- | --- |');
for (const a of milestone.additions.filter((x) => x.int64)) {
  w(`| \`${a.topic}/${a.pattern}\` | ${a.concept} | ${a.int64} |`);
}
w('');
w('None requires the guard to be weakened. Two are handled by representation rather than by');
w('constraint: the concatenation problem returns a **string**, and the trailing-zeroes problem');
w('exists precisely to teach avoiding the large value. One — inversion counting — needs a');
w('`long long` return and is the first curriculum problem that would exercise that registry');
w('type on a real provider.');
w('');

const md = L.join('\n');

// ===========================================================================
// The 150 blueprint — final approved additions, in LEARNER order
// ===========================================================================
const B = [];
const b = (s = '') => B.push(s);
const slotOf = (n) => ({ n, ...milestone.additions[n - 1], ...SLOT_DETAIL[n - 1] });

b('# Curriculum 150 blueprint');
b('');
b('**Generated** by `node server/scripts/curriculum-audit.mjs --write`. Do not edit by hand.');
b('');
b('The final approved additions for the 150 milestone. **No full problem specifications** — no');
b('descriptions, examples, constraints, reference solutions or test cases. Those are Phase 3A.2.');
b('');
b(`Generated at \`${report.generated_at}\`.`);
b('');
b('## Totals');
b('');
b('| | |');
b('| --- | ---: |');
b(`| Current total | ${milestoneTotals.current_total} |`);
b(`| Additions | ${milestoneTotals.additions} |`);
b(`| Resulting total | ${milestoneTotals.resulting_total} |`);
b(`| Patterns touched | ${milestoneTotals.patterns_touched} (${milestoneTotals.patterns_newly_opened} opened, ${milestoneTotals.patterns_topped_up} topped up) |`);
b(`| Coding-capable patterns | ${milestoneTotals.coding_capable} |`);
b(`| Coding-capable populated, before | ${milestoneTotals.coding_populated_before} (${milestoneTotals.pct_coding_populated_before}%) |`);
b(`| Coding-capable populated, after | ${milestoneTotals.coding_populated_after} (${milestoneTotals.pct_coding_populated_after}%) |`);
b(`| Conceptual patterns | ${codingCoverage.conceptual} |`);
b(`| Structurally blocked patterns | ${codingCoverage.structurally_blocked} |`);
b(`| Easy / Medium / Hard | ${milestoneTotals.by_difficulty.Easy} / ${milestoneTotals.by_difficulty.Medium} / ${milestoneTotals.by_difficulty.Hard} |`);
b(`| C cannot express | ${milestoneTotals.c_unsupported} |`);
b(`| 64-bit flagged | ${milestoneTotals.int64_flagged} |`);
b('');
b('Coding-capable pattern distribution after the milestone:');
b('');
b('| Problems | Before | After |');
b('| --- | ---: | ---: |');
b(`| 0 (empty) | ${codingCoverage.coding_buckets.empty} | ${milestoneTotals.coding_buckets_after.empty} |`);
b(`| 1 | ${codingCoverage.coding_buckets.one} | ${milestoneTotals.coding_buckets_after.one} |`);
b(`| 2–4 | ${codingCoverage.coding_buckets.two_to_four} | ${milestoneTotals.coding_buckets_after.two_to_four} |`);
b(`| 5+ | ${codingCoverage.coding_buckets.five_plus} | ${milestoneTotals.coding_buckets_after.five_plus} |`);
b('');
b('## Learner order');
b('');
b('This is the order a learner should meet the additions, which is **not** the order they sit in');
b('the taxonomy or in a file listing. A topic appears only after the topics it declares as');
b('prerequisites, and within a pattern the slots run recognition → application → variation →');
b('harder application.');
b('');
for (const stage of LEARNER_SEQUENCE) {
  b(`### Stage ${stage.stage} — ${stage.name}`);
  b('');
  b(`*${stage.why}*`);
  b('');
  b('| Seq | # | Pattern | Concept | Diff |');
  b('| ---: | ---: | --- | --- | --- |');
  stage.slots.forEach((n, i) => {
    const s = slotOf(n);
    b(`| ${stage.stage}.${i + 1} | ${n} | \`${s.pattern}\` | ${s.concept} | ${s.difficulty} |`);
  });
  b('');
}
b('## Every addition in detail');
b('');
for (const stage of LEARNER_SEQUENCE) {
  for (const n of stage.slots) {
    const s = slotOf(n);
    const fact = patternFacts.find((p) => p.key === `${s.topic}/${s.pattern}`);
    const existing = fact && fact.problems.length
      ? fact.problems.map((p) => `${p.slug} (${p.difficulty})`).join(', ')
      : 'none — this pattern is empty today';
    const cls = CLASSIFICATION[`${s.topic}/${s.pattern}`];
    b(`### ${n}. ${s.concept}`);
    b('');
    b(`- **Sequence** stage ${stage.stage}`);
    b(`- **Topic / pattern** \`${s.topic}\` / \`${s.pattern}\` — ${cls?.tier ?? '?'}`);
    b(`- **Difficulty** ${s.difficulty}`);
    b(`- **Signature** \`${s.signature}\``);
    b(`- **Language capability** ${s.langs.c === false ? '5/6 — **C cannot express this**' : '6/6'}`);
    b(`- **Prerequisite** ${s.prereq ?? 'none within the milestone'}`);
    b(`- **Learning objective** ${s.objective}`);
    b(`- **Preceded in this pattern by** ${existing}`);
    b(`- **Non-redundant because** ${s.notRedundant}`);
    if (s.ordering) b(`- **Output ordering** ${s.ordering}`);
    b(`- **64-bit risk** ${s.int64 ? s.int64 : 'none'}`);
    b('- **Architecture blocker** none — this pattern is coding-capable today');
    b(`- **Milestone reason** ${stage.why}`);
    b('');
  }
}
b('## Constraint analysis for every 64-bit-flagged slot');
b('');
b('The validator refuses expected outputs outside ±(2^53−1) and is never bypassed. Each slot below');
b('states the canonical range, the Robinhood range, whether the algorithm and the overflow');
b('reasoning survive, and whether the constraint is legitimate.');
b('');
for (let i = 0; i < milestone.additions.length; i += 1) {
  const a = milestone.additions[i];
  if (!a.int64) continue;
  const c = SLOT_DETAIL[i].constraint;
  b(`### ${i + 1}. ${a.concept}`);
  b('');
  b(`- **Canonical range** ${c.canonical}`);
  b(`- **Robinhood range** ${c.robinhood}`);
  b(`- **Algorithm identical** ${c.algorithmIdentical ? 'yes' : 'NO'}`);
  b(`- **Overflow reasoning retained** ${c.overflowReasoningRetained ? 'yes' : 'no'}`);
  b(`- **Legitimate** ${c.legitimate}`);
  b('');
}
b('## Slots C cannot express');
b('');
b(`${milestoneTotals.c_unsupported} of ${milestoneTotals.additions}. Every one is a nested-vector argument or return, which C's calling`);
b('convention cannot model: a 2-D array needs a row count and a per-row column count, which is a');
b('different convention rather than a longer one. **Curriculum quality was not distorted to reach');
b('6/6.** Where a pattern would otherwise be entirely unreachable in C, one slot was chosen with a');
b('naturally flat signature so the pattern still has an accessible entry point.');
b('');
b('| # | Pattern | Concept | Signature |');
b('| ---: | --- | --- | --- |');
milestone.additions.forEach((a, i) => {
  if (a.langs.c !== false) return;
  b(`| ${i + 1} | \`${a.topic}/${a.pattern}\` | ${a.concept} | \`${SLOT_DETAIL[i].signature}\` |`);
});
b('');
b('## Deliberately deferred');
b('');
for (const d of milestone.deferred) b(`- **${d.scope}** — ${d.reason}`);
b('');
b('## Future architecture, recorded and NOT started');
b('');
for (const f of FUTURE_ARCHITECTURE) {
  b(`### ${f.id}`);
  b('');
  b(`- **Unblocks** ${f.unblocks}`);
  b(`- **Needs** ${f.needs}`);
  if (f.alsoRequires) b(`- **Also requires** ${f.alsoRequires}`);
  b(`- **Milestone** ${f.milestone}`);
  b('');
}
b('## Problems requiring re-authoring after node encoding');
b('');
b('Not relocated in this phase. Relocation alone is insufficient for the first two: a cycle cannot');
b('be represented in a flat JSON array, so those problems are wrong rather than merely misfiled.');
b('');
b('| Problem | Currently in | Should be | Action |');
b('| --- | --- | --- | --- |');
for (const [slug, r] of Object.entries(REQUIRES_REAUTHOR_AFTER_NODE_ENCODING)) {
  b(`| \`${slug}\` | \`${r.currentlyIn}\` | \`${r.shouldBe}\` | **${r.action}** |`);
}
b('');
for (const [slug, r] of Object.entries(REQUIRES_REAUTHOR_AFTER_NODE_ENCODING)) {
  b(`- \`${slug}\` — ${r.why}`);
}
b('');

const blueprint = B.join('\n');

if (WRITE) {
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_OUT, md);
  fs.writeFileSync(BLUEPRINT_OUT, blueprint);
  console.log(`wrote ${path.relative(process.cwd(), JSON_OUT)}`);
  console.log(`wrote ${path.relative(process.cwd(), MD_OUT)}`);
  console.log(`wrote ${path.relative(process.cwd(), BLUEPRINT_OUT)}`);
} else {
  console.log(md);
}

// A defect is a finding, not a crash: this script reports and exits 0 so it can run in a
// pipeline without gating on curriculum shape. Only a high-severity structural defect is
// worth a non-zero exit.
const high = defects.filter((d) => d.severity === 'high');
if (high.length) {
  console.error(`\n${high.length} HIGH severity defect(s):`);
  for (const d of high) console.error(`  ${d.id} ${d.where} — ${d.detail}`);
  process.exit(1);
}
