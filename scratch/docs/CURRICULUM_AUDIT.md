# Curriculum audit

**Generated** by `node server/scripts/curriculum-audit.mjs`. Do not edit by hand — every
number below is recomputed from `topics.json`, `patterns/*.json` and `problems/`.

Generated at `2026-09-01T17:59:58.027Z`.

Sections 1–4 are **repository facts**. Sections 5 onward are **engineering judgement**,
kept separate on purpose. No company-frequency figures are used anywhere.

## 1. Totals

| | |
| --- | ---: |
| Problems | 96 |
| Easy | 34 |
| Medium | 52 |
| Hard | 10 |
| Test cases | 1168 |
| Topics | 17 |
| Patterns | 108 |
| Empty topics | 8 |
| Empty patterns | 92 (85.2%) |
| Patterns with exactly 1 problem | 3 (2.8%) |
| Patterns with exactly 2 problems | 0 |
| Patterns with 2 or more | 13 (12%) |

### Coverage by pattern KIND — the meaningful KPI

Counting all 108 patterns in one denominator is true but misleading: it treats a pattern that
should never hold a coding problem, and one the execution architecture cannot represent yet,
as if they were simply unwritten. Neither is a content gap.

| | | |
| --- | ---: | --- |
| Total patterns | 108 | |
| **Coding-capable** | **79** | the real denominator |
| Conceptual | 2 | deliberately never a graded function |
| Structurally blocked | 27 | architecture, not content |

Of the coding-capable patterns:

| Problems | Patterns |
| --- | ---: |
| 0 (empty) | 63 |
| 1 | 3 |
| 2–4 | 6 |
| 5+ | 7 |

Populated: **16 of 79 (20.3%)**.

### Concentration

The single most populated topic is **sliding-window-two-pointers** with 
**58 of 96 problems (60.4%)**. 
The five largest patterns hold **59.4%** of everything.

## 2. Topic distribution

| # | Topic | Patterns | Filled | Problems | E | M | H | Prerequisites |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Basics | 6 | 0 | **0** | 0 | 0 | 0 | — |
| 2 | Sorting | 6 | 0 | **0** | 0 | 0 | 0 | basics |
| 3 | Arrays | 7 | 2 | 6 | 2 | 4 | 0 | basics, sorting |
| 4 | Binary Search | 6 | 1 | 4 | 3 | 1 | 0 | basics, sorting |
| 5 | Strings | 6 | 1 | 4 | 3 | 1 | 0 | arrays |
| 6 | Linked List | 6 | 0 | **0** | 0 | 0 | 0 | basics |
| 7 | Recursion | 6 | 0 | **0** | 0 | 0 | 0 | basics |
| 8 | Bit Manipulation | 6 | 1 | 4 | 3 | 1 | 0 | basics |
| 9 | Stack & Queue | 7 | 2 | 8 | 2 | 5 | 1 | arrays |
| 10 | Sliding Window & Two Pointers | 7 | 6 | 58 | 17 | 32 | 9 | arrays, strings |
| 11 | Heaps | 6 | 0 | **0** | 0 | 0 | 0 | arrays, sorting |
| 12 | Greedy | 6 | 1 | 4 | 1 | 3 | 0 | sorting, arrays |
| 13 | Binary Trees | 7 | 0 | **0** | 0 | 0 | 0 | recursion |
| 14 | BST | 5 | 0 | **0** | 0 | 0 | 0 | binary-trees |
| 15 | Graphs | 8 | 1 | 4 | 1 | 3 | 0 | binary-trees, heaps, stack-queue |
| 16 | Dynamic Programming | 8 | 1 | 4 | 2 | 2 | 0 | recursion, arrays |
| 17 | Tries | 5 | 0 | **0** | 0 | 0 | 0 | binary-trees |

## 3. Every pattern

### 1. Basics `basics` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Complexity Analysis | **0** | 0 | 0 | 0 | FOUNDATION 💭 | — |
| 2 | Direct Simulation | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 3 | Integer Math & Modular Arithmetic | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 4 | Prefix & Running Aggregates | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 5 | Sieve of Eratosthenes & Primes | **0** | 0 | 0 | 0 | SPECIALIZED | — |
| 6 | Base Conversion & Bit Basics | **0** | 0 | 0 | 0 | IMPORTANT | — |

### 2. Sorting `sorting` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Elementary Comparison Sorts | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 2 | Merge Sort (Divide & Conquer) | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 3 | Quicksort & Partitioning | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 4 | Heap Sort | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Non-Comparison Sorts (Counting / Radix / Bucket) | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 6 | Custom Comparators & Stability | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |

### 3. Arrays `arrays` — 6 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Prefix Sum | 5 | 2 | 3 | 0 | FOUNDATION | running-sum-of-1d-array (E), find-pivot-index (E), subarray-sum-equals-k (M), product-of-array-except-self (M), contiguous-array (M) |
| 2 | Difference Array (Range Updates) | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 3 | Kadane's Algorithm (Max Subarray) | 1 | 0 | 1 | 0 | CORE_INTERVIEW | maximum-subarray (M) |
| 4 | In-Place Rearrangement | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 5 | Cyclic Sort | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 6 | Dutch National Flag (3-Way Partition) | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 7 | Interval Manipulation | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |

### 4. Binary Search `binary-search` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Classic Binary Search on Sorted Array | 4 | 3 | 1 | 0 | FOUNDATION | binary-search (E), search-insert-position (E), find-smallest-letter-greater-than-target (E), single-element-in-a-sorted-array (M) |
| 2 | Lower Bound & Upper Bound | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 3 | Binary Search on Rotated Sorted Array | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 4 | Binary Search on 2D Matrix | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Binary Search on the Answer Space | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 6 | Peak Element & Bitonic Search | **0** | 0 | 0 | 0 | IMPORTANT | — |

### 5. Strings `strings` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Character Frequency Counter | 4 | 3 | 1 | 0 | FOUNDATION | valid-anagram (E), ransom-note (E), first-unique-character-in-a-string (E), sort-characters-by-frequency (M) |
| 2 | Palindrome Expansion | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 3 | KMP & Failure Function | **0** | 0 | 0 | 0 | ADVANCED | — |
| 4 | Z-Algorithm | **0** | 0 | 0 | 0 | SPECIALIZED | — |
| 5 | Rolling Hash (Rabin–Karp) | **0** | 0 | 0 | 0 | ADVANCED | — |
| 6 | Manacher's Algorithm | **0** | 0 | 0 | 0 | SPECIALIZED | — |

### 6. Linked List `linked-list` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Dummy / Sentinel Node | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 2 | In-Place Reversal | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 3 | Fast & Slow Pointer | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 4 | Cycle Detection (Floyd's Tortoise & Hare) | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 5 | Merge & Split | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 6 | K-th Node & Rearrangement | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |

### 7. Recursion `recursion` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Subset Generation (Include / Exclude) | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 2 | Permutations (Swap-Based) | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 3 | Backtracking with State Restore | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 4 | Divide & Conquer | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Decision Tree Recursion | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 6 | Recursion on Linked Structures | **0** | 0 | 0 | 0 | FOUNDATION ⛔ | — |

### 8. Bit Manipulation `bit-manipulation` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Set / Clear / Toggle / Test | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 2 | XOR Properties (Single Number) | 4 | 3 | 1 | 0 | CORE_INTERVIEW | single-number (E), missing-number (E), xor-operation-in-an-array (E), single-number-iii (M) |
| 3 | Count Set Bits (Popcount) | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 4 | Subset Enumeration via Bitmask | **0** | 0 | 0 | 0 | ADVANCED | — |
| 5 | Bitmask as DP State | **0** | 0 | 0 | 0 | ADVANCED | — |
| 6 | Power-of-Two Detection & Bit Tricks | **0** | 0 | 0 | 0 | IMPORTANT | — |

### 9. Stack & Queue `stack-queue` — 8 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Parenthesis & Bracket Matching | 1 | 1 | 0 | 0 | FOUNDATION | valid-parentheses (E) |
| 2 | Monotonic Stack | 7 | 1 | 5 | 1 | CORE_INTERVIEW | sum-of-subarray-minimums (M), largest-rectangle-in-histogram (H), maximum-subarray-min-product (M), next-greater-element-i (E), next-greater-element-ii (M), daily-temperatures (M), remove-k-digits (M) |
| 3 | Monotonic Deque (Sliding Window Max) | **0** | 0 | 0 | 0 | ADVANCED | — |
| 4 | Expression Evaluation (Infix / Postfix) | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Augmented Stack (Min/Max Stack) | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 6 | Queue from Stacks (and Vice Versa) | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 7 | BFS via Queue (Level-by-Level State Search) | **0** | 0 | 0 | 0 | ADVANCED | — |

### 10. Sliding Window & Two Pointers `sliding-window-two-pointers` — 58 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Fixed-Size Sliding Window | 12 | 5 | 7 | 0 | FOUNDATION | maximum-average-subarray-i (E), find-all-anagrams-in-a-string (M), permutation-in-string (M), maximum-vowels-in-substring-of-given-length (M), subarrays-of-size-k-with-average-at-least-threshold (M), defuse-the-bomb (E), diet-plan-performance (E), grumpy-bookstore-owner (M), k-radius-subarray-averages (M), maximum-points-from-cards (M), substrings-of-size-three-with-distinct-characters (E), minimum-difference-between-highest-and-lowest-of-k-scores (E) |
| 2 | Variable-Size Sliding Window (Shrink-on-Violation) | 1 | 0 | 1 | 0 | FOUNDATION | longest-substring-without-repeating-characters (M) |
| 3 | At-Most-K / Exactly-K Window Decomposition | 12 | 1 | 9 | 2 | CORE_INTERVIEW | subarrays-with-k-different-integers (H), count-number-of-nice-subarrays (M), binary-subarrays-with-sum (M), get-equal-substrings-within-budget (M), frequency-of-most-frequent-element (M), maximum-erasure-value (M), continuous-subarrays (M), count-subarrays-where-max-element-appears-at-least-k-times (M), number-of-substrings-with-only-1s (M), count-vowel-substrings-of-a-string (E), find-substrings-of-size-k-with-no-repeats (M), count-subarrays-with-score-less-than-k (H) |
| 4 | Opposite-Direction Two Pointers (Converging on Sorted Input) | 12 | 5 | 6 | 1 | FOUNDATION | two-sum-ii-sorted-array (M), 3sum (M), 4sum (M), container-with-most-water (M), trapping-rain-water (H), valid-palindrome (E), valid-palindrome-ii (E), reverse-string (E), sort-colors (M), squares-of-a-sorted-array (E), boats-to-save-people (M), two-sum-less-than-k (E) |
| 5 | Same-Direction Two Pointers (Fast & Slow / Partition) | 12 | 6 | 6 | 0 | FOUNDATION | remove-duplicates-from-sorted-array (E), remove-element (E), move-zeroes (E), linked-list-cycle (E), linked-list-cycle-ii (M), middle-of-the-linked-list (E), remove-nth-node-from-end-of-list (M), happy-number (E), remove-duplicates-from-sorted-array-ii (M), find-the-duplicate-number (M), partition-labels (M), string-compression (M) |
| 6 | Multi-Pointer Merge & Sweep | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 7 | Monotonic Deque Window (Sliding Min/Max in O(1) Amortized) | 9 | 0 | 3 | 6 | ADVANCED | sliding-window-maximum (H), sliding-window-minimum (H), constrained-subsequence-sum (H), shortest-subarray-with-sum-at-least-k (H), jump-game-vi (M), longest-continuous-subarray-with-absolute-diff (M), maximum-number-of-robots-within-budget (H), max-value-of-equation (H), continuous-subarrays-deque (M) |

### 11. Heaps `heaps` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Top-K via Bounded Heap | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 2 | K-Way Merge | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 3 | Two Heaps for Running Median | **0** | 0 | 0 | 0 | ADVANCED ⛔ | — |
| 4 | Scheduling / Earliest-Available with Heap | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Generic Priority Queue | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 6 | Heap Inside Dijkstra-Shape Algorithms | **0** | 0 | 0 | 0 | ADVANCED | — |

### 12. Greedy `greedy` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Sort Then Pick | **0** | 0 | 0 | 0 | FOUNDATION | — |
| 2 | Interval Scheduling | 4 | 1 | 3 | 0 | CORE_INTERVIEW | meeting-rooms (E), non-overlapping-intervals (M), minimum-number-of-arrows-to-burst-balloons (M), maximum-length-of-pair-chain (M) |
| 3 | Exchange-Argument Proof | **0** | 0 | 0 | 0 | ADVANCED 💭 | — |
| 4 | Gas Station / Circular Greedy | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | Jump Game (Reachability Greedy) | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 6 | Huffman-Style Repeated Merge | **0** | 0 | 0 | 0 | IMPORTANT | — |

### 13. Binary Trees `binary-trees` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | DFS Traversals (Pre / In / Post-Order) | **0** | 0 | 0 | 0 | FOUNDATION ⛔ | — |
| 2 | BFS / Level-Order Traversal | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 3 | Recursion with Return Contract | **0** | 0 | 0 | 0 | FOUNDATION ⛔ | — |
| 4 | Path Sum & Diameter | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 5 | Construction from Traversals | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 6 | Lowest Common Ancestor (LCA) | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 7 | Serialization & Deserialization | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |

### 14. BST `bst` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | In-Order Sortedness | **0** | 0 | 0 | 0 | FOUNDATION ⛔ | — |
| 2 | Validation with Bounds | **0** | 0 | 0 | 0 | CORE_INTERVIEW ⛔ | — |
| 3 | Insert / Delete in BST | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 4 | K-th Smallest / Largest via Inorder | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 5 | Range Queries on BST | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |

### 15. Graphs `graphs` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | BFS for Unweighted Shortest Path | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 2 | DFS for Connectivity & Components | 4 | 1 | 3 | 0 | FOUNDATION | number-of-islands (M), max-area-of-island (M), find-if-path-exists-in-graph (E), number-of-connected-components-in-an-undirected-graph (M) |
| 3 | Topological Sort | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 4 | Union-Find (DSU) | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 5 | Dijkstra's Algorithm | **0** | 0 | 0 | 0 | ADVANCED | — |
| 6 | Bellman–Ford & Negative Cycles | **0** | 0 | 0 | 0 | SPECIALIZED | — |
| 7 | Minimum Spanning Tree (Prim / Kruskal) | **0** | 0 | 0 | 0 | SPECIALIZED | — |
| 8 | Cycles & Strongly Connected Components | **0** | 0 | 0 | 0 | ADVANCED | — |

### 16. Dynamic Programming `dynamic-programming` — 4 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 1D State DP | 4 | 2 | 2 | 0 | FOUNDATION | climbing-stairs (E), min-cost-climbing-stairs (E), house-robber (M), decode-ways (M) |
| 2 | 2D Grid DP | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 3 | 0/1 Knapsack | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 4 | Unbounded Knapsack & Coin Change | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 5 | LIS & LCS | **0** | 0 | 0 | 0 | CORE_INTERVIEW | — |
| 6 | Edit Distance & String Alignment | **0** | 0 | 0 | 0 | IMPORTANT | — |
| 7 | Interval & Partition DP | **0** | 0 | 0 | 0 | ADVANCED | — |
| 8 | Bitmask DP & Tree DP | **0** | 0 | 0 | 0 | SPECIALIZED | — |

### 17. Tries `tries` — 0 problem(s)

| # | Pattern | Count | E | M | H | Tier | Problems |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Character Trie Basics (Insert / Search / StartsWith) | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 2 | Prefix Counting & Autocomplete | **0** | 0 | 0 | 0 | IMPORTANT ⛔ | — |
| 3 | Word Search with Trie + DFS Pruning | **0** | 0 | 0 | 0 | ADVANCED ⛔ | — |
| 4 | Binary Trie for Maximum XOR | **0** | 0 | 0 | 0 | SPECIALIZED ⛔ | — |
| 5 | Trie with Counts & Deletion | **0** | 0 | 0 | 0 | SPECIALIZED ⛔ | — |

⛔ = structurally blocked (architecture, not content). 💭 = conceptual, deliberately not a graded
function. Neither counts as a missing coding problem; see section 6.

## 4. Data defects observed (not fixed)

### medium (7)

- **INVERTED_TEACHING_ORDER** `basics/prefix-arithmetic-basics` — "basics/prefix-arithmetic-basics" holds 0 problems while "arrays/prefix-sum" — which builds on it — holds 5. (Dependency is a curriculum judgement, not repository metadata.)
- **INVERTED_TEACHING_ORDER** `bit-manipulation/basic-bit-ops` — "bit-manipulation/basic-bit-ops" holds 0 problems while "bit-manipulation/xor-properties" — which builds on it — holds 4. (Dependency is a curriculum judgement, not repository metadata.)
- **INVERTED_TEACHING_ORDER** `greedy/sort-then-greedy` — "greedy/sort-then-greedy" holds 0 problems while "greedy/interval-scheduling" — which builds on it — holds 4. (Dependency is a curriculum judgement, not repository metadata.)
- **INVERTED_TEACHING_ORDER** `sorting/custom-comparator-and-stability` — "sorting/custom-comparator-and-stability" holds 0 problems while "greedy/interval-scheduling" — which builds on it — holds 4. (Dependency is a curriculum judgement, not repository metadata.)
- **INVERTED_TEACHING_ORDER** `recursion/subset-include-exclude` — "recursion/subset-include-exclude" holds 0 problems while "dynamic-programming/1d-state" — which builds on it — holds 4. (Dependency is a curriculum judgement, not repository metadata.)
- **NO_ENTRY_PROBLEM** `sliding-window-two-pointers/monotonic-deque-window` — 9 problems, none Easy (M3 H6) — a learner meets this pattern for the first time at Medium.
- **DUPLICATE_PROBLEM** `continuous-subarrays vs continuous-subarrays-deque` — identical signature (vector<int>->int) AND byte-identical test cases. sliding-window-two-pointers/at-most-k-window vs sliding-window-two-pointers/monotonic-deque-window. One of the two inflates the problem count without teaching anything new. Not deleted in 3A.1: removing a problem changes the milestone baseline and is a content decision.

### low (4)

- **DUPLICATE_CONCEPT** `stack-queue/monotonic-deque vs sliding-window-two-pointers/monotonic-deque-window` — Two patterns for the same technique in different topics. The stack-queue one is empty; the sliding-window one holds the repo's largest concentration of Hard problems. [measured: stack-queue/monotonic-deque=0, sliding-window-two-pointers/monotonic-deque-window=9]
- **DUPLICATE_CONCEPT** `arrays/dutch-national-flag vs sliding-window-two-pointers/opposite-direction-two-pointers` — Three-way partition. The arrays pattern is empty, but sort-colors — the canonical Dutch-flag problem — is already authored under opposite-direction-two-pointers. [measured: arrays/dutch-national-flag=0, sliding-window-two-pointers/opposite-direction-two-pointers=12]
- **MISPLACED_PROBLEM** `sliding-window-two-pointers/same-direction-two-pointers vs linked-list/*` — Four linked-list problems are authored under a two-pointer pattern because the linked-list topic is harness-blocked. NOT relocated in 3A.1 — see REQUIRES_REAUTHOR_AFTER_NODE_ENCODING: relocation alone is insufficient because a cycle cannot be represented in a flat array at all. [measured: sliding-window-two-pointers/same-direction-two-pointers=12]
- **CONTRADICTORY_ORDERING_PROSE** `4sum` — the statement says the answer may be returned "in any order" and then requires a specific one. The grader compares with an exact deepEqual, so only the specific order is accepted and the first clause is false. Wording fix, no behaviour change.

## 5. Classification

Judgement. Tier definitions:

- **FOUNDATION** — a later pattern cannot be taught without it, or it is the base recognition shape of its topic
- **CORE_INTERVIEW** — expected to be recognised on sight
- **IMPORTANT** — worth teaching, nothing blocked on it
- **ADVANCED** — a variation of something already taught, or several prerequisites deep
- **SPECIALIZED** — narrow, single-technique or competitive territory

| Tier | Patterns | Populated | Empty |
| --- | ---: | ---: | ---: |
| FOUNDATION | 23 | 10 | 13 |
| CORE_INTERVIEW | 34 | 5 | 29 |
| IMPORTANT | 29 | 0 | 29 |
| ADVANCED | 14 | 1 | 13 |
| SPECIALIZED | 8 | 0 | 8 |

## 6. Structural blockers

undefined of 108 patterns cannot receive a problem today, for reasons that are not about priority.

### NODE_ENCODING — harness has no node type

Arguments are decoded into the canonical type vocabulary, which has no encoding for a node with pointers. Passing a list or tree as a flat array yields problems solvable without the algorithm they teach — the repo already contains that mistake as linked-list-cycle, sitting in same-direction-two-pointers.

Topics: `linked-list`, `binary-trees`, `bst`
Patterns: `recursion/recursion-on-data-structures`

### DESIGN_SHAPED — needs a class/multi-method signature

The signature model is one function with typed arguments and one return. A problem whose whole point is a stateful object with several methods (min-stack, a queue built from stacks, a trie, a median stream) cannot be expressed, and flattening it into one call removes the thing being taught.

Topics: `tries`
Patterns: `stack-queue/stack-with-aggregate`, `stack-queue/queue-from-stacks`, `heaps/two-heaps-median`, `binary-trees/serialization`, `bst/insert-delete-bst`

### NOT_A_GRADED_FUNCTION — not naturally a graded function

Reasoning about asymptotic cost, or proving an exchange argument, is assessed by explanation rather than by a return value. Forcing it into a unit-tested function produces a problem that tests something other than the skill.

Patterns: `basics/complexity-analysis`, `greedy/exchange-argument`

## 7. Pattern dependency view

**Judgement.** `patterns/*.json` has no `prerequisites` field, so none of this is
repository metadata. Topic-level prerequisites in `topics.json` ARE, and appear in section 2.

| Pattern | Needs first |
| --- | --- |
| `arrays/prefix-sum` | `basics/prefix-arithmetic-basics` |
| `arrays/kadane-maximum-subarray` | `arrays/prefix-sum` |
| `arrays/difference-array` | `arrays/prefix-sum` |
| `arrays/intervals` | `sorting/custom-comparator-and-stability` |
| `arrays/dutch-national-flag` | `sliding-window-two-pointers/opposite-direction-two-pointers` |
| `arrays/cyclic-sort` | `arrays/in-place-rearrangement` |
| `binary-search/lower-upper-bound` | `binary-search/classic-binary-search` |
| `binary-search/binary-search-on-rotated` | `binary-search/lower-upper-bound` |
| `binary-search/binary-search-on-answer` | `binary-search/lower-upper-bound` |
| `binary-search/binary-search-on-2d-matrix` | `binary-search/lower-upper-bound` |
| `binary-search/peak-and-bitonic` | `binary-search/classic-binary-search` |
| `sliding-window-two-pointers/variable-size-sliding-window` | `sliding-window-two-pointers/fixed-size-sliding-window` |
| `sliding-window-two-pointers/at-most-k-window` | `sliding-window-two-pointers/variable-size-sliding-window` |
| `sliding-window-two-pointers/monotonic-deque-window` | `stack-queue/monotonic-stack`, `sliding-window-two-pointers/fixed-size-sliding-window` |
| `sliding-window-two-pointers/multi-pointer-merge` | `sliding-window-two-pointers/same-direction-two-pointers` |
| `strings/palindrome-expansion` | `strings/frequency-counter` |
| `strings/rolling-hash-rabin-karp` | `basics/integer-math-modular` |
| `strings/kmp-failure-function` | `strings/frequency-counter` |
| `strings/manacher-palindromes` | `strings/palindrome-expansion` |
| `bit-manipulation/xor-properties` | `bit-manipulation/basic-bit-ops` |
| `bit-manipulation/count-set-bits` | `bit-manipulation/basic-bit-ops` |
| `bit-manipulation/subset-enumeration-bitmask` | `bit-manipulation/basic-bit-ops`, `recursion/subset-include-exclude` |
| `bit-manipulation/bitmask-dp-state` | `bit-manipulation/subset-enumeration-bitmask`, `dynamic-programming/1d-state` |
| `bit-manipulation/power-of-two-and-tricks` | `bit-manipulation/basic-bit-ops` |
| `stack-queue/monotonic-stack` | `stack-queue/parenthesis-matching` |
| `stack-queue/monotonic-deque` | `stack-queue/monotonic-stack` |
| `stack-queue/expression-evaluation` | `stack-queue/parenthesis-matching` |
| `stack-queue/stack-with-aggregate` | `stack-queue/parenthesis-matching` |
| `recursion/permutation-swap` | `recursion/subset-include-exclude` |
| `recursion/backtracking-with-restore` | `recursion/subset-include-exclude` |
| `recursion/divide-and-conquer` | `sorting/merge-sort-divide-conquer` |
| `recursion/recursion-on-data-structures` | `recursion/subset-include-exclude` |
| `sorting/quick-sort-and-partition` | `sorting/comparison-sorts-elementary` |
| `sorting/merge-sort-divide-conquer` | `sorting/comparison-sorts-elementary` |
| `sorting/heap-sort` | `heaps/heap-as-priority-queue` |
| `sorting/custom-comparator-and-stability` | `sorting/comparison-sorts-elementary` |
| `heaps/top-k-with-heap` | `heaps/heap-as-priority-queue` |
| `heaps/k-way-merge` | `heaps/heap-as-priority-queue` |
| `heaps/two-heaps-median` | `heaps/heap-as-priority-queue` |
| `heaps/scheduling-with-heap` | `heaps/heap-as-priority-queue`, `arrays/intervals` |
| `heaps/heap-dijkstra-shape` | `heaps/heap-as-priority-queue`, `graphs/bfs-shortest-path` |
| `greedy/interval-scheduling` | `greedy/sort-then-greedy`, `sorting/custom-comparator-and-stability` |
| `greedy/exchange-argument` | `greedy/sort-then-greedy` |
| `greedy/jump-game-greedy` | `greedy/sort-then-greedy` |
| `greedy/gas-station-circular` | `arrays/prefix-sum` |
| `greedy/huffman-style-merge` | `heaps/heap-as-priority-queue` |
| `graphs/bfs-shortest-path` | `graphs/dfs-connectivity` |
| `graphs/topological-sort` | `graphs/dfs-connectivity` |
| `graphs/union-find` | `graphs/dfs-connectivity` |
| `graphs/dijkstra` | `graphs/bfs-shortest-path`, `heaps/heap-as-priority-queue` |
| `graphs/bellman-ford` | `graphs/dijkstra` |
| `graphs/mst-prim-kruskal` | `graphs/union-find`, `heaps/heap-as-priority-queue` |
| `graphs/cycle-and-scc` | `graphs/topological-sort` |
| `dynamic-programming/1d-state` | `recursion/subset-include-exclude` |
| `dynamic-programming/2d-grid` | `dynamic-programming/1d-state` |
| `dynamic-programming/0-1-knapsack` | `dynamic-programming/1d-state`, `recursion/subset-include-exclude` |
| `dynamic-programming/unbounded-knapsack` | `dynamic-programming/0-1-knapsack` |
| `dynamic-programming/lis-and-lcs` | `dynamic-programming/2d-grid` |
| `dynamic-programming/edit-distance-and-alignment` | `dynamic-programming/lis-and-lcs` |
| `dynamic-programming/interval-and-partition-dp` | `dynamic-programming/2d-grid` |
| `dynamic-programming/bitmask-and-tree-dp` | `dynamic-programming/0-1-knapsack`, `bit-manipulation/subset-enumeration-bitmask` |
| `binary-trees/dfs-traversals` | `recursion/recursion-on-data-structures` |
| `binary-trees/bfs-level-order` | `binary-trees/dfs-traversals` |
| `binary-trees/tree-recursion-with-return` | `binary-trees/dfs-traversals` |
| `binary-trees/path-and-diameter` | `binary-trees/tree-recursion-with-return` |
| `binary-trees/lowest-common-ancestor` | `binary-trees/tree-recursion-with-return` |
| `binary-trees/construction-from-traversals` | `binary-trees/dfs-traversals` |
| `binary-trees/serialization` | `binary-trees/bfs-level-order` |
| `bst/in-order-property` | `binary-trees/dfs-traversals` |
| `bst/validation-with-bounds` | `bst/in-order-property` |
| `bst/kth-element-via-inorder` | `bst/in-order-property` |
| `bst/insert-delete-bst` | `bst/in-order-property` |
| `bst/range-queries-bst` | `bst/in-order-property` |
| `linked-list/in-place-reversal` | `linked-list/dummy-node` |
| `linked-list/cycle-detection-floyd` | `linked-list/fast-slow-pointer` |
| `linked-list/merge-and-split` | `linked-list/dummy-node` |
| `linked-list/kth-node-and-rearrangement` | `linked-list/fast-slow-pointer` |
| `tries/prefix-and-autocomplete` | `tries/character-trie-basics` |
| `tries/word-search-with-trie` | `tries/character-trie-basics`, `recursion/backtracking-with-restore` |
| `tries/binary-trie-xor` | `tries/character-trie-basics`, `bit-manipulation/basic-bit-ops` |
| `tries/trie-with-counts-and-deletion` | `tries/character-trie-basics` |

## 8. Proposed 150 milestone

| | |
| --- | ---: |
| Current total | 96 |
| Proposed additions | 54 |
| Resulting total | 150 |
| Patterns touched | 23 |
| — newly opened | 20 |
| — topped up | 3 |
| Patterns populated after | 36 of 108 (33.3%) |
| Patterns still empty after | 72 |
| Additions: Easy / Medium / Hard | 14 / 37 / 3 |
| Additions C cannot express | 12 |
| Additions flagged for 64-bit | 7 |

### Allocation by pattern

| Pattern | Tier | Now | Add | Target | Progression |
| --- | --- | ---: | ---: | ---: | --- |
| `basics/simulation` | FOUNDATION | 0 | +3 | 3 | Easy → Easy → Medium |
| `basics/integer-math-modular` | IMPORTANT | 0 | +3 | 3 | Easy → Medium → Easy |
| `basics/prefix-arithmetic-basics` | FOUNDATION | 0 | +2 | 2 | Easy → Easy |
| `sorting/comparison-sorts-elementary` | FOUNDATION | 0 | +2 | 2 | Easy → Easy |
| `sorting/merge-sort-divide-conquer` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `sorting/custom-comparator-and-stability` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `recursion/subset-include-exclude` | FOUNDATION | 0 | +3 | 3 | Medium → Medium → Medium |
| `recursion/backtracking-with-restore` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `arrays/intervals` | CORE_INTERVIEW | 0 | +3 | 3 | Medium → Medium → Medium |
| `arrays/kadane-maximum-subarray` | CORE_INTERVIEW | 1 | +2 | 3 | Medium → Medium |
| `binary-search/lower-upper-bound` | FOUNDATION | 0 | +3 | 3 | Easy → Medium → Medium |
| `binary-search/binary-search-on-answer` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `sliding-window-two-pointers/variable-size-sliding-window` | FOUNDATION | 1 | +3 | 4 | Medium → Medium → Hard |
| `strings/palindrome-expansion` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `bit-manipulation/basic-bit-ops` | FOUNDATION | 0 | +2 | 2 | Easy → Easy |
| `stack-queue/parenthesis-matching` | FOUNDATION | 1 | +2 | 3 | Medium → Hard |
| `greedy/sort-then-greedy` | FOUNDATION | 0 | +2 | 2 | Easy → Medium |
| `graphs/bfs-shortest-path` | CORE_INTERVIEW | 0 | +3 | 3 | Medium → Medium → Hard |
| `graphs/topological-sort` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `dynamic-programming/2d-grid` | CORE_INTERVIEW | 0 | +3 | 3 | Easy → Medium → Medium |
| `dynamic-programming/0-1-knapsack` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |
| `heaps/heap-as-priority-queue` | FOUNDATION | 0 | +2 | 2 | Easy → Medium |
| `heaps/top-k-with-heap` | CORE_INTERVIEW | 0 | +2 | 2 | Medium → Medium |

### Slots

| # | Topic / Pattern | Concept | Diff | Objective | 6-lang | 64-bit |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `basics/simulation` | Increment a big-integer represented as a digit array, propagating carry | Easy | Translate a prose rule into a reverse-order loop with a carry invariant | 6/6 | — |
| 2 | `basics/simulation` | Reverse the digits of a signed 32-bit integer, refusing values that would overflow | Easy | Detect overflow BEFORE it happens rather than after | 6/6 | ⚠ |
| 3 | `basics/simulation` | Convert an integer to its Roman-numeral form | Medium | Simulate repeated greedy subtraction against an ordered value table | 6/6 | — |
| 4 | `basics/integer-math-modular` | Greatest common divisor by the Euclidean algorithm | Easy | Reduce a problem by a recurrence on remainders | 6/6 | — |
| 5 | `basics/integer-math-modular` | Raise a value to an integer power by squaring, handling a negative exponent | Medium | Halve the exponent each step instead of multiplying n times | 6/6 | — |
| 6 | `basics/integer-math-modular` | Count trailing zeroes in a factorial without computing it | Easy | Reason about prime factors instead of evaluating | 6/6 | — |
| 7 | `basics/prefix-arithmetic-basics` | Running maximum of a sequence | Easy | See a prefix as any associative fold, not only a sum | 6/6 | — |
| 8 | `basics/prefix-arithmetic-basics` | Answer one range-sum query from a precomputed prefix table | Easy | Separate the precompute step from the query step | 6/6 | — |
| 9 | `sorting/comparison-sorts-elementary` | Sort an array with an explicit insertion sort | Easy | Write a sort rather than call one, and see the O(N^2) cost | 6/6 | — |
| 10 | `sorting/comparison-sorts-elementary` | Count the swaps a bubble sort performs, with early termination | Easy | Connect an operation count to the asymptotic bound | 6/6 | — |
| 11 | `sorting/merge-sort-divide-conquer` | Sort an array with merge sort | Medium | Split, recurse, merge — and see why the merge is the whole algorithm | 6/6 | — |
| 12 | `sorting/merge-sort-divide-conquer` | Count inversions in an array using the merge step | Medium | Extract a quantity from a sort rather than the sorted order | 6/6 | ⚠ |
| 13 | `sorting/custom-comparator-and-stability` | Sort values by descending frequency, breaking ties by value | Medium | Sort by a derived key and make the tie-break explicit | 6/6 | — |
| 14 | `sorting/custom-comparator-and-stability` | Arrange integers to form the largest possible concatenated number | Medium | Recognise a comparator that is not a numeric comparison | 6/6 | ⚠ |
| 15 | `recursion/subset-include-exclude` | Enumerate all subsets of a distinct-element array | Medium | See the binary include/exclude decision tree | 5/6 — **C no** | — |
| 16 | `recursion/subset-include-exclude` | Enumerate subsets of an array containing duplicates, without repeats | Medium | Prune a branch by sorting first and skipping equal siblings | 5/6 — **C no** | — |
| 17 | `recursion/subset-include-exclude` | Count subsets summing to a target, without enumerating them | Medium | Separate counting from enumeration — the step that makes DP possible | 6/6 | — |
| 18 | `recursion/backtracking-with-restore` | All combinations of candidates summing to a target, reuse allowed | Medium | Mutate shared state and undo it on the way out | 5/6 — **C no** | — |
| 19 | `recursion/backtracking-with-restore` | All letter strings a digit sequence could spell on a phone keypad | Medium | Backtrack over a mapping rather than over the input array | 6/6 | — |
| 20 | `arrays/intervals` | Merge a list of overlapping intervals | Medium | Sort by start, then extend or emit | 5/6 — **C no** | — |
| 21 | `arrays/intervals` | Insert one interval into a sorted disjoint set | Medium | Handle before/overlap/after as three explicit phases | 5/6 — **C no** | — |
| 22 | `arrays/intervals` | Minimum number of rooms needed for overlapping meetings | Medium | Convert intervals into a sweep over start/end events | 5/6 — **C no** | — |
| 23 | `arrays/kadane-maximum-subarray` | Maximum product of a contiguous subarray | Medium | Carry two running extremes because a negative flips them | 6/6 | ⚠ |
| 24 | `arrays/kadane-maximum-subarray` | Maximum subarray sum in a circular array | Medium | Decompose into the non-wrapping case and its complement | 6/6 | — |
| 25 | `binary-search/lower-upper-bound` | Leftmost insertion position for a target among duplicates | Easy | Make the loop return a boundary, not a hit | 6/6 | — |
| 26 | `binary-search/lower-upper-bound` | First and last index of a target in a sorted array | Medium | Compose lower and upper bound into a range | 6/6 | — |
| 27 | `binary-search/lower-upper-bound` | For each query, count sorted values strictly below it | Medium | Reuse one sorted structure across many queries | 6/6 | — |
| 28 | `binary-search/binary-search-on-answer` | Smallest ship capacity that clears all packages within a day budget | Medium | Binary search a monotone predicate rather than an array | 6/6 | — |
| 29 | `binary-search/binary-search-on-answer` | Minimum hourly rate to finish all piles within an hour budget | Medium | Recognise the same predicate shape in different prose | 6/6 | — |
| 30 | `sliding-window-two-pointers/variable-size-sliding-window` | Shortest subarray whose sum reaches a target | Medium | Grow to satisfy, shrink to minimise | 6/6 | — |
| 31 | `sliding-window-two-pointers/variable-size-sliding-window` | Longest substring obtainable by replacing at most k characters | Medium | Keep a window valid against a derived quantity, not a raw count | 6/6 | — |
| 32 | `sliding-window-two-pointers/variable-size-sliding-window` | Smallest window of a string containing all characters of a pattern | Hard | Combine a frequency map with a shrinking window | 6/6 | — |
| 33 | `strings/palindrome-expansion` | Count palindromic substrings by expanding around each centre | Medium | Handle odd and even centres as one loop | 6/6 | — |
| 34 | `strings/palindrome-expansion` | Longest palindromic substring | Medium | Track the best centre rather than a running count | 6/6 | — |
| 35 | `bit-manipulation/basic-bit-ops` | Number of set bits for every integer from 0 to n | Easy | Test and shift individual bits, and notice the recurrence | 6/6 | — |
| 36 | `bit-manipulation/basic-bit-ops` | Reverse the bits of a 32-bit unsigned value | Easy | Build a result bit by bit while consuming the input | 6/6 | ⚠ |
| 37 | `stack-queue/parenthesis-matching` | Minimum insertions to make a bracket string balanced | Medium | Track a deficit counter instead of a full stack | 6/6 | — |
| 38 | `stack-queue/parenthesis-matching` | Length of the longest valid parenthesis substring | Hard | Use stacked indices rather than stacked symbols | 6/6 | — |
| 39 | `greedy/sort-then-greedy` | Maximise satisfied children by matching sorted sizes to sorted demands | Easy | Sort both sides, then advance greedily | 6/6 | — |
| 40 | `greedy/sort-then-greedy` | Minimum increments to make all values distinct | Medium | Prove the local choice is safe after sorting | 6/6 | — |
| 41 | `graphs/bfs-shortest-path` | Shortest clear path through a binary grid, eight-directional | Medium | BFS yields shortest paths on an unweighted graph; DFS does not | 5/6 — **C no** | — |
| 42 | `graphs/bfs-shortest-path` | Minutes for a spreading state to fill a grid, or report impossible | Medium | Seed a BFS from many sources at once and count levels | 5/6 — **C no** | — |
| 43 | `graphs/bfs-shortest-path` | Fewest one-letter transformations between two words via a dictionary | Hard | Recognise an implicit graph where states are not given as edges | 6/6 | — |
| 44 | `graphs/topological-sort` | Whether a set of prerequisite pairs can all be satisfied | Medium | Detect a cycle in a directed graph via in-degrees | 5/6 — **C no** | — |
| 45 | `graphs/topological-sort` | Fewest rounds needed to finish all courses when independent ones run in parallel | Medium | Peel the dependency graph layer by layer with Kahn's algorithm | 5/6 — **C no** | — |
| 46 | `dynamic-programming/2d-grid` | Number of monotone lattice paths across a grid | Easy | See a 2-D table and its base row and column | 6/6 | ⚠ |
| 47 | `dynamic-programming/2d-grid` | Minimum-cost path from corner to corner of a cost grid | Medium | Choose between predecessors instead of summing them | 5/6 — **C no** | — |
| 48 | `dynamic-programming/2d-grid` | Monotone lattice paths with blocked cells | Medium | Encode an obstacle as a zeroed state | 5/6 — **C no** | — |
| 49 | `dynamic-programming/0-1-knapsack` | Whether an array splits into two equal-sum halves | Medium | Recognise subset-sum behind a partition question | 6/6 | — |
| 50 | `dynamic-programming/0-1-knapsack` | Smallest achievable difference between two subset sums | Medium | Search reachable sums rather than test one target | 6/6 | — |
| 51 | `heaps/heap-as-priority-queue` | Repeatedly combine the two largest values until one or none remains | Easy | Use a heap for repeated extract-max | 6/6 | — |
| 52 | `heaps/heap-as-priority-queue` | Minimum total cost to combine all lengths pairwise | Medium | Extract-min twice, push once, and see why greedy is optimal here | 6/6 | ⚠ |
| 53 | `heaps/top-k-with-heap` | kth largest element of an unsorted array | Medium | Keep a bounded heap of size k instead of sorting everything | 6/6 | — |
| 54 | `heaps/top-k-with-heap` | The k most frequent values in an array | Medium | Compose a frequency map with a bounded heap | 6/6 | — |

### Deliberately deferred

- **topics: linked-list (6 patterns), binary-trees (7), bst (5)** — BLOCKED — harness has no node encoding. 18 patterns, and no amount of authoring effort moves them.
- **topic: tries (5 patterns)** — BLOCKED — a trie is a stateful object with several methods; the signature model is one function.
- **basics/complexity-analysis, greedy/exchange-argument** — Not naturally a graded function. Assessed by explanation, not a return value.
- **all SPECIALIZED patterns (z-algorithm, manacher, sieve, bellman-ford, mst, bitmask-and-tree-dp, binary-trie-xor, trie-with-counts)** — Correctly later-milestone material. Including them at 150 would be the fake coverage this milestone is meant to avoid.
- **sliding-window-two-pointers: 5 of 7 patterns** — Already holds 61 of 96 problems. Adding more would deepen the imbalance; only the one-problem gap is repaired.
- **stack-queue/stack-with-aggregate, stack-queue/queue-from-stacks, heaps/two-heaps-median** — Design-shaped. CORE_INTERVIEW importance, but blocked on the signature model rather than on priority.
- **ADVANCED patterns whose prerequisites land at 150 (dijkstra, union-find, lis-and-lcs, unbounded-knapsack, edit-distance, kmp, rolling-hash, monotonic-deque, bitmask patterns)** — Their prerequisites are being built at this milestone. They become the natural core of the 250 milestone.

## 9. Six-language implications

12 of 54 proposed problems cannot be expressed in C today. Every one is a
nested-vector argument or return, which C's calling convention cannot model: a 2-D array
needs a row count and a per-row column count, which is a different convention rather than a
longer one. Grouped:

- `recursion/subset-include-exclude` — Enumerate all subsets of a distinct-element array
- `recursion/subset-include-exclude` — Enumerate subsets of an array containing duplicates, without repeats
- `recursion/backtracking-with-restore` — All combinations of candidates summing to a target, reuse allowed
- `arrays/intervals` — Merge a list of overlapping intervals
- `arrays/intervals` — Insert one interval into a sorted disjoint set
- `arrays/intervals` — Minimum number of rooms needed for overlapping meetings
- `graphs/bfs-shortest-path` — Shortest clear path through a binary grid, eight-directional
- `graphs/bfs-shortest-path` — Minutes for a spreading state to fill a grid, or report impossible
- `graphs/topological-sort` — Whether a set of prerequisite pairs can all be satisfied
- `graphs/topological-sort` — Fewest rounds needed to finish all courses when independent ones run in parallel
- `dynamic-programming/2d-grid` — Minimum-cost path from corner to corner of a cost grid
- `dynamic-programming/2d-grid` — Monotone lattice paths with blocked cells

Where a pattern would otherwise be entirely C-unsupported, one slot was deliberately chosen
with a flat signature so the pattern stays reachable in all six languages: the subset-count
problem in `recursion/subset-include-exclude`, the phone-keypad problem in
`recursion/backtracking-with-restore`, and the word-ladder problem in `graphs/bfs-shortest-path`.
Curriculum quality was not otherwise bent to reach 6/6.

## 10. 64-bit ceiling implications

The validator refuses expected outputs outside ±(2^53−1) — see `PRODUCTION_READINESS.md`
section 18. 7 proposed concepts touch that boundary:

| Pattern | Concept | Disposition |
| --- | --- | --- |
| `basics/simulation` | Reverse the digits of a signed 32-bit integer, refusing values that would overflow | bounded — the answer is int32 by construction, but the check needs 64-bit reasoning; constrain input to int32 |
| `sorting/merge-sort-divide-conquer` | Count inversions in an array using the merge step | return must be long long — an inversion count reaches ~5x10^9, past int32 but well inside the JSON-safe range |
| `sorting/custom-comparator-and-stability` | Arrange integers to form the largest possible concatenated number | returns a STRING deliberately — the numeric value would exceed the ceiling, and the string form sidesteps it legitimately rather than by constraint |
| `arrays/kadane-maximum-subarray` | Maximum product of a contiguous subarray | CONSTRAIN — cap n and |value| so the product stays inside the exact-integer range |
| `bit-manipulation/basic-bit-ops` | Reverse the bits of a 32-bit unsigned value | return must be long long — an unsigned 32-bit result exceeds int32 range while staying JSON-safe |
| `dynamic-programming/2d-grid` | Number of monotone lattice paths across a grid | CONSTRAIN — the count is a binomial coefficient, so cap grid dimensions so it stays inside the exact-integer range |
| `heaps/heap-as-priority-queue` | Minimum total cost to combine all lengths pairwise | CONSTRAIN — accumulated merge cost grows quickly; cap n and values so the total stays inside the exact-integer range |

None requires the guard to be weakened. Two are handled by representation rather than by
constraint: the concatenation problem returns a **string**, and the trailing-zeroes problem
exists precisely to teach avoiding the large value. One — inversion counting — needs a
`long long` return and is the first curriculum problem that would exercise that registry
type on a real provider.
