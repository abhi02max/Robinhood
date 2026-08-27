// ============================================
// SQL PROBLEM — Problem Workspace
// /sql-track/:topic/:problemId → Editor + Execution + Diff
// ============================================

import { getSqlTopic, getSqlProblem, getSqlProblemsByTopic, SQL_TOPICS } from '../data/sql-registry.js';
import { initSqlEngine, executeQuery, validateResult, classifyRows } from '../data/sql-engine.js';
import { sqlStore } from '../data/sql-store.js';

let _sqlInstance = null;
let _currentProblemId = null;

export function renderSqlProblem(topicId, problemId) {
  const topic = getSqlTopic(topicId);
  const problem = getSqlProblem(problemId);

  if (!topic || !problem) {
    return `<div class="page-wrap"><h1>Problem not found</h1><a href="#/sql-track">← Back to SQL Track</a></div>`;
  }

  const problems = getSqlProblemsByTopic(topicId);
  const currentIdx = problems.findIndex(p => p.id === problemId);
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProblem = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;
  const status = sqlStore.getSqlProblemStatus(problemId);
  const lastQuery = sqlStore.getLastAttemptedQuery(problemId) || '';
  const tierLabel = problem.tier === 1 ? 'Beginner' : problem.tier === 2 ? 'Intermediate' : 'Advanced';

  // Parse schema to render tables
  const schemaTables = parseSchemaToTables(problem.schema);
  const schemaTablesHtml = schemaTables.map(t => renderSchemaTable(t)).join('');

  // Expected output preview
  const expectedPreview = problem.expectedRows.length <= 8
    ? renderDataTable(problem.expectedColumns, problem.expectedRows)
    : renderDataTable(problem.expectedColumns, problem.expectedRows.slice(0, 5)) +
      `<p class="sql-muted">${problem.expectedRows.length - 5} more rows...</p>`;

  // Hints
  const hintsHtml = problem.hints.map((h, i) => `
    <div class="sql-hint-item" id="sql-hint-${i}">
      <button class="sql-hint-toggle" data-hint-idx="${i}">
        💡 Show Hint ${i + 1}
      </button>
      <p class="sql-hint-text" style="display:none;">${escapeHtml(h)}</p>
    </div>
  `).join('');

  // Company tags
  const companyTags = problem.companies.map(c => `<span class="sql-company-mini">${c}</span>`).join('');

  // Navigation
  const navHtml = `
    <div class="sql-problem-nav">
      ${prevProblem ? `<button class="btn btn-xs btn-outline" data-sql-go="${topicId}/${prevProblem.id}">← Prev</button>` : '<span></span>'}
      <span class="sql-problem-position">Problem ${currentIdx + 1} of ${problems.length}</span>
      ${nextProblem ? `<button class="btn btn-xs btn-outline" data-sql-go="${topicId}/${nextProblem.id}">Next →</button>` : '<span></span>'}
    </div>
  `;

  return `
    <div class="sql-problem-page">
      <!-- Header -->
      <div class="sql-problem-header anim-fade-up">
        <div class="sql-problem-header-left">
          <a href="#/sql-track/${topicId}" class="sql-back-link">← ${topic.name}</a>
          <h1 class="sql-problem-title">${problem.title}</h1>
          <div class="sql-problem-meta">
            <span class="difficulty-badge difficulty-${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
            <span class="sql-tier-label tier-${problem.tier}">${tierLabel}</span>
            ${companyTags}
            <span class="sql-xp-pill">+${problem.xpReward} XP</span>
            ${status === 'solved' ? '<span class="sql-solved-badge">✓ Solved</span>' : ''}
          </div>
        </div>
        <div class="sql-problem-header-right">
          ${navHtml}
        </div>
      </div>

      <!-- Split Workspace -->
      <div class="sql-workspace anim-fade-up delay-1">
        <!-- Left: Problem Description -->
        <div class="sql-workspace-left">
          <div class="sql-workspace-panel">
            <h3 class="sql-panel-title">Problem</h3>
            <div class="sql-problem-description">${escapeHtml(problem.description)}</div>
          </div>

          <div class="sql-workspace-panel">
            <h3 class="sql-panel-title">Schema</h3>
            <div class="sql-schema-tables">
              ${schemaTablesHtml}
            </div>
          </div>

          <div class="sql-workspace-panel">
            <h3 class="sql-panel-title">Expected Output</h3>
            <div class="sql-expected-output">
              ${expectedPreview}
            </div>
          </div>

          <div class="sql-workspace-panel sql-hints-panel">
            <h3 class="sql-panel-title">Hints</h3>
            ${hintsHtml}
          </div>
        </div>

        <!-- Right: Editor + Results -->
        <div class="sql-workspace-right">
          <div class="sql-editor-panel">
            <div class="sql-editor-header">
              <h3 class="sql-panel-title">SQL Editor</h3>
              <span class="sql-editor-lang">SQLite</span>
            </div>
            <textarea 
              id="sql-editor-textarea" 
              class="sql-editor-textarea" 
              placeholder="Write your SQL query here..."
              spellcheck="false"
            >${escapeHtml(lastQuery)}</textarea>
            <div class="sql-editor-actions">
              <button class="btn btn-outline" id="sql-run-btn">▶ Run Query</button>
              <button class="btn btn-primary" id="sql-submit-btn">✓ Submit</button>
              <button class="btn btn-ghost" id="sql-clear-btn">Clear</button>
            </div>
          </div>

          <div class="sql-results-panel" id="sql-results-panel">
            <div class="sql-results-placeholder">
              <p>Run or submit your query to see results here.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sql-problem-footer anim-fade-up delay-2">
        ${navHtml}
      </div>
    </div>
  `;
}

export function initSqlProblem(topicId, problemId) {
  _currentProblemId = problemId;
  const problem = getSqlProblem(problemId);
  if (!problem) return;

  const editorEl = document.getElementById('sql-editor-textarea');
  const runBtn = document.getElementById('sql-run-btn');
  const submitBtn = document.getElementById('sql-submit-btn');
  const clearBtn = document.getElementById('sql-clear-btn');
  const resultsPanel = document.getElementById('sql-results-panel');

  if (!editorEl || !runBtn || !submitBtn) return;

  // Tab handling in textarea
  editorEl.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      editorEl.value = editorEl.value.substring(0, start) + '  ' + editorEl.value.substring(end);
      editorEl.selectionStart = editorEl.selectionEnd = start + 2;
    }
    // Ctrl+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runBtn.click();
    }
    // Ctrl+Shift+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      submitBtn.click();
    }
  });

  // Run button — execute without validation
  runBtn.addEventListener('click', async () => {
    const query = editorEl.value.trim();
    if (!query) {
      resultsPanel.innerHTML = renderErrorResult('Please enter a SQL query.');
      return;
    }

    // Save attempt
    sqlStore.saveSqlAttempt(problemId, query);

    runBtn.disabled = true;
    submitBtn.disabled = true;
    runBtn.textContent = '⏳ Running...';
    resultsPanel.innerHTML = '<div class="sql-loading-state"><div class="sql-spinner"></div><p>Executing query...</p></div>';

    try {
      const SQL = await loadSqlEngine();
      const result = executeQuery(SQL, problem.schema, query);

      if (result.error) {
        resultsPanel.innerHTML = renderErrorResult(result.error, problem);
      } else {
        resultsPanel.innerHTML = renderRunResult(result);
      }
    } catch (err) {
      resultsPanel.innerHTML = renderErrorResult(err.message);
    } finally {
      runBtn.disabled = false;
      submitBtn.disabled = false;
      runBtn.textContent = '▶ Run Query';
    }
  });

  // Submit button — execute + validate
  submitBtn.addEventListener('click', async () => {
    const query = editorEl.value.trim();
    if (!query) {
      resultsPanel.innerHTML = renderErrorResult('Please enter a SQL query.');
      return;
    }

    sqlStore.saveSqlAttempt(problemId, query);

    runBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Validating...';
    resultsPanel.innerHTML = '<div class="sql-loading-state"><div class="sql-spinner"></div><p>Running and validating...</p></div>';

    try {
      const SQL = await loadSqlEngine();
      const result = executeQuery(SQL, problem.schema, query);

      if (result.error) {
        resultsPanel.innerHTML = renderErrorResult(result.error, problem);
      } else {
        const expected = {
          columns: problem.expectedColumns,
          rows: problem.expectedRows,
        };
        const validation = validateResult(result, expected, problem.validationFlags || {});

        if (validation.passed) {
          sqlStore.markSqlProblemSolved(problemId, problem.xpReward);
          resultsPanel.innerHTML = renderPassResult(result, problem);
          // Update header badge
          const headerMeta = document.querySelector('.sql-problem-meta');
          if (headerMeta && !headerMeta.querySelector('.sql-solved-badge')) {
            headerMeta.insertAdjacentHTML('beforeend', '<span class="sql-solved-badge">✓ Solved</span>');
          }
        } else {
          resultsPanel.innerHTML = renderFailResult(result, expected, validation, problem);
        }
      }
    } catch (err) {
      resultsPanel.innerHTML = renderErrorResult(err.message);
    } finally {
      runBtn.disabled = false;
      submitBtn.disabled = false;
      submitBtn.textContent = '✓ Submit';
    }
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      editorEl.value = '';
      resultsPanel.innerHTML = '<div class="sql-results-placeholder"><p>Run or submit your query to see results here.</p></div>';
    });
  }

  // Hint toggles
  document.querySelectorAll('.sql-hint-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.hintIdx;
      const textEl = document.querySelector(`#sql-hint-${idx} .sql-hint-text`);
      if (textEl) {
        const isVisible = textEl.style.display !== 'none';
        textEl.style.display = isVisible ? 'none' : 'block';
        btn.textContent = isVisible ? `💡 Show Hint ${parseInt(idx) + 1}` : `💡 Hide Hint ${parseInt(idx) + 1}`;
      }
    });
  });

  // Navigation
  document.querySelectorAll('[data-sql-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/sql-track/${btn.dataset.sqlGo}`;
    });
  });

  // Lucide
  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  }
}

// ── SQL Engine Loader ─────────────────────

async function loadSqlEngine() {
  if (_sqlInstance) return _sqlInstance;
  _sqlInstance = await initSqlEngine();
  return _sqlInstance;
}

// ── Result Rendering ──────────────────────

function renderRunResult(result) {
  if (!result.columns.length) {
    return `
      <div class="sql-result-info">
        <p>Query executed successfully. No rows returned.</p>
        <span class="sql-exec-time">Execution: ${result.executionTimeMs}ms</span>
      </div>
    `;
  }

  return `
    <div class="sql-result-info">
      <span class="sql-result-badge sql-result-info-badge">ℹ Query Result</span>
      <span class="sql-exec-time">${result.executionTimeMs}ms · ${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}</span>
    </div>
    ${renderDataTable(result.columns, result.rows)}
  `;
}

function renderPassResult(result, problem) {
  const problems = getSqlProblemsByTopic(problem.topicId);
  const currentIdx = problems.findIndex(p => p.id === problem.id);
  const nextProblem = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;
  const dailyGoal = sqlStore.getDailyGoalStatus();

  let nextBtn = '';
  if (nextProblem) {
    nextBtn = `<button class="btn btn-primary" data-sql-go="${problem.topicId}/${nextProblem.id}">Next Problem →</button>`;
  } else {
    nextBtn = `<button class="btn btn-primary" onclick="window.location.hash='#/sql-track/${problem.topicId}'">Back to ${getSqlTopic(problem.topicId)?.name || 'Topic'}</button>`;
  }

  // Re-bind nav buttons after render
  setTimeout(() => {
    document.querySelectorAll('[data-sql-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = `#/sql-track/${btn.dataset.sqlGo}`;
      });
    });
  }, 50);

  return `
    <div class="sql-result-pass">
      <div class="sql-result-pass-header">
        <span class="sql-result-badge sql-result-pass-badge">✓ ALL TESTS PASSED</span>
        <span class="sql-exec-time">${result.executionTimeMs}ms · ${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}</span>
      </div>
      ${renderDataTable(result.columns, result.rows)}
      <div class="sql-result-pass-footer">
        <span class="sql-xp-earned">+${problem.xpReward} XP earned</span>
        <span class="sql-daily-update">${dailyGoal.completed ? '✓ Daily goal complete!' : `Today: ${dailyGoal.solved}/${dailyGoal.goal}`}</span>
        ${nextBtn}
      </div>
    </div>
  `;
}

function renderFailResult(result, expected, validation, problem) {
  const classification = classifyRows(result.rows, expected.rows);

  let diffHtml = '';

  // Your output with highlighting
  if (result.rows.length) {
    const yourRows = result.rows.map(row => {
      const serialized = row.map(c => c === null ? '__NULL__' : String(c).trim().toLowerCase()).join('|||');
      const expectedSerialized = expected.rows.map(r => r.map(c => c === null ? '__NULL__' : String(c).trim().toLowerCase()).join('|||'));
      const isMatched = expectedSerialized.includes(serialized);
      const rowClass = isMatched ? 'sql-diff-match' : 'sql-diff-extra';
      const indicator = isMatched ? '✓' : '⚠ Extra';
      const cells = row.map(cell => `<td>${cell === null ? '<span class="sql-null">NULL</span>' : escapeHtml(String(cell))}</td>`).join('');
      return `<tr class="${rowClass}">${cells}<td class="sql-diff-indicator">${indicator}</td></tr>`;
    }).join('');

    diffHtml += `
      <div class="sql-diff-section">
        <h4 class="sql-diff-title">Your Output</h4>
        <table class="sql-data-table sql-diff-table">
          <thead><tr>${result.columns.map(c => `<th>${escapeHtml(String(c))}</th>`).join('')}<th width="60"></th></tr></thead>
          <tbody>${yourRows}</tbody>
        </table>
      </div>
    `;
  }

  // Expected output with missing row highlights
  if (classification.missing.length) {
    const expectedRows = expected.rows.map(row => {
      const actualSerialized = result.rows.map(r => r.map(c => c === null ? '__NULL__' : String(c).trim().toLowerCase()).join('|||'));
      const serialized = row.map(c => c === null ? '__NULL__' : String(c).trim().toLowerCase()).join('|||');
      const isPresent = actualSerialized.includes(serialized);
      const rowClass = isPresent ? 'sql-diff-match' : 'sql-diff-missing';
      const indicator = isPresent ? '✓' : '✗ Missing';
      const cells = row.map(cell => `<td>${cell === null ? '<span class="sql-null">NULL</span>' : escapeHtml(String(cell))}</td>`).join('');
      return `<tr class="${rowClass}">${cells}<td class="sql-diff-indicator">${indicator}</td></tr>`;
    }).join('');

    diffHtml += `
      <div class="sql-diff-section">
        <h4 class="sql-diff-title">Expected Output</h4>
        <table class="sql-data-table sql-diff-table">
          <thead><tr>${expected.columns.map(c => `<th>${escapeHtml(String(c))}</th>`).join('')}<th width="60"></th></tr></thead>
          <tbody>${expectedRows}</tbody>
        </table>
      </div>
    `;
  }

  // Hint suggestion
  const hintBtns = problem.hints.map((_, i) =>
    `<button class="btn btn-xs btn-ghost sql-reveal-hint" data-reveal-hint="${i}">Show Hint ${i + 1}</button>`
  ).join(' ');

  // Re-bind hint buttons after render
  setTimeout(() => {
    document.querySelectorAll('.sql-reveal-hint').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.revealHint;
        const hintToggle = document.querySelector(`#sql-hint-${idx} .sql-hint-toggle`);
        if (hintToggle) hintToggle.click();
        // Scroll to hints
        const hintsPanel = document.querySelector('.sql-hints-panel');
        if (hintsPanel) hintsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }, 50);

  return `
    <div class="sql-result-fail">
      <div class="sql-result-fail-header">
        <span class="sql-result-badge sql-result-fail-badge">✗ RESULT MISMATCH</span>
        <span class="sql-fail-detail">${escapeHtml(validation.detail || '')}</span>
      </div>
      ${diffHtml}
      <div class="sql-result-fail-footer">
        ${hintBtns}
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('sql-editor-textarea').focus()">Try Again</button>
      </div>
    </div>
  `;
}

function renderErrorResult(errorMessage, problem) {
  // Try to extract helpful column hints from schema
  let schemaHint = '';
  if (problem && errorMessage.includes('no such column')) {
    const tables = parseSchemaToTables(problem.schema);
    const allCols = tables.flatMap(t => t.columns.map(c => `${t.name}.${c}`));
    schemaHint = `<p class="sql-error-hint">Available columns: ${allCols.join(', ')}</p>`;
  }

  return `
    <div class="sql-result-error">
      <div class="sql-result-error-header">
        <span class="sql-result-badge sql-result-error-badge">✗ SQL ERROR</span>
      </div>
      <pre class="sql-error-message">${escapeHtml(errorMessage)}</pre>
      ${schemaHint}
      <div class="sql-result-error-footer">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('sql-editor-textarea').focus()">Fix & Retry</button>
      </div>
    </div>
  `;
}

// ── Schema Parsing ────────────────────────

function parseSchemaToTables(schemaSQL) {
  const tables = [];
  const createRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^)]+)\)/gi;
  const insertRegex = /INSERT\s+INTO\s+(\w+)\s+VALUES\s*\(([^)]+)\)/gi;

  // Extract table definitions
  let match;
  while ((match = createRegex.exec(schemaSQL)) !== null) {
    const tableName = match[1];
    const colDefs = match[2].split(',').map(c => c.trim());
    const columns = colDefs.map(cd => cd.split(/\s+/)[0]).filter(c => c && c.toUpperCase() !== 'PRIMARY' && c.toUpperCase() !== 'FOREIGN');
    tables.push({ name: tableName, columns, rows: [] });
  }

  // Extract sample data
  while ((match = insertRegex.exec(schemaSQL)) !== null) {
    const tableName = match[1];
    const table = tables.find(t => t.name === tableName);
    if (table) {
      const values = parseInsertValues(match[2]);
      table.rows.push(values);
    }
  }

  return tables;
}

function parseInsertValues(valuesStr) {
  const result = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    if (inString) {
      if (ch === stringChar) {
        inString = false;
      }
      current += ch;
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ',') {
      result.push(parseValueToken(current.trim()));
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    result.push(parseValueToken(current.trim()));
  }
  return result;
}

function parseValueToken(token) {
  if (token.toUpperCase() === 'NULL') return null;
  if ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"'))) {
    return token.slice(1, -1);
  }
  const num = Number(token);
  if (!isNaN(num) && token !== '') return num;
  return token;
}

// ── Shared Helpers ────────────────────────

function renderSchemaTable(table) {
  const headerCells = table.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
  const bodyRows = table.rows.slice(0, 6).map(row => {
    const cells = row.map(cell => `<td>${cell === null ? '<span class="sql-null">NULL</span>' : escapeHtml(String(cell))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  const moreRows = table.rows.length > 6 ? `<tr><td colspan="${table.columns.length}" class="sql-muted">...${table.rows.length - 6} more rows</td></tr>` : '';

  return `
    <div class="sql-schema-block">
      <h4 class="sql-schema-name">${escapeHtml(table.name)}</h4>
      <table class="sql-data-table sql-schema-data">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}${moreRows}</tbody>
      </table>
    </div>
  `;
}

function renderDataTable(columns, rows) {
  if (!columns.length) return '<p class="sql-muted">No results</p>';
  const headerCells = columns.map(c => `<th>${escapeHtml(String(c))}</th>`).join('');
  const bodyRows = rows.map(row => {
    const cells = row.map(cell => `<td>${cell === null ? '<span class="sql-null">NULL</span>' : escapeHtml(String(cell))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <table class="sql-data-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default { renderSqlProblem, initSqlProblem };
