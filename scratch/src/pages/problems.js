// ROBINHOOD — Problems Page v2 (Clean rows, toggle filters)
//
// Phase A migration note (Apr 2026):
// Replaced the static `../data/problems.js` source with the hydrated
// problems-cache. This is a *legacy* page (the App Router /app/problems
// route is the canonical replacement), so the goal here is to keep it
// functional after the static-data deletion, NOT to make it pixel-perfect
// against the previous behaviour. Two compatibility shims keep the existing
// UI logic intact:
//
//   1. `legacyShape(p)` decorates a cache row with a `category` mirror
//      (= topic.slug) and ensures `companies` is always an array. The
//      DB-backed cache exposes `topic.slug` rather than the flat
//      `problem.category` field, and has no per-row companies.
//   2. `getCategoryStatsAsMap()` adapts the new array-shaped
//      getCategoryStats() to the old `{[id]: {total}}` map shape.
//
// Companies-related UI (filter dropdown, "Most Asked" sort, company-pill
// summaries) will degrade gracefully — cache rows have empty companies[],
// so those affordances render but produce no results until the DB schema
// adds problem↔company mapping.
import store from '../store.js';
import { getAllProblems, getCategoryStats } from '../utils/problems-cache.js';
import { getCompanyById } from '../data/companies.js';
import CATEGORIES from '../data/categories.js';
import { router } from '../router.js';
import { showToast } from '../components/notifications.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

// ---- Phase A compatibility shims --------------------------------------------
function legacyShape(p) {
  if (!p) return p;
  return {
    ...p,
    category: p.category || p.topic?.slug || '',
    companies: Array.isArray(p.companies) ? p.companies : [],
  };
}
function getAdaptedProblems() {
  return getAllProblems().map(legacyShape);
}
function getCategoryStatsAsMap() {
  const map = {};
  for (const stat of getCategoryStats()) {
    map[stat.id] = { id: stat.id, name: stat.name, total: stat.count };
  }
  return map;
}

let currentCategory = 'all';
let currentDifficulty = 'all';
let currentStatus = 'all';
let currentCompany = 'all';
let searchQuery = '';
let latestFiltered = [];

function normalizeCompanyName(name) {
  return String(name || '').trim().toLowerCase();
}

function resolveCompanyParam(params) {
  // Handle companyId parameter (from company detail page "View All" button)
  if (params?.companyId) {
    const company = getCompanyById(decodeURIComponent(params.companyId));
    if (company?.name) {
      console.log('[Problems] Company filter from companyId:', company.name);
      return company.name;
    }
    console.warn('[Problems] Company not found for ID:', params.companyId);
    return 'all';
  }

  // Handle company parameter (direct company name)
  if (!params?.company) return 'all';
  
  const decoded = decodeURIComponent(params.company);
  const normalized = normalizeCompanyName(decoded);
  const exactMatch = getAdaptedProblems().find((p) => (p.companies || []).some((c) => normalizeCompanyName(c) === normalized));
  if (exactMatch) {
    const canonical = (exactMatch.companies || []).find((c) => normalizeCompanyName(c) === normalized);
    console.log('[Problems] Company filter from company param:', canonical || decoded);
    return canonical || decoded;
  }
  return decoded;
}

function getFilteredProblems() {
  let filtered = getAdaptedProblems();

  // Company filter - CRITICAL for company-specific problem lists
  if (currentCompany !== 'all') {
    const selected = normalizeCompanyName(currentCompany);
    const beforeCount = filtered.length;
    filtered = filtered.filter((p) => (p.companies || []).some((c) => normalizeCompanyName(c) === selected));
    console.log(`[Problems] Company filter: "${currentCompany}" (${selected}) -> ${beforeCount} -> ${filtered.length} problems`);
  }
  
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
  if (currentDifficulty !== 'all') filtered = filtered.filter(p => p.difficulty === currentDifficulty);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.companies.some(c => c.toLowerCase().includes(q))
    );
  }

  if (currentStatus !== 'all') {
    filtered = filtered.filter(p => {
      const status = store.getProblemStatus(p.id);
      if (currentStatus === 'unsolved') return !status;
      return status === currentStatus;
    });
  }

  return filtered;
}

async function fetchFilteredProblemsFromApi() {
  const query = new URLSearchParams();
  if (currentCompany !== 'all') query.set('company', currentCompany);
  if (currentCategory !== 'all') query.set('category', currentCategory);
  const endpoint = `/api/problems${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const response = await fetch(endpoint, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.ok || !Array.isArray(data.items)) return null;
    return data.items;
  } catch (_) {
    return null;
  }
}

function updateHeaderCounts() {
  const subtitle = document.getElementById('problems-subtitle');
  const scope = currentCompany !== 'all'
    ? `${currentCompany} frequently asked questions`
    : 'curated problems';

  const solvedCount = latestFiltered.filter(p => store.getProblemStatus(p.id) === 'solved').length;
  if (subtitle) {
    subtitle.textContent = `${latestFiltered.length} ${scope} · ${solvedCount} solved · ${latestFiltered.length - solvedCount} remaining`;
  }

  const companyCount = document.getElementById('company-problem-count');
  if (companyCount) {
    companyCount.textContent = currentCompany !== 'all'
      ? `Showing ${latestFiltered.length} ${currentCompany} questions`
      : '';
  }
}

export function renderProblems(params) {
  currentCategory = params?.category || 'all';
  currentCompany = resolveCompanyParam(params);
  currentDifficulty = 'all';
  currentStatus = 'all';
  searchQuery = '';

  const stats = getCategoryStatsAsMap();
  const adapted = getAdaptedProblems();
  let baseProblems = currentCompany !== 'all'
    ? adapted.filter((p) => (p.companies || []).some((c) => normalizeCompanyName(c) === normalizeCompanyName(currentCompany)))
    : adapted;
  const totalCount = baseProblems.length;
  const solvedCount = baseProblems.filter(p => store.getProblemStatus(p.id) === 'solved').length;
  const companyOptions = adapted.reduce((acc, p) => {
    (p.companies || []).forEach((c) => {
      const key = String(c);
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
  const sortedCompanies = Object.entries(companyOptions).sort((a, b) => a[0].localeCompare(b[0]));

  return `
  <div class="problems-page">
    <div class="problems-header anim-fade-up">
      <h1 class="page-title">Problems</h1>
      <p class="page-subtitle" id="problems-subtitle">${totalCount} ${currentCompany !== 'all' ? currentCompany + ' frequently asked questions' : 'curated problems'} · ${solvedCount} solved · ${totalCount - solvedCount} remaining</p>
      <div class="journey-cta-row">
        <button class="btn btn-primary btn-sm" id="problems-start-journey">
          <i data-lucide="play" width="14" height="14"></i> Start Journey
        </button>
        <button class="btn btn-secondary btn-sm" id="problems-open-sheets">
          <i data-lucide="notebook-tabs" width="14" height="14"></i> Coding Sheets
        </button>
        <button class="btn btn-secondary btn-sm" id="problems-open-interview">
          <i data-lucide="mic" width="14" height="14"></i> Interview Session
        </button>
        <button class="btn btn-secondary btn-sm" id="problems-open-sql-track">
          <i data-lucide="database" width="14" height="14"></i> SQL A-Z
        </button>
      </div>
      <div class="journey-caption">Start with the next unsolved problem in your current filter, then branch to sheets, interview, or SQL practice.</div>
      ${currentCompany !== 'all' ? `
        <div class="problem-company-pill">
          Viewing frequently asked questions for ${currentCompany}
          <button class="problem-company-pill-close" onclick="window._clearCompanyFilter()"><i data-lucide="x" width="14" height="14"></i></button>
        </div>
        <p class="page-subtitle problem-company-count" id="company-problem-count">Showing ${totalCount} ${currentCompany} questions</p>
      ` : ''}
    </div>

    <div class="problems-toolbar anim-fade-up delay-1">
      <div class="problems-search">
        <input class="input search-input" id="problem-search" type="text" placeholder="Search by name, topic, or company..." value="${searchQuery}">
      </div>
      <div class="problems-filters">
        <select class="select" id="company-filter-select">
          <option value="all">All Companies</option>
          ${sortedCompanies.map(([name, count]) => `<option value="${name}" ${currentCompany === name ? 'selected' : ''}>${name} (${count})</option>`).join('')}
        </select>
        <select class="select" id="sort-filter">
          <option value="default">Default</option>
          <option value="most-asked">Most Asked</option>
        </select>
        <button class="diff-toggle ${currentDifficulty==='Easy'?'active-easy':''}" data-diff="Easy">Easy</button>
        <button class="diff-toggle ${currentDifficulty==='Medium'?'active-medium':''}" data-diff="Medium">Medium</button>
        <button class="diff-toggle ${currentDifficulty==='Hard'?'active-hard':''}" data-diff="Hard">Hard</button>
        <select class="select" id="status-filter">
          <option value="all">All Status</option>
          <option value="solved" ${currentStatus==='solved'?'selected':''}>Solved</option>
          <option value="attempted" ${currentStatus==='attempted'?'selected':''}>Attempted</option>
          <option value="unsolved" ${currentStatus==='unsolved'?'selected':''}>Unsolved</option>
        </select>
      </div>
    </div>

    <div class="problems-categories anim-fade-up delay-2" id="category-nav">
      <button class="cat-chip ${currentCategory==='all'?'active':''}" data-cat="all">
        All <span class="cat-chip-count">${totalCount}</span>
      </button>
      ${CATEGORIES.map(c => {
        let catCount = currentCompany !== 'all' 
            ? baseProblems.filter(p => p.category === c.id).length 
            : (stats[c.id]?.total || 0);
        return `<button class="cat-chip ${currentCategory===c.id?'active':''}" data-cat="${c.id}">
          ${c.name} <span class="cat-chip-count">${catCount}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="problems-list" id="problems-list">
      <div class="problem-header-row">
        <div></div>
        <div>#</div>
        <div>Title</div>
        <div>Difficulty</div>
        <div>Category</div>
        <div></div>
      </div>
      <div id="problem-rows"></div>
    </div>
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initProblems(params) {
  setRobinContext('DSA Problems', 'Problem List', 'Help me choose which problems to solve next based on difficulty and company filters.');
  initAskRobin();
  currentCategory = params?.category || 'all';
  currentCompany = resolveCompanyParam(params);
  let currentSort = 'default';
  renderProblemRows();

  document.getElementById('problem-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProblemRows();
  });

  document.querySelectorAll('.diff-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.diff;
      if (currentDifficulty === diff) {
        currentDifficulty = 'all';
        btn.classList.remove('active-easy', 'active-medium', 'active-hard');
      } else {
        currentDifficulty = diff;
        document.querySelectorAll('.diff-toggle').forEach(b => b.classList.remove('active-easy', 'active-medium', 'active-hard'));
        btn.classList.add(`active-${diff.toLowerCase()}`);
      }
      renderProblemRows();
    });
  });

  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    currentStatus = e.target.value;
    renderProblemRows();
  });

  document.getElementById('company-filter-select')?.addEventListener('change', (e) => {
    currentCompany = e.target.value;
    renderProblemRows();
  });

  document.getElementById('sort-filter')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProblemRows(currentSort);
  });

  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentCategory = chip.dataset.cat;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProblemRows();
    });
  });

  document.getElementById('problems-start-journey')?.addEventListener('click', () => {
    const nextProblem = latestFiltered.find((problem) => store.getProblemStatus(problem.id) !== 'solved') || latestFiltered[0];
    if (!nextProblem?.id) return;
    // URL keys off slug (per backend contract); falls back to id for legacy data without a slug field.
    window.navigateTo(`/problem/${nextProblem.slug || nextProblem.id}`);
  });

  document.getElementById('problems-open-sheets')?.addEventListener('click', () => {
    window.navigateTo('/sheets?sheet=75');
  });

  document.getElementById('problems-open-interview')?.addEventListener('click', () => {
    window.navigateTo('/interview/mock?type=technical');
  });

  document.getElementById('problems-open-sql-track')?.addEventListener('click', () => {
    window.navigateTo('/sql-track');
  });
}

async function renderProblemRows(sortBy = 'default') {
  const container = document.getElementById('problem-rows');
  if (!container) return;

  const apiItems = await fetchFilteredProblemsFromApi();
  latestFiltered = Array.isArray(apiItems) ? apiItems : getFilteredProblems();
  if (!Array.isArray(apiItems)) {
    latestFiltered = getFilteredProblems();
  } else {
    if (currentDifficulty !== 'all') latestFiltered = latestFiltered.filter(p => p.difficulty === currentDifficulty);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      latestFiltered = latestFiltered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.companies || []).some(c => c.toLowerCase().includes(q))
      );
    }
    if (currentStatus !== 'all') {
      latestFiltered = latestFiltered.filter(p => {
        const status = store.getProblemStatus(p.id);
        if (currentStatus === 'unsolved') return !status;
        return status === currentStatus;
      });
    }
  }
  if (sortBy === 'most-asked') {
    latestFiltered = [...latestFiltered].sort((a, b) => (b.companies?.length || 0) - (a.companies?.length || 0));
  }
  updateHeaderCounts();

  const catName = (cat) => CATEGORIES.find(c => c.id === cat)?.name || cat;

  container.innerHTML = latestFiltered.length === 0
    ? `<div class="empty-state"><div class="empty-state-title">No problems found</div><div class="empty-state-text">${currentCompany !== 'all' ? `No problems are tagged for ${currentCompany} yet.` : 'Try adjusting your filters or search query.'}</div></div>`
    : latestFiltered.map((p, i) => {
      const status = store.getProblemStatus(p.id);
      const statusClass = status === 'solved' ? 'solved' : status === 'attempted' ? 'attempted' : '';
      const statusIcon = status === 'solved' ? '✓' : status === 'attempted' ? '~' : '';
      const titleClass = status === 'solved' ? 'problem-title-text solved-title' : 'problem-title-text';
      const diffClass = `badge-${p.difficulty.toLowerCase()}`;

      const linkKey = p.slug || p.id;
      return `
        <div class="problem-row" data-id="${p.id}" onclick="navigateTo('/problem/${linkKey}')">
          <div>
            <button class="problem-status-dot ${statusClass}" onclick="event.stopPropagation(); window._toggleProblem('${p.id}','${p.difficulty}')">${statusIcon}</button>
          </div>
          <div class="problem-num">${i + 1}</div>
          <div class="${titleClass}">${p.title}</div>
          <div><span class="badge ${diffClass}">${p.difficulty}</span></div>
          <div class="problem-cat"><span class="tag">${catName(p.category)}</span></div>
          <div class="problem-action">
            ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="btn-icon" title="Open externally"><i data-lucide="external-link" width="14" height="14"></i></a>` : `<span class="btn-icon" title="External link unavailable" style="opacity:0.4;cursor:not-allowed;"><i data-lucide="link-2-off" width="14" height="14"></i></span>`}
          </div>
        </div>
      `;
    }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// Global toggle handler
window._toggleProblem = (id, difficulty) => {
  const current = store.getProblemStatus(id);
  if (current === 'solved') {
    store.markProblem(id, null);
    showToast('Problem unmarked', 'info');
  } else {
    store.solveProblem(id, difficulty);
    const xpGain = difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 25 : 50;
    showToast(`Solved! +${xpGain} XP`, 'success');
  }
  renderProblemRows();
};

window._clearCompanyFilter = () => {
  currentCompany = 'all';
  router.navigate('/problems');
};

window._openRevisionForCurrentTopic = () => {
  const topicId = currentCategory && currentCategory !== 'all' ? currentCategory : '';
  const path = topicId ? `/revision/${encodeURIComponent(topicId)}` : '/revision';
  router.navigate(path);
};
