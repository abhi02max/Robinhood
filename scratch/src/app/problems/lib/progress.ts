/**
 * Local-storage backed progress store for the Problems page.
 *
 * The backend hasn't yet exposed per-user progress for the new
 * Topic→Pattern→Problem hierarchy (`Topic.progress` is currently null on
 * the API). Until it does, we mirror the LeetCode/Notion UX expectation
 * of an instant, per-device "I solved this" toggle.
 *
 * Keyed by problem UUID. Subscribers can listen for changes so multiple
 * mounted components stay in sync without a global state library.
 */

import type { ProblemStatus } from './types';

const STORAGE_KEY = 'rh.problems.progress.v1';

type ProgressMap = Record<string, ProblemStatus>;
type Listener = (map: ProgressMap) => void;

const listeners = new Set<Listener>();
let cache: ProgressMap | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readFromStorage(): ProgressMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeToStorage(map: ProgressMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / disabled storage — fail silently, in-memory cache still works
  }
}

function getMap(): ProgressMap {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function emit(): void {
  const snapshot = { ...getMap() };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // listener errors must not break other subscribers
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getStatus(problemId: string): ProblemStatus {
  return getMap()[problemId] ?? null;
}

export function setStatus(problemId: string, status: ProblemStatus): void {
  const map = { ...getMap() };
  if (status === null) {
    delete map[problemId];
  } else {
    map[problemId] = status;
  }
  cache = map;
  writeToStorage(map);
  emit();
}

export function getAll(): ProgressMap {
  return { ...getMap() };
}

/**
 * Subscribe to progress changes. Returns an unsubscribe function suitable
 * for use as a React useEffect cleanup.
 */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Cross-tab sync — pick up edits made in another browser tab.
  if (isBrowser() && listeners.size === 1) {
    window.addEventListener('storage', handleStorageEvent);
  }
  return () => {
    listeners.delete(fn);
    if (isBrowser() && listeners.size === 0) {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

function handleStorageEvent(e: StorageEvent): void {
  if (e.key !== STORAGE_KEY) return;
  cache = null; // force re-read on next access
  emit();
}
