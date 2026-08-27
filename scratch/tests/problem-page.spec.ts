import { test, expect } from '@playwright/test';
import { waitForMonacoReady } from './helpers/monaco';

test.describe('Problem Page — LeetCode Layout', () => {

  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Robinhood/i);
  });

  test('problem page renders 2-panel layout', async ({ page }) => {
    // Go to home and find a problem link
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found on homepage');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify 2-panel layout
    await expect(page.locator('.pp-root')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.pp-body')).toBeVisible();

    // Left pane (problem description)
    await expect(page.locator('.pp-left__body')).toBeVisible();

    // Right split (editor + results)
    await expect(page.locator('.pp-right-split')).toBeVisible();

    // Editor pane
    await expect(page.locator('.pp-editor-pane')).toBeVisible();

    // Language selector
    await expect(page.locator('.pp-lang-select')).toBeVisible();

    // Run and Submit buttons
    await expect(page.locator('.pp-btn--run')).toBeVisible();
    await expect(page.locator('.pp-btn--submit')).toBeVisible();

    // Results pane (right)
    await expect(page.locator('.pp-right')).toBeVisible();
  });

  test('editor accepts code input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Wait for Monaco to load — race against monaco-failed (Requirement 3.8).
    await waitForMonacoReady(page);
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('language selector changes language', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.pp-lang-select', { timeout: 10000 });

    // Change language to Python
    await page.selectOption('.pp-lang-select', 'python');
    const val = await page.locator('.pp-lang-select').inputValue();
    expect(val).toBe('python');
  });

  test('tab switching works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.pp-tab', { timeout: 10000 });

    // Should see Test Cases and Result tabs
    const runTab = page.locator('.pp-tab').first();
    const submitTab = page.locator('.pp-tab').nth(1);

    await expect(runTab).toContainText('Test Cases');
    await expect(submitTab).toContainText('Result');

    // Click submit tab
    await submitTab.click();
    await expect(submitTab).toHaveClass(/pp-tab--active/);
  });

  test('run button triggers execution', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    await waitForMonacoReady(page);

    // Click Run
    const runBtn = page.locator('.pp-btn--run');
    if (await runBtn.isEnabled()) {
      await runBtn.click();
      // Should show running state or results
      await page.waitForSelector('.pp-spinner, .pp-tc', { timeout: 15000 });
    }
  });

  test('difficulty badge renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const firstLink = page.locator('a[href*="/problem/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No problem links found');
      return;
    }

    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.pp-root', { timeout: 10000 });

    // Should have a difficulty badge
    const badge = page.locator('.pp-difficulty');
    if (await badge.count() > 0) {
      const text = await badge.textContent();
      expect(['Easy', 'Medium', 'Hard']).toContain(text?.trim());
    }
  });
});
