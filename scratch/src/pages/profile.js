// ROBINHOOD — Profile Page v4 (DB-driven via /api/learning/problems-index)
//
// Migration note (Apr 2026):
// Previously imported `allProblems` from '../data/problems.js' to compute
// completion %, by-difficulty %, topic strength, and the recent-activity
// feed. The static dependency is gone — the page fetches the compact
// problems index from /api/learning/problems-index on init and recomputes
// the same stats against THAT.
//
// Initial render uses an empty index (zeros across the board) and a
// loading subtitle; init() repaints once the data arrives.
import store from '../store.js';
import { fetchProblemsIndex, indexProblemsById, ApiError } from '../utils/learning-api.js';
import { ACHIEVEMENT_DEFS, computeAchievementProgress } from '../data/achievements.js';
import { router } from '../router.js';
import { showToast } from '../components/notifications.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

// Page-scoped cache. Reset on every initProfile() so a stale snapshot from
// a previous mount is never reused.
let problemsIndex = [];
let problemIndexById = new Map();
let abortController = null;

function toTitleCase(text = '') {
  return String(text)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function rankFromSolved(solved) {
  if (solved >= 350) return 'Grandmaster';
  if (solved >= 250) return 'Expert';
  if (solved >= 150) return 'Advanced';
  if (solved >= 75) return 'Intermediate';
  return 'Beginner';
}

function buildProfileViewModel() {
  const user = store.get('user');
  const solved = store.getSolvedCount();
  const byDiff = store.getSolvedByDifficulty();
  const streak = store.get('streaks');
  const xp = store.get('xp');
  const achievements = store.get('achievements') || [];
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const theme = store.getTheme();
  const progress = store.get('progress') || {};
  const readiness = store.getReadinessScore();
  const consistency = store.getConsistencyScore();

  // All these stats now come from the in-memory `problemsIndex` cache,
  // populated by initProfile() from /api/learning/problems-index. When
  // the index hasn't loaded yet, totals/percentages safely degrade to 0.
  const totalProblems = problemsIndex.length;
  const completionPct = totalProblems ? Math.round((solved / totalProblems) * 100) : 0;
  const rank = rankFromSolved(solved);
  const heatmap = store.getHeatmapData().slice(-84);

  const recent = Object.entries(progress)
    .filter(([, v]) => v.status === 'solved')
    .sort((a, b) => String(b[1].solvedDate || '').localeCompare(String(a[1].solvedDate || '')))
    .slice(0, 8)
    .map(([id, meta]) => ({ problem: problemIndexById.get(String(id)) || null, meta }))
    .filter((x) => x.problem);

  // Topic strength: was grouped by static `p.category`. Now grouped by
  // `p.topic.slug` (DB equivalent). Falls back to 'unknown' for rows
  // with missing topic info — should be empty in practice.
  const topicStrength = Object.entries(
    problemsIndex.reduce((acc, p) => {
      const cat = p?.topic?.slug || 'unknown';
      const solvedFlag = progress[p.id]?.status === 'solved' ? 1 : 0;
      const item = acc[cat] || { solved: 0, total: 0 };
      item.total += 1;
      item.solved += solvedFlag;
      acc[cat] = item;
      return acc;
    }, {})
  )
    .map(([cat, v]) => ({ cat, pct: v.total ? Math.round((v.solved / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  const achievementStats = { solved, streak: streak?.current || 0, byDiff, xp: xp?.total || 0 };
  const easyTotal = problemsIndex.filter((p) => p.difficulty === 'Easy').length;
  const mediumTotal = problemsIndex.filter((p) => p.difficulty === 'Medium').length;
  const hardTotal = problemsIndex.filter((p) => p.difficulty === 'Hard').length;
  const completionByDiff = {
    Easy: Math.round(((byDiff.Easy || 0) / Math.max(1, easyTotal)) * 100),
    Medium: Math.round(((byDiff.Medium || 0) / Math.max(1, mediumTotal)) * 100),
    Hard: Math.round(((byDiff.Hard || 0) / Math.max(1, hardTotal)) * 100),
  };
  return {
    user, solved, byDiff, streak, xp, achievements, initial, theme, progress,
    readiness, consistency, totalProblems, completionPct, rank, heatmap,
    recent, topicStrength, achievementStats, completionByDiff,
  };
}

export function renderProfile() {
  const vm = buildProfileViewModel();
  const {
    user, solved, byDiff, streak, xp, achievements, initial, theme,
    readiness, consistency, completionPct, rank, heatmap,
    recent, topicStrength, achievementStats, completionByDiff,
  } = vm;
  const unlockedDefs = ACHIEVEMENT_DEFS.filter((a) => achievements.includes(a.id));
  const hasUnlockedAchievements = unlockedDefs.length > 0;
  const nextAchievement = ACHIEVEMENT_DEFS
    .map((a) => ({ def: a, progress: computeAchievementProgress(a, achievementStats) }))
    .filter((x) => !x.progress.unlocked)
    .sort((a, b) => (a.progress.target - a.progress.current) - (b.progress.target - b.progress.current))[0] || null;

  const storedGoals = store.get('profileGoals') || [
    { id: 'goal-1', text: 'Solve 5 problems this week', done: false },
    { id: 'goal-2', text: 'Finish 2 CS topics', done: false },
    { id: 'goal-3', text: 'Keep a 7-day streak', done: false },
  ];

  return `
  <div class="profile-page">
    <div class="profile-header anim-fade-up">
      <label class="profile-avatar" style="cursor:pointer;">
        ${initial}
        <input type="file" id="profile-avatar-input" accept="image/*" style="display:none;" />
      </label>
      <div style="flex:1;">
        <div class="profile-name">${user?.name || 'User'}</div>
        <div class="profile-joined">Rank: ${rank} · Level ${xp?.level || 1} ${xp?.title || 'Novice'}</div>
        <div class="profile-meta-grid">
          <div><i data-lucide="mail" width="14" height="14"></i> ${user?.email || 'No email'}</div>
          <div><i data-lucide="calendar-days" width="14" height="14"></i> Joined ${user?.joinDate || 'today'}</div>
          <div><i data-lucide="target" width="14" height="14"></i> ${completionPct}% completion</div>
          <div><i data-lucide="flame" width="14" height="14"></i> ${streak?.current || 0} day streak</div>
        </div>
        <div style="margin-top:8px;">
          <textarea id="profile-bio" class="input" rows="2" placeholder="Add your bio / learning goals...">${store.get('profileBio') || ''}</textarea>
          <button class="btn btn-secondary btn-sm" id="save-profile-bio" style="margin-top:8px;">Save Bio</button>
        </div>
      </div>
    </div>

    <div class="profile-stats-grid anim-fade-up delay-1">
      <div class="stat-card"><div><div class="stat-value">${solved}</div><div class="stat-label">Solved</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${xp?.total || 0}</div><div class="stat-label">XP</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${readiness}%</div><div class="stat-label">Readiness</div></div></div>
      <div class="stat-card"><div><div class="stat-value">${consistency}%</div><div class="stat-label">Consistency</div></div></div>
    </div>

    <div class="profile-grid anim-fade-up delay-2">
      <div>
        <div class="profile-section-title"><i data-lucide="activity" width="16" height="16"></i> Activity Heatmap (12 weeks)</div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div class="profile-heatmap">
            ${heatmap.map((d) => `<div class="profile-heat-cell" data-level="${d.level}" title="${d.date}: ${d.count} solved"></div>`).join('')}
          </div>
        </div>

        <div class="profile-section-title"><i data-lucide="clock-3" width="16" height="16"></i> Recent Activity</div>
        <div class="chart-card" style="margin-bottom:12px;">
          ${recent.length ? recent.map((r) => `
            <div class="settings-row">
              <div>
                <div class="settings-label">${r.problem.title}</div>
                <div class="settings-desc">${r.meta.solvedDate || 'recent'} · ${toTitleCase(r.problem.topic?.name || r.problem.topic?.slug || '')}</div>
              </div>
              <span class="badge badge-${(r.problem.difficulty || 'easy').toLowerCase()}">${r.problem.difficulty}</span>
            </div>
          `).join('') : '<div class="settings-desc">No recent solved problems yet.</div>'}
        </div>

        <div class="profile-section-title"><i data-lucide="target" width="16" height="16"></i> Goals</div>
        <div class="chart-card">
          ${storedGoals.map((g) => `
            <div class="settings-row">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" data-goal-toggle="${g.id}" ${g.done ? 'checked' : ''} />
                <span class="${g.done ? 'goal-done' : ''}">${g.text}</span>
              </label>
            </div>
          `).join('')}
          <div style="display:flex;gap:8px;margin-top:10px;">
            <input id="profile-goal-input" class="input" placeholder="Add a new goal..." />
            <button id="profile-goal-add" class="btn btn-secondary btn-sm">Add</button>
          </div>
        </div>
      </div>

      <div>
        <div class="profile-section-title"><i data-lucide="settings" width="16" height="16"></i> Account Controls</div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div class="settings-row">
            <div><div class="settings-label">Theme</div><div class="settings-desc">Switch dark/light mode</div></div>
            <button class="toggle ${theme === 'dark' ? 'active' : ''}" id="profile-theme-toggle"></button>
          </div>
          <div class="settings-row">
            <div><div class="settings-label">Sound Effects</div><div class="settings-desc">Play sounds for achievements</div></div>
            <button class="toggle ${store.get('preferences')?.soundEnabled ? 'active' : ''}" id="profile-sound-toggle"></button>
          </div>
          <div class="settings-row">
            <div><div class="settings-label">Reset Progress</div><div class="settings-desc">Clear all data (cannot undo)</div></div>
            <button class="btn btn-danger btn-sm" id="reset-progress-btn">Reset</button>
          </div>
          <div style="margin-top:var(--sp-4);">
            <button class="btn btn-secondary" id="logout-btn" style="width:100%;">
              <i data-lucide="log-out" width="16" height="16"></i> Sign Out
            </button>
          </div>
        </div>

        <div class="profile-section-title"><i data-lucide="bar-chart-3" width="16" height="16"></i> Progress Breakdown</div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div class="settings-row"><div class="settings-label">Easy</div><div>${byDiff.Easy} · ${completionByDiff.Easy}%</div></div>
          <div class="settings-row"><div class="settings-label">Medium</div><div>${byDiff.Medium} · ${completionByDiff.Medium}%</div></div>
          <div class="settings-row" style="border-bottom:none;"><div class="settings-label">Hard</div><div>${byDiff.Hard} · ${completionByDiff.Hard}%</div></div>
        </div>

        <div class="profile-section-title"><i data-lucide="lightbulb" width="16" height="16"></i> Improvement Insights</div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div class="settings-row"><div><div class="settings-label">Readiness Driver</div><div class="settings-desc">${readiness < 60 ? 'Increase solved volume + medium consistency.' : 'Push harder on medium/hard mix for interview readiness.'}</div></div></div>
          <div class="settings-row"><div><div class="settings-label">Consistency Signal</div><div class="settings-desc">${consistency < 50 ? 'Your activity is bursty. Aim for 1-2 daily solves.' : 'Good habit shape. Keep your streak shield unused.'}</div></div></div>
          <div class="settings-row" style="border-bottom:none;"><div><div class="settings-label">Difficulty Balance</div><div class="settings-desc">Easy ${completionByDiff.Easy}% · Medium ${completionByDiff.Medium}% · Hard ${completionByDiff.Hard}%. Raise the weakest track next.</div></div></div>
        </div>

        <div class="profile-section-title"><i data-lucide="radar" width="16" height="16"></i> Strongest Topics</div>
        <div class="chart-card" style="margin-bottom:12px;">
          ${topicStrength.map((t) => `
            <div class="settings-row">
              <div class="settings-label">${toTitleCase(t.cat)}</div>
              <div style="min-width:140px;">
                <div class="progress-bar"><div class="progress-fill" style="width:${t.pct}%"></div></div>
              </div>
              <span class="settings-desc">${t.pct}%</span>
            </div>
          `).join('')}
        </div>

        <div class="profile-section-title"><i data-lucide="trophy" width="16" height="16"></i> Achievements</div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">Unlocked ${achievements.length}/${ACHIEVEMENT_DEFS.length}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.round((achievements.length / ACHIEVEMENT_DEFS.length) * 100)}%"></div></div>
          ${nextAchievement ? `<div class="settings-desc" style="margin-top:8px;">Next target: <strong>${nextAchievement.def.name}</strong> (${nextAchievement.progress.current}/${nextAchievement.progress.target})</div>` : '<div class="settings-desc" style="margin-top:8px;">All achievements unlocked. Legendary.</div>'}
        </div>
        <div class="chart-card" style="margin-bottom:12px;">
          <div class="settings-label" style="margin-bottom:8px;">Recently Unlocked</div>
          ${hasUnlockedAchievements ? unlockedDefs.slice(-3).reverse().map((a) => `<div class="settings-row"><div><div class="settings-label">${a.emoji} ${a.name}</div><div class="settings-desc">${a.desc}</div></div><span class="badge badge-success">Unlocked</span></div>`).join('') : '<div class="settings-desc">Solve your first problem to unlock badges.</div>'}
        </div>
        ${hasUnlockedAchievements ? `
          <div class="achievements-grid" style="margin-bottom:12px;">
            ${unlockedDefs.map((a) => `
              <div class="achievement-card unlocked" title="${a.desc}">
                <div class="achievement-emoji">${a.emoji}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-reason">${a.desc}</div>
                <div class="achievement-progress">Unlocked</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initProfile() {
  setRobinContext('Profile', 'Performance', 'Analyze my profile stats and suggest what to improve next.');
  initAskRobin();

  // Cancel any inflight fetch from a previous navigation
  if (abortController) abortController.abort();
  abortController = new AbortController();
  // Reset the cache so a stale index from before doesn't influence the
  // first paint after the fetch resolves.
  problemsIndex = [];
  problemIndexById = new Map();

  fetchProblemsIndex({ signal: abortController.signal })
    .then((problems) => {
      problemsIndex = problems;
      problemIndexById = indexProblemsById(problems);
      // Repaint the entire profile body so all the derived stats refresh.
      const root = document.querySelector('.profile-page');
      if (root && root.parentElement) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderProfile();
        const fresh = wrapper.firstElementChild;
        if (fresh) {
          root.parentElement.replaceChild(fresh, root);
          // Re-wire all event handlers on the fresh DOM.
          wireProfileEvents();
        }
      }
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return;
      const message = error instanceof ApiError ? error.message : 'Failed to load profile stats';
      // Toast — keeps the partial profile usable rather than blanking it.
      try { showToast(`Profile stats degraded: ${message}`, 'warning'); } catch (_) {}
    });

  wireProfileEvents();
}

function wireProfileEvents() {
  document.getElementById('save-profile-bio')?.addEventListener('click', () => {
    const bio = document.getElementById('profile-bio')?.value || '';
    store.set('profileBio', bio);
    showToast('Profile bio saved.', 'success');
  });

  document.getElementById('profile-avatar-input')?.addEventListener('change', () => {
    showToast('Avatar upload wired (storage integration next step).', 'info');
  });

  document.getElementById('profile-theme-toggle')?.addEventListener('click', (e) => {
    const newTheme = store.toggleTheme();
    e.target.classList.toggle('active');
    showToast(`Switched to ${newTheme} mode`, 'info');
  });

  document.getElementById('profile-sound-toggle')?.addEventListener('click', (e) => {
    const current = store.get('preferences')?.soundEnabled;
    store.update('preferences', (p) => ({ ...p, soundEnabled: !current }));
    e.target.classList.toggle('active');
  });

  document.querySelectorAll('[data-goal-toggle]').forEach((node) => {
    node.addEventListener('change', () => {
      const id = node.getAttribute('data-goal-toggle');
      const goals = [...(store.get('profileGoals') || [])];
      const idx = goals.findIndex((g) => g.id === id);
      if (idx >= 0) {
        goals[idx] = { ...goals[idx], done: !!node.checked };
        store.set('profileGoals', goals);
      }
    });
  });

  document.getElementById('profile-goal-add')?.addEventListener('click', () => {
    const input = document.getElementById('profile-goal-input');
    const text = (input?.value || '').trim();
    if (!text) return;
    const goals = [...(store.get('profileGoals') || [])];
    goals.push({ id: `goal-${Date.now()}`, text, done: false });
    store.set('profileGoals', goals);
    showToast('Goal added.', 'success');
    router.navigate('/profile');
  });

  document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
    if (confirm('Reset all your progress? This cannot be undone.')) {
      const user = store.get('user');
      localStorage.removeItem('robinhood_data');
      store.state = { ...store.loadState(), user };
      store.saveState();
      showToast('Progress reset.', 'info');
      router.navigate('/dashboard');
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    store.logout();
    showToast('Signed out.', 'info');
    router.navigate('/');
  });

  if (window.lucide) window.lucide.createIcons();
}
