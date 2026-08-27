# Real Code Execution Engine

`execution-engine.js` replaces the deterministic `execution-mock.js` stub with a
real, sandboxed code runner. Two providers are supported out of the box; the
service layer doesn't need to know which one is active.

| Provider | URL                                 | Auth        | Setup time | Notes                                        |
|----------|-------------------------------------|-------------|------------|----------------------------------------------|
| `piston` | `https://emkc.org/api/v2/piston`    | none        | 0 min      | **Default.** Free, public, rate-limited.     |
| `judge0` | `https://judge0-ce.p.rapidapi.com`  | RapidAPI    | ~5 min     | Pay-as-you-go; or self-host via Docker.      |
| `mock`   | local                               | none        | 0 min      | Offline / CI fallback. No real execution.    |

## API contract (unchanged)

The HTTP shape returned by `POST /api/learning/submit` is preserved. New fields
are additive:

```jsonc
{
  "submission_id": "...",
  "status": "Accepted" | "Wrong Answer" | "Runtime Error" | "Time Limit Exceeded",
  "passed": true,
  "pass_count": 9,
  "total_cases": 12,
  "failed_test_case": {
    "test_index": 5,
    "is_hidden": false,
    "error_kind": "wrong_answer" | "runtime_error" | "compile_error" | "time_limit_exceeded" | "harness_error",
    "input":    { "nums": [1,2,3], "k": 2 },
    "expected": 6,
    "actual":   5,
    "stderr":   "RuntimeError: ...",
    "message":  "Failed on test case #6"
  },
  "runtime_ms":  742,
  "memory_bytes": 12582912,
  "language":    "javascript",
  "provider":    "piston",
  "created_at":  "..."
}
```

## Calling convention for user code

The user's code defines a function whose **parameter names equal the keys** of
each test case's `input_payload` object (this is exactly how the seeded starter
snippets are written, e.g. `function numSubarraysWithSum(nums, goal)` for
`{ "nums": [...], "goal": 2 }`).

The engine:

1. Parses the user's source to find the **last** top-level
   `function` / `def` / arrow-function declaration → uses that as the entry
   point.
2. Wraps the source with a harness that reads stdin (one test case's
   `input_payload` as JSON), calls the entry function with arguments in
   declaration order, and writes the JSON-stringified return between
   `<<<OUT>>>…<<<END>>>` sentinels on stdout.
3. Sends the wrapped program to the configured provider once **per test case**
   (with bounded parallelism — see `EXECUTION_CONCURRENCY`).
4. Compares parsed stdout against `expected_output` via deep equality.

If the entry point can't be located (user submitted gibberish), every test
case is marked failed with `error_kind = "compile_error"` and a clear
explanation in `stderr` — no executor calls are made, no submission row is
silently lost.

## Required environment variables

| Variable                | Default                              | Purpose                                       |
|-------------------------|--------------------------------------|-----------------------------------------------|
| `EXECUTION_PROVIDER`    | `piston`                             | `piston` \| `judge0` \| `mock`                 |
| `EXECUTION_TIMEOUT_MS`  | `5000`                               | Per-test wall-clock budget (ms)               |
| `EXECUTION_CONCURRENCY` | `4`                                  | Parallel test submissions per `runExecution`  |
| `EXECUTION_MEMORY_MB`   | `256`                                | Memory cap per test                           |
| `PISTON_URL`            | `https://emkc.org/api/v2/piston`     | Override for self-hosted Piston               |
| `JUDGE0_URL`            | `https://judge0-ce.p.rapidapi.com`   | Judge0 base URL                               |
| `JUDGE0_API_KEY`        | _(empty)_                            | RapidAPI key (skip if self-hosting)           |
| `JUDGE0_API_HOST`       | `judge0-ce.p.rapidapi.com`           | RapidAPI host header                          |

Add the relevant lines to your existing `.env`:

```dotenv
# --- Execution engine ---
EXECUTION_PROVIDER=piston
EXECUTION_TIMEOUT_MS=5000
EXECUTION_CONCURRENCY=4
EXECUTION_MEMORY_MB=256

# Optional: switch to Judge0
# EXECUTION_PROVIDER=judge0
# JUDGE0_URL=https://judge0-ce.p.rapidapi.com
# JUDGE0_API_KEY=__rapidapi_key__
# JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

## Setup — Step by Step

### Option A: Piston (recommended, 0-config)

1. Set in `.env`:
   ```dotenv
   EXECUTION_PROVIDER=piston
   ```
2. Restart the API server: `npm run server`.
3. Smoke-test:
   ```powershell
   curl -X POST http://localhost:3000/api/learning/submit `
     -H "Content-Type: application/json" `
     -d '{
       "problem_id": "<any-uuid-from-problems>",
       "language":   "javascript",
       "code":       "function solve(){ return 42; }"
     }'
   ```

The free Piston public endpoint is rate-limited (~5 req/sec). For production,
self-host via Docker:

```powershell
docker run -d --name piston `
  -p 2000:2000 `
  --privileged `
  ghcr.io/engineer-man/piston
```

Then set `PISTON_URL=http://localhost:2000/api/v2`.

### Option B: Judge0 via RapidAPI

1. Sign up at <https://rapidapi.com/judge0-official/api/judge0-ce>.
2. Subscribe to a Judge0 CE plan (free tier available).
3. Copy the API key from the RapidAPI dashboard.
4. Set in `.env`:
   ```dotenv
   EXECUTION_PROVIDER=judge0
   JUDGE0_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=<paste-from-rapidapi>
   JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
   ```
5. Restart the API server.

### Option C: Self-hosted Judge0

Follow <https://github.com/judge0/judge0/blob/master/CHANGELOG.md> for the
official Docker Compose stack. Once running on `http://localhost:2358`:

```dotenv
EXECUTION_PROVIDER=judge0
JUDGE0_URL=http://localhost:2358
# leave JUDGE0_API_KEY unset
```

### Option D: Mock (offline / CI)

```dotenv
EXECUTION_PROVIDER=mock
```

Useful when running tests without internet access. Behaves exactly like the
old `execution-mock.js` stub and reports `provider: "mock"` in the response.

## Language map

| Frontend value | Piston           | Judge0 ID | Notes                  |
|----------------|------------------|-----------|------------------------|
| `javascript`   | `javascript:*`   | `63`      | Node.js                |
| `python`       | `python:*`       | `71`      | Python 3               |

To add a new language, update both `PISTON_LANG` and `JUDGE0_LANG_ID` in
`execution-engine.js` and add to `SUPPORTED_LANGUAGES`.

## Performance & safety guarantees

- **Bounded parallelism**: `EXECUTION_CONCURRENCY` parallel HTTP requests max,
  protecting both the provider and the API server from runaway fan-out.
- **HTTP-level timeout**: every request to the executor is wrapped in
  `withTimeout` so a hung provider can never block the API.
- **No `eval`**, no `vm.runInThisContext`, no `child_process` of user code on
  the API server. All execution is delegated to a sandboxed, isolated remote
  runtime.
- **Hidden-test redaction** is enforced in the service layer **before** the
  response leaves the server — `input`, `expected`, `actual`, and `stderr` are
  all nulled when the failed case is hidden.
- **Code size cap**: 100 KB at the service boundary (rejected with
  `ValidationError` before any executor work happens).

## How the file is wired

```
  POST /api/learning/submit
        │
        ▼
  learning-router.js
        │
        ▼
  learning-controller.js   (validates body)
        │
        ▼
  learning-service.js   ──▶  execution-engine.js  ──▶  Piston | Judge0 | Mock
                                  │
                                  ▼
                           harness builder (per-language)
```

`execution-mock.js` is **kept** because the engine delegates to it when
`EXECUTION_PROVIDER=mock`, but it is no longer the default code path.
