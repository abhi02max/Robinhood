// ROBINHOOD — Companies Page v3 (DB-driven via /api/learning/companies)
//
// Migration note (Apr 2026):
// This page used to import { companies } from '../data/companies.js' AND
// { allProblems } from '../data/problems.js' to compute per-company problem
// counts client-side. Both static-data couplings are now gone — the page
// fetches the company taxonomy from /api/learning/companies on init and
// renders an empty grid + skeleton until the response arrives.
//
// The per-company problem count is currently sourced from the company's
// advertised `problemCount` (an ordinal "scale" hint) since the DB schema
// does not yet model company↔problem tagging — the API surfaces that gap
// explicitly via `schemaSupportsProblemMapping`.
import { fetchCompanies, ApiError } from '../utils/learning-api.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

let companyState = {
  loading: true,
  error: null,
  companies: [],
  industryFilter: 'all',
  tierFilter: 'all',
  query: '',
};

let abortController = null;

function applySearch(list, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) =>
    String(c.name || '').toLowerCase().includes(q)
    || String(c.industry || '').toLowerCase().includes(q)
    || String(c.tier || '').toLowerCase().includes(q),
  );
}

function applyFilters(list, state) {
  let filtered = applySearch(list, state.query);
  if (state.industryFilter !== 'all') {
    filtered = filtered.filter((c) => c.industry === state.industryFilter);
  }
  if (state.tierFilter !== 'all') {
    filtered = filtered.filter((c) => c.tier === state.tierFilter);
  }
  return filtered;
}

export function renderCompanies() {
  const tracks = [
    { label: 'Google Path', company: 'Google', note: 'Graphs, DP, trees, and system-like edge handling.' },
    { label: 'Amazon Path', company: 'Amazon', note: 'Arrays, hashmaps, greedy, and LP-style robustness.' },
    { label: 'Goldman Sachs Path', company: 'Goldman Sachs', note: 'Arrays, sorting, interval and implementation-heavy rounds.' },
    { label: 'HFT / Fintech Path', company: 'Jane Street', note: 'Math-heavy, optimization-first, strict complexity pressure.' },
  ];

  return `
  <div class="companies-page">
    <div class="anim-fade-up">
      <h1 class="page-title">Companies</h1>
      <p class="page-subtitle" id="companies-subtitle">Loading company catalog…</p>
    </div>
    <div class="companies-toolbar anim-fade-up delay-1">
      <input class="input search-input" id="company-search" type="text" placeholder="Search companies..." style="flex:1;max-width:360px;">
      <select class="select" id="industry-filter">
        <option value="all">All Industries</option>
        <option value="Big Tech">Big Tech</option>
        <option value="Finance">Finance</option>
        <option value="HFT">HFT / Trading</option>
        <option value="Fintech">Fintech</option>
        <option value="E-Commerce">E-Commerce</option>
      </select>
      <select class="select" id="tier-filter">
        <option value="all">All Tiers</option>
        <option value="FAANG">FAANG</option>
        <option value="Tier-1">Tier 1</option>
        <option value="Tier-2">Tier 2</option>
        <option value="Tier-3">Tier 3</option>
      </select>
    </div>
    <div class="chart-card anim-fade-up delay-1 company-mode-wrap" style="margin-bottom:var(--sp-5);">
      <div class="chart-card-title"><i data-lucide="target" width="16" height="16"></i> Company Interview Mode</div>
      <div class="company-mode-grid">
        ${tracks.map(track => `
          <button class="company-mode-card" onclick="navigateTo('/problems?company=${encodeURIComponent(track.company)}&category=all')">
            <span class="company-mode-card-title">${track.label}</span>
            <span class="company-mode-card-note">${track.note}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="companies-grid anim-fade-up delay-2" id="companies-grid">
      <div class="experience-muted" style="padding:24px;">Loading company catalog…</div>
    </div>
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initCompanies() {
  setRobinContext('Companies', 'Interview Prep', 'Which company track should I focus on and why?');
  initAskRobin();

  // Reset state for fresh navigations
  companyState = {
    loading: true,
    error: null,
    companies: [],
    industryFilter: 'all',
    tierFilter: 'all',
    query: '',
  };

  // Cancel any inflight fetch from a previous navigation
  if (abortController) abortController.abort();
  abortController = new AbortController();

  const subtitleEl = document.getElementById('companies-subtitle');
  const gridEl = document.getElementById('companies-grid');

  fetchCompanies({ signal: abortController.signal })
    .then((companies) => {
      companyState = { ...companyState, loading: false, companies };
      if (subtitleEl) {
        subtitleEl.textContent = `${companies.length} companies · Know what they ask · Prepare strategically`;
      }
      renderGrid();
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return;
      const message = error instanceof ApiError ? error.message : 'Failed to load companies';
      companyState = { ...companyState, loading: false, error: message };
      if (subtitleEl) subtitleEl.textContent = 'Failed to load company catalog.';
      if (gridEl) {
        gridEl.innerHTML = `
          <div class="experience-muted" style="padding:24px;">
            Couldn't load companies — ${message}.
            <button class="btn btn-secondary btn-sm" id="company-retry" style="margin-left:8px;">Retry</button>
          </div>`;
        document.getElementById('company-retry')?.addEventListener('click', () => initCompanies());
      }
    });

  document.getElementById('company-search')?.addEventListener('input', (event) => {
    companyState.query = event.target?.value || '';
    renderGrid();
  });
  document.getElementById('industry-filter')?.addEventListener('change', (event) => {
    companyState.industryFilter = event.target?.value || 'all';
    renderGrid();
  });
  document.getElementById('tier-filter')?.addEventListener('change', (event) => {
    companyState.tierFilter = event.target?.value || 'all';
    renderGrid();
  });
}

function renderGrid() {
  const grid = document.getElementById('companies-grid');
  if (!grid) return;

  if (companyState.loading) {
    grid.innerHTML = '<div class="experience-muted" style="padding:24px;">Loading company catalog…</div>';
    return;
  }
  if (companyState.error) {
    // Error UI is owned by the catch-branch in initCompanies; keep as-is.
    return;
  }

  const filtered = applyFilters(companyState.companies, companyState);
  if (!filtered.length) {
    grid.innerHTML = '<div class="experience-muted" style="padding:24px;">No companies match the current filters.</div>';
    return;
  }

  grid.innerHTML = filtered.map((c) => {
    const initials = String(c.name || '?')
      .split(/[\s\/]+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const problemCount = Number(c.problemCount || 0);
    const safeColor = c.color || 'var(--primary)';
    return `
      <div class="company-card card-interactive" onclick="navigateTo('/company/${encodeURIComponent(c.id)}')">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="company-logo" style="background:${safeColor};">${initials}</div>
          <div>
            <div class="company-name">${c.name}</div>
            <div class="company-meta">${c.industry || '—'} · ${c.tier || '—'}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <span class="badge badge-primary badge-pill">${problemCount} problems</span>
          <span class="badge badge-outline badge-pill">${c.avgDifficulty || '—'}</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-3);">
          ${(c.rounds || []).join(' → ') || 'Process info coming soon'}
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) window.lucide.createIcons();
}
