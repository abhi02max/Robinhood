import store from '../../store.js';
import { showToast } from '../../components/notifications.js';
import {
  getProblemState,
  getTestData,
  trackDisposer,
  getCurrentLanguage,
  initializeTimerUi,
  toggleProblemTimer,
  resetProblemTimer,
  setTimerTargetMinutes,
  setSqlMonacoEditor,
  getSqlMonacoEditor,
  setSqlRunning,
  isSqlRunning,
} from './problem-state.js';
import {
  updateEditorLanguage,
  resetEditorToTemplate,
  updateEditorFontSize,
} from './problem-editor.js';
import { runCurrentProblem, submitCurrentProblem } from './problem-runner.js';
import { getDebuggerFailureRoute } from '../../data/product-flow.js';
import {
  escapeHtml,
  SQL_SCHEMA_TABLES,
  SQL_SCHEMA_COLUMNS,
} from './problem-ui-renderer.js';

const NOOP = () => {};
let sqlCompletionRegistered = false;
let sqlEditorInitSequence = 0;

function addTrackedListener(target, eventName, handler, options) {
  if (!target?.addEventListener) return;
  target.addEventListener(eventName, handler, options);
  trackDisposer(() => target.removeEventListener(eventName, handler, options));
}

function getSqlEditorValue() {
  const sqlEditor = getSqlMonacoEditor();
  if (sqlEditor) return sqlEditor.getValue();
  return document.getElementById('sql-editor-fallback')?.value || '';
}

function setSqlEditorValue(value) {
  const sqlEditor = getSqlMonacoEditor();
  if (sqlEditor) {
    sqlEditor.setValue(value);
    return;
  }

  const fallback = document.getElementById('sql-editor-fallback');
  if (fallback) fallback.value = value;
}

function renderSqlResult(result) {
  if (!result) return '<div style="color:var(--danger);font-size:13px;">No result.</div>';
  if (result.error) {
    return `<div style="color:var(--danger);font-size:13px;background:rgba(255,0,0,0.07);padding:8px;border-radius:6px;">${escapeHtml(result.error)}</div>`;
  }

  const rows = Array.isArray(result.output) ? result.output : [];
  const fields = result.fields || (rows[0] ? Object.keys(rows[0]) : []);
  if (!fields.length) return '<div style="color:var(--text-4);font-size:13px;">No columns returned.</div>';

  let html = '<div style="max-height:260px;overflow:auto;border-radius:6px;border:1px solid var(--border-1);margin-bottom:6px;">';
  html += '<table class="sql-result-table" style="border-collapse:collapse;width:100%;font-size:13px;">';
  html += '<thead><tr>' + fields.map((field) => `<th style="position:sticky;top:0;background:var(--surface-2);border-bottom:1px solid #ddd;padding:4px 8px;text-align:left;z-index:1;">${escapeHtml(field)}</th>`).join('') + '</tr></thead>';
  html += '<tbody>';

  if (rows.length) {
    html += rows.map((row) => '<tr>' + fields.map((field) => `<td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(String(row[field] ?? ''))}</td>`).join('') + '</tr>').join('');
  } else {
    html += `<tr><td colspan="${fields.length}" style="color:var(--text-4);font-style:italic;padding:12px;text-align:center;">No rows returned.</td></tr>`;
  }

  html += '</tbody></table></div>';
  html += `<div style="font-size:12px;color:var(--text-3);display:flex;gap:16px;align-items:center;"><span>${rows.length} row${rows.length === 1 ? '' : 's'}</span>${typeof result.executionTime !== 'undefined' ? `<span>Execution time: ${result.executionTime} ms</span>` : ''}</div>`;
  return html;
}

function renderSchemaTables() {
  return SQL_SCHEMA_TABLES
    .map((table) => `<button class="sql-schema-table" data-table="${table}" style="text-align:left;background:transparent;border:1px solid var(--border-1);padding:6px 8px;border-radius:6px;color:var(--text-2);cursor:pointer;">${escapeHtml(table)}</button>`)
    .join('');
}

async function renderSchemaTableDetails(table) {
  const columns = SQL_SCHEMA_COLUMNS[table] || [];
  const detailsNode = document.getElementById('sql-schema-table-details');
  if (!detailsNode) return;

  detailsNode.innerHTML = `
    <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(table)}</div>
    <div style="margin-bottom:6px;font-size:12px;color:var(--text-3);">Columns: ${escapeHtml(columns.join(', '))}</div>
    <div id="sql-schema-sample-rows" style="font-size:12px;color:var(--text-2);background:var(--surface-1);border-radius:4px;padding:6px;">Loading sample rows...</div>
  `;

  try {
    const response = await fetch('/api/execute/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `SELECT * FROM ${table} LIMIT 3;` }),
    });

    const payload = await response.json();
    const outputNode = document.getElementById('sql-schema-sample-rows');
    if (!outputNode) return;

    const rows = Array.isArray(payload.output) ? payload.output : [];
    if (!rows.length) {
      outputNode.innerHTML = '<span style="color:var(--text-4);font-style:italic;">No sample rows.</span>';
      return;
    }

    const fields = payload.fields || Object.keys(rows[0]);
    let tableHtml = '<table style="font-size:12px;width:100%;border-collapse:collapse;">';
    tableHtml += '<thead><tr>' + fields.map((field) => `<th style="border-bottom:1px solid #eee;padding:2px 4px;text-align:left;">${escapeHtml(field)}</th>`).join('') + '</tr></thead>';
    tableHtml += '<tbody>' + rows.map((row) => '<tr>' + fields.map((field) => `<td style="border-bottom:1px solid #f3f3f3;padding:2px 4px;">${escapeHtml(String(row[field] ?? ''))}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    outputNode.innerHTML = tableHtml;
  } catch (error) {
    const outputNode = document.getElementById('sql-schema-sample-rows');
    if (outputNode) outputNode.innerHTML = '<span style="color:var(--danger);">Failed to load sample rows.</span>';
  }
}

function initSqlSchemaPanel() {
  const tablesNode = document.getElementById('sql-schema-tables');
  if (!tablesNode) return;

  if (tablesNode.dataset.bound === '1') {
    return;
  }

  tablesNode.dataset.bound = '1';
  tablesNode.innerHTML = renderSchemaTables();

  const clickHandler = (event) => {
    const target = event.target.closest('[data-table]');
    if (!target) return;
    const table = target.getAttribute('data-table');
    if (table) renderSchemaTableDetails(table);
  };
  addTrackedListener(tablesNode, 'click', clickHandler);

  if (SQL_SCHEMA_TABLES[0]) {
    renderSchemaTableDetails(SQL_SCHEMA_TABLES[0]);
  }
}

function initSqlMonacoEditor() {
  const container = document.getElementById('sql-monaco-container');
  if (!container) return;

  const existingEditor = getSqlMonacoEditor();
  if (existingEditor) {
    const domNode = existingEditor.getDomNode?.();
    if (domNode && container.contains(domNode)) {
      existingEditor.layout?.();
      return;
    }
    setSqlMonacoEditor(null);
  }

  const initSequence = ++sqlEditorInitSequence;

  if (!window.require) {
    container.innerHTML = '<textarea id="sql-editor-fallback" class="input" style="width:100%;height:100%;font-family:var(--font-mono);">SELECT * FROM employees;</textarea>';
    return;
  }

  window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
  window.require(['vs/editor/editor.main'], () => {
    if (initSequence !== sqlEditorInitSequence) return;
    if (!container.isConnected || !document.body.contains(container)) return;
    if (!window._currentProblemId) return;

    const model = window.monaco.editor.createModel('SELECT * FROM employees;', 'sql');
    const editor = window.monaco.editor.create(container, {
      model,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs',
      fontSize: 14,
      minimap: { enabled: false },
      automaticLayout: true,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    });

    if (!sqlCompletionRegistered) {
      sqlCompletionRegistered = true;
      window.monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: () => ({
          suggestions: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'COUNT', 'AVG', 'SUM', 'MIN', 'MAX']
            .map((keyword) => ({
              label: keyword,
              kind: window.monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
            })),
        }),
      });
    }

    setSqlMonacoEditor(editor);
    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => {
      window._runSqlQuery?.();
    });
  });
}

async function runSqlQuery() {
  if (isSqlRunning()) return;
  setSqlRunning(true);

  const sql = getSqlEditorValue();
  const panel = document.getElementById('sql-result-panel');
  const runButton = document.getElementById('run-sql-btn');
  const spinner = document.getElementById('sql-spinner');

  if (runButton) runButton.disabled = true;
  if (spinner) spinner.style.display = '';

  try {
    const response = await fetch('/api/execute/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });

    const payload = await response.json();
    window._sqlResult = payload;
    if (panel) panel.innerHTML = renderSqlResult(payload);
  } catch (error) {
    if (panel) {
      panel.innerHTML = `<div style="color:var(--danger);font-size:13px;">${escapeHtml(error?.message || 'Failed to execute SQL query.')}</div>`;
    }
  } finally {
    if (runButton) runButton.disabled = false;
    if (spinner) spinner.style.display = 'none';
    setSqlRunning(false);
  }
}

function clearSqlResult() {
  const panel = document.getElementById('sql-result-panel');
  if (panel) {
    panel.innerHTML = '<span style="color:var(--text-4);font-style:italic;font-size:12px;">Query results will appear here.</span>';
  }
  window._sqlResult = null;
}

function switchConsoleTab(tab) {
  const tabs = ['testcases', 'output', 'performance', 'sql'];
  tabs.forEach((name) => {
    document.getElementById(`tab-${name}`)?.classList.remove('active');
    document.getElementById(`console-${name}`)?.classList.add('hidden');
  });

  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.getElementById(`console-${tab}`)?.classList.remove('hidden');

  if (tab === 'sql') {
    initSqlMonacoEditor();
    initSqlSchemaPanel();
  }
}

function switchTestCase(index) {
  const { uiCases } = getTestData();
  if (index < 0 || index >= uiCases.length) return;

  document.querySelectorAll('.testcase-label').forEach((label, position) => {
    label.classList.toggle('active', position === index);
  });

  const textarea = document.getElementById('testcase-input');
  if (textarea) textarea.value = uiCases[index]?.input || '';
}

function toggleFullscreen() {
  const panel = document.querySelector('.problem-detail-right');
  if (!panel) return;
  panel.classList.toggle('fullscreen');
  const editor = getProblemState().monacoEditor;
  editor?.layout?.();
}

function setWindowBindings(problem) {
  window._switchTestCase = switchTestCase;
  window._switchConsoleTab = switchConsoleTab;
  window._runSqlQuery = runSqlQuery;
  window._clearSqlResult = clearSqlResult;
  window._runCode = () => runCurrentProblem(problem);
  window._submitCode = () => submitCurrentProblem(problem);
  window._invokeRunCode = () => runCurrentProblem(problem);
  window._invokeSubmitCode = () => submitCurrentProblem(problem);
  window._resetCode = () => resetEditorToTemplate(problem);
  window._toggleFullscreen = toggleFullscreen;
  window._changeFontSize = (size) => updateEditorFontSize(size);
  window._toggleProblemTimer = toggleProblemTimer;
  window._resetProblemTimer = resetProblemTimer;
  window._applyProblemTimerTarget = () => {
    const minutes = Number(document.getElementById('problem-timer-target-input')?.value || 0);
    setTimerTargetMinutes(minutes);
    showToast(`Timer target set to ${minutes} min`, 'info');
  };
}

export function resetWindowBindings() {
  sqlEditorInitSequence += 1;

  const fallbackBindings = {
    _switchTestCase: NOOP,
    _switchConsoleTab: NOOP,
    _runSqlQuery: NOOP,
    _clearSqlResult: NOOP,
    _runCode: NOOP,
    _submitCode: NOOP,
    _invokeRunCode: NOOP,
    _invokeSubmitCode: NOOP,
    _resetCode: NOOP,
    _toggleFullscreen: NOOP,
    _changeFontSize: NOOP,
    _toggleProblemTimer: NOOP,
    _resetProblemTimer: NOOP,
    _applyProblemTimerTarget: NOOP,
  };

  Object.entries(fallbackBindings).forEach(([name, handler]) => {
    window[name] = handler;
  });

  delete window._sqlResult;
}

export function bindProblemDetailEvents(problem) {
  setWindowBindings(problem);
  initializeTimerUi();

  const languageSelect = document.getElementById('lang-select');
  const fontSelect = document.getElementById('font-select');
  const runButton = document.getElementById('problem-run-btn');
  const submitButton = document.getElementById('problem-submit-btn');
  const resetButton = document.getElementById('problem-reset-btn');
  const fullscreenButton = document.getElementById('problem-fullscreen-btn');
  const saveNoteButton = document.getElementById('save-problem-note-btn');
  const bookmarkButton = document.getElementById('bookmark-btn');
  const debuggerButton = document.getElementById('problem-open-debugger-btn');
  const themeButton = document.getElementById('workspace-theme-btn');
  const helpButton = document.getElementById('problem-help-btn');

  if (languageSelect) {
    addTrackedListener(languageSelect, 'change', (event) => {
      updateEditorLanguage(problem, event.target.value);
    });
  }

  if (fontSelect) {
    addTrackedListener(fontSelect, 'change', (event) => {
      updateEditorFontSize(event.target.value);
    });
  }

  if (runButton) addTrackedListener(runButton, 'click', () => runCurrentProblem(problem));
  if (submitButton) addTrackedListener(submitButton, 'click', () => submitCurrentProblem(problem));
  if (resetButton) addTrackedListener(resetButton, 'click', () => resetEditorToTemplate(problem));
  if (fullscreenButton) addTrackedListener(fullscreenButton, 'click', toggleFullscreen);

  if (saveNoteButton) {
    addTrackedListener(saveNoteButton, 'click', () => {
      const note = document.getElementById('problem-notes')?.value || '';
      store.setProblemNote(problem.id, note);
      showToast('Notes saved.', 'success');
    });
  }

  if (bookmarkButton) {
    addTrackedListener(bookmarkButton, 'click', () => {
      store.toggleBookmark(problem.id);
      const iconName = store.isBookmarked(problem.id) ? 'bookmark-check' : 'bookmark';
      bookmarkButton.innerHTML = `<i data-lucide="${iconName}" width="16" height="16"></i>`;
      showToast(store.isBookmarked(problem.id) ? 'Bookmarked.' : 'Bookmark removed.', 'info');
      window.lucide?.createIcons({ nodes: [bookmarkButton] });
    });
  }

  if (debuggerButton) {
    addTrackedListener(debuggerButton, 'click', () => {
      window.navigateTo(getDebuggerFailureRoute({ autostart: true, source: 'problem-detail' }));
    });
  }

  if (themeButton) {
    addTrackedListener(themeButton, 'click', () => {
      const next = store.toggleTheme();
      document.documentElement.setAttribute('data-theme', next);
      window.monaco?.editor?.setTheme(next === 'dark' ? 'vs-dark' : 'vs');
      showToast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info');
    });
  }

  if (helpButton) {
    addTrackedListener(helpButton, 'click', () => {
      document.getElementById('ask-robin-fab')?.click();
    });
  }

  const labelsNode = document.getElementById('testcase-labels');
  if (labelsNode) {
    addTrackedListener(labelsNode, 'click', (event) => {
      const target = event.target.closest('.testcase-label');
      if (!target) return;
      const index = Number(target.getAttribute('data-case'));
      if (!Number.isFinite(index)) return;
      switchTestCase(index);
    });
  }

  const tabsNode = document.getElementById('problem-console-tabs');
  if (tabsNode) {
    addTrackedListener(tabsNode, 'click', (event) => {
      const tabButton = event.target.closest('[data-tab]');
      if (!tabButton) return;
      const tab = tabButton.getAttribute('data-tab');
      if (tab) switchConsoleTab(tab);
    });
  }

  const timerToggleButton = document.getElementById('problem-timer-btn');
  const timerResetButton = document.getElementById('problem-timer-reset-btn');
  const timerApplyButton = document.getElementById('problem-timer-apply-btn');

  if (timerToggleButton) addTrackedListener(timerToggleButton, 'click', toggleProblemTimer);
  if (timerResetButton) addTrackedListener(timerResetButton, 'click', resetProblemTimer);
  if (timerApplyButton) {
    addTrackedListener(timerApplyButton, 'click', () => {
      const minutes = Number(document.getElementById('problem-timer-target-input')?.value || 0);
      setTimerTargetMinutes(minutes);
      showToast(`Timer target set to ${minutes} min`, 'info');
    });
  }

  const sqlRunButton = document.getElementById('run-sql-btn');
  const sqlClearButton = document.getElementById('clear-sql-btn');
  if (sqlRunButton) addTrackedListener(sqlRunButton, 'click', runSqlQuery);
  if (sqlClearButton) addTrackedListener(sqlClearButton, 'click', clearSqlResult);

  switchConsoleTab('testcases');
  switchTestCase(0);
  setSqlEditorValue('SELECT * FROM employees;');
  window.lucide?.createIcons();
}
