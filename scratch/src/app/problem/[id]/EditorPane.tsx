'use client';
// =============================================================================
// Monaco readiness signal (Task 7.6, Requirement 3.7)
// -----------------------------------------------------------------------------
// CHOSEN PRIMITIVE: `data-testid="monaco-ready"` on the editor wrapper element
// (the `.pp-editor` div).
//
// The attribute is rendered iff:
//   1. The Monaco `onMount` callback has fired, AND
//   2. `editor.getModel()` returns a non-null model at mount time.
//
// Rationale: a `data-testid` is a single, additive DOM hook that the Playwright
// suite can wait on with `page.waitForSelector('[data-testid="monaco-ready"]')`,
// independent of any `aria-busy` semantics elsewhere in the tree (`LeftPane`
// already uses `aria-busy` on its skeleton, so reusing it here would muddy the
// signal). The `.monaco-editor` DOM child is implicitly present whenever
// `onMount` fires with a non-null model, so the model check covers both
// readiness conditions.
//
// =============================================================================
// Monaco failure surface (Task 7.7, Requirement 3.8)
// -----------------------------------------------------------------------------
// CHOSEN UI: an inline error card rendered INSIDE the `.pp-editor` wrapper with
// `data-testid="monaco-failed"`, replacing the Monaco `<MonacoEditor />` mount.
// The card wears `role="alert"` and surfaces a plain-text message ("Editor
// failed to load") plus a hint to refresh — no spinner, no fallback textarea.
// The reason for replacing rather than overlaying:
//   - The Monaco component never reached `onMount`, so leaving it mounted would
//     keep firing `import('@monaco-editor/react')` retries inside the same DOM
//     subtree that the Playwright suite is racing against.
//   - The `.pp-editor` wrapper is the single anchor point shared with the
//     readiness signal (Task 7.6). Putting the failure card on the same node
//     keeps both selectors stable: the Playwright suite waits on
//     `[data-testid="monaco-ready"]` and races `[data-testid="monaco-failed"]`
//     as a hard failure (no retry, no further interaction with the editor).
//
// MUTUAL EXCLUSION INVARIANT:
//   - `monacoReady === true`  ⇒  `monacoFailed === false`  (timer is cancelled
//     in `handleMount` before `setMonacoReady(true)` fires).
//   - `monacoFailed === true` ⇒  `monacoReady === false`   (the timer callback
//     is a no-op once readiness has flipped, because we early-return on the
//     captured ref of `readyRef`).
//   - Initial state: both `false` (loading).
//   - Therefore the wrapper renders at most ONE of `data-testid="monaco-ready"`
//     or `data-testid="monaco-failed"` at any time.
//
// TIMEOUT WINDOW: 10s, started on the FIRST render of `EditorPaneInner` (the
// component is mounted by the parent `ProblemPage` exactly when the user
// navigates to `/problem/[id]`, which is the same moment Monaco begins its
// dynamic import). If the dynamic import resolves but `onMount` never fires
// (e.g. webpack chunk 4xx, blocked CDN, browser OOM) we still flip to failed.
// =============================================================================

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { OnMount } from '@monaco-editor/react';
import type { LanguageId } from './types';
import { LANGUAGES } from './types';

const MONACO_READY_TIMEOUT_MS = 10_000;

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  { ssr: false, loading: () => <div className="pp-editor__loading">Loading editor…</div> }
);

function EditorPaneInner({ language, code, busy, problem, onLangChange, onCodeChange, onReset, onRun, onSubmit, running, submitting }: {
  language: LanguageId; code: string; busy: boolean;
  problem: boolean;
  onLangChange: (lang: LanguageId) => void;
  onCodeChange: (v: string | undefined) => void;
  onReset: () => void;
  onRun: () => void;
  onSubmit: () => void;
  running: boolean; submitting: boolean;
}) {
  // Monaco readiness flag — flipped to `true` in `handleMount` once we have
  // confirmed `editor.getModel()` is non-null (see comment header above).
  const [monacoReady, setMonacoReady] = useState(false);
  // Monaco failure flag — flipped to `true` by the 10s timeout if readiness
  // has not been signaled. Mutually exclusive with `monacoReady`.
  const [monacoFailed, setMonacoFailed] = useState(false);

  // Refs let the timer callback observe the latest readiness state without
  // re-creating the timeout on every render.
  const readyRef = useRef(false);
  const failedRef = useRef(false);

  const handleMount = useCallback<OnMount>((editor) => {
    if (editor.getModel() != null) {
      // Cancel any pending failure flip — the timer callback also checks the
      // ref, so this is belt-and-braces. Then mark the ref before flipping
      // state so concurrent renders see the latest value.
      readyRef.current = true;
      setMonacoReady(true);
    }
  }, []);

  // 10s readiness watchdog. Started on first mount of EditorPane, cancelled
  // on unmount or once readiness flips. Does NOT depend on `monacoReady` so
  // the timer is created exactly once per mount.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (!readyRef.current && !failedRef.current) {
        failedRef.current = true;
        setMonacoFailed(true);
      }
    }, MONACO_READY_TIMEOUT_MS);
    return () => clearTimeout(handle);
  }, []);

  // Wrapper-level testid: at most one of these is set, never both.
  const editorTestId = monacoReady
    ? 'monaco-ready'
    : monacoFailed
      ? 'monaco-failed'
      : undefined;

  return (
    <section className="pp-pane pp-editor-pane" aria-label="Code editor">
      <div className="pp-editor-bar">
        <select className="pp-lang-select" value={language} onChange={(e) => onLangChange(e.target.value as LanguageId)} aria-label="Language">
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <div className="pp-editor-actions">
          <button className="pp-btn pp-btn--ghost" onClick={onReset} disabled={!problem}>Reset</button>
        </div>
      </div>
      <div className="pp-editor" {...(editorTestId ? { 'data-testid': editorTestId } : {})}>
        {monacoFailed ? (
          <div className="pp-editor__failed" role="alert">
            <div className="pp-editor__failed-title">Editor failed to load</div>
            <div className="pp-editor__failed-body">
              The Monaco editor did not become ready within 10 seconds. Try refreshing the page.
            </div>
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={LANGUAGES.find((l) => l.id === language)?.monacoId || 'javascript'}
            value={code}
            theme="vs-dark"
            onChange={onCodeChange}
            onMount={handleMount}
            options={{
              fontSize: 14, fontFamily: 'JetBrains Mono, Consolas, monospace',
              minimap: { enabled: false }, scrollBeyondLastLine: false,
              tabSize: 2, automaticLayout: true, smoothScrolling: true,
              padding: { top: 14, bottom: 14 }, renderLineHighlight: 'gutter',
              wordWrap: 'on', bracketPairColorization: { enabled: true },
            }}
          />
        )}
      </div>
      <div className="pp-editor-controls">
        <div className="pp-editor-controls__left">
          <span className="pp-shortcut-hint">Ctrl+Enter</span>
        </div>
        <div className="pp-editor-controls__right">
          <button className="pp-btn pp-btn--run" onClick={onRun} disabled={!problem || busy}>
            {running ? '⏳ Running…' : '▶ Run'}
          </button>
          <button className="pp-btn pp-btn--submit" onClick={onSubmit} disabled={!problem || busy}>
            {submitting ? '⏳ Submitting…' : '🚀 Submit'}
          </button>
        </div>
      </div>
    </section>
  );
}

const EditorPane = memo(EditorPaneInner);
export default EditorPane;
