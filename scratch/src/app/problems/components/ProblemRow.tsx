'use client';

/**
 * ProblemRow — single row inside an expanded pattern.
 *
 * Renders:
 *   - status dot (solved / attempted / unsolved) — clickable to cycle
 *   - title (links to /problem/<slug>)
 *   - difficulty badge
 *   - up to 3 tags (rest collapsed to "+N")
 *   - external open icon
 */

import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import type { Difficulty, ProblemStatus, ProblemSummary } from '../lib/types';

interface Props {
  index: number;
  problem: ProblemSummary;
  status: ProblemStatus;
  onCycleStatus: (id: string, next: ProblemStatus) => void;
}

const STATUS_CYCLE: ProblemStatus[] = [null, 'attempted', 'solved'];

function nextStatus(current: ProblemStatus): ProblemStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export default function ProblemRow({ index, problem, status, onCycleStatus }: Props) {
  const router = useRouter();

  const open = () => {
    router.push(`/problem/${problem.slug || problem.id}`);
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  const visibleTags = problem.tags.slice(0, 3);
  const overflow   = problem.tags.length - visibleTags.length;

  return (
    <div
      className="pp2-row"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={handleKey}
    >
      <button
        type="button"
        className={`pp2-row__status pp2-row__status--${status ?? 'none'}`}
        title={status ? `Status: ${status}` : 'Mark as attempted/solved'}
        onClick={(e) => {
          e.stopPropagation();
          onCycleStatus(problem.id, nextStatus(status));
        }}
      >
        {status === 'solved' && <Check size={12} strokeWidth={3} />}
        {status === 'attempted' && <span className="pp2-row__status-dot" />}
      </button>

      <span className="pp2-row__index">{String(index + 1).padStart(2, '0')}</span>

      <span className="pp2-row__title">{problem.title}</span>

      <span className={`pp2-badge pp2-badge--${diffSlug(problem.difficulty)}`}>
        {problem.difficulty}
      </span>

      <div className="pp2-row__tags">
        {visibleTags.length === 0 ? (
          <span className="pp2-row__tags-empty">—</span>
        ) : (
          visibleTags.map((t) => (
            <span key={t} className="pp2-tag" title={t}>
              {t}
            </span>
          ))
        )}
        {overflow > 0 && (
          <span className="pp2-tag pp2-tag--more" title={problem.tags.slice(3).join(', ')}>
            <MoreHorizontal size={11} />+{overflow}
          </span>
        )}
      </div>
    </div>
  );
}

function diffSlug(d: Difficulty): 'easy' | 'medium' | 'hard' {
  return d === 'Easy' ? 'easy' : d === 'Medium' ? 'medium' : 'hard';
}
