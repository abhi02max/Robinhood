// Pure-function character diff engine extracted from RightPane.tsx.
//
// This module is part of the RightPane_Lib (see Requirement 2.2) and MUST stay
// pure: no React, no Next, no DOM globals (window/document/navigator/globalThis),
// no network (fetch/XMLHttpRequest/axios), no sibling .tsx/.jsx imports.
//
// The algorithm body is extracted verbatim from the Spec_Baseline
// computeCharDiff in RightPane.tsx so that the rendered DOM (and therefore the
// class-token multiset on diff segments) stays identical (Requirement 2.4).
// The only adaptation is the discriminator field name: the canonical interface
// surfaced by this lib uses `kind` (per the design doc and Requirement 2.9
// contract) rather than the inline `type` the legacy implementation used.

export interface DiffSegment {
  kind: 'same' | 'add' | 'remove';
  text: string;
}

export interface CharDiff {
  expectedSegments: DiffSegment[];
  actualSegments: DiffSegment[];
}

export function computeCharDiff(expected: string, actual: string): CharDiff {
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const maxLen = Math.max(expLines.length, actLines.length);
  const expectedSegments: DiffSegment[] = [];
  const actualSegments: DiffSegment[] = [];

  for (let i = 0; i < maxLen; i++) {
    const eLine = expLines[i] ?? '';
    const aLine = actLines[i] ?? '';
    if (i > 0) {
      expectedSegments.push({ kind: 'same', text: '\n' });
      actualSegments.push({ kind: 'same', text: '\n' });
    }
    if (eLine === aLine) {
      expectedSegments.push({ kind: 'same', text: eLine });
      actualSegments.push({ kind: 'same', text: eLine });
    } else {
      expectedSegments.push({ kind: 'remove', text: eLine || '(empty)' });
      actualSegments.push({ kind: 'add', text: aLine || '(empty)' });
    }
  }
  return { expectedSegments, actualSegments };
}
