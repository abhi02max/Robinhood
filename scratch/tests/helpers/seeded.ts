// =============================================================================
// Facts about the curriculum, read from the API at run time.
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
//
// Defect D12 was, at bottom, a suite full of hardcoded content assumptions that the
// product had outgrown:
//
//   * `/problem/two-sum` — a slug that is not seeded. Four tests still PASSED against
//     it, because they only waited for layout containers that render on an empty page
//     too. That is worse than failing.
//   * "500+ problems" — the curriculum has 96.
//   * "Easy > 50, Medium > 100, Hard > 30" — actually 34 / 52 / 10.
//   * clicking the first five patterns of the first topic and expecting problem rows —
//     the first topic is Basics, which is one of the documented-empty topics, so all
//     six of its patterns hold zero problems. Five eight-second waits then blew the
//     thirty-second test timeout, which is why the failure looked like a browser crash.
//
// Every one of those is a number or a name that changes as content is authored. The fix
// is not to update the constants; it is to stop having constants. These helpers ask the
// running product what exists and let the test assert on invariants instead.
//
// The one thing deliberately NOT derived is which slug the language and submission specs
// drive: those pin `house-robber` on purpose, because their reference solutions have to
// match a specific problem.
// =============================================================================
import { expect, type APIRequestContext } from '@playwright/test';

export type IndexedProblem = {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: { id: string; slug: string; name: string };
  pattern: { id: string; slug: string; name: string };
};

export type Topic = { id: string; name: string; slug: string };

/** The whole problems index, asserted non-empty. */
export async function problemsIndex(request: APIRequestContext): Promise<IndexedProblem[]> {
  const res = await request.get('/api/learning/problems-index');
  expect(res.ok(), 'problems-index must respond').toBeTruthy();
  const data = await res.json();
  expect(Array.isArray(data.problems), 'problems-index must return an array').toBeTruthy();
  expect(data.problems.length, 'the curriculum must not be empty').toBeGreaterThan(0);
  return data.problems as IndexedProblem[];
}

export async function topics(request: APIRequestContext): Promise<Topic[]> {
  const res = await request.get('/api/learning/topics');
  expect(res.ok(), 'topics must respond').toBeTruthy();
  const data = await res.json();
  expect(data.topics?.length, 'there must be topics').toBeGreaterThan(0);
  return data.topics as Topic[];
}

/**
 * A seeded problem, chosen deterministically so failures are reproducible.
 *
 * Sorted by slug and the first taken, rather than `problems[0]`, which follows whatever
 * order the API happens to return.
 */
export async function anySeededProblem(request: APIRequestContext): Promise<IndexedProblem> {
  const all = await problemsIndex(request);
  const sorted = [...all].sort((a, b) => a.slug.localeCompare(b.slug));
  return sorted[0];
}

/**
 * A topic that actually contains problems, plus one of its non-empty patterns.
 *
 * This is the replacement for "click the first five patterns and hope". Only 16 of 108
 * patterns hold problems today, so picking blind is picking wrong.
 */
export async function topicWithProblems(request: APIRequestContext): Promise<{
  topic: IndexedProblem['topic'];
  pattern: IndexedProblem['pattern'];
  problems: IndexedProblem[];
}> {
  const all = await problemsIndex(request);
  const byPattern = new Map<string, IndexedProblem[]>();
  for (const p of all) {
    const list = byPattern.get(p.pattern.slug) ?? [];
    list.push(p);
    byPattern.set(p.pattern.slug, list);
  }
  // The most populated pattern, so the dashboard assertions have the most to look at.
  const [, problems] = [...byPattern.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  expect(problems.length, 'at least one pattern must hold problems').toBeGreaterThan(0);
  return { topic: problems[0].topic, pattern: problems[0].pattern, problems };
}

/** Full detail for a problem id. */
export async function problemDetail(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/learning/problem/${id}`);
  expect(res.ok(), `detail for ${id} must respond`).toBeTruthy();
  return res.json();
}
