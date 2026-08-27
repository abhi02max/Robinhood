'use client';

/**
 * ProblemPage — LeetCode-grade 2-panel workspace (Phase 10 refactored).
 *
 * Left:  problem description, examples, constraints, approaches
 * Right: editor (top) + results (bottom)
 *
 * All types in ./types.ts, API in ./api.ts, logic in ./hooks/
 */

import './problem-page.css';
import LeftPane from './LeftPane';
import RightPane from './RightPane';
import EditorPane from './EditorPane';
import { useEditor } from './hooks/useEditor';
import { useProblem } from './hooks/useProblem';
import { useSubmission } from './hooks/useSubmission';

// Re-export types for backward compatibility
export type { AttemptData, RecommendationData, UserProfile, CommunityInsights, PredictiveData } from './types';
export type { SubmissionResult } from './RightPane';

export default function ProblemPage({ id }: { id: string }) {
  const editor = useEditor(null);
  const prob = useProblem(id, editor.language, editor.codeByLang, editor.setCode);
  const sub = useSubmission(prob.problem, editor.code, editor.language, prob.refreshAttempts);

  const busy = sub.running || sub.submitting;

  return (
    <div className="pp-root" data-theme="dark">
      {/* HEADER */}
      <header className="pp-header">
        <div className="pp-header__left">
          <button className="pp-header__back" onClick={() => window.history.back()}>← Back</button>
          <span className="pp-header__title">{prob.problem?.title || (prob.loading ? 'Loading…' : 'Problem')}</span>
          {prob.problem && <span className={`pp-difficulty ${prob.problem.difficulty === 'Easy' ? 'pp-difficulty--easy' : prob.problem.difficulty === 'Medium' ? 'pp-difficulty--medium' : 'pp-difficulty--hard'}`} style={{ fontSize: 9, padding: '2px 8px' }}>{prob.problem.difficulty}</span>}
        </div>
        <div className="pp-header__right">
          <span className="pp-shortcut-hint">Ctrl+Enter Run · Ctrl+Shift+Enter Submit</span>
        </div>
      </header>

      {/* 2-PANEL BODY (LeetCode-style) */}
      <div className="pp-body">
        <LeftPane problem={prob.problem} loading={prob.loading} error={prob.error} notFound={prob.notFound} id={id} language={editor.language} />

        <div className="pp-divider pp-divider--v" />

        <div className="pp-right-split">
          <EditorPane
            language={editor.language}
            code={editor.code}
            busy={busy}
            problem={!!prob.problem}
            onLangChange={editor.handleLangChange}
            onCodeChange={editor.handleCodeChange}
            onReset={editor.handleReset}
            onRun={sub.handleRun}
            onSubmit={sub.handleSubmit}
            running={sub.running}
            submitting={sub.submitting}
          />

          <div className="pp-divider pp-divider--h" />

          <RightPane
            cases={prob.problem?.test_cases ?? []}
            runResult={sub.runResult}
            submitResult={sub.submitResult}
            running={sub.running}
            submitting={sub.submitting}
            attemptData={prob.attemptData}
            attemptError={prob.attemptError}
            recommendation={sub.recommendation}
            recommendationError={sub.recommendationError}
            userProfile={prob.userProfile}
            profileError={prob.profileError}
            community={prob.community}
            communityError={prob.communityError}
            predictions={prob.predictions}
            predictionsError={prob.predictionsError}
          />
        </div>
      </div>
    </div>
  );
}
