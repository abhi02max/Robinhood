import { debugSql, explainDebugger, runDebuggerCode, submitDebuggerCode } from './experience-api.js';

const DEBUGGER_FAILURE_CONTEXT_KEY = 'robinhood.debugger.failureContext';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTraceTimeline(payload) {
  const steps = Array.isArray(payload?.trace) ? payload.trace : [];
  const parsedError = payload?.parsedError || null;
  const frames = Array.isArray(parsedError?.frames) ? parsedError.frames : [];

  if (!steps.length && !frames.length && !payload?.output) {
    return '<div class="debugger-empty">No trace output captured for this run.</div>';
  }

  const timeline = steps.length
    ? `<div class="debugger-trace-timeline">${steps.map((step) => `
      <article class="debugger-trace-step">
        <div class="debugger-trace-step-index">${escapeHtml(step?.step ?? '-')}</div>
        <div class="debugger-trace-step-body">
          <div class="debugger-trace-step-content">${escapeHtml(step?.content || '(empty step)')}</div>
          ${step?.line != null ? `<div class="debugger-chip">Line ${escapeHtml(step.line)}</div>` : ''}
        </div>
      </article>
    `).join('')}</div>`
    : '';

  const stackFrames = frames.length
    ? `<div class="debugger-stack-list">${frames.slice(0, 8).map((frame) => `
      <div class="debugger-stack-frame">
        <div class="debugger-stack-function">${escapeHtml(frame?.functionName || 'anonymous')}</div>
        <div class="debugger-stack-location">${escapeHtml(frame?.fileName || 'unknown file')}:${escapeHtml(frame?.line || '?')}</div>
      </div>
    `).join('')}</div>`
    : '';

  const outputBlock = payload?.output
    ? `<pre class="debugger-pre">${escapeHtml(payload.output)}</pre>`
    : '';

  const statusPills = `
    <div class="debugger-pill-row">
      <span class="debugger-chip">status: ${escapeHtml(payload?.status || (payload?.success ? 'ok' : 'error'))}</span>
      ${payload?.durationMs != null ? `<span class="debugger-chip">duration: ${escapeHtml(payload.durationMs)} ms</span>` : ''}
      ${payload?.memoryBytes != null ? `<span class="debugger-chip">memory: ${escapeHtml(payload.memoryBytes)}</span>` : ''}
      ${payload?.exitCode != null ? `<span class="debugger-chip">exit: ${escapeHtml(payload.exitCode)}</span>` : ''}
    </div>
  `;

  return `
    ${statusPills}
    ${timeline}
    ${parsedError?.summary ? `<div class="debugger-error-banner">${escapeHtml(parsedError.summary)}</div>` : ''}
    ${stackFrames}
    ${!timeline && outputBlock ? outputBlock : ''}
  `;
}

function renderWatchPanel(payload) {
  const watchItems = Array.isArray(payload?.watch) ? payload.watch : [];
  if (!watchItems.length) {
    if (payload?.parsedError?.summary) {
      return `<div class="debugger-empty">Runtime error detected: ${escapeHtml(payload.parsedError.summary)}</div>`;
    }
    return '<div class="debugger-empty">No variable snapshots detected in this execution path.</div>';
  }

  return `<div class="debugger-watch-grid">${watchItems.slice(0, 20).map((item) => `
    <article class="debugger-watch-card">
      <div class="debugger-watch-title">${escapeHtml(item?.variable || 'var')}</div>
      <div class="debugger-watch-meta">line ${escapeHtml(item?.lineNumber ?? '?')}</div>
      <pre class="debugger-pre">${escapeHtml(item?.latestExpression || '')}</pre>
    </article>
  `).join('')}</div>`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderFailedCaseDiagnostics(payload) {
  const caseResults = Array.isArray(payload?.caseResults) ? payload.caseResults : [];
  const passed = toNumber(payload?.testCasesPassed ?? payload?.passed, 0);
  const totalFromPayload = toNumber(payload?.totalTestCases ?? payload?.total, caseResults.length);
  const total = totalFromPayload || caseResults.length || passed;
  const failedCases = caseResults.filter((item) => !item?.passed || toNumber(item?.statusId, 0) !== 3);

  if (!caseResults.length && payload?.error) {
    return `<div class="debugger-error-banner">${escapeHtml(payload.error)}</div>`;
  }

  if (!total && !failedCases.length) {
    return '<div class="debugger-empty">No testcase diagnostics available for this run.</div>';
  }

  const summaryClass = failedCases.length ? 'submission-summary warning' : 'submission-summary success';

  return `
    <div class="submission-breakdown">
      <div class="${summaryClass}">
        <span class="submission-summary-title">Submission Coverage</span>
        <span class="submission-summary-value">${escapeHtml(String(passed))}/${escapeHtml(String(total))} passed</span>
      </div>

      ${failedCases.length ? `<div class="submission-failed-list">${failedCases.slice(0, 6).map((item) => `
        <article class="submission-failed-case">
          <div class="submission-failed-head">
            <strong>Case ${escapeHtml(String(item?.index ?? '?'))}</strong>
            <span class="badge badge-hard">${escapeHtml(String(item?.statusDescription || 'Failed'))}</span>
          </div>
          <div class="submission-grid">
            <div><div class="problem-example-label">Input</div><pre>${escapeHtml(String(item?.input || '(empty input)'))}</pre></div>
            <div><div class="problem-example-label">Expected</div><pre>${escapeHtml(String(item?.expectedOutput || '(empty expected output)'))}</pre></div>
            <div><div class="problem-example-label">Actual</div><pre>${escapeHtml(String(item?.stdout || '(no stdout)'))}</pre></div>
            ${(item?.stderr || item?.compileOutput)
              ? `<div><div class="problem-example-label">Error</div><pre class="error">${escapeHtml(String(item?.stderr || item?.compileOutput || ''))}</pre></div>`
              : ''}
          </div>
        </article>
      `).join('')}</div>` : '<div class="debugger-empty">All submitted testcases passed.</div>'}
    </div>
  `;
}

export function renderDebuggerHub(params = {}) {
  const initialSql = String(params?.sql || '').trim();

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Debugger Studio</p>
          <h1>Trace, Watch, Explain, and Fix</h1>
          <p>Premium debugging experience with code trace, variable watch, AI explanations, and SQL validation.</p>
        </div>
      </header>

      <div class="debugger-issue-banner hidden" id="debugger-issue-banner" role="status" aria-live="polite"></div>

      <div class="experience-shell">
        <main class="experience-main">
          <div class="debugger-grid">
            <section class="card experience-panel">
              <h3><i data-lucide="terminal-square" width="16" height="16"></i> Code Trace Panel</h3>
              <label class="input-group">
                <span class="experience-label">Language</span>
                <select class="select" id="debugger-language">
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                </select>
              </label>
              <textarea id="debugger-code" class="input debugger-textarea" rows="8" placeholder="Paste code snippet to run trace..."></textarea>
              <button class="btn btn-primary" id="debugger-run">Run Trace</button>
              <div class="debugger-output" id="debugger-trace-output">Trace output appears here.</div>
            </section>

            <section class="card experience-panel">
              <h3><i data-lucide="binoculars" width="16" height="16"></i> Variable Watch Panel</h3>
              <div id="debugger-watch-output" class="debugger-output">Variable snapshots will be shown after trace execution.</div>
            </section>

            <section class="card experience-panel">
              <h3><i data-lucide="alert-octagon" width="16" height="16"></i> Error Explanation Panel</h3>
              <textarea id="debugger-error" class="input debugger-textarea" rows="4" placeholder="Paste runtime error stack here..."></textarea>
              <button class="btn btn-secondary" id="debugger-explain">Explain Error</button>
              <div class="debugger-output" id="debugger-error-output">Error explanation appears here.</div>
            </section>

            <section class="card experience-panel">
              <h3><i data-lucide="sparkles" width="16" height="16"></i> AI Explain Panel</h3>
              <div id="debugger-ai-output" class="debugger-output">AI insight summary appears here.</div>
            </section>

            <section class="card experience-panel sql-panel">
              <h3><i data-lucide="database-zap" width="16" height="16"></i> SQL Debug Panel</h3>
              <textarea id="debugger-sql" class="input debugger-textarea" rows="5" placeholder="SELECT * FROM users WHERE ...">${escapeHtml(initialSql)}</textarea>
              <button class="btn btn-primary" id="debugger-sql-run">Validate SQL</button>
              <div class="debugger-output" id="debugger-sql-output">SQL debug output appears here.</div>
            </section>

            <section class="card experience-panel sql-panel debugger-failed-panel">
              <h3><i data-lucide="test-tube-diagonal" width="16" height="16"></i> Failed Testcase Panel</h3>
              <div class="debugger-case-grid">
                <label class="input-group">
                  <span class="experience-label">Testcase Input</span>
                  <textarea id="debugger-case-input" class="input debugger-textarea" rows="3" placeholder="stdin or testcase input"></textarea>
                </label>
                <label class="input-group">
                  <span class="experience-label">Expected Output</span>
                  <textarea id="debugger-case-expected" class="input debugger-textarea" rows="3" placeholder="expected output"></textarea>
                </label>
              </div>
              <div class="flow-link-row" style="justify-content:flex-start;">
                <button class="btn btn-secondary btn-sm" id="debugger-case-add">Add Testcase</button>
                <button class="btn btn-primary btn-sm" id="debugger-case-run">Run Testcases</button>
              </div>
              <div class="debugger-output" id="debugger-case-list">No testcases added.</div>
              <div class="debugger-output" id="debugger-failed-output">Run testcase diagnostics to inspect failures.</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  `;
}

export function initDebuggerHub(params = {}) {
  const codeInput = document.getElementById('debugger-code');
  const languageInput = document.getElementById('debugger-language');
  const errorInput = document.getElementById('debugger-error');
  const sqlInput = document.getElementById('debugger-sql');
  const traceOutput = document.getElementById('debugger-trace-output');
  const watchOutput = document.getElementById('debugger-watch-output');
  const errorOutput = document.getElementById('debugger-error-output');
  const aiOutput = document.getElementById('debugger-ai-output');
  const sqlOutput = document.getElementById('debugger-sql-output');
  const testcaseInput = document.getElementById('debugger-case-input');
  const testcaseExpected = document.getElementById('debugger-case-expected');
  const testcaseAddBtn = document.getElementById('debugger-case-add');
  const testcaseRunBtn = document.getElementById('debugger-case-run');
  const testcaseList = document.getElementById('debugger-case-list');
  const failedOutput = document.getElementById('debugger-failed-output');
  const issueBanner = document.getElementById('debugger-issue-banner');

  const testcases = [];

  const setIssueBanner = (message, tone = 'warning') => {
    if (!issueBanner) return;
    if (!message) {
      issueBanner.classList.add('hidden');
      issueBanner.textContent = '';
      issueBanner.classList.remove('warning', 'danger', 'success');
      return;
    }
    issueBanner.classList.remove('hidden');
    issueBanner.classList.remove('warning', 'danger', 'success');
    issueBanner.classList.add(tone);
    issueBanner.textContent = message;
  };

  const focusFailedPanel = () => {
    const failedPanel = document.querySelector('.debugger-failed-panel');
    if (!failedPanel) return;
    failedPanel.classList.add('attention');
    failedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => {
      failedPanel.classList.remove('attention');
    }, 1800);
  };

  const isTraceFailure = (payload) => {
    const status = String(payload?.status || '').toLowerCase();
    if (payload?.success === false) return true;
    if (payload?.parsedError?.summary) return true;
    if (payload?.error || payload?.stderr) return true;
    if (status && status !== 'ok' && status !== 'success' && status !== 'passed') return true;
    if (payload?.exitCode != null && Number(payload.exitCode) !== 0) return true;
    return false;
  };

  const runErrorExplanation = async (errorMessage = '') => {
    if (!errorOutput || !aiOutput || !codeInput) return;
    const candidateError = String(errorMessage || errorInput?.value || '').trim();
    if (!candidateError) return;

    errorOutput.textContent = 'Explaining error...';
    aiOutput.textContent = 'Collecting AI insight...';
    try {
      const payload = await explainDebugger(candidateError, codeInput.value || '');
      const text = payload?.explanation || JSON.stringify(payload, null, 2);
      errorOutput.innerHTML = `<pre class="debugger-pre">${escapeHtml(text)}</pre>`;
      aiOutput.innerHTML = `<pre class="debugger-pre">${escapeHtml(text || 'No explanation returned.')}</pre>`;
    } catch (error) {
      errorOutput.innerHTML = `<div class="debugger-error-banner">${escapeHtml(error?.message || 'AI explanation failed')}</div>`;
    }
  };

  const runTestcaseDiagnostics = async ({ autoTriggered = false } = {}) => {
    if (!failedOutput || !codeInput) return;

    if (!testcases.length) {
      if (!autoTriggered) {
        failedOutput.innerHTML = '<div class="debugger-error-banner">Add at least one testcase before running diagnostics.</div>';
      }
      return;
    }

    failedOutput.innerHTML = '<div class="debugger-empty">Running testcase diagnostics...</div>';
    try {
      const payload = await submitDebuggerCode({
        language: languageInput?.value || 'python',
        code: codeInput.value || 'print("hello")',
        testCases: testcases.map((item) => ({
          input: item.input,
          output: item.expected,
        })),
      });

      failedOutput.innerHTML = renderFailedCaseDiagnostics(payload);

      const caseResults = Array.isArray(payload?.caseResults) ? payload.caseResults : [];
      const hasFailure = caseResults.some((item) => !item?.passed || Number(item?.statusId || 0) !== 3);
      if (hasFailure) {
        setIssueBanner('Failed testcases detected. Review highlighted cases and iterate quickly.', 'warning');
        focusFailedPanel();
      } else {
        setIssueBanner('All testcases passed in diagnostics.', 'success');
      }
    } catch (error) {
      failedOutput.innerHTML = `<div class="debugger-error-banner">${escapeHtml(error?.message || 'Failed testcase diagnostics failed')}</div>`;
      setIssueBanner('Unable to run testcase diagnostics. Validate code and try again.', 'danger');
    }
  };

  const renderCaseList = () => {
    if (!testcaseList) return;
    if (!testcases.length) {
      testcaseList.innerHTML = 'No testcases added.';
      return;
    }

    testcaseList.innerHTML = `
      <div class="debugger-watch-grid">
        ${testcases.map((item, index) => `
          <article class="debugger-watch-card">
            <div class="debugger-watch-title">Case ${index + 1}</div>
            <div class="debugger-watch-meta">Input</div>
            <pre class="debugger-pre">${escapeHtml(item.input)}</pre>
            <div class="debugger-watch-meta">Expected</div>
            <pre class="debugger-pre">${escapeHtml(item.expected)}</pre>
          </article>
        `).join('')}
      </div>
    `;
  };

  const addCaseFromInputs = () => {
    const input = String(testcaseInput?.value || '').trim();
    const expected = String(testcaseExpected?.value || '').trim();
    if (!input && !expected) {
      return false;
    }
    testcases.push({ input, expected });
    if (testcaseInput) testcaseInput.value = '';
    if (testcaseExpected) testcaseExpected.value = '';
    renderCaseList();
    return true;
  };

  const runBtn = document.getElementById('debugger-run');
  if (runBtn && codeInput && traceOutput && watchOutput) {
    runBtn.addEventListener('click', async () => {
      setIssueBanner('');
      traceOutput.textContent = 'Running trace...';
      watchOutput.textContent = 'Watching variables...';
      try {
        const payload = await runDebuggerCode({
          code: codeInput.value || 'print("hello")',
          language: languageInput?.value || 'python',
        });

        traceOutput.innerHTML = renderTraceTimeline(payload);
        watchOutput.innerHTML = renderWatchPanel(payload);

        if (isTraceFailure(payload)) {
          const summary = String(
            payload?.parsedError?.summary
            || payload?.error
            || payload?.stderr
            || 'Execution reported issues. Review diagnostics.'
          );

          if (errorInput && !errorInput.value.trim()) {
            errorInput.value = summary;
          }

          setIssueBanner('Issue detected during trace. Auto-running explanation and diagnostics.', 'warning');
          await runErrorExplanation(summary);
          if (testcases.length) {
            await runTestcaseDiagnostics({ autoTriggered: true });
          } else {
            focusFailedPanel();
          }
        }
      } catch (error) {
        traceOutput.innerHTML = `<div class="debugger-error-banner">${escapeHtml(error?.message || 'Trace run failed')}</div>`;
        watchOutput.innerHTML = '<div class="debugger-empty">Variable watch unavailable due to run failure.</div>';
        setIssueBanner('Trace execution failed. Check runtime details and retry.', 'danger');
      }
    });
  }

  const explainBtn = document.getElementById('debugger-explain');
  if (explainBtn && errorInput && codeInput && errorOutput && aiOutput) {
    explainBtn.addEventListener('click', async () => {
      await runErrorExplanation(errorInput.value || 'RuntimeError: unknown');
    });
  }

  const sqlBtn = document.getElementById('debugger-sql-run');
  if (sqlBtn && sqlInput && sqlOutput) {
    sqlBtn.addEventListener('click', async () => {
      sqlOutput.textContent = 'Validating SQL...';
      try {
        const payload = await debugSql(sqlInput.value || 'SELECT 1;');
        sqlOutput.innerHTML = `<pre class="debugger-pre">${escapeHtml(payload?.explanation || JSON.stringify(payload, null, 2))}</pre>`;
      } catch (error) {
        sqlOutput.innerHTML = `<div class="debugger-error-banner">${escapeHtml(error?.message || 'SQL debug failed')}</div>`;
      }
    });
  }

  if (testcaseAddBtn) {
    testcaseAddBtn.addEventListener('click', () => {
      addCaseFromInputs();
    });
  }

  if (testcaseRunBtn && failedOutput && codeInput) {
    testcaseRunBtn.addEventListener('click', async () => {
      addCaseFromInputs();
      await runTestcaseDiagnostics();
    });
  }

  try {
    const rawFailureContext = sessionStorage.getItem(DEBUGGER_FAILURE_CONTEXT_KEY);
    if (rawFailureContext) {
      const parsed = JSON.parse(rawFailureContext);
      if (parsed?.language && languageInput) {
        languageInput.value = parsed.language;
      }
      if (parsed?.code && codeInput && !codeInput.value.trim()) {
        codeInput.value = String(parsed.code);
      }
      if (parsed?.error && errorInput && !errorInput.value.trim()) {
        errorInput.value = String(parsed.error);
      }

      const incomingCases = Array.isArray(parsed?.testCases) ? parsed.testCases : [];
      incomingCases.slice(0, 8).forEach((item) => {
        const input = String(item?.input || '').trim();
        const expected = String(item?.output || item?.expected || '').trim();
        if (!input && !expected) return;
        testcases.push({ input, expected });
      });
      renderCaseList();

      setIssueBanner('Loaded failure context from your latest unsuccessful run.', 'warning');
      sessionStorage.removeItem(DEBUGGER_FAILURE_CONTEXT_KEY);

      if (String(params?.autostart || '').trim() === '1') {
        if (testcases.length) {
          runTestcaseDiagnostics({ autoTriggered: true });
        } else if (errorInput?.value) {
          runErrorExplanation(errorInput.value);
        }
      }
    }
  } catch (_) {}

  if (sqlInput) {
    const sqlPrefill = String(params?.sql || '').trim();
    if (sqlPrefill && !sqlInput.value.trim()) {
      sqlInput.value = sqlPrefill;
    }
    if (String(params?.panel || '').trim().toLowerCase() === 'sql') {
      sqlInput.focus();
    }
  }

  if (String(params?.panel || '').trim().toLowerCase() === 'failed') {
    focusFailedPanel();
    setIssueBanner('Failure diagnostics panel is active. Run trace or testcase checks to continue.', 'warning');
  }

  renderCaseList();

  window.lucide?.createIcons();
}
