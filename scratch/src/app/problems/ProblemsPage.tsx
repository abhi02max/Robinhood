'use client';

/**
 * ProblemsPage — Topic → Pattern → Problems learning explorer.
 *
 * Layout
 * ------
 *   ┌──────────────┬───────────────────────────────────────────┐
 *   │   Sidebar    │   Filter bar (search + difficulty chips)  │
 *   │   (sticky)   ├───────────────────────────────────────────┤
 *   │              │                                           │
 *   │              │   PatternSection × N (collapsible)        │
 *   │              │                                           │
 *   └──────────────┴───────────────────────────────────────────┘
 *
 * Data flow
 * ---------
 *   - On mount: GET /api/learning/topics — auto-select the first.
 *   - On topic change: GET /api/learning/patterns/:topicId.
 *   - On pattern expand: lazy GET /api/learning/problems/:patternId.
 *   - Per-problem solved/attempted state lives in localStorage.
 *
 * Filtering
 * ---------
 *   The filter bar narrows the *currently loaded* problems. Patterns
 *   with no matching problems still render (they may have unloaded
 *   children) but their body shows a small empty state when expanded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './problems.css';

import TopicSidebar from './components/TopicSidebar';
import PatternSection from './components/PatternSection';
import {
  fetchTopics,
  fetchPatterns,
  fetchProblemsByPattern,
  ApiError,
} from './lib/api';
import {
  getStatus,
  setStatus,
  subscribe as subscribeProgress,
  getAll as getAllProgress,
} from './lib/progress';
import type {
  Difficulty,
  Pattern,
  ProblemStatus,
  ProblemSummary,
  Topic,
} from './lib/types';

type DifficultyFilter = 'all' | Difficulty;

export default function ProblemsPage() {
  // ------------------------ topics -----------------------------------------
  const [topics, setTopics]               = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError]     = useState<string | null>(null);

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // ------------------------ patterns (for active topic) --------------------
  const [patterns, setPatterns]               = useState<Pattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError]     = useState<string | null>(null);

  // ------------------------ problems (per-pattern, lazy) -------------------
  const [problemsByPattern, setProblemsByPattern] =
    useState<Record<string, ProblemSummary[]>>({});
  const [problemsLoading, setProblemsLoading] =
    useState<Record<string, boolean>>({});
  const [problemsError, setProblemsError] =
    useState<Record<string, string | null>>({});

  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);

  // ------------------------ filters ----------------------------------------
  const [search, setSearch]               = useState('');
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>('all');

  // ------------------------ progress ---------------------------------------
  const [, forceProgressRender] = useState(0);
  useEffect(() => {
    const unsub = subscribeProgress(() => forceProgressRender((n) => n + 1));
    return unsub;
  }, []);

  // ------------------------ topic loader -----------------------------------
  const loadTopics = useCallback(async (signal?: AbortSignal) => {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const list = await fetchTopics(signal);
      setTopics(list);
      setActiveTopicId((current) => current ?? list[0]?.id ?? null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setTopicsError(humanizeError(err));
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadTopics(ctrl.signal);
    return () => ctrl.abort();
  }, [loadTopics]);

  // ------------------------ patterns loader (on topic change) --------------
  useEffect(() => {
    if (!activeTopicId) {
      setPatterns([]);
      return;
    }
    const ctrl = new AbortController();
    setPatternsLoading(true);
    setPatternsError(null);
    setExpandedPatternId(null);

    fetchPatterns(activeTopicId, ctrl.signal)
      .then((list) => {
        setPatterns(list);
        // Auto-expand the first pattern as a UX nudge.
        if (list[0]) setExpandedPatternId(list[0].id);
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return;
        setPatternsError(humanizeError(err));
      })
      .finally(() => setPatternsLoading(false));

    return () => ctrl.abort();
  }, [activeTopicId]);

  // ------------------------ problems loader (lazy per pattern) -------------
  const inflightProblems = useRef<Record<string, AbortController>>({});

  const loadProblems = useCallback((patternId: string) => {
    // Cancel any prior request for this same pattern (e.g. retry after error)
    inflightProblems.current[patternId]?.abort();
    const ctrl = new AbortController();
    inflightProblems.current[patternId] = ctrl;

    setProblemsLoading((s) => ({ ...s, [patternId]: true }));
    setProblemsError((s) => ({ ...s, [patternId]: null }));

    fetchProblemsByPattern(patternId, ctrl.signal)
      .then((list) => {
        setProblemsByPattern((s) => ({ ...s, [patternId]: list }));
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return;
        setProblemsError((s) => ({ ...s, [patternId]: humanizeError(err) }));
      })
      .finally(() => {
        setProblemsLoading((s) => ({ ...s, [patternId]: false }));
        if (inflightProblems.current[patternId] === ctrl) {
          delete inflightProblems.current[patternId];
        }
      });
  }, []);

  // Cancel all inflight problem requests on unmount.
  useEffect(() => {
    return () => {
      Object.values(inflightProblems.current).forEach((c) => c.abort());
      inflightProblems.current = {};
    };
  }, []);

  // ------------------------ handlers ---------------------------------------
  const handleSelectTopic = useCallback((id: string) => {
    setActiveTopicId(id);
  }, []);

  const handleTogglePattern = useCallback((id: string) => {
    setExpandedPatternId((curr) => (curr === id ? null : id));
  }, []);

  const handleCycleStatus = useCallback(
    (problemId: string, next: ProblemStatus) => {
      setStatus(problemId, next);
    },
    []
  );

  const getStatusFor = useCallback(
    (problemId: string): ProblemStatus => getStatus(problemId),
    []
  );

  // ------------------------ derived: filtered problems per pattern ---------
  const filteredProblemsByPattern = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasQ = q.length > 0;
    const hasDiff = difficultyFilter !== 'all';
    if (!hasQ && !hasDiff) return problemsByPattern;

    const out: Record<string, ProblemSummary[]> = {};
    for (const [pid, list] of Object.entries(problemsByPattern)) {
      out[pid] = list.filter((p) => {
        if (hasDiff && p.difficulty !== difficultyFilter) return false;
        if (hasQ) {
          const hay = `${p.title} ${p.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }
    return out;
  }, [problemsByPattern, search, difficultyFilter]);

  // ------------------------ derived: topic-level totals --------------------
  const topicSummary = useMemo(() => {
    const progress = getAllProgress();
    let total = 0;
    let solved = 0;
    for (const list of Object.values(problemsByPattern)) {
      for (const p of list) {
        total += 1;
        if (progress[p.id] === 'solved') solved += 1;
      }
    }
    // Fallback to pattern.problem_count when no problem lists are loaded.
    if (total === 0) {
      total = patterns.reduce((acc, p) => acc + (p.problem_count || 0), 0);
    }
    return { total, solved };
    // re-render when progress changes is handled at parent level
  }, [problemsByPattern, patterns]);

  const activeTopic = useMemo(
    () => topics.find((t) => t.id === activeTopicId) ?? null,
    [topics, activeTopicId]
  );

  // ------------------------ render ----------------------------------------
  return (
    <div className="pp2-root">
      <TopicSidebar
        topics={topics}
        activeTopicId={activeTopicId}
        loading={topicsLoading}
        error={topicsError}
        onSelect={handleSelectTopic}
        onRetry={() => loadTopics()}
      />

      <main className="pp2-main">
        {/* ------------ topic header ------------ */}
        <header className="pp2-topic-header">
          <div className="pp2-topic-header__left">
            <span className="pp2-topic-header__eyebrow">Topic</span>
            <h1 className="pp2-topic-header__title">
              {activeTopic?.name ?? 'Select a topic'}
            </h1>
            {activeTopic?.description && (
              <p className="pp2-topic-header__sub">{activeTopic.description}</p>
            )}
          </div>
          <div className="pp2-topic-header__right">
            <div className="pp2-stat">
              <span className="pp2-stat__value">{topicSummary.solved}</span>
              <span className="pp2-stat__divider">/</span>
              <span className="pp2-stat__total">{topicSummary.total}</span>
              <span className="pp2-stat__label">solved</span>
            </div>
          </div>
        </header>

        {/* ------------ filter bar ------------ */}
        <div className="pp2-filter">
          <label className="pp2-filter__search">
            <Search size={14} aria-hidden />
            <input
              type="text"
              placeholder="Search problems or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="pp2-filter__chips" role="tablist" aria-label="Difficulty filter">
            {(['all', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={difficultyFilter === d}
                className={`pp2-chip ${difficultyFilter === d ? 'is-active' : ''} ${
                  d !== 'all' ? `pp2-chip--${d.toLowerCase()}` : ''
                }`}
                onClick={() => setDifficultyFilter(d)}
              >
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>
        </div>

        {/* ------------ patterns ------------ */}
        <div className="pp2-patterns">
          {patternsLoading && (
            <div className="pp2-state">Loading patterns…</div>
          )}

          {patternsError && !patternsLoading && (
            <div className="pp2-state pp2-state--error">
              {patternsError}
              <button
                type="button"
                className="pp2-link"
                onClick={() => activeTopicId && setActiveTopicId(activeTopicId)}
              >
                Retry
              </button>
            </div>
          )}

          {!patternsLoading && !patternsError && patterns.length === 0 && activeTopicId && (
            <div className="pp2-state">
              No patterns in this topic yet.
            </div>
          )}

          <AnimatePresence mode="wait">
            {!patternsLoading && !patternsError && patterns.length > 0 && (
              <motion.div
                key={activeTopicId ?? 'empty'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {patterns.map((pat) => (
                  <PatternSection
                    key={pat.id}
                    pattern={pat}
                    expanded={expandedPatternId === pat.id}
                    onToggle={handleTogglePattern}
                    problems={filteredProblemsByPattern[pat.id]}
                    loading={!!problemsLoading[pat.id]}
                    error={problemsError[pat.id] ?? null}
                    onLoad={loadProblems}
                    onRetry={loadProblems}
                    getStatus={getStatusFor}
                    onCycleStatus={handleCycleStatus}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function humanizeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Network error — is the API server running?';
    return err.message || `Request failed (${err.status})`;
  }
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}
