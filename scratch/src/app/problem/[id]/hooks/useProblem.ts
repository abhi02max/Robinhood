'use client';
import { useEffect, useState } from 'react';
import type { ProblemDetail } from '../LeftPane';
import type { AttemptData, UserProfile, CommunityInsights, PredictiveData } from '../types';
import { fetchProblem, fetchAttempts, fetchProfile, fetchCommunity, fetchPredictions, FetchError } from '../api';
import { DEFAULT_STARTERS } from '../types';
import type { LanguageId } from '../types';

function describeError(e: unknown): string {
  if (e instanceof FetchError) return e.message || `Request failed (${e.status})`;
  if (e instanceof Error) return e.message || 'Request failed';
  return 'Request failed';
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

export function useProblem(id: string, language: LanguageId, codeByLangRef: React.MutableRefObject<Record<LanguageId, string>>, setCode: (c: string) => void) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Per-surface state. Failure of a Curriculum_API call MUST surface a
  // user-visible indication on the affected surface (Requirement 1.9).
  // No fallback to scratch/src/data/* is permitted.
  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityInsights | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictiveData | null>(null);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    setLoading(true); setError(null); setNotFound(false);
    setAttemptError(null); setProfileError(null); setCommunityError(null); setPredictionsError(null);

    fetchProblem(id, ac.signal)
      .then((p) => {
        setProblem(p);
        // Populate the per-language code cache from server starter_code,
        // falling back to DEFAULT_STARTERS for any missing language so we
        // never silently drop a slot (previously c/csharp were dropped).
        const next = { ...DEFAULT_STARTERS } as Record<LanguageId, string>;
        (Object.keys(DEFAULT_STARTERS) as LanguageId[]).forEach((lang) => {
          const fromApi = (p.starter_code?.[lang] ?? '').trim();
          if (fromApi) next[lang] = fromApi;
        });
        codeByLangRef.current = next;
        setCode(codeByLangRef.current[language]);
        document.title = `${p.title} · Robinhood`;

        // Fan out per-surface enrichment fetches. Each surface tracks its
        // own error independently so a single auxiliary failure does not
        // hide the rest of the page (Requirement 1.9).
        fetchAttempts(p.id, ac.signal)
          .then((d) => { setAttemptData(d); setAttemptError(null); })
          .catch((e) => { if (!isAbort(e)) { setAttemptData(null); setAttemptError(describeError(e)); } });
        fetchProfile(ac.signal)
          .then((d) => { setUserProfile(d); setProfileError(null); })
          .catch((e) => { if (!isAbort(e)) { setUserProfile(null); setProfileError(describeError(e)); } });
        fetchCommunity(p.id, ac.signal)
          .then((d) => { setCommunity(d); setCommunityError(null); })
          .catch((e) => { if (!isAbort(e)) { setCommunity(null); setCommunityError(describeError(e)); } });
        fetchPredictions(ac.signal)
          .then((d) => { setPredictions(d); setPredictionsError(null); })
          .catch((e) => { if (!isAbort(e)) { setPredictions(null); setPredictionsError(describeError(e)); } });
      })
      .catch((e) => {
        if (isAbort(e)) return;
        if (e instanceof FetchError && e.status === 404) { setNotFound(true); return; }
        setError(describeError(e));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refreshAttempts = (problemId: string) =>
    fetchAttempts(problemId)
      .then((d) => { setAttemptData(d); setAttemptError(null); })
      .catch((e) => { if (!isAbort(e)) { setAttemptData(null); setAttemptError(describeError(e)); } });

  return {
    problem, loading, error, notFound,
    attemptData, attemptError,
    userProfile, profileError,
    community, communityError,
    predictions, predictionsError,
    refreshAttempts,
  };
}
