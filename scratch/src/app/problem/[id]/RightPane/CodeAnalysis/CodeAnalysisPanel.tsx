// Code Analysis Panel — extracted verbatim from RightPane.tsx (Phase 7).
//
// DOM structure, class-token set, attribute set, and element nesting MUST stay
// identical to the Spec_Baseline so the post-Sprint-2 RightPane preserves the
// `^pp(2)?-` class-token multiset (Requirement 2.4) and every Pp_Class_Selector
// asserted by the Playwright_Suite (Requirement 2.5).
//
// Allowed imports for this module: React, types from '../../types',
// format helpers from '../lib/format' as needed, and UI primitives from
// '../../ui/' only where the Spec_Baseline used a structurally equivalent
// inline element (Requirement 2.6). The code-analysis panel uses bespoke
// `pp-code-analysis__*` class hierarchy that is NOT structurally equivalent
// to `Badge`, `StatGrid`, `SectionHeader`, or `EmptyState`, so no UI primitive
// substitution is applied here.

import type { SubmissionResult } from '../../types';

export default function CodeAnalysisPanel({ submission }: { submission: SubmissionResult | null }) {
  const ca = submission?.code_analysis;
  if (!ca) return null;

  const feedbackItems = ca.feedback || [];
  const failures = ca.reasoning_failures || [];
  if (feedbackItems.length === 0 && failures.length === 0 && !ca.time_comparison) return null;

  const sevIcon = (s: string) => s === 'critical' ? '🚨' : s === 'warning' ? '⚠️' : s === 'success' ? '✅' : '💡';
  const matchLabel = ca.time_comparison?.match === 'optimal' ? '✅ Optimal' : ca.time_comparison?.match === 'suboptimal' ? '⚠️ Suboptimal' : ca.time_comparison?.match === 'better' ? '🌟 Better' : null;

  return (
    <div className="pp-code-analysis" data-testid="code-analysis-panel">
      <div className="pp-code-analysis__header">
        <span className="pp-code-analysis__icon">🔬</span>
        <span className="pp-code-analysis__title">Code Intelligence</span>
      </div>

      {ca.time_comparison && ca.time_comparison.estimated && (
        <div className="pp-code-analysis__complexity">
          <div className="pp-code-analysis__complexity-row">
            <span className="pp-code-analysis__complexity-label">Your complexity</span>
            <span className="pp-code-analysis__complexity-value">{ca.complexity.time}</span>
          </div>
          {ca.time_comparison.expected && (
            <div className="pp-code-analysis__complexity-row">
              <span className="pp-code-analysis__complexity-label">Expected</span>
              <span className="pp-code-analysis__complexity-value">{ca.time_comparison.expected}</span>
            </div>
          )}
          {matchLabel && <div className={`pp-code-analysis__match pp-code-analysis__match--${ca.time_comparison.match}`}>{matchLabel}</div>}
        </div>
      )}

      {ca.patterns && (
        <div className="pp-code-analysis__patterns">
          {ca.patterns.has_nested_loops && <span className="pp-code-analysis__badge pp-code-analysis__badge--warn">🔄 Nested Loops</span>}
          {ca.patterns.has_recursion && <span className={`pp-code-analysis__badge ${ca.patterns.has_memoization ? 'pp-code-analysis__badge--ok' : 'pp-code-analysis__badge--warn'}`}>🔁 Recursion{ca.patterns.has_memoization ? ' + Memo' : ''}</span>}
          {ca.patterns.has_hash_map && <span className="pp-code-analysis__badge pp-code-analysis__badge--ok">#️⃣ Hash Map</span>}
          {ca.patterns.has_sorting && <span className="pp-code-analysis__badge">📊 Sorting</span>}
          {ca.patterns.has_visited_set && <span className="pp-code-analysis__badge pp-code-analysis__badge--ok">👁 Visited Set</span>}
        </div>
      )}

      {feedbackItems.length > 0 && (
        <div className="pp-code-analysis__feedback">
          {feedbackItems.map((fb, i) => (
            <div key={i} className={`pp-code-analysis__feedback-item pp-code-analysis__feedback-item--${fb.severity}`}>
              <span>{sevIcon(fb.severity)}</span>
              <span>{fb.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
