'use client';

/**
 * DifficultyMix — three small pills showing the Easy / Medium / Hard
 * counts for a given pattern. Pills with a count of 0 render dimmed so
 * the visual width stays consistent across cards.
 */

import type { DifficultyCounts } from '../lib/types';

interface Props {
  counts: DifficultyCounts;
  className?: string;
}

export default function DifficultyMix({ counts, className }: Props) {
  return (
    <div className={`pp2-mix ${className ?? ''}`} aria-label="Difficulty mix">
      <Pill kind="easy"   label="E" value={counts.Easy} />
      <Pill kind="medium" label="M" value={counts.Medium} />
      <Pill kind="hard"   label="H" value={counts.Hard} />
    </div>
  );
}

function Pill({
  kind,
  label,
  value,
}: {
  kind: 'easy' | 'medium' | 'hard';
  label: string;
  value: number;
}) {
  const muted = value === 0;
  return (
    <span
      className={`pp2-mix__pill pp2-mix__pill--${kind} ${muted ? 'is-muted' : ''}`}
      title={`${label === 'E' ? 'Easy' : label === 'M' ? 'Medium' : 'Hard'}: ${value}`}
    >
      <span className="pp2-mix__dot" />
      <span className="pp2-mix__label">{label}</span>
      <span className="pp2-mix__count">{value}</span>
    </span>
  );
}
