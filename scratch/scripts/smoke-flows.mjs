import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const TEST_USER_ID = process.env.SMOKE_USER_ID || 'smoke-flow-user-001';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

function resolveApiPort() {
  if (process.env.SMOKE_API_BASE_URL) return null;
  if (process.env.PORT) return Number(process.env.PORT);
  const envMerged = {
    ...readEnvFile(path.join(APP_ROOT, '.env')),
    ...readEnvFile(path.join(APP_ROOT, '.env.local')),
  };
  const parsed = Number(envMerged.PORT || 3000);
  return Number.isFinite(parsed) ? parsed : 3000;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const err = new Error(`Timed out after ${timeoutMs}ms`);
      err.name = 'TimeoutError';
      setTimeout(() => reject(err), timeoutMs);
    }),
  ]);
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await withTimeout(
    fetch(`${baseUrl}${pathName}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    REQUEST_TIMEOUT_MS,
  );
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { response, data, raw };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatusIn(response, allowed, message) {
  if (!allowed.includes(response.status)) {
    throw new Error(`${message} (got ${response.status}, expected ${allowed.join('/')})`);
  }
}

async function findApiBaseUrl() {
  if (process.env.SMOKE_API_BASE_URL) return process.env.SMOKE_API_BASE_URL;
  const p = resolveApiPort() || 3000;
  const candidates = [`http://127.0.0.1:${p}`, `http://localhost:${p}`, 'http://127.0.0.1:3000'];
  for (const base of candidates) {
    try {
      const health = await requestJson(base, '/api/health');
      if (health.response.ok && health.data?.status === 'ok') return base;
    } catch {
      // continue
    }
  }
  throw new Error(`Unable to find reachable API base URL from candidates: ${candidates.join(', ')}`);
}

async function main() {
  const base = await findApiBaseUrl();
  console.log(`Flow smoke against ${base} as ${TEST_USER_ID}`);

  const session = await requestJson(base, '/api/learn/session', {
    method: 'POST',
    body: { userId: TEST_USER_ID },
  });
  assert(session.response.ok, `learn session failed (${session.response.status})`);
  assert(typeof session.data?.token === 'string' && session.data.token.length > 10, 'learn session token missing');
  const token = session.data.token;
  const auth = { Authorization: `Bearer ${token}` };
  console.log('PASS session bootstrap');

  const analytics = await requestJson(base, `/api/dashboard/analytics/${encodeURIComponent(TEST_USER_ID)}`, { headers: auth });
  assert(analytics.response.ok, `analytics failed (${analytics.response.status})`);
  assert(analytics.data?.ok === true, 'analytics payload missing ok=true');
  assert(Array.isArray(analytics.data?.todayPlan), 'analytics todayPlan missing');
  console.log('PASS dashboard analytics flow');

  const graph = await requestJson(base, '/api/curriculum/graph', { headers: auth });
  assertStatusIn(graph.response, [200, 401], 'curriculum graph request failed');
  if (graph.response.status === 200) {
    assert(Array.isArray(graph.data?.nodes), 'curriculum graph nodes missing');
    console.log('PASS curriculum graph (200)');
  } else {
    console.log('PASS curriculum graph auth guard (401)');
  }

  const lessons = await requestJson(base, '/api/topics/cn-basics/lessons', { headers: auth });
  assertStatusIn(lessons.response, [200, 401], 'topic lessons request failed');
  if (lessons.response.status === 200) {
    assert(typeof lessons.data?.total === 'number', 'topic lessons total missing');
    console.log('PASS topic lessons endpoint (200)');
  } else {
    console.log('PASS topic lessons auth guard (401)');
  }

  const problems = await requestJson(base, '/api/problems?company=google&category=arrays', { headers: auth });
  assertStatusIn(problems.response, [200, 401], 'problems filter request failed');
  if (problems.response.status === 200) {
    assert(problems.data?.ok === true, 'problems payload missing ok=true');
    assert(Array.isArray(problems.data?.items), 'problems items missing');
    console.log('PASS problems filter endpoint (200)');
  } else {
    console.log('PASS problems auth guard (401)');
  }

  const unsupported = await requestJson(base, '/api/code/execute', {
    method: 'POST',
    headers: auth,
    body: { language: 'ruby', codeSnippet: 'puts 1', testInput: '', expectedOutput: '1', mode: 'run' },
  });
  assertStatusIn(unsupported.response, [400, 401], 'unsupported language guard failed');
  console.log(`PASS code execute validation/auth guard (${unsupported.response.status})`);

  const validRun = await requestJson(base, '/api/code/execute', {
    method: 'POST',
    headers: auth,
    body: {
      language: 'javascript',
      codeSnippet: 'console.log("3")',
      testInput: '',
      expectedOutput: '3',
      mode: 'run',
    },
  });
  assertStatusIn(validRun.response, [200, 401], 'valid execute request failed');
  if (validRun.response.status === 200) {
    assert(typeof validRun.data?.verdict === 'string', 'valid execute verdict missing');
    console.log(`PASS code execution flow (${validRun.data?.verdict || 'unknown'})`);
  } else {
    console.log('PASS code execution auth guard (401)');
  }

  const aiHealth = await requestJson(base, '/api/ai/health');
  assert(aiHealth.response.status === 200 || aiHealth.response.status === 500, `ai health unexpected status ${aiHealth.response.status}`);
  console.log(`PASS ai health endpoint reachable (${aiHealth.response.status})`);

  console.log('\nAll flow smoke checks passed.');
}

main().catch((error) => {
  console.error('Flow smoke failed:', error?.message || String(error));
  process.exitCode = 1;
});
