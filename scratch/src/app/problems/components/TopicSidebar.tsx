'use client';

/**
 * TopicSidebar — sticky left rail listing every topic.
 *
 * Each entry shows the topic name and a small chevron. The active topic
 * gets a coloured rail on the left edge. Mobile/narrow layouts can flip
 * this into a horizontal scrolling chip list via CSS — no JS changes
 * needed.
 */

import { ChevronRight, Loader2 } from 'lucide-react';
import type { Topic } from '../lib/types';

interface Props {
  topics: Topic[];
  activeTopicId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (topicId: string) => void;
  onRetry: () => void;
}

export default function TopicSidebar({
  topics,
  activeTopicId,
  loading,
  error,
  onSelect,
  onRetry,
}: Props) {
  return (
    <aside className="pp2-side" aria-label="Topics">
      <div className="pp2-side__header">
        <span className="pp2-side__eyebrow">Curriculum</span>
        <h2 className="pp2-side__title">Topics</h2>
      </div>

      {loading && (
        <div className="pp2-side__state">
          <Loader2 size={14} className="pp2-spin" />
          Loading topics…
        </div>
      )}

      {error && !loading && (
        <div className="pp2-side__state pp2-side__state--error">
          <span>{error}</span>
          <button type="button" className="pp2-link" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <div className="pp2-side__state">No topics seeded yet.</div>
      )}

      {!loading && !error && topics.length > 0 && (
        <nav className="pp2-side__list">
          {topics.map((t) => {
            const active = t.id === activeTopicId;
            return (
              <button
                key={t.id}
                type="button"
                className={`pp2-side__item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(t.id)}
              >
                <span className="pp2-side__rail" aria-hidden />
                <span className="pp2-side__name">{t.name}</span>
                <ChevronRight
                  size={14}
                  className="pp2-side__caret"
                  aria-hidden
                />
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
