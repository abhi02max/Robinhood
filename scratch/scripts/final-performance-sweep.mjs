import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3300';
const WEB_BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5174';
const AI_TIMEOUT_MS = Number(process.env.PERF_AI_TIMEOUT_MS || 90000);
const DEFAULT_TIMEOUT_MS = Number(process.env.PERF_TIMEOUT_MS || 45000);
const SAMPLE_SIZE = Math.max(10, Number(process.env.PERF_SAMPLE_SIZE || 24));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'final-performance-sweep-report.json');

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.max(0, Math.min(sorted.length - 1, rank));
  return sorted[index];
}

function summarizeLatency(values) {
  if (!values.length) {
    return {
      count: 0,
      minMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
    };
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    count: values.length,
    minMs: Math.min(...values),
    avgMs: Number((sum / values.length).toFixed(2)),
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99),
    maxMs: Math.max(...values),
  };
}

async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

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
      durationMs: Date.now() - started,
      payload,
      timedOut: false,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      payload: null,
      timedOut: error?.name === 'AbortError',
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function benchmarkApi(name, buildRequest, options = {}) {
  const sampleSize = options.sampleSize || SAMPLE_SIZE;
  const allowedStatuses = options.allowedStatuses || [200];
  const durations = [];
  const statuses = {};
  let failed = 0;
  let timedOut = 0;

  for (let i = 0; i < sampleSize; i += 1) {
    const req = buildRequest(i);
    const result = await requestJson(req.url, req.options);

    durations.push(result.durationMs);
    statuses[result.status] = (statuses[result.status] || 0) + 1;

    if (result.timedOut) timedOut += 1;
    if (!allowedStatuses.includes(result.status)) failed += 1;
  }

  return {
    name,
    sampleSize,
    allowedStatuses,
    failed,
    timedOut,
    statuses,
    latency: summarizeLatency(durations),
    passed: failed === 0 && timedOut === 0,
  };
}

async function createLearnSessionToken(userId) {
  const response = await requestJson(`${API_BASE}/api/learn/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { userId },
    timeoutMs: 15000,
  });

  if (response.status === 200 && typeof response.payload?.token === 'string') {
    return response.payload.token;
  }

  return null;
}

function buildSeedState(userId, sessionToken) {
  return {
    user: {
      id: userId,
      name: 'Performance QA',
      email: 'perf.qa@example.com',
      joinDate: new Date().toISOString().split('T')[0],
    },
    sessionToken: sessionToken || null,
    preferences: {
      theme: 'dark',
      sidebarCollapsed: false,
      editor: {
        fontSize: 14,
        wordWrap: 'off',
        tabSize: 2,
      },
    },
    progress: {
      a1: {
        status: 'attempted',
        language: 'javascript',
      },
    },
    streaks: {
      current: 3,
      longest: 5,
    },
    xp: {
      total: 210,
      level: 3,
      title: 'Builder',
    },
  };
}

function parseBytes(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*([KMGT]?i?B)$/i);
  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers = {
    B: 1,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
    KB: 1000,
    MB: 1000 ** 2,
    GB: 1000 ** 3,
    TB: 1000 ** 4,
  };

  return Math.round(value * (multipliers[unit] || 1));
}

function formatMiB(bytes) {
  return Number((bytes / (1024 ** 2)).toFixed(2));
}

function collectContainerMemoryStats() {
  try {
    const output = execSync(
      'docker stats robinhood-backend robinhood-frontend --no-stream --format "{{.Name}}|{{.MemUsage}}|{{.MemPerc}}"',
      { encoding: 'utf8' },
    );

    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const services = lines.map((line) => {
      const [name, usageRaw = '', memPerc = ''] = line.split('|');
      const [usedRaw = '0B', limitRaw = '0B'] = usageRaw.split('/').map((item) => item.trim());
      const usedBytes = parseBytes(usedRaw);
      const limitBytes = parseBytes(limitRaw);
      const percent = Number(String(memPerc || '0').replace('%', '').trim()) || 0;

      return {
        name,
        usedMiB: formatMiB(usedBytes),
        limitMiB: formatMiB(limitBytes),
        usagePercent: Number(percent.toFixed(2)),
      };
    });

    return { ok: true, services };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      services: [],
    };
  }
}

async function safeGoto(page, url) {
  const started = Date.now();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  return Date.now() - started;
}

async function measureTransition(page, targetPath) {
  const started = Date.now();

  try {
    await page.evaluate((target) => {
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(target);
      }
    }, targetPath);

    await page.waitForFunction(
      (target) => window.location.pathname === target || window.location.pathname.startsWith(`${target}/`),
      targetPath,
      { timeout: 20000 },
    );
  } catch {
    await page.goto(`${WEB_BASE}${targetPath}`, { waitUntil: 'networkidle', timeout: 120000 });
  }

  return Date.now() - started;
}

async function collectFrontendMetrics() {
  const qaUserId = 'final-performance-qa';
  const sessionToken = await createLearnSessionToken(qaUserId);
  const seedState = buildSeedState(qaUserId, sessionToken);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.addInitScript((seed) => {
    localStorage.setItem('robinhood_data', JSON.stringify(seed));
  }, seedState);

  const scriptResponses = new Map();

  page.on('response', (response) => {
    const url = response.url();
    if (!/\.js(\?|$)/i.test(url)) return;

    const contentLength = Number(response.headers()['content-length'] || 0);
    const existing = scriptResponses.get(url) || 0;
    if (contentLength > existing) {
      scriptResponses.set(url, contentLength);
    }
  });

  const routeLoads = [];
  const renderMetrics = [];
  const transitionDurations = [];

  const renderTargets = [
    { route: '/dashboard', selector: '.dashboard-page', label: 'dashboard-shell' },
    { route: '/learn', selector: '#learn-tree-container', label: 'learn-tree' },
    { route: '/analytics', selector: '#analytics-mastery', label: 'analytics-summary' },
    { route: '/scheduler', selector: '#scheduler-tasks', label: 'scheduler-tasks' },
  ];

  try {
    for (const target of renderTargets) {
      const navMs = await safeGoto(page, `${WEB_BASE}${target.route}`);
      const renderStart = Date.now();
      await page.waitForSelector(target.selector, { timeout: 60000 });
      const renderMs = Date.now() - renderStart;

      routeLoads.push({ route: target.route, loadMs: navMs });
      renderMetrics.push({ label: target.label, route: target.route, renderMs });
    }

    await safeGoto(page, `${WEB_BASE}/dashboard`);
    const transitionRoutes = ['/learn', '/problem/a1', '/analytics', '/scheduler', '/profile', '/dashboard'];

    for (const pathName of transitionRoutes) {
      const ms = await measureTransition(page, pathName);
      transitionDurations.push({ route: pathName, durationMs: ms });
    }

    const monacoNavMs = await safeGoto(page, `${WEB_BASE}/problem/a1`);

    const monacoStart = Date.now();
    await page.waitForSelector('#monaco-container .monaco-editor, #fallback-editor', { timeout: 60000 });
    const monacoLoadMs = Date.now() - monacoStart;

    const beforeOutput = await page.locator('#console-output').innerText().catch(() => '');
    const runStart = Date.now();
    await page.click('#problem-run-btn', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      (previous) => {
        const text = document.getElementById('console-output')?.textContent || '';
        return text.trim().length > 0 && text !== previous && !/Running code\.\.\./i.test(text);
      },
      beforeOutput,
      { timeout: 90000 },
    ).catch(() => {});
    const monacoRunMs = Date.now() - runStart;

    const bundleEntries = Array.from(scriptResponses.entries())
      .map(([url, bytes]) => ({ url, bytes }))
      .sort((a, b) => b.bytes - a.bytes);

    const totalScriptBytes = bundleEntries.reduce((sum, entry) => sum + entry.bytes, 0);

    const routeLoadSummary = summarizeLatency(routeLoads.map((item) => item.loadMs));
    const transitionSummary = summarizeLatency(transitionDurations.map((item) => item.durationMs));

    const slowRenderComponents = renderMetrics
      .slice()
      .sort((a, b) => b.renderMs - a.renderMs)
      .slice(0, 5);

    await context.close();
    await browser.close();

    return {
      ok: true,
      routeLoads,
      routeLoadSummary,
      routeTransitions: transitionDurations,
      routeTransitionSummary: transitionSummary,
      renderMetrics,
      slowRenderComponents,
      monaco: {
        routeLoadMs: monacoNavMs,
        editorReadyMs: monacoLoadMs,
        runToOutputMs: monacoRunMs,
      },
      bundleAnalysis: {
        totalScriptBytes,
        totalScriptMiB: Number((totalScriptBytes / (1024 ** 2)).toFixed(3)),
        topBundles: bundleEntries.slice(0, 10).map((entry) => ({
          url: entry.url,
          bytes: entry.bytes,
          kiloBytes: Number((entry.bytes / 1024).toFixed(2)),
        })),
      },
    };
  } catch (error) {
    await context.close();
    await browser.close();
    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}

async function main() {
  const startedAt = new Date().toISOString();

  const aiBench = await benchmarkApi(
    'AI learn endpoint',
    (index) => ({
      url: `${API_BASE}/api/ai/learn`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: AI_TIMEOUT_MS,
        body: {
          subjectTitle: 'Distributed Systems',
          topicTitle: `Caching-${index}`,
          actionType: 'interview',
          context: { stage: 'final-performance' },
        },
      },
    }),
    { allowedStatuses: [200, 429] },
  );

  const codeBench = await benchmarkApi(
    'Code run endpoint',
    (index) => ({
      url: `${API_BASE}/api/execute/run`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: DEFAULT_TIMEOUT_MS,
        body: {
          language: 'javascript',
          code: `console.log('perf-run-${index}')`,
          stdin: '',
        },
      },
    }),
    { allowedStatuses: [200, 429] },
  );

  const sqlBench = await benchmarkApi(
    'SQL run endpoint',
    (index) => ({
      url: `${API_BASE}/api/execute/sql`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: DEFAULT_TIMEOUT_MS,
        body: {
          query: `SELECT ${index} AS sample, current_user AS role_name`,
          userId: 'perf-tenant-a',
        },
      },
    }),
    { allowedStatuses: [200] },
  );

  const memory = collectContainerMemoryStats();
  const frontend = await collectFrontendMetrics();

  const report = {
    phase: 'final-performance-sweep',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    webBase: WEB_BASE,
    apiLatency: {
      ai: aiBench,
      code: codeBench,
      sql: sqlBench,
    },
    containerMemory: memory,
    frontend,
    passed: aiBench.passed && codeBench.passed && sqlBench.passed && frontend.ok,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`[perf-sweep] Report written to ${REPORT_PATH}`);
  console.log(`[perf-sweep] AI p95=${aiBench.latency.p95Ms}ms, code p95=${codeBench.latency.p95Ms}ms, sql p95=${sqlBench.latency.p95Ms}ms`);

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[perf-sweep] Fatal error: ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
