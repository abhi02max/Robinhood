import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const LEARN_SAMPLE_SIZE = Math.max(12, Number(process.env.AI_VALIDATION_LEARN_SAMPLES || 24));
const MENTOR_SAMPLE_SIZE = Math.max(8, Number(process.env.AI_VALIDATION_MENTOR_SAMPLES || 12));
const REQUEST_TIMEOUT_MS = Number(process.env.AI_VALIDATION_TIMEOUT_MS || 20000);
const P95_TARGET_MS = Number(process.env.AI_P95_TARGET_MS || 5000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'provider-latency-validation-report.json');

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
    timeoutMs = REQUEST_TIMEOUT_MS,
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
      payload,
      durationMs: Date.now() - started,
      timedOut: false,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: null,
      durationMs: Date.now() - started,
      timedOut: error?.name === 'AbortError',
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function runLearnProbe() {
  const results = [];

  for (let i = 0; i < LEARN_SAMPLE_SIZE; i += 1) {
    const userId = `provider-validate-learn-${Date.now()}-${i}`;
    const response = await requestJson(`${API_BASE}/api/ai/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        subjectTitle: 'System Design',
        topicTitle: `Load Balancing Validation ${i + 1}`,
        actionType: 'interview',
        context: {
          stage: 'provider-latency-validation',
          iteration: i + 1,
        },
        userId,
      },
    });

    const payload = response.payload || {};
    results.push({
      index: i + 1,
      status: response.status,
      ok: response.ok,
      durationMs: response.durationMs,
      timedOut: response.timedOut,
      provider: payload.provider || 'unknown',
      model: payload.model || 'unknown',
      cached: Boolean(payload.cached),
      degraded: Boolean(payload.degraded),
      errorType: payload.errorType || null,
      retryAfter: Number(payload.retryAfter || 0),
      reason: payload.reason || payload.error || null,
    });
  }

  return results;
}

async function runMentorProbe() {
  const results = [];

  for (let i = 0; i < MENTOR_SAMPLE_SIZE; i += 1) {
    const userId = `provider-validate-mentor-${Date.now()}-${i}`;
    const response = await requestJson(`${API_BASE}/api/ai/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        problemTitle: `Two Sum Variant ${i + 1}`,
        actionType: 'hint',
        category: 'array',
        codeSnippet: 'function solve(nums, target) { return []; }',
        userId,
      },
    });

    const payload = response.payload || {};
    results.push({
      index: i + 1,
      status: response.status,
      ok: response.ok,
      durationMs: response.durationMs,
      timedOut: response.timedOut,
      provider: payload.provider || 'unknown',
      model: payload.model || 'unknown',
      cached: Boolean(payload.cached),
      degraded: Boolean(payload.degraded),
      errorType: payload.errorType || null,
      retryAfter: Number(payload.retryAfter || 0),
      reason: payload.reason || payload.error || null,
    });
  }

  return results;
}

function buildProbeSummary(results, label) {
  const allLatencies = results.map((item) => item.durationMs);
  const successRows = results.filter((item) => item.status === 200 && item.ok && !item.timedOut);
  const successLatencies = successRows.map((item) => item.durationMs);

  const statusCounts = countBy(results, (item) => String(item.status));
  const providerCounts = countBy(
    successRows,
    (item) => String(item.provider || 'unknown').toLowerCase(),
  );

  const rateLimited = results.filter((item) => item.status === 429).length;
  const degraded = successRows.filter((item) => item.degraded).length;
  const timedOut = results.filter((item) => item.timedOut).length;

  const successLatency = summarizeLatency(successLatencies);

  return {
    label,
    sampleSize: results.length,
    successfulResponses: successRows.length,
    statusCounts,
    providerCounts,
    rateLimited,
    degraded,
    timedOut,
    allLatency: summarizeLatency(allLatencies),
    successLatency,
    p95TargetMs: P95_TARGET_MS,
    p95TargetMet: successLatency.count > 0 && successLatency.p95Ms <= P95_TARGET_MS,
  };
}

async function main() {
  const startedAt = new Date().toISOString();

  const healthBefore = await requestJson(`${API_BASE}/api/ai/health`, { timeoutMs: 10000 });
  const learnResults = await runLearnProbe();
  const mentorResults = await runMentorProbe();
  const healthAfter = await requestJson(`${API_BASE}/api/ai/health`, { timeoutMs: 10000 });

  const learnSummary = buildProbeSummary(learnResults, 'learn');
  const mentorSummary = buildProbeSummary(mentorResults, 'mentor');

  const overallP95Met = learnSummary.p95TargetMet && mentorSummary.p95TargetMet;

  const report = {
    phase: 'provider-latency-validation',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    p95TargetMs: P95_TARGET_MS,
    healthBefore: healthBefore.payload,
    healthAfter: healthAfter.payload,
    summaries: {
      learn: learnSummary,
      mentor: mentorSummary,
    },
    overallP95TargetMet: overallP95Met,
    passed: overallP95Met,
    samples: {
      learn: learnResults,
      mentor: mentorResults,
    },
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[provider-latency-validation] Report written to ${REPORT_PATH}`);
  console.log('[provider-latency-validation] Learn summary:', JSON.stringify(learnSummary));
  console.log('[provider-latency-validation] Mentor summary:', JSON.stringify(mentorSummary));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[provider-latency-validation] Fatal error:', error?.stack || error?.message || error);
  process.exitCode = 1;
});
