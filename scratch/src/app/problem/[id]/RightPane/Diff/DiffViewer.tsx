// Diff viewer panel extracted verbatim from RightPane.tsx.
//
// Renders a side-by-side character/line diff between an expected and an
// actual string, using the pure-function `computeCharDiff` engine from
// ../lib/diff. The pure function returns segments tagged with `kind`
// ('same' | 'add' | 'remove') — that's the canonical RightPane_Lib
// contract (Requirement 2.9). The DOM structure (class names, element
// nesting, span-per-segment ordering) is byte-equal to the Spec_Baseline
// inline implementation so that the class-token multiset on the rendered
// tree stays equal (Requirement 2.4) and any Playwright assertion targeting
// `.pp-diff*` selectors keeps matching the same DOM elements
// (Requirement 2.5).
//
// UI_Primitive adoption (Task 5.6 / Requirement 2.6): this panel uses a
// bespoke `pp-diff*` class hierarchy (`pp-diff`, `pp-diff__col`,
// `pp-diff__header`, `pp-diff__header--expected`, `pp-diff__header--actual`,
// `pp-diff__content`, `pp-diff--remove`, `pp-diff--add`) that is NOT
// structurally equivalent to `Badge`, `CollapsibleSection`, `EmptyState`,
// `SectionHeader`, or `StatGrid`. No UI primitive substitution is applied
// here.

import { computeCharDiff } from '../lib/diff';

export default function DiffViewer({ expected, actual }: { expected: string; actual: string }) {
  const { expectedSegments, actualSegments } = computeCharDiff(expected, actual);
  return (
    <div className="pp-diff" data-testid="diff-viewer">
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
