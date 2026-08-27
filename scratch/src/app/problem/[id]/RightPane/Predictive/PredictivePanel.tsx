// Predictive Intelligence Panel — extracted verbatim from RightPane.tsx
// (Task 5.4, Requirements 2.1, 2.4, 2.5).
//
// DOM structure, element nesting, attribute set, inline styles, and the
// full multiset of `^pp(2)?-` class tokens are preserved byte-for-byte
// against the Spec_Baseline so the class-token multiset snapshot test
// (Task 5.8) continues to pass.
//
// `React` is imported as a type-only namespace for the inline-style cast
// `React.CSSProperties`, mirroring the original RightPane.tsx usage.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-predict__*` class hierarchy (`__header`, `__icon`, `__title`,
// `__health`, `__health-ring`, `__probs`, `__velocity`, `__risks`,
// `__interventions`, etc.) that is NOT structurally equivalent to `Badge`,
// `CollapsibleSection`, `EmptyState`, `SectionHeader`, or `StatGrid`.
// Substituting any of those primitives would replace `pp-predict__*` tokens
// with primitive tokens (`pp-section-header__*`, `pp-stat-grid__*`, …) and
// break the class-token multiset preservation contract, so no UI primitive
// substitution is applied here.

import type React from 'react';
import type { PredictiveData } from '../../types';

export default function PredictivePanel({ predictions }: { predictions: PredictiveData | null }) {
  if (!predictions) return null;
  const { readiness, velocity, risk_alerts, interventions, health_score } = predictions;

  const readinessColor = readiness.readiness_level === 'strong' ? 'var(--success)' : readiness.readiness_level === 'ready' ? 'var(--info)' : readiness.readiness_level === 'developing' ? 'var(--warning)' : 'var(--text-4)';
  const healthColor = health_score >= 70 ? 'var(--success)' : health_score >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="pp-predict" data-testid="predictive-panel">
      <div className="pp-predict__header">
        <span className="pp-predict__icon">🔮</span>
        <span className="pp-predict__title">Predictive Intelligence</span>
      </div>

      <div className="pp-predict__health">
        <div className="pp-predict__health-ring" style={{ '--health': health_score, '--health-color': healthColor } as React.CSSProperties}>
          <span className="pp-predict__health-value">{health_score}</span>
        </div>
        <div className="pp-predict__health-meta">
          <div className="pp-predict__health-label">Health Score</div>
          <div className="pp-predict__readiness" style={{ color: readinessColor }}>
            {readiness.readiness_level === 'strong' ? '🚀 Interview Ready' : readiness.readiness_level === 'ready' ? '✅ Nearly Ready' : readiness.readiness_level === 'developing' ? '📈 Developing' : '🌱 Getting Started'}
          </div>
        </div>
      </div>

      <div className="pp-predict__probs">
        <div className="pp-predict__prob">
          <span className="pp-predict__prob-label">P(Medium)</span>
          <div className="pp-predict__prob-bar"><div className="pp-predict__prob-fill pp-predict__prob-fill--med" style={{ width: `${Math.round(readiness.medium_probability * 100)}%` }} /></div>
          <span className="pp-predict__prob-val">{Math.round(readiness.medium_probability * 100)}%</span>
        </div>
        <div className="pp-predict__prob">
          <span className="pp-predict__prob-label">P(Hard)</span>
          <div className="pp-predict__prob-bar"><div className="pp-predict__prob-fill pp-predict__prob-fill--hard" style={{ width: `${Math.round(readiness.hard_probability * 100)}%` }} /></div>
          <span className="pp-predict__prob-val">{Math.round(readiness.hard_probability * 100)}%</span>
        </div>
      </div>

      <div className="pp-predict__velocity">
        <div className="pp-predict__vel-stat">
          <span className="pp-predict__vel-value">{velocity.problems_per_week}</span>
          <span className="pp-predict__vel-label">prob/week</span>
        </div>
        <div className="pp-predict__vel-stat">
          <span className="pp-predict__vel-value">{velocity.solve_rate_recent}%</span>
          <span className="pp-predict__vel-label">recent solve</span>
        </div>
        <div className="pp-predict__vel-stat">
          <span className={`pp-predict__vel-trend pp-predict__vel-trend--${velocity.improvement_trend}`}>
            {velocity.improvement_trend === 'accelerating' ? '⬆ Accelerating' : velocity.improvement_trend === 'decelerating' ? '⬇ Decelerating' : '➔ Steady'}
          </span>
          <span className="pp-predict__vel-label">trend</span>
        </div>
      </div>

      {risk_alerts.length > 0 && (
        <div className="pp-predict__risks">
          {risk_alerts.map((r, i) => (
            <div key={i} className={`pp-predict__risk pp-predict__risk--${r.type}`}>
              <span className="pp-predict__risk-type">⚠ {r.type.replace(/_/g, ' ')}</span>
              <span className="pp-predict__risk-signal">{r.signal}</span>
            </div>
          ))}
        </div>
      )}

      {interventions.length > 0 && (
        <div className="pp-predict__interventions">
          {interventions.slice(0, 2).map((iv, i) => (
            <div key={i} className={`pp-predict__intervention pp-predict__intervention--${iv.priority}`}>
              <span>{iv.icon}</span>
              <div>
                <div className="pp-predict__iv-msg">{iv.message}</div>
                <div className="pp-predict__iv-action">{iv.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
