// SmartErrorBox — renders a user-visible error indication with smart formatting
// for runtime / compilation / TLE failure modes. Reused as the API failure
// surface per Sprint 1 (Requirement 1.9 references this same component).
//
// Extracted verbatim from RightPane.tsx so the rendered DOM stays byte-equivalent
// to the Spec_Baseline (Requirements 2.4, 2.5). The `.pp-error-box` class token
// and its `__title` / `__msg` BEM children must be preserved exactly.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-error-box__*` class hierarchy that is NOT structurally
// equivalent to `Badge`, `CollapsibleSection`, `EmptyState`, `SectionHeader`,
// or `StatGrid`. (In particular, `pp-error-box` is a *failure* surface, not
// an empty/idle state — replacing it with `EmptyState` would emit `pp-idle`
// tokens instead of `pp-error-box`, violating the class-token multiset
// preservation contract.) No UI primitive substitution is applied here.

import type { SubmissionResult } from '../../types';
import { fmtJson } from '../lib/format';

export type SmartErrorBoxProps = {
  submission: SubmissionResult;
};

export default function SmartErrorBox({ submission }: SmartErrorBoxProps) {
  const status = submission.status.toLowerCase();
  const msg = submission.failed_test_case?.message || '';
  const actualRaw = fmtJson(submission.failed_test_case?.actual);

  let title = 'Wrong Answer';
  let icon = '✗';
  let detail = msg;

  if (status.includes('runtime')) {
    title = 'Runtime Error'; icon = '💥';
    detail = msg || actualRaw || 'Your code threw an error during execution.';
  } else if (status.includes('compilation') || status.includes('syntax')) {
    title = 'Syntax / Compilation Error'; icon = '⚠';
    detail = msg || actualRaw || 'Your code has a syntax error.';
  } else if (status.includes('time limit')) {
    title = 'Time Limit Exceeded'; icon = '⏱';
    detail = 'Your solution took too long. Optimize your algorithm.';
  }

  return (
    <div className="pp-error-box" data-testid="smart-error-box">
      <div className="pp-error-box__title">{icon} {title}</div>
      <div className="pp-error-box__msg">{detail}</div>
    </div>
  );
}
