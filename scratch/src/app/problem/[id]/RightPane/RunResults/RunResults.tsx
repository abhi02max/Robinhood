// Run Results panel extracted verbatim from RightPane.tsx (RunResultsView).
//
// Renders the result of a "Run" action against visible test cases:
//   * status banner with runtime / memory
//   * optional reinforcement banner on success
//   * optional `SmartErrorBox` on runtime / TLE / compilation failures
//   * optional adaptive (or server-provided contextual) hint
//   * `IntelligencePanel` summary
//   * one `TestCaseCard` per visible case (or an idle empty-state)
//
// The DOM structure (class names, element nesting, conditional render order)
// is byte-equal to the Spec_Baseline inline implementation so that the
// `^pp(2)?-` class-token multiset on the rendered tree stays identical
// (Requirement 2.4) and any Playwright assertion targeting `.pp-status-banner`
// / `.pp-meta-cell` / `.pp-reinforcement` / `.pp-hint` / `.pp-idle` keeps
// matching the same DOM elements (Requirement 2.5).
//
// All sub-components and pure helpers are imported from their canonical
// RightPane paths — no logic is duplicated here.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6):
//   • The "no visible test cases" empty-state div uses the canonical
//     `pp-idle` / `pp-idle__icon` class tokens, so it is replaced with the
//     `EmptyState` primitive from `../../ui/EmptyState`. The rendered
//     `^pp(2)?-` class-token multiset is preserved exactly (`pp-idle` and
//     `pp-idle__icon` both render identically); the only structural change
//     is an unclassed `<span>` wrapper around the message body, which is
//     not asserted on by any Pp_Class_Selector in the Playwright_Suite.
//   • The bespoke `pp-status-banner` / `pp-meta-cell` / `pp-reinforcement`
//     / `pp-hint` blocks below are NOT structurally equivalent to any
//     UI primitive — they would not preserve the class-token multiset
//     under substitution — so no further substitution is applied.

import type { AttemptData, SubmissionResult, VisibleTC } from '../../types';
import { fmtBytes, statusClass, statusIcon } from '../lib/format';
import { generateAdaptiveHint, generateReinforcement } from '../lib/hints';
import EmptyState from '../../ui/EmptyState';
import IntelligencePanel from '../Intelligence/IntelligencePanel';
import SmartErrorBox from '../StatusBanner/SmartErrorBox';
import TestCaseCard from '../TestCases/TestCaseCard';

export default function RunResults({ cases, submission, attemptData }: {
  cases: VisibleTC[]; submission: SubmissionResult | null; attemptData: AttemptData | null;
}) {
  const failIdx = submission && !submission.passed && submission.failed_test_case && !submission.failed_test_case.is_hidden
    ? submission.failed_test_case.test_index : -1;

  const clientHint = submission ? generateAdaptiveHint(submission, attemptData) : null;
  // Phase 6: prefer server-side contextual hint
  const serverHint = submission?.contextual_hint;
  const hint = serverHint ? `💡 ${serverHint.message}` : clientHint;
  const reinforcement = submission ? generateReinforcement(submission, attemptData) : null;

  return (
    <div data-testid="run-results">
      {submission && (
        <>
          <div className={`pp-status-banner ${statusClass(submission.status)}`}>
            <div className="pp-status-banner__icon">{statusIcon(submission.status)}</div>
            <div>
              <div className="pp-status-banner__title">{submission.status}</div>
              <div className="pp-status-banner__sub">{submission.pass_count} / {submission.total_cases} passed</div>
            </div>
            <div className="pp-status-banner__meta">
              <div className="pp-meta-cell"><div className="pp-meta-cell__label">Runtime</div><div className="pp-meta-cell__value">{submission.runtime_ms} ms</div></div>
              <div className="pp-meta-cell"><div className="pp-meta-cell__label">Memory</div><div className="pp-meta-cell__value">{fmtBytes(submission.memory_bytes)}</div></div>
            </div>
          </div>

          {reinforcement && <div className="pp-reinforcement">{reinforcement}</div>}

          {!submission.passed && (submission.status.toLowerCase().includes('runtime') || submission.status.toLowerCase().includes('time') || submission.status.toLowerCase().includes('compilation')) && (
            <SmartErrorBox submission={submission} />
          )}

          {hint && <div className="pp-hint">{hint}</div>}

          <IntelligencePanel attemptData={attemptData} />
        </>
      )}

      {cases.length === 0 ? (
        <EmptyState icon="📋" message="No visible test cases." />
      ) : (
        cases.map((tc, i) => (
          <TestCaseCard key={tc.id} index={i} tc={tc} submission={submission}
            isFirstFail={i === failIdx} defaultOpen={!submission ? i === 0 : i === failIdx} />
        ))
      )}
    </div>
  );
}
