// Pure-function formatting helpers extracted verbatim from RightPane.tsx.
//
// This module is part of the RightPane_Lib (see Requirement 2.2) and MUST stay
// pure: no React, no Next, no DOM globals (window/document/navigator/globalThis),
// no network (fetch/XMLHttpRequest/axios), no sibling .tsx/.jsx imports.
// Behavior must match the Spec_Baseline RightPane.tsx exactly so that the
// class-token multiset on the rendered tree stays equal (Requirement 2.4).

export function fmtJson(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export function fmtBytes(b: number): string {
  if (!Number.isFinite(b) || b <= 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

export function statusClass(s: string): string {
  const sl = s.toLowerCase();
  if (sl === 'accepted') return 'pp-status-banner--accepted';
  if (sl.includes('time limit')) return 'pp-status-banner--tle';
  if (sl.includes('runtime') || sl.includes('error') || sl.includes('compilation')) return 'pp-status-banner--error';
  return 'pp-status-banner--wrong';
}

export function statusIcon(s: string): string {
  const sl = s.toLowerCase();
  if (sl === 'accepted') return '✓';
  if (sl.includes('time')) return '⏱';
  return '✗';
}

export function diffClass(d: string): string {
  if (d === 'Easy') return 'pp-difficulty--easy';
  if (d === 'Medium') return 'pp-difficulty--medium';
  return 'pp-difficulty--hard';
}
