// Pure-function hint and reinforcement generators extracted verbatim from
// RightPane.tsx.
//
// This module is part of the RightPane_Lib (see Requirement 2.2) and MUST stay
// pure: no React, no Next, no DOM globals (window/document/navigator/globalThis),
// no network (fetch/XMLHttpRequest/axios), no sibling .tsx/.jsx imports.
// Behavior must match the Spec_Baseline RightPane.tsx exactly so that the
// rendered hint / reinforcement strings are byte-equal (Requirement 2.4 / 2.7).
//
// Note on signature: design.md sketches a `(ctx: HintContext) => Hint` /
// `(ctx: ReinforcementContext) => Reinforcement` shape, but no such types
// existed in the Spec_Baseline. The instruction in Task 4.3 is to extract
// the existing implementations *verbatim* to preserve behavior, so the
// concrete `(submission, attemptData)` argument shape is kept exactly as it
// lives in the Spec_Baseline. format.ts (Task 4.1) follows the same rule.

import type { SubmissionResult, AttemptData } from '../../types';

import { fmtJson } from './format';

export function generateAdaptiveHint(submission: SubmissionResult, attemptData: AttemptData | null): string | null {
  if (!submission || submission.passed) return null;

  const attemptNum = submission.attempt_number ?? attemptData?.total ?? 1;
  const pattern = submission.pattern_name ?? attemptData?.pattern_name ?? '';
  const status = submission.status.toLowerCase();
  const msg = submission.failed_test_case?.message?.toLowerCase() || '';
  const actual = fmtJson(submission.failed_test_case?.actual).toLowerCase();
  const expected = fmtJson(submission.failed_test_case?.expected).toLowerCase();

  // TLE — always pattern-aware
  if (status.includes('time limit')) {
    if (pattern.toLowerCase().includes('sliding window'))
      return `💡 TLE on a Sliding Window problem — ensure your window expands/shrinks in O(n), not nested loops. Attempt #${attemptNum}.`;
    if (pattern.toLowerCase().includes('binary search'))
      return `💡 TLE — are you using binary search? Check that your search space halves each iteration. Attempt #${attemptNum}.`;
    return `💡 Time Limit Exceeded (attempt #${attemptNum}) — optimize your algorithm. Consider hash maps, two pointers, or divide-and-conquer.`;
  }

  // Runtime errors — escalating
  if (status.includes('runtime') || status.includes('error')) {
    if (msg.includes('index') || msg.includes('range') || msg.includes('bounds'))
      return attemptNum >= 3
        ? `💡 Repeated index error (attempt #${attemptNum}) — add explicit bounds checks: if (i >= 0 && i < arr.length). Test with empty arrays.`
        : '💡 Array index out of bounds — check loop boundaries and empty input edge cases.';
    if (msg.includes('null') || msg.includes('undefined') || msg.includes('none'))
      return attemptNum >= 3
        ? `💡 Still hitting null refs (attempt #${attemptNum}) — add guards at every pointer/node access. Consider: what if the input is empty?`
        : '💡 Null reference — handle cases where nodes or values might be null.';
    if (msg.includes('stack') || msg.includes('recursion') || msg.includes('maximum call'))
      return `💡 Stack overflow (attempt #${attemptNum}) — your recursion needs a base case, or consider converting to iterative.`;
    return attemptNum >= 3
      ? `💡 Runtime error persists after ${attemptNum} attempts — add try/catch around suspicious operations and validate all inputs.`
      : '💡 Runtime error — add input validation and check edge cases.';
  }

  // Wrong Answer — escalating with pattern awareness
  if (actual === 'null' || actual === 'none' || actual === 'undefined')
    return `💡 Returning null/undefined — make sure every code path returns a value. Attempt #${attemptNum}.`;

  const expNum = Number(expected);
  const actNum = Number(actual);
  if (!isNaN(expNum) && !isNaN(actNum) && Math.abs(expNum - actNum) === 1)
    return `💡 Off by one! Check < vs <=, or 0-indexed vs 1-indexed boundaries. Attempt #${attemptNum}.`;

  // Escalating generic hints
  if (attemptNum >= 5) {
    if (pattern)
      return `💡 Attempt #${attemptNum} — consider reviewing the ${pattern} pattern. Focus on the core invariant: what condition must hold at each step?`;
    return `💡 Attempt #${attemptNum} — step back and trace through the algorithm by hand with the failing input. Consider a completely different approach.`;
  }
  if (attemptNum >= 3) {
    if (pattern)
      return `💡 Multiple attempts on a ${pattern} problem — ensure your ${pattern.toLowerCase().includes('pointer') ? 'pointer movement' : pattern.toLowerCase().includes('window') ? 'window boundaries' : 'state transitions'} are correct for all edge cases.`;
    return `💡 Attempt #${attemptNum} — trace through your logic step-by-step with the failing input. Check edge cases: empty input, single elements, duplicates.`;
  }

  return '💡 Wrong answer — walk through your algorithm with the failing test input.';
}

export function generateReinforcement(submission: SubmissionResult, attemptData: AttemptData | null): string | null {
  if (!submission?.passed) return null;

  const attemptNum = submission.attempt_number ?? attemptData?.total ?? 1;
  const pattern = submission.pattern_name ?? attemptData?.pattern_name ?? '';
  const prevStatus = submission.previous_status;

  if (attemptNum === 1) {
    return pattern
      ? `🎯 Clean first-attempt solve! You're solid in ${pattern}.`
      : '🎯 Solved on the first attempt — excellent!';
  }
  if (attemptNum <= 3) {
    if (prevStatus && prevStatus !== 'Accepted')
      return `✨ Solved after ${attemptNum} attempts — good debugging! ${pattern ? `Your ${pattern} skills are improving.` : ''}`;
    return `✨ Solved in ${attemptNum} attempts — well done!`;
  }
  if (attemptNum <= 5) {
    return `💪 Persistence paid off — solved after ${attemptNum} attempts! ${pattern ? `Keep practicing ${pattern} patterns.` : ''}`;
  }
  return `🏆 ${attemptNum} attempts and you got it! That determination is what builds mastery. ${pattern ? `${pattern} is getting stronger.` : ''}`;
}
