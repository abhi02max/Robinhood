# Robinhood Problem Schema (v2.0)

This document defines the **production-grade** content contract for every
problem authored under `server/data/learning/problems/<topic-slug>/<pattern-slug>.json`.

The schema is enforced two ways:

1. **At authoring time** — `problem.schema.json` (JSON Schema Draft 2020-12)
   provides editor autocomplete, hover docs, and `red-squiggle` validation
   inside any JSON-Schema-aware IDE.
2. **At seed time** — `server/scripts/validate-problem-schema.js` runs as
   step `[0/3]` of `npm run seed:learning` and **blocks the seeder** on any
   schema violation, before any DB writes.

A file is held to the strict v2 contract iff it declares
`"schema_version": "2.0"` at the top level. Files without that field are
treated as **v1 legacy** (the original 11 problems) and are validated only
for FK integrity. Migrate v1 → v2 on a per-file basis at your own pace.

---

## Why v2?

The v1 schema treated approaches as opaque strings (`approach_brute`,
`approach_optimal`) and skipped fields the UI now consumes (hints,
real-world analogies, structured reference code, related problems).
Phase 3 of the platform redesign assumes every problem ships:

- a multi-paragraph description with proper formatting,
- 3–5 examples *with explanations*,
- explicit edge cases (not buried in description),
- progressive hints (vague → specific),
- **two or more** approaches, each with intuition, step-by-step plan, and
  full reference code in JS + Python — not a one-line summary,
- a real-world analogy (helps weaker learners),
- 10–25 test cases with both visible and hidden coverage,
- related problems for the "Up Next" sidebar.

If a problem can't meet this bar, it shouldn't ship. The schema makes that
non-negotiable.

---

## Top-level shape

```jsonc
{
  "schema_version": "2.0",                  // const, gates strict validation
  "topic_slug": "stack-queue",              // FK -> topics.slug
  "pattern_slug": "parenthesis-matching",   // FK -> patterns.slug (under topic)
  "problems": [ /* one or more Problem objects, see below */ ]
}
```

Slugs use kebab-case: lowercase letters, digits, hyphens. Pattern
`^[a-z0-9]+(-[a-z0-9]+)*$`. Length 2–80.

---

## Problem object — required fields

Every problem in `problems[]` MUST contain every field below. Optional
fields are listed in a separate section.

### Identity

| Field | Type | Notes |
|---|---|---|
| `slug` | string (slug) | Globally unique across all problems. Used in URLs. |
| `title` | string, 3–120 chars | Human-readable title shown in headers. |
| `difficulty` | enum `Easy` \| `Medium` \| `Hard` | Capitalized. |
| `tags` | string[], min 2 | First two SHOULD be `[topic_slug, pattern_slug]`. Extra tags are free-form. |

### Body

| Field | Type | Notes |
|---|---|---|
| `description` | string, ≥80 chars | Markdown. The full problem statement. Use ` ``code`` ` for identifiers, **bold** for emphasis, and explicit numbered/bulleted lists where appropriate. |
| `real_world_analogy` | string, ≥30 chars | **Required.** A 1–3 sentence mapping of the problem to a concrete real-world situation. Helps weaker learners build intuition before the formalism. |
| `examples` | Example[], 3–5 | Each example has `input` (string), `output` (string), `explanation` (string). Inputs and outputs are stringified to preserve exact formatting (escape sequences, infinity, etc.). |
| `constraints` | string[], ≥1 | Each entry is a single constraint, e.g. `"1 <= n <= 10^5"`. |
| `edge_cases` | string[], ≥3 | Each entry names a category of input that the implementation must handle correctly. Not a test case — a description. |
| `hints` | string[], 2–5 | Progressive: hint[0] should be vague (nudge toward the right *family* of techniques); the last hint should be a near-spoiler that names the data structure or invariant. |

### Approaches (the heart of v2)

| Field | Type | Notes |
|---|---|---|
| `approaches` | Approach[], ≥2 | The first SHOULD be the brute-force (or naïve) approach. The last SHOULD be the optimal approach. Intermediate approaches (e.g. memoized recursion before bottom-up DP) are encouraged when pedagogically useful. |

Each `Approach` has:

| Field | Type | Notes |
|---|---|---|
| `name` | string | E.g. `"Brute Force"`, `"Two Pointers"`, `"Kadane's Algorithm"`. |
| `summary` | string, ≥10 chars | One-line headline shown in the approach selector. |
| `intuition` | string, ≥40 chars | Markdown. The **why**. Multi-paragraph reasoning, not just the algorithm. |
| `steps` | string[], ≥2 | Numbered algorithm: each entry is one step. The UI renders these as an ordered list. |
| `code` | `{javascript, python}` | Full **reference solution** in both languages. Must compile/run as-is, with the same function name as `starter_code`. |
| `time_complexity` | string, `O(...)` | Big-O for this approach specifically. |
| `space_complexity` | string, `O(...)` | Same. |

### Code & complexity (problem-level summary)

| Field | Type | Notes |
|---|---|---|
| `starter_code` | `{javascript, python}` | The function signature + a `// Your code here` body. The function name MUST match what the test harness will call (typically the `kebab-to-camel(slug)` for JS, `slug-to-snake(slug)` for Python). |
| `time_complexity` | string, `O(...)` | The *optimal* time complexity. Mirrors `approaches[last].time_complexity`. |
| `space_complexity` | string, `O(...)` | Same for space. |

### Test cases

| Field | Type | Notes |
|---|---|---|
| `test_cases` | TestCase[], 10–25 | Mix of visible and hidden. SHOULD have ≥4 visible and ≥5 hidden. Hidden cases SHOULD include edge cases listed in `edge_cases`. |

Each `TestCase`:

```jsonc
{
  "input_payload": { /* named arguments — same names as starter_code params */ },
  "expected_output": <any JSON value>,
  "is_hidden": true | false,
  "order_index": 1, 2, 3, ...,             // unique within the problem, starts at 1
  "label": "all-zeros boundary case"       // optional, helps debug runs
}
```

The `input_payload` is a **named-argument object**. The Phase 2 Judge0
harness will deserialize this object and call the user's function with
arguments in the same order as the function signature. This makes the
test format language-neutral.

`expected_output` is a literal JSON value (number, string, boolean, array,
nested object). The Phase 2 harness performs deep equality against the
user's return value (with array-set tolerance for problems where order is
unspecified — opt-in via the optional `match_strategy` field; not yet
implemented).

---

## Problem object — optional fields

| Field | Type | When to use |
|---|---|---|
| `companies` | string[] | Companies that have asked this problem. Surface in UI as company tags. |
| `related_problems` | RelatedProblem[] | `{slug, title, difficulty}` triples. Slugs may reference unauthored problems — the UI gracefully degrades a missing slug to a non-clickable label. Use this to seed the "Up Next" sidebar even before all referenced problems are written. |
| `video_url` | string (https URL) | Optional YouTube link to a walkthrough. |

---

## Validation rules summarized

The schema validator rejects a file if any of the following hold:

1. `schema_version` is present and is not exactly `"2.0"`.
2. Any required field is missing or wrong type.
3. `slug` is duplicated across problems within the file.
4. `slug` violates the kebab-case pattern.
5. `examples.length < 3` or `> 5`.
6. `edge_cases.length < 3`.
7. `hints.length < 2` or `> 5`.
8. `approaches.length < 2`.
9. Any approach is missing `intuition`, `steps`, or both languages of `code`.
10. `starter_code` is missing either language.
11. `time_complexity` or `space_complexity` doesn't match the `O(...)` pattern.
12. `test_cases.length < 10` or `> 25`.
13. `test_cases[].order_index` is not unique within the problem.
14. Any test case is missing `input_payload`, `expected_output`, `is_hidden`, or `order_index`.
15. The number of visible test cases is `< 4`, or the number of hidden is `< 5`.
16. Any `related_problem.difficulty` isn't one of `Easy|Medium|Hard`.
17. Any unknown top-level or per-problem field appears (`additionalProperties: false`).

The CLI exits with code 1 on any violation and prints a per-file,
per-problem violation report.

---

## Authoring workflow

```bash
# 1. Author your file at server/data/learning/problems/<topic>/<pattern>.json
#    (Use the JSON Schema in your editor for autocomplete + validation.)

# 2. Validate before seeding:
node server/scripts/validate-problem-schema.js

# 3. If clean, seed:
npm run seed:learning
```

The seeder runs the validator automatically as part of its pre-flight
integrity step, so you cannot accidentally seed a malformed file.

---

## Reference exemplars

Three v2-compliant exemplars are shipped alongside this spec:

- `problems/arrays/kadane-maximum-subarray.json` → **Maximum Subarray** (Medium)
- `problems/stack-queue/parenthesis-matching.json` → **Valid Parentheses** (Easy)
- `problems/sliding-window-two-pointers/variable-size-sliding-window.json` → **Longest Substring Without Repeating Characters** (Medium)

When in doubt about formatting, depth, or tone, copy the structure of
these files. They are the canonical templates.
