import { test, expect } from '@playwright/test';
import { waitForMonacoReady } from './helpers/monaco';
import { anySeededProblem } from './helpers/seeded';
import { collectUnauthorized, createSession, signIn } from './helpers/session';

/**
 * Result-panel hierarchy: the verdict is primary and always visible, the detail sections
 * are secondary and collapsed until asked for.
 *
 * PHASE 2F: THE SKIPS ARE GONE
 * ----------------------------
 * Two of these three tests needed a completed submission, drove `/problem/two-sum` — a
 * slug that is not seeded — and never signed in. Submit therefore never became enabled,
 * and both called `test.skip(true, 'Submit button not enabled')` on every run. They
 * accounted for 2 of the suite's 8 permanent skips.
 *
 * A skip that can never not happen is a deleted test that still shows up in the report. So
 * both now sign in and use a seeded problem, and their assertions are unconditional: the
 * `if (count > 0)` guards are gone too, because the whole claim being made is that these
 * sections exist and start collapsed.
 */

// A real submission runs every case through the provider.
test.describe.configure({ timeout: 180_000 });

test.describe('Panel Hierarchy', () => {
  test('the verdict is visible and detail sections start collapsed', async ({ page, request }) => {
    const session = await createSession('panel-primary');
    await signIn(page, session);
    const unauthorized = collectUnauthorized(page);
    const problem = await anySeededProblem(request);

    await page.goto(`/problem/${problem.slug}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 60000 });
    await waitForMonacoReady(page, 60000);

    const submitBtn = page.locator('.pp-btn--submit');
    await expect(submitBtn, 'Submit must become enabled for a signed-in user').toBeEnabled({ timeout: 30000 });
    await submitBtn.click();

    const banner = page.locator('.pp-status-banner').first();
    await expect(banner, 'the verdict banner is the primary surface').toBeVisible({ timeout: 120000 });
    expect(unauthorized, `no /api call may 401: ${unauthorized.join(', ')}`).toHaveLength(0);

    // The banner must carry a real verdict class, not just exist.
    const bannerClass = await banner.getAttribute('class');
    expect(bannerClass).toMatch(/pp-status-banner--(accepted|wrong|tle|error)/);

    const collapsibles = page.locator('.pp-collapsible');
    const count = await collapsibles.count();
    expect(count, 'the result panel must render its secondary sections').toBeGreaterThan(0);
    // Every one of them starts closed, not merely the first.
    for (let i = 0; i < count; i += 1) {
      const cls = await collapsibles.nth(i).getAttribute('class');
      expect(cls, `collapsible ${i} must start collapsed`).not.toContain('pp-collapsible--open');
    }
  });

  test('clicking a collapsible trigger expands that section', async ({ page, request }) => {
    const session = await createSession('panel-expand');
    await signIn(page, session);
    const problem = await anySeededProblem(request);

    await page.goto(`/problem/${problem.slug}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 60000 });
    await waitForMonacoReady(page, 60000);

    const submitBtn = page.locator('.pp-btn--submit');
    await expect(submitBtn).toBeEnabled({ timeout: 30000 });
    await submitBtn.click();
    await expect(page.locator('.pp-status-banner').first()).toBeVisible({ timeout: 120000 });

    const trigger = page.locator('.pp-collapsible__trigger').first();
    await expect(trigger, 'a secondary section must be expandable').toBeVisible({ timeout: 30000 });
    await trigger.click();
    await expect(page.locator('.pp-collapsible').first()).toHaveClass(/pp-collapsible--open/);
  });

  test('the editor pane has its bar and controls', async ({ page, request }) => {
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await page.waitForSelector('.pp-editor-pane', { timeout: 60000 });

    await expect(page.locator('.pp-editor-bar')).toBeVisible();
    await expect(page.locator('.pp-lang-select')).toBeVisible();
    await expect(page.locator('.pp-editor-controls')).toBeVisible();
    await expect(page.locator('.pp-btn--run')).toBeVisible();
    await expect(page.locator('.pp-btn--submit')).toBeVisible();
  });
});
