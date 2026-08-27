'use client';

/**
 * PatternSection — collapsible card for a single pattern within the
 * active topic.
 *
 * Header: pattern name, problem-count chip, progress (X/Y), difficulty
 * mix pills, "Start" button, chevron.
 *
 * Body (only when expanded): list of ProblemRows, sorted Easy → Medium
 * → Hard. Problems are lazy-loaded the first time the section opens.
 */

import { ChevronDown, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DifficultyMix from './DifficultyMix';
import ProblemRow from './ProblemRow';
import type {
  DifficultyCounts,
  Pattern,
  ProblemStatus,
  ProblemSummary,
} from '../lib/types';

interface Props {
  pattern: Pattern;
  expanded: boolean;
  onToggle: (patternId: string) => void;

  problems: ProblemSummary[] | undefined;
  loading: boolean;
  error: string | null;
  onLoad: (patternId: string) => void;
  onRetry: (patternId: string) => void;

  getStatus: (problemId: string) => ProblemStatus;
  onCycleStatus: (problemId: string, next: ProblemStatus) => void;
}

const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 } as const;

export default function PatternSection({
  pattern,
  expanded,
  onToggle,
  problems,
  loading,
  error,
  onLoad,
  onRetry,
  getStatus,
  onCycleStatus,
}: Props) {
  const router = useRouter();
  const triggeredRef = useRef(false);

  // Lazy-load on first expand.
  useEffect(() => {
    if (expanded && !triggeredRef.current && problems === undefined && !loading && !error) {
      triggeredRef.current = true;
      onLoad(pattern.id);
    }
  }, [expanded, problems, loading, error, onLoad, pattern.id]);

  const sortedProblems = useMemo(() => {
    if (!problems) return [];
    return [...problems].sort((a, b) => {
      const da = DIFF_ORDER[a.difficulty] ?? 9;
      const db = DIFF_ORDER[b.difficulty] ?? 9;
      if (da !== db) return da - db;
      return a.title.localeCompare(b.title);
    });
  }, [problems]);

  const stats = useMemo(() => {
    const counts: DifficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
    let solved = 0;
    let attempted = 0;
    if (problems) {
      for (const p of problems) {
        counts[p.difficulty] = (counts[p.difficulty] ?? 0) + 1;
        const s = getStatus(p.id);
        if (s === 'solved') solved += 1;
        else if (s === 'attempted') attempted += 1;
      }
    }
    return { counts, solved, attempted, total: problems?.length ?? pattern.problem_count };
  }, [problems, getStatus, pattern.problem_count]);

  const progressPct =
    stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pick the first unsolved problem we know about; fall back to the
    // first overall once problems have loaded.
    const target =
      sortedProblems.find((p) => getStatus(p.id) !== 'solved') ?? sortedProblems[0];
    if (target) {
      router.push(`/problem/${target.slug || target.id}`);
    } else {
      // Problems not loaded yet — open the section so user can pick.
      if (!expanded) onToggle(pattern.id);
    }
  };

  return (
    <section className={`pp2-pattern ${expanded ? 'is-open' : ''}`}>
      <button
        type="button"
        className="pp2-pattern__header"
        aria-expanded={expanded}
        onClick={() => onToggle(pattern.id)}
      >
        <ChevronDown
          size={16}
          className="pp2-pattern__chevron"
          aria-hidden
        />

        <div className="pp2-pattern__title-block">
          <h3 className="pp2-pattern__title">{pattern.name}</h3>
          {pattern.explanation && (
            <p className="pp2-pattern__sub">{pattern.explanation}</p>
          )}
        </div>

        <div className="pp2-pattern__progress">
          <span className="pp2-pattern__progress-text">
            {stats.solved}<span className="pp2-pattern__progress-total"> / {stats.total}</span>
          </span>
          <div className="pp2-pattern__progress-bar" aria-hidden>
            <div
              className="pp2-pattern__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <DifficultyMix counts={stats.counts} className="pp2-pattern__mix" />

        <span
          role="button"
          className="pp2-pattern__start"
          onClick={handleStart}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleStart(e as unknown as React.MouseEvent);
            }
          }}
          tabIndex={0}
          title="Open the next unsolved problem"
        >
          <Play size={12} />
          Start
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="pp2-pattern__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {loading && (
              <div className="pp2-pattern__state">
                <Loader2 size={14} className="pp2-spin" />
                Loading problems…
              </div>
            )}

            {error && !loading && (
              <div className="pp2-pattern__state pp2-pattern__state--error">
                {error}
                <button
                  type="button"
                  className="pp2-link"
                  onClick={() => onRetry(pattern.id)}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && sortedProblems.length === 0 && problems !== undefined && (
              <div className="pp2-pattern__state">No problems in this pattern yet.</div>
            )}

            {!loading && !error && sortedProblems.length > 0 && (
              <div className="pp2-pattern__rows">
                {sortedProblems.map((p, i) => (
                  <ProblemRow
                    key={p.id}
                    index={i}
                    problem={p}
                    status={getStatus(p.id)}
                    onCycleStatus={onCycleStatus}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
