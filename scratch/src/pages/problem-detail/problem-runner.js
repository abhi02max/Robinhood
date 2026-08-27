import store from '../../store.js';
import { showToast } from '../../components/notifications.js';
import { escapeHtml } from './problem-ui-renderer.js';
import {
  EXECUTION_LANGUAGES,
  normalizeExecutionLanguage,
} from './problem-template-resolver.js';
import {
  getCurrentLanguage,
  getTestData,
} from './problem-state.js';
import {
  getCurrentEditorCode,
  saveCurrentEditorCode,
} from './problem-editor.js';
import { getDebuggerFailureRoute } from '../../data/product-flow.js';

const EXECUTION_MAX_RETRY_ATTEMPTS = 3;
const EXECUTION_MAX_BACKOFF_SECONDS = 12;
const DEBUGGER_FAILURE_CONTEXT_KEY = 'robinhood.debugger.failureContext';
let executionRequestInFlight = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(response, payload, fallbackSeconds = 2) {
  const headerValue = Number(response?.headers?.get('retry-after') || 0);
  if (Number.isFinite(headerValue) && headerValue > 0) {
    return Math.ceil(headerValue);
  }

  const payloadValue = Number(payload?.retryAfter || 0);
  if (Number.isFinite(payloadValue) && payloadValue > 0) {
    return Math.ceil(payloadValue);
  }

  return Math.max(1, Number(fallbackSeconds || 1));
}

function setExecutionButtonsLocked(locked, { mode = 'run', label = '' } = {}) {
  const runButton = document.getElementById('problem-run-btn');
  const submitButton = document.getElementById('problem-submit-btn');
  const buttons = [runButton, submitButton].filter(Boolean);

  buttons.forEach((button) => {
    if (!button.dataset.defaultHtml) {
      button.dataset.defaultHtml = button.innerHTML;
    }
    button.disabled = locked;
  });

  if (!locked) {
    buttons.forEach((button) => {
      if (button.dataset.defaultHtml) {
        button.innerHTML = button.dataset.defaultHtml;
      }
    });
    if (window.lucide) window.lucide.createIcons({ nodes: buttons });
    return;
  }

  const activeButton = mode === 'submit' ? submitButton : runButton;
  if (activeButton) {
    const nextLabel = label || (mode === 'submit' ? 'Submitting...' : 'Running...');
    activeButton.innerHTML = `<span>${escapeHtml(nextLabel)}</span>`;
  }
}

async function runCountdown(seconds, onTick) {
  const total = Math.max(1, Number(seconds || 1));
  for (let left = total; left >= 1; left -= 1) {
    onTick?.(left);
    await sleep(1000);
  }
}

async function postExecutionWithRetry({ endpoint, token, payload, mode, outputNode }) {
  for (let attempt = 1; attempt <= EXECUTION_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      return { response, result };
    }

    const shouldRetry = attempt < EXECUTION_MAX_RETRY_ATTEMPTS && (response.status === 429 || response.status >= 500);
    if (!shouldRetry) {
      return { response, result };
    }

    const retryAfterSeconds = parseRetryAfterSeconds(
      response,
      result,
      Math.min(EXECUTION_MAX_BACKOFF_SECONDS, 2 ** (attempt - 1)),
    );
    const waitSeconds = Math.min(
      EXECUTION_MAX_BACKOFF_SECONDS,
      Math.max(retryAfterSeconds, 2 ** (attempt - 1)),
    );

    showToast(
      response.status === 429
        ? `Execution rate-limited. Retrying in ${waitSeconds}s.`
        : `Execution service recovering. Retrying in ${waitSeconds}s.`,
      response.status === 429 ? 'warning' : 'info',
    );

    await runCountdown(waitSeconds, (secondsLeft) => {
      setExecutionButtonsLocked(true, {
        mode,
        label: `Retry in ${secondsLeft}s...`,
      });

      if (outputNode) {
        outputNode.innerHTML = `
          <div style="font-weight:700;font-size:16px;color:var(--warning);margin-bottom:8px;">Execution Delayed</div>
          <div style="color:var(--text-2);">Retrying in ${secondsLeft}s (attempt ${attempt}/${EXECUTION_MAX_RETRY_ATTEMPTS})...</div>
        `;
      }
    });
  }

  return {
    response: { ok: false, status: 503, headers: { get: () => null } },
    result: { reason: 'Execution service unavailable.' },
  };
}

function inferExecutionStatus(result, mode) {
  if (!result || typeof result !== 'object') return 'error';

  // Problem-aware façade returns a direct `status` field
  if (result.status) {
    const st = String(result.status).toLowerCase();
    if (st === 'accepted' || st === 'no tests') return 'success';
    if (st.includes('wrong') || st.includes('fail')) return 'warning';
    if (st.includes('runtime') || st.includes('compilation') || st.includes('time limit')) return 'warning';
  }

  if (result.verdict) {
    const verdict = String(result.verdict).toLowerCase();
    if (verdict.includes('accepted') || verdict.includes('pass')) return 'success';
    if (verdict.includes('wrong') || verdict.includes('fail')) return 'warning';
    return 'info';
  }

  if (mode === 'submit') {
    return result.passed === true || result.passed === result.total ? 'success' : 'warning';
  }

  if (result.stderr || result.error) return 'warning';
  return 'success';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSubmissionCounts(result) {
  return {
    passed: toNumber(result?.passedCount ?? result?.testCasesPassed ?? result?.passed, 0),
    total: toNumber(result?.total ?? result?.totalTestCases, 0),
  };
}

function getFailedCaseResults(result) {
  // Façade returns `results[]` with per-test-case detail
  if (Array.isArray(result?.results)) {
    return result.results.filter((item) => !item.passed);
  }
  // Legacy path returns `caseResults[]`
  const caseResults = Array.isArray(result?.caseResults) ? result.caseResults : [];
  return caseResults.filter((item) => {
    const statusId = toNumber(item?.statusId, 0);
    const passed = Boolean(item?.passed);
    return !passed || statusId !== 3;
  });
}

function persistDebuggerFailureContext({ language, code, result, tests }) {
  try {
    const failedCases = getFailedCaseResults(result).map((item) => ({
      input: String(item?.input || ''),
      output: String(item?.expectedOutput || ''),
    })).filter((item) => item.input || item.output);

    const fallbackCases = (tests?.prebuilt || []).map((item) => ({
      input: String(item?.input || ''),
      output: String(item?.expected || ''),
    })).filter((item) => item.input || item.output);

    const context = {
      source: 'problem-submit',
      createdAt: new Date().toISOString(),
      language,
      code,
      error: String(result?.stderr || result?.error || result?.reason || result?.verdict || '').trim(),
      testCases: (failedCases.length ? failedCases : fallbackCases).slice(0, 8),
    };

    sessionStorage.setItem(DEBUGGER_FAILURE_CONTEXT_KEY, JSON.stringify(context));
  } catch (_) {}
}

function renderFailedCasePanel(result) {
  const { passed, total } = getSubmissionCounts(result);
  const failedCases = getFailedCaseResults(result);
  const failedPreview = failedCases.slice(0, 5);
  const hasSummary = total > 0;

  if (!hasSummary && !failedPreview.length) {
    return '';
  }

  const summaryTone = failedPreview.length ? 'submission-summary warning' : 'submission-summary success';

  return `
    <section class="submission-breakdown">
      <div class="${summaryTone}">
        <span class="submission-summary-title">Submission Coverage</span>
        <span class="submission-summary-value">${escapeHtml(String(passed))}/${escapeHtml(String(total || passed))} passed</span>
      </div>
      ${failedPreview.length ? `<div class="submission-failed-list">${failedPreview.map((item) => {
        const caseIndex = toNumber(item?.index, 0);
        const title = `Case ${caseIndex > 0 ? caseIndex : '?'}`;
        const status = item?.statusDescription || 'Failed';
        const input = item?.input ? (typeof item.input === 'object' ? JSON.stringify(item.input) : String(item.input)) : '(empty input)';
        const expected = item?.expected ? (typeof item.expected === 'object' ? JSON.stringify(item.expected) : String(item.expected)) : (item?.expectedOutput || '(empty expected output)');
        const actual = item?.actual != null ? (typeof item.actual === 'object' ? JSON.stringify(item.actual) : String(item.actual)) : (item?.stdout || '(no stdout)');
        const error = item?.stderr || item?.error_kind || item?.compileOutput || '';

        return `
          <article class="submission-failed-case">
            <div class="submission-failed-head">
              <strong>${escapeHtml(title)}</strong>
              <span class="badge badge-hard">${escapeHtml(String(status))}</span>
            </div>
            <div class="submission-grid">
              <div><div class="problem-example-label">Input</div><pre>${escapeHtml(String(input))}</pre></div>
              <div><div class="problem-example-label">Expected</div><pre>${escapeHtml(String(expected))}</pre></div>
              <div><div class="problem-example-label">Actual</div><pre>${escapeHtml(String(actual))}</pre></div>
              ${error ? `<div><div class="problem-example-label">Error</div><pre class="error">${escapeHtml(String(error))}</pre></div>` : ''}
            </div>
          </article>
        `;
      }).join('')}</div>` : ''}
      ${failedCases.length > failedPreview.length ? `<div class="submission-note">Showing ${failedPreview.length} of ${failedCases.length} failed cases.</div>` : ''}
    </section>
  `;
}

function renderPostProblemFeedback(result, context) {
  const status = inferExecutionStatus(result, context.mode);
  const failedCases = getFailedCaseResults(result).length;
  const readiness = Number(store.getReadinessScore?.() || 0);
  const mastery = Number(store.getMasteryPercent?.() || 0);
  const consistency = Number(store.getConsistencyScore?.() || 0);
  const passPct = Number(context?.submissionSummary?.passPct || 0);
  const improvementPct = Number(context?.submissionSummary?.improvementPct || 0);
  const personalized = store.getPersonalizedRecommendations?.() || { recommendations: [] };
  const nextMove = personalized.recommendations?.[1] || personalized.recommendations?.[0] || null;

  let insight = 'Solid momentum. Keep repeating this solve pattern in a new category.';
  if (status !== 'success' && failedCases > 0) {
    insight = `You missed ${failedCases} testcase${failedCases === 1 ? '' : 's'}. Focus on edge-case handling and rerun diagnostics.`;
  } else if (status !== 'success' && (result?.stderr || result?.error)) {
    insight = 'Main blocker is runtime/compile reliability. Add guards, validate input paths, and rerun quickly.';
  } else if (status === 'success' && context.mode === 'submit') {
    const improvementLabel = improvementPct > 0
      ? `Coverage improved by +${Math.round(improvementPct)}%.`
      : improvementPct < 0
        ? `Coverage dipped ${Math.round(Math.abs(improvementPct))}%. Tighten your edge-case handling.`
        : 'Coverage is stable from your last best run.';
    insight = `Great submission at ${Math.round(passPct)}% testcase coverage. ${improvementLabel} Capture this pattern and move to a harder variation next.`;
  }

  const toneClass = status === 'success' ? 'badge-success' : status === 'warning' ? 'badge-medium' : 'badge-hard';

  return `
    <section style="border:1px solid var(--border-1);background:var(--surface-2);border-radius:var(--radius-md);padding:10px;display:grid;gap:10px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span class="badge ${toneClass}">Post-Problem Feedback</span>
        <span class="badge badge-secondary">Readiness ${escapeHtml(String(readiness))}%</span>
        <span class="badge badge-secondary">Mastery ${escapeHtml(String(mastery))}%</span>
        <span class="badge badge-secondary">Consistency ${escapeHtml(String(consistency))}%</span>
        ${context.mode === 'submit' ? `<span class="badge badge-secondary">Coverage ${escapeHtml(String(Math.round(passPct)))}%</span>` : ''}
        ${context.mode === 'submit' ? `<span class="badge ${improvementPct >= 0 ? 'badge-success' : 'badge-hard'}">Improvement ${improvementPct >= 0 ? '+' : ''}${escapeHtml(String(Math.round(improvementPct)))}%</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text-2);line-height:1.6;">${escapeHtml(insight)}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, readiness))}%;"></div></div>
      ${nextMove ? `<div class="flow-link-row" style="justify-content:flex-start;"><button class="btn btn-secondary btn-sm" onclick="navigateTo('${escapeHtml(nextMove.route)}')">${escapeHtml(nextMove.title)}</button></div>` : ''}
    </section>
  `;
}

function renderExecutionResultPanel(result, context) {
  const status = inferExecutionStatus(result, context.mode);
  const statusColor = status === 'success' ? 'var(--success)' : status === 'warning' ? 'var(--warning)' : 'var(--danger)';
  const headline = status === 'success' ? 'Execution Successful' : status === 'warning' ? 'Execution Completed With Issues' : 'Execution Failed';
  const shouldSuggestDebugger = context.mode === 'submit' && status !== 'success';
  const debuggerRoute = getDebuggerFailureRoute({ autostart: true, source: 'problem-submit' });

  const verdict = result?.status || result?.verdict || (result?.passed === true || result?.passed === result?.total ? 'Accepted' : context.mode === 'submit' ? 'Not Accepted' : 'Executed');
  const stdout = result?.stdout ?? result?.output ?? '';
  const stderr = result?.stderr ?? result?.error ?? '';
  const runtime = result?.executionTime ?? result?.runtimeMs ?? result?.time ?? null;
  const memory = result?.memory ?? result?.memoryMb ?? null;

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="font-weight:700;font-size:18px;color:${statusColor};">${escapeHtml(headline)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="badge">Mode: ${escapeHtml(context.mode)}</span>
        <span class="badge">Verdict: ${escapeHtml(String(verdict))}</span>
        ${runtime != null ? `<span class="badge">Runtime: ${escapeHtml(String(runtime))} ms</span>` : ''}
        ${memory != null ? `<span class="badge">Memory: ${escapeHtml(String(memory))}</span>` : ''}
      </div>
      ${context.mode === 'run' ? `<div><strong>Input:</strong> ${escapeHtml(context.testInput || '')}</div>` : ''}
      ${context.mode === 'run' ? `<div><strong>Expected:</strong> ${escapeHtml(context.expectedOutput || 'N/A')}</div>` : ''}
      ${context.mode === 'submit' ? renderFailedCasePanel(result) : ''}
      ${renderPostProblemFeedback(result, context)}
      ${shouldSuggestDebugger ? `<div class="flow-link-row" style="justify-content:flex-start;"><button class="btn btn-secondary btn-sm" onclick="navigateTo('${debuggerRoute}')">Open in Debugger</button></div>` : ''}
      <div>
        <div class="problem-example-label">Output</div>
        <pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;color:var(--text-2);background:var(--surface-inset);padding:12px;border-radius:var(--radius-md);">${escapeHtml(String(stdout || '(no output)'))}</pre>
      </div>
      ${stderr ? `<div><div class="problem-example-label">Errors</div><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;color:var(--danger);background:var(--surface-inset);padding:12px;border-radius:var(--radius-md);">${escapeHtml(String(stderr))}</pre></div>` : ''}
    </div>
  `;
}

function renderPerformanceSummary(result) {
  const node = document.getElementById('console-performance');
  if (!node) return;
  const runtime = result?.runtimeMs ?? result?.executionTime ?? result?.time ?? 'N/A';
  const memory = result?.memory ?? result?.memoryMb ?? 'N/A';
  const verdict = result?.verdict || (result?.passed ? 'Accepted' : 'Processed');
  node.innerHTML = `
    <div class="perf-insights">
      <div class="perf-insights-header">Performance Summary</div>
      <div class="perf-metrics-grid">
        <div class="perf-metric"><div class="perf-metric-label">Runtime</div><div class="perf-metric-value">${escapeHtml(String(runtime))}</div></div>
        <div class="perf-metric"><div class="perf-metric-label">Memory</div><div class="perf-metric-value">${escapeHtml(String(memory))}</div></div>
      </div>
      <div class="perf-complexity"><div class="perf-complexity-item"><div class="perf-complexity-label">Verdict</div><div class="perf-complexity-value">${escapeHtml(String(verdict))}</div></div></div>
    </div>
  `;
}

function switchToOutputTab() {
  window._switchConsoleTab?.('output');
}

export async function executeCodeViaApi({ problem, mode = 'run' }) {
  if (!problem?.id) return;

  if (executionRequestInFlight) {
    showToast('Execution already in progress. Please wait.', 'info');
    return;
  }

  const outputNode = document.getElementById('console-output');
  const { uiCases, tests } = getTestData();
  const testInput = document.getElementById('testcase-input')?.value || '';
  const activeCase = uiCases.find((item) => item.input === testInput) || uiCases[0] || {};
  const expectedOutput = activeCase.expected || '';
  const code = getCurrentEditorCode();
  const language = normalizeExecutionLanguage(getCurrentLanguage());

  if (!EXECUTION_LANGUAGES.includes(language)) {
    const message = `Unsupported language: ${language}`;
    showToast(message, 'error');
    if (outputNode) {
      outputNode.innerHTML = `<div style="font-weight:700;font-size:18px;color:var(--danger);margin-bottom:10px;">Execution Failed</div><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;color:var(--text-2);background:var(--surface-inset);padding:12px;border-radius:var(--radius-md);">${escapeHtml(message)}</pre>`;
    }
    switchToOutputTab();
    return;
  }

  const endpoint = mode === 'submit' ? '/api/execute/submit' : '/api/execute/run';
  const token = store.getSessionToken?.();

  // Detect if this problem has a UUID (DB-backed) — use problem-aware path
  const hasDbProblemId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(problem.id || '');

  let payload;
  if (hasDbProblemId) {
    // Problem-aware façade path: server fetches test cases from DB
    payload = {
      language,
      code,
      problemId: problem.id,
    };
  } else {
    // Legacy path: send stdin / testCases directly
    payload = {
      language,
      code,
      stdin: mode === 'run' ? testInput : undefined,
      testCases: mode === 'submit'
        ? (tests.prebuilt || []).map((item) => ({ input: item.input, output: item.expected }))
        : undefined,
    };
  }

  executionRequestInFlight = true;
  setExecutionButtonsLocked(true, { mode });

  try {
    if (outputNode) {
      outputNode.innerHTML = `<div style="color:var(--text-3);font-style:italic;">${mode === 'submit' ? 'Submitting code...' : 'Running code...'}</div>`;
    }

    const { response, result } = await postExecutionWithRetry({
      endpoint,
      token,
      payload,
      mode,
      outputNode,
    });

    if (!response.ok || !result) {
      let reason = result?.error || result?.reason || 'Code execution failed.';
      if (response.status === 429) {
        const retryAfter = parseRetryAfterSeconds(response, result, 1);
        reason = `${reason} Retry in ${retryAfter}s.`;
      }
      if (outputNode) {
        outputNode.innerHTML = `<div style="font-weight:700;font-size:18px;color:var(--danger);margin-bottom:10px;">Execution Failed</div><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;color:var(--text-2);background:var(--surface-inset);padding:12px;border-radius:var(--radius-md);">${escapeHtml(reason)}</pre>`;
      }
      showToast(reason, 'error');
      switchToOutputTab();
      return;
    }

    const executionStatus = inferExecutionStatus(result, mode);
    let submissionSummary = null;
    if (mode === 'submit') {
      const submissionCounts = getSubmissionCounts(result);
      submissionSummary = store.recordSubmissionResult?.(problem.id, {
        passed: submissionCounts.passed,
        total: submissionCounts.total || submissionCounts.passed,
        mode,
      });

      if (executionStatus === 'success') {
        store.solveProblem?.(problem.id, problem?.difficulty || 'Medium', {
          language,
          code,
          countAsSolve: true,
          improvementPct: Number(submissionSummary?.improvementPct || 0),
        });
      }
    }

    if (outputNode) {
      outputNode.innerHTML = renderExecutionResultPanel(result, {
        mode,
        testInput,
        expectedOutput,
        problemId: problem.id,
        submissionSummary,
      });
    }

    renderPerformanceSummary(result);
    saveCurrentEditorCode(problem, code);
    switchToOutputTab();
    window.lucide?.createIcons();

    if (mode === 'submit' && executionStatus !== 'success') {
      persistDebuggerFailureContext({
        language,
        code,
        result,
        tests,
      });
      showToast('Submission failed. Opening debugger with failed cases...', 'warning');
      window.setTimeout(() => {
        window.navigateTo?.(getDebuggerFailureRoute({ autostart: true, source: 'problem-submit' }));
      }, 180);
    }
  } catch (error) {
    const message = error?.message || 'Execution service unavailable.';
    if (outputNode) {
      outputNode.innerHTML = `<div style="font-weight:700;font-size:18px;color:var(--danger);margin-bottom:10px;">Execution Error</div><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;color:var(--text-2);background:var(--surface-inset);padding:12px;border-radius:var(--radius-md);">${escapeHtml(message)}</pre>`;
    }
    showToast('Execution service unavailable.', 'error');
    switchToOutputTab();
  } finally {
    executionRequestInFlight = false;
    setExecutionButtonsLocked(false, { mode });
  }
}

export async function runCurrentProblem(problem) {
  await executeCodeViaApi({ problem, mode: 'run' });
}

export async function submitCurrentProblem(problem) {
  await executeCodeViaApi({ problem, mode: 'submit' });
}
