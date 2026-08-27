import { chromium } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readPrimaryEditorCode(page) {
  return page.evaluate(() => {
    const fallback = document.getElementById('fallback-editor');
    if (fallback) return fallback.value || '';

    const monacoApi = window.monaco?.editor;
    if (!monacoApi?.getModels) return '';
    const models = monacoApi.getModels();
    const preferred = models.find((model) => model.getLanguageId() !== 'sql') || models[0];
    return preferred?.getValue() || '';
  });
}

async function waitForExecutionOutput(page) {
  await page.waitForFunction(() => {
    const node = document.getElementById('console-output');
    if (!node) return false;
    const text = (node.textContent || '').trim();
    if (!text) return false;
    return !text.includes('Running code...');
  }, { timeout: 90000 });
}

function logStep(message) {
  console.log(`[pw] ${message}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  const runtimeErrors = [];
  const http500Responses = [];
  const failedRequests = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 500) {
      http500Responses.push(`${status} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.method()} ${request.url()} -> ${failure?.errorText || 'unknown'}`);
  });

  await page.addInitScript(() => {
    const STORAGE_KEY = 'robinhood_data';
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    let existing = {};
    try {
      existing = existingRaw ? JSON.parse(existingRaw) : {};
    } catch (_) {
      existing = {};
    }

    existing.user = existing.user || {
      id: 'playwright-user',
      name: 'Playwright User',
      email: 'playwright@example.com',
      joinDate: new Date().toISOString().split('T')[0],
    };

    existing.preferences = {
      theme: 'dark',
      sidebarCollapsed: false,
      ...(existing.preferences || {}),
      editor: {
        fontSize: 14,
        wordWrap: 'off',
        tabSize: 4,
        ...(existing.preferences?.editor || {}),
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  });

  logStep('open /problem/a1');
  await page.goto(`${BASE_URL}/problem/a1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.problem-detail-page', { timeout: 30000 });
  await page.waitForSelector('#monaco-container .monaco-editor, #fallback-editor', { timeout: 30000 });

  const monacoLoaded = await page.evaluate(() => {
    return Boolean(document.querySelector('#monaco-container .monaco-editor')) || Boolean(document.getElementById('fallback-editor'));
  });
  assert(monacoLoaded, 'Monaco or fallback editor did not initialize.');

  logStep('switch language to python');
  await page.selectOption('#lang-select', 'python');
  const pythonTemplate = await readPrimaryEditorCode(page);
  assert(pythonTemplate.includes('class Solution') || pythonTemplate.includes('def '), 'Language switch did not update template to python.');

  logStep('reset template');
  await page.click('#problem-reset-btn');
  const resetTemplate = await readPrimaryEditorCode(page);
  assert(resetTemplate.trim().length > 0, 'Reset did not restore template code.');

  logStep('click run');
  await page.click('#problem-run-btn');
  await waitForExecutionOutput(page);
  const runOutput = await page.locator('#console-output').innerText();
  assert(runOutput.length > 0, 'Run output panel is empty after execution.');

  logStep('click submit');
  const beforeSubmitOutput = runOutput;
  await page.click('#problem-submit-btn');
  await waitForExecutionOutput(page);
  const submitOutput = await page.locator('#console-output').innerText();
  assert(submitOutput.length > 0, 'Submit output panel is empty.');
  assert(submitOutput !== beforeSubmitOutput || submitOutput.includes('Mode: submit'), 'Submit output did not update after submit action.');

  logStep('validate no runtime console errors');
  if (runtimeErrors.length > 0) {
    const details = [
      `Browser runtime errors detected:\n${runtimeErrors.join('\n')}`,
      http500Responses.length > 0 ? `\nHTTP 500 responses:\n${http500Responses.join('\n')}` : '',
      failedRequests.length > 0 ? `\nFailed requests:\n${failedRequests.join('\n')}` : '',
    ].filter(Boolean).join('\n');
    throw new Error(details);
  }

  console.log('PASS browser route open /problem/a1');
  console.log('PASS Monaco/fallback editor load');
  console.log('PASS language switch template update');
  console.log('PASS reset template action');
  console.log('PASS run action output render');
  console.log('PASS submit action output render');
  console.log('PASS no console/page runtime errors');

  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error('Problem detail Playwright validation failed:', error?.message || String(error));
  if (error?.stack) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
