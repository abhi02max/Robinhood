// =============================================================================
// Authenticated-session helper.
// -----------------------------------------------------------------------------
// The server authenticates ONLY via `Authorization: Bearer`. There is no session
// cookie, which is what made defect D0 possible: the problem page's API layer
// attached no header, so every authenticated call from the UI returned 401 while
// the same call worked fine when made directly.
//
// Consequence for tests: a spec that does not sign in cannot tell a 401 apart
// from expected behaviour. Three specs independently reimplemented signing in,
// and the ones that did not sign in are exactly the ones that were unable to
// detect D0. One helper, used everywhere, so "did this test actually
// authenticate?" is never a question again.
// =============================================================================
import { expect, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE = 'http://127.0.0.1:3000';

/** The key `src/store.js` persists client state under. */
export const CLIENT_STATE_KEY = 'robinhood_data';

export type Session = { token: string; userId: string; email: string };

/**
 * Create a brand new user and log in.
 *
 * `label` keeps addresses unique per test so that assertions about a user's own
 * attempts or progress cannot pass because of something another test did.
 */
export async function createSession(label = 'e2e'): Promise<Session> {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE });
  const email = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'Str0ng-Passw0rd!';

  const signup = await api.post('/api/auth/signup', { data: { email, password, name: 'E2E Bot' } });
  expect(signup.status(), 'signup must succeed').toBeLessThan(300);

  const login = await api.post('/api/auth/login', { data: { email, password } });
  expect(login.ok(), 'login must succeed').toBeTruthy();
  const body = await login.json();
  expect(body.sessionToken, 'login must return a session token').toBeTruthy();

  await api.dispose();
  return { token: body.sessionToken, userId: body.user?.id ?? '', email };
}

/** An API client that carries the session, for reading consequences back. */
export async function authedRequest(session: Session): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
  });
}

/**
 * Make the browser look signed in, before any app code runs.
 *
 * `addInitScript` rather than a post-load `evaluate`: the app reads this state during
 * hydration, so writing it afterwards produces a page that is signed in only for
 * requests made after the write, which is a different thing from a signed-in user.
 */
export async function signIn(page: Page, session: Session): Promise<void> {
  await page.addInitScript(
    ([key, token, userId, email]) => {
      window.localStorage.setItem(key as string, JSON.stringify({
        sessionToken: token,
        user: { id: userId, email, name: 'E2E Bot' },
      }));
    },
    [CLIENT_STATE_KEY, session.token, session.userId, session.email],
  );
}

/**
 * Collect every 401 on an `/api/` response.
 *
 * Returns the array; assert it is empty AFTER the interaction. This is the D0 guard and
 * it belongs in every spec that claims to act as a signed-in user.
 */
export function collectUnauthorized(page: Page): string[] {
  const seen: string[] = [];
  page.on('response', (res) => {
    if (res.status() === 401 && res.url().includes('/api/')) seen.push(res.url());
    });
  return seen;
}
