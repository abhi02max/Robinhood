import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 8000);
const TEST_USER_ID = process.env.SMOKE_USER_ID || 'smoke-user-001';

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

function resolvePort() {
  if (process.env.SMOKE_API_BASE_URL) return null;
  if (process.env.PORT) return Number(process.env.PORT);
  const envMerged = {
    ...readEnvFile(path.join(APP_ROOT, '.env')),
    ...readEnvFile(path.join(APP_ROOT, '.env.local')),
  };
  const parsed = Number(envMerged.PORT || 3000);
  return Number.isFinite(parsed) ? parsed : 3000;
}

function buildBaseUrlCandidates() {
  if (process.env.SMOKE_API_BASE_URL) return [process.env.SMOKE_API_BASE_URL];
  const port = resolvePort() || 3000;
  return [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];
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
  const url = `${baseUrl}${pathName}`;
  const response = await withTimeout(
    fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    REQUEST_TIMEOUT_MS,
  );

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findReachableBaseUrl(candidates) {
  const failures = [];
  for (const baseUrl of candidates) {
    try {
      const health = await requestJson(baseUrl, '/api/health');
      if (health.response.ok && health.data?.status === 'ok') {
        return { baseUrl, health };
      }
      failures.push(`${baseUrl} -> HTTP ${health.response.status}`);
    } catch (error) {
      const msg = error?.cause?.message || error?.message || String(error);
      failures.push(`${baseUrl} -> ${msg}`);
    }
  }
  return { baseUrl: null, failures };
}

async function main() {
  const candidates = buildBaseUrlCandidates();
  const found = await findReachableBaseUrl(candidates);
  if (!found.baseUrl) {
    throw new Error(`API unreachable. Tried: ${found.failures.join(' | ')}`);
  }

  const BASE_URL = found.baseUrl;
  console.log(`API smoke checking ${BASE_URL} with user "${TEST_USER_ID}"`);
  console.log('PASS /api/health');

  const session = await requestJson(BASE_URL, '/api/learn/session', {
    method: 'POST',
    body: { userId: TEST_USER_ID },
  });
  assert(session.response.ok, `/api/learn/session failed with ${session.response.status}`);
  assert(typeof session.data?.token === 'string' && session.data.token.length > 10, 'Session token missing');
  const token = session.data.token;
  console.log('PASS /api/learn/session');

  const authHeaders = { Authorization: `Bearer ${token}` };
  const progressPath = `/api/learn/progress/${encodeURIComponent(TEST_USER_ID)}`;

  const initialProgress = await requestJson(BASE_URL, progressPath, { headers: authHeaders });
  assert(initialProgress.response.ok, `GET ${progressPath} failed with ${initialProgress.response.status}`);
  assert(typeof initialProgress.data?.exists === 'boolean', 'Initial progress payload invalid');
  console.log(`PASS GET ${progressPath}`);

  const payload = {
    state: {
      completedTopics: { cn_dns: true },
      subjectProgress: { cn: 12 },
      quizScores: { cn_dns_intro: 80 },
      bookmarks: ['cn_dns'],
      revisionQueue: [{ topicId: 'cn_dns', dueAt: new Date(Date.now() + 86400000).toISOString() }],
    },
    updatedAt: new Date().toISOString(),
  };

  const saveProgress = await requestJson(BASE_URL, progressPath, {
    method: 'PUT',
    headers: authHeaders,
    body: payload,
  });
  assert(saveProgress.response.ok, `PUT ${progressPath} failed with ${saveProgress.response.status}`);
  assert(saveProgress.data?.ok === true, 'PUT progress did not return ok=true');
  console.log(`PASS PUT ${progressPath}`);

  const verifyProgress = await requestJson(BASE_URL, progressPath, { headers: authHeaders });
  assert(verifyProgress.response.ok, `GET verify ${progressPath} failed with ${verifyProgress.response.status}`);
  assert(verifyProgress.data?.exists === true, 'Saved progress not found on verify read');
  assert(verifyProgress.data?.state?.completedTopics?.cn_dns === true, 'Saved state mismatch on verify read');
  console.log(`PASS verify GET ${progressPath}`);

  const unauthRead = await requestJson(BASE_URL, progressPath);
  assert(unauthRead.response.status === 401, `Expected 401 without token, got ${unauthRead.response.status}`);
  console.log('PASS unauthorized guard');

  console.log('\nAll API smoke checks passed.');
}

main().catch((error) => {
  const message = error?.message || String(error);
  if (/ECONNREFUSED|fetch failed|connect|API unreachable/i.test(message)) {
    console.error('API smoke checks failed: backend is unreachable.');
    console.error('Tip: smoke script auto-detects port from scratch/.env.local PORT, then tries localhost and 127.0.0.1.');
    console.error('Start backend first with one of:');
    console.error('  npm run server');
    console.error('  npm run dev:all');
    console.error('Then re-run: npm run smoke:api');
    console.error(`Details: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.error('API smoke checks failed:', message);
  process.exitCode = 1;
});

