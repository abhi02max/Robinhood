'use client';

/**
 * RightPane — slim shell composing the per-panel modules under ./RightPane/.
 *
 * Contract (Task 5.7 / Requirements 2.5, 2.8):
 *  • Fewer than 200 newline-terminated lines.
 *  • Exactly one exported React component (`RightPane`).
 *  • Zero other React components or `React.memo(...)` wrappers at any
 *    nesting depth — every panel lives in its own module under
 *    `./RightPane/<Module>/<Component>.tsx` and every helper used here
 *    comes from `./RightPane/lib/` or `./ui/`.
 *  • DOM byte-equivalent to the Spec_Baseline so every Playwright-asserted
 *    selector keeps matching the same elements: `.pp-right-split`,
 *    `.pp-status-banner`, `.pp-difficulty`, `.pp-header__title`,
 *    `.pp-header__back`, plus every other `.pp-*` referenced under
 *    `scratch/tests/*.spec.ts` (`.pp-pane`, `.pp-right`, `.pp-tabs`,
 *    `.pp-tab`, `.pp-tab--active`, `.pp-tab__count`, `.pp-right__body`,
 *    `.pp-spinner`, `.pp-idle`, `.pp-idle__icon`, `.pp-error-box`,
 *    `.pp-tc-card`, `.pp-tc`, …).
 *
 * The `pp-right-split`, `.pp-difficulty`, `.pp-header__title`, and
 * `.pp-header__back` selectors are rendered by `ProblemPage.tsx`, which
 * sits one level above this shell — they are listed here only because
 * the task contract requires the consolidation to preserve them.
 *
 * `useProblem`, `useEditor`, `useSubmission`, and `ProblemPage.tsx` are
 * NOT touched by this task (Requirement 2.7) — this file changes only.
 */

import { useEffect, useState } from 'react';
import type {
  AttemptData, CommunityInsights, PredictiveData,
  RecommendationData, SubmissionResult, UserProfile, VisibleTC,
} from './types';
import CollapsibleSection from './ui/CollapsibleSection';
import RunResults from './RightPane/RunResults/RunResults';
import SubmitResults from './RightPane/SubmitResults/SubmitResults';
import CodeAnalysisPanel from './RightPane/CodeAnalysis/CodeAnalysisPanel';
import CommunityPanel from './RightPane/Community/CommunityPanel';
import PredictivePanel from './RightPane/Predictive/PredictivePanel';
import UserProfileCard from './RightPane/UserProfile/UserProfileCard';

// `ProblemPage.tsx` does `export type { SubmissionResult } from './RightPane';`
// for backwards compatibility — keep the re-export. The canonical declaration
// lives in './types'. This is a type re-export, not a value or component
// declaration, so the "exactly one exported React component" contract holds.
export type { SubmissionResult } from './types';

export default function RightPane({
  cases, runResult, submitResult, running, submitting,
  attemptData, attemptError,
  recommendation, recommendationError,
  userProfile, profileError,
  community, communityError,
  predictions, predictionsError,
}: {
  cases: VisibleTC[];
  runResult: SubmissionResult | null;
  submitResult: SubmissionResult | null;
  running: boolean;
  submitting: boolean;
  attemptData: AttemptData | null;
  attemptError?: string | null;
  recommendation: RecommendationData | null;
  recommendationError?: string | null;
  userProfile: UserProfile | null;
  profileError?: string | null;
  community: CommunityInsights | null;
  communityError?: string | null;
  predictions: PredictiveData | null;
  predictionsError?: string | null;
}) {
  const [tab, setTab] = useState<'run' | 'submit'>('run');
  useEffect(() => { if (running) setTab('run'); }, [running]);
  useEffect(() => { if (submitting || submitResult) setTab('submit'); }, [submitting, submitResult]);

  const idle = !running && !submitting;

  return (
    <section className="pp-pane pp-right" aria-label="Test results">
      <div className="pp-tabs" role="tablist">
        <button className={`pp-tab ${tab === 'run' ? 'pp-tab--active' : ''}`} onClick={() => setTab('run')}>
          Test Cases {cases.length > 0 && <span className="pp-tab__count">{cases.length}</span>}
        </button>
        <button className={`pp-tab ${tab === 'submit' ? 'pp-tab--active' : ''}`} onClick={() => setTab('submit')}>
          Result {submitResult ? <span className="pp-tab__count">●</span> : null}
        </button>
      </div>
      <div className="pp-right__body">
        {running || submitting ? (
          <div className="pp-spinner">{running ? 'Running…' : 'Submitting…'}</div>
        ) : tab === 'run' ? (
          runResult ? (
            <>
              <RunResults cases={cases} submission={runResult} attemptData={attemptData} />
              {attemptError && !attemptData && (
                <div className="pp-error-box" role="alert" style={{ marginTop: 10 }}>
                  <div className="pp-error-box__title">⚠ Attempt history unavailable</div>
                  <div className="pp-error-box__msg">{attemptError}</div>
                </div>
              )}
            </>
          ) : (
            <div className="pp-idle"><div className="pp-idle__icon">▶</div>Press <strong>Run</strong> to test against visible cases.</div>
          )
        ) : (
          <>
            <SubmitResults submission={submitResult} attemptData={attemptData} recommendation={recommendation} />
            {submitResult && recommendationError && !recommendation && (
              <div className="pp-error-box" role="alert" style={{ marginTop: 10 }}>
                <div className="pp-error-box__title">⚠ Recommendation unavailable</div>
                <div className="pp-error-box__msg">{recommendationError}</div>
              </div>
            )}
          </>
        )}
        {idle && submitResult && <CodeAnalysisPanel submission={submitResult} />}
        {idle && (
          userProfile && userProfile.total_submissions > 0 ? (
            <CollapsibleSection icon="🧠" title="Learning Profile" defaultOpen={false}>
              <UserProfileCard profile={userProfile} />
            </CollapsibleSection>
          ) : profileError ? (
            <div className="pp-error-box" role="alert" style={{ marginTop: 10 }}>
              <div className="pp-error-box__title">⚠ Learning profile unavailable</div>
              <div className="pp-error-box__msg">{profileError}</div>
            </div>
          ) : null
        )}
        {idle && (
          community && community.total_submissions > 0 ? (
            <CollapsibleSection icon="🌐" title="Community Insights" defaultOpen={false}>
              <CommunityPanel community={community} />
            </CollapsibleSection>
          ) : communityError ? (
            <div className="pp-error-box" role="alert" style={{ marginTop: 10 }}>
              <div className="pp-error-box__title">⚠ Community insights unavailable</div>
              <div className="pp-error-box__msg">{communityError}</div>
            </div>
          ) : null
        )}
        {idle && (
          predictions ? (
            <CollapsibleSection icon="🔮" title="Predictive Intelligence" defaultOpen={false}>
              <PredictivePanel predictions={predictions} />
            </CollapsibleSection>
          ) : predictionsError ? (
            <div className="pp-error-box" role="alert" style={{ marginTop: 10 }}>
              <div className="pp-error-box__title">⚠ Predictive intelligence unavailable</div>
              <div className="pp-error-box__msg">{predictionsError}</div>
            </div>
          ) : null
        )}
      </div>
    </section>
  );
}
