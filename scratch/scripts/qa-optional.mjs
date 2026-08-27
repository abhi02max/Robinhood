import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const CSS_PATH = path.join(APP_ROOT, 'src', 'styles', 'pages.css');
const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const LONG_SESSION_LOOPS = Number(process.env.QA_LONG_SESSION_LOOPS || 20);

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCssChecks() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const breakpoints = [1024, 768, 480];
  const missingBreakpoints = breakpoints.filter((bp) => !new RegExp(`@media \\(max-width:\\s*${bp}px\\)`).test(css));
  const keyframesCount = (css.match(/@keyframes\s+[a-zA-Z0-9_-]+/g) || []).length;
  const transitionCount = (css.match(/transition\s*:/g) || []).length;
  return {
    missingBreakpoints,
    keyframesCount,
    transitionCount,
  };
}

async function checkRoute(route) {
  const response = await withTimeout(
    fetch(`${BASE_URL}${route}`, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    }),
    REQUEST_TIMEOUT_MS,
  );
  const html = await response.text();
  return {
    status: response.status,
    hasHtml: html.includes('<html'),
    hasBody: html.includes('<body'),
    runtimeError: /ReferenceError|TypeError|Application error|Runtime Error/i.test(html),
  };
}

async function runLongSessionCheck() {
  const routes = ['/dashboard', '/problems', '/problem/a1', '/learn/cn', '/profile'];
  for (let i = 0; i < LONG_SESSION_LOOPS; i += 1) {
    const route = routes[i % routes.length];
    const result = await checkRoute(route);
    assert(result.status === 200, `Long-session check failed on ${route} with status ${result.status}`);
    assert(result.hasHtml && result.hasBody, `Invalid HTML shell during long-session check on ${route}`);
    assert(!result.runtimeError, `Runtime error signature found during long-session check on ${route}`);
  }
}

async function main() {
  const css = parseCssChecks();
  assert(css.missingBreakpoints.length === 0, `Missing responsive breakpoints: ${css.missingBreakpoints.join(', ')}`);
  assert(css.keyframesCount >= 3, `Insufficient animation keyframes (${css.keyframesCount})`);
  assert(css.transitionCount >= 20, `Insufficient transitions (${css.transitionCount})`);
  console.log(`PASS responsive CSS checks (keyframes=${css.keyframesCount}, transitions=${css.transitionCount})`);

  await runLongSessionCheck();
  console.log(`PASS long-session route stability (${LONG_SESSION_LOOPS} iterations)`);

  console.log('\nOptional QA checks passed.');
}

main().catch((error) => {
  console.error('Optional QA checks failed:', error?.message || String(error));
  process.exitCode = 1;
});
