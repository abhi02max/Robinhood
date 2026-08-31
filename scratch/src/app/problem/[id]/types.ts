/**
 * Shared types for the Problem Page feature.
 * Single source of truth — all components import from here.
 */

import { productionLanguages } from '../../../../server/languages/registry.js';

/**
 * Every language the platform knows about, exposed or not.
 *
 * Wider than `LANGUAGES` below on purpose: `DEFAULT_STARTERS` and the per-language
 * code cache keep entries for hidden languages so nothing has to be rebuilt when one
 * is switched on.
 */
export type LanguageId = 'javascript' | 'python' | 'cpp' | 'java' | 'c' | 'csharp';

export type SubmissionResult = {
  submission_id: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | string;
  passed: boolean;
  pass_count: number;
  total_cases: number;
  failed_test_case: null | {
    test_index: number; is_hidden: boolean;
    input: unknown; expected: unknown; actual: unknown; message: string;
  };
  runtime_ms: number;
  memory_bytes: number;
  language: string;
  created_at: string;
  attempt_number?: number;
  previous_status?: string | null;
  pattern_name?: string | null;
  topic_name?: string | null;
  contextual_hint?: { message: string; severity: string; category: string } | null;
  code_analysis?: {
    patterns: { loop_count: number; has_nested_loops: boolean; has_recursion: boolean; has_memoization: boolean; has_visited_set: boolean; has_hash_map: boolean; has_sorting: boolean; line_count: number };
    complexity: { time: string; space: string };
    time_comparison: { estimated: string; expected: string; match: string; delta: number } | null;
    reasoning_failures: { type: string; message: string; severity: string }[];
    feedback: { type: string; severity: string; message: string }[];
  } | null;
};

export type VisibleTC = {
  id: string; input_payload: unknown; expected_output: unknown; order_index: number;
};

export type AttemptRecord = {
  id: string; status: string; language: string;
  runtime_ms: number; memory_bytes: number; pass_count: number; created_at: string;
};

export type AttemptData = {
  problem_id: string; attempts: AttemptRecord[]; total: number;
  pattern_name: string | null; topic_name: string | null;
};

export type Recommendation = {
  id: string; slug: string; title: string; difficulty: string;
  pattern_name: string; topic_name: string; reason: string;
};

export type RecommendationData = {
  recommendation: Recommendation | null;
  alternatives: { id: string; slug: string; title: string; difficulty: string; pattern_name: string }[];
  adapted_difficulty: string;
  current_pattern: { name: string; mastery: string; score: number } | null;
};

export type UserProfile = {
  strengths: string[]; weaknesses: string[];
  learning_speed: string; consistency: string;
  error_tendency: string | null;
  error_patterns: Record<string, { label: string; icon: string; count: number; frequency: number }>;
  total_problems_solved: number; total_problems_attempted: number;
  total_submissions: number; active_days: number;
  streak_current: number; streak_best: number; patterns_touched: number;
  adaptive_weights: { correctness: number; efficiency: number; speed: number; volume: number };
};

export type CommunityInsights = {
  total_submissions: number; total_users: number; solved_users: number;
  solve_rate: number; avg_attempts: number; avg_runtime_ms: number;
  failure_breakdown: { wrong_answer: number; tle: number; runtime_error: number };
};

export type PredictiveData = {
  readiness: { medium_probability: number; hard_probability: number; readiness_level: string; growth_trajectory: string; patterns_mastered: number; patterns_developing: number; patterns_weak: number; coverage_percent: number };
  velocity: { problems_per_week: number; improvement_trend: string; confidence_trend: string; estimated_days_to_mastery: number | null; solve_rate_early: number; solve_rate_recent: number };
  risk_alerts: { type: string; confidence: number; signal: string }[];
  interventions: { type: string; priority: string; icon: string; message: string; action: string }[];
  health_score: number;
};

export type DiffSegment = { type: 'same' | 'add' | 'remove'; text: string };

/**
 * Languages the editor offers, derived from the single language registry.
 *
 * This list used to be maintained by hand and offered all six, including three that
 * could not execute at all. It is now a projection of `productionEnabled` in
 * server/languages/registry.js, so a language appears here exactly when its pipeline
 * is finished — the editor cannot drift from what the engine can run.
 *
 * The registry is a dependency-free data module for precisely this reason: it is
 * imported by the Express server and by this client component, and it reads no
 * environment and touches no node builtins.
 */
export const LANGUAGES: { id: LanguageId; label: string; monacoId: string }[] =
  productionLanguages().map((l) => ({
    id: l.key as LanguageId,
    label: l.displayName,
    monacoId: l.monacoLanguage,
  }));

export const DEFAULT_STARTERS: Record<LanguageId, string> = {
  javascript: '// Write your solution here\nfunction solve(input) {\n  return null;\n}\n',
  python:     '# Write your solution here\ndef solve(input):\n    return None\n',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your solution here\n};\n',
  c:          '// Write your solution here\n',
  csharp:     'using System;\nusing System.Collections.Generic;\n\npublic class Solution {\n    // Write your solution here\n}\n',
  java:       'import java.util.*;\n\nclass Solution {\n    // Write your solution here\n}\n',
};
