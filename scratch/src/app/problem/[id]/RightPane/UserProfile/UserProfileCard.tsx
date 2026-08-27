// User Profile Card — extracted verbatim from RightPane.tsx (Phase 6).
//
// DOM structure, class-token set, attribute set, and element nesting MUST stay
// identical to the Spec_Baseline so the post-Sprint-2 RightPane preserves the
// `^pp(2)?-` class-token multiset (Requirement 2.4) and every Pp_Class_Selector
// asserted by the Playwright_Suite (Requirement 2.5).
//
// Allowed imports for this module: React, types from '../../types',
// format helpers from '../lib/format' as needed, and UI primitives from
// '../../ui/' only where the Spec_Baseline used a structurally equivalent
// inline element (Requirement 2.6). The user-profile card uses bespoke
// `pp-profile__*` class hierarchy that is NOT structurally equivalent to
// `Badge`, `StatGrid`, `SectionHeader`, or `EmptyState`, so no UI primitive
// substitution is applied here.

import type { UserProfile } from '../../types';

export default function UserProfileCard({ profile }: { profile: UserProfile | null }) {
  if (!profile) return null;
  if (profile.total_submissions === 0) return null;

  const errorEntries = Object.entries(profile.error_patterns || {});

  return (
    <div className="pp-profile" data-testid="user-profile-card">
      <div className="pp-profile__header">
        <span className="pp-profile__icon">🧠</span>
        <span className="pp-profile__title">Your Learning Profile</span>
      </div>

      <div className="pp-profile__stats">
        <div className="pp-profile__stat">
          <div className="pp-profile__stat-value">{profile.total_problems_solved}</div>
          <div className="pp-profile__stat-label">Solved</div>
        </div>
        <div className="pp-profile__stat">
          <div className="pp-profile__stat-value">{profile.total_submissions}</div>
          <div className="pp-profile__stat-label">Submissions</div>
        </div>
        <div className="pp-profile__stat">
          <div className="pp-profile__stat-value">{profile.streak_current}🔥</div>
          <div className="pp-profile__stat-label">Streak</div>
        </div>
        <div className="pp-profile__stat">
          <div className="pp-profile__stat-value">{profile.active_days}d</div>
          <div className="pp-profile__stat-label">Active</div>
        </div>
      </div>

      <div className="pp-profile__row">
        <span className="pp-profile__row-label">Speed</span>
        <span className={`pp-profile__pill pp-profile__pill--${profile.learning_speed}`}>{profile.learning_speed}</span>
        <span className="pp-profile__row-label" style={{ marginLeft: 'auto' }}>Consistency</span>
        <span className={`pp-profile__pill pp-profile__pill--${profile.consistency}`}>{profile.consistency}</span>
      </div>

      {profile.strengths.length > 0 && (
        <div className="pp-profile__section">
          <div className="pp-profile__section-label">💪 Strengths</div>
          <div className="pp-profile__tags">
            {profile.strengths.map((s) => <span key={s} className="pp-profile__tag pp-profile__tag--strong">{s}</span>)}
          </div>
        </div>
      )}

      {profile.weaknesses.length > 0 && (
        <div className="pp-profile__section">
          <div className="pp-profile__section-label">🎯 Focus Areas</div>
          <div className="pp-profile__tags">
            {profile.weaknesses.map((w) => <span key={w} className="pp-profile__tag pp-profile__tag--weak">{w}</span>)}
          </div>
        </div>
      )}

      {profile.error_tendency && (
        <div className="pp-profile__section">
          <div className="pp-profile__section-label">⚠️ Common Error</div>
          <span className="pp-profile__tag pp-profile__tag--error">{profile.error_tendency}</span>
        </div>
      )}

      {errorEntries.length > 0 && (
        <div className="pp-profile__section">
          <div className="pp-profile__section-label">Error Breakdown</div>
          <div className="pp-profile__errors">
            {errorEntries.slice(0, 4).map(([key, val]) => (
              <div key={key} className="pp-profile__error-row">
                <span>{val.icon} {val.label}</span>
                <span className="pp-profile__error-count">{val.count}× ({Math.round(val.frequency * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
