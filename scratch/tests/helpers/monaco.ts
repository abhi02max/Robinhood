// =============================================================================
// Monaco readiness wait helper (Task 7.7, Requirement 3.8)
// -----------------------------------------------------------------------------
// `waitForMonacoReady` races the readiness signal (`data-testid="monaco-ready"`)
// against the failure surface (`data-testid="monaco-failed"`). If the failure
// surface appears first, we throw immediately — this is a HARD failure with no
// retry and no further interaction with the editor, per Requirement 3.8.
//
// The race is implemented as `Promise.race` of two `waitForSelector` calls.
// The failure-side `then` rejects to surface the failure as a test error rather
// than silently resolving. Both selectors share the same 15s timeout cap so
// that an unrelated network hang surfaces as a normal Playwright timeout
// instead of a misleading "monaco-failed" message.
// =============================================================================
import type { Page } from '@playwright/test';

export const MONACO_WAIT_TIMEOUT_MS = 15_000;

export async function waitForMonacoReady(page: Page, timeout: number = MONACO_WAIT_TIMEOUT_MS): Promise<void> {
  await Promise.race([
    page.waitForSelector('[data-testid="monaco-ready"]', { timeout }),
    page
      .waitForSelector('[data-testid="monaco-failed"]', { timeout })
      .then(() => {
        throw new Error(
          'Monaco failed to load within 10s — editor failure surface rendered. ' +
            'This is a hard failure (Requirement 3.8); no retry, no further editor interaction.'
        );
      }),
  ]);
}
