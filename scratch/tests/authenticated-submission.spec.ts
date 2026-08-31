import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * Regression cover for a P0 the existing suite could not detect.
 *
 * The server authenticates ONLY via `Authorization: Bearer` -- there is no session
 * cookie. The problem page's API layer sent no such header, so every authenticated
 * call it made returned 401, including Submit. The platform's central action did not
 * work from the UI at all, while working fine when the API was called directly.
 *
 * Why submission-flow.spec.ts missed it:
 *   - it navigates to /problem/two-sum, a slug that is not seeded;
 *   - it never signs in, so a 401 is indistinguishable from expected behaviour;
 *   - every assertion is wrapped in `if (await button.isEnabled())`, so the test
 *     passes vacuously when the button never becomes clickable;
 *   - it waits for `.pp-status-banner`, which also renders for a failure, so an
 *     auth error satisfies it.
 *
 * This test signs in for real, primes the client store the way the app does, and
 * asserts on the VERDICT rather than on the presence of a banner.
 */

const API = 'http://127.0.0.1:3000';
const PROBLEM_SLUG = 'house-robber';
const CLIENT_STATE_KEY = 'robinhood_data';

const CORRECT_JS = `function rob(nums) {
  let twoBack = 0, oneBack = 0;
  for (const value of nums) {
    const best = Math.max(oneBack, twoBack + value);
    twoBack = oneBack;
    oneBack = best;
  }
  return oneBack;
}`;

type Session = { token: string; userId: string; email: string };

/**
 * Replace the editor contents with `code`.
 *
 * Two pieces of sequencing matter. Monaco here is a CONTROLLED component
 * (`value={code}`), and the page mounts it with a generic default starter before the
 * problem's own `starter_code` arrives from the API. Writing too early is silently
 * undone when that response lands, which shows up as a submission of the untouched
 * starter -- a Wrong Answer that looks like a product bug and is not one.
 *
 * So: wait until the problem's starter is actually in the model, then write, then
 * confirm the write survived.
 */
async function setEditorCode(page: import('@playwright/test').Page, code: string): Promise<void> {
  await page.waitForFunction(
    () => Boolean((window as unknown as { monaco?: { editor: { getModels: () => unknown[] } } }).monaco?.editor?.getModels().length),
    null,
    { timeout: 30000 },
  );

  // The seeded JavaScript starter for this problem declares the entrypoint, so its
  // presence is the signal that the API response has been applied.
  await page.waitForFunction(
    () => {
      const monaco = (window as unknown as {
        monaco: { editor: { getModels: () => { getValue: () => string }[] } };
      }).monaco;
      return monaco.editor.getModels().some((m) => m.getValue().includes('function rob'));
    },
    null,
    { timeout: 30000 },
  );

  await page.evaluate((next) => {
    const monaco = (window as unknown as {
      monaco: { editor: { getModels: () => { getValue: () => string; setValue: (v: string) => void }[] } };
    }).monaco;
    const models = monaco.editor.getModels();
    const target = models.find((m) => m.getValue().includes('function rob')) ?? models[0];
    target.setValue(next);
  }, code);

  // Guard against the controlled component resetting us after the fact.
  await page.waitForFunction(
    (expected) => {
      const monaco = (window as unknown as {
        monaco: { editor: { getModels: () => { getValue: () => string }[] } };
      }).monaco;
      return monaco.editor.getModels().some((m) => m.getValue() === expected);
    },
    code,
    { timeout: 10000 },
  );
}

async function createSession(): Promise<Session> {
  const api = await playwrightRequest.newContext({ baseURL: API });
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Str0ng-Passw0rd!';

  const signup = await api.post('/api/auth/signup', { data: { email, password, name: 'E2E Bot' } });
  expect(signup.status(), 'signup must succeed').toBeLessThan(300);

  const login = await api.post('/api/auth/login', { data: { email, password } });
  expect(login.ok(), 'login must succeed').toBeTruthy();
  const body = await login.json();
  expect(body.sessionToken, 'login must return a session token').toBeTruthy();

  await api.dispose();
  return { token: body.sessionToken, userId: body.user?.id ?? '', email };
}

// A real submission runs every test case through the provider, which on Paiza is two
// requests per case with a per-case compile. The repo default of 30s is not enough
// headroom for that, and a test that passes on timing luck is worse than none.
test.describe.configure({ timeout: 240_000 });

test.describe('authenticated submission through the UI', () => {
  test('Submit reaches the grader and reports a real verdict', async ({ page }) => {
    const session = await createSession();

    // Prime localStorage exactly as src/store.js persists it, before any app code
    // runs. This is what a signed-in browser looks like.
    await page.addInitScript(
      ([key, token, userId, email]) => {
        window.localStorage.setItem(key as string, JSON.stringify({
          sessionToken: token,
          user: { id: userId, email, name: 'E2E Bot' },
        }));
      },
      [CLIENT_STATE_KEY, session.token, session.userId, session.email],
    );

    // Fail loudly on an auth error rather than waiting for a timeout.
    const unauthorized: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 401 && res.url().includes('/api/')) unauthorized.push(res.url());
    });

    await page.goto(`/problem/${PROBLEM_SLUG}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 30000 });

    await setEditorCode(page, CORRECT_JS);

    const submitBtn = page.locator('.pp-btn--submit');
    await expect(submitBtn, 'Submit must be enabled once the problem has loaded').toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    const banner = page.locator('.pp-status-banner').first();
    await expect(banner).toBeVisible({ timeout: 60000 });

    expect(
      unauthorized,
      `no /api call may return 401 for a signed-in user; got: ${unauthorized.join(', ')}`,
    ).toHaveLength(0);

    // The verdict itself, not merely the presence of a banner.
    await expect(banner).toContainText(/Accepted/i, { timeout: 60000 });
  });

  test('Run grades only the visible cases and records no attempt', async ({ page }) => {
    const session = await createSession();

    await page.addInitScript(
      ([key, token, userId, email]) => {
        window.localStorage.setItem(key as string, JSON.stringify({
          sessionToken: token,
          user: { id: userId, email, name: 'E2E Bot' },
        }));
      },
      [CLIENT_STATE_KEY, session.token, session.userId, session.email],
    );

    // Run must go to /api/execute/run, not /api/learning/submit. Using the submit
    // endpoint is what made every exploratory Run persist an attempt and grade
    // against hidden cases in contradiction of the UI's own label.
    const called: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() === 'POST' && url.includes('/api/')) called.push(new URL(url).pathname);
    });

    await page.goto(`/problem/${PROBLEM_SLUG}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 30000 });
    await setEditorCode(page, CORRECT_JS);

    const runBtn = page.locator('.pp-btn--run');
    await expect(runBtn).toBeEnabled({ timeout: 15000 });
    await runBtn.click();

    await expect(page.locator('.pp-status-banner, .pp-tc-card').first()).toBeVisible({ timeout: 60000 });

    expect(called, 'Run must call /api/execute/run').toContain('/api/execute/run');
    expect(called, 'Run must NOT call the submit endpoint').not.toContain('/api/learning/submit');
  });
});
