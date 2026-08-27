// ROBINHOOD — Global Command Palette
//
// Phase A migration note (Apr 2026): formerly imported `searchProblems` and
// `allProblems` from the static `../data/problems.js`. Now reads from the
// hydrated /api/learning/problems-index cache. The cache exposes the same
// function names so this is a drop-in source swap. One field rename:
// the legacy `problem.category` (string) is now `problem.topic.name` and
// problems no longer carry per-row `companies` (companies are an external
// taxonomy in the DB) — the result-row subtitle was updated accordingly.
import { router } from '../router.js';
import { searchProblems, getAllProblems } from '../utils/problems-cache.js';
import store from '../store.js';

let isPaletteOpen = false;
let paletteInitialized = false;

export function initCommandPalette() {
  if (paletteInitialized) return;
  paletteInitialized = true;

  // Inject HTML structure into body if not exists
  if (!document.getElementById('command-palette')) {
    const paletteHtml = `
      <div id="command-palette-backdrop" class="cmd-backdrop hidden"></div>
      <div id="command-palette" class="cmd-palette hidden">
        <div class="cmd-header">
          <i data-lucide="search" width="20" height="20" style="color:var(--text-3);"></i>
          <input type="text" id="cmd-input" class="cmd-input" placeholder="Search problems, concepts, or jump to..." autocomplete="off" spellcheck="false" />
          <div class="cmd-esc">ESC</div>
        </div>
        <div class="cmd-results" id="cmd-results">
          <!-- Default empty state -->
          <div class="cmd-label">Quick Actions</div>
          <div class="cmd-item" data-action="theme">
            <i data-lucide="moon" width="16" height="16"></i> Toggle Dark Mode
          </div>
          <div class="cmd-item" data-route="/learn/dsa">
            <i data-lucide="rocket" width="16" height="16"></i> Start Journey
          </div>
          <div class="cmd-item" data-route="/dashboard">
            <i data-lucide="layout-dashboard" width="16" height="16"></i> Go to Dashboard
          </div>
          <div class="cmd-item" data-route="/problems">
            <i data-lucide="code-2" width="16" height="16"></i> Browse All Problems
          </div>
          <div class="cmd-item" data-route="/sheets?sheet=75">
            <i data-lucide="notebook-tabs" width="16" height="16"></i> Open Robinhood 75 Sheet
          </div>
          <div class="cmd-item" data-route="/sql-track">
            <i data-lucide="database" width="16" height="16"></i> Open SQL A-Z Track
          </div>
          <div class="cmd-item" data-route="/interview/mock?type=technical">
            <i data-lucide="mic" width="16" height="16"></i> Start Interview Session
          </div>
          <div class="cmd-item" data-route="/concept-map">
            <i data-lucide="git-merge" width="16" height="16"></i> View Concept Map
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', paletteHtml);
    if (window.lucide) window.lucide.createIcons();
  }

  const backdrop = document.getElementById('command-palette-backdrop');
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('cmd-input');
  const resultsContainer = document.getElementById('cmd-results');

  // Key event listeners
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      togglePalette();
    }
    // Escape
    if (e.key === 'Escape' && isPaletteOpen) {
      togglePalette(false);
    }
  });

  backdrop.addEventListener('click', () => togglePalette(false));

  input.addEventListener('input', (e) => {
    const query = e.target.value;
    renderResults(query, resultsContainer);
  });

  function togglePalette(forceState) {
    if (typeof forceState === 'boolean') {
      isPaletteOpen = forceState;
    } else {
      isPaletteOpen = !isPaletteOpen;
    }

    if (isPaletteOpen) {
      backdrop.classList.remove('hidden');
      palette.classList.remove('hidden');
      input.value = '';
      renderResults('', resultsContainer);
      setTimeout(() => input.focus(), 100);
    } else {
      backdrop.classList.add('hidden');
      palette.classList.add('hidden');
      input.blur();
    }
  }
}

function renderResults(query, container) {
  if (!query.trim()) {
    container.innerHTML = `
      <div class="cmd-label">Quick Actions</div>
      <div class="cmd-item executable" data-action="theme"><i data-lucide="moon" width="16" height="16"></i> Toggle Dark/Light Mode</div>
      <div class="cmd-item executable" data-route="/learn/dsa"><i data-lucide="rocket" width="16" height="16"></i> Start Journey</div>
      <div class="cmd-item executable" data-route="/dashboard"><i data-lucide="layout-dashboard" width="16" height="16"></i> Go to Dashboard</div>
      <div class="cmd-item executable" data-route="/sheets?sheet=75"><i data-lucide="notebook-tabs" width="16" height="16"></i> Robinhood 75 Sheet</div>
      <div class="cmd-item executable" data-route="/sql-track"><i data-lucide="database" width="16" height="16"></i> SQL A-Z Track</div>
      <div class="cmd-item executable" data-route="/interview/mock?type=technical"><i data-lucide="mic" width="16" height="16"></i> Start Interview Session</div>
      <div class="cmd-item executable" data-route="/concept-map"><i data-lucide="git-merge" width="16" height="16"></i> Concept Map</div>
      <div class="cmd-label" style="margin-top:12px;">Suggested Problems</div>
      ${getAllProblems().slice(0, 3).map(p => `
        <div class="cmd-item executable" data-route="/problem/${p.slug || p.id}">
          <i data-lucide="file-code" width="16" height="16" style="color:var(--text-4)"></i> 
          <span>${p.title}</span>
          <span class="badge badge-${(p.difficulty || 'easy').toLowerCase()}" style="margin-left:auto;font-size:10px;">${p.difficulty || 'Easy'}</span>
        </div>
      `).join('')}
    `;
    bindItemEvents();
    return;
  }

  // Search mode
  const rawResults = searchProblems(query);
  const results = rawResults.slice(0, 8); // top 8

  if (results.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-4);font-size:13px;">No problems found matching "${query}"</div>`;
    return;
  }

  container.innerHTML = `
    <div class="cmd-label">Problem Search</div>
    ${results.map(p => `
      <div class="cmd-item executable" data-route="/problem/${p.slug || p.id}">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:500;">${p.title}</div>
          <div style="font-size:11px;color:var(--text-4);">${p.topic?.name || p.topic?.slug || ''}${p.pattern?.name ? ` · ${p.pattern.name}` : ''}</div>
        </div>
        <span class="badge badge-${p.difficulty.toLowerCase()}" style="margin-left:auto;font-size:10px;">${p.difficulty}</span>
      </div>
    `).join('')}
  `;
  bindItemEvents();
}

function bindItemEvents() {
  document.querySelectorAll('.cmd-item.executable').forEach(el => {
    el.addEventListener('click', () => {
      // Execute route or action
      if (el.dataset.route) {
        window.navigateTo(el.dataset.route);
      } else if (el.dataset.action === 'theme') {
        const current = store.get('preferences').theme || 'dark';
        store.setTheme(current === 'dark' ? 'light' : 'dark');
      }
      
      // Close palette via simulated escape
      document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Escape' }));
    });
  });
  if (window.lucide) window.lucide.createIcons();
}
