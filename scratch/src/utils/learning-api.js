// =========================================================================
//  Robinhood — shared learning API helper for legacy (vanilla JS) pages.
//
//  This module is used by the migrated legacy pages (companies, sheets,
//  revision, concept-map, profile) to fetch curriculum + problem data from
//  the DB-backed /api/learning/* endpoints. It deliberately mirrors the
//  contract of src/app/problems/lib/api.ts (the typed App-Router helper)
//  but in plain JavaScript so it can be imported from the legacy pages
//  without dragging in TS tooling.
//
//  Design notes:
//   * Each function owns a single fetch + JSON parse + error normalisation.
//   * Errors throw an `ApiError` with `.status` and `.endpoint` for callers
//     that want to render a meaningful empty/error state instead of crashing.
//   * The functions return arrays directly (never `{ ok, data }` envelopes)
//     so callers can `.map`/`.filter` without an extra hop.
//   * AbortSignal pass-through so pages can cancel inflight requests on
//     route change.
// =========================================================================

export class ApiError extends Error {
  constructor(message, { status = 0, endpoint = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

async function getJson(endpoint, { signal } = {}) {
  let res;
  try {
    res = await fetch(endpoint, { signal, headers: { Accept: 'application/json' } });
  } catch (networkError) {
    if (networkError && networkError.name === 'AbortError') throw networkError;
    throw new ApiError(`Network error fetching ${endpoint}: ${networkError?.message || networkError}`, {
      status: 0,
      endpoint,
    });
  }

  if (!res.ok) {
    let serverMessage = '';
    try {
      const body = await res.json();
      serverMessage = body?.message || body?.reason || body?.error || '';
    } catch {
      // body wasn't JSON — ignore
    }
    throw new ApiError(
      `${endpoint} responded ${res.status}${serverMessage ? `: ${serverMessage}` : ''}`,
      { status: res.status, endpoint },
    );
  }

  try {
    return await res.json();
  } catch (parseError) {
    throw new ApiError(`Invalid JSON from ${endpoint}: ${parseError?.message || parseError}`, {
      status: res.status,
      endpoint,
    });
  }
}

// -------------------------------------------------------------------------
// Topics
// -------------------------------------------------------------------------

/**
 * GET /api/learning/topics
 * @returns {Promise<Array<{id, name, slug, description, order_index}>>}
 */
export async function fetchTopics({ signal } = {}) {
  const json = await getJson('/api/learning/topics', { signal });
  return Array.isArray(json?.topics) ? json.topics : [];
}

// -------------------------------------------------------------------------
// Patterns
// -------------------------------------------------------------------------

/**
 * GET /api/learning/patterns/:topicId
 * @returns {Promise<Array>}
 */
export async function fetchPatternsForTopic(topicId, { signal } = {}) {
  if (!topicId) return [];
  const json = await getJson(`/api/learning/patterns/${encodeURIComponent(topicId)}`, { signal });
  return Array.isArray(json?.patterns) ? json.patterns : [];
}

// -------------------------------------------------------------------------
// Problems
// -------------------------------------------------------------------------

/**
 * GET /api/learning/problems/:patternId
 */
export async function fetchProblemsForPattern(patternId, { signal } = {}) {
  if (!patternId) return [];
  const json = await getJson(`/api/learning/problems/${encodeURIComponent(patternId)}`, { signal });
  return Array.isArray(json?.problems) ? json.problems : [];
}

/**
 * GET /api/learning/problem/:slug
 *
 * Pass either a slug (preferred) or a UUID (backward-compatible) — the
 * server treats the param slug-first and falls back to UUID for old links.
 */
export async function fetchProblemBySlug(slugOrId, { signal } = {}) {
  if (!slugOrId) throw new ApiError('Missing problem identifier', { endpoint: '/api/learning/problem' });
  return getJson(`/api/learning/problem/${encodeURIComponent(slugOrId)}`, { signal });
}

/**
 * GET /api/learning/problems-index
 *
 * Compact cross-cutting projection of every problem with its topic + pattern.
 * Used by sheets / revision / concept-map / profile pages to avoid walking
 * the topic→pattern→problem hierarchy themselves.
 */
export async function fetchProblemsIndex({ signal } = {}) {
  const json = await getJson('/api/learning/problems-index', { signal });
  return Array.isArray(json?.problems) ? json.problems : [];
}

// -------------------------------------------------------------------------
// Companies
// -------------------------------------------------------------------------

/**
 * GET /api/learning/companies
 *
 * Returns the company taxonomy. Each company carries an `advertised`
 * problemCount today; per-company problem lists are intentionally empty
 * until the schema models company tagging — see the server endpoint's
 * `schemaSupportsProblemMapping` flag.
 */
export async function fetchCompanies({ signal } = {}) {
  const json = await getJson('/api/learning/companies', { signal });
  return Array.isArray(json?.companies) ? json.companies : [];
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Build an in-memory id→problem index from the compact /problems-index
 * payload. Used by pages that look up problems by their stored progress
 * keys (which are `problem.id` values from the DB).
 */
export function indexProblemsById(problems) {
  const map = new Map();
  for (const problem of problems || []) {
    if (problem?.id) map.set(String(problem.id), problem);
  }
  return map;
}

/**
 * Build a slug→problem index. Useful for slug-based routing flows.
 */
export function indexProblemsBySlug(problems) {
  const map = new Map();
  for (const problem of problems || []) {
    if (problem?.slug) map.set(String(problem.slug), problem);
  }
  return map;
}

/**
 * Group problems by topic.slug. Returns a Map<topicSlug, Problem[]> with
 * stable ordering preserved from the server response.
 */
export function groupProblemsByTopic(problems) {
  const groups = new Map();
  for (const problem of problems || []) {
    const key = problem?.topic?.slug || '_uncategorised_';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(problem);
  }
  return groups;
}
