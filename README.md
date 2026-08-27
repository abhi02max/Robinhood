# Robinhood

Robinhood is an AI-assisted DSA and interview-preparation platform. The repository is an npm workspace: the runnable application is in `scratch/`, while root-level scripts orchestrate local development and Docker services.

## Architecture

- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind/PostCSS, legacy DOM page adapters, Monaco editor
- Backend: Express 5 on Node.js, Zod startup validation, structured JSON APIs
- Data: PostgreSQL through `pg`; SQL bootstrap schemas and seed scripts under `scratch/server/`
- Authentication: custom bearer sessions backed by Redis with an in-memory development fallback; bcrypt password hashes
- AI: server-side Gemini, OpenRouter, and Ollama adapters with caching, per-actor rate limits, daily quotas, global concurrency limits, provider timeouts, and fallbacks
- Code execution: isolated Piston and Judge0 services; the application does not execute user code locally
- Tests: Node test runner for unit tests and Playwright for browser flows
- Deployment: Docker Compose for PostgreSQL, Redis, backend, frontend, Caddy, Piston, Judge0, and the SQL sandbox

## Prerequisites

- Node.js 20 or newer and npm
- A PostgreSQL 16 database. **Required** — the backend exits if it cannot connect.
  This can be a managed instance (Neon, Supabase, RDS); nothing needs to run locally.
- Redis 7 — optional. Sessions fall back to in-memory storage when it is absent.
- Piston/Judge0 — optional. Needed only for real code execution; `EXECUTION_PROVIDER=mock`
  runs without them.
- Docker with Compose — optional, and only for the full topology below.
- Optional AI provider credentials, or Ollama for local AI

Do not run production builds from a cloud-synchronized directory on Windows. OneDrive can deny webpack's atomic writes to `.next`; use a normal local checkout or build inside Docker. The same applies to `node_modules`: continuous sync of ~25,000 small files makes every install and dev-server start noticeably slower.

### Minimal local setup (no Docker, no local services)

PostgreSQL is the only dependency you must supply. Point `DATABASE_URL` in
`scratch/.env.local` at any Postgres instance and start the app:

```ini
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
OPTIONAL_DEPENDENCIES=redis,piston,judge0
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
`degraded`, listing Redis/Piston/Judge0 as warnings. Code execution uses the mock
provider, and the SQL sandbox is unavailable.

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
- Piston/Judge0 are required for untrusted code. There is no host-process fallback.
- Unknown routes return a structured JSON 404 with a request ID.
- Admin telemetry and execution history require both authentication and an `admin_users` role.

## Feature status

- Implemented: curriculum/problem browsing, learning engine APIs, editor UI, custom auth APIs, progress/analytics schemas, AI gateway, isolated execution adapters, Docker topology
- Partial/infrastructure-dependent: email delivery, password-reset delivery, AI answers, code execution, SQL sandbox, full dashboard persistence, production readiness probes
- Local-only today: the Problems-page quick status cache is device-local until its UI is migrated to the authenticated progress API
- Verified against a live managed PostgreSQL instance (2026-08-27): schema bootstrap
  (learning, auth, domain — 14 tables), curriculum seeding (17 topics, 108 patterns,
  63 problems, 764 test cases), the signup → login → session → logout round trip on
  the in-memory session fallback, and problem browsing/detail through the Next.js
  API proxy
- Not verified: Redis session restoration, Piston/Judge0 correctness, AI provider
  responses, SQL sandbox, and Playwright journeys

See [`scratch/docs/repository-audit-2026-07-22.md`](scratch/docs/repository-audit-2026-07-22.md) for the evidence-based repair log and verification record.
