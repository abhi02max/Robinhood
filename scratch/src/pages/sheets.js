// ROBINHOOD — Coding Sheets v2 (DB-driven via /api/learning/problems-index)
//
// Migration note (Apr 2026):
// Previously imported `allProblems` from '../data/problems.js' to rank and
// slice the 75/150/300 lists client-side. The static dependency is gone —
// this page now fetches the compact problems index from
// /api/learning/problems-index on init and re-ranks against THAT.
//
// Scoring change: the legacy `scoreProblem` weighted `companies.length` by
// 4x. The DB has no company tagging yet (see /api/learning/companies for
// the explicit `schemaSupportsProblemMapping: false` flag), so that term
// is replaced with `tags.length` — algorithmic-tag richness as a proxy for
// "interview-relevance". Same shape, different signal source.
import store from '../store.js';
import { fetchProblemsIndex, ApiError } from '../utils/learning-api.js';
import { buildProblemsRoute } from '../data/product-flow.js';

const SHEET_SIZES = [75, 150, 300];
const DIFFICULTY_WEIGHT = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

let activeSheet = 75;
let sheetFilter = 'all';
let sheetSearch = '';

// Cached problems index for the lifetime of this page mount. Reset on
// every initSheets() so a stale cache from a previous navigation is
// never reused after a hot reload or DB reseed.
let problemsIndex = [];
let indexState = { loading: true, error: null };
let abortController = null;

function normalizeSheetSize(raw) {
  const parsed = Number(raw || 75);
  if (parsed === 300) return 300;
  if (parsed === 150) return 150;
  return 75;
}

function scoreProblem(problem) {
  // Tag richness as an interview-relevance proxy until company tagging
  // lands in the DB. Capped at 12 to keep heavy-tagged outliers from
  // dominating the ranking.
  const tagScore = Math.min(12, Number(problem?.tags?.length || 0));
  const difficultyScore = DIFFICULTY_WEIGHT[problem?.difficulty] || 1;
  const titleBonus = /graph|tree|dynamic|window|binary|heap|design|sql|system/i.test(problem?.title || '') ? 1 : 0;
  return (tagScore * 4) + (difficultyScore * 6) + titleBonus;
}

function getRankedProblems() {
  return [...problemsIndex]
    .sort((a, b) => {
      const delta = scoreProblem(b) - scoreProblem(a);
      if (delta !== 0) return delta;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
}

function getSheetProblems(size) {
  return getRankedProblems().slice(0, size);
}

function getTopicSpotlight(sheetProblems) {
  // Was getCompanySpotlight — replaced with topic spotlight since the DB
  // has rich topic data and no company tagging. Same shape: array of
  // [label, count] tuples, top 6 by frequency.
  const counts = {};
  sheetProblems.forEach((problem) => {
    const topicName = problem?.topic?.name || problem?.topic?.slug;
    if (!topicName) return;
    counts[topicName] = (counts[topicName] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

function getSheetStats(sheetProblems) {
  const total = sheetProblems.length;
  const solvedCount = sheetProblems.filter((problem) => store.getProblemStatus(problem.id) === 'solved').length;
  const completionPct = total ? Math.round((solvedCount / total) * 100) : 0;
  const streakState = store.get('streaks') || {};
  const today = new Date().toISOString().split('T')[0];
  const todaySolved = Number(streakState?.history?.[today] || 0);

  const byDifficulty = ['Easy', 'Medium', 'Hard'].map((difficulty) => {
    const subset = sheetProblems.filter((problem) => String(problem?.difficulty || 'Easy') === difficulty);
    const solved = subset.filter((problem) => store.getProblemStatus(problem.id) === 'solved').length;
    return {
      difficulty,
      total: subset.length,
      solved,
      pct: subset.length ? Math.round((solved / subset.length) * 100) : 0,
    };
  });

  return {
    total,
    solvedCount,
    completionPct,
    streakCurrent: Number(streakState?.current || 0),
    streakLongest: Number(streakState?.longest || 0),
    todaySolved,
    byDifficulty,
  };
}

function getNextSheetProblemId(sheetProblems) {
  const next = sheetProblems.find((problem) => store.getProblemStatus(problem.id) !== 'solved');
  // Prefer slug for routing (matches backend GET /problem/:slug); fall back to id
  // for legacy data without a slug field.
  const pick = next || sheetProblems[0];
  return pick ? (pick.slug || pick.id) : '';
}

function filterSheetProblems(sheetProblems) {
  let filtered = [...sheetProblems];
  if (sheetFilter === 'unsolved') {
    filtered = filtered.filter((problem) => store.getProblemStatus(problem.id) !== 'solved');
  } else if (sheetFilter === 'solved') {
    filtered = filtered.filter((problem) => store.getProblemStatus(problem.id) === 'solved');
  }

  if (sheetSearch.trim()) {
    const query = sheetSearch.trim().toLowerCase();
    filtered = filtered.filter((problem) =>
      String(problem.title || '').toLowerCase().includes(query)
      || String(problem.topic?.name || '').toLowerCase().includes(query)
      || String(problem.topic?.slug || '').toLowerCase().includes(query)
      || String(problem.pattern?.name || '').toLowerCase().includes(query)
      || (problem.tags || []).some((tag) => String(tag).toLowerCase().includes(query))
    );
  }

  return filtered;
}

function renderSheetRows(sheetProblems) {
  const filtered = filterSheetProblems(sheetProblems);
  if (!filtered.length) {
    return '<div class="experience-muted">No sheet problems match your current filters.</div>';
  }

  return `
    <div class="sheet-problem-list">
      ${filtered.map((problem, index) => {
        const status = store.getProblemStatus(problem.id);
        const solved = status === 'solved';
        const topicLabel = problem.topic?.name || problem.topic?.slug || 'General';
        const patternLabel = problem.pattern?.name || problem.pattern?.slug || '';
        const navTarget = problem.slug || problem.id;
        return `
          <article class="sheet-problem-item" data-problem-open="${navTarget}">
            <div class="sheet-problem-index">${String(index + 1).padStart(2, '0')}</div>
            <div class="sheet-problem-main">
              <h4>${problem.title}</h4>
              <div class="sheet-problem-meta">
                <span class="badge badge-${String(problem.difficulty || 'easy').toLowerCase()}">${problem.difficulty || 'Easy'}</span>
                <span class="debugger-chip">${topicLabel}</span>
                ${patternLabel ? `<span class="debugger-chip">${patternLabel}</span>` : ''}
              </div>
            </div>
            <div class="sheet-problem-actions">
              ${solved ? '<span class="badge badge-success">Solved</span>' : '<span class="badge badge-secondary">Pending</span>'}
              <button class="btn btn-secondary btn-sm" data-problem-open="${navTarget}">Open</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

export function renderSheets(params = {}) {
  activeSheet = normalizeSheetSize(params.sheet);
  sheetFilter = 'all';
  sheetSearch = '';

  // First render emits a skeleton — initSheets() fetches the index and
  // re-renders the dynamic regions once data is available.
  const sheetProblems = getSheetProblems(activeSheet);
  const stats = getSheetStats(sheetProblems);
  const spotlight = getTopicSpotlight(sheetProblems);

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Coding Sheets</p>
          <h1>Robinhood 75 / 150 / 300</h1>
          <p>Structured coding sheets with direct problem navigation, company-focused practice, and progress visibility.</p>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="list-checks" width="14" height="14"></i> ${activeSheet} problems</span>
          <span class="meta-pill"><i data-lucide="target" width="14" height="14"></i> ${stats.solvedCount} solved</span>
          <span class="meta-pill"><i data-lucide="flame" width="14" height="14"></i> ${stats.streakCurrent} day streak</span>
        </div>
      </header>

      <div class="experience-shell">
        <aside class="experience-left">
          <div class="card experience-panel">
            <h3><i data-lucide="layers-2" width="16" height="16"></i> Sheet Tracks</h3>
            <div class="experience-list compact">
              ${SHEET_SIZES.map((size) => `
                <button class="experience-list-item ${size === activeSheet ? 'active' : ''}" data-sheet-open="${size}">
                  <span>Robinhood ${size}</span>
                  <i data-lucide="chevron-right" width="14" height="14"></i>
                </button>
              `).join('')}
            </div>

            <h3><i data-lucide="layers-3" width="16" height="16"></i> Topic Focus</h3>
            <div class="experience-list compact" id="sheet-topic-focus">
              ${spotlight.length ? spotlight.map(([topic, count]) => `
                <button class="experience-list-item" data-topic-sheet="${topic}">
                  <span>${topic}</span>
                  <small>${count} questions</small>
                </button>
              `).join('') : '<div class="experience-muted">Loading…</div>'}
            </div>
          </div>
        </aside>

        <main class="experience-main">
          <div class="card experience-panel">
            <div class="experience-section-head">
              <div>
                <p class="experience-kicker">Sheet Overview</p>
                <h2>Robinhood ${activeSheet}</h2>
              </div>
              <div class="flow-link-row">
                <button class="btn btn-primary btn-sm" id="sheet-start-journey">Start Journey</button>
                <button class="btn btn-secondary btn-sm" id="sheet-open-problems">Open Problems Board</button>
                <button class="btn btn-secondary btn-sm" id="sheet-open-sql-track">Open SQL Track</button>
              </div>
            </div>

            <div class="journey-caption">Start from the next unsolved problem, keep your streak active, and balance Easy/Medium/Hard completion.</div>

            <section class="sheet-insight-grid" aria-label="Sheet progress overview">
              <article class="sheet-insight-card">
                <p class="experience-label">Completion</p>
                <h3>${stats.solvedCount}/${stats.total}</h3>
                <div class="journey-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.completionPct}">
                  <div class="journey-progress-fill" style="width:${stats.completionPct}%;"></div>
                </div>
                <small>${stats.completionPct}% of sheet completed</small>
              </article>

              <article class="sheet-insight-card">
                <p class="experience-label">Streak</p>
                <h3>🔥 ${stats.streakCurrent} days</h3>
                <div class="sheet-streak-row">
                  <span class="debugger-chip">Longest: ${stats.streakLongest}</span>
                  <span class="debugger-chip">Solved today: ${stats.todaySolved}</span>
                </div>
              </article>

              <article class="sheet-insight-card">
                <p class="experience-label">Difficulty Coverage</p>
                <div class="sheet-difficulty-stack">
                  ${stats.byDifficulty.map((item) => `
                    <div class="sheet-difficulty-row">
                      <span class="badge badge-${item.difficulty.toLowerCase()}">${item.difficulty}</span>
                      <div class="journey-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.pct}">
                        <div class="journey-progress-fill sheet-difficulty-fill ${item.difficulty.toLowerCase()}" style="width:${item.pct}%;"></div>
                      </div>
                      <small>${item.solved}/${item.total}</small>
                    </div>
                  `).join('')}
                </div>
              </article>
            </section>

            <div class="sheet-toolbar">
              <input class="input" id="sheet-search" placeholder="Search by title, category, or company" value="${sheetSearch}" />
              <select class="select" id="sheet-filter">
                <option value="all">All</option>
                <option value="unsolved">Unsolved only</option>
                <option value="solved">Solved only</option>
              </select>
            </div>

            <div id="sheet-problems-mount">
              ${renderSheetRows(sheetProblems)}
            </div>
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel compact">
            <h3><i data-lucide="route" width="16" height="16"></i> Product Flow</h3>
            <button class="btn btn-secondary btn-sm" data-flow-route="/learn/dsa">Learn DSA Fundamentals</button>
            <button class="btn btn-secondary btn-sm" data-flow-route="/interview/mock?type=technical">Start Interview Session</button>
            <button class="btn btn-secondary btn-sm" data-flow-route="/debugger">Open Debugger</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initSheets(params = {}) {
  activeSheet = normalizeSheetSize(params.sheet);
  const mount = document.getElementById('sheet-problems-mount');

  const rerenderRows = () => {
    if (!mount) return;
    const sheetProblems = getSheetProblems(activeSheet);
    mount.innerHTML = renderSheetRows(sheetProblems);

    document.querySelectorAll('[data-problem-open]').forEach((node) => {
      node.addEventListener('click', (event) => {
        event.preventDefault();
        const id = node.getAttribute('data-problem-open');
        if (!id) return;
        window.navigateTo(`/problem/${id}`);
      });
    });
  };

  // Cancel any inflight fetch from a previous navigation
  if (abortController) abortController.abort();
  abortController = new AbortController();
  problemsIndex = [];
  indexState = { loading: true, error: null };

  fetchProblemsIndex({ signal: abortController.signal })
    .then((problems) => {
      problemsIndex = problems;
      indexState = { loading: false, error: null };
      rerenderRows();
      renderTopicFocus();
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return;
      const message = error instanceof ApiError ? error.message : 'Failed to load problems';
      indexState = { loading: false, error: message };
      if (mount) {
        mount.innerHTML = `
          <div class="experience-muted" style="padding:24px;">
            Couldn't load sheet problems — ${message}.
            <button class="btn btn-secondary btn-sm" id="sheet-retry" style="margin-left:8px;">Retry</button>
          </div>`;
        document.getElementById('sheet-retry')?.addEventListener('click', () => initSheets({ sheet: activeSheet }));
      }
    });

  document.querySelectorAll('[data-sheet-open]').forEach((node) => {
    node.addEventListener('click', () => {
      const next = normalizeSheetSize(node.getAttribute('data-sheet-open'));
      window.navigateTo(`/sheets?sheet=${next}`);
    });
  });

  document.querySelectorAll('[data-flow-route]').forEach((node) => {
    node.addEventListener('click', () => {
      const route = node.getAttribute('data-flow-route');
      if (!route) return;
      window.navigateTo(route);
    });
  });

  const searchEl = document.getElementById('sheet-search');
  if (searchEl) {
    searchEl.addEventListener('input', (event) => {
      sheetSearch = event.target?.value || '';
      rerenderRows();
    });
  }

  const filterEl = document.getElementById('sheet-filter');
  if (filterEl) {
    filterEl.value = sheetFilter;
    filterEl.addEventListener('change', (event) => {
      sheetFilter = event.target?.value || 'all';
      rerenderRows();
    });
  }

  document.getElementById('sheet-open-problems')?.addEventListener('click', () => {
    window.navigateTo('/problems');
  });

  document.getElementById('sheet-start-journey')?.addEventListener('click', () => {
    const nextId = getNextSheetProblemId(getSheetProblems(activeSheet));
    if (!nextId) return;
    window.navigateTo(`/problem/${nextId}`);
  });

  document.getElementById('sheet-open-sql-track')?.addEventListener('click', () => {
    window.navigateTo('/sql-track');
  });

  rerenderRows();
  window.lucide?.createIcons();
}

function renderTopicFocus() {
  const focusMount = document.getElementById('sheet-topic-focus');
  if (!focusMount) return;
  const sheetProblems = getSheetProblems(activeSheet);
  const spotlight = getTopicSpotlight(sheetProblems);
  focusMount.innerHTML = spotlight.length
    ? spotlight.map(([topic, count]) => `
        <button class="experience-list-item" data-topic-sheet="${topic}">
          <span>${topic}</span>
          <small>${count} questions</small>
        </button>
      `).join('')
    : '<div class="experience-muted">No topics yet.</div>';
  document.querySelectorAll('[data-topic-sheet]').forEach((node) => {
    node.addEventListener('click', () => {
      const topic = node.getAttribute('data-topic-sheet');
      if (!topic) return;
      window.navigateTo(buildProblemsRoute({ category: topic }));
    });
  });
}
