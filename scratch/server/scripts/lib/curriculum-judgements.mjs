/**
 * CURRICULUM JUDGEMENTS — analysis, not repository data.
 *
 * Everything in this file is an engineering and pedagogical opinion. Nothing here is read
 * from the repository, and the audit script keeps it in a separate section of its output for
 * exactly that reason: `curriculum-audit.mjs` computes FACTS from topics.json,
 * patterns/*.json and problems/, and then joins those facts to the opinions below. If the
 * two ever disagree about what exists, the repository is right and this file is stale.
 *
 * Three things live here:
 *
 *   1. CLASSIFICATION      what tier each of the 108 patterns belongs to, and why
 *   2. PATTERN_DEPENDENCIES  which pattern needs which other pattern first
 *   3. MILESTONE_150        the proposed allocation and the slot for every addition
 *
 * On dependencies specifically: the repository carries TOPIC-level `prerequisites` in
 * topics.json, and that is real metadata. It carries NO pattern-level prerequisites — the
 * pattern objects have only slug, name, order_index, explanation, when_to_use, intuition,
 * common_pitfalls and complexity_signature. So every edge in PATTERN_DEPENDENCIES is a
 * judgement call, and the audit labels it as one.
 */

// ---------------------------------------------------------------------------
// 1. Classification
// ---------------------------------------------------------------------------

/**
 * FOUNDATION      a later pattern cannot be taught without it; or it is the base
 *                 recognition shape its whole topic builds on
 * CORE_INTERVIEW  a pattern a candidate is expected to recognise on sight
 * IMPORTANT       worth teaching, but nothing else is blocked on it
 * ADVANCED        a variation of something already taught, or needs several prerequisites
 * SPECIALIZED     narrow. Competitive-programming or single-technique territory
 *
 * No company-frequency numbers appear anywhere in this file. "Interview frequency" below
 * means a conceptual judgement about how central the technique is, nothing more.
 */
export const TIERS = Object.freeze(['FOUNDATION', 'CORE_INTERVIEW', 'IMPORTANT', 'ADVANCED', 'SPECIALIZED']);

// ---------------------------------------------------------------------------
// 1b. Pattern KIND — what sort of curriculum item a pattern can hold
// ---------------------------------------------------------------------------

/**
 * Tier says how IMPORTANT a pattern is. Kind says what it can CONTAIN. They are independent,
 * and conflating them is what made the first coverage metric misleading: reporting "92 of 108
 * patterns empty" counted `basics/complexity-analysis` — which should never hold a graded
 * function — the same as `arrays/intervals`, which is simply unwritten.
 *
 *   CODING                a normal graded function problem
 *   CONCEPTUAL            deliberately never a graded function. Not a gap.
 *   STRUCTURALLY_BLOCKED  would be a coding problem, but the execution architecture cannot
 *                         represent it faithfully today. A gap, but not a content gap.
 *
 * Only CODING patterns belong in the denominator of a curriculum-coverage KPI.
 */
export const KINDS = Object.freeze(['CODING', 'CONCEPTUAL', 'STRUCTURALLY_BLOCKED']);

/**
 * Patterns that are deliberately not coding problems. KEPT in the taxonomy on purpose.
 *
 * Robinhood should eventually carry curriculum items that are not conventional coding
 * problems — an explanation, a proof, a complexity derivation. That is recorded as
 * architecture debt in FUTURE_ARCHITECTURE, not built here. Until then these two patterns
 * stay in the taxonomy as conceptual anchors and are excluded from coverage arithmetic
 * rather than counted as missing content.
 */
export const CONCEPTUAL_PATTERNS = Object.freeze({
  'basics/complexity-analysis': 'Deriving an asymptotic bound is assessed by explanation. A function that returns a complexity string tests string formatting, not analysis.',
  'greedy/exchange-argument': 'Proving a greedy choice is safe is a proof obligation. Any function wrapping it would grade the implementation of an algorithm the learner was told to use, which is the opposite of the skill.',
});

/** @type {Record<string, {tier: string, why: string}>} keyed by `topic/pattern` */
export const CLASSIFICATION = Object.freeze({
  // --- basics: the declared prerequisite of every other topic -------------
  'basics/complexity-analysis':            { tier: 'FOUNDATION', why: 'Every later pattern is chosen by cost. Also the one pattern that may not be expressible as a graded function — see the notes.' },
  'basics/simulation':                     { tier: 'FOUNDATION', why: 'Translating prose into a correct loop is the skill every other topic assumes.' },
  'basics/integer-math-modular':           { tier: 'IMPORTANT',  why: 'Needed by hashing, overflow safety and modular DP; nothing in the current curriculum is blocked on it.' },
  'basics/prefix-arithmetic-basics':       { tier: 'FOUNDATION', why: 'Direct prerequisite of arrays/prefix-sum, which is the most populated non-window pattern.' },
  'basics/sieve-and-primes':               { tier: 'SPECIALIZED', why: 'Number theory. Self-contained and nothing depends on it.' },
  'basics/bit-and-base-conversion':        { tier: 'IMPORTANT',  why: 'Prerequisite for bit-manipulation, which currently starts at xor-properties with no groundwork.' },

  // --- sorting: prerequisite of arrays, binary-search, heaps, greedy ------
  'sorting/comparison-sorts-elementary':   { tier: 'FOUNDATION', why: 'You cannot reason about "just sort it" until you have written one.' },
  'sorting/merge-sort-divide-conquer':     { tier: 'CORE_INTERVIEW', why: 'The divide-and-conquer shape is reused by k-way merge, inversion counting and quickselect reasoning.' },
  'sorting/quick-sort-and-partition':      { tier: 'CORE_INTERVIEW', why: 'Partitioning is the mechanism behind quickselect, which is the optimal answer to top-k.' },
  'sorting/heap-sort':                     { tier: 'IMPORTANT',  why: 'Bridges sorting to heaps; useful but replaceable by the heap topic itself.' },
  'sorting/non-comparison-sorts':          { tier: 'IMPORTANT',  why: 'Counting and bucket sort underpin several frequency problems.' },
  'sorting/custom-comparator-and-stability': { tier: 'CORE_INTERVIEW', why: 'Greedy and interval problems are almost all "sort by the right key first"; stability is where they silently break.' },

  // --- arrays -------------------------------------------------------------
  'arrays/prefix-sum':                     { tier: 'FOUNDATION', why: 'Range-query thinking, and the hashmap-of-prefixes trick generalises widely.' },
  'arrays/difference-array':               { tier: 'IMPORTANT',  why: 'Range-update dual of prefix sum. Real but narrower.' },
  'arrays/kadane-maximum-subarray':        { tier: 'CORE_INTERVIEW', why: 'The canonical entry point to optimal-substructure thinking; a gateway to DP.' },
  'arrays/in-place-rearrangement':         { tier: 'CORE_INTERVIEW', why: 'O(1)-space discipline, asked constantly and easy to get subtly wrong.' },
  'arrays/cyclic-sort':                    { tier: 'IMPORTANT',  why: 'Value-as-index trick for the missing/duplicate family. Elegant but narrow.' },
  'arrays/dutch-national-flag':            { tier: 'CORE_INTERVIEW', why: 'Three-way partition. Note the curriculum already teaches it elsewhere — see the duplicate finding.' },
  'arrays/intervals':                      { tier: 'CORE_INTERVIEW', why: 'Merge/insert intervals is a first-tier interview pattern and the topic is empty.' },

  // --- binary search ------------------------------------------------------
  'binary-search/classic-binary-search':   { tier: 'FOUNDATION', why: 'The base loop. Populated.' },
  'binary-search/lower-upper-bound':       { tier: 'FOUNDATION', why: 'Boundary discipline. Every other binary-search pattern is this with a predicate swapped, and getting it wrong is the usual cause of off-by-one bugs.' },
  'binary-search/binary-search-on-rotated': { tier: 'CORE_INTERVIEW', why: 'Classic invariant-reasoning problem.' },
  'binary-search/binary-search-on-2d-matrix': { tier: 'IMPORTANT', why: 'Index flattening. A representation trick more than a new technique.' },
  'binary-search/binary-search-on-answer': { tier: 'CORE_INTERVIEW', why: 'Searching a monotone predicate rather than an array is the highest-leverage idea in the topic and it is empty.' },
  'binary-search/peak-and-bitonic':        { tier: 'IMPORTANT',  why: 'Binary search without a sorted array; good for breaking the "must be sorted" assumption.' },

  // --- strings ------------------------------------------------------------
  'strings/frequency-counter':             { tier: 'FOUNDATION', why: 'Counting is the base string technique. Populated.' },
  'strings/palindrome-expansion':          { tier: 'CORE_INTERVIEW', why: 'Centre expansion is the standard non-DP palindrome tool and the pattern is empty.' },
  'strings/kmp-failure-function':          { tier: 'ADVANCED',   why: 'Needs prefix-function reasoning that nothing else in the curriculum builds toward yet.' },
  'strings/z-algorithm':                   { tier: 'SPECIALIZED', why: 'Competitive-programming technique; rarely expected in interviews.' },
  'strings/rolling-hash-rabin-karp':       { tier: 'ADVANCED',   why: 'Depends on integer-math-modular, which is itself empty.' },
  'strings/manacher-palindromes':          { tier: 'SPECIALIZED', why: 'Highly specialised; palindrome-expansion and DP cover interview needs.' },

  // --- linked list: BLOCKED on the harness node encoding ------------------
  'linked-list/dummy-node':                { tier: 'CORE_INTERVIEW', why: 'The standard way to avoid head special-casing.' },
  'linked-list/in-place-reversal':         { tier: 'CORE_INTERVIEW', why: 'Pointer-rewiring fundamentals.' },
  'linked-list/fast-slow-pointer':         { tier: 'CORE_INTERVIEW', why: 'Midpoint and cycle structure.' },
  'linked-list/cycle-detection-floyd':     { tier: 'CORE_INTERVIEW', why: 'Canonical, and the repo already has a cautionary version of it modelled as an array.' },
  'linked-list/merge-and-split':           { tier: 'IMPORTANT',  why: 'Composition of dummy-node and traversal.' },
  'linked-list/kth-node-and-rearrangement': { tier: 'IMPORTANT', why: 'Index arithmetic over pointers.' },

  // --- recursion: prerequisite of DP and of both tree topics --------------
  'recursion/subset-include-exclude':      { tier: 'FOUNDATION', why: 'The include/exclude decision tree is the shape every backtracking and knapsack problem reuses.' },
  'recursion/permutation-swap':            { tier: 'CORE_INTERVIEW', why: 'Ordering enumeration, and the in-place swap variant teaches state restoration.' },
  'recursion/backtracking-with-restore':   { tier: 'CORE_INTERVIEW', why: 'Explicit undo is where most candidates break; a distinct skill from plain recursion.' },
  'recursion/divide-and-conquer':          { tier: 'IMPORTANT',  why: 'Overlaps sorting/merge-sort but generalises the recurrence.' },
  'recursion/decision-tree':               { tier: 'IMPORTANT',  why: 'Framing device for turning a problem into branching choices.' },
  'recursion/recursion-on-data-structures': { tier: 'FOUNDATION', why: 'The bridge to trees — but it needs a linked or tree structure, so it is harness-blocked.' },

  // --- bit manipulation ---------------------------------------------------
  'bit-manipulation/basic-bit-ops':        { tier: 'FOUNDATION', why: 'Mask/shift/test primitives. Empty while xor-properties has four problems, which is backwards.' },
  'bit-manipulation/xor-properties':       { tier: 'CORE_INTERVIEW', why: 'Self-inverse cancellation. Populated.' },
  'bit-manipulation/count-set-bits':       { tier: 'IMPORTANT',  why: 'Popcount and Brian Kernighan; also a DP-over-bits warm-up.' },
  'bit-manipulation/subset-enumeration-bitmask': { tier: 'ADVANCED', why: 'Needs both subsets and bit fluency.' },
  'bit-manipulation/bitmask-dp-state':     { tier: 'ADVANCED',   why: 'Requires DP plus bitmask; two prerequisites deep.' },
  'bit-manipulation/power-of-two-and-tricks': { tier: 'IMPORTANT', why: 'Small identities worth recognising.' },

  // --- stack & queue ------------------------------------------------------
  'stack-queue/parenthesis-matching':      { tier: 'FOUNDATION', why: 'The introductory reason a stack exists. Only one problem.' },
  'stack-queue/monotonic-stack':           { tier: 'CORE_INTERVIEW', why: 'Next-greater family. Populated.' },
  'stack-queue/monotonic-deque':           { tier: 'ADVANCED',   why: 'Duplicated by sliding-window/monotonic-deque-window, which holds twelve problems — see the duplicate finding.' },
  'stack-queue/expression-evaluation':     { tier: 'IMPORTANT',  why: 'Parsing with two stacks; a genuinely different use of the structure.' },
  'stack-queue/stack-with-aggregate':      { tier: 'CORE_INTERVIEW', why: 'Min-stack. Conceptually core, but it is a DESIGN problem and the harness models single functions — see the notes.' },
  'stack-queue/queue-from-stacks':         { tier: 'IMPORTANT',  why: 'Amortised analysis made concrete. Also design-shaped.' },
  'stack-queue/bfs-on-state':              { tier: 'ADVANCED',   why: 'Overlaps graphs/bfs-shortest-path; better taught there.' },

  // --- sliding window & two pointers: the over-populated topic ------------
  'sliding-window-two-pointers/fixed-size-sliding-window':     { tier: 'FOUNDATION', why: 'Base window shape. Twelve problems.' },
  'sliding-window-two-pointers/variable-size-sliding-window':  { tier: 'FOUNDATION', why: 'The grow/shrink invariant is the single most transferable window idea, and it has ONE problem while its neighbours have twelve.' },
  'sliding-window-two-pointers/at-most-k-window':              { tier: 'CORE_INTERVIEW', why: 'At-most-K decomposition. Twelve problems.' },
  'sliding-window-two-pointers/opposite-direction-two-pointers': { tier: 'FOUNDATION', why: 'Converging pointers on sorted data. Twelve problems.' },
  'sliding-window-two-pointers/same-direction-two-pointers':   { tier: 'FOUNDATION', why: 'Read/write pointer and in-place filtering. Twelve problems.' },
  'sliding-window-two-pointers/multi-pointer-merge':           { tier: 'IMPORTANT',  why: 'k-way merge shape; overlaps heaps/k-way-merge.' },
  'sliding-window-two-pointers/monotonic-deque-window':        { tier: 'ADVANCED',   why: 'Twelve problems, seven of them Hard — the most advanced material in the repo sitting in a topic whose prerequisites are unbuilt.' },

  // --- heaps --------------------------------------------------------------
  'heaps/top-k-with-heap':                 { tier: 'CORE_INTERVIEW', why: 'Bounded-heap selection, one of the most reused shapes there is.' },
  'heaps/k-way-merge':                     { tier: 'CORE_INTERVIEW', why: 'Merging sorted streams under a heap.' },
  'heaps/two-heaps-median':                { tier: 'ADVANCED',   why: 'Balanced-invariant maintenance; design-shaped.' },
  'heaps/scheduling-with-heap':            { tier: 'IMPORTANT',  why: 'Interval plus heap; needs arrays/intervals first.' },
  'heaps/heap-as-priority-queue':          { tier: 'FOUNDATION', why: 'What a heap is and what it costs. Prerequisite for the rest of the topic and for dijkstra.' },
  'heaps/heap-dijkstra-shape':             { tier: 'ADVANCED',   why: 'Belongs after graphs traversal is established.' },

  // --- greedy -------------------------------------------------------------
  'greedy/sort-then-greedy':               { tier: 'FOUNDATION', why: 'The base greedy move. Empty while interval-scheduling, which is a specialisation of it, has four problems.' },
  'greedy/interval-scheduling':            { tier: 'CORE_INTERVIEW', why: 'Earliest-finish-time exchange argument. Populated.' },
  'greedy/exchange-argument':              { tier: 'ADVANCED',   why: 'A proof technique rather than a coding pattern; hard to assess by unit tests.' },
  'greedy/gas-station-circular':           { tier: 'IMPORTANT',  why: 'Prefix-minimum reasoning on a circular array.' },
  'greedy/jump-game-greedy':               { tier: 'CORE_INTERVIEW', why: 'Reachability frontier; the standard greedy-versus-DP comparison.' },
  'greedy/huffman-style-merge':            { tier: 'IMPORTANT',  why: 'Repeated-minimum merging; needs heaps first.' },

  // --- binary trees: BLOCKED ---------------------------------------------
  'binary-trees/dfs-traversals':           { tier: 'FOUNDATION', why: 'Pre/in/post order is the alphabet of every tree problem.' },
  'binary-trees/bfs-level-order':          { tier: 'CORE_INTERVIEW', why: 'Level structure; bridges to graph BFS.' },
  'binary-trees/tree-recursion-with-return': { tier: 'FOUNDATION', why: 'Returning aggregates up the recursion is the core tree skill.' },
  'binary-trees/path-and-diameter':        { tier: 'CORE_INTERVIEW', why: 'Combining results from both subtrees.' },
  'binary-trees/construction-from-traversals': { tier: 'IMPORTANT', why: 'Index reasoning over recursion.' },
  'binary-trees/lowest-common-ancestor':   { tier: 'CORE_INTERVIEW', why: 'Canonical, and the reasoning generalises.' },
  'binary-trees/serialization':            { tier: 'IMPORTANT',  why: 'Encode/decode round trip; design-shaped.' },

  // --- BST: BLOCKED ------------------------------------------------------
  'bst/in-order-property':                 { tier: 'FOUNDATION', why: 'Everything about a BST follows from in-order being sorted.' },
  'bst/validation-with-bounds':            { tier: 'CORE_INTERVIEW', why: 'The classic bounds-propagation trap.' },
  'bst/insert-delete-bst':                 { tier: 'IMPORTANT',  why: 'Structural mutation with cases.' },
  'bst/kth-element-via-inorder':           { tier: 'IMPORTANT',  why: 'Applies the in-order property.' },
  'bst/range-queries-bst':                 { tier: 'IMPORTANT',  why: 'Pruning by bounds.' },

  // --- graphs -------------------------------------------------------------
  'graphs/bfs-shortest-path':              { tier: 'CORE_INTERVIEW', why: 'Unweighted shortest path. Empty while dfs-connectivity has four, which inverts the usual teaching order.' },
  'graphs/dfs-connectivity':               { tier: 'FOUNDATION', why: 'Flood fill and components. Populated.' },
  'graphs/topological-sort':               { tier: 'CORE_INTERVIEW', why: 'Dependency ordering plus cycle detection on a DAG.' },
  'graphs/union-find':                     { tier: 'CORE_INTERVIEW', why: 'Disjoint sets; the alternative lens on connectivity and a prerequisite for MST.' },
  'graphs/dijkstra':                       { tier: 'ADVANCED',   why: 'Needs heaps and BFS both established first.' },
  'graphs/bellman-ford':                   { tier: 'SPECIALIZED', why: 'Negative-weight handling; rarely required.' },
  'graphs/mst-prim-kruskal':               { tier: 'SPECIALIZED', why: 'Needs union-find or heaps; narrow interview surface.' },
  'graphs/cycle-and-scc':                  { tier: 'ADVANCED',   why: 'Tarjan/Kosaraju territory, several prerequisites deep.' },

  // --- dynamic programming ------------------------------------------------
  'dynamic-programming/1d-state':          { tier: 'FOUNDATION', why: 'One-dimensional recurrences. Populated.' },
  'dynamic-programming/2d-grid':           { tier: 'CORE_INTERVIEW', why: 'The natural step from 1-D, and the easiest place to see a table.' },
  'dynamic-programming/0-1-knapsack':      { tier: 'CORE_INTERVIEW', why: 'Subset-sum family; the most reused DP formulation.' },
  'dynamic-programming/unbounded-knapsack': { tier: 'IMPORTANT',  why: 'Coin-change variant; a loop-order change from 0-1.' },
  'dynamic-programming/lis-and-lcs':       { tier: 'CORE_INTERVIEW', why: 'Subsequence DP, and LIS has the binary-search optimisation worth teaching.' },
  'dynamic-programming/edit-distance-and-alignment': { tier: 'IMPORTANT', why: 'Two-string DP; a clean generalisation of LCS.' },
  'dynamic-programming/interval-and-partition-dp': { tier: 'ADVANCED', why: 'Interval recurrences need solid 2-D DP first.' },
  'dynamic-programming/bitmask-and-tree-dp': { tier: 'SPECIALIZED', why: 'Two prerequisites deep and narrow.' },

  // --- tries --------------------------------------------------------------
  'tries/character-trie-basics':           { tier: 'IMPORTANT',  why: 'Prefix structure; inherently a design/class problem, so harness-shaped rather than importance-limited.' },
  'tries/prefix-and-autocomplete':         { tier: 'IMPORTANT',  why: 'The main practical use of a trie.' },
  'tries/word-search-with-trie':           { tier: 'ADVANCED',   why: 'Trie plus grid backtracking.' },
  'tries/binary-trie-xor':                 { tier: 'SPECIALIZED', why: 'Max-XOR queries; competitive territory.' },
  'tries/trie-with-counts-and-deletion':   { tier: 'SPECIALIZED', why: 'Bookkeeping variant.' },
});

// ---------------------------------------------------------------------------
// 2. Pattern-level dependencies — ALL judgement
// ---------------------------------------------------------------------------

/**
 * `pattern: [patterns that should come first]`, using `topic/pattern` keys.
 *
 * Not in the repository. topics.json has topic-level `prerequisites`; pattern objects have
 * no such field, so every edge below is authored here and the audit marks the whole graph
 * as judgement-derived. Only edges that constrain teaching order are listed; this is not an
 * attempt at a complete graph over all 108 patterns.
 */
export const PATTERN_DEPENDENCIES = Object.freeze({
  'arrays/prefix-sum':                      ['basics/prefix-arithmetic-basics'],
  'arrays/kadane-maximum-subarray':         ['arrays/prefix-sum'],
  'arrays/difference-array':                ['arrays/prefix-sum'],
  'arrays/intervals':                       ['sorting/custom-comparator-and-stability'],
  'arrays/dutch-national-flag':             ['sliding-window-two-pointers/opposite-direction-two-pointers'],
  'arrays/cyclic-sort':                     ['arrays/in-place-rearrangement'],

  'binary-search/lower-upper-bound':        ['binary-search/classic-binary-search'],
  'binary-search/binary-search-on-rotated': ['binary-search/lower-upper-bound'],
  'binary-search/binary-search-on-answer':  ['binary-search/lower-upper-bound'],
  'binary-search/binary-search-on-2d-matrix': ['binary-search/lower-upper-bound'],
  'binary-search/peak-and-bitonic':         ['binary-search/classic-binary-search'],

  'sliding-window-two-pointers/variable-size-sliding-window': ['sliding-window-two-pointers/fixed-size-sliding-window'],
  'sliding-window-two-pointers/at-most-k-window':             ['sliding-window-two-pointers/variable-size-sliding-window'],
  'sliding-window-two-pointers/monotonic-deque-window':       ['stack-queue/monotonic-stack', 'sliding-window-two-pointers/fixed-size-sliding-window'],
  'sliding-window-two-pointers/multi-pointer-merge':          ['sliding-window-two-pointers/same-direction-two-pointers'],

  'strings/palindrome-expansion':           ['strings/frequency-counter'],
  'strings/rolling-hash-rabin-karp':        ['basics/integer-math-modular'],
  'strings/kmp-failure-function':           ['strings/frequency-counter'],
  'strings/manacher-palindromes':           ['strings/palindrome-expansion'],

  'bit-manipulation/xor-properties':        ['bit-manipulation/basic-bit-ops'],
  'bit-manipulation/count-set-bits':        ['bit-manipulation/basic-bit-ops'],
  'bit-manipulation/subset-enumeration-bitmask': ['bit-manipulation/basic-bit-ops', 'recursion/subset-include-exclude'],
  'bit-manipulation/bitmask-dp-state':      ['bit-manipulation/subset-enumeration-bitmask', 'dynamic-programming/1d-state'],
  'bit-manipulation/power-of-two-and-tricks': ['bit-manipulation/basic-bit-ops'],

  'stack-queue/monotonic-stack':            ['stack-queue/parenthesis-matching'],
  'stack-queue/monotonic-deque':            ['stack-queue/monotonic-stack'],
  'stack-queue/expression-evaluation':      ['stack-queue/parenthesis-matching'],
  'stack-queue/stack-with-aggregate':       ['stack-queue/parenthesis-matching'],

  'recursion/permutation-swap':             ['recursion/subset-include-exclude'],
  'recursion/backtracking-with-restore':    ['recursion/subset-include-exclude'],
  'recursion/divide-and-conquer':           ['sorting/merge-sort-divide-conquer'],
  'recursion/recursion-on-data-structures': ['recursion/subset-include-exclude'],

  'sorting/quick-sort-and-partition':       ['sorting/comparison-sorts-elementary'],
  'sorting/merge-sort-divide-conquer':      ['sorting/comparison-sorts-elementary'],
  'sorting/heap-sort':                      ['heaps/heap-as-priority-queue'],
  'sorting/custom-comparator-and-stability': ['sorting/comparison-sorts-elementary'],

  'heaps/top-k-with-heap':                  ['heaps/heap-as-priority-queue'],
  'heaps/k-way-merge':                      ['heaps/heap-as-priority-queue'],
  'heaps/two-heaps-median':                 ['heaps/heap-as-priority-queue'],
  'heaps/scheduling-with-heap':             ['heaps/heap-as-priority-queue', 'arrays/intervals'],
  'heaps/heap-dijkstra-shape':              ['heaps/heap-as-priority-queue', 'graphs/bfs-shortest-path'],

  'greedy/interval-scheduling':             ['greedy/sort-then-greedy', 'sorting/custom-comparator-and-stability'],
  'greedy/exchange-argument':               ['greedy/sort-then-greedy'],
  'greedy/jump-game-greedy':                ['greedy/sort-then-greedy'],
  'greedy/gas-station-circular':            ['arrays/prefix-sum'],
  'greedy/huffman-style-merge':             ['heaps/heap-as-priority-queue'],

  'graphs/bfs-shortest-path':               ['graphs/dfs-connectivity'],
  'graphs/topological-sort':                ['graphs/dfs-connectivity'],
  'graphs/union-find':                      ['graphs/dfs-connectivity'],
  'graphs/dijkstra':                        ['graphs/bfs-shortest-path', 'heaps/heap-as-priority-queue'],
  'graphs/bellman-ford':                    ['graphs/dijkstra'],
  'graphs/mst-prim-kruskal':                ['graphs/union-find', 'heaps/heap-as-priority-queue'],
  'graphs/cycle-and-scc':                   ['graphs/topological-sort'],

  'dynamic-programming/1d-state':           ['recursion/subset-include-exclude'],
  'dynamic-programming/2d-grid':            ['dynamic-programming/1d-state'],
  'dynamic-programming/0-1-knapsack':       ['dynamic-programming/1d-state', 'recursion/subset-include-exclude'],
  'dynamic-programming/unbounded-knapsack': ['dynamic-programming/0-1-knapsack'],
  'dynamic-programming/lis-and-lcs':        ['dynamic-programming/2d-grid'],
  'dynamic-programming/edit-distance-and-alignment': ['dynamic-programming/lis-and-lcs'],
  'dynamic-programming/interval-and-partition-dp':   ['dynamic-programming/2d-grid'],
  'dynamic-programming/bitmask-and-tree-dp': ['dynamic-programming/0-1-knapsack', 'bit-manipulation/subset-enumeration-bitmask'],

  'binary-trees/dfs-traversals':            ['recursion/recursion-on-data-structures'],
  'binary-trees/bfs-level-order':           ['binary-trees/dfs-traversals'],
  'binary-trees/tree-recursion-with-return': ['binary-trees/dfs-traversals'],
  'binary-trees/path-and-diameter':         ['binary-trees/tree-recursion-with-return'],
  'binary-trees/lowest-common-ancestor':    ['binary-trees/tree-recursion-with-return'],
  'binary-trees/construction-from-traversals': ['binary-trees/dfs-traversals'],
  'binary-trees/serialization':             ['binary-trees/bfs-level-order'],
  'bst/in-order-property':                  ['binary-trees/dfs-traversals'],
  'bst/validation-with-bounds':             ['bst/in-order-property'],
  'bst/kth-element-via-inorder':            ['bst/in-order-property'],
  'bst/insert-delete-bst':                  ['bst/in-order-property'],
  'bst/range-queries-bst':                  ['bst/in-order-property'],

  'linked-list/in-place-reversal':          ['linked-list/dummy-node'],
  'linked-list/cycle-detection-floyd':      ['linked-list/fast-slow-pointer'],
  'linked-list/merge-and-split':            ['linked-list/dummy-node'],
  'linked-list/kth-node-and-rearrangement': ['linked-list/fast-slow-pointer'],

  'tries/prefix-and-autocomplete':          ['tries/character-trie-basics'],
  'tries/word-search-with-trie':            ['tries/character-trie-basics', 'recursion/backtracking-with-restore'],
  'tries/binary-trie-xor':                  ['tries/character-trie-basics', 'bit-manipulation/basic-bit-ops'],
  'tries/trie-with-counts-and-deletion':    ['tries/character-trie-basics'],
});

// ---------------------------------------------------------------------------
// 3. Structural blockers — why a pattern cannot receive a problem today
// ---------------------------------------------------------------------------

/**
 * These are not opinions about importance. They are limits of the current execution
 * pipeline, and they decide what the 150 milestone is even able to contain.
 */
export const BLOCKERS = Object.freeze({
  NODE_ENCODING: {
    label: 'harness has no node type',
    detail: 'Arguments are decoded into the canonical type vocabulary, which has no encoding for '
      + 'a node with pointers. Passing a list or tree as a flat array yields problems solvable '
      + 'without the algorithm they teach — the repo already contains that mistake as '
      + 'linked-list-cycle, sitting in same-direction-two-pointers.',
    topics: ['linked-list', 'binary-trees', 'bst'],
    patterns: ['recursion/recursion-on-data-structures'],
  },
  DESIGN_SHAPED: {
    label: 'needs a class/multi-method signature',
    detail: 'The signature model is one function with typed arguments and one return. A problem '
      + 'whose whole point is a stateful object with several methods (min-stack, a queue built '
      + 'from stacks, a trie, a median stream) cannot be expressed, and flattening it into one '
      + 'call removes the thing being taught.',
    topics: ['tries'],
    patterns: [
      'stack-queue/stack-with-aggregate',
      'stack-queue/queue-from-stacks',
      'heaps/two-heaps-median',
      'binary-trees/serialization',
      'bst/insert-delete-bst',
    ],
  },
  NOT_A_GRADED_FUNCTION: {
    label: 'not naturally a graded function',
    detail: 'Reasoning about asymptotic cost, or proving an exchange argument, is assessed by '
      + 'explanation rather than by a return value. Forcing it into a unit-tested function '
      + 'produces a problem that tests something other than the skill.',
    topics: [],
    patterns: ['basics/complexity-analysis', 'greedy/exchange-argument'],
  },
});

/** Every pattern key a blocker covers, expanded from topics + explicit patterns. */
export function blockedPatternKeys(allKeys) {
  const out = new Map();
  for (const [id, b] of Object.entries(BLOCKERS)) {
    if (id === 'NOT_A_GRADED_FUNCTION') continue; // those are CONCEPTUAL, not blocked
    for (const topic of b.topics) {
      for (const k of allKeys) if (k.startsWith(`${topic}/`)) out.set(k, id);
    }
    for (const k of b.patterns) out.set(k, id);
  }
  return out;
}

/**
 * CODING / CONCEPTUAL / STRUCTURALLY_BLOCKED for one pattern.
 *
 * CONCEPTUAL wins over blocked: a pattern that should never be a graded function is not
 * waiting on architecture.
 */
export function patternKind(key, blockedMap) {
  if (CONCEPTUAL_PATTERNS[key]) return { kind: 'CONCEPTUAL', reason: CONCEPTUAL_PATTERNS[key], blocker: null };
  const blocker = blockedMap.get(key);
  if (blocker) return { kind: 'STRUCTURALLY_BLOCKED', reason: BLOCKERS[blocker].label, blocker };
  return { kind: 'CODING', reason: null, blocker: null };
}

// ---------------------------------------------------------------------------
// 3b. Problems that must be re-authored, not merely relocated
// ---------------------------------------------------------------------------

/**
 * Four linked-list problems are authored under a two-pointer pattern because the linked-list
 * topic is harness-blocked. They are NOT relocated in this phase, and relocation alone would
 * not be enough for all of them.
 *
 * The distinction that matters: a problem modelled as a flat array is only *misfiled* if the
 * array faithfully represents the structure. `linked-list-cycle` is worse than misfiled — a
 * cycle cannot be expressed in a flat JSON array at all, so whatever the test cases encode,
 * the answer is derivable without Floyd's algorithm. That is a wrong problem, not a wrongly
 * placed one, and INDEX.md already says so.
 */
export const REQUIRES_REAUTHOR_AFTER_NODE_ENCODING = Object.freeze({
  'linked-list-cycle': {
    currentlyIn: 'sliding-window-two-pointers/same-direction-two-pointers',
    shouldBe: 'linked-list/cycle-detection-floyd',
    action: 'REAUTHOR',
    why: 'A cycle is not representable in a flat array. The problem as it stands can be solved without cycle detection, so relocating it would move a broken problem into the right folder. It must be re-authored against a genuine node representation.',
  },
  'linked-list-cycle-ii': {
    currentlyIn: 'sliding-window-two-pointers/same-direction-two-pointers',
    shouldBe: 'linked-list/cycle-detection-floyd',
    action: 'REAUTHOR',
    why: 'Same defect as linked-list-cycle, and it additionally has to return the entry node of the cycle — which has no meaning without a node type.',
  },
  'middle-of-the-linked-list': {
    currentlyIn: 'sliding-window-two-pointers/same-direction-two-pointers',
    shouldBe: 'linked-list/fast-slow-pointer',
    action: 'RELOCATE_THEN_REAUTHOR',
    why: 'As an array this is index arithmetic and teaches nothing about pointers; the fast/slow technique is only necessary when you cannot index. Faithful only with a node type.',
  },
  'remove-nth-node-from-end-of-list': {
    currentlyIn: 'sliding-window-two-pointers/same-direction-two-pointers',
    shouldBe: 'linked-list/kth-node-and-rearrangement',
    action: 'RELOCATE_THEN_REAUTHOR',
    why: 'Array removal is a splice. The lesson is pointer rewiring with a gap of n, which needs a node type.',
  },
});

// ---------------------------------------------------------------------------
// 3c. Future architecture work — recorded, deliberately NOT started
// ---------------------------------------------------------------------------

/**
 * None of this is Phase 3A work. It is written down so the 150 milestone can be honest about
 * what it is choosing not to cover, and so the 250 milestone has a prerequisite list.
 */
export const FUTURE_ARCHITECTURE = Object.freeze([
  {
    id: 'NODE_ENCODING',
    unblocks: '19 patterns across linked-list, binary-trees, bst, plus recursion/recursion-on-data-structures',
    needs: 'A node type in the canonical vocabulary, its literal emitters for all six languages, and a JSON encoding that can express sharing and cycles rather than only a tree-shaped array.',
    alsoRequires: `re-authoring the ${Object.keys(REQUIRES_REAUTHOR_AFTER_NODE_ENCODING).length} problems in REQUIRES_REAUTHOR_AFTER_NODE_ENCODING`,
    milestone: 'prerequisite for serious linked-list / tree / BST expansion, i.e. before 250',
  },
  {
    id: 'MULTI_METHOD_JUDGE',
    unblocks: '8 patterns: all of tries, plus min-stack, queue-from-stacks, two-heaps-median',
    needs: 'A protocol for a stateful object: construct, then apply a sequence of method calls, then compare a sequence of returns. The signature model today is one function, one return.',
    milestone: 'after node encoding; design questions are common in interviews but not foundational',
  },
  {
    id: 'TYPED_EXPECTED_OUTPUT',
    unblocks: 'problems whose correct answer needs exact integers beyond 2^53-1, including canonical modular exponentiation with modulus 10^9+7',
    needs: 'See PRODUCTION_READINESS.md section 18. Note this is not only a storage problem: every authored problem carries a JavaScript reference solution, and JS numbers are doubles, so the derivation path needs addressing too.',
    milestone: 'before authoring any problem whose answer exceeds the exact-integer range',
  },
  {
    id: 'NON_GRADED_CURRICULUM_ITEMS',
    unblocks: '2 CONCEPTUAL patterns, and the explanatory half of every pattern',
    needs: 'A curriculum item type that is not a graded function — a derivation, a proof, a complexity argument — with some form of assessment that is not deepEqual on a return value.',
    milestone: 'not blocking any milestone; the two patterns stay as anchors until then',
  },
]);

// ---------------------------------------------------------------------------
// 4. The proposed 150 milestone
// ---------------------------------------------------------------------------

/**
 * 54 additions across 23 patterns, chosen against the measured state rather than spread
 * evenly. The shape of the allocation follows four rules, in order:
 *
 *   1. FILL THE ROOT FIRST. `basics` is the declared prerequisite of every topic and holds
 *      zero problems; `sorting` is the declared prerequisite of arrays, binary-search, heaps
 *      and greedy and holds zero; `recursion` is the declared prerequisite of DP and both
 *      tree topics and holds zero. Adding advanced material while the roots are empty is what
 *      produced a curriculum with seven Hard deque problems and no sorting.
 *   2. REPAIR INVERTED ORDER. Four patterns are empty while a pattern that depends on them is
 *      populated: basic-bit-ops under xor-properties, sort-then-greedy under
 *      interval-scheduling, lower-upper-bound under a populated classic-binary-search, and
 *      bfs-shortest-path beside a populated dfs-connectivity.
 *   3. BRING 1-PROBLEM PATTERNS TO A PROGRESSION. A pattern with one problem teaches an
 *      instance, not a pattern.
 *   4. OPEN CORE_INTERVIEW PATTERNS IN TOPICS ALREADY STARTED, so a learner reaching a topic
 *      finds a path rather than a single problem.
 *
 * Deliberately NOT touched: all 12 patterns in the three harness-blocked topics, every
 * SPECIALIZED pattern, and the whole of sliding-window-two-pointers except its
 * one-problem gap — that topic already holds 63.5% of the curriculum.
 *
 * `langs` predicts six-language support from the intended signature. `c: false` means C's
 * calling convention cannot model it today — almost always a nested-vector argument or
 * return. `int64` flags a concept whose natural values can leave the exact-integer range.
 */
export const MILESTONE_150 = Object.freeze({
  targetTotal: 150,
  additions: [
    // ===== basics: the empty root, 8 =====
    { topic: 'basics', pattern: 'simulation', concept: 'Increment a big-integer represented as a digit array, propagating carry', difficulty: 'Easy', objective: 'Translate a prose rule into a reverse-order loop with a carry invariant', prereq: null, notRedundant: 'No existing problem manipulates a digit-array representation; prefix-sum problems read the array, they do not restructure it.', langs: { c: true }, int64: false },
    { topic: 'basics', pattern: 'simulation', concept: 'Reverse the digits of a signed 32-bit integer, refusing values that would overflow', difficulty: 'Easy', objective: 'Detect overflow BEFORE it happens rather than after', prereq: null, notRedundant: 'Overflow-safe arithmetic appears nowhere in the current 96.', langs: { c: true }, int64: 'bounded — the answer is int32 by construction, but the check needs 64-bit reasoning; constrain input to int32' },
    // REPLACED in the 3A.1 review. Was "traverse a matrix in spiral order", which is a fine
    // simulation problem but takes a nested vector, so C cannot express it. Putting a
    // C-unsupported problem third in the FIRST pattern of the FIRST topic would wall off a
    // learner working in C before they had finished the introduction. Spiral order is deferred
    // to a later milestone under a matrix-appropriate pattern.
    { topic: 'basics', pattern: 'simulation', concept: 'Convert an integer to its Roman-numeral form', difficulty: 'Medium', objective: 'Simulate repeated greedy subtraction against an ordered value table', prereq: 'basics/simulation (reverse integer)', notRedundant: 'No existing problem builds an output string by consuming an input quantity; it is also the first place a lookup table drives the loop.', langs: { c: true }, int64: false },
    { topic: 'basics', pattern: 'integer-math-modular', concept: 'Greatest common divisor by the Euclidean algorithm', difficulty: 'Easy', objective: 'Reduce a problem by a recurrence on remainders', prereq: null, notRedundant: 'Nothing in the curriculum does number theory.', langs: { c: true }, int64: false },
    // REPLACED in the 3A.1 review. Was "modular exponentiation by squaring", constrained to a
    // modulus of 10^6. Two things were wrong with that, and the second is fatal:
    //
    //   1. With a modulus small enough that residue products stay under 2^53, there is no
    //      overflow left to reason about — and overflow discipline is the entire reason the
    //      canonical version uses 10^9+7. The constraint removed the lesson.
    //   2. The authoring pipeline derives expected outputs from a JavaScript reference
    //      solution. JS numbers are doubles, so a JS reference CANNOT compute
    //      (a * b) % 1000000007 exactly for residues near 10^9 — products reach ~10^18. The
    //      canonical problem is unauthorable today regardless of what the guard allows.
    //
    // Exponentiation by squaring over doubles teaches the identical halving recurrence with no
    // representation compromise at all. Canonical modular exponentiation is deferred to the
    // TYPED_EXPECTED_OUTPUT architecture item.
    { topic: 'basics', pattern: 'integer-math-modular', concept: 'Raise a value to an integer power by squaring, handling a negative exponent', difficulty: 'Medium', objective: 'Halve the exponent each step instead of multiplying n times', prereq: 'basics/integer-math-modular (gcd)', notRedundant: 'The only divide-and-halve recurrence outside binary search, and one of very few problems using the `double` type — currently exercised by exactly one seeded problem.', langs: { c: true }, int64: false },
    { topic: 'basics', pattern: 'integer-math-modular', concept: 'Count trailing zeroes in a factorial without computing it', difficulty: 'Easy', objective: 'Reason about prime factors instead of evaluating', prereq: null, notRedundant: 'Teaches avoiding the big value entirely — directly relevant to the 64-bit ceiling.', langs: { c: true }, int64: false },
    { topic: 'basics', pattern: 'prefix-arithmetic-basics', concept: 'Running maximum of a sequence', difficulty: 'Easy', objective: 'See a prefix as any associative fold, not only a sum', prereq: null, notRedundant: 'arrays/prefix-sum is entirely sum-based; this generalises the operator.', langs: { c: true }, int64: false },
    { topic: 'basics', pattern: 'prefix-arithmetic-basics', concept: 'Answer one range-sum query from a precomputed prefix table', difficulty: 'Easy', objective: 'Separate the precompute step from the query step', prereq: 'basics/prefix-arithmetic-basics (running max)', notRedundant: 'The existing running-sum problem RETURNS the prefix array; this one uses it to answer a query, which is the actual point of the technique.', langs: { c: true }, int64: false },
    // THE 55th SLOT, added when deleting the duplicate moved the baseline from 96 to 95.
    //
    // Chosen against the stated preference order rather than invented to hit a number:
    //   1. deepens an already-selected FOUNDATION pattern — yes, prefix-arithmetic-basics
    //   2. improves a weak progression — yes, the pattern was Easy + Easy with no application step
    //   3. fills a missing recognition/application step — yes, this is the application
    //   4. opens no new pattern, so it cannot create another isolated single-problem pattern
    //
    // It also repairs the most consequential of the five INVERTED_TEACHING_ORDER findings:
    // arrays/prefix-sum holds five problems built on prefix arithmetic while the pattern that
    // teaches it holds none, and this is the slot that makes that pattern a real progression
    // instead of two warm-ups.
    //
    // Alternatives, and why they were weaker. strings/palindrome-expansion has two Mediums and no
    // recognition step, but every Easy centre-expansion candidate duplicates something already
    // authored — valid-palindrome and valid-palindrome-ii exist under opposite-direction-two-pointers,
    // and "longest palindrome from a multiset of characters" is frequency counting that belongs in
    // frequency-counter. A third Medium would not fix the missing entry step.
    // binary-search/binary-search-on-answer already gets its recognition ramp from
    // lower-upper-bound's three slots. bit-manipulation/basic-bit-ops and
    // sorting/comparison-sorts-elementary are the same shape as this one but less foundational:
    // basics is the root of the entire dependency graph.
    { topic: 'basics', pattern: 'prefix-arithmetic-basics', concept: 'Count the split positions where the left part\'s sum is at least the right part\'s', difficulty: 'Medium', objective: 'Use a running prefix against a fixed total, so each split is answered in constant time', prereq: 'basics/prefix-arithmetic-basics (range-sum query)', notRedundant: 'find-pivot-index asks for one index where the two sides are EQUAL and returns it; this counts every position satisfying an INEQUALITY, which is the running-prefix-versus-total form rather than a search.', langs: { c: true }, int64: false },

    // ===== sorting: the empty prerequisite of four topics, 6 =====
    { topic: 'sorting', pattern: 'comparison-sorts-elementary', concept: 'Sort an array with an explicit insertion sort', difficulty: 'Easy', objective: 'Write a sort rather than call one, and see the O(N^2) cost', prereq: null, notRedundant: 'Every existing problem calls a library sort or avoids sorting.', langs: { c: true }, int64: false },
    { topic: 'sorting', pattern: 'comparison-sorts-elementary', concept: 'Count the swaps a bubble sort performs, with early termination', difficulty: 'Easy', objective: 'Connect an operation count to the asymptotic bound', prereq: 'sorting/comparison-sorts-elementary (insertion sort)', notRedundant: 'Makes cost measurable, which is the assessable half of complexity-analysis.', langs: { c: true }, int64: false },
    { topic: 'sorting', pattern: 'merge-sort-divide-conquer', concept: 'Sort an array with merge sort', difficulty: 'Medium', objective: 'Split, recurse, merge — and see why the merge is the whole algorithm', prereq: 'sorting/comparison-sorts-elementary', notRedundant: 'First divide-and-conquer recurrence in the curriculum.', langs: { c: true }, int64: false },
    // CORRECTED during 3A.2A authoring. The 3A.1 blueprint claimed this would be the first
    // problem to exercise `long long` on a provider. That is not achievable here, and the
    // blocker is not the 64-bit guard:
    //
    //   an inversion count exceeds int32 only when n(n-1)/2 > 2.1x10^9, i.e. n > ~65,536;
    //   the literal-based harness caps one argument at MAX_LITERAL_BYTES = 24,000 bytes, which
    //   is about 4,000 integers, whose maximum inversion count is ~8x10^6.
    //
    // So the array needed to reach `long long` is a hundred times larger than the harness can
    // embed. The signature inferrer is magnitude-based, so this problem correctly infers `int`.
    // `long long` therefore remains unexercised on a provider; reaching it needs a problem with a
    // SMALL input and a large answer, which is recorded as a 3A.2B recommendation rather than
    // invented here.
    { topic: 'sorting', pattern: 'merge-sort-divide-conquer', concept: 'Count inversions in an array using the merge step', difficulty: 'Medium', objective: 'Extract a quantity from a sort rather than the sorted order', prereq: 'sorting/merge-sort-divide-conquer (merge sort)', notRedundant: 'The first problem where the sort is a means rather than the goal — the merge step counts pairs it would otherwise just move.', langs: { c: true }, int64: false },
    { topic: 'sorting', pattern: 'custom-comparator-and-stability', concept: 'Sort values by descending frequency, breaking ties by value', difficulty: 'Medium', objective: 'Sort by a derived key and make the tie-break explicit', prereq: 'sorting/comparison-sorts-elementary', notRedundant: 'strings/sort-characters-by-frequency does this for characters only; this is the general integer form and states the tie-break, which that one leaves implicit.', langs: { c: true }, int64: false },
    { topic: 'sorting', pattern: 'custom-comparator-and-stability', concept: 'Arrange integers to form the largest possible concatenated number', difficulty: 'Medium', objective: 'Recognise a comparator that is not a numeric comparison', prereq: 'sorting/custom-comparator-and-stability (frequency sort)', notRedundant: 'The comparator is on string concatenation, which is where "just sort descending" fails; nothing else teaches that.', langs: { c: true }, int64: 'returns a STRING deliberately — the numeric value would exceed the ceiling, and the string form sidesteps it legitimately rather than by constraint' },

    // ===== recursion: the empty prerequisite of DP, 5 =====
    { topic: 'recursion', pattern: 'subset-include-exclude', concept: 'Enumerate all subsets of a distinct-element array', difficulty: 'Medium', objective: 'See the binary include/exclude decision tree', prereq: null, notRedundant: 'No enumeration problem exists in the curriculum at all.', langs: { c: false }, int64: false },
    { topic: 'recursion', pattern: 'subset-include-exclude', concept: 'Enumerate subsets of an array containing duplicates, without repeats', difficulty: 'Medium', objective: 'Prune a branch by sorting first and skipping equal siblings', prereq: 'recursion/subset-include-exclude (subsets)', notRedundant: 'Deduplication during recursion is a distinct skill from the plain enumeration.', langs: { c: false }, int64: false },
    { topic: 'recursion', pattern: 'subset-include-exclude', concept: 'Count subsets summing to a target, without enumerating them', difficulty: 'Medium', objective: 'Separate counting from enumeration — the step that makes DP possible', prereq: 'recursion/subset-include-exclude (subsets)', notRedundant: 'Chosen so the pattern is not entirely C-unsupported, and it is the direct bridge to 0-1 knapsack.', langs: { c: true }, int64: false },
    { topic: 'recursion', pattern: 'backtracking-with-restore', concept: 'All combinations of candidates summing to a target, reuse allowed', difficulty: 'Medium', objective: 'Mutate shared state and undo it on the way out', prereq: 'recursion/subset-include-exclude', notRedundant: 'First problem requiring an explicit undo step.', langs: { c: false }, int64: false },
    { topic: 'recursion', pattern: 'backtracking-with-restore', concept: 'All letter strings a digit sequence could spell on a phone keypad', difficulty: 'Medium', objective: 'Backtrack over a mapping rather than over the input array', prereq: 'recursion/backtracking-with-restore (combination sum)', notRedundant: 'Returns strings, so it keeps the pattern reachable in C and varies the branching source.', langs: { c: true }, int64: false },

    // ===== arrays: 5 =====
    { topic: 'arrays', pattern: 'intervals', concept: 'Merge a list of overlapping intervals', difficulty: 'Medium', objective: 'Sort by start, then extend or emit', prereq: 'sorting/custom-comparator-and-stability', notRedundant: 'greedy/interval-scheduling COUNTS or selects intervals; none of its four problems produces a merged set.', langs: { c: false }, int64: false },
    { topic: 'arrays', pattern: 'intervals', concept: 'Insert one interval into a sorted disjoint set', difficulty: 'Medium', objective: 'Handle before/overlap/after as three explicit phases', prereq: 'arrays/intervals (merge)', notRedundant: 'A single insertion has a different structure from a full merge.', langs: { c: false }, int64: false },
    { topic: 'arrays', pattern: 'intervals', concept: 'Minimum number of rooms needed for overlapping meetings', difficulty: 'Medium', objective: 'Convert intervals into a sweep over start/end events', prereq: 'arrays/intervals (merge)', notRedundant: 'The existing meeting-rooms asks whether ANY overlap exists (a boolean); this asks for maximum concurrency, which needs a sweep.', langs: { c: false }, int64: false },
    { topic: 'arrays', pattern: 'kadane-maximum-subarray', concept: 'Maximum product of a contiguous subarray', difficulty: 'Medium', objective: 'Carry two running extremes because a negative flips them', prereq: 'arrays/kadane-maximum-subarray (maximum subarray)', notRedundant: 'The existing maximum-subarray is additive and never needs the min tracked.', langs: { c: true }, int64: 'CONSTRAIN — cap n and |value| so the product stays inside the exact-integer range' },
    { topic: 'arrays', pattern: 'kadane-maximum-subarray', concept: 'Maximum subarray sum in a circular array', difficulty: 'Medium', objective: 'Decompose into the non-wrapping case and its complement', prereq: 'arrays/kadane-maximum-subarray (maximum subarray)', notRedundant: 'Introduces the total-minus-minimum complement trick.', langs: { c: true }, int64: false },

    // ===== binary search: 5 =====
    { topic: 'binary-search', pattern: 'lower-upper-bound', concept: 'Leftmost insertion position for a target among duplicates', difficulty: 'Easy', objective: 'Make the loop return a boundary, not a hit', prereq: 'binary-search/classic-binary-search', notRedundant: 'The existing search-insert-position assumes distinct values, so it never exercises the duplicate boundary that makes lower-bound different from a plain search.', langs: { c: true }, int64: false },
    { topic: 'binary-search', pattern: 'lower-upper-bound', concept: 'First and last index of a target in a sorted array', difficulty: 'Medium', objective: 'Compose lower and upper bound into a range', prereq: 'binary-search/lower-upper-bound (leftmost insert)', notRedundant: 'Requires both boundaries, which no existing problem does.', langs: { c: true }, int64: false },
    { topic: 'binary-search', pattern: 'lower-upper-bound', concept: 'For each query, count sorted values strictly below it', difficulty: 'Medium', objective: 'Reuse one sorted structure across many queries', prereq: 'binary-search/lower-upper-bound (first and last)', notRedundant: 'Introduces amortising a precomputation over a query set.', langs: { c: true }, int64: false },
    { topic: 'binary-search', pattern: 'binary-search-on-answer', concept: 'Smallest ship capacity that clears all packages within a day budget', difficulty: 'Medium', objective: 'Binary search a monotone predicate rather than an array', prereq: 'binary-search/lower-upper-bound', notRedundant: 'The single biggest conceptual jump in the topic and no existing problem searches anything but an index.', langs: { c: true }, int64: false },
    { topic: 'binary-search', pattern: 'binary-search-on-answer', concept: 'Minimum hourly rate to finish all piles within an hour budget', difficulty: 'Medium', objective: 'Recognise the same predicate shape in different prose', prereq: 'binary-search/binary-search-on-answer (ship capacity)', notRedundant: 'Deliberately the same technique with different framing — recognising that is the learning objective.', langs: { c: true }, int64: false },

    // ===== sliding window: repair the 1-problem gap, 3 =====
    { topic: 'sliding-window-two-pointers', pattern: 'variable-size-sliding-window', concept: 'Shortest subarray whose sum reaches a target', difficulty: 'Medium', objective: 'Grow to satisfy, shrink to minimise', prereq: 'sliding-window-two-pointers/fixed-size-sliding-window', notRedundant: 'The pattern holds exactly one problem (longest substring without repeats) and that one MAXIMISES; this minimises, which is the other half of the invariant.', langs: { c: true }, int64: false },
    { topic: 'sliding-window-two-pointers', pattern: 'variable-size-sliding-window', concept: 'Longest substring obtainable by replacing at most k characters', difficulty: 'Medium', objective: 'Keep a window valid against a derived quantity, not a raw count', prereq: 'sliding-window-two-pointers/variable-size-sliding-window (shortest subarray)', notRedundant: 'Window validity depends on window length minus max frequency — distinct from the at-most-k-distinct problems in at-most-k-window.', langs: { c: true }, int64: false },
    { topic: 'sliding-window-two-pointers', pattern: 'variable-size-sliding-window', concept: 'Smallest window of a string containing all characters of a pattern', difficulty: 'Hard', objective: 'Combine a frequency map with a shrinking window', prereq: 'sliding-window-two-pointers/variable-size-sliding-window (longest replacement)', notRedundant: 'The canonical hard case of the pattern, and the pattern currently has no Hard problem at all.', langs: { c: true }, int64: false },

    // ===== strings: 2 =====
    { topic: 'strings', pattern: 'palindrome-expansion', concept: 'Count palindromic substrings by expanding around each centre', difficulty: 'Medium', objective: 'Handle odd and even centres as one loop', prereq: 'strings/frequency-counter', notRedundant: 'The existing valid-palindrome problems VERIFY a palindrome; none constructs or counts them.', langs: { c: true }, int64: false },
    { topic: 'strings', pattern: 'palindrome-expansion', concept: 'Longest palindromic substring', difficulty: 'Medium', objective: 'Track the best centre rather than a running count', prereq: 'strings/palindrome-expansion (count substrings)', notRedundant: 'Returns the substring, so it exercises string construction rather than counting.', langs: { c: true }, int64: false },

    // ===== bit manipulation: repair inverted order, 2 =====
    { topic: 'bit-manipulation', pattern: 'basic-bit-ops', concept: 'Number of set bits for every integer from 0 to n', difficulty: 'Easy', objective: 'Test and shift individual bits, and notice the recurrence', prereq: null, notRedundant: 'xor-properties has four problems but the topic never teaches masking or shifting; this is the missing groundwork.', langs: { c: true }, int64: false },
    { topic: 'bit-manipulation', pattern: 'basic-bit-ops', concept: 'Reverse the bits of a 32-bit unsigned value', difficulty: 'Easy', objective: 'Build a result bit by bit while consuming the input', prereq: 'bit-manipulation/basic-bit-ops (count set bits)', notRedundant: 'Forces explicit bit placement rather than counting.', langs: { c: true }, int64: 'return must be long long — an unsigned 32-bit result exceeds int32 range while staying JSON-safe' },

    // ===== stack & queue: bring a 1-problem pattern to a progression, 2 =====
    { topic: 'stack-queue', pattern: 'parenthesis-matching', concept: 'Minimum insertions to make a bracket string balanced', difficulty: 'Medium', objective: 'Track a deficit counter instead of a full stack', prereq: 'stack-queue/parenthesis-matching (valid parentheses)', notRedundant: 'The pattern has one problem, a boolean check; this asks for a quantity and shows the stack can collapse to a counter.', langs: { c: true }, int64: false },
    { topic: 'stack-queue', pattern: 'parenthesis-matching', concept: 'Length of the longest valid parenthesis substring', difficulty: 'Hard', objective: 'Use stacked indices rather than stacked symbols', prereq: 'stack-queue/parenthesis-matching (minimum insertions)', notRedundant: 'Gives the pattern a Hard tier and introduces storing positions on the stack.', langs: { c: true }, int64: false },

    // ===== greedy: repair inverted order, 2 =====
    { topic: 'greedy', pattern: 'sort-then-greedy', concept: 'Maximise satisfied children by matching sorted sizes to sorted demands', difficulty: 'Easy', objective: 'Sort both sides, then advance greedily', prereq: 'sorting/comparison-sorts-elementary', notRedundant: 'interval-scheduling holds four problems but the topic never establishes the plain sort-then-scan move they specialise.', langs: { c: true }, int64: false },
    { topic: 'greedy', pattern: 'sort-then-greedy', concept: 'Minimum increments to make all values distinct', difficulty: 'Medium', objective: 'Prove the local choice is safe after sorting', prereq: 'greedy/sort-then-greedy (matching)', notRedundant: 'Introduces "why is greedy correct here" without needing a formal exchange argument.', langs: { c: true }, int64: false },

    // ===== graphs: repair inverted order, 5 =====
    { topic: 'graphs', pattern: 'bfs-shortest-path', concept: 'Shortest clear path through a binary grid, eight-directional', difficulty: 'Medium', objective: 'BFS yields shortest paths on an unweighted graph; DFS does not', prereq: 'graphs/dfs-connectivity', notRedundant: 'All four existing graph problems are DFS/connectivity; none involves distance.', langs: { c: false }, int64: false },
    { topic: 'graphs', pattern: 'bfs-shortest-path', concept: 'Minutes for a spreading state to fill a grid, or report impossible', difficulty: 'Medium', objective: 'Seed a BFS from many sources at once and count levels', prereq: 'graphs/bfs-shortest-path (grid shortest path)', notRedundant: 'Multi-source BFS and level counting are distinct from single-source distance.', langs: { c: false }, int64: false },
    { topic: 'graphs', pattern: 'bfs-shortest-path', concept: 'Fewest one-letter transformations between two words via a dictionary', difficulty: 'Hard', objective: 'Recognise an implicit graph where states are not given as edges', prereq: 'graphs/bfs-shortest-path (multi-source)', notRedundant: 'The graph must be inferred rather than supplied, and the string signature keeps the pattern reachable in C.', langs: { c: true }, int64: false },
    { topic: 'graphs', pattern: 'topological-sort', concept: 'Whether a set of prerequisite pairs can all be satisfied', difficulty: 'Medium', objective: 'Detect a cycle in a directed graph via in-degrees', prereq: 'graphs/dfs-connectivity', notRedundant: 'The existing graph problems are all undirected; direction changes what connectivity means.', langs: { c: false }, int64: false },
    // REPLACED in the 3A.1 review. Was "produce a valid completion order", which the grader
    // cannot mark: a topological order is not unique and the comparison layer is an exact
    // deepEqual. The repo's convention for non-unique answers is to pin a canonical ordering in
    // the statement (3sum does exactly that), but here that does not work — demanding the
    // lexicographically smallest order changes the algorithm from plain Kahn's to Kahn's with a
    // min-heap, so it would teach a different technique to satisfy the grader. Counting levels
    // is uniquely determined and keeps the technique intact.
    { topic: 'graphs', pattern: 'topological-sort', concept: 'Fewest rounds needed to finish all courses when independent ones run in parallel', difficulty: 'Medium', objective: 'Peel the dependency graph layer by layer with Kahn\'s algorithm', prereq: 'graphs/topological-sort (feasibility)', notRedundant: 'Turns cycle detection into a quantity, and the answer is unique so it needs no artificial ordering rule.', langs: { c: false }, int64: false },

    // ===== dynamic programming: 5 =====
    { topic: 'dynamic-programming', pattern: '2d-grid', concept: 'Number of monotone lattice paths across a grid', difficulty: 'Easy', objective: 'See a 2-D table and its base row and column', prereq: 'dynamic-programming/1d-state', notRedundant: 'Every existing DP problem is one-dimensional; this is the first table.', langs: { c: true }, int64: 'CONSTRAIN — the count is a binomial coefficient, so cap grid dimensions so it stays inside the exact-integer range' },
    { topic: 'dynamic-programming', pattern: '2d-grid', concept: 'Minimum-cost path from corner to corner of a cost grid', difficulty: 'Medium', objective: 'Choose between predecessors instead of summing them', prereq: 'dynamic-programming/2d-grid (lattice paths)', notRedundant: 'Optimisation rather than counting over the same table shape.', langs: { c: false }, int64: false },
    { topic: 'dynamic-programming', pattern: '2d-grid', concept: 'Monotone lattice paths with blocked cells', difficulty: 'Medium', objective: 'Encode an obstacle as a zeroed state', prereq: 'dynamic-programming/2d-grid (lattice paths)', notRedundant: 'Teaches that a constraint becomes a base-case change, not new logic.', langs: { c: false }, int64: false },
    { topic: 'dynamic-programming', pattern: '0-1-knapsack', concept: 'Whether an array splits into two equal-sum halves', difficulty: 'Medium', objective: 'Recognise subset-sum behind a partition question', prereq: 'recursion/subset-include-exclude (count subsets)', notRedundant: 'The direct DP counterpart of the recursive subset-count problem, which is how the bridge from recursion to DP is taught.', langs: { c: true }, int64: false },
    { topic: 'dynamic-programming', pattern: '0-1-knapsack', concept: 'Smallest achievable difference between two subset sums', difficulty: 'Medium', objective: 'Search reachable sums rather than test one target', prereq: 'dynamic-programming/0-1-knapsack (equal partition)', notRedundant: 'Generalises a yes/no subset-sum into an optimisation over reachable states.', langs: { c: true }, int64: false },

    // ===== heaps: open an empty CORE topic, 4 =====
    { topic: 'heaps', pattern: 'heap-as-priority-queue', concept: 'Repeatedly combine the two largest values until one or none remains', difficulty: 'Easy', objective: 'Use a heap for repeated extract-max', prereq: null, notRedundant: 'The topic is empty; nothing in the curriculum uses a priority queue.', langs: { c: true }, int64: false },
    { topic: 'heaps', pattern: 'heap-as-priority-queue', concept: 'Minimum total cost to combine all lengths pairwise', difficulty: 'Medium', objective: 'Extract-min twice, push once, and see why greedy is optimal here', prereq: 'heaps/heap-as-priority-queue (combine largest)', notRedundant: 'Extract-min plus reinsertion is a different loop from extract-max, and it sets up Huffman-style merging.', langs: { c: true }, int64: 'CONSTRAIN — accumulated merge cost grows quickly; cap n and values so the total stays inside the exact-integer range' },
    { topic: 'heaps', pattern: 'top-k-with-heap', concept: 'kth largest element of an unsorted array', difficulty: 'Medium', objective: 'Keep a bounded heap of size k instead of sorting everything', prereq: 'heaps/heap-as-priority-queue', notRedundant: 'Introduces the size-k bound, which is the whole idea of the pattern.', langs: { c: true }, int64: false },
    { topic: 'heaps', pattern: 'top-k-with-heap', concept: 'The k most frequent values in an array', difficulty: 'Medium', objective: 'Compose a frequency map with a bounded heap', prereq: 'heaps/top-k-with-heap (kth largest)', notRedundant: 'Combines strings/frequency-counter with the heap bound; neither topic teaches the combination.', langs: { c: true }, int64: false },
  ],

  /** Patterns deliberately left empty at 150, with the reason. */
  deferred: Object.freeze([
    { scope: 'topics: linked-list (6 patterns), binary-trees (7), bst (5)', reason: 'BLOCKED — harness has no node encoding. 18 patterns, and no amount of authoring effort moves them.' },
    { scope: 'topic: tries (5 patterns)', reason: 'BLOCKED — a trie is a stateful object with several methods; the signature model is one function.' },
    { scope: 'basics/complexity-analysis, greedy/exchange-argument', reason: 'Not naturally a graded function. Assessed by explanation, not a return value.' },
    { scope: 'all SPECIALIZED patterns (z-algorithm, manacher, sieve, bellman-ford, mst, bitmask-and-tree-dp, binary-trie-xor, trie-with-counts)', reason: 'Correctly later-milestone material. Including them at 150 would be the fake coverage this milestone is meant to avoid.' },
    { scope: 'sliding-window-two-pointers: 5 of 7 patterns', reason: 'Already holds 61 of 96 problems. Adding more would deepen the imbalance; only the one-problem gap is repaired.' },
    { scope: 'stack-queue/stack-with-aggregate, stack-queue/queue-from-stacks, heaps/two-heaps-median', reason: 'Design-shaped. CORE_INTERVIEW importance, but blocked on the signature model rather than on priority.' },
    { scope: 'ADVANCED patterns whose prerequisites land at 150 (dijkstra, union-find, lis-and-lcs, unbounded-knapsack, edit-distance, kmp, rolling-hash, monotonic-deque, bitmask patterns)', reason: 'Their prerequisites are being built at this milestone. They become the natural core of the 250 milestone.' },
  ]),
});

// ---------------------------------------------------------------------------
// 4b. Pipeline defects that data alone cannot reveal
// ---------------------------------------------------------------------------

/**
 * Findings about the authoring/seeding pipeline rather than about the content.
 *
 * The audit is deliberately database-free, so it cannot detect these by inspection; they are
 * recorded here so they appear in the report and do not survive only in a commit message.
 */
export const KNOWN_PIPELINE_DEFECTS = Object.freeze([
  {
    id: 'SEEDER_HAS_NO_DELETE_PASS',
    severity: 'medium',
    found: 'Phase 3A.2A, while deleting continuous-subarrays-deque',
    detail: 'seed-learning.js is upsert-only (INSERT ... ON CONFLICT (slug) DO UPDATE) and has no '
      + 'delete pass. Removing a problem from a seed file therefore leaves the row in the database, '
      + 'and problems-index keeps serving it. The divergence is silent: no gate compares the '
      + 'database against the seed files.',
    consequence: 'Any content deletion has to be done twice, and forgetting the second half ships a '
      + 'problem that exists for users but has no source of truth.',
    fix: 'Either a reconciling delete pass in the seeder, or a drift check that fails when the '
      + 'database holds a problem slug no seed file declares. Not built in 3A.2A: it is '
      + 'infrastructure and that phase is content.',
  },
  {
    id: 'WIDE_TYPES_UNREACHABLE_VIA_LARGE_INPUTS',
    severity: 'low',
    found: 'Phase 3A.2A, while authoring sorting/merge-sort-divide-conquer',
    detail: 'The literal-based harness embeds each argument as source, capped at MAX_LITERAL_BYTES = '
      + '24,000 bytes, which is roughly 4,000 integers. Any problem that reaches `long long` only '
      + 'because the INPUT is large is therefore unauthorable: inversion counting needs n > 65,536 '
      + 'to exceed int32, and that array renders to about 400KB of Java or C source.',
    consequence: '`long long`, `vector<long long>`, `vector<double>` and `vector<bool>` are still '
      + 'implemented, unit-tested, and never executed on a provider. The 3A.1 blueprint expected '
      + 'inversion counting to close that gap and it cannot.',
    fix: 'Reach the wide types with a SMALL input and a large answer instead — a product over a '
      + 'handful of values, or a bit-shift result — rather than a large input and a counted answer. '
      + 'Recommended for 3A.2B; not invented during 3A.2A because it is not a blueprint slot.',
  },
  {
    id: 'V2_FILES_WITHOUT_AUTHORING_SPECS',
    severity: 'low',
    found: 'Phase 3A.2A, while planning which patterns to author',
    detail: 'Three v2 problem files have no authoring spec: arrays/kadane-maximum-subarray, '
      + 'stack-queue/parenthesis-matching, sliding-window-two-pointers/variable-size-sliding-window. '
      + 'build-authored-problems.js rewrites `<pattern>.json` wholesale from the spec, so creating a '
      + 'spec for one of those patterns would ERASE the existing problem unless it is re-authored '
      + 'into the spec at the same time.',
    consequence: 'A trap for exactly the patterns the 150 milestone tops up. Hit deliberately rather '
      + 'than accidentally: the kadane spec re-authors maximum-subarray so it is not lost.',
    fix: 'Bring all v2 files under the pipeline, which is the same work as defect D7.',
  },
]);

// ---------------------------------------------------------------------------
// 5. Per-slot detail for the blueprint
// ---------------------------------------------------------------------------

/**
 * Parallel to `MILESTONE_150.additions`, one entry per slot in the same order.
 *
 * The `concept` field is echoed so the audit can assert the arrays are still aligned; a
 * reorder or an inserted slot then fails loudly instead of silently attaching the wrong
 * signature to the wrong problem.
 *
 * `signature` uses the canonical type vocabulary from the registry, so the predicted language
 * capability follows from it mechanically rather than being asserted by hand.
 *
 * `ordering` is present only where the answer is NOT unique. This matters more than it looks:
 * the grader compares with an exact deepEqual, so a problem with several correct answers is
 * ungradable unless the statement pins one. The repo already established the convention —
 * `3sum` says "each triplet sorted ascending and the array of triplets sorted
 * lexicographically". Every enumeration slot below inherits that discipline.
 *
 * `constraint` is present only for slots that touch the exact-integer boundary, and states the
 * five things a constraint has to justify: the canonical range, the Robinhood range, whether
 * the algorithm survives, whether overflow reasoning survives, and whether it is legitimate.
 */
export const SLOT_DETAIL = Object.freeze([
  { concept: 'Increment a big-integer represented as a digit array, propagating carry', signature: 'vector<int> digits -> vector<int>' },
  {
    concept: 'Reverse the digits of a signed 32-bit integer, refusing values that would overflow',
    signature: 'int n -> int',
    constraint: {
      canonical: 'input and output both confined to signed 32-bit, returning 0 when the reversal would not fit',
      robinhood: 'identical — no change',
      algorithmIdentical: true,
      overflowReasoningRetained: true,
      legitimate: 'Yes, and nothing is constrained. Worth recording only because the lesson is asymmetric across languages: in C/C++/Java/C# the check is genuinely necessary, while in JavaScript and Python the intermediate never overflows, so those two solve it by comparing against the 32-bit bound rather than by avoiding an overflow.',
    },
  },
  { concept: 'Convert an integer to its Roman-numeral form', signature: 'int n -> string' },
  { concept: 'Greatest common divisor by the Euclidean algorithm', signature: 'int a, int b -> int' },
  { concept: 'Raise a value to an integer power by squaring, handling a negative exponent', signature: 'double x, int n -> double' },
  { concept: 'Count trailing zeroes in a factorial without computing it', signature: 'int n -> int' },
  { concept: 'Running maximum of a sequence', signature: 'vector<int> nums -> vector<int>' },
  { concept: 'Answer one range-sum query from a precomputed prefix table', signature: 'vector<int> nums, int left, int right -> int' },
  { concept: 'Count the split positions where the left part\'s sum is at least the right part\'s', signature: 'vector<int> nums -> int' },
  { concept: 'Sort an array with an explicit insertion sort', signature: 'vector<int> nums -> vector<int>' },
  { concept: 'Count the swaps a bubble sort performs, with early termination', signature: 'vector<int> nums -> int' },
  { concept: 'Sort an array with merge sort', signature: 'vector<int> nums -> vector<int>' },
  { concept: 'Count inversions in an array using the merge step', signature: 'vector<int> nums -> int' },
  { concept: 'Sort values by descending frequency, breaking ties by value', signature: 'vector<int> nums -> vector<int>', ordering: 'Fully determined: descending frequency, then ascending value. The tie-break is the lesson, so it is stated rather than left free.' },
  {
    concept: 'Arrange integers to form the largest possible concatenated number',
    signature: 'vector<int> nums -> string',
    constraint: {
      canonical: 'the concatenation of up to 100 numbers, which as an integer would be hundreds of digits',
      robinhood: 'unchanged — the answer is returned as a STRING, so no numeric range applies',
      algorithmIdentical: true,
      overflowReasoningRetained: true,
      legitimate: 'Yes, and by representation rather than by constraint. The canonical problem returns a string too, precisely because the value does not fit any integer type. This is the shape to prefer whenever it is available: change what is returned, not what is asked.',
    },
  },
  { concept: 'Enumerate all subsets of a distinct-element array', signature: 'vector<int> nums -> vector<vector<int>>', ordering: 'REQUIRED — subsets have no natural order. Each subset ascending, the outer list sorted by length then lexicographically. Follows the 3sum precedent.' },
  { concept: 'Enumerate subsets of an array containing duplicates, without repeats', signature: 'vector<int> nums -> vector<vector<int>>', ordering: 'REQUIRED — same convention as the distinct case, so the two problems are directly comparable.' },
  { concept: 'Count subsets summing to a target, without enumerating them', signature: 'vector<int> nums, int target -> int' },
  { concept: 'All combinations of candidates summing to a target, reuse allowed', signature: 'vector<int> candidates, int target -> vector<vector<int>>', ordering: 'REQUIRED — each combination non-decreasing, outer list sorted lexicographically.' },
  { concept: 'All letter strings a digit sequence could spell on a phone keypad', signature: 'string digits -> vector<string>', ordering: 'REQUIRED — lexicographic, which is also what a straightforward recursion produces if the keypad is walked in order.' },
  { concept: 'Merge a list of overlapping intervals', signature: 'vector<vector<int>> intervals -> vector<vector<int>>', ordering: 'Determined by the algorithm: ascending by start. Stated anyway so it is not accidental.' },
  { concept: 'Insert one interval into a sorted disjoint set', signature: 'vector<vector<int>> intervals, vector<int> newInterval -> vector<vector<int>>', ordering: 'Determined: ascending by start.' },
  { concept: 'Minimum number of rooms needed for overlapping meetings', signature: 'vector<vector<int>> intervals -> int' },
  {
    concept: 'Maximum product of a contiguous subarray',
    signature: 'vector<int> nums -> int',
    constraint: {
      canonical: 'LeetCode guarantees the answer fits a 32-bit integer — this is the CANONICAL constraint, not a Robinhood invention',
      robinhood: 'the same: bound n and |value| so the product stays within int32',
      algorithmIdentical: true,
      overflowReasoningRetained: false,
      legitimate: 'Yes. The lesson is carrying two running extremes because a negative value swaps them; overflow is not part of it, and the canonical problem already excludes overflow by construction.',
    },
  },
  { concept: 'Maximum subarray sum in a circular array', signature: 'vector<int> nums -> int' },
  { concept: 'Leftmost insertion position for a target among duplicates', signature: 'vector<int> nums, int target -> int' },
  { concept: 'First and last index of a target in a sorted array', signature: 'vector<int> nums, int target -> vector<int>' },
  { concept: 'For each query, count sorted values strictly below it', signature: 'vector<int> nums, vector<int> queries -> vector<int>', ordering: 'Determined: one answer per query, in query order.' },
  { concept: 'Smallest ship capacity that clears all packages within a day budget', signature: 'vector<int> weights, int days -> int' },
  { concept: 'Minimum hourly rate to finish all piles within an hour budget', signature: 'vector<int> piles, int hours -> int' },
  { concept: 'Shortest subarray whose sum reaches a target', signature: 'vector<int> nums, int target -> int' },
  { concept: 'Longest substring obtainable by replacing at most k characters', signature: 'string s, int k -> int' },
  { concept: 'Smallest window of a string containing all characters of a pattern', signature: 'string s, string t -> string', ordering: 'The window is unique in length but not necessarily in position; the statement must require the LEFTMOST shortest window.' },
  { concept: 'Count palindromic substrings by expanding around each centre', signature: 'string s -> int' },
  { concept: 'Longest palindromic substring', signature: 'string s -> string', ordering: 'Ties are possible, so the statement must require the leftmost longest substring.' },
  { concept: 'Number of set bits for every integer from 0 to n', signature: 'int n -> vector<int>' },
  {
    concept: 'Reverse the bits of a 32-bit unsigned value',
    signature: 'int n -> long long',
    constraint: {
      canonical: 'input and output are unsigned 32-bit, so the result reaches 4294967295',
      robinhood: 'unchanged, but the RETURN type is `long long` because the canonical vocabulary has no unsigned type and 4294967295 exceeds int32',
      algorithmIdentical: true,
      overflowReasoningRetained: true,
      legitimate: 'Yes. The value is well inside the exact-integer range; only the declared type changes, and it changes to remain truthful about the range rather than to dodge a limit.',
    },
  },
  { concept: 'Minimum insertions to make a bracket string balanced', signature: 'string s -> int' },
  { concept: 'Length of the longest valid parenthesis substring', signature: 'string s -> int' },
  { concept: 'Maximise satisfied children by matching sorted sizes to sorted demands', signature: 'vector<int> demands, vector<int> sizes -> int' },
  { concept: 'Minimum increments to make all values distinct', signature: 'vector<int> nums -> int' },
  { concept: 'Shortest clear path through a binary grid, eight-directional', signature: 'vector<vector<int>> grid -> int' },
  { concept: 'Minutes for a spreading state to fill a grid, or report impossible', signature: 'vector<vector<int>> grid -> int' },
  { concept: 'Fewest one-letter transformations between two words via a dictionary', signature: 'string beginWord, string endWord, vector<string> wordList -> int' },
  { concept: 'Whether a set of prerequisite pairs can all be satisfied', signature: 'int numCourses, vector<vector<int>> prerequisites -> bool' },
  { concept: 'Fewest rounds needed to finish all courses when independent ones run in parallel', signature: 'int numCourses, vector<vector<int>> relations -> int' },
  {
    concept: 'Number of monotone lattice paths across a grid',
    signature: 'int m, int n -> int',
    constraint: {
      canonical: 'LeetCode allows m, n up to 100 while asserting the answer fits about 2x10^9 — those two claims are not consistent, since C(198,99) is astronomically larger',
      robinhood: 'm, n <= 20, giving a maximum of C(38,19) ~ 1.7x10^10, comfortably inside the exact-integer range',
      algorithmIdentical: true,
      overflowReasoningRetained: false,
      legitimate: 'Yes. The lesson is recognising a 2-D table with a base row and column; the magnitude of the count is incidental, and the canonical statement is self-contradictory about it anyway. Tightening the bound makes the problem MORE coherent than the original.',
    },
  },
  { concept: 'Minimum-cost path from corner to corner of a cost grid', signature: 'vector<vector<int>> grid -> int' },
  { concept: 'Monotone lattice paths with blocked cells', signature: 'vector<vector<int>> grid -> int' },
  { concept: 'Whether an array splits into two equal-sum halves', signature: 'vector<int> nums -> bool' },
  { concept: 'Smallest achievable difference between two subset sums', signature: 'vector<int> nums -> int' },
  { concept: 'Repeatedly combine the two largest values until one or none remains', signature: 'vector<int> stones -> int' },
  {
    concept: 'Minimum total cost to combine all lengths pairwise',
    signature: 'vector<int> lengths -> int',
    constraint: {
      canonical: 'n up to 10^4 with values up to 10^4, giving a total around 10^9 — already near the int32 edge',
      robinhood: 'n <= 1000 and value <= 10^4, giving a total under about 10^8',
      algorithmIdentical: true,
      overflowReasoningRetained: false,
      legitimate: 'Yes. The lesson is extract-min twice, push the sum back, and see why the greedy choice is optimal. The accumulated total is bookkeeping. A tighter bound also keeps the answer inside int32, so every typed language uses its natural type.',
    },
  },
  { concept: 'kth largest element of an unsorted array', signature: 'vector<int> nums, int k -> int' },
  { concept: 'The k most frequent values in an array', signature: 'vector<int> nums, int k -> vector<int>', ordering: 'REQUIRED — the canonical problem permits any order, which this grader cannot accept. The statement must require descending frequency then ascending value, which also makes the answer unique when frequencies tie.' },
]);

// ---------------------------------------------------------------------------
// 6. Learner order
// ---------------------------------------------------------------------------

/**
 * The order a learner should actually meet the 54 additions, which is NOT the order they sit
 * in the taxonomy or in a file listing.
 *
 * Two rules shape it. First, a topic appears only after the topics it declares as
 * prerequisites — including the corrected `sliding-window-two-pointers` -> `strings` edge, which
 * is why the strings additions come before the window additions rather than after. Second,
 * within a pattern the slots run recognition -> application -> variation -> harder application,
 * so `integer-math-modular` is met as gcd, then factorial-zeroes, then power-by-squaring, rather
 * than in the order the slots happen to be declared.
 *
 * Values are 1-based indexes into `MILESTONE_150.additions`. The audit asserts the sequence is
 * a permutation of every slot, so a dropped or duplicated entry cannot pass unnoticed.
 */
export const LEARNER_SEQUENCE = Object.freeze([
  { stage: 1, name: 'Foundations — the empty root', why: 'basics is the declared prerequisite of all 16 other topics and holds nothing. Everything else waits on it.', slots: [1, 2, 3, 4, 6, 5, 7, 8, 9] },
  { stage: 2, name: 'Sorting — the preprocessing step four topics assume', why: 'arrays, binary-search, heaps and greedy all declare sorting as a prerequisite, and it is empty.', slots: [10, 11, 12, 13, 14, 15] },
  { stage: 3, name: 'Recursion — the shape DP is built from', why: 'dynamic-programming declares recursion as a prerequisite and already holds four problems while recursion holds none.', slots: [16, 17, 18, 19, 20] },
  { stage: 4, name: 'Arrays — depth on what is already started', why: 'kadane has one problem; intervals is a first-tier pattern and empty. Intervals follows stage 2 because it is sort-then-scan.', slots: [24, 25, 21, 22, 23] },
  { stage: 5, name: 'Binary search — boundaries, then the predicate leap', why: 'lower-upper-bound is the discipline every other binary-search pattern reduces to; search-on-answer is the conceptual jump the topic exists for.', slots: [26, 27, 28, 29, 30] },
  { stage: 6, name: 'Strings — before the window topic that uses them', why: 'the corrected prerequisite direction: 14 of the window topic\'s problems are string-typed, and two of them need frequency counting.', slots: [34, 35] },
  { stage: 7, name: 'Sliding window — repair the one-problem gap', why: 'variable-size is the most transferable window idea and had a single problem beside neighbours holding twelve.', slots: [31, 32, 33] },
  { stage: 8, name: 'Bit manipulation — the groundwork under xor', why: 'basic-bit-ops was empty while xor-properties, which builds on it, held four.', slots: [36, 37] },
  { stage: 9, name: 'Stack and queue — give the entry pattern a progression', why: 'parenthesis-matching held one boolean problem; it now runs check -> quantity -> hard.', slots: [38, 39] },
  { stage: 10, name: 'Greedy — the base move under interval scheduling', why: 'sort-then-greedy was empty while interval-scheduling, a specialisation of it, held four.', slots: [40, 41] },
  { stage: 11, name: 'Heaps — open an empty core topic', why: 'nothing in the curriculum used a priority queue. Comes after sorting, which it declares as a prerequisite.', slots: [52, 53, 54, 55] },
  { stage: 12, name: 'Dynamic programming — the first table, then knapsack', why: 'every existing DP problem is 1-D. Knapsack follows stage 3, since the equal-partition problem is the DP counterpart of the recursive subset count.', slots: [47, 48, 49, 50, 51] },
  { stage: 13, name: 'Graphs — distance, then dependency order', why: 'all four existing graph problems are DFS connectivity; nothing computes a distance or handles direction.', slots: [42, 43, 44, 45, 46] },
]);

// ---------------------------------------------------------------------------
// 7. Batching — 3A.2A / 3A.2B
// ---------------------------------------------------------------------------

/**
 * The 55 additions are built in two batches, split on a STAGE boundary so no pattern
 * progression is broken across commits.
 *
 * 3A.2A is stages 1-4 complete (25 slots) plus binary-search/lower-upper-bound's three
 * (28 exactly). Stage 5 holds two separate patterns — lower-upper-bound and
 * binary-search-on-answer — so taking the first and deferring the second splits a stage but
 * not a progression, which is the constraint that actually matters. Taking all of stage 5
 * would have made the batch 30.
 */
export const BATCHES = Object.freeze({
  '3A.2A': { slots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28], note: 'stages 1-4 complete, plus binary-search/lower-upper-bound' },
  '3A.2B': { slots: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55], note: 'binary-search-on-answer, then stages 6-13' },
});
