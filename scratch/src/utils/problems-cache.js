// =============================================================================
// ROBINHOOD — Problems Cache (Phase A hydration layer)
//
// Single in-memory cache of the DB-driven /api/learning/problems-index. The
// cache is hydrated ONCE at app boot (see src/main.js) and afterwards exposes
// a synchronous API that mirrors what the old static src/data/problems.js
// surface used to provide.
//
// Synchronous-after-hydration is the contract. Callers that fire BEFORE
// hydrate() resolves get a console warning + an empty/null fallback, so the
// UI degrades gracefully rather than throwing.
//
// Public API:
//   hydrate({ signal? })       → Promise<Problem[]>  (idempotent / coalesced)
//   isHydrated()               → boolean
//   getHydrationError()        → Error | null
//   getAllProblems()           → Problem[]
//   getProblemById(id)         → Problem | null
//   getProblemBySlug(slug)     → Problem | null
//   searchProblems(query)      → Problem[]   (matches title/topic/pattern/tags)
//   getProblemsByTopic(slug)   → Problem[]
//   getProblemsByDifficulty(d) → Problem[]
//   getCategoryStats()         → Array<{ id, name, count }>
//
// Problem shape (from /api/learning/problems-index):
//   { id, slug, title, difficulty, tags, topic:{id,slug,name}, pattern:{...} }
// =============================================================================

import { fetchProblemsIndex } from './learning-api.js';

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------
let _problems = [];                          // canonical ordered list
const _byId = new Map();                     // id (string) → Problem
const _bySlug = new Map();                   // slug → Problem
const _byTopic = new Map();                  // topic.slug → Problem[]
const _byDifficulty = new Map();             // difficulty → Problem[]

let _state = 'pending';                      // 'pending' | 'ready' | 'error'
let _hydratePromise = null;
let _hydrateError = null;

// -----------------------------------------------------------------------------
// Hydration
// -----------------------------------------------------------------------------

/**
 * Hydrate the cache from /api/learning/problems-index. Concurrent / repeated
 * calls share the same in-flight promise. Successful hydration leaves the
 * cache in `ready` state. Failure leaves it in `error` state — callers may
 * call hydrate() again to retry.
 */
export async function hydrate({ signal } = {}) {
  if (_hydratePromise && _state !== 'error') return _hydratePromise;

  _hydratePromise = (async () => {
    try {
      const problems = await fetchProblemsIndex({ signal });
      _problems = Array.isArray(problems) ? problems : [];
      _byId.clear();
      _bySlug.clear();
      _byTopic.clear();
      _byDifficulty.clear();
      for (const p of _problems) {
        if (p?.id != null) _byId.set(String(p.id), p);
        if (p?.slug)        _bySlug.set(String(p.slug), p);
        const topicKey = p?.topic?.slug;
        if (topicKey) {
          if (!_byTopic.has(topicKey)) _byTopic.set(topicKey, []);
          _byTopic.get(topicKey).push(p);
        }
        const difKey = p?.difficulty;
        if (difKey) {
          if (!_byDifficulty.has(difKey)) _byDifficulty.set(difKey, []);
          _byDifficulty.get(difKey).push(p);
        }
      }
      _state = 'ready';
      _hydrateError = null;
      return _problems;
    } catch (error) {
      _state = 'error';
      _hydrateError = error;
      // Re-arm so a subsequent hydrate() call can retry rather than re-using
      // this rejected promise forever.
      _hydratePromise = null;
      throw error;
    }
  })();
  return _hydratePromise;
}

export function isHydrated()        { return _state === 'ready'; }
export function getHydrationState() { return _state; }
export function getHydrationError() { return _hydrateError; }

// -----------------------------------------------------------------------------
// Synchronous read API
// -----------------------------------------------------------------------------

function _warnIfPending(method) {
  if (_state === 'pending') {
    console.warn(`[problems-cache] ${method}() called before hydrate() resolved — returning empty result`);
  }
}

/**
 * Returns the cached array. Callers MUST treat the return value as read-only;
 * mutating it would corrupt the cache. (We deliberately do not return a copy
 * for hot paths.)
 */
export function getAllProblems() {
  _warnIfPending('getAllProblems');
  return _problems;
}

export function getProblemById(id) {
  _warnIfPending('getProblemById');
  if (id == null || id === '') return null;
  return _byId.get(String(id)) || null;
}

export function getProblemBySlug(slug) {
  _warnIfPending('getProblemBySlug');
  if (!slug) return null;
  return _bySlug.get(String(slug)) || null;
}

export function getProblemsByTopic(topicSlug) {
  _warnIfPending('getProblemsByTopic');
  if (!topicSlug) return [];
  return _byTopic.get(String(topicSlug)) || [];
}

export function getProblemsByDifficulty(difficulty) {
  _warnIfPending('getProblemsByDifficulty');
  if (!difficulty) return [];
  return _byDifficulty.get(String(difficulty)) || [];
}

/**
 * Substring search across title, topic name/slug, pattern name, and tags.
 * Empty query returns the full list (matches the legacy contract).
 */
export function searchProblems(query) {
  _warnIfPending('searchProblems');
  if (!query || typeof query !== 'string') return _problems;
  const q = query.trim().toLowerCase();
  if (!q) return _problems;
  return _problems.filter((p) => {
    if (String(p?.title || '').toLowerCase().includes(q)) return true;
    if (String(p?.topic?.name || '').toLowerCase().includes(q)) return true;
    if (String(p?.topic?.slug || '').toLowerCase().includes(q)) return true;
    if (String(p?.pattern?.name || '').toLowerCase().includes(q)) return true;
    if (Array.isArray(p?.tags) && p.tags.some((t) => String(t).toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * Aggregate counts grouped by topic.slug. Replaces the legacy
 * getCategoryStats() which grouped by the static `category` field. Returns
 * stats sorted by count descending (matches legacy ordering).
 */
export function getCategoryStats() {
  _warnIfPending('getCategoryStats');
  const stats = [];
  for (const [topicSlug, list] of _byTopic) {
    const sample = list[0];
    stats.push({
      id: topicSlug,
      name: sample?.topic?.name || topicSlug,
      count: list.length,
    });
  }
  return stats.sort((a, b) => b.count - a.count);
}

// -----------------------------------------------------------------------------
// Test seam — internal only. Used by tests / dev tooling to reset state
// between cases. Production callers should ignore this export.
// -----------------------------------------------------------------------------
export function _resetCacheForTests() {
  _problems = [];
  _byId.clear();
  _bySlug.clear();
  _byTopic.clear();
  _byDifficulty.clear();
  _state = 'pending';
  _hydratePromise = null;
  _hydrateError = null;
}
