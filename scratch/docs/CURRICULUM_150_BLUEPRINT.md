# Curriculum 150 blueprint

**Generated** by `node server/scripts/curriculum-audit.mjs --write`. Do not edit by hand.

The final approved additions for the 150 milestone. **No full problem specifications** — no
descriptions, examples, constraints, reference solutions or test cases. Those are Phase 3A.2.

Generated at `2026-09-01T17:59:58.027Z`.

## Totals

| | |
| --- | ---: |
| Current total | 96 |
| Additions | 54 |
| Resulting total | 150 |
| Patterns touched | 23 (20 opened, 3 topped up) |
| Coding-capable patterns | 79 |
| Coding-capable populated, before | 16 (20.3%) |
| Coding-capable populated, after | 36 (45.6%) |
| Conceptual patterns | 2 |
| Structurally blocked patterns | 27 |
| Easy / Medium / Hard | 14 / 37 / 3 |
| C cannot express | 12 |
| 64-bit flagged | 7 |

Coding-capable pattern distribution after the milestone:

| Problems | Before | After |
| --- | ---: | ---: |
| 0 (empty) | 63 | 43 |
| 1 | 3 | 0 |
| 2–4 | 6 | 29 |
| 5+ | 7 | 7 |

## Learner order

This is the order a learner should meet the additions, which is **not** the order they sit in
the taxonomy or in a file listing. A topic appears only after the topics it declares as
prerequisites, and within a pattern the slots run recognition → application → variation →
harder application.

### Stage 1 — Foundations — the empty root

*basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 1.1 | 1 | `simulation` | Increment a big-integer represented as a digit array, propagating carry | Easy |
| 1.2 | 2 | `simulation` | Reverse the digits of a signed 32-bit integer, refusing values that would overflow | Easy |
| 1.3 | 3 | `simulation` | Convert an integer to its Roman-numeral form | Medium |
| 1.4 | 4 | `integer-math-modular` | Greatest common divisor by the Euclidean algorithm | Easy |
| 1.5 | 6 | `integer-math-modular` | Count trailing zeroes in a factorial without computing it | Easy |
| 1.6 | 5 | `integer-math-modular` | Raise a value to an integer power by squaring, handling a negative exponent | Medium |
| 1.7 | 7 | `prefix-arithmetic-basics` | Running maximum of a sequence | Easy |
| 1.8 | 8 | `prefix-arithmetic-basics` | Answer one range-sum query from a precomputed prefix table | Easy |

### Stage 2 — Sorting — the preprocessing step four topics assume

*arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 2.1 | 9 | `comparison-sorts-elementary` | Sort an array with an explicit insertion sort | Easy |
| 2.2 | 10 | `comparison-sorts-elementary` | Count the swaps a bubble sort performs, with early termination | Easy |
| 2.3 | 11 | `merge-sort-divide-conquer` | Sort an array with merge sort | Medium |
| 2.4 | 12 | `merge-sort-divide-conquer` | Count inversions in an array using the merge step | Medium |
| 2.5 | 13 | `custom-comparator-and-stability` | Sort values by descending frequency, breaking ties by value | Medium |
| 2.6 | 14 | `custom-comparator-and-stability` | Arrange integers to form the largest possible concatenated number | Medium |

### Stage 3 — Recursion — the shape DP is built from

*dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 3.1 | 15 | `subset-include-exclude` | Enumerate all subsets of a distinct-element array | Medium |
| 3.2 | 16 | `subset-include-exclude` | Enumerate subsets of an array containing duplicates, without repeats | Medium |
| 3.3 | 17 | `subset-include-exclude` | Count subsets summing to a target, without enumerating them | Medium |
| 3.4 | 18 | `backtracking-with-restore` | All combinations of candidates summing to a target, reuse allowed | Medium |
| 3.5 | 19 | `backtracking-with-restore` | All letter strings a digit sequence could spell on a phone keypad | Medium |

### Stage 4 — Arrays — depth on what is already started

*kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 4.1 | 23 | `kadane-maximum-subarray` | Maximum product of a contiguous subarray | Medium |
| 4.2 | 24 | `kadane-maximum-subarray` | Maximum subarray sum in a circular array | Medium |
| 4.3 | 20 | `intervals` | Merge a list of overlapping intervals | Medium |
| 4.4 | 21 | `intervals` | Insert one interval into a sorted disjoint set | Medium |
| 4.5 | 22 | `intervals` | Minimum number of rooms needed for overlapping meetings | Medium |

### Stage 5 — Binary search — boundaries, then the predicate leap

*lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 5.1 | 25 | `lower-upper-bound` | Leftmost insertion position for a target among duplicates | Easy |
| 5.2 | 26 | `lower-upper-bound` | First and last index of a target in a sorted array | Medium |
| 5.3 | 27 | `lower-upper-bound` | For each query, count sorted values strictly below it | Medium |
| 5.4 | 28 | `binary-search-on-answer` | Smallest ship capacity that clears all packages within a day budget | Medium |
| 5.5 | 29 | `binary-search-on-answer` | Minimum hourly rate to finish all piles within an hour budget | Medium |

### Stage 6 — Strings — before the window topic that uses them

*the corrected prerequisite direction: 14 of the window topic's problems are string-typed, and two of them need frequency counting.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 6.1 | 33 | `palindrome-expansion` | Count palindromic substrings by expanding around each centre | Medium |
| 6.2 | 34 | `palindrome-expansion` | Longest palindromic substring | Medium |

### Stage 7 — Sliding window — repair the one-problem gap

*variable-size is the most transferable window idea and had a single problem beside neighbours holding twelve.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 7.1 | 30 | `variable-size-sliding-window` | Shortest subarray whose sum reaches a target | Medium |
| 7.2 | 31 | `variable-size-sliding-window` | Longest substring obtainable by replacing at most k characters | Medium |
| 7.3 | 32 | `variable-size-sliding-window` | Smallest window of a string containing all characters of a pattern | Hard |

### Stage 8 — Bit manipulation — the groundwork under xor

*basic-bit-ops was empty while xor-properties, which builds on it, held four.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 8.1 | 35 | `basic-bit-ops` | Number of set bits for every integer from 0 to n | Easy |
| 8.2 | 36 | `basic-bit-ops` | Reverse the bits of a 32-bit unsigned value | Easy |

### Stage 9 — Stack and queue — give the entry pattern a progression

*parenthesis-matching held one boolean problem; it now runs check -> quantity -> hard.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 9.1 | 37 | `parenthesis-matching` | Minimum insertions to make a bracket string balanced | Medium |
| 9.2 | 38 | `parenthesis-matching` | Length of the longest valid parenthesis substring | Hard |

### Stage 10 — Greedy — the base move under interval scheduling

*sort-then-greedy was empty while interval-scheduling, a specialisation of it, held four.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 10.1 | 39 | `sort-then-greedy` | Maximise satisfied children by matching sorted sizes to sorted demands | Easy |
| 10.2 | 40 | `sort-then-greedy` | Minimum increments to make all values distinct | Medium |

### Stage 11 — Heaps — open an empty core topic

*nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 11.1 | 51 | `heap-as-priority-queue` | Repeatedly combine the two largest values until one or none remains | Easy |
| 11.2 | 52 | `heap-as-priority-queue` | Minimum total cost to combine all lengths pairwise | Medium |
| 11.3 | 53 | `top-k-with-heap` | kth largest element of an unsorted array | Medium |
| 11.4 | 54 | `top-k-with-heap` | The k most frequent values in an array | Medium |

### Stage 12 — Dynamic programming — the first table, then knapsack

*every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 12.1 | 46 | `2d-grid` | Number of monotone lattice paths across a grid | Easy |
| 12.2 | 47 | `2d-grid` | Minimum-cost path from corner to corner of a cost grid | Medium |
| 12.3 | 48 | `2d-grid` | Monotone lattice paths with blocked cells | Medium |
| 12.4 | 49 | `0-1-knapsack` | Whether an array splits into two equal-sum halves | Medium |
| 12.5 | 50 | `0-1-knapsack` | Smallest achievable difference between two subset sums | Medium |

### Stage 13 — Graphs — distance, then dependency order

*all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.*

| Seq | # | Pattern | Concept | Diff |
| ---: | ---: | --- | --- | --- |
| 13.1 | 41 | `bfs-shortest-path` | Shortest clear path through a binary grid, eight-directional | Medium |
| 13.2 | 42 | `bfs-shortest-path` | Minutes for a spreading state to fill a grid, or report impossible | Medium |
| 13.3 | 43 | `bfs-shortest-path` | Fewest one-letter transformations between two words via a dictionary | Hard |
| 13.4 | 44 | `topological-sort` | Whether a set of prerequisite pairs can all be satisfied | Medium |
| 13.5 | 45 | `topological-sort` | Fewest rounds needed to finish all courses when independent ones run in parallel | Medium |

## Every addition in detail

### 1. Increment a big-integer represented as a digit array, propagating carry

- **Sequence** stage 1
- **Topic / pattern** `basics` / `simulation` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> digits -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Translate a prose rule into a reverse-order loop with a carry invariant
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** No existing problem manipulates a digit-array representation; prefix-sum problems read the array, they do not restructure it.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 2. Reverse the digits of a signed 32-bit integer, refusing values that would overflow

- **Sequence** stage 1
- **Topic / pattern** `basics` / `simulation` — FOUNDATION
- **Difficulty** Easy
- **Signature** `int n -> int`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Detect overflow BEFORE it happens rather than after
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Overflow-safe arithmetic appears nowhere in the current 96.
- **64-bit risk** bounded — the answer is int32 by construction, but the check needs 64-bit reasoning; constrain input to int32
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 3. Convert an integer to its Roman-numeral form

- **Sequence** stage 1
- **Topic / pattern** `basics` / `simulation` — FOUNDATION
- **Difficulty** Medium
- **Signature** `int n -> string`
- **Language capability** 6/6
- **Prerequisite** basics/simulation (reverse integer)
- **Learning objective** Simulate repeated greedy subtraction against an ordered value table
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** No existing problem builds an output string by consuming an input quantity; it is also the first place a lookup table drives the loop.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 4. Greatest common divisor by the Euclidean algorithm

- **Sequence** stage 1
- **Topic / pattern** `basics` / `integer-math-modular` — IMPORTANT
- **Difficulty** Easy
- **Signature** `int a, int b -> int`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Reduce a problem by a recurrence on remainders
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Nothing in the curriculum does number theory.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 6. Count trailing zeroes in a factorial without computing it

- **Sequence** stage 1
- **Topic / pattern** `basics` / `integer-math-modular` — IMPORTANT
- **Difficulty** Easy
- **Signature** `int n -> int`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Reason about prime factors instead of evaluating
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Teaches avoiding the big value entirely — directly relevant to the 64-bit ceiling.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 5. Raise a value to an integer power by squaring, handling a negative exponent

- **Sequence** stage 1
- **Topic / pattern** `basics` / `integer-math-modular` — IMPORTANT
- **Difficulty** Medium
- **Signature** `double x, int n -> double`
- **Language capability** 6/6
- **Prerequisite** basics/integer-math-modular (gcd)
- **Learning objective** Halve the exponent each step instead of multiplying n times
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The only divide-and-halve recurrence outside binary search, and one of very few problems using the `double` type — currently exercised by exactly one seeded problem.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 7. Running maximum of a sequence

- **Sequence** stage 1
- **Topic / pattern** `basics` / `prefix-arithmetic-basics` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> nums -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** See a prefix as any associative fold, not only a sum
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** arrays/prefix-sum is entirely sum-based; this generalises the operator.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 8. Answer one range-sum query from a precomputed prefix table

- **Sequence** stage 1
- **Topic / pattern** `basics` / `prefix-arithmetic-basics` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> nums, int left, int right -> int`
- **Language capability** 6/6
- **Prerequisite** basics/prefix-arithmetic-basics (running max)
- **Learning objective** Separate the precompute step from the query step
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The existing running-sum problem RETURNS the prefix array; this one uses it to answer a query, which is the actual point of the technique.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.

### 9. Sort an array with an explicit insertion sort

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `comparison-sorts-elementary` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> nums -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Write a sort rather than call one, and see the O(N^2) cost
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Every existing problem calls a library sort or avoids sorting.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 10. Count the swaps a bubble sort performs, with early termination

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `comparison-sorts-elementary` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> nums -> int`
- **Language capability** 6/6
- **Prerequisite** sorting/comparison-sorts-elementary (insertion sort)
- **Learning objective** Connect an operation count to the asymptotic bound
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Makes cost measurable, which is the assessable half of complexity-analysis.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 11. Sort an array with merge sort

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `merge-sort-divide-conquer` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** sorting/comparison-sorts-elementary
- **Learning objective** Split, recurse, merge — and see why the merge is the whole algorithm
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** First divide-and-conquer recurrence in the curriculum.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 12. Count inversions in an array using the merge step

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `merge-sort-divide-conquer` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> long long`
- **Language capability** 6/6
- **Prerequisite** sorting/merge-sort-divide-conquer (merge sort)
- **Learning objective** Extract a quantity from a sort rather than the sorted order
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The first problem whose answer requires a 64-bit return type, which exercises a registry type no seeded problem has ever used.
- **64-bit risk** return must be long long — an inversion count reaches ~5x10^9, past int32 but well inside the JSON-safe range
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 13. Sort values by descending frequency, breaking ties by value

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `custom-comparator-and-stability` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** sorting/comparison-sorts-elementary
- **Learning objective** Sort by a derived key and make the tie-break explicit
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** strings/sort-characters-by-frequency does this for characters only; this is the general integer form and states the tie-break, which that one leaves implicit.
- **Output ordering** Fully determined: descending frequency, then ascending value. The tie-break is the lesson, so it is stated rather than left free.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 14. Arrange integers to form the largest possible concatenated number

- **Sequence** stage 2
- **Topic / pattern** `sorting` / `custom-comparator-and-stability` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> string`
- **Language capability** 6/6
- **Prerequisite** sorting/custom-comparator-and-stability (frequency sort)
- **Learning objective** Recognise a comparator that is not a numeric comparison
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The comparator is on string concatenation, which is where "just sort descending" fails; nothing else teaches that.
- **64-bit risk** returns a STRING deliberately — the numeric value would exceed the ceiling, and the string form sidesteps it legitimately rather than by constraint
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.

### 15. Enumerate all subsets of a distinct-element array

- **Sequence** stage 3
- **Topic / pattern** `recursion` / `subset-include-exclude` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums -> vector<vector<int>>`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** none within the milestone
- **Learning objective** See the binary include/exclude decision tree
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** No enumeration problem exists in the curriculum at all.
- **Output ordering** REQUIRED — subsets have no natural order. Each subset ascending, the outer list sorted by length then lexicographically. Follows the 3sum precedent.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.

### 16. Enumerate subsets of an array containing duplicates, without repeats

- **Sequence** stage 3
- **Topic / pattern** `recursion` / `subset-include-exclude` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums -> vector<vector<int>>`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** recursion/subset-include-exclude (subsets)
- **Learning objective** Prune a branch by sorting first and skipping equal siblings
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Deduplication during recursion is a distinct skill from the plain enumeration.
- **Output ordering** REQUIRED — same convention as the distinct case, so the two problems are directly comparable.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.

### 17. Count subsets summing to a target, without enumerating them

- **Sequence** stage 3
- **Topic / pattern** `recursion` / `subset-include-exclude` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums, int target -> int`
- **Language capability** 6/6
- **Prerequisite** recursion/subset-include-exclude (subsets)
- **Learning objective** Separate counting from enumeration — the step that makes DP possible
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Chosen so the pattern is not entirely C-unsupported, and it is the direct bridge to 0-1 knapsack.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.

### 18. All combinations of candidates summing to a target, reuse allowed

- **Sequence** stage 3
- **Topic / pattern** `recursion` / `backtracking-with-restore` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> candidates, int target -> vector<vector<int>>`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** recursion/subset-include-exclude
- **Learning objective** Mutate shared state and undo it on the way out
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** First problem requiring an explicit undo step.
- **Output ordering** REQUIRED — each combination non-decreasing, outer list sorted lexicographically.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.

### 19. All letter strings a digit sequence could spell on a phone keypad

- **Sequence** stage 3
- **Topic / pattern** `recursion` / `backtracking-with-restore` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `string digits -> vector<string>`
- **Language capability** 6/6
- **Prerequisite** recursion/backtracking-with-restore (combination sum)
- **Learning objective** Backtrack over a mapping rather than over the input array
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Returns strings, so it keeps the pattern reachable in C and varies the branching source.
- **Output ordering** REQUIRED — lexicographic, which is also what a straightforward recursion produces if the keypad is walked in order.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.

### 23. Maximum product of a contiguous subarray

- **Sequence** stage 4
- **Topic / pattern** `arrays` / `kadane-maximum-subarray` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> int`
- **Language capability** 6/6
- **Prerequisite** arrays/kadane-maximum-subarray (maximum subarray)
- **Learning objective** Carry two running extremes because a negative flips them
- **Preceded in this pattern by** maximum-subarray (Medium)
- **Non-redundant because** The existing maximum-subarray is additive and never needs the min tracked.
- **64-bit risk** CONSTRAIN — cap n and |value| so the product stays inside the exact-integer range
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.

### 24. Maximum subarray sum in a circular array

- **Sequence** stage 4
- **Topic / pattern** `arrays` / `kadane-maximum-subarray` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> int`
- **Language capability** 6/6
- **Prerequisite** arrays/kadane-maximum-subarray (maximum subarray)
- **Learning objective** Decompose into the non-wrapping case and its complement
- **Preceded in this pattern by** maximum-subarray (Medium)
- **Non-redundant because** Introduces the total-minus-minimum complement trick.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.

### 20. Merge a list of overlapping intervals

- **Sequence** stage 4
- **Topic / pattern** `arrays` / `intervals` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> intervals -> vector<vector<int>>`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** sorting/custom-comparator-and-stability
- **Learning objective** Sort by start, then extend or emit
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** greedy/interval-scheduling COUNTS or selects intervals; none of its four problems produces a merged set.
- **Output ordering** Determined by the algorithm: ascending by start. Stated anyway so it is not accidental.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.

### 21. Insert one interval into a sorted disjoint set

- **Sequence** stage 4
- **Topic / pattern** `arrays` / `intervals` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> intervals, vector<int> newInterval -> vector<vector<int>>`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** arrays/intervals (merge)
- **Learning objective** Handle before/overlap/after as three explicit phases
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** A single insertion has a different structure from a full merge.
- **Output ordering** Determined: ascending by start.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.

### 22. Minimum number of rooms needed for overlapping meetings

- **Sequence** stage 4
- **Topic / pattern** `arrays` / `intervals` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> intervals -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** arrays/intervals (merge)
- **Learning objective** Convert intervals into a sweep over start/end events
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The existing meeting-rooms asks whether ANY overlap exists (a boolean); this asks for maximum concurrency, which needs a sweep.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.

### 25. Leftmost insertion position for a target among duplicates

- **Sequence** stage 5
- **Topic / pattern** `binary-search` / `lower-upper-bound` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> nums, int target -> int`
- **Language capability** 6/6
- **Prerequisite** binary-search/classic-binary-search
- **Learning objective** Make the loop return a boundary, not a hit
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The existing search-insert-position assumes distinct values, so it never exercises the duplicate boundary that makes lower-bound different from a plain search.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.

### 26. First and last index of a target in a sorted array

- **Sequence** stage 5
- **Topic / pattern** `binary-search` / `lower-upper-bound` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums, int target -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** binary-search/lower-upper-bound (leftmost insert)
- **Learning objective** Compose lower and upper bound into a range
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Requires both boundaries, which no existing problem does.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.

### 27. For each query, count sorted values strictly below it

- **Sequence** stage 5
- **Topic / pattern** `binary-search` / `lower-upper-bound` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums, vector<int> queries -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** binary-search/lower-upper-bound (first and last)
- **Learning objective** Reuse one sorted structure across many queries
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Introduces amortising a precomputation over a query set.
- **Output ordering** Determined: one answer per query, in query order.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.

### 28. Smallest ship capacity that clears all packages within a day budget

- **Sequence** stage 5
- **Topic / pattern** `binary-search` / `binary-search-on-answer` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> weights, int days -> int`
- **Language capability** 6/6
- **Prerequisite** binary-search/lower-upper-bound
- **Learning objective** Binary search a monotone predicate rather than an array
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The single biggest conceptual jump in the topic and no existing problem searches anything but an index.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.

### 29. Minimum hourly rate to finish all piles within an hour budget

- **Sequence** stage 5
- **Topic / pattern** `binary-search` / `binary-search-on-answer` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> piles, int hours -> int`
- **Language capability** 6/6
- **Prerequisite** binary-search/binary-search-on-answer (ship capacity)
- **Learning objective** Recognise the same predicate shape in different prose
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Deliberately the same technique with different framing — recognising that is the learning objective.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.

### 33. Count palindromic substrings by expanding around each centre

- **Sequence** stage 6
- **Topic / pattern** `strings` / `palindrome-expansion` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `string s -> int`
- **Language capability** 6/6
- **Prerequisite** strings/frequency-counter
- **Learning objective** Handle odd and even centres as one loop
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The existing valid-palindrome problems VERIFY a palindrome; none constructs or counts them.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** the corrected prerequisite direction: 14 of the window topic's problems are string-typed, and two of them need frequency counting.

### 34. Longest palindromic substring

- **Sequence** stage 6
- **Topic / pattern** `strings` / `palindrome-expansion` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `string s -> string`
- **Language capability** 6/6
- **Prerequisite** strings/palindrome-expansion (count substrings)
- **Learning objective** Track the best centre rather than a running count
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Returns the substring, so it exercises string construction rather than counting.
- **Output ordering** Ties are possible, so the statement must require the leftmost longest substring.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** the corrected prerequisite direction: 14 of the window topic's problems are string-typed, and two of them need frequency counting.

### 30. Shortest subarray whose sum reaches a target

- **Sequence** stage 7
- **Topic / pattern** `sliding-window-two-pointers` / `variable-size-sliding-window` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums, int target -> int`
- **Language capability** 6/6
- **Prerequisite** sliding-window-two-pointers/fixed-size-sliding-window
- **Learning objective** Grow to satisfy, shrink to minimise
- **Preceded in this pattern by** longest-substring-without-repeating-characters (Medium)
- **Non-redundant because** The pattern holds exactly one problem (longest substring without repeats) and that one MAXIMISES; this minimises, which is the other half of the invariant.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** variable-size is the most transferable window idea and had a single problem beside neighbours holding twelve.

### 31. Longest substring obtainable by replacing at most k characters

- **Sequence** stage 7
- **Topic / pattern** `sliding-window-two-pointers` / `variable-size-sliding-window` — FOUNDATION
- **Difficulty** Medium
- **Signature** `string s, int k -> int`
- **Language capability** 6/6
- **Prerequisite** sliding-window-two-pointers/variable-size-sliding-window (shortest subarray)
- **Learning objective** Keep a window valid against a derived quantity, not a raw count
- **Preceded in this pattern by** longest-substring-without-repeating-characters (Medium)
- **Non-redundant because** Window validity depends on window length minus max frequency — distinct from the at-most-k-distinct problems in at-most-k-window.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** variable-size is the most transferable window idea and had a single problem beside neighbours holding twelve.

### 32. Smallest window of a string containing all characters of a pattern

- **Sequence** stage 7
- **Topic / pattern** `sliding-window-two-pointers` / `variable-size-sliding-window` — FOUNDATION
- **Difficulty** Hard
- **Signature** `string s, string t -> string`
- **Language capability** 6/6
- **Prerequisite** sliding-window-two-pointers/variable-size-sliding-window (longest replacement)
- **Learning objective** Combine a frequency map with a shrinking window
- **Preceded in this pattern by** longest-substring-without-repeating-characters (Medium)
- **Non-redundant because** The canonical hard case of the pattern, and the pattern currently has no Hard problem at all.
- **Output ordering** The window is unique in length but not necessarily in position; the statement must require the LEFTMOST shortest window.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** variable-size is the most transferable window idea and had a single problem beside neighbours holding twelve.

### 35. Number of set bits for every integer from 0 to n

- **Sequence** stage 8
- **Topic / pattern** `bit-manipulation` / `basic-bit-ops` — FOUNDATION
- **Difficulty** Easy
- **Signature** `int n -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Test and shift individual bits, and notice the recurrence
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** xor-properties has four problems but the topic never teaches masking or shifting; this is the missing groundwork.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basic-bit-ops was empty while xor-properties, which builds on it, held four.

### 36. Reverse the bits of a 32-bit unsigned value

- **Sequence** stage 8
- **Topic / pattern** `bit-manipulation` / `basic-bit-ops` — FOUNDATION
- **Difficulty** Easy
- **Signature** `int n -> long long`
- **Language capability** 6/6
- **Prerequisite** bit-manipulation/basic-bit-ops (count set bits)
- **Learning objective** Build a result bit by bit while consuming the input
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Forces explicit bit placement rather than counting.
- **64-bit risk** return must be long long — an unsigned 32-bit result exceeds int32 range while staying JSON-safe
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** basic-bit-ops was empty while xor-properties, which builds on it, held four.

### 37. Minimum insertions to make a bracket string balanced

- **Sequence** stage 9
- **Topic / pattern** `stack-queue` / `parenthesis-matching` — FOUNDATION
- **Difficulty** Medium
- **Signature** `string s -> int`
- **Language capability** 6/6
- **Prerequisite** stack-queue/parenthesis-matching (valid parentheses)
- **Learning objective** Track a deficit counter instead of a full stack
- **Preceded in this pattern by** valid-parentheses (Easy)
- **Non-redundant because** The pattern has one problem, a boolean check; this asks for a quantity and shows the stack can collapse to a counter.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** parenthesis-matching held one boolean problem; it now runs check -> quantity -> hard.

### 38. Length of the longest valid parenthesis substring

- **Sequence** stage 9
- **Topic / pattern** `stack-queue` / `parenthesis-matching` — FOUNDATION
- **Difficulty** Hard
- **Signature** `string s -> int`
- **Language capability** 6/6
- **Prerequisite** stack-queue/parenthesis-matching (minimum insertions)
- **Learning objective** Use stacked indices rather than stacked symbols
- **Preceded in this pattern by** valid-parentheses (Easy)
- **Non-redundant because** Gives the pattern a Hard tier and introduces storing positions on the stack.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** parenthesis-matching held one boolean problem; it now runs check -> quantity -> hard.

### 39. Maximise satisfied children by matching sorted sizes to sorted demands

- **Sequence** stage 10
- **Topic / pattern** `greedy` / `sort-then-greedy` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> demands, vector<int> sizes -> int`
- **Language capability** 6/6
- **Prerequisite** sorting/comparison-sorts-elementary
- **Learning objective** Sort both sides, then advance greedily
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** interval-scheduling holds four problems but the topic never establishes the plain sort-then-scan move they specialise.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** sort-then-greedy was empty while interval-scheduling, a specialisation of it, held four.

### 40. Minimum increments to make all values distinct

- **Sequence** stage 10
- **Topic / pattern** `greedy` / `sort-then-greedy` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> nums -> int`
- **Language capability** 6/6
- **Prerequisite** greedy/sort-then-greedy (matching)
- **Learning objective** Prove the local choice is safe after sorting
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Introduces "why is greedy correct here" without needing a formal exchange argument.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** sort-then-greedy was empty while interval-scheduling, a specialisation of it, held four.

### 51. Repeatedly combine the two largest values until one or none remains

- **Sequence** stage 11
- **Topic / pattern** `heaps` / `heap-as-priority-queue` — FOUNDATION
- **Difficulty** Easy
- **Signature** `vector<int> stones -> int`
- **Language capability** 6/6
- **Prerequisite** none within the milestone
- **Learning objective** Use a heap for repeated extract-max
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The topic is empty; nothing in the curriculum uses a priority queue.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.

### 52. Minimum total cost to combine all lengths pairwise

- **Sequence** stage 11
- **Topic / pattern** `heaps` / `heap-as-priority-queue` — FOUNDATION
- **Difficulty** Medium
- **Signature** `vector<int> lengths -> int`
- **Language capability** 6/6
- **Prerequisite** heaps/heap-as-priority-queue (combine largest)
- **Learning objective** Extract-min twice, push once, and see why greedy is optimal here
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Extract-min plus reinsertion is a different loop from extract-max, and it sets up Huffman-style merging.
- **64-bit risk** CONSTRAIN — accumulated merge cost grows quickly; cap n and values so the total stays inside the exact-integer range
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.

### 53. kth largest element of an unsorted array

- **Sequence** stage 11
- **Topic / pattern** `heaps` / `top-k-with-heap` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums, int k -> int`
- **Language capability** 6/6
- **Prerequisite** heaps/heap-as-priority-queue
- **Learning objective** Keep a bounded heap of size k instead of sorting everything
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Introduces the size-k bound, which is the whole idea of the pattern.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.

### 54. The k most frequent values in an array

- **Sequence** stage 11
- **Topic / pattern** `heaps` / `top-k-with-heap` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums, int k -> vector<int>`
- **Language capability** 6/6
- **Prerequisite** heaps/top-k-with-heap (kth largest)
- **Learning objective** Compose a frequency map with a bounded heap
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Combines strings/frequency-counter with the heap bound; neither topic teaches the combination.
- **Output ordering** REQUIRED — the canonical problem permits any order, which this grader cannot accept. The statement must require descending frequency then ascending value, which also makes the answer unique when frequencies tie.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.

### 46. Number of monotone lattice paths across a grid

- **Sequence** stage 12
- **Topic / pattern** `dynamic-programming` / `2d-grid` — CORE_INTERVIEW
- **Difficulty** Easy
- **Signature** `int m, int n -> int`
- **Language capability** 6/6
- **Prerequisite** dynamic-programming/1d-state
- **Learning objective** See a 2-D table and its base row and column
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Every existing DP problem is one-dimensional; this is the first table.
- **64-bit risk** CONSTRAIN — the count is a binomial coefficient, so cap grid dimensions so it stays inside the exact-integer range
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.

### 47. Minimum-cost path from corner to corner of a cost grid

- **Sequence** stage 12
- **Topic / pattern** `dynamic-programming` / `2d-grid` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> grid -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** dynamic-programming/2d-grid (lattice paths)
- **Learning objective** Choose between predecessors instead of summing them
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Optimisation rather than counting over the same table shape.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.

### 48. Monotone lattice paths with blocked cells

- **Sequence** stage 12
- **Topic / pattern** `dynamic-programming` / `2d-grid` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> grid -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** dynamic-programming/2d-grid (lattice paths)
- **Learning objective** Encode an obstacle as a zeroed state
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Teaches that a constraint becomes a base-case change, not new logic.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.

### 49. Whether an array splits into two equal-sum halves

- **Sequence** stage 12
- **Topic / pattern** `dynamic-programming` / `0-1-knapsack` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> bool`
- **Language capability** 6/6
- **Prerequisite** recursion/subset-include-exclude (count subsets)
- **Learning objective** Recognise subset-sum behind a partition question
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The direct DP counterpart of the recursive subset-count problem, which is how the bridge from recursion to DP is taught.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.

### 50. Smallest achievable difference between two subset sums

- **Sequence** stage 12
- **Topic / pattern** `dynamic-programming` / `0-1-knapsack` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<int> nums -> int`
- **Language capability** 6/6
- **Prerequisite** dynamic-programming/0-1-knapsack (equal partition)
- **Learning objective** Search reachable sums rather than test one target
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Generalises a yes/no subset-sum into an optimisation over reachable states.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.

### 41. Shortest clear path through a binary grid, eight-directional

- **Sequence** stage 13
- **Topic / pattern** `graphs` / `bfs-shortest-path` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> grid -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** graphs/dfs-connectivity
- **Learning objective** BFS yields shortest paths on an unweighted graph; DFS does not
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** All four existing graph problems are DFS/connectivity; none involves distance.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.

### 42. Minutes for a spreading state to fill a grid, or report impossible

- **Sequence** stage 13
- **Topic / pattern** `graphs` / `bfs-shortest-path` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `vector<vector<int>> grid -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** graphs/bfs-shortest-path (grid shortest path)
- **Learning objective** Seed a BFS from many sources at once and count levels
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Multi-source BFS and level counting are distinct from single-source distance.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.

### 43. Fewest one-letter transformations between two words via a dictionary

- **Sequence** stage 13
- **Topic / pattern** `graphs` / `bfs-shortest-path` — CORE_INTERVIEW
- **Difficulty** Hard
- **Signature** `string beginWord, string endWord, vector<string> wordList -> int`
- **Language capability** 6/6
- **Prerequisite** graphs/bfs-shortest-path (multi-source)
- **Learning objective** Recognise an implicit graph where states are not given as edges
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The graph must be inferred rather than supplied, and the string signature keeps the pattern reachable in C.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.

### 44. Whether a set of prerequisite pairs can all be satisfied

- **Sequence** stage 13
- **Topic / pattern** `graphs` / `topological-sort` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `int numCourses, vector<vector<int>> prerequisites -> bool`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** graphs/dfs-connectivity
- **Learning objective** Detect a cycle in a directed graph via in-degrees
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** The existing graph problems are all undirected; direction changes what connectivity means.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.

### 45. Fewest rounds needed to finish all courses when independent ones run in parallel

- **Sequence** stage 13
- **Topic / pattern** `graphs` / `topological-sort` — CORE_INTERVIEW
- **Difficulty** Medium
- **Signature** `int numCourses, vector<vector<int>> relations -> int`
- **Language capability** 5/6 — **C cannot express this**
- **Prerequisite** graphs/topological-sort (feasibility)
- **Learning objective** Peel the dependency graph layer by layer with Kahn's algorithm
- **Preceded in this pattern by** none — this pattern is empty today
- **Non-redundant because** Turns cycle detection into a quantity, and the answer is unique so it needs no artificial ordering rule.
- **64-bit risk** none
- **Architecture blocker** none — this pattern is coding-capable today
- **Milestone reason** all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.

## Constraint analysis for every 64-bit-flagged slot

The validator refuses expected outputs outside ±(2^53−1) and is never bypassed. Each slot below
states the canonical range, the Robinhood range, whether the algorithm and the overflow
reasoning survive, and whether the constraint is legitimate.

### 2. Reverse the digits of a signed 32-bit integer, refusing values that would overflow

- **Canonical range** input and output both confined to signed 32-bit, returning 0 when the reversal would not fit
- **Robinhood range** identical — no change
- **Algorithm identical** yes
- **Overflow reasoning retained** yes
- **Legitimate** Yes, and nothing is constrained. Worth recording only because the lesson is asymmetric across languages: in C/C++/Java/C# the check is genuinely necessary, while in JavaScript and Python the intermediate never overflows, so those two solve it by comparing against the 32-bit bound rather than by avoiding an overflow.

### 12. Count inversions in an array using the merge step

- **Canonical range** n up to 10^5, so the count reaches n(n-1)/2 ~ 5x10^9
- **Robinhood range** unchanged — 5x10^9 is far inside the exact-integer range (2^53-1 ~ 9x10^15)
- **Algorithm identical** yes
- **Overflow reasoning retained** yes
- **Legitimate** Yes, and no constraint is applied. The return type must be `long long` because the answer exceeds int32, which is exactly the point: this would be the first curriculum problem to exercise `long long` on a real provider, a registry type implemented in Phases 2B-2D and never executed.

### 14. Arrange integers to form the largest possible concatenated number

- **Canonical range** the concatenation of up to 100 numbers, which as an integer would be hundreds of digits
- **Robinhood range** unchanged — the answer is returned as a STRING, so no numeric range applies
- **Algorithm identical** yes
- **Overflow reasoning retained** yes
- **Legitimate** Yes, and by representation rather than by constraint. The canonical problem returns a string too, precisely because the value does not fit any integer type. This is the shape to prefer whenever it is available: change what is returned, not what is asked.

### 23. Maximum product of a contiguous subarray

- **Canonical range** LeetCode guarantees the answer fits a 32-bit integer — this is the CANONICAL constraint, not a Robinhood invention
- **Robinhood range** the same: bound n and |value| so the product stays within int32
- **Algorithm identical** yes
- **Overflow reasoning retained** no
- **Legitimate** Yes. The lesson is carrying two running extremes because a negative value swaps them; overflow is not part of it, and the canonical problem already excludes overflow by construction.

### 36. Reverse the bits of a 32-bit unsigned value

- **Canonical range** input and output are unsigned 32-bit, so the result reaches 4294967295
- **Robinhood range** unchanged, but the RETURN type is `long long` because the canonical vocabulary has no unsigned type and 4294967295 exceeds int32
- **Algorithm identical** yes
- **Overflow reasoning retained** yes
- **Legitimate** Yes. The value is well inside the exact-integer range; only the declared type changes, and it changes to remain truthful about the range rather than to dodge a limit.

### 46. Number of monotone lattice paths across a grid

- **Canonical range** LeetCode allows m, n up to 100 while asserting the answer fits about 2x10^9 — those two claims are not consistent, since C(198,99) is astronomically larger
- **Robinhood range** m, n <= 20, giving a maximum of C(38,19) ~ 1.7x10^10, comfortably inside the exact-integer range
- **Algorithm identical** yes
- **Overflow reasoning retained** no
- **Legitimate** Yes. The lesson is recognising a 2-D table with a base row and column; the magnitude of the count is incidental, and the canonical statement is self-contradictory about it anyway. Tightening the bound makes the problem MORE coherent than the original.

### 52. Minimum total cost to combine all lengths pairwise

- **Canonical range** n up to 10^4 with values up to 10^4, giving a total around 10^9 — already near the int32 edge
- **Robinhood range** n <= 1000 and value <= 10^4, giving a total under about 10^8
- **Algorithm identical** yes
- **Overflow reasoning retained** no
- **Legitimate** Yes. The lesson is extract-min twice, push the sum back, and see why the greedy choice is optimal. The accumulated total is bookkeeping. A tighter bound also keeps the answer inside int32, so every typed language uses its natural type.

## Slots C cannot express

12 of 54. Every one is a nested-vector argument or return, which C's calling
convention cannot model: a 2-D array needs a row count and a per-row column count, which is a
different convention rather than a longer one. **Curriculum quality was not distorted to reach
6/6.** Where a pattern would otherwise be entirely unreachable in C, one slot was chosen with a
naturally flat signature so the pattern still has an accessible entry point.

| # | Pattern | Concept | Signature |
| ---: | --- | --- | --- |
| 15 | `recursion/subset-include-exclude` | Enumerate all subsets of a distinct-element array | `vector<int> nums -> vector<vector<int>>` |
| 16 | `recursion/subset-include-exclude` | Enumerate subsets of an array containing duplicates, without repeats | `vector<int> nums -> vector<vector<int>>` |
| 18 | `recursion/backtracking-with-restore` | All combinations of candidates summing to a target, reuse allowed | `vector<int> candidates, int target -> vector<vector<int>>` |
| 20 | `arrays/intervals` | Merge a list of overlapping intervals | `vector<vector<int>> intervals -> vector<vector<int>>` |
| 21 | `arrays/intervals` | Insert one interval into a sorted disjoint set | `vector<vector<int>> intervals, vector<int> newInterval -> vector<vector<int>>` |
| 22 | `arrays/intervals` | Minimum number of rooms needed for overlapping meetings | `vector<vector<int>> intervals -> int` |
| 41 | `graphs/bfs-shortest-path` | Shortest clear path through a binary grid, eight-directional | `vector<vector<int>> grid -> int` |
| 42 | `graphs/bfs-shortest-path` | Minutes for a spreading state to fill a grid, or report impossible | `vector<vector<int>> grid -> int` |
| 44 | `graphs/topological-sort` | Whether a set of prerequisite pairs can all be satisfied | `int numCourses, vector<vector<int>> prerequisites -> bool` |
| 45 | `graphs/topological-sort` | Fewest rounds needed to finish all courses when independent ones run in parallel | `int numCourses, vector<vector<int>> relations -> int` |
| 47 | `dynamic-programming/2d-grid` | Minimum-cost path from corner to corner of a cost grid | `vector<vector<int>> grid -> int` |
| 48 | `dynamic-programming/2d-grid` | Monotone lattice paths with blocked cells | `vector<vector<int>> grid -> int` |

## Deliberately deferred

- **topics: linked-list (6 patterns), binary-trees (7), bst (5)** — BLOCKED — harness has no node encoding. 18 patterns, and no amount of authoring effort moves them.
- **topic: tries (5 patterns)** — BLOCKED — a trie is a stateful object with several methods; the signature model is one function.
- **basics/complexity-analysis, greedy/exchange-argument** — Not naturally a graded function. Assessed by explanation, not a return value.
- **all SPECIALIZED patterns (z-algorithm, manacher, sieve, bellman-ford, mst, bitmask-and-tree-dp, binary-trie-xor, trie-with-counts)** — Correctly later-milestone material. Including them at 150 would be the fake coverage this milestone is meant to avoid.
- **sliding-window-two-pointers: 5 of 7 patterns** — Already holds 61 of 96 problems. Adding more would deepen the imbalance; only the one-problem gap is repaired.
- **stack-queue/stack-with-aggregate, stack-queue/queue-from-stacks, heaps/two-heaps-median** — Design-shaped. CORE_INTERVIEW importance, but blocked on the signature model rather than on priority.
- **ADVANCED patterns whose prerequisites land at 150 (dijkstra, union-find, lis-and-lcs, unbounded-knapsack, edit-distance, kmp, rolling-hash, monotonic-deque, bitmask patterns)** — Their prerequisites are being built at this milestone. They become the natural core of the 250 milestone.

## Future architecture, recorded and NOT started

### NODE_ENCODING

- **Unblocks** 19 patterns across linked-list, binary-trees, bst, plus recursion/recursion-on-data-structures
- **Needs** A node type in the canonical vocabulary, its literal emitters for all six languages, and a JSON encoding that can express sharing and cycles rather than only a tree-shaped array.
- **Also requires** re-authoring the 4 problems in REQUIRES_REAUTHOR_AFTER_NODE_ENCODING
- **Milestone** prerequisite for serious linked-list / tree / BST expansion, i.e. before 250

### MULTI_METHOD_JUDGE

- **Unblocks** 8 patterns: all of tries, plus min-stack, queue-from-stacks, two-heaps-median
- **Needs** A protocol for a stateful object: construct, then apply a sequence of method calls, then compare a sequence of returns. The signature model today is one function, one return.
- **Milestone** after node encoding; design questions are common in interviews but not foundational

### TYPED_EXPECTED_OUTPUT

- **Unblocks** problems whose correct answer needs exact integers beyond 2^53-1, including canonical modular exponentiation with modulus 10^9+7
- **Needs** See PRODUCTION_READINESS.md section 18. Note this is not only a storage problem: every authored problem carries a JavaScript reference solution, and JS numbers are doubles, so the derivation path needs addressing too.
- **Milestone** before authoring any problem whose answer exceeds the exact-integer range

### NON_GRADED_CURRICULUM_ITEMS

- **Unblocks** 2 CONCEPTUAL patterns, and the explanatory half of every pattern
- **Needs** A curriculum item type that is not a graded function — a derivation, a proof, a complexity argument — with some form of assessment that is not deepEqual on a return value.
- **Milestone** not blocking any milestone; the two patterns stay as anchors until then

## Problems requiring re-authoring after node encoding

Not relocated in this phase. Relocation alone is insufficient for the first two: a cycle cannot
be represented in a flat JSON array, so those problems are wrong rather than merely misfiled.

| Problem | Currently in | Should be | Action |
| --- | --- | --- | --- |
| `linked-list-cycle` | `sliding-window-two-pointers/same-direction-two-pointers` | `linked-list/cycle-detection-floyd` | **REAUTHOR** |
| `linked-list-cycle-ii` | `sliding-window-two-pointers/same-direction-two-pointers` | `linked-list/cycle-detection-floyd` | **REAUTHOR** |
| `middle-of-the-linked-list` | `sliding-window-two-pointers/same-direction-two-pointers` | `linked-list/fast-slow-pointer` | **RELOCATE_THEN_REAUTHOR** |
| `remove-nth-node-from-end-of-list` | `sliding-window-two-pointers/same-direction-two-pointers` | `linked-list/kth-node-and-rearrangement` | **RELOCATE_THEN_REAUTHOR** |

- `linked-list-cycle` — A cycle is not representable in a flat array. The problem as it stands can be solved without cycle detection, so relocating it would move a broken problem into the right folder. It must be re-authored against a genuine node representation.
- `linked-list-cycle-ii` — Same defect as linked-list-cycle, and it additionally has to return the entry node of the cycle — which has no meaning without a node type.
- `middle-of-the-linked-list` — As an array this is index arithmetic and teaches nothing about pointers; the fast/slow technique is only necessary when you cannot index. Faithful only with a node type.
- `remove-nth-node-from-end-of-list` — Array removal is a splice. The lesson is pointer rewiring with a gap of n, which needs a node type.
