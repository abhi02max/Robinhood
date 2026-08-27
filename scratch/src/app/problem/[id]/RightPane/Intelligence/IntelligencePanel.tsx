// Submission Intelligence Panel — extracted verbatim from RightPane.tsx
// (Task 5.4, Requirements 2.1, 2.4, 2.5).
//
// DOM structure, element nesting, attribute set, and the full multiset of
// `^pp(2)?-` class tokens are preserved byte-for-byte against the
// Spec_Baseline so the class-token multiset snapshot test (Task 5.8)
// continues to pass.
//
// Allowed imports for this task: React, types, format helpers, UI primitives.
// This panel needs only React + AttemptData; no format helper / UI primitive
// is structurally equivalent to the inline `<div>` shapes used here, so
// none are introduced (UI-primitive adoption is the contract of Task 5.6).

import type { AttemptData } from '../../types';

export default function IntelligencePanel({ attemptData }: {
  attemptData: AttemptData | null;
}) {
  if (!attemptData || attemptData.total === 0) return null;

  const attempts = attemptData.attempts;
  const latest = attempts[0];
  const previous = attempts.length > 1 ? attempts[1] : null;
  const pattern = attemptData.pattern_name;
  const topic = attemptData.topic_name;

  // Compute time between first and last attempt
  let timeTaken = '';
  if (attempts.length > 1) {
    const firstTime = new Date(attempts[attempts.length - 1].created_at).getTime();
    const lastTime = new Date(attempts[0].created_at).getTime();
    const diffMins = Math.round((lastTime - firstTime) / 60000);
    if (diffMins < 1) timeTaken = '<1 min';
    else if (diffMins < 60) timeTaken = `${diffMins} min`;
    else timeTaken = `${Math.round(diffMins / 60)}h ${diffMins % 60}m`;
  }

  const statusTransition = previous
    ? `${previous.status} → ${latest.status}`
    : latest.status;

  return (
    <div className="pp-intel" data-testid="intelligence-panel">
      <div className="pp-intel__title">📊 Submission Intelligence</div>
      <div className="pp-intel__grid">
        <div className="pp-intel__cell">
          <div className="pp-intel__label">Attempts</div>
          <div className="pp-intel__value">{attemptData.total}</div>
        </div>
        <div className="pp-intel__cell">
          <div className="pp-intel__label">Status</div>
          <div className="pp-intel__value pp-intel__value--status">{statusTransition}</div>
        </div>
        {timeTaken && (
          <div className="pp-intel__cell">
            <div className="pp-intel__label">Time Spent</div>
            <div className="pp-intel__value">{timeTaken}</div>
          </div>
        )}
        {pattern && (
          <div className="pp-intel__cell">
            <div className="pp-intel__label">Pattern</div>
            <div className="pp-intel__value"><span className="pp-intel__badge">{pattern}</span></div>
          </div>
        )}
      </div>
      {topic && <div className="pp-intel__topic">Topic: {topic}</div>}
    </div>
  );
}
