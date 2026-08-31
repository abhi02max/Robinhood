import { test, expect, request as playwrightRequest, type Page } from '@playwright/test';

/**
 * Phase 2B gate: Java works end to end through the UI, for a signed-in user.
 *
 * Asserts the verdict and the persisted consequences, not the presence of a banner.
 * The earlier `submission-flow.spec.ts` demonstrated how a test can pass while the
 * feature is broken — it never signed in, wrapped everything in
 * `if (await button.isEnabled())`, and waited for a selector that also renders on
 * failure. None of that is repeated here.
 *
 * This spec was verified to FAIL against a deliberately broken Java configuration
 * (registry `harnessImplemented: false`), which is what makes a pass meaningful.
 */

const API = 'http://127.0.0.1:3000';
const PROBLEM_SLUG = 'house-robber';
const CLIENT_STATE_KEY = 'robinhood_data';

/**
 * One case per signature-driven language added in Phase 2.
 *
 * starterMarker is the fragment that proves the loaded starter came from THIS
 * problem's signature rather than the generic DEFAULT_STARTERS fallback — it encodes
 * the language's own parameter conventions, which is the thing most likely to be wrong.
 */
const LANGUAGES = [
  {
    key: 'java',
    label: 'Java',
    // Java 8 syntax on purpose: Judge0 CE ships OpenJDK 13, not Paiza's 18.
    starterMarker: 'public int rob(int[] nums)',
    solution: `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            int best = Math.max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = best;
        }
        return oneBack;
    }
}`,
  },
  {
    key: 'csharp',
    label: 'C#',
    // PascalCase, per LeetCode's C# convention and what the generated starter declares.
    starterMarker: 'public int Rob(int[] nums)',
    solution: `public class Solution {
    public int Rob(int[] nums) {
        int twoBack = 0, oneBack = 0;
        for (int i = 0; i < nums.Length; i++) {
            int best = Math.Max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = best;
        }
        return oneBack;
    }
}`,
  },
  {
    key: 'c',
    label: 'C',
    // The companion length parameter is C's whole calling convention; if the starter
    // does not carry it, the pipeline is wrong.
    starterMarker: 'int rob(int* nums, int numsSize)',
    solution: `int rob(int* nums, int numsSize) {
    int twoBack = 0, oneBack = 0, i;
    for (i = 0; i < numsSize; i++) {
        int best = oneBack > twoBack + nums[i] ? oneBack : twoBack + nums[i];
        twoBack = oneBack;
        oneBack = best;
    }
    return oneBack;
}`,
  },
] as const;

type Session = { token: string; userId: string; email: string };

async function createSession(): Promise<Session> {
  const api = await playwrightRequest.newContext({ baseURL: API });
  const email = `java-e2e-${Date.now()}@example.com`;
  const password = 'Str0ng-Passw0rd!';
  const signup = await api.post('/api/auth/signup', { data: { email, password, name: 'Java E2E' } });
  expect(signup.status(), 'signup must succeed').toBeLessThan(300);
  const login = await api.post('/api/auth/login', { data: { email, password } });
  expect(login.ok(), 'login must succeed').toBeTruthy();
  const body = await login.json();
  expect(body.sessionToken).toBeTruthy();
  await api.dispose();
  return { token: body.sessionToken, userId: body.user?.id ?? '', email };
}

async function signIn(page: Page, session: Session): Promise<void> {
  await page.addInitScript(
    ([key, token, userId, email]) => {
      window.localStorage.setItem(key as string, JSON.stringify({
        sessionToken: token,
        user: { id: userId, email, name: 'Java E2E' },
      }));
    },
    [CLIENT_STATE_KEY, session.token, session.userId, session.email],
  );
}

/**
 * Replace the editor contents.
 *
 * Monaco here is a controlled component and the page mounts it with a generic default
 * starter before the problem's own `starter_code` arrives. Writing too early is
 * silently undone when that response lands, which surfaces as a submission of the
 * untouched starter — a Wrong Answer that looks like a product bug and is not one.
 */
async function activeEditorValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const monaco = (window as unknown as {
      monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
    }).monaco;
    const editor = monaco?.editor.getEditors()[0];
    const model = editor ? editor.getModel() : null;
    return model ? model.getValue() : '';
  });
}

async function setEditorCode(page: Page, code: string, marker: string): Promise<void> {
  // Wait for the ACTIVE editor's model to hold the expected starter.
  //
  // Searching `getModels()` by content was flaky: switching language leaves the
  // previous language's model alive, so there are several, and the JavaScript starter
  // for this problem also contains "rob". Binding to the editor actually on screen
  // removes the ambiguity instead of papering over it with a retry.
  await page.waitForFunction(
    (needle) => {
      const monaco = (window as unknown as {
        monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
      }).monaco;
      const editor = monaco?.editor.getEditors()[0];
      const model = editor ? editor.getModel() : null;
      return Boolean(model && model.getValue().includes(needle as string));
    },
    marker,
    { timeout: 60000 },
  );

  await page.evaluate((next) => {
    const monaco = (window as unknown as {
      monaco: { editor: { getEditors: () => { getModel: () => { setValue: (v: string) => void } | null }[] } };
    }).monaco;
    const model = monaco.editor.getEditors()[0].getModel();
    if (model) model.setValue(next);
  }, code);

  // Guard against the controlled component resetting us after the fact.
  await page.waitForFunction(
    (expected) => {
      const monaco = (window as unknown as {
        monaco: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
      }).monaco;
      const model = monaco.editor.getEditors()[0].getModel();
      return Boolean(model && model.getValue() === expected);
    },
    code,
    { timeout: 30000 },
  );
}

/**
 * The repo-wide default is 30s, which is below what a real Java submission costs.
 * Paiza has no batch endpoint and Java recompiles per case, so 13 cases is 26 provider
 * requests and tens of seconds. An earlier run passed at 21.6s purely by luck and then
 * failed at the same assertion — the fix is an honest timeout, not a retry.
 */
test.describe.configure({ timeout: 240_000 });

for (const lang of LANGUAGES) {
  test.describe(`${lang.label} through the UI`, () => {
  test(`${lang.label} is offered, loads a problem-specific starter, and grades Accepted`, async ({ page }) => {
    const session = await createSession();
    await signIn(page, session);

    const unauthorized: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 401 && res.url().includes('/api/')) unauthorized.push(res.url());
    });

    await page.goto(`/problem/${PROBLEM_SLUG}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 30000 });

    // Wait for the problem's OWN starter to land before touching the language
    // selector. The page mounts Monaco with a generic default, then replaces it once
    // /api/learning/problem responds, and for a signed-in user several more requests
    // resolve after that. Switching language mid-load races those updates and the
    // starter gets reset under the test — which is also why a real user cannot switch
    // before the page has loaded.
    await page.waitForFunction(
      () => {
        const monaco = (window as unknown as {
          monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
        }).monaco;
        const editor = monaco?.editor.getEditors()[0];
        const model = editor ? editor.getModel() : null;
        return Boolean(model && model.getValue().includes('function rob(nums)'));
      },
      null,
      { timeout: 60000 },
    );

    // 1. The language is selectable. This is the registry's productionEnabled flag
    //    reaching the editor: the list is derived, not hand-maintained.
    const selector = page.locator('.pp-lang-select');
    await expect(selector).toBeVisible();
    await expect(selector.locator(`option[value="${lang.key}"]`)).toHaveCount(1);

    // All six languages the platform knows about are now offered. Any language the
    // registry has not cleared would be absent, which is the property this asserts.
    await expect(selector.locator('option')).toHaveCount(6);

    await selector.selectOption(lang.key);

    // 2. The starter is problem-specific, generated from this problem's signature —
    //    not the generic DEFAULT_STARTERS fallback.
    await page.waitForFunction(
      (needle) => {
        const monaco = (window as unknown as {
          monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
        }).monaco;
        const editor = monaco?.editor.getEditors()[0];
        const model = editor ? editor.getModel() : null;
        return Boolean(model && model.getValue().includes(needle as string));
      },
      lang.starterMarker,
      { timeout: 60000 },
    );

    const starter = await activeEditorValue(page);
    expect(starter, 'starter must declare the function from the signature').toContain(lang.starterMarker);
    expect(starter, 'starter must not contain harness boilerplate').not.toContain('int main(');
    expect(starter, 'starter must not read stdin').not.toContain('Scanner');
    expect(starter, 'starter must not read stdin').not.toContain('scanf');

    // 3. Edit, Run, Submit.
    await setEditorCode(page, lang.solution, lang.starterMarker);

    const runBtn = page.locator('.pp-btn--run');
    await expect(runBtn).toBeEnabled({ timeout: 15000 });
    await runBtn.click();
    await expect(page.locator('.pp-status-banner, .pp-tc-card').first()).toBeVisible({ timeout: 60000 });

    const submitBtn = page.locator('.pp-btn--submit');
    await expect(submitBtn).toBeEnabled({ timeout: 30000 });
    await submitBtn.click();

    const banner = page.locator('.pp-status-banner').first();
    await expect(banner).toBeVisible({ timeout: 90000 });
    expect(unauthorized, `no /api call may 401: ${unauthorized.join(', ')}`).toHaveLength(0);
    await expect(banner, `${lang.label} must be graded Accepted`).toContainText(/Accepted/i, { timeout: 90000 });

    // 4. Persistence and progress, read back through the API as the user.
    const api = await playwrightRequest.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
    });

    const detail = await (await api.get(`/api/learning/problem/${PROBLEM_SLUG}`)).json();
    const attempts = await (await api.get(`/api/learning/attempts/${detail.id}`)).json();
    const langAttempts = (attempts.attempts || []).filter((a: { language: string }) => a.language === lang.key);
    expect(langAttempts.length, `a ${lang.label} attempt must be persisted`).toBeGreaterThan(0);
    expect(langAttempts.some((a: { status: string }) => a.status === 'Accepted'),
      `the persisted ${lang.label} attempt must be Accepted`).toBeTruthy();

    const progress = await (await api.get('/api/learning/pattern-progress')).json();
    const rows = progress.patterns || progress.progress || [];
    const solved = rows.reduce((n: number, r: { problems_solved?: number }) => n + Number(r.problems_solved || 0), 0);
    expect(solved, 'progress must record the solve').toBeGreaterThan(0);

    await api.dispose();
  });
  });
}
