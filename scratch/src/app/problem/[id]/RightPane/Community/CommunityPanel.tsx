// Community Insights Panel — extracted verbatim from RightPane.tsx (Phase 8).
//
// DOM structure, class-token set, attribute set, and element nesting MUST stay
// identical to the Spec_Baseline so the post-Sprint-2 RightPane preserves the
// `^pp(2)?-` class-token multiset (Requirement 2.4) and every Pp_Class_Selector
// asserted by the Playwright_Suite (Requirement 2.5).
//
// Allowed imports for this module: React, types from '../../types',
// format helpers from '../lib/format' as needed, and UI primitives from
// '../../ui/' only where the Spec_Baseline used a structurally equivalent
// inline element (Requirement 2.6). The community panel uses bespoke
// `pp-community__*` class hierarchy that is NOT structurally equivalent to
// `Badge`, `StatGrid`, `SectionHeader`, or `EmptyState`, so no UI primitive
// substitution is applied here.

import type { CommunityInsights } from '../../types';

export default function CommunityPanel({ community }: { community: CommunityInsights | null }) {
  if (!community || community.total_submissions === 0) return null;
  const fb = community.failure_breakdown;

  return (
    <div className="pp-community" data-testid="community-panel">
      <div className="pp-community__header">
        <span className="pp-community__icon">🌐</span>
        <span className="pp-community__title">Community Insights</span>
      </div>
      <div className="pp-community__stats">
        <div className="pp-community__stat">
          <div className="pp-community__stat-value">{community.solve_rate}%</div>
          <div className="pp-community__stat-label">Solve Rate</div>
        </div>
        <div className="pp-community__stat">
          <div className="pp-community__stat-value">{community.avg_attempts}</div>
          <div className="pp-community__stat-label">Avg Attempts</div>
        </div>
        <div className="pp-community__stat">
          <div className="pp-community__stat-value">{community.solved_users}/{community.total_users}</div>
          <div className="pp-community__stat-label">Users Solved</div>
        </div>
        <div className="pp-community__stat">
          <div className="pp-community__stat-value">{community.avg_runtime_ms}ms</div>
          <div className="pp-community__stat-label">Avg Runtime</div>
        </div>
      </div>
      {(fb.wrong_answer > 0 || fb.tle > 0 || fb.runtime_error > 0) && (
        <div className="pp-community__failures">
          <div className="pp-community__fail-label">Common Failures</div>
          {fb.wrong_answer > 0 && (
            <div className="pp-community__bar-row">
              <span className="pp-community__bar-name">✗ Wrong Answer</span>
              <div className="pp-community__bar-track"><div className="pp-community__bar-fill pp-community__bar-fill--wa" style={{ width: `${fb.wrong_answer}%` }} /><span className="pp-community__bar-pct">{fb.wrong_answer}%</span></div>
            </div>
          )}
          {fb.tle > 0 && (
            <div className="pp-community__bar-row">
              <span className="pp-community__bar-name">⏱ TLE</span>
              <div className="pp-community__bar-track"><div className="pp-community__bar-fill pp-community__bar-fill--tle" style={{ width: `${fb.tle}%` }} /><span className="pp-community__bar-pct">{fb.tle}%</span></div>
            </div>
          )}
          {fb.runtime_error > 0 && (
            <div className="pp-community__bar-row">
              <span className="pp-community__bar-name">💥 Runtime</span>
              <div className="pp-community__bar-track"><div className="pp-community__bar-fill pp-community__bar-fill--re" style={{ width: `${fb.runtime_error}%` }} /><span className="pp-community__bar-pct">{fb.runtime_error}%</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
