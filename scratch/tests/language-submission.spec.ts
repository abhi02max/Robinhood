import { test, expect, request as playwrightRequest, type Page } from '@playwright/test';

/**
 * The six-language browser gate (Phase 2E).
 *
 * Every language the editor offers is exercised end to end for a signed-in user:
 * select it, confirm the starter belongs to THIS problem, edit, Run, Submit, require
 * Accepted, then read the attempt and the progress back through the API as that user.
 *
 * Asserts consequences, not the presence of a banner. The earlier
 * `submission-flow.spec.ts` demonstrated how a test can pass while the feature is
 * broken — it never signed in, wrapped everything in `if (await button.isEnabled())`,
 * and waited for a selector that also renders on failure. None of that is repeated here:
 * there is no conditional assertion in this file, and every wait targets a state that
 * only occurs on success.
 *
 * WHAT WOULD MAKE THIS FAIL
 * -------------------------
 * Each of these is a defect the platform has actually had, and each has an assertion:
 *
 *   the Authorization header disappears     every /api 401 is collected and the count
 *                                           must be zero (defect D0: the editor's
 *                                           api.ts sent no Bearer token, so Submit
 *                                           returned 401 from the UI while working
 *                                           when called directly)
 *   Run quietly calls Submit                requests are recorded per phase: Run must
 *                                           hit /api/execute/run and must NOT hit
 *                                           /api/learning/submit, and must not create
 *                                           an attempt row (defect D1)
 *   the generic fallback starter is served   the starter must contain this problem's
 *                                           own signature in this language's own
 *                                           conventions, and must carry no harness
 *                                           boilerplate
 *   the selected language is not sent        the persisted attempt's `language` column
 *                                           must equal the language selected
 *   verdict mapping breaks                  the banner must say Accepted
 *   persistence or progress stops            both are read back through the API
 *
 * Demonstrated to FAIL against deliberately broken configurations: Java with registry
 * `harnessImplemented: false` gave "Wrong Answer 0/4", and C# emitting Java's
 * jagged-array literal shorthand gave "Compilation Error 0/13".
 */

const API = 'http://127.0.0.1:3000';
const PROBLEM_SLUG = 'house-robber';
const CLIENT_STATE_KEY = 'robinhood_data';
const RUN_ROUTE = '/api/execute/run';
const SUBMIT_ROUTE = '/api/learning/submit';

/**
 * One case per production-enabled language — all six.
 *
 * starterMarker is the fragment that proves the loaded starter came from THIS problem's
 * signature rather than the generic DEFAULT_STARTERS fallback. It deliberately encodes
 * each language's own parameter conventions, which is the part most likely to be wrong:
 * C's companion length parameter, C#'s PascalCase method, C++'s reference parameter.
 */
const LANGUAGES = [
  {
    key: 'javascript',
    label: 'JavaScript',
    // Hand-written in the seed file rather than generated, so this asserts the seeded
    // starter is served, not a fallback.
    starterMarker: 'function rob(nums)',
    solution: `function rob(nums) {
  let twoBack = 0;
  let oneBack = 0;
  for (let i = 0; i < nums.length; i++) {
    const best = Math.max(oneBack, twoBack + nums[i]);
    twoBack = oneBack;
    oneBack = best;
  }
  return oneBack;
}`,
  },
  {
    key: 'python',
    label: 'Python',
    starterMarker: 'def rob(nums)',
    solution: `def rob(nums):
    two_back = 0
    one_back = 0
    for value in nums:
        best = max(one_back, two_back + value)
        two_back = one_back
        one_back = best
    return one_back`,
  },
  {
    key: 'cpp',
    label: 'C++',
    // The reference parameter is C++'s own convention and distinguishes the generated
    // starter from Java's or C#'s.
    starterMarker: 'int rob(vector<int>& nums)',
    solution: `#include <bits/stdc++.h>
using namespace std;
class Solution {
public:
    int rob(vector<int>& nums) {
        int twoBack = 0, oneBack = 0;
        for (size_t i = 0; i < nums.size(); i++) {
            int best = max(oneBack, twoBack + nums[i]);
            twoBack = oneBack;
            oneBack = best;
        }
        return oneBack;
    }
};`,
  },
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

async function createSession(label: string): Promise<Session> {
  const api = await playwrightRequest.newContext({ baseURL: API });
  // A fresh user per language, so the progress assertion cannot pass on a solve some
  // other language in this same suite recorded.
  const email = `lang-e2e-${label}-${Date.now()}@example.com`;
  const password = 'Str0ng-Passw0rd!';
  const signup = await api.post('/api/auth/signup', { data: { email, password, name: 'Language E2E' } });
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
        user: { id: userId, email, name: 'Language E2E' },
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
    const session = await createSession(lang.key);
    await signIn(page, session);

    const unauthorized: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 401 && res.url().includes('/api/')) unauthorized.push(res.url());
    });

    // Every execution request the page makes, so Run and Submit can be told apart by the
    // route they actually hit rather than by what the button is labelled.
    const executionCalls: { route: string; language: string | null }[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() !== 'POST') return;
      if (!url.includes(RUN_ROUTE) && !url.includes(SUBMIT_ROUTE)) return;
      let language: string | null = null;
      try {
        language = (JSON.parse(req.postData() || '{}') as { language?: string }).language ?? null;
      } catch { /* a body we cannot parse is still worth recording by route */ }
      executionCalls.push({ route: url.includes(RUN_ROUTE) ? RUN_ROUTE : SUBMIT_ROUTE, language });
    });

    // An authenticated API client for the same user, used to read back consequences.
    const api = await playwrightRequest.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
    });
    const problemId = (await (await api.get(`/api/learning/problem/${PROBLEM_SLUG}`)).json()).id as string;
    const attemptsNow = async () => {
      const body = await (await api.get(`/api/learning/attempts/${problemId}`)).json();
      return (body.attempts || []) as { language: string; status: string }[];
    };
    expect(await attemptsNow(), 'a brand new user must start with no attempts').toHaveLength(0);

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
    // The user writes a solution, never infrastructure. Any of these appearing in the
    // editor means harness boilerplate leaked into the starter.
    for (const boilerplate of ['int main(', 'static void Main', 'public static void main', 'Scanner', 'scanf', '<<<OUT>>>']) {
      expect(starter, `starter must not contain harness boilerplate: ${boilerplate}`).not.toContain(boilerplate);
    }

    // 3. Run. This must hit the RUN route, and must not persist anything.
    await setEditorCode(page, lang.solution, lang.starterMarker);

    const runBtn = page.locator('.pp-btn--run');
    await expect(runBtn).toBeEnabled({ timeout: 15000 });
    await runBtn.click();
    await expect(page.locator('.pp-status-banner, .pp-tc-card').first()).toBeVisible({ timeout: 60000 });

    // Defect D1: Run and Submit were literally the same call, so every exploratory click
    // wrote an attempt row and graded against hidden cases. Assert the separation from
    // both sides — the route taken, and the absence of a persisted consequence.
    expect(executionCalls.filter((x) => x.route === RUN_ROUTE).length,
      'Run must call the run endpoint').toBeGreaterThan(0);
    expect(executionCalls.filter((x) => x.route === SUBMIT_ROUTE),
      'Run must NOT call the submit endpoint').toHaveLength(0);
    expect(await attemptsNow(), 'Run must not persist an attempt').toHaveLength(0);

    // The selected language must actually travel with the request.
    for (const call of executionCalls) {
      expect(call.language, `the ${lang.label} run must send language=${lang.key}`).toBe(lang.key);
    }

    // 4. Submit.
    const submitBtn = page.locator('.pp-btn--submit');
    await expect(submitBtn).toBeEnabled({ timeout: 30000 });
    await submitBtn.click();

    const banner = page.locator('.pp-status-banner').first();
    await expect(banner).toBeVisible({ timeout: 90000 });
    expect(unauthorized, `no /api call may 401: ${unauthorized.join(', ')}`).toHaveLength(0);
    await expect(banner, `${lang.label} must be graded Accepted`).toContainText(/Accepted/i, { timeout: 90000 });

    expect(executionCalls.filter((x) => x.route === SUBMIT_ROUTE).length,
      'Submit must call the submit endpoint').toBeGreaterThan(0);

    // 5. Persistence and progress, read back through the API as the user.
    const attempts = await attemptsNow();
    const langAttempts = attempts.filter((a) => a.language === lang.key);
    expect(langAttempts.length, `a ${lang.label} attempt must be persisted`).toBeGreaterThan(0);
    expect(langAttempts.some((a) => a.status === 'Accepted'),
      `the persisted ${lang.label} attempt must be Accepted`).toBeTruthy();
    // Every attempt must carry the selected language, not a default.
    expect(attempts.every((a) => a.language === lang.key),
      `every persisted attempt must be ${lang.key}, saw ${[...new Set(attempts.map((a) => a.language))].join(', ')}`).toBeTruthy();

    const progress = await (await api.get('/api/learning/pattern-progress')).json();
    const rows = progress.patterns || progress.progress || [];
    const solved = rows.reduce((n: number, r: { problems_solved?: number }) => n + Number(r.problems_solved || 0), 0);
    expect(solved, 'progress must record the solve').toBeGreaterThan(0);

    await api.dispose();
  });
  });
}
