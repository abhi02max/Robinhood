'use client';
import { useCallback, useEffect, useState } from 'react';
import type { LanguageId, SubmissionResult, RecommendationData } from '../types';
import { postRun, postSubmission, fetchRecommendation } from '../api';
import type { ProblemDetail } from '../LeftPane';

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message || 'Request failed';
  return 'Request failed';
}

export function useSubmission(
  problem: ProblemDetail | null,
  code: string,
  language: LanguageId,
  refreshAttempts: (problemId: string) => void,
) {
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<SubmissionResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmissionResult | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  // Run is a scratchpad: visible cases only, nothing written down.
  //
  // It used to call postSubmission, which is what Submit calls. That meant every
  // exploratory Run persisted an attempt row -- inflating attempt counts, per-user
  // accuracy, problems_attempted, avg_attempts and the community solve rate -- and
  // graded the code against hidden cases while the UI said "test against visible
  // cases". It also cost a full submission in provider requests, which on Paiza is
  // ~65 HTTP calls for a 13-case C++ problem instead of the intended 4 cases.
  //
  // Deliberately does NOT call refreshAttempts: there is no new attempt to fetch.
  const handleRun = useCallback(async () => {
    if (!problem || running || submitting) return;
    setRunning(true); setRunResult(null);
    try {
      const r = await postRun({ problemId: problem.id, code, language });
      setRunResult(r);
    } catch (e) {
      setRunResult({
        submission_id: '', status: 'Runtime Error', passed: false,
        pass_count: 0, total_cases: problem.test_cases?.length ?? 0,
        failed_test_case: { test_index: 0, is_hidden: false, input: null, expected: null, actual: (e as Error).message, message: 'Execution failed' },
        runtime_ms: 0, memory_bytes: 0, language, created_at: new Date().toISOString(),
      });
    } finally { setRunning(false); }
  }, [problem, code, language, running, submitting]);

  const handleSubmit = useCallback(async () => {
    if (!problem || running || submitting) return;
    setSubmitting(true); setSubmitResult(null); setRecommendationError(null);
    try {
      const r = await postSubmission({ problemId: problem.id, code, language });
      setSubmitResult(r);
      refreshAttempts(problem.id);
      // Recommendation is a Curriculum_API call: failures must surface a
      // user-visible error on the affected surface, never a silent swallow
      // and never a fallback to scratch/src/data/* (Requirement 1.9).
      fetchRecommendation(problem.id)
        .then((d) => { setRecommendation(d); setRecommendationError(null); })
        .catch((e) => { setRecommendation(null); setRecommendationError(describeError(e)); });
    } catch (e) {
      setSubmitResult({
        submission_id: '', status: 'Wrong Answer', passed: false,
        pass_count: 0, total_cases: problem.test_cases?.length ?? 0,
        failed_test_case: { test_index: 0, is_hidden: false, input: null, expected: null, actual: (e as Error).message, message: 'Submission failed' },
        runtime_ms: 0, memory_bytes: 0, language, created_at: new Date().toISOString(),
      });
    } finally { setSubmitting(false); }
  }, [problem, code, language, running, submitting, refreshAttempts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleRun(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRun, handleSubmit]);

  return { running, submitting, runResult, submitResult, recommendation, recommendationError, handleRun, handleSubmit };
}
