import { test, expect } from '@playwright/test';
import { waitForMonacoReady } from './helpers/monaco';

test.describe('Panel Hierarchy', () => {

  test('primary panels visible, secondary collapsed', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await page.waitForSelector('.pp-editor-pane', { timeout: 15000 });
    await waitForMonacoReady(page);

    // Submit to trigger panels
    const submitBtn = page.locator('.pp-btn--submit');
    if (!(await submitBtn.isEnabled({ timeout: 5000 }))) {
      test.skip(true, 'Submit button not enabled');
      return;
    }

    await submitBtn.click();
    await page.waitForSelector('.pp-status-banner', { timeout: 20000 });

    // PRIMARY: Status banner should always be visible
    await expect(page.locator('.pp-status-banner').first()).toBeVisible();

    // SECONDARY: Collapsible sections should exist but body should be collapsed
    const collapsibles = page.locator('.pp-collapsible');
    const count = await collapsibles.count();
    if (count > 0) {
      // First collapsible should NOT have --open class by default
      const first = collapsibles.first();
      const cls = await first.getAttribute('class');
      expect(cls).not.toContain('pp-collapsible--open');
    }
  });

  test('clicking collapsible trigger expands section', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await waitForMonacoReady(page);

    const submitBtn = page.locator('.pp-btn--submit');
    if (!(await submitBtn.isEnabled({ timeout: 5000 }))) {
      test.skip(true, 'Submit button not enabled');
      return;
    }

    await submitBtn.click();
    await page.waitForSelector('.pp-status-banner', { timeout: 20000 });

    const trigger = page.locator('.pp-collapsible__trigger').first();
    if (await trigger.count() > 0) {
      await trigger.click();
      // Parent should now have --open class
      const parent = page.locator('.pp-collapsible').first();
      await expect(parent).toHaveClass(/pp-collapsible--open/);
    }
  });

  test('editor pane is visible with correct structure', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await page.waitForSelector('.pp-editor-pane', { timeout: 15000 });

    // Editor bar with language selector
    await expect(page.locator('.pp-editor-bar')).toBeVisible();
    await expect(page.locator('.pp-lang-select')).toBeVisible();

    // Editor controls with Run/Submit
    await expect(page.locator('.pp-editor-controls')).toBeVisible();
    await expect(page.locator('.pp-btn--run')).toBeVisible();
    await expect(page.locator('.pp-btn--submit')).toBeVisible();
  });
});
