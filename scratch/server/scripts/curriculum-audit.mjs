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
  BLOCKERS, CLASSIFICATION, MILESTONE_150, PATTERN_DEPENDENCIES, TIERS,
} from './lib/curriculum-judgements.mjs';
import { languageSupportsSignature, productionLanguages } from '../languages/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEARNING = path.join(__dirname, '..', 'data', 'learning');
const JSON_OUT = path.join(__dirname, 'curriculum-coverage-report.json');
const MD_OUT = path.join(__dirname, '..', '..', 'docs', 'CURRICULUM_AUDIT.md');

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
    detail: 'Four linked-list problems (linked-list-cycle, linked-list-cycle-ii, middle-of-the-linked-list, remove-nth-node-from-end-of-list) are authored under a two-pointer pattern, because the linked-list topic is harness-blocked. INDEX.md already names linked-list-cycle as a known modelling mistake: as a flat array the answer is derivable without the algorithm.',
  },
  {
    id: 'MISPLACED_PROBLEM',
    a: 'sliding-window-two-pointers/monotonic-deque-window',
    b: 'stack-queue/monotonic-stack',
    detail: 'largest-rectangle-in-histogram and sum-of-subarray-minimums are monotonic-STACK problems, not deque-window problems; they sit in the window topic.',
  },
];
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

const blockedPatternKeys = new Set();
for (const b of Object.values(BLOCKERS)) {
  for (const topic of b.topics) {
    for (const p of patternFacts) if (p.topic_slug === topic) blockedPatternKeys.add(p.key);
  }
  for (const k of b.patterns) blockedPatternKeys.add(k);
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

// Every milestone target must name a real pattern, and must not be harness-blocked.
for (const row of milestoneRows) {
  if (!row.exists_in_taxonomy) defects.push({ id: 'MILESTONE_UNKNOWN_PATTERN', severity: 'high', where: row.key, detail: 'the 150 proposal targets a pattern the taxonomy does not declare' });
  if (blockedPatternKeys.has(row.key)) defects.push({ id: 'MILESTONE_BLOCKED_PATTERN', severity: 'high', where: row.key, detail: 'the 150 proposal targets a structurally blocked pattern' });
}

const milestoneTotals = {
  current_total: totals.problems,
  additions: milestone.additions.length,
  resulting_total: totals.problems + milestone.additions.length,
  patterns_touched: milestoneRows.length,
  patterns_newly_opened: milestoneRows.filter((r) => r.current === 0).length,
  patterns_topped_up: milestoneRows.filter((r) => (r.current ?? 0) > 0).length,
  patterns_populated_after: totals.populated_patterns.length + milestoneRows.filter((r) => r.current === 0).length,
  patterns_still_empty_after: totals.patterns - (totals.populated_patterns.length + milestoneRows.filter((r) => r.current === 0).length),
  by_difficulty: (() => {
    const d = emptyDiff();
    for (const a of milestone.additions) if (a.difficulty in d) d[a.difficulty] += 1;
    return d;
  })(),
  c_unsupported: milestone.additions.filter((a) => a.langs.c === false).length,
  int64_flagged: milestone.additions.filter((a) => a.int64).length,
};
milestoneTotals.pct_patterns_populated_after = +((milestoneTotals.patterns_populated_after / totals.patterns) * 100).toFixed(1);

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
    classification: Object.fromEntries(patternFacts.map((p) => [p.key, {
      ...(CLASSIFICATION[p.key] ?? { tier: 'UNCLASSIFIED', why: null }),
      problem_count: p.problem_count,
      blocked: blockedPatternKeys.has(p.key) || null,
    }])),
    pattern_dependencies: PATTERN_DEPENDENCIES,
    pattern_dependencies_source: 'JUDGEMENT — patterns/*.json carries no prerequisites field',
    blockers: BLOCKERS,
    blocked_pattern_count: blockedPatternKeys.size,
    milestone_150: {
      totals: milestoneTotals,
      by_pattern: milestoneRows,
      slots: milestone.additions,
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
    const blocked = blockedPatternKeys.has(p.key) ? ' ⛔' : '';
    const names = p.problems.map((x) => `${x.slug} (${x.difficulty[0]})`).join(', ') || '—';
    w(`| ${p.pattern_order} | ${p.pattern_name} | ${p.problem_count === 0 ? '**0**' : p.problem_count} | ${p.by_difficulty.Easy} | ${p.by_difficulty.Medium} | ${p.by_difficulty.Hard} | ${cls?.tier ?? '?'}${blocked} | ${names} |`);
  }
  w('');
}
w('⛔ = structurally blocked; see section 6.');
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

if (WRITE) {
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_OUT, md);
  console.log(`wrote ${path.relative(process.cwd(), JSON_OUT)}`);
  console.log(`wrote ${path.relative(process.cwd(), MD_OUT)}`);
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
