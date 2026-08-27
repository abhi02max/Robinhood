// Next Action Panel — extracted verbatim from RightPane.tsx
// (Task 5.4, Requirements 2.1, 2.4, 2.5).
//
// DOM structure, element nesting, attribute set, inline styles, and the
// full multiset of `^pp(2)?-` (and `pp-difficulty--*`) class tokens are
// preserved byte-for-byte against the Spec_Baseline so the class-token
// multiset snapshot test (Task 5.8) continues to pass.
//
// `diffClass` is sourced from the shared format lib (Requirement 2.2)
// rather than redefined locally so the difficulty-pill class tokens stay
// identical.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-next-action__*` class hierarchy plus the canonical
// `pp-difficulty` / `pp-difficulty--<level>` and `pp-intel__badge` classes
// already defined elsewhere. None of these are structurally equivalent to
// `Badge`, `CollapsibleSection`, `EmptyState`, `SectionHeader`, or
// `StatGrid` — in particular, the `pp-difficulty` pill would lose its
// `pp-difficulty` token if rewritten as `<Badge>` (which emits
// `pp-badge` / `pp-badge--<variant>`), violating the class-token multiset
// preservation contract. No UI primitive substitution is applied here.

import type { RecommendationData } from '../../types';
import { diffClass } from '../lib/format';

export default function NextActionPanel({ recommendation }: { recommendation: RecommendationData | null }) {
  if (!recommendation?.recommendation) return null;
  const rec = recommendation.recommendation;
  const cp = recommendation.current_pattern;

  return (
    <div className="pp-next-action" data-testid="next-action-panel">
      <div className="pp-next-action__header">
        <span className="pp-next-action__icon">🎯</span>
        <span className="pp-next-action__title">Next Recommended Problem</span>
      </div>

      {cp && (
        <div className="pp-next-action__mastery">
          <span className="pp-next-action__pattern">{cp.name}</span>
          <span className={`pp-next-action__level pp-next-action__level--${cp.mastery}`}>{cp.mastery}</span>
          <span className="pp-next-action__score">{Math.round(cp.score * 100)}%</span>
        </div>
      )}

      <div className="pp-next-action__card">
        <div className="pp-next-action__problem">
          <span className="pp-next-action__problem-title">{rec.title}</span>
          <span className={`pp-difficulty ${diffClass(rec.difficulty)}`} style={{ fontSize: 9, padding: '2px 6px' }}>{rec.difficulty}</span>
        </div>
        <div className="pp-next-action__reason">{rec.reason}</div>
        <div className="pp-next-action__meta">
          <span className="pp-intel__badge">{rec.pattern_name}</span>
        </div>
        <a href={`/problem/${rec.slug}`} className="pp-next-action__btn">→ Start Next Problem</a>
      </div>

      {recommendation.alternatives.length > 0 && (
        <div className="pp-next-action__alts">
          <div className="pp-next-action__alts-title">Or try:</div>
          {recommendation.alternatives.map((alt) => (
            <a key={alt.id} href={`/problem/${alt.slug}`} className="pp-next-action__alt">
              <span>{alt.title}</span>
              <span className={`pp-difficulty ${diffClass(alt.difficulty)}`} style={{ fontSize: 8, padding: '1px 5px' }}>{alt.difficulty}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
