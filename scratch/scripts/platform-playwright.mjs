import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const WEB_BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const QA_USER_ID = process.env.PLATFORM_QA_USER_ID || 'playwright-platform-user';
const JOURNEY_FILTER = process.env.PLATFORM_QA_JOURNEY || '';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url || '');
  }
}

function isTruthyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function createLearnSessionToken(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/learn/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !isTruthyString(payload?.token)) return null;
    return payload.token;
  } catch {
    return null;
  }
}

function buildSeedState(userId, sessionToken) {
  return {
    user: {
      id: userId,
      name: 'Playwright QA',
      email: 'playwright.qa@example.com',
      joinDate: new Date().toISOString().split('T')[0],
    },
    sessionToken: sessionToken || null,
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
    streaks: {
      current: 2,
      longest: 4,
    },
    xp: {
      total: 120,
      level: 2,
      title: 'Apprentice',
    },
  };
}

const INIT_SCRIPT = (seed) => {
  const STORAGE_KEY = 'robinhood_data';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));

  if (window.__pwListenerPatchInstalled) {
    return;
  }

  window.__pwListenerPatchInstalled = true;
  const targetRegistry = new WeakMap();
  const duplicates = [];
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;

  const targetLabel = (target) => {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target instanceof Element) {
      const id = target.id ? `#${target.id}` : '';
      const cls = typeof target.className === 'string' && target.className.trim()
        ? `.${target.className.trim().split(/\s+/).join('.')}`
        : '';
      return `${target.tagName.toLowerCase()}${id}${cls}`;
    }
    return Object.prototype.toString.call(target);
  };

  const normalizedCapture = (options) => {
    if (typeof options === 'boolean') return options;
    if (!options || typeof options !== 'object') return false;
    return Boolean(options.capture);
  };

  const ensureBucket = (target, eventName, capture, create = false) => {
    let byEvent = targetRegistry.get(target);
    if (!byEvent && create) {
      byEvent = new Map();
      targetRegistry.set(target, byEvent);
    }
    if (!byEvent) return null;

    const eventKey = `${eventName}|${capture ? 'capture' : 'bubble'}`;
    let bucket = byEvent.get(eventKey);
    if (!bucket && create) {
      bucket = new Map();
      byEvent.set(eventKey, bucket);
    }
    return bucket || null;
  };

  EventTarget.prototype.addEventListener = function patchedAdd(eventName, listener, options) {
    try {
      if (listener && (typeof listener === 'function' || typeof listener === 'object')) {
        const capture = normalizedCapture(options);
        const bucket = ensureBucket(this, eventName, capture, true);
        const existingCount = bucket.get(listener) || 0;
        if (existingCount > 0) {
          duplicates.push({
            eventName,
            capture,
            target: targetLabel(this),
            ts: Date.now(),
          });
        }
        bucket.set(listener, existingCount + 1);
      }
    } catch {
      // Ignore instrumentation failures to avoid impacting app behavior.
    }

    return originalAdd.call(this, eventName, listener, options);
  };

  EventTarget.prototype.removeEventListener = function patchedRemove(eventName, listener, options) {
    try {
      if (listener && (typeof listener === 'function' || typeof listener === 'object')) {
        const capture = normalizedCapture(options);
        const bucket = ensureBucket(this, eventName, capture, false);
        if (bucket && bucket.has(listener)) {
          const currentCount = bucket.get(listener) || 0;
          if (currentCount <= 1) {
            bucket.delete(listener);
          } else {
            bucket.set(listener, currentCount - 1);
          }
        }
      }
    } catch {
      // Ignore instrumentation failures to avoid impacting app behavior.
    }

    return originalRemove.call(this, eventName, listener, options);
  };

  window.__pwListenerDiagnostics = () => ({
    duplicateCount: duplicates.length,
    duplicates: duplicates.slice(-25),
  });
};

function buildTelemetry(page) {
  const telemetry = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    apiResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text() || '';
    if (/favicon\.ico/i.test(text)) return;
    telemetry.consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    telemetry.pageErrors.push(error?.message || String(error));
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown';
    if (/ERR_ABORTED/i.test(failure)) return;
    telemetry.failedRequests.push(`${request.method()} ${request.url()} -> ${failure}`);
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/')) return;

    const entry = {
      url,
      path: pathOf(url),
      status: response.status(),
      method: response.request().method(),
      payload: null,
    };

    try {
      const body = await response.text();
      if (body) {
        try {
          entry.payload = JSON.parse(body);
        } catch {
          entry.payload = body;
        }
      }
    } catch {
      // Leave payload as null if body cannot be read.
    }

    telemetry.apiResponses.push(entry);
  });

  return telemetry;
}

async function ensurePageShell(page, waitSelector) {
  await page.waitForSelector(waitSelector, { timeout: 60000 });

  const shell = await page.evaluate(() => {
    const root =
      document.querySelector('.dashboard-page, .experience-page, .problem-detail-page, .profile-page, .auth-page, #main-content, main') ||
      document.body;

    const textLength = String(root?.innerText || '').replace(/\s+/g, '').length;
    const interactiveCount = document.querySelectorAll('button, a, input, select, textarea').length;

    return {
      textLength,
      interactiveCount,
      bodyChildren: document.body?.children?.length || 0,
    };
  });

  assert(shell.bodyChildren > 0, 'White screen detected: body has no children.');
  assert(shell.textLength > 20 || shell.interactiveCount >= 3, 'White screen detected: rendered page appears empty.');
}

async function ensureNoLayoutOverflow(page, deviceLabel) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const maxWidth = Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0);
    const viewportWidth = window.innerWidth || 0;
    const overflowPx = maxWidth - viewportWidth;
    return {
      maxWidth,
      viewportWidth,
      overflowPx,
    };
  });

  assert(
    overflow.overflowPx <= 4,
    `Layout overflow on ${deviceLabel}: content width ${overflow.maxWidth}px exceeds viewport ${overflow.viewportWidth}px by ${overflow.overflowPx}px.`,
  );
}

async function verifyDropdowns(page) {
  const dropdownStatus = await page.evaluate(() => {
    const visibleSelects = Array.from(document.querySelectorAll('select'))
      .filter((node) => node instanceof HTMLSelectElement)
      .filter((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && !node.disabled;
      });

    const tested = [];

    visibleSelects.slice(0, 3).forEach((select) => {
      const options = Array.from(select.options || []).filter((opt) => !opt.disabled);
      if (options.length < 2) {
        tested.push({ id: select.id || '(anonymous)', status: 'skipped' });
        return;
      }

      const original = select.value;
      const candidate = options.find((opt) => opt.value !== original) || options[0];
      if (!candidate) {
        tested.push({ id: select.id || '(anonymous)', status: 'skipped' });
        return;
      }

      select.value = candidate.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const changed = select.value === candidate.value;

      select.value = original;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      tested.push({ id: select.id || '(anonymous)', status: changed ? 'passed' : 'failed' });
    });

    return {
      count: visibleSelects.length,
      tested,
    };
  });

  const failedDropdown = dropdownStatus.tested.find((item) => item.status === 'failed');
  if (failedDropdown) {
    throw new Error(`Dropdown dead interaction detected on ${failedDropdown.id}.`);
  }
  return dropdownStatus;
}

async function runTransitionAndBack(page, transitionTarget, returnSelector) {
  if (!transitionTarget) return;

  const originPath = pathOf(page.url());
  if (originPath === transitionTarget) return;

  let transitioned = false;

  try {
    await page.evaluate((target) => {
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(target);
      }
    }, transitionTarget);

    await page.waitForFunction((expectedPath) => window.location.pathname === expectedPath, transitionTarget, { timeout: 15000 });
    transitioned = true;
  } catch {
    // fallback to hard navigation if client router transition is unavailable
  }

  if (!transitioned) {
    await page.goto(`${WEB_BASE}${transitionTarget}`, { waitUntil: 'networkidle', timeout: 60000 });
  }

  await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction((expectedPath) => window.location.pathname === expectedPath, originPath, { timeout: 20000 });
  if (returnSelector) {
    await page.waitForSelector(returnSelector, { timeout: 20000 });
  }
}

function checkApiContracts(contracts, apiResponses) {
  const issues = [];

  for (const contract of contracts || []) {
    const matched = apiResponses.filter((entry) => contract.pattern.test(entry.path));

    if (matched.length === 0) {
      issues.push(`Missing API payload render for ${contract.name} (${contract.pattern}).`);
      continue;
    }

    const allowedStatuses = Array.isArray(contract.allowedStatuses) && contract.allowedStatuses.length
      ? contract.allowedStatuses
      : [200];

    const statusFailure = matched.find((entry) => !allowedStatuses.includes(entry.status));
    if (statusFailure) {
      issues.push(`API contract mismatch for ${contract.name}: ${statusFailure.status} on ${statusFailure.path}.`);
      continue;
    }

    const payloadFailure = matched.find((entry) => !contract.validate(entry.payload, entry.status));
    if (payloadFailure) {
      issues.push(`API contract mismatch for ${contract.name}: invalid payload on ${payloadFailure.path}.`);
    }
  }

  return issues;
}

async function evaluateDuplicateListeners(page) {
  return page.evaluate(() => {
    if (typeof window.__pwListenerDiagnostics !== 'function') {
      return { duplicateCount: 0, duplicates: [] };
    }
    return window.__pwListenerDiagnostics();
  });
}

const JOURNEYS = [
  {
    key: 'dashboard',
    route: '/dashboard',
    waitFor: '.dashboard-page',
    transitionTarget: '/learn',
    apiContracts: [
      {
        name: 'dashboard analytics',
        pattern: /\/api\/dashboard\/analytics\//,
        validate: (payload) => payload && payload.ok === true && Array.isArray(payload.todayPlan),
      },
      {
        name: 'leaderboard payload',
        pattern: /\/api\/gamification\/leaderboard/,
        validate: (payload) => payload && typeof payload.ok === 'boolean' && Array.isArray(payload.leaderboard),
      },
    ],
    test: async (page) => {
      await page.waitForSelector('#today-plan-grid .plan-card', { timeout: 20000 });
      const cardCount = await page.locator('#today-plan-grid .plan-card').count();
      assert(cardCount > 0, 'Missing data render: today plan cards are empty on dashboard.');

      const pathBefore = pathOf(page.url());
      await page.locator('#today-plan-grid .plan-card').first().click();
      await page.waitForFunction((before) => window.location.pathname !== before, pathBefore, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction((expected) => window.location.pathname === expected, pathBefore, { timeout: 20000 });
    },
  },
  {
    key: 'learn hub',
    route: '/learn',
    waitFor: '#learn-tree-container',
    transitionTarget: '/dashboard',
    skipGenericDropdownCheck: true,
    apiContracts: [
      {
        name: 'learn subject tree',
        pattern: /\/api\/content\/subject\//,
        validate: (payload) => payload && payload.tree && Array.isArray(payload.tree.chapters),
      },
    ],
    test: async (page) => {
      const routeStart = pathOf(page.url());
      await page.selectOption('#learn-subject-select', { index: 1 });
      await page.waitForURL(/\/learn\/[^/]+$/, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction((expected) => window.location.pathname === expected, routeStart, { timeout: 20000 });

      await page.waitForSelector('#learn-tree-container', { timeout: 20000 });
      await page.waitForSelector('[data-topic-open]', { timeout: 20000 });
      const topicCount = await page.locator('[data-topic-open]').count();
      assert(topicCount > 0, 'Missing data render: no topics rendered on learn hub.');

      const pathBefore = pathOf(page.url());
      await page.locator('[data-topic-open]').first().click();
      await page.waitForURL(/\/learn\/[^/]+\/topic\//, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(
        (expected) => window.location.pathname === expected || window.location.pathname.startsWith(`${expected}/`),
        pathBefore,
        { timeout: 20000 },
      );
    },
  },
  {
    key: 'subject page',
    route: '/learn/cn',
    waitFor: '#subject-chapter-tree',
    transitionTarget: '/learn',
    apiContracts: [
      {
        name: 'subject tree refresh',
        pattern: /\/api\/content\/subject\//,
        validate: (payload) => payload && payload.tree && Array.isArray(payload.tree.chapters),
      },
    ],
    test: async (page) => {
      await page.waitForSelector('[data-topic-open]', { timeout: 20000 });

      const pathBefore = pathOf(page.url());
      await page.click('#subject-open-first-topic');
      await page.waitForURL(/\/learn\/[^/]+\/topic\//, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction((expected) => window.location.pathname === expected, pathBefore, { timeout: 20000 });

      await page.locator('[data-topic-open]').first().click();
      await page.waitForURL(/\/learn\/[^/]+\/topic\//, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction((expected) => window.location.pathname === expected, pathBefore, { timeout: 20000 });
    },
  },
  {
    key: 'topic page',
    route: '/learn/cn/topic/osi-and-tcp-ip',
    waitFor: '#subtopic-grid',
    transitionTarget: '/learn/cn',
    apiContracts: [
      {
        name: 'topic tree refresh',
        pattern: /\/api\/content\/subject\//,
        validate: (payload) => payload && payload.tree && Array.isArray(payload.tree.chapters),
      },
    ],
    test: async (page) => {
      await page.waitForSelector('[data-subtopic-open]', { timeout: 20000 });
      const subtopicCount = await page.locator('[data-subtopic-open]').count();
      assert(subtopicCount > 0, 'Missing data render: no subtopic buttons on topic page.');

      const pathBefore = pathOf(page.url());
      await page.locator('[data-subtopic-open]').first().click();
      await page.waitForURL(/\/subtopic\//, { timeout: 20000 });
      await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction((expected) => window.location.pathname === expected, pathBefore, { timeout: 20000 });
    },
  },
  {
    key: 'subtopic tabs',
    route: '/learn/cn/topic/osi-and-tcp-ip/subtopic/layer-responsibilities',
    waitFor: '#subtopic-tab-content',
    transitionTarget: '/learn/cn/topic/osi-and-tcp-ip',
    apiContracts: [
      {
        name: 'pdf payload',
        pattern: /\/api\/content\/pdf\//,
        validate: (payload) => payload && (isTruthyString(payload.url) || isTruthyString(payload.content) || isTruthyString(payload.summary)),
      },
      {
        name: 'notes payload',
        pattern: /\/api\/content\/notes\//,
        validate: (payload) => payload && Array.isArray(payload.notes),
      },
      {
        name: 'youtube payload',
        pattern: /\/api\/content\/youtube\//,
        validate: (payload) => payload && Array.isArray(payload.videos),
      },
    ],
    test: async (page) => {
      const notesTab = page.locator('[data-tab-open="notes"]').first();
      await notesTab.click();
      await page.waitForFunction(() => {
        const text = document.getElementById('subtopic-tab-content')?.textContent || '';
        return !/Loading\.\.\./i.test(text);
      }, { timeout: 30000 });

      const youtubeTab = page.locator('[data-tab-open="youtube"]').first();
      await youtubeTab.click();
      await page.waitForFunction(() => {
        const text = document.getElementById('subtopic-tab-content')?.textContent || '';
        return !/Loading\.\.\./i.test(text);
      }, { timeout: 30000 });

      const contentText = await page.locator('#subtopic-tab-content').innerText();
      assert(!/Unable to load/i.test(contentText), 'Missing data render: subtopic tab content failed to load.');
    },
  },
  {
    key: 'problem detail',
    route: '/problem/a1',
    waitFor: '.problem-detail-page',
    transitionTarget: '/dashboard',
    apiContracts: [
      {
        name: 'problem run payload',
        pattern: /\/api\/execute\/run$/,
        validate: (payload) => payload && typeof payload.success === 'boolean' && (payload.output !== undefined || payload.error !== undefined),
      },
    ],
    test: async (page) => {
      await page.waitForSelector('#monaco-container .monaco-editor, #fallback-editor', { timeout: 30000 });

      await page.selectOption('#lang-select', 'python');
      await page.click('#problem-reset-btn');

      await page.click('#problem-run-btn');
      await page.waitForFunction(() => {
        const text = document.getElementById('console-output')?.textContent || '';
        return !text.includes('Running code...') && text.trim().length > 0;
      }, { timeout: 90000 });

      const outputText = await page.locator('#console-output').innerText();
      assert(outputText.trim().length > 0, 'Missing data render: run output panel stayed empty.');
    },
  },
  {
    key: 'SQL editor',
    route: '/problem/a1',
    waitFor: '.problem-detail-page',
    transitionTarget: '/dashboard',
    apiContracts: [
      {
        name: 'sql execution payload',
        pattern: /\/api\/execute\/sql$/,
        validate: (payload) => payload && typeof payload.success === 'boolean' && payload.output !== undefined,
      },
    ],
    test: async (page) => {
      await page.click('#tab-sql');
      await page.waitForSelector('#console-sql', { timeout: 20000 });

      const before = await page.locator('#sql-result-panel').innerText();
      await page.click('#run-sql-btn');
      await page.waitForFunction((previous) => {
        const text = document.getElementById('sql-result-panel')?.textContent || '';
        return text.trim().length > 0 && text !== previous;
      }, before, { timeout: 45000 });

      const resultText = await page.locator('#sql-result-panel').innerText();
      assert(!/Query results will appear here/i.test(resultText), 'Missing data render: SQL result panel did not update.');
    },
  },
  {
    key: 'AI mentor',
    route: '/problem/a1',
    waitFor: '.problem-detail-page',
    transitionTarget: '/dashboard',
    apiContracts: [
      {
        name: 'ask robin payload',
        pattern: /\/api\/ai\/learn$/,
        allowedStatuses: [200, 429],
        validate: (payload, status) => {
          if (!payload || typeof payload !== 'object') return false;
          if (status === 429) return isTruthyString(payload.reason);
          return isTruthyString(payload.reply) || isTruthyString(payload.response) || isTruthyString(payload.answer);
        },
      },
    ],
    test: async (page) => {
      await page.waitForSelector('#ask-robin-fab', { timeout: 20000 });
      await page.click('#ask-robin-fab');
      await page.waitForSelector('#ask-robin-panel:not(.hidden)', { timeout: 20000 });

      await page.locator('[data-robin-action]').first().click();
      await page.waitForFunction(() => {
        const text = document.getElementById('robin-response')?.textContent || '';
        return text.trim().length > 0 && !/Robin is thinking/i.test(text);
      }, { timeout: 90000 });

      const responseText = await page.locator('#robin-response').innerText();
      assert(responseText.trim().length > 0, 'Missing data render: Ask Robin response panel is empty.');
    },
  },
  {
    key: 'interview mock',
    route: '/interview/mock',
    waitFor: '#mock-session-start',
    transitionTarget: '/interview/technical',
    apiContracts: [
      {
        name: 'mock interview payload',
        pattern: /\/api\/interview\/mock-session$/,
        validate: (payload) => payload && (isTruthyString(payload.sessionId) || isTruthyString(payload.initialPrompt)),
      },
    ],
    test: async (page) => {
      await page.selectOption('#mock-type', 'behavioral');
      await page.selectOption('#mock-company', 'Google');

      await page.click('#mock-session-start');
      await page.waitForFunction(() => {
        const text = document.getElementById('mock-session-output')?.textContent || '';
        return text.trim().length > 0 && !/Session output appears here/i.test(text) && !/Creating session\.\.\./i.test(text);
      }, { timeout: 45000 });

      const outputText = await page.locator('#mock-session-output').innerText();
      assert(!/Failed to create session/i.test(outputText), 'API payload rendering failed: mock session creation error.');
    },
  },
  {
    key: 'debugger',
    route: '/debugger',
    waitFor: '#debugger-code',
    transitionTarget: '/dashboard',
    apiContracts: [
      {
        name: 'debugger run payload',
        pattern: /\/api\/debugger\/run$/,
        allowedStatuses: [200, 429, 500],
        validate: (payload) => payload && (Array.isArray(payload.trace) || Array.isArray(payload.watch) || isTruthyString(payload.output) || payload.parsedError),
      },
      {
        name: 'debugger sql payload',
        pattern: /\/api\/debugger\/sql$/,
        validate: (payload) => payload && (isTruthyString(payload.explanation) || Array.isArray(payload.output) || Array.isArray(payload.rows)),
      },
    ],
    test: async (page) => {
      await page.fill('#debugger-code', 'a=1\nb=2\nprint(a+b)');
      await page.selectOption('#debugger-language', 'python');
      await page.click('#debugger-run');

      await page.waitForFunction(() => {
        const text = document.getElementById('debugger-trace-output')?.textContent || '';
        return text.trim().length > 0 && !/Running trace\.\.\./i.test(text) && !/Trace output appears here/i.test(text);
      }, { timeout: 60000 });

      await page.fill('#debugger-sql', 'SELECT 1 AS ok;');
      await page.click('#debugger-sql-run');
      await page.waitForFunction(() => {
        const text = document.getElementById('debugger-sql-output')?.textContent || '';
        return text.trim().length > 0 && !/Validating SQL\.\.\./i.test(text) && !/SQL debug output appears here/i.test(text);
      }, { timeout: 45000 });
    },
  },
  {
    key: 'scheduler',
    route: '/scheduler',
    waitFor: '#scheduler-tasks',
    transitionTarget: '/analytics',
    apiContracts: [
      {
        name: 'scheduler today payload',
        pattern: /\/api\/scheduler\/today/,
        validate: (payload) => payload && Array.isArray(payload.tasks),
      },
      {
        name: 'scheduler create payload',
        pattern: /\/api\/scheduler\/create$/,
        allowedStatuses: [200, 201],
        validate: (payload) => payload && (payload.ok === true || payload.success === true || payload.task || payload.id),
      },
    ],
    test: async (page) => {
      await page.waitForFunction(() => {
        const text = document.getElementById('scheduler-tasks')?.textContent || '';
        return text.trim().length > 0 && !/Loading tasks/i.test(text);
      }, { timeout: 30000 });

      await page.fill('#scheduler-task-title', `QA task ${Date.now()}`);
      await page.fill('#scheduler-task-date', new Date().toISOString().split('T')[0]);
      await page.click('#scheduler-create-btn');

      await page.waitForFunction(() => {
        const text = document.getElementById('scheduler-create-status')?.textContent || '';
        return text.includes('Task created') || text.includes('Failed');
      }, { timeout: 45000 });

      const statusText = await page.locator('#scheduler-create-status').innerText();
      assert(!/Failed:/i.test(statusText), `Scheduler create failed: ${statusText}`);
    },
  },
  {
    key: 'analytics',
    route: '/analytics',
    waitFor: '#analytics-mastery',
    transitionTarget: '/dashboard',
    apiContracts: [
      {
        name: 'analytics progress payload',
        pattern: /\/api\/analytics\/progress/,
        validate: (payload) => payload && (typeof payload.mastery === 'number' || payload.ok === true),
      },
      {
        name: 'analytics streak payload',
        pattern: /\/api\/analytics\/streaks/,
        validate: (payload) => payload && (typeof payload.currentStreak === 'number' || Array.isArray(payload.mappedDays)),
      },
    ],
    test: async (page) => {
      await page.waitForFunction(() => {
        const mastery = (document.getElementById('analytics-mastery')?.textContent || '').trim();
        const streak = (document.getElementById('analytics-streak')?.textContent || '').trim();
        return mastery && streak && mastery !== '--' && streak !== '--';
      }, { timeout: 30000 });

      const mastery = await page.locator('#analytics-mastery').innerText();
      assert(!/Error/i.test(mastery), 'Missing data render: analytics mastery shows Error.');
    },
  },
  {
    key: 'auth login/signup',
    route: '/auth',
    waitFor: '#auth-form-container',
    transitionTarget: '/dashboard',
    apiContracts: [],
    test: async (page) => {
      await page.waitForSelector('#auth-submit-btn', { timeout: 20000 });
      await page.click('#switch-to-login');
      await page.waitForSelector('#auth-login-btn', { timeout: 20000 });
      await page.click('#switch-to-signup');
      await page.waitForSelector('#auth-submit-btn', { timeout: 20000 });

      await page.fill('#auth-password', 'StrongPassword123!');
      const strengthText = await page.locator('#password-strength').innerText();
      assert(strengthText.trim().length > 0, 'Missing data render: password strength did not update.');
    },
  },
  {
    key: 'profile/settings',
    route: '/profile',
    waitFor: '.profile-page',
    transitionTarget: '/dashboard',
    apiContracts: [],
    test: async (page) => {
      await page.waitForSelector('#profile-theme-toggle', { timeout: 20000 });

      const before = await page.locator('#profile-theme-toggle').evaluate((node) => node.classList.contains('active'));
      await page.click('#profile-theme-toggle');
      const after = await page.locator('#profile-theme-toggle').evaluate((node) => node.classList.contains('active'));
      assert(before !== after, 'Dead click: theme toggle did not change state on profile page.');

      await page.fill('#profile-bio', `Platform QA bio ${Date.now()}`);
      await page.click('#save-profile-bio');

      const goalCheckbox = page.locator('[data-goal-toggle]').first();
      if (await goalCheckbox.count()) {
        await goalCheckbox.click();
      }
    },
  },
];

async function runDesktopJourney(browser, seedState, journey) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(INIT_SCRIPT, seedState);
  page.setDefaultTimeout(120000);

  const telemetry = buildTelemetry(page);
  const issues = [];
  const checks = {
    pageLoad: 'pass',
    consoleErrors: 'pass',
    buttonsClickable: 'pass',
    dropdownsFunctional: 'pass',
    apiPayloadRendering: 'pass',
    loadingStates: 'pass',
    routeTransitions: 'pass',
    backNavigation: 'pass',
    duplicateListeners: 'pass',
    layoutOverflow: 'pass',
    whiteScreen: 'pass',
  };

  try {
    await page.goto(`${WEB_BASE}${journey.route}`, { waitUntil: 'networkidle', timeout: 120000 });
    await ensurePageShell(page, journey.waitFor);
    await ensureNoLayoutOverflow(page, 'desktop');

    if (!journey.skipGenericDropdownCheck) {
      const dropdownStatus = await verifyDropdowns(page);
      if (dropdownStatus.count === 0) {
        checks.dropdownsFunctional = 'pass (no-dropdowns-present)';
      }
    } else {
      checks.dropdownsFunctional = 'pass (journey-specific-dropdown-check)';
    }

    await journey.test(page);

    await runTransitionAndBack(page, journey.transitionTarget, journey.waitFor);

    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await sleep(400);

    const duplicateDiagnostics = await evaluateDuplicateListeners(page);
    if ((duplicateDiagnostics?.duplicateCount || 0) > 0) {
      checks.duplicateListeners = 'fail';
      issues.push(`Duplicate listeners detected (${duplicateDiagnostics.duplicateCount}).`);
    }

    const runtimeErrors = [
      ...telemetry.pageErrors.map((entry) => `pageerror: ${entry}`),
      ...telemetry.consoleErrors.map((entry) => `console: ${entry}`),
      ...telemetry.failedRequests.map((entry) => `requestfailed: ${entry}`),
    ];

    if (runtimeErrors.length > 0) {
      checks.consoleErrors = 'fail';
      issues.push(...runtimeErrors);
    }

    const apiIssues = checkApiContracts(journey.apiContracts, telemetry.apiResponses);
    if (apiIssues.length > 0) {
      checks.apiPayloadRendering = 'fail';
      issues.push(...apiIssues);
    }
  } catch (error) {
    checks.pageLoad = 'fail';
    issues.push(error?.message || String(error));
    if (error?.stack) {
      issues.push(error.stack.split('\n').slice(0, 4).join('\n'));
    }
  }

  await context.close();

  return {
    journey: journey.key,
    route: journey.route,
    device: 'desktop',
    status: issues.length ? 'FAIL' : 'PASS',
    checks,
    issues,
  };
}

async function runMobileJourney(browser, seedState, journey) {
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(INIT_SCRIPT, seedState);
  page.setDefaultTimeout(120000);

  const issues = [];

  try {
    await page.goto(`${WEB_BASE}${journey.route}`, { waitUntil: 'networkidle', timeout: 120000 });
    await ensurePageShell(page, journey.waitFor);
    await ensureNoLayoutOverflow(page, 'mobile');
  } catch (error) {
    issues.push(error?.message || String(error));
  }

  await context.close();

  return {
    journey: journey.key,
    route: journey.route,
    device: 'mobile',
    status: issues.length ? 'FAIL' : 'PASS',
    issues,
  };
}

function consolidateResults(desktopResults, mobileResults) {
  const merged = [];

  for (const desktop of desktopResults) {
    const mobile = mobileResults.find((entry) => entry.journey === desktop.journey);
    const combinedIssues = [...desktop.issues, ...(mobile?.issues || [])];

    merged.push({
      journey: desktop.journey,
      route: desktop.route,
      status: combinedIssues.length ? 'FAIL' : 'PASS',
      desktopStatus: desktop.status,
      mobileStatus: mobile?.status || 'FAIL',
      checks: desktop.checks,
      issues: combinedIssues,
    });
  }

  return merged;
}

function isRetriableFailure(issues = []) {
  const joined = issues.join('\n');
  return /ERR_NO_BUFFER_SPACE|Timeout\s*\d+ms|waiting for locator|net::ERR_ABORTED/i.test(joined);
}

function printMatrix(summary) {
  console.log('\n=== PLATFORM PLAYWRIGHT PASS / FAIL MATRIX ===');
  console.log('Journey | Route | Desktop | Mobile | Overall');
  console.log('--- | --- | --- | --- | ---');

  summary.forEach((item) => {
    console.log(`${item.journey} | ${item.route} | ${item.desktopStatus} | ${item.mobileStatus} | ${item.status}`);
  });

  console.log('\n=== ISSUE DETAILS ===');
  summary.forEach((item) => {
    if (!item.issues.length) {
      console.log(`PASS ${item.journey} (${item.route})`);
      return;
    }
    console.log(`FAIL ${item.journey} (${item.route})`);
    item.issues.forEach((issue) => {
      console.log(`  - ${issue}`);
    });
  });
}

async function main() {
  const sessionToken = await createLearnSessionToken(QA_USER_ID);
  const seedState = buildSeedState(QA_USER_ID, sessionToken);

  const browser = await chromium.launch({ headless: true });
  const desktopResults = [];
  const mobileResults = [];

  const selectedJourneys = JOURNEY_FILTER
    ? JOURNEYS.filter((journey) => journey.key === JOURNEY_FILTER)
    : JOURNEYS;

  if (selectedJourneys.length === 0) {
    throw new Error(`No journey matched PLATFORM_QA_JOURNEY=${JOURNEY_FILTER}`);
  }

  for (const journey of selectedJourneys) {
    console.log(`\n[pw] desktop journey: ${journey.key} (${journey.route})`);
    let desktop = await runDesktopJourney(browser, seedState, journey);
    if (desktop.status === 'FAIL' && isRetriableFailure(desktop.issues)) {
      console.log(`[pw] retry desktop journey: ${journey.key} (${journey.route})`);
      desktop = await runDesktopJourney(browser, seedState, journey);
    }
    desktopResults.push(desktop);

    console.log(`[pw] mobile journey: ${journey.key} (${journey.route})`);
    let mobile = await runMobileJourney(browser, seedState, journey);
    if (mobile.status === 'FAIL' && isRetriableFailure(mobile.issues)) {
      console.log(`[pw] retry mobile journey: ${journey.key} (${journey.route})`);
      mobile = await runMobileJourney(browser, seedState, journey);
    }
    mobileResults.push(mobile);
  }

  await browser.close();

  const summary = consolidateResults(desktopResults, mobileResults);
  const passCount = summary.filter((entry) => entry.status === 'PASS').length;
  const readinessPct = Math.round((passCount / summary.length) * 100);

  printMatrix(summary);
  console.log(`\nDeployment readiness: ${readinessPct}% (${passCount}/${summary.length} journeys passing)`);

  const report = {
    generatedAt: new Date().toISOString(),
    webBase: WEB_BASE,
    apiBase: API_BASE,
    readinessPct,
    passCount,
    totalJourneys: summary.length,
    journeys: summary,
  };

  const reportPath = path.join(process.cwd(), 'scripts', 'platform-playwright-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report written to ${reportPath}`);

  if (readinessPct < 100) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Platform Playwright suite crashed:', error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
