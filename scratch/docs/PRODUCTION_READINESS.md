# Robinhood — production readiness

Phases 1 through 2E of the production roadmap. This is a measurement, not a plan: it
records what was run, what it produced, and what remains unknown.

Sections 1–7 are the **Phase 1 baseline**, kept as written so the starting point stays
legible. Section 8 onwards is **Phase 2**, and where Phase 2 supersedes a Phase 1 row it
says so rather than quietly editing the earlier measurement.

## Phase → commit mapping

Two commit messages in this history are mislabelled. The **contents are correct and
verified**; only the subject lines are wrong, a leftover from an amend during Phase 2B.
Published history is not rewritten to fix a subject line, so the mapping is recorded here
instead and these SHAs are stable:

| Commit | Actually contains | Subject line says |
| --- | --- | --- |
| `ddbada3` | **Phase 2A** — central language capability registry | Phase 2A ✓ |
| `040a5fe` | **Phase 2B** — Java end to end (adds `server/languages/java.js`) | Phase 2A ✗ |
| `edfae66` | **Phase 2C** — C end to end (adds `server/languages/c.js`) | Phase 2B ✗ |
| `82e709c` | **Phase 2D** — C# end to end (adds `server/languages/csharp.js`) | Phase 2D ✓ |

Verify any row with `git show --stat <sha>`.

Every row is one of four states, and the distinction matters:

| State | Meaning |
| --- | --- |
| **verified** | A command was run and its output is quoted or summarised here |
| **failing** | Run, and it failed or behaved wrongly |
| **not implemented** | The feature does not exist in the codebase |
| **not tested** | Exists, plausibly works, nobody has ever run it |

Baseline taken 2026-08-30 on branch `production-roadmap` at `a67cc87`, against a live
Neon PostgreSQL instance, `EXECUTION_PROVIDER=paiza`, Redis **absent**.

---

## 1. Automated gates

| Gate | Command | Result |
| --- | --- | --- |
| Content schema | `node server/scripts/validate-problem-schema.js` | **verified** — 16 files, 11 v2 (36 problems), 5 legacy v1 skipped, 0 violations |
| Reference agreement | `node server/scripts/build-authored-problems.js --check` | **verified** — 8 pattern files, 33 problems, 404 cases, all references agree |
| Unit tests | `npm test` | **verified** — 20 pass, 0 fail |
| Lint | `npm run lint` | **verified** — clean |
| Types | `npm run typecheck` | **verified** — clean |
| Production build | `npm run build` | **verified** — compiled, 23/23 static pages generated |
| Seed | `npm run seed:learning` | **verified** — 17 topics, 108 patterns, 96 problems, 1,168 test cases |
| C++ starters compile | `node server/scripts/check-cpp-starters.js` | **verified** — 96/96 compile, 32 distinct type shapes, 108 s |
| Authored solutions grade | `node server/scripts/check-authored-problems.js` | **verified** — 8 problems (one per pattern), Accepted in JavaScript and Python, empty starter rejected in every case |
| Route smoke | `npm run smoke:routes` | **verified** — 13/13 routes return 200 |
| API smoke | `npm run smoke:api` | **failing** — see D4 |
| Flow smoke | `npm run smoke:flows` | **failing** — see D4 |
| Playwright | `npm run test:e2e` | **not tested** |
| Release gate | `npm run gate:release` | **not tested** — live-system gate, needs AI + execution providers reachable |

## 2. User journeys

Run with `node scripts/verify-journeys.mjs` — added in this phase because the two
existing API smoke suites no longer reach the journeys they were written for.
**21 checks, 21 passed.**

| Journey | State | Evidence |
| --- | --- | --- |
| Browse curriculum anonymously | verified | 17 topics, 200 |
| Problem detail + starter code | verified | 3 starter languages, 4 visible cases |
| Signup | verified | 201 |
| Login issues a session token | verified | 200, 64-char token |
| Session resolves to the right user | verified | `/api/auth/me` 200 |
| Wrong password rejected | verified | 401 |
| Private endpoint rejects anonymous caller | verified | 401 |
| Forged bearer token rejected | verified | 401 |
| Correct solution Accepted on all cases | verified | Accepted 13/13 |
| Hidden cases graded but never sent to client | verified | 13 graded, 4 delivered |
| Visible-answer-hardcoding solution fails on a hidden case | verified | Wrong Answer 6/13, `is_hidden: true` |
| Throwing solution → Runtime Error | verified | Runtime Error 0/13 |
| Uncompilable C++ detected | verified | compile failure detected — **but mislabelled, see D3** |
| Accepted solution is not told it was wrong | verified | hint asks for the invariant and complexity |
| Submissions persist and return | verified | 4 submissions → 4 attempt rows, pattern and topic resolved |
| `/api/execute/run` grades visible cases only | verified | 4 of 4 visible |
| A Run creates no attempt record | verified | 4 attempts before, 4 after |
| Pattern progress reflects a solve | verified | 1 pattern row, 1 solved |
| Community stats aggregate | verified | submissions counted, solve rate computed |
| Logout | verified | 200 |
| Token dead after logout | verified | 401 |
| **Session survives a backend restart** | **failing** | see D2 |
| Password reset | **not implemented** | see D5 |
| Email verification | **not implemented** | see D5 |

## 3. Defects found in this phase

### D0 — Submit did not work in the browser at all (P0, FIXED)

The server authenticates **only** via `Authorization: Bearer`. Both `parseBearerToken`
in `auth-routes.js` and `middleware/auth-context.js` read that header and nothing else;
there is no session cookie. The problem page's API layer
(`src/app/problem/[id]/api.ts`) attached no such header on any call.

So every authenticated request from the live problem page returned 401 — Submit,
attempts, recommendations, profile, predictions. Verified directly:
`POST /api/learning/submit` with no header returns
`401 {"errorType":"AUTH_ERROR","reason":"Authentication required."}`.

The platform's central action did not work from the UI while working correctly when
the API was called directly, which is why every previous check missed it: the API-level
verification in `check-authored-problems.js` and `verify-journeys.mjs` both authenticate
properly, and the Playwright suite never signs in (D8).

Every other client in the codebase gets this right — `src/store.js`,
`src/store/learning-store.js`, `src/pages/experience-api.js` and the legacy
`problem-runner.js` all attach the token. Only the newest module did not.

**Fixed** by reading the session token from the same `localStorage` state `store.js`
persists (`robinhood_data.sessionToken`) and attaching it. Verified in a real browser:
a signed-in user's Submit now reaches the grader and the banner reads `Accepted`, with
zero 401s recorded on any `/api/` response during the run.

### D1 — Run and Submit are the same call (P1, data integrity, FIXED)

`src/app/problem/[id]/hooks/useSubmission.ts` — `handleRun` and `handleSubmit` both call
`postSubmission`, which posts to `/api/learning/submit`. Pressing **Run** therefore:

- writes a persisted attempt row, so exploratory clicks are counted as submissions and
  pollute attempt history, per-user accuracy, `problems_attempted`, `avg_attempts` and
  the community solve rate;
- grades against **all** test cases including hidden ones, directly contradicting the
  UI's own text, `Press Run to test against visible cases`;
- costs a full submission's worth of provider requests — on Paiza, 13 cases of C++ is
  ~65 HTTP requests and ~15 s for what should be a 4-case scratchpad.

The correct endpoint already exists, is wired to the right service, and is verified
working: `POST /api/execute/run` → `execution-service.runCode`, visible cases only, no
persistence (both confirmed by `verify-journeys.mjs`). The legacy
`src/pages/problem-detail/problem-runner.js` calls it correctly; the live App Router page
did not.

**Fixed** by adding `postRun` to the page's API layer and pointing `handleRun` at it.
The run endpoint's response shape predates `SubmissionResult`, so it is adapted in the
client rather than changing a contract the legacy page also depends on. `handleRun` no
longer calls `refreshAttempts`, because there is no new attempt to fetch. Verified in a
browser: Run issues `POST /api/execute/run` and never touches `/api/learning/submit`.

### D2 — A session does not survive a backend restart (P1, PARTIALLY ADDRESSED)

Measured directly: `/api/auth/me` returned **200** with a valid token, the backend was
restarted, and the same token returned **401 `Invalid or expired session`**.

Redis is absent in this configuration, so `auth-routes.js` falls back to
`inMemoryAuthSessions`, which is per-process. Two consequences:

- every logged-in user is signed out by any deploy, crash or restart;
- with more than one backend replica, a token issued by pod A is unknown to pod B, so
  requests fail at random depending on which pod they land on.

Redis is currently listed in `OPTIONAL_DEPENDENCIES`, which downgrades its readiness
check to a warning. That is correct for a single-process dev box and wrong for
production. Redis session restoration has still never been verified *working* — only
its absence has now been measured.

**Partially addressed.** The silent part is now impossible: production refuses to start
if `REDIS_URL` was never explicitly provided, and refuses to start if Redis is
unreachable at boot, unless the operator sets `ALLOW_IN_MEMORY_SESSIONS=true` to accept
the trade-off knowingly on a single-process deployment. Four regression tests cover the
env rule. Development is unchanged and keeps the localhost default.

What remains is the actual provisioning: Redis has to exist, and then a session
surviving a restart and working across two processes has to be verified. That is a
Phase 6 item and cannot be closed from the codebase alone.

### D3 — A compile error is reported as "Runtime Error" (P2, user-facing, FIXED)

Submitting C++ with a syntax error returned top-level `status: "Runtime Error"` while the
failing case's message said `Compilation Error`. `learning-service.js` folded
`COMPILE_ERROR` into `'Runtime Error'`; `execution/execution-service.js` maps the same
kind to `'Compilation Error'`. The two paths disagreed and the live one was wrong, so a
user with a missing semicolon was sent off debugging logic instead of syntax.

**Fixed.** The `submissions.status` CHECK constraint already permitted
`'Compilation Error'` and the UI already styled it (`SmartErrorBox`, `format.ts`), so
this path was the only one out of step. Verified: the same submission now returns
`Compilation Error`, asserted in `verify-journeys.mjs`.

### D4 — `smoke:api` and `smoke:flows` are obsolete (P2, false confidence)

Both fail identically at `/api/learn/session` with 401 and stop there, covering almost
nothing. They send a fabricated user id (`smoke-user-001`) in the request body, and the
server now correctly derives ownership from a verified session and ignores body-supplied
ids. The scripts predate that hardening. Until they authenticate properly they are dead
weight in `qa:full`, and a green `smoke:routes` should not be mistaken for API coverage.

### D5 — Password reset and email verification have no delivery (P1 for launch)

Routes are registered (`forgot-password`, `reset-password`, `verify-email`) but no mail
provider is wired. The first real user who forgets a password is permanently locked out.

### D6 — A duplicate execution path still calls the dead Piston API (P3, dead code)

`server/index.js` contains a second execution implementation that calls
`pistonExecution.runCode` with a Judge0 fallback, independent of the
`execution-engine` provider abstraction. Piston's free public API went whitelist-only on
2026-02-15 and answers with 401. Whatever still routes through this path cannot work.
`server/domain-engine/learning-routes.js` similarly holds a mock-validation `/submit`
handler that no longer serves any route.

### D8 — The Playwright suite cannot detect an auth failure (P2, false confidence)

`tests/submission-flow.spec.ts` was supposed to cover exactly the flow D0 broke, and
could not. Four independent reasons, each sufficient on its own:

- it navigates to `/problem/two-sum`, a slug that is not seeded;
- it never signs in, so a 401 is indistinguishable from expected behaviour;
- every assertion is wrapped in `if (await button.isEnabled())`, so the test passes
  vacuously whenever the button never becomes clickable;
- it waits for `.pp-status-banner`, which also renders for failures, so an auth error
  satisfies it.

`tests/authenticated-submission.spec.ts` was added to close this: it signs in through
the API, primes `localStorage` the way the app does, drives Monaco, and asserts on the
**verdict** plus a hard "no `/api/` response may be 401" check. It caught the pre-fix
behaviour on its first run — the Run test reported `/api/learning/submit` in the request
log — which is the evidence that it can actually fail.

The older specs should be rewritten or deleted rather than left as decoration.

### D7 — The schema validator covers 36 of 96 problems (P2, gate is weaker than it looks)

`validate-problem-schema.js` applies its strict contract only to files declaring
`"schema_version": "2.0"`. Today that is 11 files holding 36 problems; the other 60 live
in 5 legacy v1 files it skips entirely. A clean validator run says less than the problem
count implies. All new content is authored as v2.

## 4. Not tested

- Redis session restoration **working** (only its absence is measured — D2)
- AI provider responses (Gemini, OpenRouter, Ollama all report `configured`)
- SQL sandbox
- Playwright journeys
- Judge0 against any live host, self-hosted or RapidAPI
- Any load or concurrency behaviour
- Backup and restore of the Neon database

## 5. Not implemented

- Email delivery (D5)
- ~~Java, C and C# execution~~ — **superseded by Phase 2B–2D, see section 8.** As
  measured in Phase 1: `SUPPORTED_LANGUAGES` covered JavaScript, Python, C++ and
  nominally C/C#; C and C# were rejected before reaching a compiler because only `cpp`
  skipped the JS/Python entrypoint extractor, and Java had no harness builder at all,
  while the UI offered all six.
- Prometheus metrics export (`runtimeTelemetry` exists in-process, reachable only via
  `GET /api/admin/telemetry`)
- CI, container registry, Kubernetes manifests, Helm, Terraform
- Per-user rate limiting on submissions
- Migrations as a discrete step (schema bootstrap runs on every backend start)

## 6. Content coverage

96 problems, 1,168 test cases, 16 of 108 patterns filled, 9 of 17 topics non-empty.
Empty: Basics, Sorting, Recursion, Heaps, Tries. Blocked on a harness limitation rather
than authoring effort: Linked List, Binary Trees, BST — the argument decoder has no
encoding for a node with pointers, and flattening to an array reproduces the
`linked-list-cycle` defect where the answer is derivable without the algorithm.

## 7. Remediation status

Closed in this phase:

| | Defect | Verified by |
| --- | --- | --- |
| D0 | Submit returned 401 from the browser | `authenticated-submission.spec.ts` — Accepted banner, zero 401s |
| D1 | Run was a Submit | `authenticated-submission.spec.ts` — Run calls `/api/execute/run` only |
| D3 | Compile error labelled Runtime Error | `verify-journeys.mjs` — `Compilation Error` |
| — | UI offered three languages that cannot run | `LANGUAGES` trimmed to JavaScript, Python, C++ |
| D2 | *silent* fallback to per-process sessions | 4 new tests in `tests/unit/env.test.js` |
| D8 | e2e suite could not detect an auth failure | new spec fails on the pre-fix build |

Still open as of Phase 1. **Superseded by section 14**, which is the current list.

1. **D2 (remainder)** — provision Redis, then verify a session survives a restart and
   works across two processes. Cannot be closed from the codebase. *Still open.*
2. **D5** — wire a mail provider so password reset works. *Still open.*
3. ~~**Phase 2** — Java, C and C# end to end, each behind its own starter-and-reference
   suite before it goes back into `LANGUAGES`.~~ **Closed by Phases 2A–2E**, see
   section 8. All three are production-enabled, each behind a starter matrix, a canonical
   type corpus, a verdict matrix and a browser E2E.
4. **D4** — rewrite `smoke:api` and `smoke:flows` to authenticate, or delete them.
   *Still open.*
5. **D8 (remainder)** — rewrite or delete `submission-flow.spec.ts` and the other
   vacuous specs. *Still open, and now measured: see D12.*
6. **D7** — migrate the 5 legacy v1 problem files to v2 so the validator covers them.
   *Still open.*
7. **D6** — delete the dead Piston path and the orphaned mock `/submit` handler.
   *Still open.*

---

# Phase 2 — the six-language execution layer

Measured 2026-08-31 on branch `production-roadmap`, against live Neon PostgreSQL,
`EXECUTION_PROVIDER=paiza`, Redis still **absent**.

## 8. Language system

### 8.1 The registry (Phase 2A, `ddbada3`)

`server/languages/registry.js` is now the single authority for what a language is. Before
it, **seven** places decided independently, and two of them disagreed about the same
provider:

```
execution-engine.js    SUPPORTED_LANGUAGES, PAIZA_LANG, JUDGE0_LANG_ID, PISTON_LANG, CPP_TYPE_MAP
execution/judge0.js    mapJudge0Language      -- had java: 62 but no csharp
execution/security.js  SUPPORTED_RUN_LANGUAGES, SUPPORTED_SUBMIT_LANGUAGES
debugger-router.js     its own SUPPORTED_LANGUAGES and alias map
execution-mock.js      a deliberately wider set
check-judge0.js        an EXPECTED table with "keep this in sync by hand"
src/app/problem/...    LANGUAGES and DEFAULT_STARTERS for the editor
```

Two of those disagreements were live defects: `c` was mapped to Judge0 id **54**, the C++
compiler, so C was compiled as C++ and genuinely C-specific behaviour was never
exercised; and `security.js` accepted a Java submission that then died inside the engine
with `Unsupported language for entrypoint extraction`.

Provider mappings are **explicit per provider** rather than one generic execution id,
because the same language is a different thing to each: C++ is `"cpp"` to Paiza, `54` to
Judge0 and `"c++"` to Piston. Collapsing them is what let the two Judge0 tables drift.

Four flags are kept separate on purpose:

| Flag | Gates | Why separate |
| --- | --- | --- |
| `harnessImplemented` | the engine will build a program | lets a verification script run a language the API still refuses |
| `supportsRun` / `supportsSubmit` | the API accepts a submission | service and security layers |
| `productionEnabled` | the editor offers it | a fully tested language can still be hidden |

`debugger-router.js` and `execution-mock.js` were deliberately left alone — the first is a
separate subsystem with no coverage to change it safely, and a deliberately wide set is
the point of a mock.

### 8.2 Production status and capability

All six are production-enabled. **Capability is derived per problem** by
`languageSupportsSignature()` over that problem's real argument and return types, never
by blanket-enabling a language that has a harness.

| Language | Total | Capable | Excluded | Starter valid | Provider validated |
| --- | ---: | ---: | ---: | --- | --- |
| JavaScript | 96 | 96 | 0 | n/a — hand-written in the seed files | corpus 16/16 |
| Python | 96 | 96 | 0 | n/a — hand-written in the seed files | corpus 16/16 |
| C++ | 96 | 96 | 0 | 96/96 generated, 0 drifted | corpus 16/16, starters 96/96 |
| Java | 96 | 96 | 0 | 96/96 generated, 0 drifted | corpus 16/16, starters 96/96 |
| C | 96 | **86** | **10** | 86/86 generated, 0 drifted | corpus 16/16, starters 86/86 |
| C# | 96 | 96 | 0 | 96/96 generated, 0 drifted | corpus 16/16, starters 96/96 |

Recomputed from the registry and the seed files by `npm run check:languages`, not
transcribed.

### 8.3 The 10 C exclusions, and why

Every one is `vector<vector<int>>`, and the reason is structural rather than an oversight.
A C array carries no length, so each array argument needs a companion size parameter
(`int* nums, int numsSize`, as LeetCode's C signatures do). A 2-D array needs a row count
**and** a per-row column count, which is a different calling convention, not a longer one.
Declaring `vector<vector<int>>` in C's type table without a harness that handles the
double indirection would let a problem claim C support it does not have.

Excluded as an argument — `grid`, `edges`, `intervals`, `points` or `pairs`:

```
max-area-of-island                                      find-if-path-exists-in-graph
number-of-connected-components-in-an-undirected-graph   meeting-rooms
non-overlapping-intervals                               minimum-number-of-arrows-to-burst-balloons
maximum-length-of-pair-chain                            max-value-of-equation
```

Excluded as a return type: `3sum`, `4sum`.

The other five typed-language type mappings cover all 11 canonical types.

### 8.4 Signature type coverage

Canonical vocabulary, and what each language expresses it as:

| Canonical | C++ | Java | C# | C |
| --- | --- | --- | --- | --- |
| `int` | `int` | `int` | `int` | `int` |
| `long long` | `long long` | `long` | `long` | `long long` |
| `double` | `double` | `double` | `double` | `double` |
| `bool` | `bool` | `boolean` | `bool` | `bool` |
| `string` | `string` | `String` | `string` | `char*` |
| `vector<int>` | `vector<int>` | `int[]` | `int[]` | `int*` + size |
| `vector<long long>` | `vector<long long>` | `long[]` | `long[]` | `long long*` + size |
| `vector<double>` | `vector<double>` | `double[]` | `double[]` | `double*` + size |
| `vector<bool>` | `vector<bool>` | `boolean[]` | `bool[]` | `bool*` + size |
| `vector<string>` | `vector<string>` | `String[]` | `string[]` | `char**` + size |
| `vector<vector<int>>` | `vector<vector<int>>` | `int[][]` | `int[][]` | **unsupported** |

Only 5 of these 11 appear in the curriculum at all: as arguments `vector<int>`×65,
`int`×48, `string`×25, `vector<vector<int>>`×8, `vector<string>`×4; as returns `int`×57,
`vector<int>`×21, `bool`×10, `string`×3, `vector<vector<int>>`×2, `vector<string>`×2,
`double`×1.

The other four — `long long`, `vector<long long>`, `vector<double>`, `vector<bool>` — were
implemented and unit-tested across Phases 2B–2D and, until Phase 2E, had **never executed
on a provider**. The canonical corpus now runs each of them in every capable language.

### 8.5 Design decisions worth not relitigating

- **Literals, not an embedded JSON decoder**, for Java, C and C#. The C++ harness embeds a
  parser because it reads one case from stdin. An audit said the others do not need that,
  with numbers: across 96 problems and 1,168 test cases the largest `input_payload` is
  **101 bytes**, the average 30, the longest array 16 elements. Every provider recompiles
  per case anyway — Paiza's `/runners/create` is an independent compile-and-run and
  Judge0's batch carries a `source_code` per submission — so "one program, N stdins" was
  never buying a shared compile. Cost: 6 lines in the engine, where `buildProgram` may
  return a string **or** `(testCase) => string`. JavaScript, Python and C++ are untouched.
- **The registry has zero imports**, because both Express and the Next client import it.
  Generators are held as string names and resolved server-side by
  `server/languages/starters.js`.
- **C# method names are PascalCase** (`Rob`, not `rob`), matching LeetCode's C# signatures.
  Cross-language consistency was the alternative and was rejected: the starter should look
  like the language a C# candidate writes.
- **Per-language script copies were consolidated**, not multiplied:
  `check-starters.js --language all` replaced four `check-*-starters` scripts,
  `backfill-starters.js --language <k>` replaced two, and one parameterised
  `language-submission.spec.ts` replaced a Java-only spec. Per-language duplication is
  what fragmented the language definitions in the first place.

## 9. The unified release gate (Phase 2E)

```
npm run check:languages            local tier only, 0 provider executions, ~1s
npm run check:languages:release    every tier, writes server/scripts/language-gate-report.json
```

One command whose exit code means "the six-language application layer is releasable".
Driven entirely by the registry — it maintains no language table of its own.

### 9.1 Two tiers, and why the split is not arbitrary

Paiza is a free undocumented endpoint that rations us, so provider executions are the
scarce resource and the gate spends none of them on anything provable locally.

**Local tier — 0 executions.** Registry integrity; capability derivation; starter
generation for all 374 capable problem/language pairs plus a **drift check** against the
seeded starters; harness generation for **566** problem/language pairs; canonical corpus
coverage asserted against the registry; literal serialization for every language/type
pair. This tier alone found defect **D9**.

**Provider tier — bounded and counted.** The canonical corpus, the verdict matrix and the
starter compile matrix.

The starter matrix samples one problem per type shape by default (96 problems reduce to 32
distinct shapes, so 3 in 4 executions compile a structurally identical program).
`--exhaustive`, implied by `--release`, runs all 374 — **and that is required before a
release**, not out of caution: a starter is generated from a problem's own signature, so a
per-problem defect such as a function name colliding with a generated parameter is
invisible to a sampled run.

### 9.2 Verification categories, tracked separately

| Category | Where | Result |
| --- | --- | --- |
| starter generation | local | 374/374 pairs, 0 drifted, 0 missing |
| harness generation | local | 566/566 pairs |
| literal serialization | local | 11 types × 6 languages, all edge values |
| compile success | provider | 374/374 starters |
| reference correctness | provider | canonical corpus, 12 entries × 6 languages |
| wrong-answer rejection | provider | controls on 4 corpus entries + `check-authored-problems` |
| verdict mapping | provider | 5 verdicts × 6 languages = 30/30 |
| provider availability | local | registry mapping asserted for the active provider |
| browser E2E | Playwright | 6/6 languages |
| persistence / progress | Playwright | attempt row + pattern progress per language |

A language is production-valid only when all ten pass. No language was marked complete
because one sample problem worked.

### 9.3 The canonical corpus

12 entries, 38 cases, covering all 11 canonical types as **both** argument and return, and
9 declared edge conditions: empty, singleton, negative, zero, numeric bound, escaped
string, non-ASCII, ragged matrix, multi-argument order.

Almost every entry is an identity function. That is deliberate — it exercises the type in
both directions in one execution, and the expected output is the input, so there is no
reference algorithm to get wrong and a failure is unambiguously the pipeline's fault. The
exception is `mixed-args` (`int, vector<int>, string, bool → string`), which exists because
an identity function cannot catch an argument-**order** bug, and C is where that matters:
its parameter list interleaves generated size parameters with declared ones.

### 9.4 Provider execution accounting, full release run

```
executions        499
passes            499
failures            0
throttled (429)     0
retries spent       0
provider time    1133s
```

## 10. Provider status

### 10.1 Paiza — live, and not the final answer

Verified as the execution provider for all six languages. Runtimes observed directly, not
assumed:

| Language | Observed on Paiza |
| --- | --- |
| JavaScript | Node 16.17.1 |
| Python | 3.11.13 |
| C++ | Clang 18, C++20 |
| Java | OpenJDK 18.0.2 |
| C | Clang 14, C17 |
| C# | Mono 6.8.0.105 (Debian), CLR 4.0.30319.42000 |

Constraints measured, each of which shapes the product:

- **CPU is capped at 1.00 s and cannot be raised.** `EXECUTION_TIMEOUT_MS` is ignored. No
  problem can currently be tuned for a slower ceiling.
- **No batch endpoint**, and `longpoll=true` is ignored. Every test case is its own
  create-then-poll, roughly 2 requests, and compiled languages recompile per case: 60
  requests and ~14 s for a 12-case C++ problem.
- **HTTP 429 throttling is real.** Phase 2D's final sweep took confirmed 429s during heavy
  consecutive validation, with a localised (Japanese) body. See D9's sibling below.
- **Memory is reported in bytes**, where Judge0 reports kilobytes.
- Undocumented, free, no published rate limit and no terms covering production use. The
  public Piston API closed without notice on 2026-02-15; assume this one can too.

**Suitable for development and for the current validation. Not final public
infrastructure.**

### 10.2 Judge0 — integration exists, never live-validated

The transport is implemented, including the batch path, and unit-tested against a fake
host. Language ids and expected runtimes are recorded in
`docs/judge0-revalidation.md`. **No Judge0 host has ever run a single submission.**

Every language must be revalidated before any production switch, and the documented
runtimes are all **older** than Paiza's, which is why the harnesses target the older
dialect:

| Language | Paiza (observed) | Judge0 CE 1.13.x (documented) |
| --- | --- | --- |
| JavaScript | Node 16.17.1 | Node 12.14.0 |
| Python | 3.11.13 | 3.8.1 |
| C++ | Clang 18, C++20 | GCC 9.2.0, C++17 |
| Java | OpenJDK 18 | OpenJDK 13.0.1 |
| C | Clang 14, C17 | GCC 9.2.0 |
| C# | Mono 6.8.0.105 | Mono 6.6.0.161 |

## 11. Defects found in Phase 2

### D9 — Python was unusable on 12 of 96 problems (P0, FIXED)

Found by the Phase 2E local tier on its first run.

The Python entrypoint pattern required a closing paren followed directly by a colon:

```js
/^[ \t]*def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*:/gm
```

A **return annotation** sits between the two, so the most ordinary annotated Python there
is did not match:

```python
def find_max_average(nums: List[int], k: int) -> float:
```

Extraction failure is reported as `compile_error` on every test case, so the user was told
"Could not find a top-level function in the submitted python code" — about code the editor
had put in front of them. 12 seeded problems shipped exactly that starter. It also
affected **any** annotated Python a user wrote, not only our starters, which makes it a
production defect rather than a content one.

Parameter type hints were already being stripped, which is what hid it: annotations were
clearly anticipated, just not on the return.

**Fixed.** The annotation is now optional and `async def` is accepted. Covered by
`tests/unit/entrypoint-extraction.test.js`.

### D10 — a JS/Python parse failure was labelled "Runtime Error" (P2, user-facing, FIXED)

D3 was this bug for C++. The interpreted languages had it too and it survived, because
they have no compile step for the provider to report on: Node and CPython fail at parse
time by writing to stderr and exiting non-zero, which is indistinguishable from a crash
unless you look closer.

Sniffing stderr for `SyntaxError` alone would be wrong — `JSON.parse("{oops")` throws a
genuine runtime `SyntaxError`, and calling that a compile error just swaps one wrong
verdict for another. Both shapes were captured from the live provider:

```
parse-time   /workspace/Main.js:1 ... ^ SyntaxError: Unexpected token '}'
runtime      RuntimeError: SyntaxError: Unexpected token o in JSON at position 1
```

The harness wraps user code in try/catch and prefixes what it catches with
`RuntimeError: `. A parse failure kills the process before that handler exists, so the
prefix **cannot** be present. Its absence is the discriminator.

**Fixed**, scoped to source-parsed languages only. Covered by
`tests/unit/parse-failure-verdict.test.js`, including the negative case.

### D11 — a provider throttle was indistinguishable from a harness failure (P2, FIXED in tooling)

`runExecution`'s per-case catch turns **every** transport throw into
`error_kind: 'harness_error'`. Three genuinely different situations arrived identically:
the candidate's program is broken, our generated harness is broken, or the provider
refused to run anything at all.

The cost was concrete. Phase 2D's final regression sweep reported `harness_error` on two
problems and was treated as a failure until a re-run came back clean. The cause was an
HTTP 429.

**Fixed in the verification tooling**, `server/scripts/lib/provider-gate.mjs`, with a
six-value taxonomy — `PASS`, `PRODUCT_FAILURE`, `HARNESS_FAILURE`, `PROVIDER_FAILURE`,
`PROVIDER_THROTTLED`, `UNSUPPORTED_SIGNATURE` — and bounded exponential backoff with full
jitter. A throttle is not a failure and does not fail the gate; a persistent one is
reported as a throttle rather than retried forever, because what this provider rations us
at is exactly the number the Judge0 migration needs.

**Deliberately not applied to the submission path.** A retry loop there would mask the
provider limit we are trying to measure and would charge a user's wall-clock time for our
quota problem. Covered by `tests/unit/provider-gate.test.js`, including that a compiler
diagnostic is never mistaken for a throttle.

### D12 — `platform.spec.ts` is stale (P2, false confidence, OPEN)

18 of 29 tests fail. They assert a `two-sum` slug that is not seeded, "500+ problems"
against a 96-problem curriculum, and a mock-era `FAIL` marker. This is the same family as
D8 and it is **not** a Phase 2 regression: the identical 18 failures were reproduced with
Phase 2E's only server-side change stashed. Phase 1 recorded the full Playwright suite as
`not tested`, so this is the first time it has been run to completion.

Rewrite or delete. Carried forward with D4 and D8.

## 12. Phase 2 test and gate results

| Gate | Command | Result |
| --- | --- | --- |
| Unit tests | `npm test` | **verified** — 119 pass, 0 fail (was 20 at the Phase 1 baseline) |
| Language gate, local | `npm run check:languages` | **verified** — 566 harness pairs, 0 executions |
| Language gate, release | `npm run check:languages:release` | **verified** — 499 executions, 499 passes, 0 failures, 0 throttles |
| Verdict matrix | included above | **verified** — 30/30, five verdicts × six languages |
| Canonical corpus | included above | **verified** — 95/95 executions |
| Starter compile matrix | included above | **verified** — 374/374 exhaustive |
| Six-language browser suite | `playwright test tests/language-submission.spec.ts` | **verified** — 6/6 |
| Authenticated browser suite | `playwright test tests/authenticated-submission.spec.ts` | **verified** — 2/2 |
| Authored solutions grade | `node server/scripts/check-authored-problems.js` | **verified** — 8/8 Accepted, every control rejected |
| Content schema | `node server/scripts/validate-problem-schema.js` | **verified** — 16 files, 0 violations |
| Reference agreement | `node server/scripts/build-authored-problems.js --check` | **verified** — 33 problems, 404 cases |
| User journeys | `node scripts/verify-journeys.mjs` | **verified** — 22/22 |
| Lint | `npm run lint` | **verified** — clean |
| Types | `npm run typecheck` | **verified** — clean |
| Production build | `npm run build` | **verified** — compiled |
| Full Playwright suite | `npm run test:e2e` | **failing** — 18 stale tests in `platform.spec.ts`, see D12 |

## 13. Still not verified after Phase 2

- **Judge0, in any form.** No language has ever executed on it.
- Redis session restoration **working** — only its absence is measured (D2)
- Email delivery (D5)
- AI provider responses (Gemini, OpenRouter, Ollama all merely report `configured`)
- SQL sandbox
- Any load or concurrency behaviour
- Backup and restore of the Neon database
- A correct-but-slow solution's behaviour under a raisable CPU limit — Paiza's 1.00 s cap
  cannot be changed, so nothing is tuned for anything else
- 64-bit values above 2^53. `expected_output` is stored as JSON, so a value JavaScript
  cannot represent exactly cannot be expressed as a test case. The corpus stops at
  2^53−1; this is a property of the storage format, not of any harness.

## 14. Carried forward — none of this is complete

In priority order. Every item below is **open**.

| | Item | Blocked on |
| --- | --- | --- |
| 1 | **D2 remainder** — provision Redis, then verify a session survives a restart and works across two processes | infrastructure, not code |
| 2 | **D5** — wire a mail provider so password reset and email verification work | a provider account |
| 3 | **Live Judge0** — stand up a host, revalidate all six languages, exercise the batch path | a Linux VM with cgroup v1 |
| 4 | **D12 / D8 / D4** — rewrite or delete `platform.spec.ts`, `submission-flow.spec.ts`, `smoke:api`, `smoke:flows` | nothing |
| 5 | **D7** — migrate the 5 legacy v1 problem files to v2 so the validator covers all 96 | nothing |
| 6 | **D6** — delete the dead Piston path in `server/index.js` and the orphaned mock `/submit` handler | nothing |
| 7 | **Backup and restore** — never exercised against Neon | nothing |
| 8 | **Load and concurrency behaviour** — never measured | nothing |
| 9 | Curriculum expansion, 96 → 150, prioritising the 92 empty patterns | Linked List / Trees / BST need a node encoding |
| 10 | Per-user rate limiting on submissions | nothing |
| 11 | Migrations as a discrete step — schema bootstrap currently runs on every backend start | nothing |
| 12 | CI, container registry, Kubernetes manifests, Helm, Terraform | deliberately not started |

## 15. Content coverage

Unchanged by Phase 2: 96 problems, 1,168 test cases, 16 of 108 patterns filled, 9 of 17
topics non-empty. Empty: Basics, Sorting, Recursion, Heaps, Tries. Blocked on a harness
limitation rather than authoring effort: Linked List, Binary Trees, BST — the argument
decoder has no encoding for a node with pointers, and flattening to an array reproduces
the `linked-list-cycle` defect where the answer is derivable without the algorithm.

What Phase 2 changed is how many ways each problem can be solved: 96 problems are now
reachable in 6 languages rather than 3, which is 566 problem/language pairs, 86 of the 96
in all six and the other 10 in five.
