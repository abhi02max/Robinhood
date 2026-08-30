# Robinhood — project state as of 2026-08-30

A handoff document. It records what the platform does today, what has actually been
proven to work and how, what is still broken or missing, and the conventions that
will bite anyone (human or model) who edits this repo without reading them.

Nothing here is aspirational. Every claim marked *verified* names the command that
produced the evidence and the date it ran. Anything not marked verified has not been
run against a live system.

---

## 1. What the project is

An AI-assisted DSA and interview-preparation platform: a curriculum of topics →
patterns → problems, a Monaco editor, and a submission path that runs the user's code
against seeded test cases in a hosted sandbox and grades it.

It is a **multi-user web application intended to go public**, not a personal script.
That single fact drives the most important design constraint: submitted code must
never execute on the host process. It goes to an isolated third-party runner.

## 2. Repository layout

npm workspace. The runnable application is in `scratch/`; the root holds Compose and
orchestration scripts.

| Path | What is there |
| --- | --- |
| `scratch/src/` | Next.js 15 App Router frontend (React 19, TypeScript, Tailwind, Monaco) |
| `scratch/server/index.js` | Express 5 entrypoint, Zod startup validation, readiness probes |
| `scratch/server/learning-engine/` | the curriculum runtime: router → controller → service → execution engine |
| `scratch/server/learning-engine/execution-engine.js` | **the code-execution core**: provider transports, per-language harnesses |
| `scratch/server/learning-engine/intelligence-engine.js` | hint generation from a verdict |
| `scratch/server/data/learning/` | **the curriculum source of truth** — `topics.json`, `patterns/`, `problems/<topic>/<pattern>.json` |
| `scratch/server/scripts/` | seeding, validation, backfills, and live provider checks |
| `scratch/tests/unit/` | Node test runner suites |
| `scratch/docs/` | this file, plus `self-hosting-judge0.md` |

Frontend on `5173`, backend on `3000`. The backend refuses to start without
PostgreSQL — that is deliberate, not a bug.

## 3. How to run it

Postgres is the only hard dependency, and it does not need to be local. The current
setup uses a managed Neon instance; Docker, local Postgres and local Redis were all
removed on purpose because they were too slow on this machine.

`scratch/.env.local`:

```ini
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
OPTIONAL_DEPENDENCIES=redis,piston,judge0,paiza
EXECUTION_PROVIDER=paiza
PAIZA_API_KEY=guest
PORT=3000
```

```bash
npm install && npm run dev
```

`?sslmode=require` in the URL is what supplies TLS; `pg` parses it out of the
connection string and it overrides any explicit `ssl` pool option, so managed
Postgres needs no code change. `OPTIONAL_DEPENDENCIES` downgrades those readiness
checks from blockers to warnings — without it `/api/health/ready` returns 503 forever
because every check defaults to critical. Expect 200 `degraded`, with Redis a warning
and the unselected execution providers reported `skipped`.

---

## 4. What is verified, and how

| Date | What was proven | Evidence |
| --- | --- | --- |
| 2026-08-27 | Schema bootstrap against live managed Postgres — learning, auth and domain routines, 14 tables | app startup |
| 2026-08-27 | Curriculum seeding: 17 topics, 108 patterns, 63 problems, 764 test cases | `npm --workspace scratch run seed:learning` |
| 2026-08-27 | signup → login → session → logout on the in-memory session fallback; problem browsing and detail through the Next.js API proxy | manual HTTP |
| 2026-08-29 | Real execution through Paiza in JavaScript, Python and C++ — correct, wrong and throwing programs each get the right verdict | `node server/scripts/check-paiza.js` |
| 2026-08-30 | The authenticated HTTP submission path end to end: `POST /api/learning/submit` → `Accepted 14/14` on `maximum-subarray` in JavaScript, Python, and C++ in *both* call shapes; a deliberately wrong control returned `Wrong Answer 2/14`; all five attempts persisted and came back from `GET /api/learning/attempts/:id` | one-off script against the running server |
| 2026-08-30 | All 63 problems carry a `cpp_signature`, and 11 of them — covering every argument and return type the curriculum uses — compile and grade correctly against their real seeded cases, with two near-miss controls correctly rejected | `node server/scripts/check-cpp-problems.js` |
| 2026-08-30 | All 63 problems carry a `starter_code.cpp`, and all 63 compile untouched through Paiza — 21 distinct argument/return type shapes, 72 s at concurrency 4, zero compile errors | `node server/scripts/check-cpp-starters.js` |
| 2026-08-30 | The C++ starter reaches the client: every row in the live database has both `starter_code->'cpp'` and `cpp_signature`, and `GET /api/learning/problem/3sum` on the running backend returns `starter_code` with keys `cpp`, `python`, `javascript` | re-seed + one-off HTTP request against `localhost:3000` |
| 2026-08-30 | 33 new problems across 8 previously-empty patterns: every `expected_output` agreed on by two independently written reference solutions and a brute force, and every worked example reproducing its hand-stated answer | `node server/scripts/build-authored-problems.js` |
| 2026-08-30 | Those problems are gradeable through the real path: one problem per new pattern submitted to Paiza against its **seeded** cases, Accepted in both JavaScript and Python, with the untouched starter rejected in every case | `node server/scripts/check-authored-problems.js` |
| 2026-08-30 | All 96 problems now in the database carry a compiling C++ starter — 32 distinct argument/return type shapes, 108 s at concurrency 4, zero compile errors | `node server/scripts/check-cpp-starters.js` |
| 2026-08-30 | 96 problems and 1,168 test cases seeded; 16 of 108 patterns and 9 of 17 topics now have content | `npm run seed:learning` + a coverage query |
| 2026-08-30 | 20 of 20 unit tests, lint clean, typecheck clean, production build succeeds | `npm --workspace scratch test`, `lint`, `typecheck`, `npm run build` |

**Not verified:** Redis session restoration, AI provider responses, the SQL sandbox,
Playwright journeys, and Judge0 against the real RapidAPI host.

## 5. Code execution

This is the part that was rebuilt, and the part worth understanding first.

### Providers

`EXECUTION_PROVIDER` selects one. The engine's own built-in default is `piston`,
which is dead, so the variable is set explicitly in `scratch/.env.local`.

| Provider | State |
| --- | --- |
| `paiza` | **Current default, real execution.** `https://api.paiza.io` with `api_key=guest` — free, no signup, no card, no published quota. Verified 2026-08-29 and 2026-08-30. |
| `judge0` | Real sandboxed execution, fully implemented and unit-tested against a fake Judge0. **Never run against the live RapidAPI host** — that needs a paid key (cheapest documented tier €27/month for 2000 submissions/day). `node server/scripts/check-judge0.js` will validate a key, check the hardcoded language IDs against `GET /languages`, and drive one real batch. |
| `piston` | Dead as a public service. The free `emkc.org` API went whitelist-only on 2026-02-15 and answers `/execute` with HTTP 401 (observed 2026-08-27). Self-hosting only. |
| `mock` | Reports a pass for any non-empty code without running it. Useful offline; it proves nothing, so it must never serve users. |

Paiza's two hard limits, both measured:

1. **CPU is fixed at 1.00 s** and a caller cannot raise it. `EXECUTION_TIMEOUT_MS` does
   not apply. A correct but slow solution is reported as Time Limit Exceeded. This is
   the one real functional difference from Judge0, where `cpu_time_limit` is ours.
2. **No batch endpoint.** Each case is its own create-then-poll cycle. Measured on a
   12-case problem: 60 HTTP requests and ~14 s for C++ (it recompiles per case),
   ~3–4 s for JavaScript or Python. Requests are free, so this is latency, not quota.

Paiza's runtimes are *newer* than paid Judge0 CE 1.13.x (Python 3.11, Clang 18/C++20,
Node 16 vs Judge0's Python 3.8 and Node 12), so migrating to Judge0 later is a
downgrade in language features. That trade-off is written up in
[`self-hosting-judge0.md`](self-hosting-judge0.md).

Stated plainly: Paiza is an undocumented free endpoint with no published rate limit and
no terms covering production use. The public Piston API closed with no notice; assume
this one can too. If it does, the migration is a Judge0 key plus
`EXECUTION_PROVIDER=judge0` — the transport is already written and tested.

### The harness contract

The user never writes I/O. `runExecution` wraps the submission in a generated program
that reads one test case's `input_payload` as JSON on stdin, calls the user's function,
and prints the result between `<<<OUT>>>` and `<<<END>>>` sentinels. A run that
produces no sentinel is a runtime error, not a pass — that distinction is unit-tested.

Two different ways of finding the function:

- **JavaScript and Python** — `extractEntrypoint` reads the submitted source and finds
  the top-level function whose parameter names match the keys of `input_payload`.
  Arguments are passed by name, so the parameter list *is* the contract.
- **C++** — no parsing of the user's code for types. The harness is generated entirely
  from the problem's `cpp_signature`, which names the function, the ordered arguments
  with C++ types, and the return type. Types come from `CPP_TYPE_MAP`: `int`,
  `long long`, `double`, `bool`, `string`, `vector<>` of those, and
  `vector<vector<int>>`. JSON decoding is done by a small parser embedded in the
  generated program, because the stock compiler images have no `nlohmann/json`.

  The *call shape* is read off the submitted code, not the signature: if the submission
  defines `class Solution { ... }` the harness constructs it and calls the method,
  otherwise it calls a free function. Both styles work with no instructions to the user.

  `CPP_TYPE_MAP` and `normalizeCppType` are exported from `execution-engine.js` so the
  seed-file tooling generates only types the harness can compile. The earlier
  signature backfill kept its own copy of that list, which is a drift the next type
  addition would have found the hard way.

### The C++ starter code

Every problem now has a `starter_code.cpp`, generated from its `cpp_signature` by
`server/scripts/backfill-cpp-starters.js` in LeetCode's shape:

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    double findMaxAverage(vector<int>& nums, int k) {
        // Write your solution here.
        return {};
    }
};
```

Three details are load-bearing:

- **`return {};`, not an empty body.** An empty body with a non-void return type is
  undefined behaviour, so an untouched starter would fail with a garbage value or a
  crash that has nothing to do with the user's reasoning. `return {};` value-initializes
  every type in `CPP_TYPE_MAP` (`0`, `false`, `""`, `{}`), which makes the first
  submission a deterministic Wrong Answer instead.
- **Vectors by non-const reference, scalars and `string` by value** — LeetCode's own
  convention. The harness passes named locals, so anything binds; the point is that the
  declaration looks like the one a candidate has seen before rather than a harness
  artefact.
- **`class Solution` even though a free function also works.** Showing one concrete
  shape is more useful than describing two, and the harness follows whichever the
  submission ends up using.

`check-cpp-starters.js` submits every untouched starter and asserts the verdict is not
a compile error and not a harness error. It reads the seed files, not the database, so
it can run before a seed and needs no `DATABASE_URL`. Two problems
(`diet-plan-performance`, `minimum-difference-between-highest-and-lowest-of-k-scores`)
pass their first visible case with `return {};` because the expected answer there is
`0`; the script reports that rather than treating it as an error, since it says nothing
about whether the starter compiles.

### Which languages actually work

The problem UI offers six. Measured behaviour today (`runExecution` called directly,
no network needed to observe it):

| Language | State |
| --- | --- |
| JavaScript | works, verified end to end |
| Python | works, verified end to end |
| C++ | works, verified end to end, on all 63 problems, and all 63 now open with starter code |
| C | **rejected** — `Unsupported language for entrypoint extraction: c`. Only `cpp` skips the JS/Python entrypoint extractor, so a C submission never reaches the C++ builder that would otherwise compile it. |
| C# | **rejected** for the same reason. `buildCsharpProgram` exists and is dead code today. |
| Java | **rejected** earlier still — `java` is not in `SUPPORTED_LANGUAGES`, and there is no `buildJavaProgram`. |

So three of the six selectable languages fail. Fixing C and C# is mostly a matter of
skipping `extractEntrypoint` for typed languages (they take their shape from a
signature, exactly as C++ does); Java additionally needs a harness builder.

---

## 6. The curriculum, and its biggest gap

Content lives in `scratch/server/data/learning/`. **The JSON files are the source of
truth for the seeder.** `seed-learning.js` UPSERTs problems on `slug` and *replaces*
their test cases, so anything written straight to Postgres is destroyed by the next seed
run. Every content change belongs in the seed files.

New problems are **built** into those JSON files from specs rather than hand-written:

```
server/data/learning/authoring/<topic>/<pattern>.mjs   ← what an author writes
        ↓  node server/scripts/build-authored-problems.js
server/data/learning/problems/<topic>/<pattern>.json   ← committed, validated, seeded
```

The reason is `expected_output`. It is the field that decides whether the platform tells
a user the truth, and it is the field a human is worst at producing by hand — a
mis-typed expected value ships a problem that grades a correct solution as Wrong. So a
spec contains no expected outputs at all. It carries prose, a brute force, two
**independently written** reference solutions (JavaScript and Python), and a list of
input payloads; the build runs them and computes the outputs.

Four checks have to pass before anything is written:

1. **The two references agree** on every case. They are written separately rather than
   transcribed, so a typo in one shows up as a disagreement.
2. **The brute force agrees** too, on every case not marked `skipBrute` (some are
   exponential). The brute force is usually the implementation whose correctness is
   self-evident, which makes it the most valuable of the three.
3. **Every worked example reproduces a hand-stated `expect`.** This is the check the
   others cannot make: two implementations can agree and both be solving the wrong
   problem. The stated answers come from the problem statement.
4. **The spec's own `assume` predicate holds** for every payload, where the author
   supplies one. A test case that contradicts the problem's constraints — an unsorted
   array on a problem that promises sorted input — makes all three implementations agree
   on the answer to a question nobody asked. This caught a real one during authoring.

The build then emits `cpp_signature` and `starter_code.cpp` itself, and validates the
rendered text against the v2 schema before writing.

Two constraints the specs inherit from the harness, both of which bite immediately:

- **Parameters are bound by name.** Every reference parameter must be a key of the input
  payload, in both languages — so a Python reference uses the payload's spelling
  (`cardPoints`, not `card_points`).
- **Helpers must be top-level and declared before the entry function.** The engine takes
  the last function definition it can see as the entrypoint, and its regex does not know
  about nesting, so a helper declared *inside* the entry function is picked instead. The
  build reproduces the same rule and now says so explicitly when it happens.

A problem carries: `slug`, `title`, `difficulty`, description and examples, `approaches`
(reference solutions in JavaScript and Python), `starter_code` (`javascript` and
`python` required, `cpp` optional), `time_complexity`, `space_complexity`, `test_cases`
(each an `input_payload` object plus an `expected_output`, with a hidden/visible flag),
and — for C++ — `cpp_signature`. A `starter_code.cpp` without a `cpp_signature` is
rejected: it would show the user a function to fill in and then refuse the submission
with "no cpp_signature configured".

`node server/scripts/validate-problem-schema.js` enforces the shape strictly and is a
required gate before seeding. **Know its reach before trusting it as a gate:** it only
applies the v2 contract to files declaring `"schema_version": "2.0"`, and today that is
3 files holding 3 problems. The other 60 problems live in 5 legacy v1 files it skips
entirely, so "validator OK" is a much weaker statement than the problem count suggests.
New content should be written as v2 for this reason.

### Counts, measured against the live database on 2026-08-30

17 topics, 108 patterns, **96 problems, 1,168 test cases**. Every problem has a
`cpp_signature` and a `starter_code.cpp`.

Coverage by topic:

| Topic | Patterns with problems | Problems |
| --- | --- | --- |
| Sliding Window & Two Pointers | 6 / 7 | 61 |
| Arrays | 2 / 7 | 6 |
| Stack & Queue | 2 / 7 | 5 |
| Binary Search | 1 / 6 | 4 |
| Strings | 1 / 6 | 4 |
| Bit Manipulation | 1 / 6 | 4 |
| Greedy | 1 / 6 | 4 |
| Graphs | 1 / 8 | 4 |
| Dynamic Programming | 1 / 8 | 4 |
| Basics, Sorting, Recursion, Heaps, Tries | 0 / 29 | **0** |
| Linked List, Binary Trees, BST | 0 / 18 | **0 — blocked, see below** |

That is up from 63 problems in 8 patterns across 2 topics. **Content is still the
largest gap**: 92 of 108 patterns are empty, and the roadmap UI shows a full
curriculum because topics and patterns are seeded independently of the problems
behind them.

### Three topics the harness cannot express yet

Linked List, Binary Trees and BST are not empty for want of authoring. The harness
passes arguments as JSON decoded into the types in `CPP_TYPE_MAP` — integers, doubles,
booleans, strings, one-dimensional vectors of those, and `vector<vector<int>>`. There
is no encoding for a node with pointers, so there is no honest way to hand a user a
tree or a linked list.

Encoding them as arrays does not work either. The `linked-list-cycle` pair in this
repo is exactly that attempt, and §6 below records how it turned out: the problem
became solvable without implementing the algorithm it was meant to teach. A level-order
array with nulls (`[3,9,20,null,15,7]`) has the same defect for trees — plus `null`
inside an array has no C++ type the inference can assign.

Doing these properly means teaching the harness a node type: a decoder that builds a
real linked list or tree from the JSON, a comparison that can accept one back, and
starter code that declares it. That is engine work, not content work, and it should be
scheduled as such.

### A content defect worth knowing about

`linked-list-cycle` and `linked-list-cycle-ii` pass their input as
`{head: number[], pos: number}` where `pos` names the cycle entry outright, so
`return pos !== -1` scores full marks without implementing cycle detection. Before
2026-08-30 their starters did not receive `pos` at all, which made them **unsolvable in
every language** — the answer was not derivable from the arguments. The starters now
take `pos` and both problems grade correctly, but they still cannot teach Floyd's
algorithm. A real fix needs a linked-list node type the harness has no encoding for.

Assume other problems have similar issues. The seeded content has never been audited
problem by problem against a working execution path, because until this cycle there was
no working execution path to audit it with.

---

## 7. Scripts

All run from `scratch/`.

| Script | Purpose | Needs |
| --- | --- | --- |
| `server/scripts/validate-problem-schema.js` | strict validation of the seed files | nothing |
| `server/scripts/seed-learning.js` (`npm run seed:learning`) | push seed files to Postgres | database |
| `server/scripts/backfill-cpp-signatures.js` | infer a missing `cpp_signature` from the JS starter's parameter list and the test data, and splice it into the seed file | nothing |
| `server/scripts/backfill-cpp-starters.js` | generate `starter_code.cpp` from `cpp_signature` and splice it into the seed file (`--print <slug>` shows one without writing) | nothing |
| `server/scripts/check-cpp-problems.js` | compile and run real C++ reference solutions against the real seeded cases, with near-miss controls that must be rejected | database + network |
| `server/scripts/check-cpp-starters.js` | submit every untouched generated starter and assert none is a compile error (`--shapes` for one per type shape) | network |
| `server/scripts/build-authored-problems.js` | build seed JSON from the authoring specs, refusing to write unless every reference agrees (`--check` to verify without writing) | Python on PATH |
| `server/scripts/check-authored-problems.js` | grade each authored reference solution through the real provider against the **seeded** cases, with the untouched starter as a control that must fail (`--all` for every problem) | database + network |
| `server/scripts/lib/cpp-infer.mjs` | shared C++ type inference and starter rendering, used by both backfills and the builder | — |
| `server/scripts/check-paiza.js` | provider smoke test: correct / wrong / throwing programs per language | network |
| `server/scripts/check-judge0.js` | validate a Judge0 key, verify the language IDs, drive one real batch | key + network |
| `server/scripts/lib/seed-json-edit.js` | shared text-level editing helpers for the seed files (see below) | — |

Both backfills default to a **dry run**; `--write` edits the files, `--force` also
replaces existing values. They report anything they cannot pin down instead of guessing,
because a wrong inferred type produces a compile error the user cannot act on, while a
missing one produces a clear message.

Two design decisions in those scripts are load-bearing:

- **Inference merges every test case, never just the first.** A problem whose answer is
  `5` in one case and `12.75` in another is `double`; deciding from case one alone emits
  `int` and silently truncates every fractional answer. `maximum-average-subarray-i` is
  exactly that problem, and the checker's control solution proves it: the integer-division
  version scores 9/12, not 12/12.
- **The seed files are edited as text, not re-serialized.** `JSON.stringify(doc, null, 2)`
  does not round-trip them — it puts every element of every test-case array on its own
  line, turning a 32 KB file into 52 KB and a two-line change into a 20,000-line diff.
  The helpers splice the new key in with string-literal-aware brace matching (source code
  is full of braces, so a naive depth counter closes the object mid-string), then re-parse
  and refuse to write if anything other than the intended key changed. The 62-signature
  backfill came out as 465 pure insertions across 7 files.

## 8. Defects found and fixed in this cycle

Each of these was found by making execution actually work and then looking at what came
back — and items 7 to 9 by then trying to add content on top of it, which is a reminder
that a feature nobody has built on is a feature nobody has tested. All are fixed and
covered by tests or a live check.

1. **Every free-function C++ submission failed to compile.** `emitCppCallExpr` emitted
   `Solution __sol;` whenever `cpp_signature.class` was set — and it is set on every
   problem — so a submission that defined a bare function failed with
   `unknown type name 'Solution'`, which reads as a platform bug rather than a user
   mistake. The harness now detects which shape the submission uses. Unit-tested against
   the emitted source, not just the verdict. (The generated starter is class-shaped, but
   a user is free to delete the wrapper, so the detection still earns its keep.)
2. **Accepted submissions were told they were wrong.** `generateContextualHint` had no
   Accepted branch, so a correct answer fell through into the Wrong Answer text and was
   advised to "trace through your algorithm with the failing test input" when
   `failed_test_case` was `null`. The existing Playwright assertion only checked that a
   hint was truthy, which is why it survived. Now returns an Accepted hint that asks for
   the invariant and the complexity.
3. **The seeder printed the live database password.** `seed-learning.js` logged the raw
   connection string on every run, putting the credential into every terminal scrollback,
   CI log and screenshot. Now redacted through one shared helper used at both print sites.
4. **Two problems were unsolvable in every language** — the `linked-list-cycle` pair
   described in §6.
5. **62 of 63 problems could not be attempted in C++ at all**, failing with "no
   cpp_signature configured". Backfilled and verified by compile-and-run.
6. **No problem had C++ starter code**, so a C++ user opened an empty editor and had to
   guess the entrypoint name and its types from the prose. Generated from
   `cpp_signature` for every problem and proven to compile — see §5.
7. **`normalizeCppType` deleted whitespace instead of collapsing it**, turning
   `long long` into `longlong` and `vector<long long>` into a key that does not exist.
   Both of `CPP_TYPE_MAP`'s long-long entries were therefore unreachable, and any
   problem with a value outside 32 bits was rejected with "unsupported argument type".
   Nothing caught it because no seeded problem had values that large; it surfaced the
   moment a new problem included `2147483647`. Fixed, and verified by compiling the
   affected problem's starter through Paiza.
8. **The type inference widened `INT32_MIN` unnecessarily.** It tested
   `Math.abs(v) > INT32_MAX`, and two's complement is not symmetric, so exactly
   `-2147483648` — a perfectly good `int` — became `long long`. Inside a matrix that
   produced `vector<vector<long long>>`, which the harness has no decoder for, and the
   problem was rejected outright.
9. **The problem builder silently erased C++ support.** It rewrites a whole pattern file
   from its spec, so `cpp_signature` and `starter_code.cpp` — added afterwards by the
   backfill scripts — disappeared on the next build, and the only symptom would have
   been a user told "C++ not supported for this problem" on a problem that had worked
   the day before. The inference now lives in `server/scripts/lib/cpp-infer.mjs` and the
   builder emits both keys itself, so the two paths cannot diverge.

---

## 9. Open work, in priority order

1. **Add problems.** 92 of 108 patterns are still empty, and this remains larger than
   everything else on the list. The authoring pipeline in §6 makes each new pattern a
   spec file rather than 800 lines of hand-checked JSON, and the four agreement checks
   mean a wrong expected output fails the build instead of reaching a user.

   Ready to author next, in rough order of learner value: the remaining Arrays patterns
   (`difference-array`, `intervals`, `cyclic-sort`, `in-place-rearrangement`,
   `dutch-national-flag` — note `sort-colors` is already used by
   `same-direction-two-pointers`, so this pattern needs a different problem set), then
   `binary-search-on-answer`, `dynamic-programming/0-1-knapsack` and `unbounded-knapsack`,
   `recursion/subset-include-exclude`, `heaps/top-k-with-heap`, `tries/character-trie-basics`,
   `graphs/bfs-shortest-path` and `union-find`, `sorting/custom-comparator-and-stability`,
   and `basics/simulation`.

   Two things to know before starting. Any problem whose natural answer is a *set* needs
   its ordering pinned by the problem statement, because the grader compares deeply and
   in order — `sort-characters-by-frequency` in this batch specifies a tie-break for
   exactly that reason, and LeetCode's own version does not. And design-style problems
   (`stack-queue/queue-from-stacks`, `tries/*`) have to be reframed as a batch of
   operations in and a batch of results out, since the harness calls one function once.
2. ~~**C++ starter code.**~~ **Done 2026-08-30.** Every problem has a `starter_code.cpp`
   generated from its signature, the validator accepts the `cpp` key, and every generated
   starter is proven to compile — see §5.
3. **Java and C#.** Skip `extractEntrypoint` for typed languages and drive them from a
   signature the way C++ is driven. C# has a harness builder already; Java needs one
   (`public class Main`, and `public` stripped from a user-supplied `class Solution`).
4. **C.** Currently compiled as C++ and rejected before it gets there. Real C needs its
   own compiler id and the out-parameter conventions LeetCode uses for array returns.
5. **Per-language availability in the UI.** `src/app/problem/[id]/types.ts` offers all
   six languages unconditionally. Until 3 and 4 land, the selector should reflect what
   the backend can actually run.
6. **A node encoding for linked lists and trees.** Three topics (Linked List, Binary
   Trees, BST — 18 patterns) cannot be authored honestly until the harness can hand a
   user a real node structure. See the end of §6 for why array encodings are not a
   substitute. This is engine work and it unblocks a fifth of the curriculum.
7. **Audit the 63 pre-existing problems** against real execution. The 33 new ones are
   covered by the build's agreement checks and by `check-authored-problems.js`; the older
   ones predate both. `check-authored-problems.js` only knows about problems that have an
   authoring spec, so auditing the rest means either writing reference solutions for them
   or accepting a narrower check. Four defects have already surfaced from touching a
   handful of them.
7. Dead code: a mock-validation `/submit` handler in `server/domain-engine/learning-routes.js`
   that no longer serves any route — the live path is `server/learning-engine/learning-router.js`.

## 10. Conventions and traps

- **Seed files are the source of truth.** Writing content to Postgres directly is undone
  by the next `npm run seed:learning`.
- **Never read, log, echo or commit `scratch/.env` or `scratch/.env.local`.** They hold a
  live database URL and live AI provider keys. Both are gitignored and confirmed never
  committed. Edit them with a script rather than opening them. Any credential that
  reaches git history must be rotated — removing it from the current file does not
  remove it from history.
- **The database is internet-reachable.** The managed Postgres endpoint has no IP
  allowlist by default, so the connection string alone is full read/write access. Treat
  it accordingly.
- **Do not run production builds from a cloud-synchronized directory on Windows.**
  OneDrive denies webpack's atomic writes to `.next`, and syncing ~25,000 `node_modules`
  files makes every install slow. The working checkout is deliberately at `C:\dev\Robinhood`.
- **`EXECUTION_PROVIDER=mock` invalidates any verification.** It passes any non-empty
  code. `check-cpp-problems.js` forces itself off `mock` for that reason; keep that
  property in anything new.
- **Gates before claiming done:** `validate-problem-schema.js`, `npm run lint`,
  `npm run typecheck`, `npm test`, `npm run build`, and for content changes a re-seed.
  `gate:release` is a live-system gate, not an offline test — it expects both services
  plus AI and execution providers reachable.

## 11. Git state at the time of writing

Five commits exist; the history begins with an import of the working tree from OneDrive.
Everything described in §5–§8 is **uncommitted working-tree change**. Modified: the
execution engine, the intelligence engine, the learning service, the seeder, the schema
validator, `server/index.js`, `execution/judge0.js`, the eight hand-maintained problem
files, `README.md` and `.env.example`. Untracked additions: `server/scripts/` gained
`backfill-cpp-signatures.js`, `backfill-cpp-starters.js`, `build-authored-problems.js`,
`check-authored-problems.js`, `check-cpp-problems.js`, `check-cpp-starters.js`,
`check-judge0.js`, `check-paiza.js` and `lib/`; `server/data/learning/authoring/` is
entirely new, as are the eight generated problem files under
`server/data/learning/problems/`; plus `tests/unit/judge0-batch.test.js`,
`tests/unit/paiza-runner.test.js` and `docs/`. Nothing has been committed on request yet.





