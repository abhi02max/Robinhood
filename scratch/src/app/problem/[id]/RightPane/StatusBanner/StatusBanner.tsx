// StatusBanner — renders the `.pp-status-banner` element with status icon,
// title text, sub text, and runtime/memory meta cells.
//
// Extracted verbatim from RightPane.tsx so the rendered DOM stays byte-equivalent
// to the Spec_Baseline (Requirements 2.4, 2.5). The `.pp-status-banner` class
// token and every `pp-*` descendant class token must be preserved exactly —
// `.pp-status-banner` is a Playwright-asserted selector (Requirement 2.5).
//
// Two call sites in the baseline produce different `title` and `sub` text:
//   • RunResultsView    → title = submission.status,
//                         sub   = `${pass_count} / ${total_cases} passed`
//   • SubmitResultsView → title = submission.passed ? '✓ Accepted' : `✗ ${status}`,
//                         sub   = `${pass_count} / ${total_cases} test cases passed`
// To keep this module a single component while preserving both renderings
// byte-for-byte, the variable text is passed in as `title` and `sub` props.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-status-banner__*` and `pp-meta-cell__*` class hierarchy that
// is NOT structurally equivalent to `Badge`, `CollapsibleSection`,
// `EmptyState`, `SectionHeader`, or `StatGrid`. Substituting `StatGrid`
// for the runtime/memory meta cells, for example, would replace
// `pp-meta-cell` / `pp-meta-cell__label` / `pp-meta-cell__value` tokens
// with `pp-stat-grid` / `pp-stat-grid__cell` / `pp-stat-grid__value` /
// `pp-stat-grid__label` tokens and break the class-token multiset
// preservation contract. No UI primitive substitution is applied here.

import type { ReactNode } from 'react';
import type { SubmissionResult } from '../../types';
import { fmtBytes, statusClass, statusIcon } from '../lib/format';

export type StatusBannerProps = {
  submission: SubmissionResult;
  title: ReactNode;
  sub: ReactNode;
};

export default function StatusBanner({ submission, title, sub }: StatusBannerProps) {
  return (
    <div className={`pp-status-banner ${statusClass(submission.status)}`} data-testid="status-banner">
      <div className="pp-status-banner__icon">{statusIcon(submission.status)}</div>
      <div>
        <div className="pp-status-banner__title">{title}</div>
        <div className="pp-status-banner__sub">{sub}</div>
      </div>
      <div className="pp-status-banner__meta">
        <div className="pp-meta-cell"><div className="pp-meta-cell__label">Runtime</div><div className="pp-meta-cell__value">{submission.runtime_ms} ms</div></div>
        <div className="pp-meta-cell"><div className="pp-meta-cell__label">Memory</div><div className="pp-meta-cell__value">{fmtBytes(submission.memory_bytes)}</div></div>
      </div>
    </div>
  );
}
