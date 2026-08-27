import store from '../../store.js';
import CATEGORIES from '../../data/categories.js';
import { robinhoodBrandMark } from '../../components/brand.js';
import { getProblemVisualization } from '../../components/dsa-visuals.js';
import { renderAskRobinFab, renderAskRobinPanel } from '../../components/ask-robin.js';
import { buildProblemSignatures } from './problem-template-resolver.js';
import { getProblemContent } from '../../data/problem-content/index.js';
import { generateHiddenTests } from '../../data/problem-content/test-case-generator.js';

export const SQL_SCHEMA_TABLES = ['employees', 'departments', 'orders', 'customers', 'products'];

export const SQL_SCHEMA_COLUMNS = {
  employees: ['id', 'name', 'salary', 'department_id'],
  departments: ['id', 'name'],
  orders: ['id', 'customer_id', 'product_id', 'quantity', 'order_date'],
  customers: ['id', 'name', 'email'],
  products: ['id', 'name', 'price'],
};

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTests(problem, examples) {
  const category = String(problem?.category || '').toLowerCase();
  const difficulty = String(problem?.difficulty || 'Medium').toLowerCase();

  const defaultPrebuilt = examples.map((example, index) => ({
    id: `example-${index + 1}`,
    input: String(example.input || ''),
    expected: String(example.output || ''),
    note: String(example.explanation || `Example ${index + 1}`),
  }));

  const hiddenSeeds = {
    arrays: [
      { input: 'nums = []', expected: 'Handle empty array', note: 'Empty input edge case' },
      { input: 'nums = [0]', expected: 'Single element result', note: 'Single value path' },
    ],
    strings: [
      { input: 's = ""', expected: 'Handle empty string', note: 'Empty string edge case' },
      { input: 's = "aaaa"', expected: 'Repeated character handling', note: 'Duplicate pattern check' },
    ],
    tree: [
      { input: 'root = []', expected: 'Handle null root', note: 'Null tree path' },
      { input: 'root = [1]', expected: 'Single node result', note: 'Single node tree' },
    ],
  };

  let bucket = hiddenSeeds.arrays;
  if (category.includes('string')) bucket = hiddenSeeds.strings;
  if (category.includes('tree') || category.includes('bst')) bucket = hiddenSeeds.tree;

  const difficultyExtra = difficulty === 'hard'
    ? [{ input: 'n = 100000', expected: 'Within limits', note: 'Stress constraint case' }]
    : [];

  return {
    prebuilt: defaultPrebuilt,
    hidden: [...bucket, ...difficultyExtra],
  };
}

function buildExamples(problem) {
  if (Array.isArray(problem?.examples) && problem.examples.length) {
    return problem.examples;
  }

  const title = problem?.title || 'this problem';
  return [
    {
      input: 'input = [1, 2, 3]',
      output: 'Expected output for sample input',
      explanation: `Use the constraints and derive the output for ${title}.`,
    },
    {
      input: 'input = [1]',
      output: 'Boundary output',
      explanation: 'Verify the smallest possible input size.',
    },
  ];
}

function buildConstraints(problem) {
  if (Array.isArray(problem?.constraints) && problem.constraints.length) {
    return problem.constraints;
  }

  const difficulty = String(problem?.difficulty || 'Medium').toLowerCase();
  const complexity = difficulty === 'easy' ? 'O(n)' : difficulty === 'hard' ? 'O(n^2)' : 'O(n log n)';
  return [
    'Input size is within platform limits.',
    'Values fit in 32-bit signed range unless otherwise stated.',
    `Target expected complexity: ${complexity}.`,
  ];
}

function buildDescription(problem) {
  if (typeof problem?.description === 'string' && problem.description.trim().length > 10) {
    return problem.description;
  }

  const title = problem?.title || 'this challenge';
  return `Solve ${title} efficiently. Identify the best data structure, handle edge cases, and return the correct output for all valid inputs.`;
}

export function buildProblemViewModel(problem) {
  const richContent = getProblemContent(problem?.id);
  const examples = richContent?.examples || buildExamples(problem);
  const constraints = richContent?.constraints || buildConstraints(problem);
  const tests = buildTests(problem, examples);
  const signatures = buildProblemSignatures(problem);

  // Edge cases: use rich content or generic fallback
  const edgeCases = richContent?.edgeCases
    ? richContent.edgeCases.map(ec => typeof ec === 'string' ? ec : `${ec.case} — ${ec.explanation}`)
    : ['Empty or minimal input', 'Duplicate values and repeated states', 'Upper constraint boundaries'];

  // Visible test cases from rich content or fallback
  let uiCases;
  if (richContent?.visibleTests?.length) {
    uiCases = richContent.visibleTests.map((tc, i) => ({
      id: `case-${i + 1}`,
      input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input),
      expected: typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : String(tc.expected),
      note: tc.note || `Case ${i + 1}`,
    }));
  } else {
    uiCases = (tests.prebuilt || [])
      .filter((test) => String(test.input || '').trim().length > 0)
      .map((test, index) => ({
        id: test.id || `case-${index + 1}`,
        input: test.input || '',
        expected: test.expected || '',
        note: test.note || `Case ${index + 1}`,
      }));
  }

  // Hidden tests: use generator if config available
  let hiddenTests = tests.hidden || [];
  if (richContent?.hiddenTestConfig) {
    const generated = generateHiddenTests(
      problem.id,
      richContent.hiddenTestConfig.generator,
      richContent.hiddenTestConfig.constraints
    );
    hiddenTests = generated.slice(0, 55);
  }

  return {
    description: richContent?.description || buildDescription(problem),
    examples,
    constraints,
    edgeCases,
    tests,
    uiCases,
    hiddenTests,
    signatures,
    // Rich content extras
    intuition: richContent?.intuition || null,
    approaches: richContent?.approaches || null,
    dryRun: richContent?.dryRun || null,
    visualDiagram: richContent?.visualDiagram || null,
    patternExplanation: richContent?.patternExplanation || null,
    hasRichContent: Boolean(richContent),
  };
}

function renderExamples(examples) {
  return examples
    .map((example, index) => {
      const explanation = example.explanation
        ? `<div style="color:var(--text-3);margin-top:4px;"><strong>Explanation:</strong> ${escapeHtml(example.explanation)}</div>`
        : '';

      return `
        <div class="problem-example">
          <div class="problem-example-label">Example ${index + 1}</div>
          <div><strong>Input:</strong> ${escapeHtml(example.input)}</div>
          <div><strong>Output:</strong> ${escapeHtml(example.output)}</div>
          ${explanation}
        </div>
      `;
    })
    .join('');
}

function renderCaseTabs(uiCases) {
  return uiCases
    .map((item, index) => `<span class="testcase-label${index === 0 ? ' active' : ''}" data-case="${index}" title="${escapeHtml(item.note)}">Case ${index + 1}</span>`)
    .join('');
}

function renderHiddenTests(hiddenTests) {
  return hiddenTests
    .slice(0, 10)
    .map((test, index) => `<div class="testcase-hidden-item">Hidden ${index + 1}: ${escapeHtml(test.note || 'Edge case validation')}</div>`)
    .join('');
}

export function renderProblemNotFound() {
  return `<div class="page-wrap"><h1 class="page-title">Problem not found</h1><p class="page-subtitle">This problem ID does not exist in the catalog.</p><div style="margin-top:12px;display:flex;gap:8px;"><button class="btn btn-primary" onclick="navigateTo('/problems')">Back to Problems</button><button class="btn btn-secondary" onclick="navigateTo('/dashboard')">Go to Dashboard</button></div></div>`;
}

export function renderProblemDetailPage({ problem, progressEntry, model, currentLang }) {
  const status = progressEntry?.status || '';
  const difficulty = String(problem?.difficulty || '').toLowerCase();
  const diffClass = difficulty === 'easy' ? 'badge-easy' : difficulty === 'medium' ? 'badge-medium' : 'badge-hard';
  const categoryMeta = CATEGORIES.find((item) => item.id === problem.category);
  const categoryName = categoryMeta?.name || problem.category || 'General';
  const userName = store.get('user')?.name || 'User';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';
  const currentTheme = store.get('preferences')?.theme || 'dark';
  const fontSize = Number(store.get('preferences')?.editor?.fontSize || 14);
  const testcaseInput = model.uiCases[0]?.input || '';

  return `
  <div class="problem-detail-page">
    <div class="problem-detail-topbar">
      <div class="problem-nav-left">
        <button class="btn-icon" onclick="navigateTo('/problems')" title="Back to problems">
          <i data-lucide="arrow-left" width="18" height="18"></i>
        </button>
        <div class="problem-brand-compact" onclick="navigateTo('/dashboard')" style="cursor:pointer;" title="Back to Dashboard">
          ${robinhoodBrandMark(18)}
          <div>
            <div class="problem-brand-name">Robinhood</div>
            <div class="problem-detail-tagline">Dashboard <span style="opacity:0.5;margin:0 4px;">/</span> <span style="color:var(--text-4);">Problem</span></div>
          </div>
        </div>
      </div>
      <div class="problem-nav-center">
        <span class="problem-detail-title">${escapeHtml(problem.title)}</span>
        <span class="badge ${diffClass}">${escapeHtml(problem.difficulty || 'Unknown')}</span>
        ${status === 'solved' ? '<span class="badge badge-success">Solved</span>' : ''}
        ${(problem.companies || []).slice(0, 3).map((company) => `<span class="tag">${escapeHtml(company)}</span>`).join('')}
      </div>
      <div class="problem-nav-right">
        ${problem.url ? `<a href="${problem.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost"><i data-lucide="external-link" width="14" height="14"></i> Open on ${(problem.platforms || ['Platform'])[0]}</a>` : ''}
        <button class="btn btn-sm btn-ghost" id="problem-open-debugger-btn" title="Open debugger workspace">
          <i data-lucide="bug" width="14" height="14"></i> Debugger
        </button>
        <button class="btn btn-sm btn-ghost" id="bookmark-btn" title="Toggle bookmark">
          <i data-lucide="${store.isBookmarked(problem.id) ? 'bookmark-check' : 'bookmark'}" width="16" height="16"></i>
        </button>
        <button class="btn btn-sm btn-ghost" id="workspace-theme-btn" title="Toggle theme">
          <i data-lucide="${currentTheme === 'dark' ? 'sun' : 'moon'}" width="16" height="16"></i>
        </button>
        <button class="workspace-user-chip" onclick="navigateTo('/profile')">${userInitial}</button>
      </div>
    </div>

    <div class="problem-detail-body">
      <div class="problem-detail-left" style="resize: horizontal; overflow: auto; min-width: 350px; max-width: 70vw;">
        <div class="problem-statement">
          <button class="help-fab" id="problem-help-btn" title="Get AI Help">
            <i data-lucide="sparkles" width="14" height="14"></i> Need Help?
          </button>

          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            <span class="tag">${escapeHtml(categoryName)}</span>
            ${(problem.companies || []).slice(0, 5).map((company) => `<span class="tag">${escapeHtml(company)}</span>`).join('')}
          </div>

          <p>${escapeHtml(model.description)}</p>

          ${model.intuition ? `
          <div class="problem-section problem-intuition">
            <div class="problem-example-label"><i data-lucide="lightbulb" width="14" height="14"></i> Intuition</div>
            <p style="color:var(--text-2);line-height:1.7;">${escapeHtml(model.intuition)}</p>
          </div>` : ''}

          ${getProblemVisualization(problem.id, problem.title)}

          <div class="problem-examples">
            ${renderExamples(model.examples)}
          </div>

          ${model.approaches ? `
          <div class="problem-section">
            <div class="problem-example-label"><i data-lucide="route" width="14" height="14"></i> Approaches</div>
            <div class="approach-cards">
              ${model.approaches.map((a, i) => `
                <div class="approach-card ${i === model.approaches.length - 1 ? 'approach-optimal' : ''}">
                  <div class="approach-header">
                    <span class="approach-name">${escapeHtml(a.name)}</span>
                    <div class="approach-complexity">
                      <span class="badge badge-sm">T: ${escapeHtml(a.complexity?.time || '?')}</span>
                      <span class="badge badge-sm">S: ${escapeHtml(a.complexity?.space || '?')}</span>
                    </div>
                  </div>
                  <p class="approach-desc">${escapeHtml(a.description)}</p>
                  ${a.pseudocode ? `<pre class="approach-pseudo">${escapeHtml(a.pseudocode)}</pre>` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${model.dryRun ? `
          <div class="problem-section">
            <div class="problem-example-label"><i data-lucide="play-circle" width="14" height="14"></i> Dry Run</div>
            <div class="dry-run-box">
              <div class="dry-run-input"><strong>Input:</strong> ${escapeHtml(model.dryRun.input)}</div>
              <div class="dry-run-steps">
                ${(model.dryRun.steps || []).map(s => `
                  <div class="dry-run-step">
                    <span class="dry-run-num">Step ${s.step}</span>
                    <span class="dry-run-state">${escapeHtml(s.state)}</span>
                    <span class="dry-run-action">${escapeHtml(s.action)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>` : ''}

          ${model.visualDiagram ? `
          <div class="problem-section">
            <div class="problem-example-label"><i data-lucide="image" width="14" height="14"></i> Visual Explanation</div>
            <pre class="visual-diagram">${escapeHtml(model.visualDiagram)}</pre>
          </div>` : ''}

          <div class="problem-constraints">
            <div class="problem-example-label">Constraints</div>
            <ul>${model.constraints.map((constraint) => `<li>${escapeHtml(constraint)}</li>`).join('')}</ul>
          </div>

          <div class="problem-constraints">
            <div class="problem-example-label">Edge Cases</div>
            <ul>${model.edgeCases.map((edgeCase) => `<li>${escapeHtml(edgeCase)}</li>`).join('')}</ul>
          </div>

          ${model.patternExplanation ? `
          <div class="problem-section problem-pattern-card">
            <div class="problem-example-label"><i data-lucide="brain" width="14" height="14"></i> Why This Pattern?</div>
            <div class="pattern-tag"><strong>Pattern:</strong> ${escapeHtml(model.patternExplanation.pattern)}</div>
            <p style="color:var(--text-2);line-height:1.7;margin-top:6px;">${escapeHtml(model.patternExplanation.why)}</p>
            ${model.patternExplanation.related?.length ? `<div class="pattern-related"><strong>Related:</strong> ${model.patternExplanation.related.map(id => `<a href="javascript:void(0)" onclick="navigateTo('/problem/${id}')" class="pattern-link">${id}</a>`).join(', ')}</div>` : ''}
          </div>` : ''}

          <div class="problem-constraints">
            <div class="problem-example-label">Function Signatures</div>
            <ul>
              <li><code>JavaScript:</code> ${escapeHtml(model.signatures.javascript)}</li>
              <li><code>Python:</code> ${escapeHtml(model.signatures.python)}</li>
              <li><code>C++:</code> ${escapeHtml(model.signatures.cpp)}</li>
              <li><code>Java:</code> ${escapeHtml(model.signatures.java)}</li>
              <li><code>C#:</code> ${escapeHtml(model.signatures.csharp)}</li>
            </ul>
          </div>

          <div class="problem-constraints">
            <div class="problem-example-label">Hidden Tests</div>
            <div class="testcase-hidden-list">${renderHiddenTests(model.hiddenTests)}</div>
          </div>

          <div style="margin-top:24px;">
            <div class="problem-example-label" style="margin-bottom:8px;">Your Notes</div>
            <textarea class="input" id="problem-notes" rows="4" placeholder="Add your notes, approach, or key insights..." style="font-family:var(--font-body);resize:vertical;">${escapeHtml(store.getProblemNote(problem.id))}</textarea>
            <button class="btn btn-sm btn-secondary" id="save-problem-note-btn" style="margin-top:8px;">Save Notes</button>
          </div>
        </div>
      </div>

      <div class="problem-detail-right">
        <div class="editor-toolbar">
          <div style="display:flex;align-items:center;gap:8px;">
            <select class="select" id="lang-select" style="width:120px;">
              <option value="cpp" ${currentLang === 'cpp' ? 'selected' : ''}>C++</option>
              <option value="java" ${currentLang === 'java' ? 'selected' : ''}>Java</option>
              <option value="python" ${currentLang === 'python' ? 'selected' : ''}>Python</option>
              <option value="javascript" ${currentLang === 'javascript' ? 'selected' : ''}>JavaScript</option>
              <option value="c" ${currentLang === 'c' ? 'selected' : ''}>C</option>
              <option value="csharp" ${currentLang === 'csharp' ? 'selected' : ''}>C#</option>
            </select>
            <select class="select" id="font-select" style="width:70px;">
              <option value="12" ${fontSize === 12 ? 'selected' : ''}>12px</option>
              <option value="14" ${fontSize === 14 ? 'selected' : ''}>14px</option>
              <option value="16" ${fontSize === 16 ? 'selected' : ''}>16px</option>
              <option value="18" ${fontSize === 18 ? 'selected' : ''}>18px</option>
            </select>
            <div class="problem-timer" style="display:flex;align-items:center;gap:6px;background:var(--surface-2);border-radius:var(--radius-md);padding:4px 10px;font-family:var(--font-mono);font-size:var(--text-sm);">
              <i data-lucide="timer" width="14" height="14" style="opacity:0.7;"></i>
              <span id="problem-timer-display" style="min-width:44px;font-weight:600;">00:00</span>
              <span style="opacity:0.5;">/</span>
              <span id="problem-timer-target" style="min-width:44px;opacity:0.8;">00:00</span>
              <input id="problem-timer-target-input" type="number" min="0" max="180" value="0" style="width:58px;height:24px;padding:2px 6px;border-radius:6px;border:1px solid var(--border-1);background:var(--surface-1);color:var(--text-2);font-size:11px;" title="Set alert target (minutes)" />
              <button class="btn-icon" id="problem-timer-apply-btn" style="width:24px;height:24px;padding:0;" title="Apply target">
                <i data-lucide="check" width="12" height="12"></i>
              </button>
              <button id="problem-timer-btn" class="btn-icon" style="width:24px;height:24px;padding:0;" title="Start/Pause Timer">
                <i data-lucide="play" width="14" height="14"></i>
              </button>
              <button class="btn-icon" id="problem-timer-reset-btn" style="width:24px;height:24px;padding:0;" title="Reset Timer">
                <i data-lucide="rotate-ccw" width="12" height="12"></i>
              </button>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="rh-action-btn rh-action-run" id="problem-run-btn"><i data-lucide="play" width="14" height="14"></i> Run</button>
            <button class="rh-action-btn rh-action-submit" id="problem-submit-btn"><i data-lucide="send" width="14" height="14"></i> Submit</button>
            <button class="btn btn-sm btn-ghost" id="problem-reset-btn" title="Reset to default template"><i data-lucide="rotate-ccw" width="14" height="14"></i></button>
            <button class="btn btn-sm btn-ghost" id="problem-fullscreen-btn" title="Toggle Fullscreen"><i data-lucide="expand" width="14" height="14"></i></button>
          </div>
        </div>

        <div class="editor-container" id="monaco-container" style="flex:1;"></div>

        <div class="editor-console-panel">
          <div class="console-tabs" id="problem-console-tabs">
            <button class="console-tab active" data-tab="testcases" id="tab-testcases"><i data-lucide="check-square" width="14" height="14"></i> Test Cases</button>
            <button class="console-tab" data-tab="output" id="tab-output"><i data-lucide="terminal-square" width="14" height="14"></i> Output</button>
            <button class="console-tab" data-tab="performance" id="tab-performance"><i data-lucide="activity" width="14" height="14"></i> Performance</button>
            <button class="console-tab" data-tab="sql" id="tab-sql"><i data-lucide="database" width="14" height="14"></i> SQL</button>
          </div>

          <div class="console-content" id="console-testcases">
            <div class="testcase-labels" id="testcase-labels">${renderCaseTabs(model.uiCases)}</div>
            <div class="testcase-meta">Visible cases: ${model.uiCases.length} | Hidden cases: ${model.hiddenTests.length}</div>
            <textarea class="testcase-input" id="testcase-input" spellcheck="false">${escapeHtml(testcaseInput)}</textarea>
            <div class="testcase-hidden-list">${renderHiddenTests(model.hiddenTests)}</div>
          </div>

          <div class="console-content hidden" id="console-output">
            <div style="color:var(--text-4);font-style:italic;">Run your code to see the output here.</div>
          </div>

          <div class="console-content hidden" id="console-performance">
            <div style="color:var(--text-4);font-style:italic;">Run or submit to view performance insights.</div>
          </div>

          <div class="console-content hidden" id="console-sql" style="display:flex; height:100%;">
            <div style="width:250px; border-right:1px solid var(--border-1); padding-right:16px; margin-right:16px;">
              <div class="problem-example-label">Schema Explorer</div>
              <div id="sql-schema-tables" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;"></div>
              <div id="sql-schema-table-details">
                <span style="color:var(--text-4);font-style:italic;font-size:12px;">Select a table.</span>
              </div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column;">
              <div style="display:flex; gap:8px; margin-bottom:8px;">
                <button class="btn btn-sm btn-primary" id="run-sql-btn"><i data-lucide="play" width="14" height="14"></i> Run Query</button>
                <button class="btn btn-sm btn-secondary" id="clear-sql-btn"><i data-lucide="trash" width="14" height="14"></i> Clear</button>
                <i id="sql-spinner" data-lucide="loader-2" width="16" height="16" class="spin" style="display:none; color:var(--text-3); margin-top:4px;"></i>
              </div>
              <div id="sql-monaco-container" style="flex:1; min-height: 200px; border:1px solid var(--border-1); border-radius:4px;"></div>
              <div id="sql-result-panel" style="margin-top:12px; height:200px; overflow-y:auto; border:1px solid var(--border-1); border-radius:4px; padding:8px;">
                <span style="color:var(--text-4);font-style:italic;font-size:12px;">Query results will appear here.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}
