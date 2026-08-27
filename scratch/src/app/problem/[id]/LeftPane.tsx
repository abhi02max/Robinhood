'use client';
import { useState } from 'react';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type LanguageId = 'javascript' | 'python' | 'cpp' | 'java' | 'c' | 'csharp';
type Example = { input?: unknown; output?: unknown; explanation?: unknown };

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export type ProblemDetail = {
  id: string;
  title: string;
  slug?: string;
  difficulty: Difficulty;
  description: string;
  examples: Example[];
  constraints: string[];
  edge_cases: string[];
  approach_brute: string;
  approach_optimal: string;
  time_complexity: string;
  space_complexity: string;
  starter_code: Partial<Record<LanguageId, string>>;
  tags: string[];
  test_cases: { id: string; input_payload: unknown; expected_output: unknown; order_index: number }[];
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderProse(md: string): string {
  if (!md) return '';
  const escaped = escapeHtml(md);
  const withCode = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  const withBold = withCode.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return withBold.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
}

function fmtDiff(d: Difficulty) {
  if (d === 'Easy') return 'pp-difficulty--easy';
  if (d === 'Medium') return 'pp-difficulty--medium';
  return 'pp-difficulty--hard';
}

function DescriptionView({ problem }: { problem: ProblemDetail }) {
  return (
    <div>
      <div className="pp-title-row">
        <h1 className="pp-title">{problem.title}</h1>
        <span className={`pp-difficulty ${fmtDiff(problem.difficulty)}`}>{problem.difficulty}</span>
      </div>

      {problem.tags?.length > 0 && (
        <div className="pp-tags">
          {problem.tags.map((t) => (<span className="pp-tag" key={t}>{t}</span>))}
        </div>
      )}

      <section className="pp-section">
        <div className="pp-prose" dangerouslySetInnerHTML={{ __html: renderProse(problem.description) }} />
      </section>

      {problem.examples?.length > 0 && (
        <section className="pp-section">
          <div className="pp-section__title">Examples</div>
          {problem.examples.map((ex, i) => (
            <article className="pp-example" key={i}>
              <div className="pp-example__title">Example {i + 1}</div>
              {ex.input !== undefined && (
                <div className="pp-example__row">
                  <span className="pp-example__label">Input:</span>
                  <span className="pp-example__value">{fmtVal(ex.input)}</span>
                </div>
              )}
              {ex.output !== undefined && (
                <div className="pp-example__row">
                  <span className="pp-example__label">Output:</span>
                  <span className="pp-example__value">{fmtVal(ex.output)}</span>
                </div>
              )}
              {ex.explanation != null && ex.explanation !== '' ? <div className="pp-example__explanation">{fmtVal(ex.explanation)}</div> : null}
            </article>
          ))}
        </section>
      )}

      {problem.constraints?.length > 0 && (
        <section className="pp-section">
          <div className="pp-section__title">Constraints</div>
          <ul className="pp-list">
            {problem.constraints.map((c, i) => (<li className="pp-list__item" key={i}>{c}</li>))}
          </ul>
        </section>
      )}

      {problem.edge_cases?.length > 0 && (
        <section className="pp-section">
          <div className="pp-section__title">Edge Cases</div>
          <div className="pp-edges">
            <div className="pp-edges__header">⚠ Watch for</div>
            <div className="pp-edges__list">
              {problem.edge_cases.map((c, i) => (<div className="pp-edges__item" key={i}>{c}</div>))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ApproachView({ intuition, timeComplexity, spaceComplexity, language, code, hasCode }: {
  intuition: string; timeComplexity?: string; spaceComplexity?: string;
  language: LanguageId; code: string; hasCode: boolean;
}) {
  return (
    <div className="pp-approach">
      <div className="pp-approach__chips">
        {timeComplexity && <span className="pp-chip pp-chip--time">Time · {timeComplexity}</span>}
        {spaceComplexity && <span className="pp-chip pp-chip--space">Space · {spaceComplexity}</span>}
      </div>
      <div className="pp-section__title">Intuition</div>
      <div className="pp-prose" dangerouslySetInnerHTML={{ __html: renderProse(intuition || '_No description._') }} />
      <div className="pp-section__title" style={{ marginTop: 12 }}>Reference · {language}</div>
      {hasCode ? (
        <pre className="pp-codeblock">{code}</pre>
      ) : (
        <pre className="pp-codeblock pp-codeblock--empty">No reference snippet for this approach.</pre>
      )}
    </div>
  );
}

function ApproachesView({ problem, language }: { problem: ProblemDetail; language: LanguageId }) {
  const [tab, setTab] = useState<'brute' | 'optimal'>('optimal');
  const optimalCode = (problem.starter_code?.[language] ?? '').trim();
  return (
    <>
      <div className="pp-tabs" role="tablist" style={{ marginBottom: 12 }}>
        <button className={`pp-tab ${tab === 'brute' ? 'pp-tab--active' : ''}`} onClick={() => setTab('brute')}>Brute Force</button>
        <button className={`pp-tab ${tab === 'optimal' ? 'pp-tab--active' : ''}`} onClick={() => setTab('optimal')}>Optimal</button>
      </div>
      {tab === 'brute' ? (
        <ApproachView intuition={problem.approach_brute} language={language} code="" hasCode={false} />
      ) : (
        <ApproachView intuition={problem.approach_optimal} timeComplexity={problem.time_complexity} spaceComplexity={problem.space_complexity} language={language} code={optimalCode} hasCode={!!optimalCode} />
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true">
      <span className="pp-skel pp-skel--title" />
      <span className="pp-skel pp-skel--line" />
      <span className="pp-skel pp-skel--line" style={{ width: '90%' }} />
      <span className="pp-skel pp-skel--block" />
      <span className="pp-skel pp-skel--line" style={{ width: '60%' }} />
    </div>
  );
}

export default function LeftPane({ problem, loading, error, notFound, id, language }: {
  problem: ProblemDetail | null; loading: boolean; error: string | null;
  notFound: boolean; id: string; language: LanguageId;
}) {
  const [leftTab, setLeftTab] = useState<'description' | 'approaches'>('description');

  return (
    <section className="pp-pane" aria-label="Problem description">
      <div className="pp-tabs" role="tablist">
        <button className={`pp-tab ${leftTab === 'description' ? 'pp-tab--active' : ''}`} onClick={() => setLeftTab('description')}>Description</button>
        <button className={`pp-tab ${leftTab === 'approaches' ? 'pp-tab--active' : ''}`} onClick={() => setLeftTab('approaches')}>Approaches</button>
      </div>
      <div className="pp-left__body">
        {notFound ? (
          <div className="pp-error"><div className="pp-error__title">Problem not found</div><div className="pp-error__detail">No problem matches <code>{id}</code>.</div></div>
        ) : error ? (
          <div className="pp-error"><div className="pp-error__title">Couldn&apos;t load problem</div><div className="pp-error__detail">{error}</div></div>
        ) : loading || !problem ? (
          <Skeleton />
        ) : leftTab === 'description' ? (
          <DescriptionView problem={problem} />
        ) : (
          <ApproachesView problem={problem} language={language} />
        )}
      </div>
    </section>
  );
}
