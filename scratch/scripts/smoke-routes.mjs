const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173';

const ROUTES = [
  '/',
  '/auth',
  '/dashboard',
  '/problems',
  '/problem/a1',
  '/companies',
  '/company/google',
  '/roadmap',
  '/concept-map',
  '/revision',
  '/profile',
  '/learn',
  '/learn/cn',
];

const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

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

async function checkRoute(route) {
  const url = `${BASE_URL}${route}`;
  const request = () =>
    withTimeout(
      fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/html' },
      }),
      REQUEST_TIMEOUT_MS,
    );

  let response;
  try {
    response = await request();
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    if (!timedOut) throw error;
    // Retry once to tolerate first-hit cold compilation in dev mode.
    response = await request();
  }

  if (!response.ok) {
    return { route, ok: false, status: response.status, reason: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const hasHtml = html.includes('<html');
  const hasBody = html.includes('<body');
  const runtimeError = /ReferenceError|TypeError|Application error|Runtime Error/i.test(html);

  if (!hasHtml || !hasBody) {
    return { route, ok: false, status: response.status, reason: 'Invalid HTML shell response' };
  }
  if (runtimeError) {
    return { route, ok: false, status: response.status, reason: 'Runtime error signature in HTML' };
  }

  return { route, ok: true, status: response.status };
}

async function main() {
  console.log(`Smoke checking ${ROUTES.length} routes on ${BASE_URL}`);
  const results = [];

  for (const route of ROUTES) {
    try {
      const result = await checkRoute(route);
      results.push(result);
      if (result.ok) {
        console.log(`PASS ${route} (${result.status})`);
      } else {
        console.log(`FAIL ${route} (${result.status}) - ${result.reason}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({ route, ok: false, status: 0, reason });
      console.log(`FAIL ${route} (0) - ${reason}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`\n${failed.length} route(s) failed smoke checks.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll route smoke checks passed.');
}

main().catch((error) => {
  console.error('Smoke check script failed unexpectedly:', error);
  process.exitCode = 1;
});

