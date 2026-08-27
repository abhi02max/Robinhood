import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const WEB_BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';
const QA_USER_ID = process.env.HARDENING_QA_USER_ID || 'hardening-user-01';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'hardening-edge-report.json');

function safePreview(value, max = 180) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function addResult(results, name, passed, details = {}, blocking = true) {
  results.push({
    name,
    passed: Boolean(passed),
    blocking: Boolean(blocking),
    details,
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 30000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildSeedState(userId) {
  return {
    user: {
      id: userId,
      name: 'Hardening QA',
      email: 'hardening.qa@example.com',
      joinDate: new Date().toISOString().split('T')[0],
    },
    sessionToken: null,
    preferences: {
      theme: 'dark',
      sidebarCollapsed: false,
      soundEnabled: false,
      editor: {
        fontSize: 14,
        wordWrap: 'off',
        tabSize: 4,
      },
    },
    progress: {
      a1: {
        status: 'attempted',
        language: 'javascript',
      },
    },
  };
}

const INIT_SCRIPT = (seed) => {
  localStorage.setItem('robinhood_data', JSON.stringify(seed));

  if (window.__hardeningListenerPatchInstalled) return;
  window.__hardeningListenerPatchInstalled = true;

  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const registry = new WeakMap();
  let duplicateCount = 0;

  const toCapture = (options) => {
    if (typeof options === 'boolean') return options;
    if (!options || typeof options !== 'object') return false;
    return Boolean(options.capture);
  };

  EventTarget.prototype.addEventListener = function patchedAdd(type, listener, options) {
    try {
      if (listener) {
        const capture = toCapture(options);
        let byEvent = registry.get(this);
        if (!byEvent) {
          byEvent = new Map();
          registry.set(this, byEvent);
        }
        const key = `${type}|${capture ? 'capture' : 'bubble'}`;
        let countByListener = byEvent.get(key);
        if (!countByListener) {
          countByListener = new Map();
          byEvent.set(key, countByListener);
        }
        const existing = countByListener.get(listener) || 0;
        if (existing > 0) duplicateCount += 1;
        countByListener.set(listener, existing + 1);
      }
    } catch {
      // Ignore instrumentation errors.
    }

    return originalAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function patchedRemove(type, listener, options) {
    try {
      if (listener) {
        const capture = toCapture(options);
        const byEvent = registry.get(this);
        if (byEvent) {
          const key = `${type}|${capture ? 'capture' : 'bubble'}`;
          const countByListener = byEvent.get(key);
          if (countByListener && countByListener.has(listener)) {
            const next = (countByListener.get(listener) || 1) - 1;
            if (next <= 0) countByListener.delete(listener);
            else countByListener.set(listener, next);
          }
        }
      }
    } catch {
      // Ignore instrumentation errors.
    }

    return originalRemove.call(this, type, listener, options);
  };

  window.__hardeningListenerDiagnostics = () => ({ duplicateCount });
};

async function runApiEdgeCases(results) {
  const codeEmpty = await requestJson(`${API_BASE}/api/code/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {},
  });
  addResult(
    results,
    'Empty execution payload returns validation error',
    codeEmpty.status === 400 && isObject(codeEmpty.payload) && codeEmpty.payload.errorType === 'REQUEST_ERROR',
    { status: codeEmpty.status, response: safePreview(codeEmpty.payload) },
  );

  const codeNull = await requestJson(`${API_BASE}/api/code/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      language: 'javascript',
      codeSnippet: null,
      testInput: '',
      expectedOutput: '',
    },
  });
  addResult(
    results,
    'Null code payload is rejected safely',
    codeNull.status === 400 && isObject(codeNull.payload),
    { status: codeNull.status, response: safePreview(codeNull.payload) },
  );

  const unsupportedLanguage = await requestJson(`${API_BASE}/api/code/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      language: 'ruby',
      codeSnippet: 'puts 1',
      testInput: '',
      expectedOutput: '1',
    },
  });
  addResult(
    results,
    'Unsupported language returns explicit guidance',
    unsupportedLanguage.status === 400
      && isObject(unsupportedLanguage.payload)
      && Array.isArray(unsupportedLanguage.payload.supportedLanguages),
    { status: unsupportedLanguage.status, response: safePreview(unsupportedLanguage.payload) },
  );

  const invalidAuth = await requestJson(`${API_BASE}/api/learn/progress/${QA_USER_ID}`, {
    headers: { Authorization: 'Bearer invalid-hardening-token' },
  });
  addResult(
    results,
    'Invalid learning auth token is rejected',
    invalidAuth.status === 401
      && isObject(invalidAuth.payload)
      && String(invalidAuth.payload.reason || '').toLowerCase().includes('invalid'),
    { status: invalidAuth.status, response: safePreview(invalidAuth.payload) },
  );

  const expiredAuth = await requestJson(`${API_BASE}/api/dashboard/analytics/${QA_USER_ID}`, {
    headers: { Authorization: 'Bearer expired-hardening-token' },
  });
  addResult(
    results,
    'Expired learning auth token is rejected',
    expiredAuth.status === 401
      && isObject(expiredAuth.payload)
      && /expired|invalid/i.test(String(expiredAuth.payload.reason || '')),
    { status: expiredAuth.status, response: safePreview(expiredAuth.payload) },
  );

  let timeoutProbe = { status: 0, timedOut: false, error: null };
  try {
    timeoutProbe = await requestJson(`${API_BASE}/api/health`, { timeoutMs: 1 });
  } catch (error) {
    timeoutProbe = {
      status: 0,
      timedOut: true,
      error: String(error?.message || error),
    };
  }

  const networkTimeoutObserved = timeoutProbe.timedOut === true || timeoutProbe.status === 0;
  addResult(
    results,
    'Network timeout path is handled by client harness',
    networkTimeoutObserved,
    {
      timeoutObserved: networkTimeoutObserved,
      status: timeoutProbe.status,
      timedOut: timeoutProbe.timedOut,
      error: timeoutProbe.error,
    },
    false,
  );

  const aiPayload = {
    subjectTitle: 'Operating Systems',
    topicTitle: 'Scheduling',
    actionType: 'doubt',
    context: { stage: 'hardening-edge-case' },
  };

  let aiGraceful = false;
  let aiDetails = {};
  try {
    const aiResponse = await requestJson(`${API_BASE}/api/ai/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: aiPayload,
      timeoutMs: 60,
    });
    const structured = isObject(aiResponse.payload);
    aiGraceful = [200, 429, 500].includes(aiResponse.status) && structured;
    aiDetails = {
      status: aiResponse.status,
      response: safePreview(aiResponse.payload),
      mode: 'structured-response',
    };
  } catch (error) {
    aiGraceful = error?.name === 'AbortError' || /timeout|aborted/i.test(String(error?.message || ''));
    aiDetails = {
      mode: 'client-timeout',
      message: String(error?.message || error),
    };
  }
  addResult(results, 'AI timeout or fallback path is graceful', aiGraceful, aiDetails);

  const judge0Timeout = await requestJson(`${API_BASE}/api/execute/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      language: 'python',
      code: 'while True:\n  pass',
      testCases: [{ input: '', output: '' }],
    },
    timeoutMs: 55000,
  });
  const judge0Signal = `${judge0Timeout.payload?.verdict || ''} ${judge0Timeout.payload?.error || ''}`;
  addResult(
    results,
    'Judge0 timeout/failure path returns controlled response',
    judge0Timeout.status === 200
      && isObject(judge0Timeout.payload)
      && judge0Timeout.payload.success === false
      && /time|timeout|failed|error|limit/i.test(judge0Signal),
    { status: judge0Timeout.status, response: safePreview(judge0Timeout.payload) },
  );

  const sqlSyntax = await requestJson(`${API_BASE}/api/execute/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'SELEC invalid syntax FROM' },
  });
  addResult(
    results,
    'SQL invalid statements are blocked with structured error details',
    [200, 400].includes(sqlSyntax.status)
      && ((isObject(sqlSyntax.payload) && sqlSyntax.payload.success === false && typeof sqlSyntax.payload.error === 'string')
        || (typeof sqlSyntax.payload?.error === 'string')),
    { status: sqlSyntax.status, response: safePreview(sqlSyntax.payload) },
  );

  const dbSlowStart = Date.now();
  const slowDb = await requestJson(`${API_BASE}/api/execute/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'SELECT pg_sleep(2)' },
    timeoutMs: 15000,
  });
  const slowDbDuration = Date.now() - dbSlowStart;
  addResult(
    results,
    'Restricted system SQL functions are blocked without server crash',
    ((slowDb.status === 200
      && isObject(slowDb.payload)
      && slowDb.payload.success === false
      && /restricted|not allowed|blocked/i.test(String(slowDb.payload.error || '')))
      || (slowDb.status === 400 && typeof slowDb.payload?.error === 'string'))
      && slowDbDuration < 15000,
    {
      status: slowDb.status,
      durationMs: slowDbDuration,
      response: safePreview(slowDb.payload),
    },
  );
}

async function runBrowserEdgeCases(results) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.addInitScript(INIT_SCRIPT, buildSeedState(QA_USER_ID));

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.message || error));
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text() || '';
    if (/favicon\.ico/i.test(text)) return;
    consoleErrors.push(text);
  });

  try {
    let mockedRun = false;
    await page.route('**/api/execute/run', async (route) => {
      if (!mockedRun) {
        mockedRun = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}',
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${WEB_BASE}/problem/a1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.problem-detail-page', { timeout: 60000 });
    await page.click('#problem-run-btn');

    await page.waitForFunction(() => {
      const text = document.getElementById('console-output')?.textContent || '';
      return text.trim().length > 0 && !/Running code\.\.\./i.test(text);
    }, { timeout: 40000 });

    const outputAfterEmptyPayload = await page.locator('#console-output').innerText();
    addResult(
      results,
      'Browser handles empty execution response payload gracefully',
      outputAfterEmptyPayload.trim().length > 0,
      { outputPreview: safePreview(outputAfterEmptyPayload) },
    );

    await page.unroute('**/api/execute/run');

    let aiTimeoutInjected = false;
    await page.route('**/api/ai/learn', async (route) => {
      if (!aiTimeoutInjected) {
        aiTimeoutInjected = true;
        await route.abort('timedout');
        return;
      }
      await route.continue();
    });

    await page.waitForSelector('#ask-robin-fab', { timeout: 20000 });
    await page.click('#ask-robin-fab');
    await page.waitForSelector('#ask-robin-panel:not(.hidden)', { timeout: 20000 });
    await page.locator('[data-robin-action]').first().click();

    await page.waitForFunction(() => {
      const text = document.getElementById('robin-response')?.textContent || '';
      return text.trim().length > 0 && !/Robin is thinking/i.test(text);
    }, { timeout: 45000 });

    const aiTimeoutText = await page.locator('#robin-response').innerText();
    addResult(
      results,
      'Browser shows graceful AI timeout message',
      /oops|taking a break|try again|internet connection/i.test(aiTimeoutText),
      { responsePreview: safePreview(aiTimeoutText) },
    );

    await page.unroute('**/api/ai/learn');

    await page.route('**/api/analytics/progress**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: QA_USER_ID, mastery: null, streak: null, solvedCount: null, attemptedCount: null }),
      });
    });

    await page.route('**/api/analytics/streaks**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: QA_USER_ID, currentStreak: null, longestStreak: null, mappedDays: null }),
      });
    });

    await page.goto(`${WEB_BASE}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#analytics-mastery', { timeout: 45000 });
    const analyticsShell = await page.evaluate(() => ({
      textLength: (document.body?.innerText || '').replace(/\s+/g, '').length,
      hasMasteryNode: Boolean(document.getElementById('analytics-mastery')),
    }));

    addResult(
      results,
      'Analytics page survives null API fields',
      analyticsShell.textLength > 30 && analyticsShell.hasMasteryNode,
      analyticsShell,
    );

    await page.unroute('**/api/analytics/progress**');
    await page.unroute('**/api/analytics/streaks**');

    await sleep(200);
    const listenerDiagnostics = await page.evaluate(() => {
      if (typeof window.__hardeningListenerDiagnostics !== 'function') return null;
      return window.__hardeningListenerDiagnostics();
    });

    addResult(
      results,
      'Injected edge-case scenarios do not crash runtime',
      pageErrors.length === 0,
      {
        pageErrors,
        consoleErrorCount: consoleErrors.length,
        listenerDuplicates: listenerDiagnostics?.duplicateCount ?? null,
      },
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

function summarize(results, startedAt) {
  const finishedAt = new Date().toISOString();
  const passed = results.filter((item) => item.passed).length;
  const failed = results.length - passed;
  const failedBlocking = results.filter((item) => !item.passed && item.blocking).length;

  return {
    phase: 'edge-cases',
    startedAt,
    finishedAt,
    apiBase: API_BASE,
    webBase: WEB_BASE,
    totals: {
      total: results.length,
      passed,
      failed,
      failedBlocking,
    },
    passed: failedBlocking === 0,
    results,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];

  await runApiEdgeCases(results);
  await runBrowserEdgeCases(results);

  const report = summarize(results, startedAt);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[hardening-edge] Report written to ${REPORT_PATH}`);
  console.log(`[hardening-edge] Passed ${report.totals.passed}/${report.totals.total}`);

  const failedItems = report.results.filter((item) => !item.passed);
  if (failedItems.length > 0) {
    console.log('[hardening-edge] Failures:');
    failedItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     details: ${safePreview(item.details, 260)}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[hardening-edge] Fatal error: ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
