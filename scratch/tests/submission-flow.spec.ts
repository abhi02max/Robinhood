import { test, expect } from '@playwright/test';
import { waitForMonacoReady } from './helpers/monaco';

test.describe('Submission Flow', () => {

  test('run button shows spinner then results', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await page.waitForSelector('.pp-editor-pane', { timeout: 15000 });

    // Wait for Monaco editor — races readiness against the monaco-failed
    // surface so editor load failures fail the test loudly (Requirement 3.8).
    await waitForMonacoReady(page);

    // Click Run
    const runBtn = page.locator('.pp-btn--run');
    if (await runBtn.isEnabled({ timeout: 5000 })) {
      await runBtn.click();
      // Should show spinner or results
      await page.waitForSelector('.pp-spinner, .pp-status-banner, .pp-tc-card', { timeout: 20000 });
    }
  });

  test('submit button shows result tab', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await waitForMonacoReady(page);

    const submitBtn = page.locator('.pp-btn--submit');
    if (await submitBtn.isEnabled({ timeout: 5000 })) {
      await submitBtn.click();
      // Should switch to submit tab and show spinner/result
      await page.waitForSelector('.pp-spinner, .pp-status-banner', { timeout: 20000 });

      // Result tab should be active after submission completes
      await page.waitForSelector('.pp-status-banner', { timeout: 20000 });
      const resultTab = page.locator('.pp-tab').nth(1);
      await expect(resultTab).toHaveClass(/pp-tab--active/);
    }
  });

  test('status banner shows pass or fail', async ({ page }) => {
    await page.goto('/problem/two-sum');
    await waitForMonacoReady(page);

    const runBtn = page.locator('.pp-btn--run');
    if (await runBtn.isEnabled({ timeout: 5000 })) {
      await runBtn.click();
      await page.waitForSelector('.pp-status-banner', { timeout: 20000 });

      const banner = page.locator('.pp-status-banner').first();
      const cls = await banner.getAttribute('class');
      // Should have one of the status modifier classes
      expect(cls).toMatch(/pp-status-banner--(accepted|wrong|tle|error)/);
    }
  });
});
