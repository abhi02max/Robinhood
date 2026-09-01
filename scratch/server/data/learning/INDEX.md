# Learning Curriculum Data — Generation Manifest

This directory is the **single source of truth** for the LeetCode-style learning system.
It maps 1:1 onto the SQL schema in `server/schema-leetcode.sql`.

## Directory layout

```
server/data/learning/
├── INDEX.md                                 ← this file (manifest + status)
├── topics.json                              ← all 17 topics, full metadata
├── patterns/
│   └── <topic-slug>.json                    ← patterns belonging to that topic (5–8 each)
└── problems/
    └── <topic-slug>/
        └── <pattern-slug>.json              ← problems + test_cases for that pattern
```

## File contracts

### `topics.json`
```jsonc
{
  "version": "1.0.0",
  "topics": [
    {
      "slug": "arrays",                      // unique, kebab-case, used as URL fragment
      "name": "Arrays",                      // display name
      "order_index": 3,                      // curriculum sequence
      "description": "...",                  // 1–2 paragraphs, learner-facing
      "prerequisites": ["basics"],           // array of topic slugs
      "learning_outcomes": ["..."]           // 3–6 measurable outcomes
    }
  ]
}
```

### `patterns/<topic-slug>.json`
```jsonc
{
  "topic_slug": "sliding-window-two-pointers",
  "patterns": [
    {
      "slug": "fixed-size-sliding-window",
      "name": "Fixed-Size Sliding Window",
      "order_index": 1,
      "explanation": "...",                  // what the pattern *is*
      "when_to_use": "...",                  // signals in the problem statement
      "intuition": "...",                    // why it works, mental model
      "common_pitfalls": ["..."],
      "complexity_signature": "O(N) time, O(1) space typical"
    }
  ]
}
```

### `problems/<topic-slug>/<pattern-slug>.json`
```jsonc
{
  "topic_slug": "sliding-window-two-pointers",
  "pattern_slug": "fixed-size-sliding-window",
  "problems": [
    {
      "slug": "maximum-average-subarray-i",
      "title": "Maximum Average Subarray I",
      "difficulty": "Easy",                  // Easy | Medium | Hard
      "description": "...",                  // markdown, multi-paragraph, LeetCode-grade
      "examples": [
        { "input": "...", "output": "...", "explanation": "..." }
      ],
      "constraints": ["1 <= n <= 10^5", "..."],
      "edge_cases": ["..."],
      "approach_brute": "...",               // markdown, includes complexity & why it fails
      "approach_optimal": "...",             // markdown, includes complexity & why it works
      "starter_code": {
        "javascript": "function findMaxAverage(nums, k) {\n  // Your code here\n}",
        "python": "def find_max_average(nums: list[int], k: int) -> float:\n    pass"
      },
      "tags": ["arrays", "sliding-window", "fixed-window"],
      "time_complexity": "O(N)",
      "space_complexity": "O(1)",
      "test_cases": [
        {
          "input_payload": { "nums": [1,12,-5,-6,50,3], "k": 4 },
          "expected_output": 12.75,
          "is_hidden": false,
          "order_index": 1
        }
        // ≥10 total per problem, ≥5 hidden
      ]
    }
  ]
}
```

## Generation status

> **The table below is a snapshot from 2026-08-30 and is no longer maintained by hand.**
>
> Phase 3A.1 moved three problems between patterns, which made two of its rows wrong
> immediately — which is the problem with a hand-maintained count. The authoritative,
> recomputed-from-source version is:
>
> ```
> npm run audit:curriculum
> ```
>
> which writes `docs/CURRICULUM_AUDIT.md` and `server/scripts/curriculum-coverage-report.json`
> from `topics.json`, `patterns/*.json` and `problems/`. It also distinguishes patterns that are
> **coding-capable** from those that are **conceptual** or **structurally blocked**, so the
> coverage figure means something: 108 is not the right denominator.
>
> Kept here for the per-topic prose and the 🚫 notes, which are still accurate.

Measured against the live database on 2026-08-30: 96 problems, 1,168 test cases,
16 of 108 patterns filled. **Superseded — regenerate rather than trusting these numbers.**

Legend: ✅ complete · 🟡 partial · ⬜ pending · 🚫 blocked

| #  | Topic                         | Slug                          | Patterns filled | Problems |
|----|-------------------------------|-------------------------------|-----------------|----------|
| 1  | Basics                        | `basics`                      | 0 / 6           | ⬜ 0     |
| 2  | Sorting                       | `sorting`                     | 0 / 6           | ⬜ 0     |
| 3  | Arrays                        | `arrays`                      | 2 / 7           | 🟡 6     |
| 4  | Binary Search                 | `binary-search`               | 1 / 6           | 🟡 4     |
| 5  | Strings                       | `strings`                     | 1 / 6           | 🟡 4     |
| 6  | Linked List                   | `linked-list`                 | 0 / 6           | 🚫 0     |
| 7  | Recursion                     | `recursion`                   | 0 / 6           | ⬜ 0     |
| 8  | Bit Manipulation              | `bit-manipulation`            | 1 / 6           | 🟡 4     |
| 9  | Stack & Queue                 | `stack-queue`                 | 2 / 7           | 🟡 5     |
| 10 | Sliding Window & Two Pointers | `sliding-window-two-pointers` | 6 / 7           | ✅ 61 (REF) |
| 11 | Heaps                         | `heaps`                       | 0 / 6           | ⬜ 0     |
| 12 | Greedy                        | `greedy`                      | 1 / 6           | 🟡 4     |
| 13 | Binary Trees                  | `binary-trees`                | 0 / 7           | 🚫 0     |
| 14 | BST                           | `bst`                         | 0 / 5           | 🚫 0     |
| 15 | Graphs                        | `graphs`                      | 1 / 8           | 🟡 4     |
| 16 | Dynamic Programming           | `dynamic-programming`         | 1 / 8           | 🟡 4     |
| 17 | Tries                         | `tries`                       | 0 / 5           | ⬜ 0     |

REF = reference topic, the original quality benchmark.

🚫 = **blocked on the execution harness, not on authoring.** Arguments are decoded from
JSON into the types in `CPP_TYPE_MAP`, which has no encoding for a node with pointers.
Passing a linked list or tree as a flat array produces problems that are solvable without
the algorithm they are meant to teach — `linked-list-cycle` in this repo is that mistake
already made. These three topics need a node type in the harness first.

## How problems are added now

Problems in `problems/` are **generated** from specs in `authoring/<topic>/<pattern>.mjs`
by `server/scripts/build-authored-problems.js`. A spec contains no expected outputs: it
carries the prose, a brute force, and two independently written reference solutions, and
the build computes every `expected_output` and refuses to write unless all three agree,
every worked example matches its hand-stated answer, and the spec's own `assume`
precondition holds for every payload.

`server/data/learning/problems/sliding-window-two-pointers/` and the two other v1 files
predate the pipeline and are still hand-maintained.

## Authoring rules (followed by every problem file)

1. **No templated junk.** Every problem references a real, named, verifiable algorithmic problem (most map to canonical LeetCode entries; some are well-known textbook problems).
2. **Test-case outputs are computed, then cross-checked.** Hand-computed expected values are how a problem ships that grades a correct answer as Wrong, so the build derives them from a reference implementation and requires a second implementation and a brute force to agree. The hand-written part is the *worked examples*, which the references must then reproduce — that is what catches a reference solving the wrong problem.
3. **≥10 test cases per problem, ≥5 hidden.** Visible cases are the canonical examples + 1–2 trivial. Hidden cases include edge boundaries (empty, size-1, all-equal, max-size, negative-only, integer-overflow-adjacent), adversarial inputs (worst-case for the brute force), and stress cases.
4. **Examples are formatted as plain text input/output strings** (LeetCode style) but the **test_cases use structured JSON payloads** — these are different on purpose: examples render in the description, test cases drive the executor.
5. **Starter code is provided in JavaScript and Python** with idiomatic signatures matching the test-case payload keys.
6. **Tags include topic slug + pattern slug + 1–3 algorithmic tags** for cross-cutting search.
