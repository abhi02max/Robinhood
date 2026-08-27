'use client';
// TestCaseCard — extracted verbatim from RightPane.tsx.
//
// DOM shape and class-token multiset are byte-equivalent to the Spec_Baseline
// implementation (Requirements 2.1, 2.4, 2.5). The clickable
// `<div className="pp-tc-card__header">` is preserved as-is in this sprint;
// Sprint 5 (task 11.5) is the one that converts it to `<button type="button">`.
//
// Allowed imports for this module are restricted by the task contract to:
//   - React (and its hooks)
//   - types from '../../types'
//   - format helpers from '../lib/format'
//   - diff helpers from '../lib/diff'
// The sibling DiffViewer panel is NOT imported here — instead we render the
// same `pp-diff*` DOM inline using `computeCharDiff` so this module remains
// self-contained and the rendered class-token multiset matches the baseline.
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-tc-card__*` class hierarchy plus the inline `pp-diff*` and
// `pp-kv*` block hierarchies. None are structurally equivalent to `Badge`,
// `CollapsibleSection`, `EmptyState`, `SectionHeader`, or `StatGrid`.
// In particular, the `pp-tc-card__header` / `pp-tc-card__chevron` collapsing
// surface looks similar to `CollapsibleSection`, but the `<CollapsibleSection>`
// primitive emits `pp-collapsible*` tokens (`pp-collapsible`,
// `pp-collapsible__trigger`, `pp-collapsible__icon`, `pp-collapsible__title`,
// `pp-collapsible__chevron`, `pp-collapsible__body`) — substituting it would
// replace the `pp-tc-card__header` / `pp-tc-card__left` / `pp-tc-card__dot`
// / `pp-tc-card__name` / `pp-tc-card__badge` / `pp-tc-card__chevron` /
// `pp-tc-card__body` tokens and violate the class-token multiset
// preservation contract. The `pp-tc-card__badge` Pass/Fail pill is NOT the
// same as `pp-badge` from the `Badge` primitive, so substitution is also
// blocked there. No UI primitive substitution is applied here.
import { useEffect, useRef, useState } from 'react';
import type { SubmissionResult, VisibleTC } from '../../types';
import { fmtJson } from '../lib/format';
import { computeCharDiff } from '../lib/diff';

// Local diff view kept inline for the reasons in the header comment.
// Renders the same DOM as the baseline `DiffViewer` in RightPane.tsx so the
// class-token multiset on diff segments stays equal (Requirement 2.4).
function DiffView({ expected, actual }: { expected: string; actual: string }) {
  const { expectedSegments, actualSegments } = computeCharDiff(expected, actual);
  return (
    <div className="pp-diff">
      <div className="pp-diff__col">
        <div className="pp-diff__header pp-diff__header--expected">Expected</div>
        <pre className="pp-diff__content">
          {expectedSegments.map((seg, i) => (
            <span key={i} className={seg.kind === 'remove' ? 'pp-diff--remove' : ''}>{seg.text}</span>
          ))}
        </pre>
      </div>
      <div className="pp-diff__col">
        <div className="pp-diff__header pp-diff__header--actual">Your Output</div>
        <pre className="pp-diff__content">
          {actualSegments.map((seg, i) => (
            <span key={i} className={seg.kind === 'add' ? 'pp-diff--add' : ''}>{seg.text}</span>
          ))}
        </pre>
      </div>
    </div>
  );
}

export interface TestCaseCardProps {
  index: number;
  tc: VisibleTC;
  submission: SubmissionResult | null;
  isFirstFail: boolean;
  defaultOpen: boolean;
}

export default function TestCaseCard({ index, tc, submission, isFirstFail, defaultOpen }: TestCaseCardProps) {
  const [open, setOpen] = useState(defaultOpen || isFirstFail);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirstFail) {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }, [isFirstFail]);

  const failIdx = submission && !submission.passed && submission.failed_test_case && !submission.failed_test_case.is_hidden
    ? submission.failed_test_case.test_index : -1;
  const isFail = index === failIdx;
  const isPass = submission?.passed || (submission && !submission.passed && failIdx >= 0 && index < failIdx);

  let cls = 'pp-tc-card';
  if (submission) cls += isPass ? ' pp-tc-card--pass' : isFail ? ' pp-tc-card--fail' : '';
  if (isFirstFail) cls += ' pp-tc-card--first-fail';

  const expectedStr = fmtJson(tc.expected_output);
  const actualStr = isFail && submission?.failed_test_case ? fmtJson(submission.failed_test_case.actual) : '';
  const showDiff = isFail && expectedStr !== actualStr && actualStr.length > 0;

  return (
    <div className={cls} ref={ref} data-testid="test-case-card">
      <div className="pp-tc-card__header" onClick={() => setOpen(!open)}>
        <div className="pp-tc-card__left">
          <span className="pp-tc-card__dot" />
          <span className="pp-tc-card__name">Case {index + 1}</span>
          {submission && (isPass || isFail) && (
            <span className="pp-tc-card__badge">{isPass ? 'Pass' : 'Fail'}</span>
          )}
        </div>
        <span className={`pp-tc-card__chevron ${open ? 'pp-tc-card__chevron--open' : ''}`}>▾</span>
      </div>
      {open && (
        <div className="pp-tc-card__body">
          <div className="pp-kv"><div className="pp-kv__label">Input</div><div className="pp-kv__value">{fmtJson(tc.input_payload)}</div></div>
          {showDiff ? (
            <DiffView expected={expectedStr} actual={actualStr} />
          ) : (
            <>
              <div className="pp-kv pp-kv--good"><div className="pp-kv__label">Expected</div><div className="pp-kv__value">{expectedStr}</div></div>
              {isFail && submission?.failed_test_case && (
                <div className="pp-kv pp-kv--bad"><div className="pp-kv__label">Your Output</div><div className="pp-kv__value">{actualStr}</div></div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
