/**
 * Typed API client for the Problems learning system.
 *
 * Single source of truth for fetching topics / patterns / problems. Every
 * call is wrapped with consistent error handling so UI components can
 * focus on rendering.
 */

import type { Pattern, ProblemSummary, Topic } from './types';

const API_BASE = '/api/learning';

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (body && typeof body === 'object' && 'message' in body) {
      const raw = (body as { message: unknown }).message;
      if (typeof raw === 'string' && raw.trim()) message = raw;
    }
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Public fetchers
// ---------------------------------------------------------------------------

export async function fetchTopics(signal?: AbortSignal): Promise<Topic[]> {
  const data = await getJson<{ topics: Topic[]; count: number }>('/topics', { signal });
  return Array.isArray(data?.topics) ? data.topics : [];
}

export async function fetchPatterns(topicId: string, signal?: AbortSignal): Promise<Pattern[]> {
  const data = await getJson<{ topic_id: string; patterns: Pattern[]; count: number }>(
    `/patterns/${encodeURIComponent(topicId)}`,
    { signal }
  );
  return Array.isArray(data?.patterns) ? data.patterns : [];
}

export async function fetchProblemsByPattern(
  patternId: string,
  signal?: AbortSignal
): Promise<ProblemSummary[]> {
  const data = await getJson<{ pattern_id: string; problems: ProblemSummary[]; count: number }>(
    `/problems/${encodeURIComponent(patternId)}`,
    { signal }
  );
  return Array.isArray(data?.problems) ? data.problems : [];
}

export { ApiError };
