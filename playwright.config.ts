import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scratch/tests',
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
