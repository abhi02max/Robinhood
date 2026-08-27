/**
 * API layer for Problem Page.
 * All fetch functions extracted from ProblemPage.tsx.
 *
 * Failure surface (Requirement 1.9):
 *   Every Curriculum_API call here throws on (a) non-2xx status,
 *   (b) network errors (the underlying `fetch` rejects), and
 *   (c) shape-mismatch (response body does not parse as the expected
 *   shape). Hooks consuming these fetchers translate the throw into a
 *   user-visible error indication for the affected surface — never a
 *   silent fallback, and never a fallback to `scratch/src/data/*`.
 */

import type {
  LanguageId, SubmissionResult, AttemptData,
  RecommendationData, UserProfile, CommunityInsights, PredictiveData,
} from './types';
import type { ProblemDetail } from './LeftPane';

export class FetchError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.name = 'FetchError'; this.status = status; }
}

/**
 * Thrown when a Curriculum_API response status is 2xx but the body does
 * not parse as the expected shape (Requirement 1.9).
 */
export class ApiShapeError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ApiShapeError'; }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (isRecord(body) && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    /* body was not JSON */
  }
  return fallback;
}

async function getJsonOrThrow(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new FetchError(await readErrorMessage(res, `HTTP ${res.status}`), res.status);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new ApiShapeError(`${url}: response body was not valid JSON`);
  }
}

// ---------------------------------------------------------------------------
// Shape guards
// ---------------------------------------------------------------------------

function isProblemDetail(v: unknown): v is ProblemDetail {
  if (!isRecord(v)) return false;
  return typeof v.id === 'string'
    && typeof v.title === 'string'
    && typeof v.difficulty === 'string'
    && typeof v.description === 'string'
    && Array.isArray(v.test_cases);
}

function isAttemptData(v: unknown): v is AttemptData {
  return isRecord(v)
    && typeof v.problem_id === 'string'
    && Array.isArray(v.attempts)
    && typeof v.total === 'number';
}

function isRecommendationData(v: unknown): v is RecommendationData {
  // Server wraps with { ok: true, ... }; tolerate both wrapped and unwrapped
  // until Sprint 5 unifies the envelope.
  if (!isRecord(v)) return false;
  return 'recommendation' in v && 'alternatives' in v && Array.isArray(v.alternatives);
}

function isUserProfile(v: unknown): v is UserProfile {
  if (!isRecord(v)) return false;
  return Array.isArray(v.strengths)
    && Array.isArray(v.weaknesses)
    && typeof v.total_submissions === 'number';
}

function isCommunityInsights(v: unknown): v is CommunityInsights {
  if (!isRecord(v)) return false;
  return typeof v.total_submissions === 'number'
    && typeof v.total_users === 'number'
    && isRecord(v.failure_breakdown);
}

function isPredictiveData(v: unknown): v is PredictiveData {
  if (!isRecord(v)) return false;
  return isRecord(v.readiness)
    && isRecord(v.velocity)
    && Array.isArray(v.risk_alerts)
    && Array.isArray(v.interventions)
    && typeof v.health_score === 'number';
}

function isSubmissionResult(v: unknown): v is SubmissionResult {
  if (!isRecord(v)) return false;
  return typeof v.submission_id === 'string'
    && typeof v.status === 'string'
    && typeof v.passed === 'boolean'
    && typeof v.pass_count === 'number'
    && typeof v.total_cases === 'number';
}

// ---------------------------------------------------------------------------
// Public fetchers
// ---------------------------------------------------------------------------

export async function fetchProblem(slugOrId: string, signal?: AbortSignal): Promise<ProblemDetail> {
  const res = await fetch(`/api/learning/problem/${encodeURIComponent(slugOrId)}`, {
    headers: { Accept: 'application/json' }, signal,
  });
  if (!res.ok) {
    throw new FetchError(await readErrorMessage(res, `HTTP ${res.status}`), res.status);
  }
  let json: unknown;
  try { json = await res.json(); } catch { throw new ApiShapeError('fetchProblem: response body was not valid JSON'); }
  if (!isProblemDetail(json)) {
    throw new ApiShapeError('fetchProblem: response did not match ProblemDetail shape');
  }
  return json;
}

export async function postSubmission(args: { problemId: string; code: string; language: LanguageId }): Promise<SubmissionResult> {
  const res = await fetch('/api/learning/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem_id: args.problemId, code: args.code, language: args.language }),
  });
  let json: unknown = {};
  try { json = await res.json(); } catch { /* tolerated below */ }
  if (!res.ok) {
    const msg = isRecord(json) && typeof json.message === 'string' && json.message.trim() ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!isSubmissionResult(json)) {
    throw new ApiShapeError('postSubmission: response did not match SubmissionResult shape');
  }
  return json;
}

export async function fetchAttempts(problemId: string, signal?: AbortSignal): Promise<AttemptData> {
  const json = await getJsonOrThrow(`/api/learning/attempts/${encodeURIComponent(problemId)}`, { signal });
  if (!isAttemptData(json)) {
    throw new ApiShapeError('fetchAttempts: response did not match AttemptData shape');
  }
  return json;
}

export async function fetchRecommendation(problemId: string, signal?: AbortSignal): Promise<RecommendationData> {
  const json = await getJsonOrThrow(`/api/learning/recommend/${encodeURIComponent(problemId)}`, { signal });
  if (!isRecommendationData(json)) {
    throw new ApiShapeError('fetchRecommendation: response did not match RecommendationData shape');
  }
  return json;
}

export async function fetchProfile(signal?: AbortSignal): Promise<UserProfile> {
  const json = await getJsonOrThrow('/api/learning/profile', { signal });
  if (!isUserProfile(json)) {
    throw new ApiShapeError('fetchProfile: response did not match UserProfile shape');
  }
  return json;
}

export async function fetchCommunity(problemId: string, signal?: AbortSignal): Promise<CommunityInsights> {
  const json = await getJsonOrThrow(`/api/learning/community/${encodeURIComponent(problemId)}`, { signal });
  if (!isCommunityInsights(json)) {
    throw new ApiShapeError('fetchCommunity: response did not match CommunityInsights shape');
  }
  return json;
}

export async function fetchPredictions(signal?: AbortSignal): Promise<PredictiveData> {
  const json = await getJsonOrThrow('/api/learning/predictions', { signal });
  if (!isPredictiveData(json)) {
    throw new ApiShapeError('fetchPredictions: response did not match PredictiveData shape');
  }
  return json;
}
