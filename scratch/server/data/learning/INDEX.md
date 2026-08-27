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

Legend: ✅ complete · 🟡 partial · ⬜ pending

| # | Topic                              | Slug                              | Topic meta | Patterns | Problems |
|---|------------------------------------|-----------------------------------|------------|----------|----------|
| 1 | Basics                             | `basics`                          | ✅         | ✅       | ⬜       |
| 2 | Sorting                            | `sorting`                         | ✅         | ✅       | ⬜       |
| 3 | Arrays                             | `arrays`                          | ✅         | ✅       | ⬜       |
| 4 | Binary Search                      | `binary-search`                   | ✅         | ✅       | ⬜       |
| 5 | Strings                            | `strings`                         | ✅         | ✅       | ⬜       |
| 6 | Linked List                        | `linked-list`                     | ✅         | ✅       | ⬜       |
| 7 | Recursion                          | `recursion`                       | ✅         | ✅       | ⬜       |
| 8 | Bit Manipulation                   | `bit-manipulation`                | ✅         | ✅       | ⬜       |
| 9 | Stack & Queue                      | `stack-queue`                     | ✅         | ✅       | ⬜       |
|10 | Sliding Window & Two Pointers      | `sliding-window-two-pointers`     | ✅         | ✅       | ✅ (REF) |
|11 | Heaps                              | `heaps`                           | ✅         | ✅       | ⬜       |
|12 | Greedy                             | `greedy`                          | ✅         | ✅       | ⬜       |
|13 | Binary Trees                       | `binary-trees`                    | ✅         | ✅       | ⬜       |
|14 | BST                                | `bst`                             | ✅         | ✅       | ⬜       |
|15 | Graphs                             | `graphs`                          | ✅         | ✅       | ⬜       |
|16 | Dynamic Programming                | `dynamic-programming`             | ✅         | ✅       | ⬜       |
|17 | Tries                              | `tries`                           | ✅         | ✅       | ⬜       |

REF = Reference topic, fully implemented end-to-end as the quality benchmark.

## Phase 1 batch plan

| Batch | Deliverable                                             | Status |
|-------|---------------------------------------------------------|--------|
| 1.A   | Architecture + topics.json + all 17 pattern files + reference topic problems | THIS BATCH |
| 1.B   | Problems for `arrays`                                   | next   |
| 1.C   | Problems for `binary-search`                            |        |
| 1.D   | Problems for `strings`                                  |        |
| 1.E   | Problems for `linked-list`                              |        |
| 1.F   | Problems for `recursion`                                |        |
| 1.G   | Problems for `stack-queue`                              |        |
| 1.H   | Problems for `dynamic-programming` (split across 2 batches if needed) |        |
| 1.I   | Problems for `graphs`                                   |        |
| 1.J   | Problems for `binary-trees`                             |        |
| 1.K   | Problems for `bst`                                      |        |
| 1.L   | Problems for `heaps`                                    |        |
| 1.M   | Problems for `greedy`                                   |        |
| 1.N   | Problems for `tries`                                    |        |
| 1.O   | Problems for `bit-manipulation`                         |        |
| 1.P   | Problems for `sorting`                                  |        |
| 1.Q   | Problems for `basics`                                   |        |

After 1.Q ships, Phase 1 is complete and Phase 2 (backend integration / loader) begins.

## Authoring rules (followed by every problem file)

1. **No templated junk.** Every problem references a real, named, verifiable algorithmic problem (most map to canonical LeetCode entries; some are well-known textbook problems).
2. **Test cases must be deterministic and verifiable** — output is computed by hand from the algorithm spec, not auto-generated against a possibly-buggy implementation.
3. **≥10 test cases per problem, ≥5 hidden.** Visible cases are the canonical examples + 1–2 trivial. Hidden cases include edge boundaries (empty, size-1, all-equal, max-size, negative-only, integer-overflow-adjacent), adversarial inputs (worst-case for the brute force), and stress cases.
4. **Examples are formatted as plain text input/output strings** (LeetCode style) but the **test_cases use structured JSON payloads** — these are different on purpose: examples render in the description, test cases drive the executor.
5. **Starter code is provided in JavaScript and Python** with idiomatic signatures matching the test-case payload keys.
6. **Tags include topic slug + pattern slug + 1–3 algorithmic tags** for cross-cutting search.
