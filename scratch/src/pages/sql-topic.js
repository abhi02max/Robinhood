// ============================================
// SQL TOPIC — Topic Detail Page
// /sql-track/:topic → Explanation + Examples + Problems
// ============================================

import { SQL_TOPICS, getSqlTopic, getSqlProblemsByTopic, getSqlTopicStats } from '../data/sql-registry.js';
import { sqlStore } from '../data/sql-store.js';
import { initSqlEngine, executeQuery } from '../data/sql-engine.js';

export function renderSqlTopic(topicId) {
  const topic = getSqlTopic(topicId);
  if (!topic) {
    return `<div class="page-wrap"><h1>Topic not found</h1><p>The topic "${topicId}" does not exist.</p><a href="#/sql-track">← Back to SQL Track</a></div>`;
  }

  const problems = getSqlProblemsByTopic(topicId);
  const stats = getSqlTopicStats(topicId);
  const progress = sqlStore.getTopicProgress(topicId);
  const streak = sqlStore.getSqlStreak();
  const dailyGoal = sqlStore.getDailyGoalStatus();
  const nextProblem = sqlStore.getNextRecommendedProblem();

  // ── Left Sidebar: Topic navigation ──
  const topicNav = SQL_TOPICS.map(t => {
    const tp = sqlStore.getTopicProgress(t.id);
    const isActive = t.id === topicId;
    const statusIcon = tp.solved === tp.total && tp.total > 0 ? '✓' :
                       tp.solved > 0 ? `${tp.solved}/${tp.total}` : '—';
    return `
      <button class="sql-sidebar-topic ${isActive ? 'active' : ''}" data-sql-nav-topic="${t.id}">
        <span class="sql-sidebar-topic-name">${t.name}</span>
        <span class="sql-sidebar-topic-status">${statusIcon}</span>
      </button>
    `;
  }).join('');

  // ── Example queries ──
  const examplesHtml = topic.exampleQueries.map((ex, i) => `
    <div class="sql-example-card anim-fade-up delay-${i + 1}">
      <div class="sql-example-header">
        <h4>${ex.title}</h4>
        <button class="btn btn-xs btn-outline sql-run-example-btn" data-example-idx="${i}">▶ Run</button>
      </div>
      <pre class="sql-code-block"><code>${escapeHtml(ex.query)}</code></pre>
      <p class="sql-example-explanation">${ex.explanation}</p>
      <div class="sql-example-output" id="sql-example-output-${i}" style="display:none;"></div>
    </div>
  `).join('');

  // ── Concept list ──
  const conceptsHtml = topic.conceptList.map(c => `<li>${c}</li>`).join('');

  // ── Problems table ──
  const problemRows = problems.map(p => {
    const status = sqlStore.getSqlProblemStatus(p.id);
    const isUnlocked = sqlStore.isProblemUnlocked(p.id);
    const statusIcon = status === 'solved' ? '<span class="sql-status-solved">✓</span>' :
                       status === 'attempted' ? '<span class="sql-status-attempted">●</span>' :
                       '<span class="sql-status-unseen">○</span>';
    const tierLabel = p.tier === 1 ? 'Beginner' : p.tier === 2 ? 'Intermediate' : 'Advanced';
    const companies = p.companies.slice(0, 2).map(c => `<span class="sql-company-mini">${c}</span>`).join('');
    const lockIcon = !isUnlocked ? '<span class="sql-lock-icon" title="Solve more problems to unlock">🔒</span>' : '';

    return `
      <tr class="sql-problem-row ${!isUnlocked ? 'locked' : ''} ${status === 'solved' ? 'solved' : ''}" 
          ${isUnlocked ? `data-sql-problem="${p.topicId}/${p.id}"` : ''} 
          ${!isUnlocked ? 'title="Complete more problems in the previous tier to unlock"' : ''}>
        <td class="sql-problem-status-cell">${statusIcon}</td>
        <td class="sql-problem-title-cell">
          <span class="sql-problem-title-text">${p.title}</span>
          ${lockIcon}
        </td>
        <td><span class="difficulty-badge difficulty-${p.difficulty.toLowerCase()}">${p.difficulty}</span></td>
        <td class="sql-problem-tier-cell"><span class="sql-tier-label tier-${p.tier}">${tierLabel}</span></td>
        <td class="sql-problem-companies-cell">${companies}</td>
        <td class="sql-problem-xp-cell">+${p.xpReward} XP</td>
      </tr>
    `;
  }).join('');

  // ── Right sidebar widgets ──
  const dailyChunks = Array.from({ length: dailyGoal.goal }, (_, i) =>
    `<div class="sql-goal-chunk ${i < dailyGoal.solved ? 'filled' : ''}"></div>`
  ).join('');

  const nextCta = nextProblem && nextProblem.topicId === topicId ? `
    <div class="sql-widget sql-widget-next">
      <span class="sql-widget-label">Next Up</span>
      <span class="sql-widget-value-sm">${nextProblem.title}</span>
      <button class="btn btn-xs btn-primary" data-sql-solve="${nextProblem.topicId}/${nextProblem.id}">Solve →</button>
    </div>
  ` : '';

  return `
    <div class="sql-topic-page">
      <div class="sql-breadcrumb anim-fade-up">
        <a href="#/sql-track">SQL Track</a>
        <span class="sql-breadcrumb-sep">›</span>
        <span class="sql-breadcrumb-current">${topic.name}</span>
      </div>

      <div class="sql-topic-layout">
        <!-- Left Sidebar -->
        <aside class="sql-topic-sidebar-left">
          <div class="experience-panel compact">
            <span class="experience-label">Topics</span>
            <div class="sql-sidebar-topic-list">
              ${topicNav}
            </div>
          </div>
          <div class="experience-panel compact" style="margin-top: var(--sp-4);">
            <span class="experience-label">Filter</span>
            <div class="sql-filter-pills">
              <button class="sql-filter-pill active" data-sql-filter="all">All (${stats.total})</button>
              <button class="sql-filter-pill" data-sql-filter="Easy">Easy (${stats.easy})</button>
              <button class="sql-filter-pill" data-sql-filter="Medium">Medium (${stats.medium})</button>
              <button class="sql-filter-pill" data-sql-filter="Hard">Hard (${stats.hard})</button>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="sql-topic-main">
          <div class="sql-topic-hero anim-fade-up">
            <div class="sql-topic-hero-header" style="background: ${topic.color}">
              <span class="sql-topic-hero-icon"><i data-lucide="${topic.icon}"></i></span>
              <h1>${topic.name}</h1>
            </div>
            <div class="sql-topic-progress-inline">
              <div class="sql-topic-progress-bar">
                <div class="sql-topic-progress-fill" style="width: ${progress.percentage}%"></div>
              </div>
              <span class="sql-topic-progress-label">${progress.solved}/${progress.total} solved (${progress.percentage}%)</span>
            </div>
          </div>

          <!-- Explanation -->
          <section class="sql-section anim-fade-up delay-1">
            <h2 class="sql-section-title">Concepts</h2>
            <div class="sql-explanation">
              ${topic.explanation.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
            </div>
            <ul class="sql-concept-list">
              ${conceptsHtml}
            </ul>
          </section>

          <!-- Examples -->
          <section class="sql-section anim-fade-up delay-2">
            <h2 class="sql-section-title">Example Queries</h2>
            <div class="sql-examples-grid">
              ${examplesHtml}
            </div>
          </section>

          <!-- Problems -->
          <section class="sql-section anim-fade-up delay-3">
            <h2 class="sql-section-title">Problems</h2>
            <div class="sql-problems-table-wrap">
              <table class="sql-problems-table" id="sql-problems-table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th>Problem</th>
                    <th width="90">Difficulty</th>
                    <th width="100">Tier</th>
                    <th width="120">Companies</th>
                    <th width="70">XP</th>
                  </tr>
                </thead>
                <tbody>
                  ${problemRows}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <!-- Right Sidebar -->
        <aside class="sql-topic-sidebar-right">
          <div class="sql-widget sql-widget-goal">
            <span class="sql-widget-label">Today's Goal</span>
            <div class="sql-goal-bar">${dailyChunks}</div>
            <span class="sql-widget-sub">${dailyGoal.solved}/${dailyGoal.goal} problems${dailyGoal.completed ? ' ✓' : ''}</span>
          </div>
          <div class="sql-widget sql-widget-streak">
            <span class="sql-widget-label">Streak</span>
            <span class="sql-widget-value">${streak.current > 0 ? '🔥' : ''} ${streak.current} day${streak.current !== 1 ? 's' : ''}</span>
          </div>
          ${nextCta}
          <div class="sql-widget">
            <span class="sql-widget-label">Quick Links</span>
            <a href="#/debugger" class="sql-quick-link">SQL Debugger →</a>
            <a href="#/learn" class="sql-quick-link">Learn DBMS →</a>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initSqlTopic(topicId) {
  // Topic sidebar navigation
  document.querySelectorAll('[data-sql-nav-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/sql-track/${btn.dataset.sqlNavTopic}`;
    });
  });

  // Problem row click
  document.querySelectorAll('[data-sql-problem]').forEach(row => {
    row.addEventListener('click', () => {
      window.location.hash = `#/sql-track/${row.dataset.sqlProblem}`;
    });
  });

  // Solve CTA
  document.querySelectorAll('[data-sql-solve]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = `#/sql-track/${btn.dataset.sqlSolve}`;
    });
  });

  // Difficulty filter
  document.querySelectorAll('[data-sql-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-sql-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.sqlFilter;
      document.querySelectorAll('.sql-problem-row').forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else {
          const badge = row.querySelector('.difficulty-badge');
          const difficulty = badge?.textContent?.trim() || '';
          row.style.display = difficulty === filter ? '' : 'none';
        }
      });
    });
  });

  // Run example buttons
  document.querySelectorAll('.sql-run-example-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.exampleIdx);
      const topic = getSqlTopic(topicId);
      if (!topic || !topic.exampleQueries[idx]) return;

      const ex = topic.exampleQueries[idx];
      const outputEl = document.getElementById(`sql-example-output-${idx}`);
      if (!outputEl) return;

      btn.disabled = true;
      btn.textContent = '⏳ Running...';
      outputEl.style.display = 'block';
      outputEl.innerHTML = '<p class="sql-loading">Initializing SQL engine...</p>';

      try {
        const SQL = await initSqlEngine();
        // Use sample output directly since examples don't have schema seeds
        const data = ex.sampleOutput;
        outputEl.innerHTML = renderDataTable(data.columns, data.rows);
      } catch (err) {
        outputEl.innerHTML = `<p class="sql-error-text">Error: ${escapeHtml(err.message)}</p>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '▶ Run';
      }
    });
  });

  // Render Lucide icons
  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  }
}

// ── Helpers ───────────────────────────────

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
    <p class="sql-result-meta">${rows.length} row${rows.length !== 1 ? 's' : ''} returned</p>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default { renderSqlTopic, initSqlTopic };
