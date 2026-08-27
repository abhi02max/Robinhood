/**
 * Shared types for the Problems learning system.
 *
 * Mirrors the public response shapes returned by:
 *   GET /api/learning/topics
 *   GET /api/learning/patterns/:topicId
 *   GET /api/learning/problems/:patternId
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ProblemStatus = 'solved' | 'attempted' | null;

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  /** Reserved for future user-aware enrichment. Currently always null. */
  progress: number | null;
}

export interface Pattern {
  id: string;
  name: string;
  slug: string;
  explanation: string | null;
  when_to_use: string | null;
  intuition: string | null;
  order_index: number;
  problem_count: number;
}

export interface ProblemSummary {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  /** Free-form tag list. May contain company names, topic labels, etc. */
  tags: string[];
}

export interface DifficultyCounts {
  Easy: number;
  Medium: number;
  Hard: number;
}

/** Computed once per pattern, given its loaded problem list + progress map. */
export interface PatternStats {
  total: number;
  solved: number;
  attempted: number;
  difficulty: DifficultyCounts;
}
