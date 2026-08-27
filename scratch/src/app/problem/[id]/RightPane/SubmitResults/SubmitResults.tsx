// Submit Results panel extracted verbatim from RightPane.tsx (SubmitResultsView).
//
// Renders the result of a "Submit" grading run:
//   * idle empty-state when no submission has been issued yet
//   * status banner (with ✓/✗ prefix on title) with runtime / memory
//   * optional reinforcement banner on success
//   * "Hidden tests included in grading" pill
//   * optional `SmartErrorBox` on runtime / TLE / compilation failures
//   * optional adaptive (or server-provided contextual) hint
//   * `IntelligencePanel` summary
//   * detailed first-failing-test card with input / expected / actual,
//     using `DiffViewer` when both expected and actual are available and
//     differ, or the legacy three-row layout otherwise
//   * `NextActionPanel` recommendation block
//
// The DOM structure (class names, element nesting, conditional render order)
// is byte-equal to the Spec_Baseline inline implementation so that the
// `^pp(2)?-` class-token multiset on the rendered tree stays identical
// (Requirement 2.4) and any Playwright assertion targeting `.pp-status-banner`
// / `.pp-hidden-pill` / `.pp-error-box` keeps matching the same DOM elements
// (Requirement 2.5).
//
// All sub-components and pure helpers are imported from their canonical
// RightPane paths — no logic is duplicated here.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6):
//   • The pre-submit empty-state div uses the canonical `pp-idle` /
//     `pp-idle__icon` class tokens, so it is replaced with the
//     `EmptyState` primitive from `../../ui/EmptyState`. The rendered
//     `^pp(2)?-` class-token multiset is preserved exactly (`pp-idle`
//     and `pp-idle__icon` both render identically); the only structural
//     change is that the message text — including the `<strong>Submit</strong>`
//     emphasis — is passed through `EmptyState`'s `message` prop and
//     rendered via `dangerouslySetInnerHTML` inside an unclassed
//     `<span>` wrapper, which is not asserted on by any Pp_Class_Selector
//     in the Playwright_Suite.
//   • The bespoke `pp-status-banner` / `pp-meta-cell` / `pp-hidden-pill` /
//     `pp-error-box` / `pp-kv` blocks below are NOT structurally equivalent
//     to any UI primitive — they would not preserve the class-token
//     multiset under substitution — so no further substitution is applied.

import type { AttemptData, RecommendationData, SubmissionResult } from '../../types';
import DiffViewer from '../Diff/DiffViewer';
import { fmtBytes, fmtJson, statusClass, statusIcon } from '../lib/format';
import { generateAdaptiveHint, generateReinforcement } from '../lib/hints';
import EmptyState from '../../ui/EmptyState';
import IntelligencePanel from '../Intelligence/IntelligencePanel';
import NextActionPanel from '../NextAction/NextActionPanel';
import SmartErrorBox from '../StatusBanner/SmartErrorBox';

export default function SubmitResults({ submission, attemptData, recommendation }: {
  submission: SubmissionResult | null; attemptData: AttemptData | null;
  recommendation: RecommendationData | null;
}) {
  if (!submission) return (
    <EmptyState icon="🚀" message="Press <strong>Submit</strong> to grade against all test cases." />
  );

  const failed = submission.failed_test_case;
  const clientHint = generateAdaptiveHint(submission, attemptData);
  // Phase 6: prefer server-side contextual hint
  const serverHint = submission.contextual_hint;
  const hint = serverHint ? `💡 ${serverHint.message}` : clientHint;
  const reinforcement = generateReinforcement(submission, attemptData);

  const expectedStr = failed && !failed.is_hidden ? fmtJson(failed.expected) : '';
  const actualStr = failed && !failed.is_hidden ? fmtJson(failed.actual) : '';
  const showDiff = !submission.passed && failed && !failed.is_hidden && expectedStr !== actualStr && actualStr.length > 0;

  return (
    <div data-testid="submit-results">
      <div className={`pp-status-banner ${statusClass(submission.status)}`}>
        <div className="pp-status-banner__icon">{statusIcon(submission.status)}</div>
        <div>
          <div className="pp-status-banner__title">{submission.passed ? '✓ Accepted' : `✗ ${submission.status}`}</div>
          <div className="pp-status-banner__sub">{submission.pass_count} / {submission.total_cases} test cases passed</div>
        </div>
        <div className="pp-status-banner__meta">
          <div className="pp-meta-cell"><div className="pp-meta-cell__label">Runtime</div><div className="pp-meta-cell__value">{submission.runtime_ms} ms</div></div>
          <div className="pp-meta-cell"><div className="pp-meta-cell__label">Memory</div><div className="pp-meta-cell__value">{fmtBytes(submission.memory_bytes)}</div></div>
        </div>
      </div>

      {reinforcement && <div className="pp-reinforcement">{reinforcement}</div>}

      <div className="pp-hidden-pill">🔒 Hidden tests included in grading</div>

      {!submission.passed && (submission.status.toLowerCase().includes('runtime') || submission.status.toLowerCase().includes('time') || submission.status.toLowerCase().includes('compilation')) && (
        <SmartErrorBox submission={submission} />
      )}

      {hint && <div className="pp-hint">{hint}</div>}

      <IntelligencePanel attemptData={attemptData} />

      {!submission.passed && failed && (
        <div className="pp-error-box" style={{ marginTop: 10 }}>
          <div className="pp-error-box__title">{failed.message || 'First Failing Test'}</div>
          {failed.is_hidden ? (
            <div className="pp-error-box__msg">Input/output hidden for this test case.</div>
          ) : showDiff ? (
            <div style={{ marginTop: 8 }}>
              <div className="pp-kv" style={{ marginBottom: 6 }}><div className="pp-kv__label">Input</div><div className="pp-kv__value">{fmtJson(failed.input)}</div></div>
              <DiffViewer expected={expectedStr} actual={actualStr} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <div className="pp-kv"><div className="pp-kv__label">Input</div><div className="pp-kv__value">{fmtJson(failed.input)}</div></div>
              <div className="pp-kv pp-kv--good"><div className="pp-kv__label">Expected</div><div className="pp-kv__value">{expectedStr}</div></div>
              <div className="pp-kv pp-kv--bad"><div className="pp-kv__label">Your Output</div><div className="pp-kv__value">{actualStr}</div></div>
            </div>
          )}
        </div>
      )}

      <NextActionPanel recommendation={recommendation} />
    </div>
  );
}
