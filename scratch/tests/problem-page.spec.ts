import { test, expect } from '@playwright/test';
import { waitForMonacoReady } from './helpers/monaco';
import { anySeededProblem, problemDetail } from './helpers/seeded';
import { collectUnauthorized, createSession, signIn } from './helpers/session';

/**
 * The problem page's layout and editor controls.
 *
 * PHASE 2F: THE SKIPS ARE GONE
 * ----------------------------
 * Six of these seven tests began by loading `/` and hunting for `a[href*="/problem/"]`,
 * then calling `test.skip(true, 'No problem links found')` when there were none. The
 * homepage has no such links, so six tests reported "skipped" on every run — and a skip
 * is not a pass. Together with panel-hierarchy.spec.ts that accounted for all 8 skips in
 * the suite, which is 16% of it doing nothing while looking harmless.
 *
 * The problem is now derived from the API, so the page under test is always a real
 * problem and there is nothing to skip. The remaining conditional assertions
 * (`if (await runBtn.isEnabled())`, `if (await badge.count() > 0)`) are gone too: each was
 * a way for the test to pass without checking anything.
 */

test.describe.configure({ timeout: 120_000 });

test.describe('Problem Page — LeetCode Layout', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Robinhood/i);
  });

  test('problem page renders the 2-panel layout', async ({ page, request }) => {
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    await expect(page.locator('.pp-root')).toBeVisible();
    await expect(page.locator('.pp-body')).toBeVisible();
    await expect(page.locator('.pp-left__body')).toBeVisible();
    await expect(page.locator('.pp-right-split')).toBeVisible();
    await expect(page.locator('.pp-editor-pane')).toBeVisible();
    await expect(page.locator('.pp-lang-select')).toBeVisible();
    await expect(page.locator('.pp-btn--run')).toBeVisible();
    await expect(page.locator('.pp-btn--submit')).toBeVisible();
    await expect(page.locator('.pp-right')).toBeVisible();
  });

  test('the editor mounts and holds this problem\'s starter', async ({ page, request }) => {
    // Was "the .monaco-editor element is visible", which is true of an editor showing
    // anything at all, including a generic fallback for a problem that does not exist.
    const problem = await anySeededProblem(request);
    const detail = await problemDetail(request, problem.id);
    const jsStarter: string = detail.starter_code?.javascript ?? '';
    expect(jsStarter).toBeTruthy();

    await page.goto(`/problem/${problem.slug}`);
    await waitForMonacoReady(page, 60000);
    await expect(page.locator('.monaco-editor').first()).toBeVisible();

    const signature = (jsStarter.split('\n').find((l) => l.includes('function')) ?? '').trim();
    expect(signature, 'the starter must declare a function').toBeTruthy();
    await page.waitForFunction(
      (needle) => {
        const monaco = (window as unknown as {
          monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
        }).monaco;
        const model = monaco?.editor.getEditors()[0]?.getModel();
        return Boolean(model && model.getValue().includes(needle as string));
      },
      signature,
      { timeout: 60000 },
    );
  });

  test('the language selector switches language and reloads the starter', async ({ page, request }) => {
    const problem = await anySeededProblem(request);
    const detail = await problemDetail(request, problem.id);
    const pyStarter: string = detail.starter_code?.python ?? '';
    expect(pyStarter, 'the problem must ship a Python starter').toBeTruthy();

    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });
    await page.waitForSelector('.pp-lang-select', { timeout: 30000 });

    await page.selectOption('.pp-lang-select', 'python');
    expect(await page.locator('.pp-lang-select').inputValue()).toBe('python');

    // Was only the select's own value. Switching language that does not change the editor
    // is a broken selector, so assert the consequence as well.
    const marker = (pyStarter.split('\n').find((l) => l.trim().startsWith('def ')) ?? '').trim();
    expect(marker, 'the Python starter must declare a def').toBeTruthy();
    await page.waitForFunction(
      (needle) => {
        const monaco = (window as unknown as {
          monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
        }).monaco;
        const model = monaco?.editor.getEditors()[0]?.getModel();
        return Boolean(model && model.getValue().includes(needle as string));
      },
      marker,
      { timeout: 60000 },
    );
  });

  test('results tabs switch between Test Cases and Result', async ({ page, request }) => {
    // `.pp-tab` is not unique to the results pane: LeftPane renders
    // Description/Approaches with the same class, and Brute Force/Optimal inside that.
    // The old unscoped `.pp-tab` locator resolved to "Description" here — and it only
    // passed before because it ran against an unseeded slug where the left pane's tabs
    // never rendered. Another instance of D12's pattern: an assertion that worked because
    // the page was broken. Scoped to the results pane, which is what it always meant.
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    const resultsTabs = page.locator('.pp-right .pp-tab');
    await expect(resultsTabs).toHaveCount(2);

    const runTab = resultsTabs.first();
    const submitTab = resultsTabs.nth(1);
    await expect(runTab).toContainText('Test Cases');
    await expect(submitTab).toContainText('Result');

    // Test Cases is the default.
    await expect(runTab).toHaveClass(/pp-tab--active/);

    await submitTab.click();
    await expect(submitTab).toHaveClass(/pp-tab--active/);
    await expect(runTab, 'switching must deactivate the other tab').not.toHaveClass(/pp-tab--active/);
  });

  test('Run executes against the visible cases', async ({ page, request }) => {
    // Was `if (await runBtn.isEnabled()) { ... }` — vacuous whenever the button stayed
    // disabled, which is precisely the failure mode worth catching. Now Run must become
    // enabled, and results must appear.
    const session = await createSession('problem-page-run');
    await signIn(page, session);
    const unauthorized = collectUnauthorized(page);

    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await waitForMonacoReady(page, 60000);

    const runBtn = page.locator('.pp-btn--run');
    await expect(runBtn, 'Run must become enabled once the problem has loaded').toBeEnabled({ timeout: 30000 });
    await runBtn.click();

    await expect(page.locator('.pp-status-banner, .pp-tc-card, .pp-tc').first()).toBeVisible({ timeout: 90000 });
    expect(unauthorized, `no /api call may 401: ${unauthorized.join(', ')}`).toHaveLength(0);
  });

  test('the difficulty badge renders this problem\'s difficulty', async ({ page, request }) => {
    // Was `if (await badge.count() > 0)`, so a missing badge passed.
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    const badge = page.locator('.pp-difficulty').first();
    await expect(badge).toBeVisible({ timeout: 30000 });
    expect((await badge.textContent())?.trim()).toBe(problem.difficulty);
  });
});
