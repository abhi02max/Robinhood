import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scratch/tests',
  /**
   * Browser specs only.
   *
   * Playwright's default `testMatch` is `**\/*.@(spec|test).?(c|m)[jt]s?(x)`, which also
   * catches `tests/unit/*.test.js` — the node:test suite. Those files were being LOADED by
   * every Playwright run: their output interleaved with the report, and because they
   * register with node:test rather than Playwright, a failing unit test could not fail the
   * run it was printing into. `npm test` owns them; this owns `*.spec.ts`.
   */
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  /* Start dev server only in CI — locally, start it yourself with:
     cd scratch && npm run dev:all */
  ...(process.env.CI ? {
    webServer: {
      command: 'npm run dev:all',
      cwd: './scratch',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60000,
    },
  } : {}),
});
