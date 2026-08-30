# Robinhood — production readiness baseline

Phase 1 of the production roadmap. This is a measurement, not a plan: it records what
was run, what it produced, and what remains unknown.

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
- Java, C and C# execution — `SUPPORTED_LANGUAGES` covers JavaScript, Python, C++ and
  nominally C/C#; C and C# are rejected before reaching a compiler because only `cpp`
  skips the JS/Python entrypoint extractor, and Java has no harness builder at all. The
  UI currently offers all six.
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

Still open, in order:

1. **D2 (remainder)** — provision Redis, then verify a session survives a restart and
   works across two processes. Cannot be closed from the codebase.
2. **D5** — wire a mail provider so password reset works.
3. **Phase 2** — Java, C and C# end to end, each behind its own starter-and-reference
   suite before it goes back into `LANGUAGES`.
4. **D4** — rewrite `smoke:api` and `smoke:flows` to authenticate, or delete them.
5. **D8 (remainder)** — rewrite or delete `submission-flow.spec.ts` and the other
   vacuous specs.
6. **D7** — migrate the 5 legacy v1 problem files to v2 so the validator covers them.
7. **D6** — delete the dead Piston path and the orphaned mock `/submit` handler.
