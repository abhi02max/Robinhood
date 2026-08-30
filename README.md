# Robinhood

Robinhood is an AI-assisted DSA and interview-preparation platform. The repository is an npm workspace: the runnable application is in `scratch/`, while root-level scripts orchestrate local development and Docker services.

## Architecture

- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind/PostCSS, legacy DOM page adapters, Monaco editor
- Backend: Express 5 on Node.js, Zod startup validation, structured JSON APIs
- Data: PostgreSQL through `pg`; SQL bootstrap schemas and seed scripts under `scratch/server/`
- Authentication: custom bearer sessions backed by Redis with an in-memory development fallback; bcrypt password hashes
- AI: server-side Gemini, OpenRouter, and Ollama adapters with caching, per-actor rate limits, daily quotas, global concurrency limits, provider timeouts, and fallbacks
- Code execution: isolated Paiza, Piston and Judge0 services; the application does not execute user code locally
- Tests: Node test runner for unit tests and Playwright for browser flows
- Deployment: Docker Compose for PostgreSQL, Redis, backend, frontend, Caddy, Piston, Judge0, and the SQL sandbox

## Prerequisites

- Node.js 20 or newer and npm
- A PostgreSQL 16 database. **Required** — the backend exits if it cannot connect.
  This can be a managed instance (Neon, Supabase, RDS); nothing needs to run locally.
- Redis 7 — optional. Sessions fall back to in-memory storage when it is absent.
- Paiza/Piston/Judge0 — a hosted execution service is needed for real code
  execution. The default is Paiza, which needs no key and no local process;
  `EXECUTION_PROVIDER=mock` runs without any of them but fakes every verdict.
- Docker with Compose — optional, and only for the full topology below.
- Optional AI provider credentials, or Ollama for local AI

Do not run production builds from a cloud-synchronized directory on Windows. OneDrive can deny webpack's atomic writes to `.next`; use a normal local checkout or build inside Docker. The same applies to `node_modules`: continuous sync of ~25,000 small files makes every install and dev-server start noticeably slower.

### Minimal local setup (no Docker, no local services)

PostgreSQL is the only dependency you must supply. Point `DATABASE_URL` in
`scratch/.env.local` at any Postgres instance and start the app:

```ini
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
OPTIONAL_DEPENDENCIES=redis,piston,judge0,paiza
EXECUTION_PROVIDER=paiza
PAIZA_API_KEY=guest
PORT=3000
```

`?sslmode=require` is what supplies TLS: `pg` parses it out of the connection
string and it overrides any explicit `ssl` pool option, so no code change is
needed for a managed provider.

`OPTIONAL_DEPENDENCIES` downgrades the named readiness checks from blockers to
warnings. Without it, `/api/health/ready` returns 503 permanently because every
dependency check defaults to critical. The checks still run and still report
their real status either way.

In this configuration expect `/api/health/ready` to return 200 with status
`degraded`, listing Redis as a warning and Piston/Judge0 as `skipped` (only the
selected execution provider is probed). Code execution is real via Paiza; the SQL
sandbox is unavailable.

## Configuration

Copy `.env.example` and split the values as its comments describe:

- root `.env`: Compose infrastructure settings
- `scratch/.env`: AI provider settings
- `scratch/.env.local`: local backend/database URLs

Never commit those files. Provider keys must stay server-side; no frontend variable should contain an AI credential. Production startup requires a database URL and an explicit, non-wildcard CORS allow-list.

Any provider credentials previously placed in repository history must be rotated. Removing a value from the current template does not remove it from Git history.

## Install and run

```bash
npm install
npm run dev
```

The backend listens on port `3000`; Next.js listens on `5173`. The backend intentionally refuses to start when PostgreSQL is unreachable.

Docker development:

```bash
npm run compose:up
npm run compose:ps
npm run compose:logs
```

CPU-only Ollama override:

```bash
npm run compose:up:cpu
```

The full Compose topology contains privileged code-execution services. Run it only on a host intended for isolated execution workloads and replace every example password before exposure.

## Database

Schema/bootstrap files live under `scratch/server/`. Application startup runs the learning, auth, and domain bootstrap routines. Learning content can be validated and seeded with:

```bash
node scratch/server/scripts/validate-problem-schema.js
npm --workspace scratch run seed:learning
```

The validator applies its strict contract only to files declaring
`"schema_version": "2.0"` — today 11 files holding 36 of the 96 problems. The other 60
are in legacy v1 files that it skips, so a clean validator run says less than the
problem count suggests. Write new content as v2; the authoring pipeline below always
emits v2.

### Authoring new problems

Problems are **built from specs**, not hand-written as JSON:

```
server/data/learning/authoring/<topic>/<pattern>.mjs   ← the spec you write
        ↓  node server/scripts/build-authored-problems.js
server/data/learning/problems/<topic>/<pattern>.json   ← committed, seeded, validated
```

A spec carries the prose, two independently written reference solutions (JavaScript
and Python), a brute force, and a list of **input payloads with no expected outputs**.
The build computes every `expected_output` by running the references, and refuses to
write anything unless the JavaScript reference, the Python reference and the brute
force all agree on every case — and unless each worked example reproduces the answer
stated by hand in the spec. Agreement between two implementations catches typos;
agreement with a stated example catches misunderstanding the problem. Specs may also
declare an `assume` predicate, so a test case that contradicts the problem's own
constraints (an unsorted array on a problem promising sorted input) fails the build.

The build also emits `cpp_signature` and `starter_code.cpp`, so C++ support cannot be
lost by regenerating a file. Verify a batch end to end with:

```bash
node server/scripts/build-authored-problems.js        # references must agree
node server/scripts/validate-problem-schema.js
npm run seed:learning
node server/scripts/check-authored-problems.js        # graded through the real provider
node server/scripts/check-cpp-starters.js             # every C++ starter compiles
```

Use a dedicated database and back it up before applying schema changes. Live migration execution was not verified during the 2026-07-22 audit because PostgreSQL was unavailable.

## Quality gates

```bash
npm --workspace scratch run lint
npm --workspace scratch run typecheck
npm --workspace scratch test
npm run build
```

Playwright requires a working frontend, backend, database, and supporting services:

```bash
npm run dev
npm --workspace scratch run test:e2e
```

The release gate (`npm --workspace scratch run gate:release`) is a live-system gate, not an offline unit test. It expects both services plus AI and execution providers to be reachable.

## Security and operational behavior

- Private learning, submission, progress, profile, prediction, and admin APIs derive ownership from verified sessions.
- Anonymous AI requests are quota-keyed by a hash of the request IP; body-supplied user IDs are ignored.
- AI requests have short-window limits, daily request budgets, maximum concurrency, provider timeouts, bounded input sizes, and cached educational responses.
- A hosted sandbox (Paiza, Piston or Judge0) is required for untrusted code. There is no host-process fallback.
- Unknown routes return a structured JSON 404 with a request ID.
- Admin telemetry and execution history require both authentication and an `admin_users` role.

## Feature status

- Implemented: curriculum/problem browsing, learning engine APIs, editor UI, custom auth APIs, progress/analytics schemas, AI gateway, isolated execution adapters, Docker topology
- Partial/infrastructure-dependent: email delivery, password-reset delivery, AI answers, SQL sandbox, full dashboard persistence, production readiness probes
- Local-only today: the Problems-page quick status cache is device-local until its UI is migrated to the authenticated progress API
- Content limitation: `linked-list-cycle` and `linked-list-cycle-ii` pass their input
  as `{head: number[], pos: number}`, where `pos` names the cycle entry outright, so
  `return pos !== -1` scores full marks without implementing cycle detection. Their
  starters did not receive `pos` at all before 2026-08-30, which made them
  unsolvable; representing a real linked list needs a node type the execution
  harness has no encoding for yet.
- Verified against a live managed PostgreSQL instance (2026-08-27, counts updated
  2026-08-30): schema bootstrap (learning, auth, domain — 14 tables), curriculum
  seeding (17 topics, 108 patterns, **96 problems, 1,168 test cases**), the signup →
  login → session → logout round trip on the in-memory session fallback, and problem
  browsing/detail through the Next.js API proxy
- Content coverage (2026-08-30): 16 of 108 patterns have problems, and 9 of 17 topics
  are non-empty. Still empty: Basics, Sorting, Recursion, Heaps, Tries — and Linked
  List, Binary Trees and BST, which are blocked on a harness limitation rather than on
  authoring effort (see the handoff doc)
- Verified 2026-08-29: real code execution through Paiza against seeded test cases
  in JavaScript, Python and C++ — see the section below for exactly which problems
- Verified 2026-08-30: the authenticated HTTP submission path end to end — signup
  → login → `POST /api/learning/submit` → `Accepted 14/14` on `maximum-subarray`
  in JavaScript, Python and C++ (both the free-function and `class Solution`
  shapes), a wrong control solution correctly reported `Wrong Answer 2/14`, and
  all five attempts persisted and returned by `GET /api/learning/attempts/:id`
- Verified 2026-08-30: C++ is available on the whole curriculum — all 63 problems
  carry a `cpp_signature` (62 backfilled from the seeded test data), and 11 of them,
  chosen to cover every argument and return type the curriculum uses, were compiled
  and graded against their real seeded cases through Paiza with two near-miss
  control solutions correctly rejected
- Verified 2026-08-30: every problem opens with C++ starter code — all 96 carry a
  `starter_code.cpp` generated from their `cpp_signature`, all 96 compile through
  Paiza untouched (32 distinct argument/return type shapes between them), and
  `GET /api/learning/problem/:id` serves the `cpp` key alongside `javascript` and
  `python` on the running backend
- Verified 2026-08-30: 33 new problems across 8 previously-empty patterns, built
  through the authoring pipeline below. Every `expected_output` is computed by two
  independently written reference solutions plus a brute force that must agree, and
  cross-checked against hand-stated answers for each worked example. One problem per
  pattern was then graded through the real provider against its seeded cases:
  Accepted in both JavaScript and Python, with the untouched starter rejected
- Not verified: Redis session restoration, AI provider responses, SQL sandbox, and
  Playwright journeys

### Code execution status (2026-08-29)

Submissions run through `scratch/server/learning-engine/execution-engine.js`. The
provider is chosen by `EXECUTION_PROVIDER`:

- `paiza` — **the current default in this checkout, and real execution.**
  `https://api.paiza.io` with `api_key=guest`: free, no signup, no card, no quota.
  Verified end to end against the seeded database on 2026-08-29 (see below).
- `judge0` — real sandboxed execution, implemented and unit-tested against a fake
  Judge0 (`scratch/tests/unit/judge0-batch.test.js`: batch chunking, the
  create-then-poll flow, per-case Accepted / Wrong Answer / TLE / runtime and
  compile errors, partial batch rejection, float tolerance, and API-key
  redaction). **Not verified against the real RapidAPI host** — that needs a
  subscription key. Every hosted plan is paid; the cheapest documented tier is
  €27/month for 2000 submissions/day. Run `node server/scripts/check-judge0.js`
  once a key is in `scratch/.env.local`; it confirms auth, checks the hardcoded
  language IDs against `GET /languages`, and drives one real batch end to end.
- `mock` — reports a pass for any non-empty code without running it. Useful
  offline; it proves nothing about a solution, so it must never serve users.
- `piston` — the engine's built-in default, and **dead as a public service**: the
  free API at `emkc.org` went whitelist-only on 2026-02-15 and answers `/execute`
  with HTTP 401 (observed 2026-08-27). Only usable self-hosted.

Because the engine's built-in default is the dead one, `EXECUTION_PROVIDER` is
set explicitly in `scratch/.env.local` rather than left blank.

#### What was verified on Paiza (2026-08-29)

`node server/scripts/check-paiza.js` runs three programs per language — a correct
one, a wrong one, and one that throws — against synthetic cases and asserts the
verdicts. JavaScript, Python and C++ all pass.

Separately, real solutions were run against the **seeded test cases in the live
database**, covering every `expected_output` type the seed data uses:

| Problem | Cases | Languages | Result |
| --- | --- | --- | --- |
| `maximum-subarray` | 14 (9 hidden) | JS, Python, C++ | accepted |
| `valid-parentheses` | 15 (10 hidden) | JS, Python | accepted |
| `longest-substring-without-repeating-characters` | 15 (10 hidden) | Python | accepted |
| `maximum-average-subarray-i` | 12 (7 hidden) | JS | accepted (float tolerance) |
| `move-zeroes`, `reverse-string`, `two-sum-ii-sorted-array` | 12 each | JS, Python | accepted |

In every case a control solution returning `null` was rejected on all cases, which
is the behaviour `mock` gets wrong.

#### Paiza's two hard limits

1. **CPU is capped at exactly 1.00 second** and a caller cannot raise it —
   `EXECUTION_TIMEOUT_MS` does not apply. A correct but slow solution is reported
   as Time Limit Exceeded. This is the one real functional difference from Judge0,
   where `cpu_time_limit` is ours to set.
2. **There is no batch endpoint**, so each test case costs its own create plus
   polls (2 requests). Measured wall time for a 12-case problem: ~3s for
   JavaScript or Python, ~17s for C++ because it recompiles per case. Requests are
   free, so this is latency, not quota.

Stated plainly: this is an undocumented free endpoint with no published rate limit
and no terms covering production use. The public Piston API closed with no notice;
assume this one can too. If it does, the migration is a Judge0 key plus
`EXECUTION_PROVIDER=judge0` — the transport is already written and tested.

Paiza's runtimes are newer than paid Judge0 CE 1.13.x: Python 3.11.13,
Node 16.17.1, Clang 18/C++20, Java 18, Clang 14/C17, Mono. Judge0 CE pairs
language id 63 with Node 12.14.0 and id 71 with Python 3.8.1, so `?.`, `??` and
`match` are compile errors there but work on Paiza. `check-judge0.js` prints the
runtime names a live Judge0 instance actually reports, which is what should be
believed over this paragraph.

#### Language coverage

Language support in the engine today is JavaScript, Python and C++. All 63 problems
now carry the `cpp_signature` the C++ harness needs (62 of them backfilled on
2026-08-30 by `scratch/server/scripts/backfill-cpp-signatures.js`, which infers the
argument and return types from every seeded test case and refuses to guess rather
than emit a signature it cannot justify), and all 63 now also carry a
`starter_code.cpp` generated from that signature by
`scratch/server/scripts/backfill-cpp-starters.js`, so a C++ user opens the editor on
a declaration rather than a blank page. The harness accepts either a free function
or a `class Solution` method and picks the call shape from the submitted code, so
editing the starter into either style still works. C# is unreachable, C is currently
compiled as C++, and Java is absent. The problem UI offers all six, so three of them
will not behave until the remaining phases land.

The generated starter is deliberately `return {};` rather than an empty body: an
empty body with a non-void return type is undefined behaviour, so an untouched
starter would fail with a garbage value or a crash unrelated to the user's
reasoning. `node server/scripts/check-cpp-starters.js` submits every untouched
starter to the provider and asserts none of them is a compile error; it reads the
seed files rather than the database, so it needs no `DATABASE_URL`.

Readiness (`/api/health/ready`) probes only the provider `EXECUTION_PROVIDER`
selects; the others report `skipped` with the reason. Probing all of them meant a
working deployment still reported the unused ones as failing.

When Paiza's 1-second cap or its availability becomes the limiting factor, the
migration path is written up in
[`scratch/docs/self-hosting-judge0.md`](scratch/docs/self-hosting-judge0.md) —
including why it needs a Linux VM with cgroup v1 rather than a laptop, and what
regresses (Judge0 CE ships older runtimes than Paiza).

[`scratch/docs/project-state-2026-08-30.md`](scratch/docs/project-state-2026-08-30.md)
is the full handoff document: what is verified and by which command, how the execution
harness works, which languages actually run, the curriculum coverage gap, and the open
work in priority order. (An earlier `repository-audit-2026-07-22.md` is referenced by
the 2026-07-22 audit dates above but is not present in this checkout.)
