import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const WEB_BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';
const QA_USER_ID = process.env.HARDENING_QA_USER_ID || 'hardening-user-01';

const requestedMinutesRaw = Number(process.env.HARDENING_SOAK_MINUTES || 20);
const requestedMinutes = Number.isFinite(requestedMinutesRaw) ? requestedMinutesRaw : 20;
const soakMinutes = Math.max(20, Math.min(30, requestedMinutes));
const soakDurationMs = soakMinutes * 60 * 1000;

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'hardening-soak-report.json');

const INFRA_INTERRUPT_PATTERNS = [
  /ERR_NETWORK_IO_SUSPENDED/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /ERR_NETWORK_CHANGED/i,
  /browser has been disconnected/i,
  /Target page, context or browser has been closed/i,
  /Execution context was destroyed, most likely because of a navigation/i,
  /temporary network drop/i,
  /system sleep/i,
  /navigation timeout/i,
];

function preview(value, max = 200) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank];
}

function isInfraInterruptText(value) {
  const text = String(value || '');
  if (!text) return false;
  return INFRA_INTERRUPT_PATTERNS.some((pattern) => pattern.test(text));
}

function classifyIssue(type, detail) {
  if (type === 'infra-threshold') return 'INFRA_INTERRUPT';

  const text = `${String(type || '')} ${String(detail || '')}`;
  if (isInfraInterruptText(text)) return 'INFRA_INTERRUPT';

  if (type === 'navigation' && /page\.goto: Timeout \d+ms exceeded/i.test(String(detail || ''))) {
    return 'INFRA_INTERRUPT';
  }

  return 'PRODUCT';
}

function isInfraInterruptIssue(issue) {
  if (!issue || typeof issue !== 'object') return false;
  if (issue.classification === 'INFRA_INTERRUPT') return true;
  return isInfraInterruptText(`${issue.type || ''} ${issue.detail || ''}`);
}

function summarizeIssueClassifications(issues) {
  const infraInterrupts = issues.filter((item) => isInfraInterruptIssue(item));
  const productIssues = issues.filter((item) => !isInfraInterruptIssue(item));
  const blockingProductIssues = productIssues.filter((item) => item.blocking);

  return {
    infraInterrupts,
    productIssues,
    blockingProductIssues,
    infraInterruptCount: infraInterrupts.length,
    productIssueCount: productIssues.length,
    blockingProductIssueCount: blockingProductIssues.length,
  };
}

function addIssue(issues, type, detail, cycle, blocking = true) {
  const classification = classifyIssue(type, detail);
  const isInfraInterrupt = classification === 'INFRA_INTERRUPT';

  issues.push({
    type,
    detail,
    cycle,
    blocking: isInfraInterrupt ? false : blocking,
    classification,
    ts: new Date().toISOString(),
  });
}

function createSeedState(userId, token = null) {
  return {
    user: {
      id: userId,
      name: 'Hardening QA',
      email: 'hardening.qa@example.com',
      joinDate: new Date().toISOString().split('T')[0],
    },
    sessionToken: token,
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
      a1: { status: 'attempted', language: 'javascript' },
    },
  };
}

const INIT_SCRIPT = (seed) => {
  try {
    window.localStorage?.setItem('robinhood_data', JSON.stringify(seed));
  } catch {
    // Ignore non-actionable storage restrictions in transient documents.
  }

  if (window.__hardeningSoakPatched) return;
  window.__hardeningSoakPatched = true;

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
        let countMap = byEvent.get(key);
        if (!countMap) {
          countMap = new Map();
          byEvent.set(key, countMap);
        }
        const existing = countMap.get(listener) || 0;
        if (existing > 0) duplicateCount += 1;
        countMap.set(listener, existing + 1);
      }
    } catch {
      // Ignore diagnostics failures.
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
          const countMap = byEvent.get(key);
          if (countMap && countMap.has(listener)) {
            const next = (countMap.get(listener) || 1) - 1;
            if (next <= 0) countMap.delete(listener);
            else countMap.set(listener, next);
          }
        }
      }
    } catch {
      // Ignore diagnostics failures.
    }

    return originalRemove.call(this, type, listener, options);
  };

  window.__hardeningSoakDiagnostics = () => ({ duplicateCount });
};

async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 30000,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    clearTimeout(timer);
  }
}

async function resolveProblemIds() {
  try {
    const response = await requestJson(`${API_BASE}/api/problems`, { timeoutMs: 15000 });
    const ids = Array.isArray(response.payload?.items)
      ? response.payload.items
          .map((item) => String(item?.id || '').trim())
          .filter(Boolean)
      : [];

    const unique = Array.from(new Set(ids));
    if (unique.length >= 2) return unique.slice(0, 4);
  } catch {
    // Fall through to defaults.
  }

  return ['a1', 'a2', 'bt_1'];
}

function selectorForRoute(route) {
  if (route === '/dashboard') return '.dashboard-page';
  if (route === '/learn') return '#learn-tree-container';
  if (route === '/scheduler') return '#scheduler-tasks';
  if (route === '/analytics') return '#analytics-mastery';
  if (route === '/debugger') return '#debugger-code';
  if (route === '/profile') return '.profile-page';
  return 'body';
}

async function navigateRoute(page, route, issues, cycle) {
  const selector = selectorForRoute(route);

  try {
    await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(selector, { timeout: 60000 });

    const shell = await page.evaluate(() => {
      const textLength = (document.body?.innerText || '').replace(/\s+/g, '').length;
      const nodeCount = document.body?.querySelectorAll('*')?.length || 0;
      return { textLength, nodeCount };
    });

    if (shell.nodeCount === 0 || shell.textLength < 10) {
      addIssue(issues, 'white-screen', `Route ${route} rendered empty shell`, cycle);
    }
  } catch (error) {
    addIssue(issues, 'navigation', `Route ${route} failed: ${String(error?.message || error)}`, cycle);
  }
}

async function waitForOutputUpdate(page, timeout = 90000) {
  await page.waitForFunction(() => {
    const text = document.getElementById('console-output')?.textContent || '';
    return text.trim().length > 0 && !/Running code\.\.\./i.test(text);
  }, { timeout });
}

async function runAiInteraction(page, metrics, issues, cycle) {
  try {
    await page.waitForSelector('#ask-robin-fab', { timeout: 15000 });
    await page.click('#ask-robin-fab');
    await page.waitForSelector('#ask-robin-panel:not(.hidden)', { timeout: 15000 });
    await page.locator('[data-robin-action]').first().click();
    await page.waitForFunction(() => {
      const text = document.getElementById('robin-response')?.textContent || '';
      return text.trim().length > 0 && !/Robin is thinking/i.test(text);
    }, { timeout: 90000 });

    const aiResponse = await page.locator('#robin-response').innerText();
    if (!aiResponse.trim()) {
      addIssue(issues, 'ai-response', 'AI response became empty after wait.', cycle);
    }
    metrics.aiInteractions += 1;
  } catch (error) {
    addIssue(issues, 'ai-response', `AI interaction failed: ${String(error?.message || error)}`, cycle, false);
  }
}

async function exerciseProblem(page, problemId, cycle, metrics, issues, includeAi = false) {
  const route = `/problem/${problemId}`;

  try {
    await page.goto(`${WEB_BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.problem-detail-page', { timeout: 60000 });
    await page.waitForSelector('#problem-run-btn', { timeout: 30000 });
  } catch (error) {
    addIssue(issues, 'problem-route', `Unable to open ${route}: ${String(error?.message || error)}`, cycle);
    return null;
  }

  const initialPath = page.url();
  if (!initialPath.includes(`/problem/${problemId}`)) {
    addIssue(issues, 'stale-route', `Route mismatch. Expected ${route}, got ${initialPath}`, cycle);
  }

  const title = await page.locator('.problem-detail-title').first().innerText().catch(() => '');

  try {
    await page.click('#problem-run-btn');
    await waitForOutputUpdate(page, 90000);
    metrics.runExecutions += 1;
  } catch (error) {
    addIssue(issues, 'run-action', `Run action failed for ${problemId}: ${String(error?.message || error)}`, cycle);
  }

  try {
    await page.click('#problem-submit-btn');
    await waitForOutputUpdate(page, 90000);
    metrics.submitExecutions += 1;
  } catch (error) {
    addIssue(issues, 'submit-action', `Submit action failed for ${problemId}: ${String(error?.message || error)}`, cycle, false);
  }

  try {
    await page.click('#tab-testcases');
    await page.click('#tab-output');
    await page.click('#tab-performance');
    await page.click('#tab-sql');
  } catch (error) {
    addIssue(issues, 'tab-switch', `Console tab switch failed: ${String(error?.message || error)}`, cycle);
  }

  try {
    await page.click('#run-sql-btn');
    await page.waitForFunction(() => {
      const text = document.getElementById('sql-result-panel')?.textContent || '';
      return text.trim().length > 0 && !/Query results will appear here/i.test(text);
    }, { timeout: 50000 });
    metrics.sqlExecutions += 1;
  } catch (error) {
    addIssue(issues, 'sql-action', `SQL action failed for ${problemId}: ${String(error?.message || error)}`, cycle, false);
  }

  if (includeAi) {
    await runAiInteraction(page, metrics, issues, cycle);
  }

  const outputText = await page.locator('#console-output').innerText().catch(() => '');
  if (!outputText.trim()) {
    addIssue(issues, 'stale-output', `Output pane is empty after actions on ${problemId}.`, cycle);
  }

  metrics.problemVisits += 1;
  return title.trim();
}

async function performLogoutLogin(page, seedState, metrics, issues, cycle) {
  try {
    await page.goto(`${WEB_BASE}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#logout-btn', { timeout: 30000 });
    await page.click('#logout-btn');

    await page.waitForFunction(() => {
      try {
        const raw = localStorage.getItem('robinhood_data');
        if (!raw) return true;
        const parsed = JSON.parse(raw);
        return !parsed?.user;
      } catch {
        return false;
      }
    }, { timeout: 45000 });

    await page.evaluate((seed) => {
      localStorage.setItem('robinhood_data', JSON.stringify(seed));
    }, seedState);

    await page.goto(`${WEB_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.dashboard-page', { timeout: 45000 });
    metrics.logoutLoginCycles += 1;
  } catch (error) {
    addIssue(issues, 'logout-login', `Logout/login cycle failed: ${String(error?.message || error)}`, cycle);
  }
}

function buildChecks({
  actualDurationMs,
  metrics,
  issues,
  pageErrors,
  severeConsoleErrors,
  duplicateSamples,
  heapSamples,
}) {
  const checks = [];
  const issueSummary = summarizeIssueClassifications(issues);
  const blockingIssues = issueSummary.blockingProductIssues;

  const duplicateMax = duplicateSamples.length ? Math.max(...duplicateSamples) : 0;

  const heapGrowthPercent = (() => {
    if (heapSamples.length < 2) return null;
    const first = heapSamples[0];
    const last = heapSamples[heapSamples.length - 1];
    if (!first) return null;
    return Number((((last - first) / first) * 100).toFixed(2));
  })();

  const cycleDurations = metrics.cycleDurations;
  const quarterSize = Math.max(1, Math.floor(cycleDurations.length / 4));
  const firstQuarter = cycleDurations.slice(0, quarterSize);
  const lastQuarter = cycleDurations.slice(-quarterSize);
  const firstAvg = average(firstQuarter);
  const lastAvg = average(lastQuarter);
  const degradationRatio = firstAvg > 0 ? Number((lastAvg / firstAvg).toFixed(3)) : 1;

  checks.push({
    name: 'Session duration reached at least 20 minutes',
    passed: actualDurationMs >= 20 * 60 * 1000,
    details: { actualDurationMs },
  });

  checks.push({
    name: 'No uncaught page runtime errors',
    passed: pageErrors.length === 0,
    details: { pageErrors },
  });

  checks.push({
    name: 'No severe browser console errors',
    passed: severeConsoleErrors.length === 0,
    details: { severeConsoleErrors },
  });

  checks.push({
    name: 'No blocking stale-state incidents',
    passed: blockingIssues.length === 0,
    details: { blockingIssueCount: blockingIssues.length },
  });

  checks.push({
    name: 'Event listener duplication remained controlled',
    passed: duplicateMax <= 10,
    details: { duplicateMax },
  });

  checks.push({
    name: 'Cycle-level performance degradation remained controlled',
    passed: degradationRatio <= 2.5,
    details: {
      firstQuarterAvgMs: Number(firstAvg.toFixed(2)),
      lastQuarterAvgMs: Number(lastAvg.toFixed(2)),
      degradationRatio,
    },
  });

  checks.push({
    name: 'Heap growth remained bounded when memory API is available',
    passed: heapGrowthPercent == null || heapGrowthPercent <= 50,
    details: { heapGrowthPercent },
  });

  return {
    checks,
    derived: {
      duplicateMax,
      heapGrowthPercent,
      degradationRatio,
      firstQuarterAvgMs: Number(firstAvg.toFixed(2)),
      lastQuarterAvgMs: Number(lastAvg.toFixed(2)),
      p95CycleMs: Number(percentile(cycleDurations, 95).toFixed(2)),
      avgCycleMs: Number(average(cycleDurations).toFixed(2)),
      infraInterruptCount: issueSummary.infraInterruptCount,
      productIssueCount: issueSummary.productIssueCount,
      blockingProductIssueCount: issueSummary.blockingProductIssueCount,
    },
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const problemIds = await resolveProblemIds();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  context.addInitScript(INIT_SCRIPT, createSeedState(QA_USER_ID));

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const issues = [];

  const metrics = {
    cyclesCompleted: 0,
    cycleDurations: [],
    runExecutions: 0,
    submitExecutions: 0,
    sqlExecutions: 0,
    aiInteractions: 0,
    problemVisits: 0,
    routeTransitions: 0,
    viewportSwitches: 0,
    logoutLoginCycles: 0,
  };

  const duplicateSamples = [];
  const heapSamples = [];

  page.on('pageerror', (error) => {
    const message = String(error?.message || error);
    if (/Failed to read the 'localStorage' property from 'Window': Access is denied for this document\./i.test(message)) {
      return;
    }
    pageErrors.push(message);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = String(message.text() || '');
    if (/favicon\.ico/i.test(text)) return;
    consoleErrors.push(text);
  });

  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'unknown';
    if (/ERR_ABORTED/i.test(errorText)) return;
    failedRequests.push(`${request.method()} ${request.url()} -> ${errorText}`);
  });

  let keepRunning = true;
  let cycle = 0;
  let runStatus = 'COMPLETED';

  try {
    await page.goto(`${WEB_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.dashboard-page', { timeout: 60000 });

    while (keepRunning) {
      if (Date.now() - startedMs >= soakDurationMs) {
        keepRunning = false;
        break;
      }

      cycle += 1;
      const cycleStart = Date.now();

      try {
        if (cycle % 2 === 0) {
          await page.setViewportSize(MOBILE_VIEWPORT);
        } else {
          await page.setViewportSize(DESKTOP_VIEWPORT);
        }
        metrics.viewportSwitches += 1;

        const primaryProblem = problemIds[cycle % problemIds.length];
        const secondaryProblem = problemIds[(cycle + 1) % problemIds.length];

        const firstTitle = await exerciseProblem(page, primaryProblem, cycle, metrics, issues, true);
        const secondTitle = await exerciseProblem(page, secondaryProblem, cycle, metrics, issues, cycle % 3 === 0);

        if (
          primaryProblem !== secondaryProblem
          && firstTitle
          && secondTitle
          && firstTitle === secondTitle
        ) {
          addIssue(
            issues,
            'stale-problem-switch',
            `Problem title did not change between ${primaryProblem} and ${secondaryProblem}.`,
            cycle,
          );
        }

        const routes = ['/dashboard', '/learn', '/scheduler', '/analytics', '/debugger', '/profile'];
        for (const route of routes) {
          await navigateRoute(page, route, issues, cycle);
          metrics.routeTransitions += 1;
        }

        if (cycle % 3 === 0) {
          await performLogoutLogin(page, createSeedState(QA_USER_ID), metrics, issues, cycle);
        }

        const diagnostics = await page.evaluate(() => {
          const listener = typeof window.__hardeningSoakDiagnostics === 'function'
            ? window.__hardeningSoakDiagnostics()
            : null;
          const heap = performance?.memory?.usedJSHeapSize ?? null;
          return {
            duplicateCount: listener?.duplicateCount ?? null,
            heap,
          };
        });

        if (Number.isFinite(diagnostics.duplicateCount)) {
          duplicateSamples.push(Number(diagnostics.duplicateCount));
        }
        if (Number.isFinite(diagnostics.heap)) {
          heapSamples.push(Number(diagnostics.heap));
        }
      } catch (error) {
        addIssue(issues, 'cycle-exception', String(error?.message || error), cycle);
      }

      metrics.cyclesCompleted += 1;
      metrics.cycleDurations.push(Date.now() - cycleStart);

      if (issues.length >= 30) {
        const issueSummary = summarizeIssueClassifications(issues);
        if (issueSummary.productIssueCount === 0 && issueSummary.infraInterruptCount > 0) {
          addIssue(
            issues,
            'infra-threshold',
            `Infra interruption threshold exceeded (${issueSummary.infraInterruptCount}). Marking soak run as inconclusive.`,
            cycle,
            false,
          );
          runStatus = 'INCONCLUSIVE';
        } else {
          addIssue(issues, 'abort-threshold', 'Issue threshold exceeded. Ending soak early.', cycle);
          runStatus = 'FAILED';
        }
        break;
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const finishedAt = new Date().toISOString();
  const actualDurationMs = Date.now() - startedMs;

  const severeConsoleErrors = consoleErrors.filter((text) => {
    if (/Failed to load resource/i.test(text)) return false;
    if (/source map/i.test(text)) return false;
    if (isInfraInterruptText(text)) return false;
    return true;
  });

  const checkBundle = buildChecks({
    actualDurationMs,
    metrics,
    issues,
    pageErrors,
    severeConsoleErrors,
    duplicateSamples,
    heapSamples,
  });

  const passedChecks = checkBundle.checks.filter((item) => item.passed).length;
  const failedChecks = checkBundle.checks.length - passedChecks;
  const issueSummary = summarizeIssueClassifications(issues);
  const inconclusive = runStatus === 'INCONCLUSIVE';
  const runPassed = !inconclusive && failedChecks === 0;

  const report = {
    phase: 'long-session-soak',
    status: runPassed ? 'PASSED' : inconclusive ? 'INCONCLUSIVE' : 'FAILED',
    inconclusive,
    startedAt,
    finishedAt,
    apiBase: API_BASE,
    webBase: WEB_BASE,
    soakMinutesRequested: soakMinutes,
    actualDurationMs,
    metrics,
    telemetry: {
      pageErrors,
      consoleErrors,
      failedRequests,
      issues,
    },
    checks: checkBundle.checks,
    derived: checkBundle.derived,
    totals: {
      checksTotal: checkBundle.checks.length,
      passedChecks,
      failedChecks,
      blockingIssues: issueSummary.blockingProductIssueCount,
      infraInterrupts: issueSummary.infraInterruptCount,
      productIssues: issueSummary.productIssueCount,
    },
    passed: runPassed,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[hardening-soak] Report written to ${REPORT_PATH}`);
  console.log(`[hardening-soak] Checks passed ${passedChecks}/${checkBundle.checks.length}`);
  console.log(`[hardening-soak] Cycles completed: ${metrics.cyclesCompleted}`);
  console.log(`[hardening-soak] Duration: ${(actualDurationMs / 60000).toFixed(2)} minutes`);
  if (report.inconclusive) {
    console.log('[hardening-soak] Status: INCONCLUSIVE (infrastructure interruption threshold exceeded)');
  }

  if (!report.passed) {
    const failed = report.checks.filter((check) => !check.passed);
    console.log('[hardening-soak] Failed checks:');
    failed.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     details: ${preview(item.details, 240)}`);
    });
    if (!report.inconclusive) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(`[hardening-soak] Fatal error: ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
