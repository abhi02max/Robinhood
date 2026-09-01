import { test, expect } from '@playwright/test';
import { anySeededProblem, problemDetail, problemsIndex, topicWithProblems, topics } from './helpers/seeded';
import { authedRequest, createSession } from './helpers/session';

/**
 * Platform-wide E2E: curriculum API, dashboard, problem page, submission side effects,
 * data integrity, navigation.
 *
 * REWRITTEN IN PHASE 2F TO RESOLVE DEFECT D12
 * -------------------------------------------
 * This file had 18 of 29 tests failing and, worse, four of the eleven "passing" ones were
 * passing against `/problem/two-sum` — a slug that is not seeded. They only waited for
 * layout containers, which render on an empty page too, so they reported success about a
 * problem that does not exist.
 *
 * Each test was audited and classified. What changed and why:
 *
 *   DELETED — asserted the mock provider
 *     1.5  submit returns Accepted with `provider === 'mock'`. The provider is Paiza, and
 *          submit now correctly requires authentication. Real coverage:
 *          language-submission.spec.ts grades all six languages end to end and checks
 *          persistence; verify-journeys.mjs asserts Accepted 13/13.
 *     1.6  a `// FAIL` comment forces Wrong Answer. That marker exists only in
 *          execution-mock.js. Real coverage: the canonical corpus controls and
 *          check-authored-problems.js reject genuinely wrong solutions, and
 *          verify-journeys.mjs proves a visible-answer-hardcoding solution fails on a
 *          hidden case.
 *
 *   DELETED — vacuous or duplicate
 *     3.5  `if (count > 0) expect(visible)` — asserted nothing when absent. Real
 *          coverage: problem-page.spec.ts asserts the Test Cases tab unconditionally.
 *     3.6  language selector exists. Duplicated by problem-page.spec.ts,
 *          panel-hierarchy.spec.ts, and language-submission.spec.ts, which additionally
 *          asserts the option COUNT.
 *     6.2  identical to 3.1 once both stop hardcoding a slug: same page, same assertion.
 *
 *   DELETED — contradicted by reality, replaced by a real invariant
 *     1.4  "500+ problems". There are 96. Replaced by 1.4 below, which asserts the
 *          structural invariants that actually matter and cannot go stale: unique slugs,
 *          complete rows, all three difficulties present.
 *     5.2  "Easy > 50, Medium > 100, Hard > 30". Actually 34 / 52 / 10. Folded into 1.4.
 *
 * Everything else was migrated rather than dropped, and the migrations are STRONGER than
 * what they replace: content facts now come from the API instead of being hardcoded, the
 * endpoint tests assert that private endpoints REJECT anonymous callers (the old ones
 * asserted the pre-hardening behaviour where they answered 200), and no assertion is
 * wrapped in a conditional.
 */

// The dashboard is a Next.js route that compiles on first request, and a real submission
// runs every case through the provider. The repo default of 30s is below both.
test.describe.configure({ timeout: 180_000 });

// ═══════════════════════════════════════════════════════════════════════════
// Suite 1: curriculum API, backed by PostgreSQL
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 1: curriculum API', () => {
  test('1.1 topics come from the database and are structurally complete', async ({ request }) => {
    const list = await topics(request);
    expect(list.length).toBeGreaterThanOrEqual(10);
    for (const topic of list) {
      expect(topic.id, 'every topic needs an id').toBeTruthy();
      expect(topic.name, 'every topic needs a name').toBeTruthy();
      expect(topic.slug, 'every topic needs a slug').toBeTruthy();
    }
  });

  test('1.2 every topic resolves to patterns', async ({ request }) => {
    const list = await topics(request);
    const res = await request.get(`/api/learning/patterns/${list[0].id}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.patterns.length).toBeGreaterThan(0);
    for (const p of data.patterns) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });

  test('1.3 a problem resolves to full detail with graded test cases', async ({ request }) => {
    // Was hardcoded to `two-sum`, which is not seeded. The BEHAVIOUR being checked —
    // index entry resolves to a detail document carrying usable test cases — is real, so
    // it is kept and the slug is derived.
    const problem = await anySeededProblem(request);
    const detail = await problemDetail(request, problem.id);

    // The title must agree with the index rather than match a string typed in a test.
    expect(detail.title).toBe(problem.title);
    expect(detail.difficulty).toBe(problem.difficulty);
    expect(detail.description?.length, 'a problem needs a real description').toBeGreaterThan(50);
    expect(detail.test_cases?.length, 'a problem needs test cases').toBeGreaterThan(0);

    for (const tc of detail.test_cases) {
      expect(tc.input_payload, 'every case needs an input payload').toBeDefined();
      expect(tc.expected_output, 'every case needs an expected output').toBeDefined();
    }

    // Hidden cases are graded but must never be delivered to the client.
    for (const tc of detail.test_cases) {
      expect(tc.is_hidden, 'no hidden case may be sent to the client').not.toBe(true);
    }
  });

  test('1.4 the problems index is internally consistent', async ({ request }) => {
    // Replaces "500+ problems" and the "Easy > 50 / Medium > 100 / Hard > 30" thresholds.
    // Those were counts from a curriculum that no longer exists. These are invariants:
    // they hold at 96 problems and will still hold at 450.
    const problems = await problemsIndex(request);

    const slugs = problems.map((p) => p.slug);
    expect(new Set(slugs).size, 'slugs must be unique — a duplicate breaks routing').toBe(slugs.length);

    for (const p of problems) {
      expect(p.id, `${p.slug} needs an id`).toBeTruthy();
      expect(p.title, `${p.slug} needs a title`).toBeTruthy();
      expect(['Easy', 'Medium', 'Hard'], `${p.slug} has difficulty "${p.difficulty}"`).toContain(p.difficulty);
      expect(p.topic?.slug, `${p.slug} needs a topic`).toBeTruthy();
      expect(p.pattern?.slug, `${p.slug} needs a pattern`).toBeTruthy();
    }

    // A curriculum that lost a whole difficulty tier is broken, whatever the counts are.
    const present = new Set(problems.map((p) => p.difficulty));
    for (const d of ['Easy', 'Medium', 'Hard']) {
      expect(present.has(d as 'Easy'), `no ${d} problems in the curriculum`).toBeTruthy();
    }
  });

  test('1.5 submit rejects an anonymous caller', async ({ request }) => {
    // The inverse of D0, and the reason the old 1.5 could not work: the server
    // authenticates only via `Authorization: Bearer`, so an unauthenticated submit MUST
    // be refused. The old test asserted it succeeded.
    const problem = await anySeededProblem(request);
    const res = await request.post('/api/learning/submit', {
      data: { problem_id: problem.id, code: 'function f() { return 1; }', language: 'javascript' },
    });
    expect(res.status(), 'an anonymous submit must be refused').toBe(401);
  });

  test('1.6 an empty submission is graded, not crashed', async ({ request }) => {
    // Migrated from the old 1.7, now authenticated and asserting the real verdict rather
    // than only `passed === false`.
    const session = await createSession('platform-empty');
    const api = await authedRequest(session);
    const problem = await anySeededProblem(api);

    const res = await api.post('/api/learning/submit', {
      data: { problem_id: problem.id, code: '   ', language: 'javascript' },
    });
    expect(res.ok(), 'the server must answer, not fault').toBeTruthy();
    const result = await res.json();

    expect(result.passed, 'whitespace is not a solution').toBe(false);
    expect(result.pass_count, 'no case may pass').toBe(0);
    expect(result.status, 'the verdict must name the failure').toBeTruthy();
    expect(result.status).not.toBe('Accepted');

    await api.dispose();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 2: dashboard and curriculum UI
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 2: dashboard and curriculum UI', () => {
  test('2.x dashboard renders topics, patterns, problem rows and filters', async ({ page, request }) => {
    // The old version clicked the first five patterns of whichever topic auto-selected and
    // waited 8s each for problem rows. The first topic is Basics — empty — so it never
    // found rows and the cumulative waits exceeded the test timeout. It also guarded its
    // last assertions behind `if (foundRows)`, so it would have passed vacuously had the
    // timeout been higher.
    //
    // Now the topic and pattern are derived from the API, so the test knows what it is
    // looking for and every assertion is unconditional.
    const { topic, pattern, problems } = await topicWithProblems(request);

    await page.goto('/problems', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.pp2-side__item', { timeout: 90000 });

    const topicButtons = page.locator('.pp2-side__item');
    expect(await topicButtons.count(), 'the topic sidebar must be populated').toBeGreaterThan(5);

    // Select the topic that actually holds problems.
    await topicButtons.filter({ hasText: topic.name }).first().click();

    await expect(
      page.locator('.pp2-topic-header__title'),
      'the header must reflect the selected topic',
    ).toHaveText(topic.name, { timeout: 30000 });

    await page.waitForSelector('.pp2-pattern', { timeout: 30000 });
    expect(await page.locator('.pp2-pattern').count()).toBeGreaterThan(0);

    // Expand the specific pattern known to hold problems.
    const patternHeader = page.locator('.pp2-pattern__header').filter({ hasText: pattern.name }).first();
    await expect(patternHeader, `pattern "${pattern.name}" must be listed`).toBeVisible({ timeout: 30000 });
    await patternHeader.click();

    const rows = page.locator('.pp2-row');
    await expect(rows.first(), 'expanding a populated pattern must show problem rows').toBeVisible({ timeout: 30000 });
    expect(await rows.count(), `pattern "${pattern.name}" holds ${problems.length} problems`).toBe(problems.length);

    // Row content: a title, and a difficulty badge whose text is a real difficulty.
    const firstRow = rows.first();
    expect(await firstRow.locator('.pp2-row__title').textContent()).toBeTruthy();
    const badgeText = (await firstRow.locator('.pp2-badge').textContent())?.trim();
    expect(['Easy', 'Medium', 'Hard']).toContain(badgeText);

    // Switching topics changes the heading.
    const other = page.locator('.pp2-side__item').filter({ hasNotText: topic.name }).first();
    await other.click();
    await expect(page.locator('.pp2-topic-header__title')).not.toHaveText(topic.name, { timeout: 30000 });

    // Difficulty filter chips.
    expect(await page.locator('.pp2-chip').count()).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 3: problem detail page
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 3: problem detail page', () => {
  test('3.1 the page renders the problem it was asked for', async ({ page, request }) => {
    // Was `/problem/two-sum` asserting the literal string "Two Sum". The slug is not
    // seeded, so this could only ever fail. Now the problem is derived and the title is
    // checked against what the API says it should be.
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);

    await expect(page.locator('.pp-header__title'), 'the title must resolve from Loading')
      .toHaveText(problem.title, { timeout: 60000 });
  });

  test('3.2 the difficulty badge shows this problem\'s difficulty', async ({ page, request }) => {
    // Was "a badge is visible", which an empty page also satisfies. Now the badge TEXT
    // must equal the difficulty the API reports.
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    const badge = page.locator('.pp-difficulty, .pp-badge').first();
    await expect(badge).toBeVisible();
    expect((await badge.textContent())?.trim()).toBe(problem.difficulty);
  });

  test('3.3 the editor, controls and starter code are present for a real problem', async ({ page, request }) => {
    // Merges the old 3.3, 3.4 and 3.6. All three previously passed against an unseeded
    // slug because they only waited for `.pp-right-split`, which renders regardless — the
    // clearest example of D12's false confidence. Now the problem is real and the editor
    // must contain that problem's starter, not merely exist.
    const problem = await anySeededProblem(request);
    const detail = await problemDetail(request, problem.id);
    const jsStarter: string = detail.starter_code?.javascript ?? '';
    expect(jsStarter, 'the problem must ship a JavaScript starter').toBeTruthy();

    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    await expect(page.locator('.pp-right-split')).toBeVisible();
    await expect(page.locator('.pp-editor-pane')).toBeVisible();
    await expect(page.locator('.pp-lang-select')).toBeVisible();
    await expect(page.locator('.pp-btn--run')).toBeVisible();
    await expect(page.locator('.pp-btn--submit')).toBeVisible();

    // The editor holds THIS problem's starter. A generic fallback would not.
    const signature = jsStarter.split('\n').find((l) => l.includes('function')) ?? jsStarter.slice(0, 40);
    await page.waitForFunction(
      (needle) => {
        const monaco = (window as unknown as {
          monaco?: { editor: { getEditors: () => { getModel: () => { getValue: () => string } | null }[] } };
        }).monaco;
        const model = monaco?.editor.getEditors()[0]?.getModel();
        return Boolean(model && model.getValue().includes(needle as string));
      },
      signature.trim(),
      { timeout: 60000 },
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 4: submission side effects
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 4: submission side effects', () => {
  // All three were unauthenticated against an unseeded slug, and 4.3 used the mock's
  // `// FAIL` marker. The behaviours — attempt numbering, code analysis, a hint on a
  // wrong answer — are real and covered nowhere else, so all three are migrated to a
  // signed-in user, a seeded problem, and a genuinely wrong solution.
  const WRONG_JS = 'function solve(nums) {\n  return -999999;\n}';

  test('4.1 a submission reports its attempt number, and it increments', async ({ request }) => {
    const session = await createSession('platform-attempt');
    const api = await authedRequest(session);
    const problem = await anySeededProblem(api);

    const first = await (await api.post('/api/learning/submit', {
      data: { problem_id: problem.id, code: WRONG_JS, language: 'javascript' },
    })).json();
    expect(first.attempt_number, 'the first submission is attempt 1').toBe(1);

    const second = await (await api.post('/api/learning/submit', {
      data: { problem_id: problem.id, code: WRONG_JS, language: 'javascript' },
    })).json();
    // The old test only asserted "> 0", which a hardcoded 1 would satisfy forever.
    expect(second.attempt_number, 'the second submission must increment').toBe(2);

    await api.dispose();
  });

  test('4.2 a submission carries a complexity analysis', async ({ request }) => {
    const session = await createSession('platform-analysis');
    const api = await authedRequest(session);
    const problem = await anySeededProblem(api);

    const result = await (await api.post('/api/learning/submit', {
      data: {
        problem_id: problem.id,
        code: 'function solve(nums) {\n  let t = 0;\n  for (const n of nums) t += n;\n  return t;\n}',
        language: 'javascript',
      },
    })).json();

    expect(result.code_analysis).toBeDefined();
    expect(result.code_analysis.complexity?.time, 'time complexity must be reported').toBeTruthy();
    expect(result.code_analysis.complexity?.space, 'space complexity must be reported').toBeTruthy();

    await api.dispose();
  });

  test('4.3 a wrong answer comes back with a contextual hint', async ({ request }) => {
    // The old version produced its wrong answer with a `// FAIL` comment, which only the
    // mock provider honours. This one is wrong on the merits.
    const session = await createSession('platform-hint');
    const api = await authedRequest(session);
    const problem = await anySeededProblem(api);

    const result = await (await api.post('/api/learning/submit', {
      data: { problem_id: problem.id, code: WRONG_JS, language: 'javascript' },
    })).json();

    expect(result.passed, 'the control solution must be rejected').toBe(false);
    expect(result.contextual_hint).toBeDefined();
    expect(result.contextual_hint.message, 'a rejected submission must explain itself').toBeTruthy();

    await api.dispose();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 5: data integrity and endpoint access control
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 5: data integrity and endpoint access control', () => {
  test('5.1 every topic has at least one pattern', async ({ request }) => {
    const list = await topics(request);
    for (const topic of list) {
      const res = await request.get(`/api/learning/patterns/${topic.id}`);
      const { patterns } = await res.json();
      expect(patterns.length, `topic "${topic.name}" has 0 patterns`).toBeGreaterThan(0);
    }
  });

  test('5.3 every seeded slug resolves to full detail', async ({ request }) => {
    // The old version looped three hardcoded slugs inside `if (found)`. Two of the three
    // are not seeded, so it silently checked one problem and reported success for three.
    // This checks every problem in the index, unconditionally.
    const problems = await problemsIndex(request);
    for (const p of problems) {
      const res = await request.get(`/api/learning/problem/${p.id}`);
      expect(res.ok(), `detail for ${p.slug} failed`).toBeTruthy();
      const detail = await res.json();
      expect(detail.title, `${p.slug} has no title`).toBeTruthy();
      expect(detail.description, `${p.slug} has no description`).toBeTruthy();
    }
  });

  // The old 5.4-5.9 asserted `res.ok()` with no credentials. The server has since been
  // hardened to derive ownership from a verified session, so those tests were asserting
  // the PRE-hardening behaviour — they would only pass again if the hardening were undone.
  // Each private endpoint is now checked from both sides.
  const PRIVATE_ENDPOINTS = [
    '/api/learning/pattern-progress',
    '/api/learning/mastery',
    '/api/learning/predictions',
    '/api/learning/profile',
  ];

  test('5.4 private endpoints refuse an anonymous caller', async ({ request }) => {
    for (const path of PRIVATE_ENDPOINTS) {
      const res = await request.get(path);
      expect(res.status(), `${path} must require authentication`).toBe(401);
    }
    const problem = await anySeededProblem(request);
    const attempts = await request.get(`/api/learning/attempts/${problem.id}`);
    expect(attempts.status(), 'attempts must require authentication').toBe(401);
  });

  test('5.5 private endpoints answer a signed-in caller', async ({ request }) => {
    const session = await createSession('platform-private');
    const api = await authedRequest(session);

    for (const path of PRIVATE_ENDPOINTS) {
      const res = await api.get(path);
      expect(res.ok(), `${path} must answer a signed-in user (got ${res.status()})`).toBeTruthy();
    }
    const problem = await anySeededProblem(api);
    const attempts = await api.get(`/api/learning/attempts/${problem.id}`);
    expect(attempts.ok(), 'attempts must answer a signed-in user').toBeTruthy();

    await api.dispose();
  });

  test('5.7 the knowledge graph is public and populated', async ({ request }) => {
    const res = await request.get('/api/learning/knowledge-graph');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Was a bare `res.ok()`. A 200 with an empty graph is not a working endpoint.
    expect(data.graph?.nodes?.length, 'the graph must have nodes').toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 6: navigation
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 6: navigation', () => {
  test('6.1 dashboard to problem page', async ({ page, request }) => {
    const problem = await anySeededProblem(request);

    await page.goto('/problems', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.pp2-side__item', { timeout: 90000 });
    await page.waitForSelector('.pp2-pattern__header', { timeout: 60000 });
    expect(await page.locator('.pp2-pattern__header').count()).toBeGreaterThan(0);

    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });
    expect(page.url()).toContain(`/problem/${problem.slug}`);
  });

  test('6.3 the back control leaves the problem page', async ({ page, request }) => {
    // Previously ran against an unseeded slug and passed, because the back control renders
    // either way. Now it navigates away from a problem that actually loaded.
    const problem = await anySeededProblem(request);
    await page.goto(`/problem/${problem.slug}`);
    await expect(page.locator('.pp-header__title')).toHaveText(problem.title, { timeout: 60000 });

    await page.locator('.pp-header__back').click();
    await page.waitForFunction(() => !/\/problem\//.test(window.location.pathname), null, { timeout: 30000 });
  });
});
