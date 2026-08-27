import React, { useState, useMemo } from 'react';

/* ─── helpers ─── */
const diffColor = d =>
  d === 'Easy'   ? { bg: 'rgba(16,185,129,.12)', fg: '#34d399' } :
  d === 'Medium' ? { bg: 'rgba(245,158,11,.12)', fg: '#fbbf24' } :
                   { bg: 'rgba(244,63,94,.12)',  fg: '#fb7185' };

/* ═══════════════ ROOT ═══════════════ */
export const ProblemLayout = ({ problemData }) => {
  const [tab, setTab] = useState('problem');
  const tabs = ['problem', 'code', 'explanation', 'submissions'];

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0f172a', color:'#e2e8f0', fontFamily:"'Inter',system-ui,sans-serif", overflow:'hidden' }}>
      {/* LEFT PANE */}
      <div style={{ width:'50%', display:'flex', flexDirection:'column', borderRight:'1px solid #1e293b' }}>
        <TabBar tabs={tabs} active={tab} onChange={setTab} />
        <div style={{ flex:1, overflowY:'auto', padding:'2rem 2.25rem' }}>
          {tab === 'problem'     && <ProblemTab data={problemData} />}
          {tab === 'code'        && <CodeTab data={problemData} />}
          {tab === 'explanation' && <ExplanationTab data={problemData} />}
          {tab === 'submissions' && <SubmissionsTab />}
        </div>
      </div>
      {/* RIGHT PANE */}
      <div style={{ width:'50%', display:'flex', flexDirection:'column', background:'#020617' }}>
        <EditorPane data={problemData} />
      </div>
    </div>
  );
};

/* ─── Tab Bar ─── */
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display:'flex', gap:'0.25rem', padding:'0.75rem 1.5rem 0', borderBottom:'1px solid #1e293b', background:'#0f172a' }}>
    {tabs.map(t => (
      <button key={t} onClick={() => onChange(t)} style={{
        padding:'0.6rem 1.25rem', border:'none', cursor:'pointer',
        background: active===t ? 'transparent' : 'transparent',
        color: active===t ? '#34d399' : '#94a3b8',
        fontWeight: active===t ? 700 : 500, fontSize:'0.8rem',
        textTransform:'capitalize', letterSpacing:'0.02em',
        borderBottom: active===t ? '2px solid #34d399' : '2px solid transparent',
        transition:'all .2s',
      }}>{t}</button>
    ))}
  </div>
);

/* ═══════════════ PROBLEM TAB ═══════════════ */
const ProblemTab = ({ data }) => {
  const dc = diffColor(data.difficulty);
  return (
    <div>
      {/* Title + Meta */}
      <h1 style={{ fontSize:'1.65rem', fontWeight:800, margin:'0 0 0.75rem', color:'#f8fafc', lineHeight:1.3 }}>{data.title}</h1>
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.75rem' }}>
        <span style={{ padding:'0.3rem 0.75rem', borderRadius:6, fontSize:'0.7rem', fontWeight:700, background:dc.bg, color:dc.fg }}>{data.difficulty}</span>
        {data.topic && <MetaTag label={data.topic} color="#818cf8" />}
        {data.pattern && <MetaTag label={data.pattern} color="#38bdf8" />}
        {(data.tags||[]).filter(t=>t.type==='Company').slice(0,3).map((t,i) =>
          <MetaTag key={i} label={t.value} color="#94a3b8" />
        )}
      </div>

      {/* Description */}
      <Section title="Description">
        <div style={{ fontSize:'0.9rem', lineHeight:1.8, color:'#cbd5e1', whiteSpace:'pre-wrap' }}>{data.description}</div>
      </Section>

      {/* Examples */}
      <Section title="Examples">
        {(data.examples||[]).map((ex, i) => (
          <div key={i} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'1.25rem', marginBottom:'0.75rem' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'0.6rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Example {i+1}</div>
            <pre style={{ margin:0, fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:'0.82rem', lineHeight:1.7 }}>
              <span style={{ color:'#64748b' }}>Input:  </span><span style={{ color:'#e2e8f0' }}>{ex.input}</span>{'\n'}
              <span style={{ color:'#64748b' }}>Output: </span><span style={{ color:'#34d399' }}>{ex.output}</span>
            </pre>
            {ex.explanation && (
              <div style={{ marginTop:'0.75rem', padding:'0.75rem 1rem', background:'#0f172a', borderRadius:8, fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.6, borderLeft:'3px solid #334155' }}>
                <span style={{ fontWeight:600, color:'#cbd5e1' }}>Explanation: </span>{ex.explanation}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* Constraints */}
      <Section title="Constraints">
        <div style={{ background:'#1e293b', borderRadius:10, padding:'1rem 1.25rem', border:'1px solid #334155' }}>
          {(data.constraints||[]).map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.35rem 0', fontSize:'0.82rem' }}>
              <span style={{ color:'#f59e0b', fontSize:'0.6rem' }}>●</span>
              <code style={{ fontFamily:"'JetBrains Mono',monospace", color:'#cbd5e1' }}>{c}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* Edge Cases */}
      <Section title="Edge Cases">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
          {(data.edge_cases||[]).map((e, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.65rem 1rem', background:'rgba(251,146,60,.06)', border:'1px solid rgba(251,146,60,.15)', borderRadius:8, fontSize:'0.78rem', color:'#fdba74' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {e}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ═══════════════ EXPLANATION TAB ═══════════════ */
const ExplanationTab = ({ data }) => (
  <div>
    {/* Brute Force */}
    <div style={{ marginBottom:'2rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1rem' }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(251,113,133,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#f8fafc' }}>Brute Force Approach</h2>
      </div>
      <ApproachCard
        text={data.approach_brute}
        time={data.time_complexity?.brute}
        space={data.space_complexity?.brute}
        accent="#fb7185"
        bgAccent="rgba(251,113,133,.06)"
      />
    </div>

    {/* Optimal */}
    <div style={{ marginBottom:'2rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1rem' }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(52,211,153,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#f8fafc' }}>Optimized Approach</h2>
      </div>
      <ApproachCard
        text={data.approach_optimal}
        time={data.time_complexity?.optimal}
        space={data.space_complexity?.optimal}
        accent="#34d399"
        bgAccent="rgba(52,211,153,.06)"
      />
    </div>

    {/* Complexity Comparison */}
    <Section title="Complexity Comparison">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
        <ComplexityCard label="Brute Force" time={data.time_complexity?.brute} space={data.space_complexity?.brute} muted />
        <ComplexityCard label="Optimal" time={data.time_complexity?.optimal} space={data.space_complexity?.optimal} />
      </div>
    </Section>
  </div>
);

const ApproachCard = ({ text, time, space, accent, bgAccent }) => {
  const lines = (text||'').split('\n').filter(Boolean);
  return (
    <div style={{ background:bgAccent, border:`1px solid ${accent}22`, borderRadius:12, padding:'1.5rem' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize:'0.85rem', lineHeight:1.8, color:'#cbd5e1', marginBottom:'0.3rem' }}>
          {line.match(/^\d+\./) ? (
            <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
              <span style={{ minWidth:22, height:22, borderRadius:'50%', background:`${accent}20`, color:accent, fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', marginTop:2 }}>
                {line.match(/^(\d+)/)?.[1]}
              </span>
              <span>{line.replace(/^\d+\.\s*/, '')}</span>
            </div>
          ) : (
            <div style={{ fontWeight: line.startsWith('**') ? 700 : 400, color: line.startsWith('**') ? '#f8fafc' : '#cbd5e1' }}>
              {line.replace(/\*\*/g, '')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ComplexityCard = ({ label, time, space, muted }) => (
  <div style={{ background: muted ? '#1e293b' : 'rgba(52,211,153,.06)', border:`1px solid ${muted ? '#334155' : 'rgba(52,211,153,.15)'}`, borderRadius:10, padding:'1.25rem' }}>
    <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: muted ? '#64748b' : '#34d399', marginBottom:'0.75rem' }}>{label}</div>
    <div style={{ display:'flex', gap:'1.5rem' }}>
      <div>
        <div style={{ fontSize:'0.65rem', color:'#64748b', marginBottom:'0.2rem' }}>TIME</div>
        <code style={{ fontSize:'0.85rem', fontWeight:600, color: muted ? '#94a3b8' : '#fbbf24', fontFamily:"'JetBrains Mono',monospace" }}>{time||'—'}</code>
      </div>
      <div>
        <div style={{ fontSize:'0.65rem', color:'#64748b', marginBottom:'0.2rem' }}>SPACE</div>
        <code style={{ fontSize:'0.85rem', fontWeight:600, color: muted ? '#94a3b8' : '#34d399', fontFamily:"'JetBrains Mono',monospace" }}>{space||'—'}</code>
      </div>
    </div>
  </div>
);

/* ═══════════════ CODE TAB ═══════════════ */
const CodeTab = ({ data }) => (
  <div>
    <Section title="Starter Code">
      <div style={{ background:'#020617', border:'1px solid #1e293b', borderRadius:10, padding:'1.25rem', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.8rem', color:'#34d399', lineHeight:1.8, whiteSpace:'pre' }}>
{`/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Write your solution here

}`}
      </div>
    </Section>
    <Section title="Hints">
      <div style={{ padding:'1rem 1.25rem', background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.15)', borderRadius:10, fontSize:'0.82rem', color:'#a5b4fc', lineHeight:1.7 }}>
        Think about what data structure can help you track characters you&apos;ve already seen in the current window. How can you efficiently shrink the window when a duplicate is found?
      </div>
    </Section>
  </div>
);

/* ═══════════════ SUBMISSIONS TAB ═══════════════ */
const SubmissionsTab = () => (
  <div>
    <Section title="Submission History">
      <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" style={{ margin:'0 auto 1rem' }}><path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <div style={{ color:'#64748b', fontSize:'0.9rem', fontWeight:500 }}>No submissions yet</div>
        <div style={{ color:'#475569', fontSize:'0.78rem', marginTop:'0.3rem' }}>Submit your solution to see results here</div>
      </div>
    </Section>
  </div>
);

/* ═══════════════ EDITOR PANE (RIGHT) ═══════════════ */
const EditorPane = ({ data }) => {
  const visible = useMemo(() => (data.test_cases||[]).filter(tc => !tc.is_hidden), [data.test_cases]);
  const hiddenCount = useMemo(() => (data.test_cases||[]).filter(tc => tc.is_hidden).length, [data.test_cases]);
  const [activeCase, setActiveCase] = useState(0);
  const [lang, setLang] = useState('javascript');

  return (
    <>
      {/* Editor Toolbar */}
      <div style={{ height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', borderBottom:'1px solid #1e293b', background:'#0f172a' }}>
        <select value={lang} onChange={e=>setLang(e.target.value)} style={{ background:'#1e293b', color:'#e2e8f0', border:'1px solid #334155', borderRadius:6, padding:'0.3rem 0.6rem', fontSize:'0.78rem', cursor:'pointer' }}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python 3</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
          <span style={{ fontSize:'0.7rem', color:'#475569' }}>Auto-save</span>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#34d399' }} />
        </div>
      </div>

      {/* Code Area */}
      <div style={{ flex:1, padding:'1.25rem', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.82rem', color:'#34d399', lineHeight:1.8, overflowY:'auto', whiteSpace:'pre' }}>
{`/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Write your code here
    
};`}
      </div>

      {/* Test Cases Panel */}
      <div style={{ borderTop:'1px solid #1e293b', background:'#0f172a' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 1rem', borderBottom:'1px solid #1e293b' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0' }}>Testcases</span>
            <span style={{ fontSize:'0.65rem', padding:'0.15rem 0.5rem', background:'rgba(52,211,153,.1)', color:'#34d399', borderRadius:20, fontWeight:600 }}>{visible.length} visible</span>
            <span style={{ fontSize:'0.65rem', padding:'0.15rem 0.5rem', background:'rgba(100,116,139,.1)', color:'#64748b', borderRadius:20, fontWeight:600 }}>{hiddenCount} hidden</span>
          </div>
        </div>

        {/* Case Tabs */}
        <div style={{ display:'flex', gap:'0.25rem', padding:'0.5rem 1rem', overflowX:'auto' }}>
          {visible.map((_, i) => (
            <button key={i} onClick={() => setActiveCase(i)} style={{
              padding:'0.4rem 0.85rem', border:'none', borderRadius:6, cursor:'pointer',
              background: activeCase===i ? '#334155' : 'transparent',
              color: activeCase===i ? '#e2e8f0' : '#64748b',
              fontSize:'0.75rem', fontWeight:600, transition:'all .15s',
            }}>Case {i+1}</button>
          ))}
        </div>

        {/* Active Case Detail */}
        {visible[activeCase] && (
          <div style={{ padding:'0.75rem 1rem', maxHeight:120, overflowY:'auto' }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'0.3rem' }}>INPUT</div>
            <code style={{ fontSize:'0.78rem', color:'#cbd5e1', fontFamily:"'JetBrains Mono',monospace", wordBreak:'break-all' }}>
              {JSON.stringify(visible[activeCase].input_payload)}
            </code>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'0.5rem', marginBottom:'0.3rem' }}>EXPECTED</div>
            <code style={{ fontSize:'0.78rem', color:'#34d399', fontFamily:"'JetBrains Mono',monospace" }}>
              {JSON.stringify(visible[activeCase].expected_output)}
            </code>
          </div>
        )}

        {/* Execution Controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'0.6rem', padding:'0.6rem 1rem', borderTop:'1px solid #1e293b' }}>
          <button style={{ padding:'0.5rem 1.25rem', background:'#1e293b', color:'#e2e8f0', border:'1px solid #334155', borderRadius:8, fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
            Run
          </button>
          <button style={{ padding:'0.5rem 1.25rem', background:'#059669', color:'#fff', border:'none', borderRadius:8, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(5,150,105,.3)' }}>
            Submit
          </button>
        </div>
      </div>
    </>
  );
};

/* ─── Shared UI Atoms ─── */
const Section = ({ title, children }) => (
  <div style={{ marginBottom:'2rem' }}>
    <h3 style={{ fontSize:'0.85rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>{title}</h3>
    {children}
  </div>
);

const MetaTag = ({ label, color }) => (
  <span style={{ padding:'0.25rem 0.65rem', borderRadius:6, fontSize:'0.68rem', fontWeight:600, background:`${color}12`, color, border:`1px solid ${color}22` }}>{label}</span>
);

export default ProblemLayout;
