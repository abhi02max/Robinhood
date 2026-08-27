import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const QA_USER_ID = process.env.HARDENING_QA_USER_ID || 'hardening-user-01';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'hardening-concurrency-report.json');

function preview(value, max = 220) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 45000,
  } = options;

  const startedAt = Date.now();
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
      durationMs: Date.now() - startedAt,
      timedOut: false,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: null,
      headers: {},
      durationMs: Date.now() - startedAt,
      timedOut: error?.name === 'AbortError' || /timeout|aborted/i.test(String(error?.message || '')),
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeResponses(items) {
  const statusCounts = {};
  let timedOut = 0;
  let exceptionCount = 0;
  const durations = [];

  function percentile(sortedDurations, percentileValue) {
    if (!sortedDurations.length) return 0;
    const rank = Math.ceil((percentileValue / 100) * sortedDurations.length) - 1;
    const index = Math.min(sortedDurations.length - 1, Math.max(0, rank));
    return sortedDurations[index];
  }

  for (const item of items) {
    if (!item) continue;
    const key = String(item.status || 0);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
    if (item.timedOut) timedOut += 1;
    if (item.error && item.status === 0) exceptionCount += 1;
    if (Number.isFinite(item.durationMs)) durations.push(item.durationMs);
  }

  const sorted = durations.slice().sort((a, b) => a - b);

  return {
    total: items.length,
    statusCounts,
    timedOut,
    exceptionCount,
    avgDurationMs: durations.length
      ? Number((durations.reduce((sum, n) => sum + n, 0) / durations.length).toFixed(2))
      : 0,
    minDurationMs: durations.length ? Math.min(...durations) : 0,
    maxDurationMs: durations.length ? Math.max(...durations) : 0,
    p50DurationMs: percentile(sorted, 50),
    p95DurationMs: percentile(sorted, 95),
    p99DurationMs: percentile(sorted, 99),
  };
}

async function runWithConcurrency(total, concurrency, handler) {
  const results = new Array(total);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(total, concurrency) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= total) return;
      results[index] = await handler(index);
    }
  });

  await Promise.all(workers);
  return results;
}

function evaluateAllowedStatuses(items, allowedStatuses) {
  let unexpected = 0;
  for (const item of items) {
    if (!allowedStatuses.includes(item.status)) unexpected += 1;
  }
  return unexpected;
}

async function ensureLearnToken() {
  const response = await requestJson(`${API_BASE}/api/learn/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { userId: QA_USER_ID },
    timeoutMs: 15000,
  });

  if (response.status !== 200 || typeof response.payload?.token !== 'string') {
    return null;
  }
  return response.payload.token;
}

async function main() {
  const startedAt = new Date().toISOString();
  const groupResults = [];

  const token = await ensureLearnToken();

  const aiStorm = await runWithConcurrency(24, 8, async () => {
    return requestJson(`${API_BASE}/api/ai/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        subjectTitle: 'Database Systems',
        topicTitle: 'Transactions',
        actionType: 'quiz',
        context: { stage: 'concurrency' },
      },
      timeoutMs: 90000,
    });
  });

  const aiSummary = summarizeResponses(aiStorm);
  const aiUnexpected = evaluateAllowedStatuses(aiStorm, [200, 429, 500]);
  const aiStructured = aiStorm.filter((item) => {
    if (item.status === 200) return typeof item.payload?.reply === 'string';
    if (item.status === 429 || item.status === 500) return typeof item.payload?.reason === 'string';
    return false;
  }).length;

  groupResults.push({
    name: 'Parallel AI requests',
    passed: aiUnexpected === 0 && aiSummary.timedOut === 0 && aiStructured === aiStorm.length,
    details: {
      ...aiSummary,
      unexpectedStatuses: aiUnexpected,
      structuredResponses: aiStructured,
    },
  });

  const codeStorm = await runWithConcurrency(40, 12, async (index) => {
    return requestJson(`${API_BASE}/api/execute/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        language: 'javascript',
        code: `console.log("load-run-${index}")`,
        stdin: '',
      },
      timeoutMs: 30000,
    });
  });

  const codeSummary = summarizeResponses(codeStorm);
  const codeUnexpected = evaluateAllowedStatuses(codeStorm, [200, 429]);

  groupResults.push({
    name: 'Parallel code execution requests',
    passed: codeUnexpected === 0 && codeSummary.timedOut === 0,
    details: {
      ...codeSummary,
      unexpectedStatuses: codeUnexpected,
    },
  });

  const sqlStorm = await runWithConcurrency(25, 10, async (index) => {
    return requestJson(`${API_BASE}/api/execute/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        query: `SELECT ${index} AS n`,
      },
      timeoutMs: 30000,
    });
  });

  const sqlSummary = summarizeResponses(sqlStorm);
  const sqlUnexpected = evaluateAllowedStatuses(sqlStorm, [200, 429]);

  groupResults.push({
    name: 'Parallel SQL execution requests',
    passed: sqlUnexpected === 0 && sqlSummary.timedOut === 0,
    details: {
      ...sqlSummary,
      unexpectedStatuses: sqlUnexpected,
    },
  });

  const debuggerStorm = await runWithConcurrency(20, 8, async () => {
    return requestJson(`${API_BASE}/api/debugger/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        language: 'python',
        code: 'print("debug")',
        stdin: '',
      },
      timeoutMs: 35000,
    });
  });

  const debuggerSummary = summarizeResponses(debuggerStorm);
  const debuggerUnexpected = evaluateAllowedStatuses(debuggerStorm, [200, 429, 500]);

  groupResults.push({
    name: 'Parallel debugger requests',
    passed: debuggerUnexpected === 0 && debuggerSummary.timedOut === 0,
    details: {
      ...debuggerSummary,
      unexpectedStatuses: debuggerUnexpected,
    },
  });

  const pollingTargets = [
    `${API_BASE}/api/scheduler/today?userId=${encodeURIComponent(QA_USER_ID)}`,
    `${API_BASE}/api/analytics/progress?userId=${encodeURIComponent(QA_USER_ID)}`,
    `${API_BASE}/api/analytics/streaks?userId=${encodeURIComponent(QA_USER_ID)}`,
    `${API_BASE}/api/dashboard/analytics/${encodeURIComponent(QA_USER_ID)}`,
  ];

  const polling = await runWithConcurrency(80, 16, async (index) => {
    const url = pollingTargets[index % pollingTargets.length];
    return requestJson(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeoutMs: 25000,
    });
  });

  const pollingSummary = summarizeResponses(polling);
  const pollingUnexpected = evaluateAllowedStatuses(polling, [200, 401, 429, 500]);

  groupResults.push({
    name: 'Scheduler and analytics polling load',
    passed: pollingUnexpected === 0 && pollingSummary.timedOut === 0,
    details: {
      ...pollingSummary,
      unexpectedStatuses: pollingUnexpected,
      tokenPresent: Boolean(token),
    },
  });

  const burst = await runWithConcurrency(140, 70, async (index) => {
    return requestJson(`${API_BASE}/api/execute/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        language: 'javascript',
        code: `console.log("burst-${index}")`,
        stdin: '',
      },
      timeoutMs: 25000,
    });
  });

  const burst429 = burst.filter((item) => item.status === 429);
  const burstSummary = summarizeResponses(burst);

  const retryCandidates = burst429.slice(0, 5);
  const retryWaitMs = retryCandidates.length > 0
    ? Math.min(
        3000,
        Math.max(
          250,
          ...retryCandidates.map((item) => Number(item.payload?.retryAfter || item.headers['retry-after'] || 1) * 1000),
        ),
      )
    : 0;

  if (retryWaitMs > 0) {
    await sleep(retryWaitMs);
  }

  const retries = [];
  for (const candidate of retryCandidates) {
    retries.push(
      await requestJson(`${API_BASE}/api/execute/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          language: 'javascript',
          code: 'console.log("retry")',
          stdin: '',
        },
        timeoutMs: 25000,
      }),
    );
  }

  const retrySummary = summarizeResponses(retries);
  const retryUnexpected = evaluateAllowedStatuses(retries, [200, 429]);

  groupResults.push({
    name: 'Rate-limit behavior and retry semantics',
    passed: burst429.length > 0 && retryUnexpected === 0 && retrySummary.timedOut === 0,
    details: {
      initialBurst: burstSummary,
      rateLimitedCount: burst429.length,
      retryWaitMs,
      retries: retrySummary,
      retryUnexpected,
    },
  });

  const deadlockCheck = {
    name: 'No request deadlocks or timeout spikes under concurrency',
    passed: groupResults.every((group) => Number(group.details?.timedOut || 0) === 0),
    details: groupResults.map((group) => ({
      name: group.name,
      timedOut: Number(group.details?.timedOut || 0),
      maxDurationMs: Number(group.details?.maxDurationMs || 0),
    })),
  };

  groupResults.push(deadlockCheck);

  const passedChecks = groupResults.filter((item) => item.passed).length;
  const failedChecks = groupResults.length - passedChecks;

  const report = {
    phase: 'concurrency-load',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    totals: {
      checksTotal: groupResults.length,
      passedChecks,
      failedChecks,
    },
    checks: groupResults,
    passed: failedChecks === 0,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[hardening-load] Report written to ${REPORT_PATH}`);
  console.log(`[hardening-load] Checks passed ${passedChecks}/${groupResults.length}`);

  if (!report.passed) {
    const failed = report.checks.filter((item) => !item.passed);
    console.log('[hardening-load] Failed checks:');
    failed.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     details: ${preview(item.details, 280)}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[hardening-load] Fatal error: ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
