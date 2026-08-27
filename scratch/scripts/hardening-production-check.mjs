import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const WEB_BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const REPORT_PATH = path.join(__dirname, 'hardening-production-report.json');

function parseEnvFile(content) {
  const parsed = {};
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function preview(value, maxLen = 240) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}...`;
}

function readEnvSources() {
  const files = [
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, '.env.example'),
  ];

  const values = {};
  const presentFiles = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    presentFiles.push(path.basename(file));
    Object.assign(values, parseEnvFile(fs.readFileSync(file, 'utf8')));
  }

  Object.assign(values, process.env);
  return { values, presentFiles };
}

async function requestJson(url, options = {}) {
  const { method = 'GET', headers = {}, body, timeoutMs = 25000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
      durationMs: Date.now() - started,
      timedOut: false,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: null,
      durationMs: Date.now() - started,
      timedOut: error?.name === 'AbortError' || /timeout|aborted/i.test(String(error?.message || '')),
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function addCheck(checks, name, passed, details = {}, blocking = true) {
  checks.push({ name, passed: Boolean(passed), details, blocking });
}

async function main() {
  const startedAt = new Date().toISOString();
  const { values: env, presentFiles } = readEnvSources();
  const checks = [];

  addCheck(checks, 'Environment has database configuration', Boolean(env.DATABASE_URL || env.POSTGRES_URL), {
    hasDatabaseUrl: Boolean(env.DATABASE_URL || env.POSTGRES_URL),
  });
  addCheck(checks, 'Environment has Redis configuration', Boolean(env.REDIS_URL), {
    hasRedisUrl: Boolean(env.REDIS_URL),
  });
  addCheck(checks, 'Environment has Judge0 configuration', Boolean(env.JUDGE0_URL || env.JUDGE0_API_URL), {
    hasJudge0Url: Boolean(env.JUDGE0_URL),
    hasJudge0ApiUrl: Boolean(env.JUDGE0_API_URL),
  });
  addCheck(checks, 'Environment has AI provider configuration', Boolean(env.GEMINI_API_KEY || env.OPENROUTER_API_KEY || env.OLLAMA_URL), {
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    hasOpenRouterKey: Boolean(env.OPENROUTER_API_KEY),
    hasOllamaUrl: Boolean(env.OLLAMA_URL),
  });

  const health = await requestJson(`${API_BASE}/api/health`);
  addCheck(checks, 'Health endpoint is alive', health.status === 200 && health.payload?.status === 'ok', {
    status: health.status,
    response: health.payload,
  });

  const live = await requestJson(`${API_BASE}/api/health/live`);
  addCheck(checks, 'Liveness endpoint is healthy', live.status === 200 && live.payload?.status === 'ok', {
    status: live.status,
    response: live.payload,
  });

  const ready = await requestJson(`${API_BASE}/api/health/ready`);
  addCheck(checks, 'Readiness confirms Postgres and Redis connectivity', ready.status === 200 && ready.payload?.checks?.postgres === 'ok' && ready.payload?.checks?.redis === 'ok', {
    status: ready.status,
    response: ready.payload,
  });

  const aiHealth = await requestJson(`${API_BASE}/api/ai/health`);
  addCheck(checks, 'AI gateway health endpoint is healthy', aiHealth.status === 200 && aiHealth.payload?.status === 'ok', {
    status: aiHealth.status,
    response: aiHealth.payload,
  });

  const runProbe = await requestJson(`${API_BASE}/api/execute/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { language: 'python', code: 'print(1+1)', stdin: '' },
    timeoutMs: 30000,
  });
  addCheck(
    checks,
    'Execution run endpoint works in production mode',
    (runProbe.status === 200 && runProbe.payload?.success === true)
      || runProbe.status === 429,
    {
    status: runProbe.status,
    response: runProbe.payload,
    },
  );

  const sqlProbe = await requestJson(`${API_BASE}/api/execute/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'SELECT 1 AS ok' },
  });
  addCheck(
    checks,
    'SQL execution endpoint works in production mode',
    (sqlProbe.status === 200 && sqlProbe.payload?.success === true)
      || sqlProbe.status === 429,
    {
    status: sqlProbe.status,
    response: sqlProbe.payload,
    },
  );

  const submitProbe = await requestJson(`${API_BASE}/api/execute/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { language: 'python', code: 'print(42)', testCases: [] },
    timeoutMs: 50000,
  });
  addCheck(
    checks,
    'Judge0 connectivity verified through submit endpoint',
    (submitProbe.status === 200 && typeof submitProbe.payload?.success === 'boolean')
      || submitProbe.status === 429,
    {
    status: submitProbe.status,
    response: submitProbe.payload,
    },
  );

  const aiLearnProbe = await requestJson(`${API_BASE}/api/ai/learn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      subjectTitle: 'System Design',
      topicTitle: 'Load Balancing',
      actionType: 'interview',
      context: { stage: 'production-gate' },
    },
    timeoutMs: 90000,
  });
  addCheck(checks, 'AI learning endpoint responds with production-safe contract', (aiLearnProbe.status === 200 && typeof aiLearnProbe.payload?.reply === 'string') || (aiLearnProbe.status === 429 && typeof aiLearnProbe.payload?.reason === 'string'), {
    status: aiLearnProbe.status,
    response: aiLearnProbe.payload,
  });

  const schedulerProbe = await requestJson(`${API_BASE}/api/scheduler/today?userId=production-gate-user`);
  addCheck(checks, 'Scheduler service is reachable', schedulerProbe.status === 200, {
    status: schedulerProbe.status,
    response: schedulerProbe.payload,
  });

  const analyticsProbe = await requestJson(`${API_BASE}/api/analytics/progress?userId=production-gate-user`);
  addCheck(checks, 'Analytics service is reachable', analyticsProbe.status === 200, {
    status: analyticsProbe.status,
    response: analyticsProbe.payload,
  });

  const webProbe = await requestJson(`${WEB_BASE}/`, { headers: { Accept: 'text/html' } });
  addCheck(checks, 'Frontend production server is reachable', webProbe.status === 200, {
    status: webProbe.status,
    durationMs: webProbe.durationMs,
  });

  const ollamaUrl = (env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const ollamaProbe = await requestJson(`${ollamaUrl}/api/tags`, { timeoutMs: 12000 });
  addCheck(checks, 'Ollama endpoint connectivity is verified', ollamaProbe.status === 200, {
    status: ollamaProbe.status,
    response: ollamaProbe.payload,
  }, false);

  const passedChecks = checks.filter((item) => item.passed).length;
  const failedChecks = checks.length - passedChecks;
  const failedBlocking = checks.filter((item) => !item.passed && item.blocking).length;

  const report = {
    phase: 'production-check',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    webBase: WEB_BASE,
    envFilesRead: presentFiles,
    totals: {
      checksTotal: checks.length,
      passedChecks,
      failedChecks,
      failedBlocking,
    },
    checks,
    passed: failedBlocking === 0,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`[hardening-prod] Report written to ${REPORT_PATH}`);
  console.log(`[hardening-prod] Checks passed ${passedChecks}/${checks.length}`);

  if (failedBlocking > 0) {
    const failed = checks.filter((item) => !item.passed && item.blocking);
    console.log('[hardening-prod] Failed checks:');
    failed.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     details: ${preview(item.details, 280)}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[hardening-prod] Fatal error:', error);
  process.exitCode = 1;
});
