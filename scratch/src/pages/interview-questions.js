import { 
  getCategoryById, 
  getQuestionsByCategory, 
  INTERVIEW_ROLES, 
  INTERVIEW_COMPANIES 
} from '../data/interview-registry.js';
import { interviewStore } from '../data/interview-store.js';

let currentFilters = {
  subcategory: 'all',
  difficulty: 'all',
  company: 'all',
  role: 'all',
  status: 'all'
};

export function renderInterviewQuestions(params = {}) {
  const categoryId = params?.category || 'technical';
  const categoryDefinition = getCategoryById(categoryId);
  
  if (!categoryDefinition) {
    return `<div class="iv-page"><h2>Category not found: ${categoryId}</h2></div>`;
  }

  const allQuestions = getQuestionsByCategory(categoryId);
  
  // Apply visual filters
  const filteredQuestions = allQuestions.filter(q => {
    if (currentFilters.subcategory !== 'all' && q.subcategory !== currentFilters.subcategory) return false;
    if (currentFilters.difficulty !== 'all' && q.difficulty.toLowerCase() !== currentFilters.difficulty) return false;
    
    // Company filter (q.companies is array of strings e.g. ['google', 'amazon'])
    if (currentFilters.company !== 'all' && (!q.companies || !q.companies.includes(currentFilters.company))) return false;
    
    // Role filter
    if (currentFilters.role !== 'all' && (!q.roles || !q.roles.includes(currentFilters.role))) return false;
    
    // Status filter
    if (currentFilters.status !== 'all') {
      const qStatus = interviewStore.getQuestionStatus(q.id);
      if (qStatus !== currentFilters.status) return false;
    }
    
    return true;
  });

  const catProg = interviewStore.getCategoryProgress(categoryId);
  const goalStatus = interviewStore.getDailyGoalStatus();
  const bookmarks = interviewStore.getBookmarkedQuestions();

  const renderStatusIcon = (qId) => {
    const status = interviewStore.getQuestionStatus(qId);
    if (status === 'mastered') return `<i data-lucide="check-circle-2" style="color:var(--success)"></i>`;
    if (status === 'practiced') return `<i data-lucide="circle-dot" style="color:var(--warning)"></i>`;
    return `<i data-lucide="circle" class="text-muted"></i>`;
  };

  const renderTableRows = () => {
    if (filteredQuestions.length === 0) {
      return `<tr><td colspan="5" class="iv-table-empty">No questions match your current filters.</td></tr>`;
    }
    return filteredQuestions.map(q => `
      <tr class="iv-question-row" data-iv-q-id="${q.id}" data-iv-route="/interview/${categoryId}/${q.id}">
        <td class="iv-col-status">${renderStatusIcon(q.id)}</td>
        <td class="iv-col-title">
          <strong>${q.title}</strong>
          <span class="iv-subtext">${categoryDefinition.subcategories.find(s=>s.id===q.subcategory)?.name || q.subcategory}</span>
        </td>
        <td class="iv-col-diff"><span class="iv-tag iv-tag-${q.difficulty.toLowerCase()}">${q.difficulty}</span></td>
        <td class="iv-col-comp">${q.companies ? q.companies.slice(0,2).map(c=>`<span class="iv-comp-badge">${c.charAt(0).toUpperCase()}</span>`).join('') : ''}</td>
        <td class="iv-col-xp">+${q.xpReward} XP</td>
      </tr>
    `).join('');
  };

  const activeSubTag = currentFilters.subcategory;

  return `
    <div class="iv-page anim-fade-up">
      <div class="iv-breadcrumbs">
        <a href="/interview" data-iv-route="/interview"><i data-lucide="arrow-left" width="16" height="16"></i> Interview Hub</a> 
        <span class="iv-breadcrumb-sep">/</span>
        <span class="iv-breadcrumb-active">${categoryDefinition.name}</span>
      </div>

      <header class="iv-category-hero">
        <div class="iv-cat-icon-lg" style="background: ${categoryDefinition.color}20; color: ${categoryDefinition.color}">
          <i data-lucide="${categoryDefinition.icon}" width="32" height="32"></i>
        </div>
        <div>
          <h1>${categoryDefinition.name} Track</h1>
          <p>${categoryDefinition.description}</p>
        </div>
      </header>

      <div class="iv-qbrowser-grid">
        <!-- Left Nav (Subcategories & Diff) -->
        <aside class="iv-nav-sidebar">
          <h3>Topics</h3>
          <ul class="iv-side-menu">
            <li class="${activeSubTag==='all'?'active':''}" data-filter-sub="all"><i data-lucide="layers" width="16" height="16"></i> All Topics</li>
            ${categoryDefinition.subcategories.map(sub => `
              <li class="${activeSubTag===sub.id?'active':''}" data-filter-sub="${sub.id}">
                <i data-lucide="bookmark" width="16" height="16"></i> ${sub.name}
              </li>
            `).join('')}
          </ul>

          <h3 class="mt-2">Difficulty</h3>
          <ul class="iv-side-menu">
            <li class="${currentFilters.difficulty==='all'?'active':''}" data-filter-diff="all"><div class="iv-diff-orb all"></div> All</li>
            <li class="${currentFilters.difficulty==='easy'?'active':''}" data-filter-diff="easy"><div class="iv-diff-orb easy"></div> Easy</li>
            <li class="${currentFilters.difficulty==='medium'?'active':''}" data-filter-diff="medium"><div class="iv-diff-orb medium"></div> Medium</li>
            <li class="${currentFilters.difficulty==='hard'?'active':''}" data-filter-diff="hard"><div class="iv-diff-orb hard"></div> Hard</li>
          </ul>
        </aside>

        <!-- Main Content -->
        <main class="iv-qbrowser-main">
          
          <div class="iv-filter-bar card">
            <div class="iv-filter-group">
              <label>Company</label>
              <select id="ivFilterComp" class="iv-select">
                <option value="all">All Companies</option>
                ${INTERVIEW_COMPANIES.map(c => `<option value="${c.id}" ${currentFilters.company===c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="iv-filter-group">
              <label>Role</label>
              <select id="ivFilterRole" class="iv-select">
                <option value="all">All Roles</option>
                ${INTERVIEW_ROLES.map(r => `<option value="${r.id}" ${currentFilters.role===r.id?'selected':''}>${r.name}</option>`).join('')}
              </select>
            </div>
            <div class="iv-filter-group">
              <label>Status</label>
              <select id="ivFilterStatus" class="iv-select">
                <option value="all">All Status</option>
                <option value="unseen" ${currentFilters.status==='unseen'?'selected':''}>Unseen</option>
                <option value="practiced" ${currentFilters.status==='practiced'?'selected':''}>Practiced</option>
                <option value="mastered" ${currentFilters.status==='mastered'?'selected':''}>Mastered</option>
              </select>
            </div>
          </div>

          <div class="card p-0 iv-table-card">
            <table class="iv-data-table">
              <thead>
                <tr>
                  <th width="40">Sts</th>
                  <th>Title</th>
                  <th width="90">Diff</th>
                  <th width="90">Focus</th>
                  <th width="70">XP</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableRows()}
              </tbody>
            </table>
          </div>

        </main>

        <!-- Right Sidebar Stats -->
        <aside class="iv-stats-sidebar">
          <div class="card compact mb-2">
            <h3>Track Stats</h3>
            <div class="iv-stat-row"><span>Total:</span> <strong>${catProg.total} Qs</strong></div>
            <div class="iv-stat-row"><span>Practiced:</span> <strong>${catProg.practiced}</strong></div>
            <div class="iv-stat-row"><span>Mastered:</span> <strong>${catProg.mastered}</strong></div>
            <div class="iv-stat-row mt-1">
              <div class="iv-progress-track full-width"><div class="iv-progress-fill success" style="width:${catProg.pct}%"></div></div>
            </div>
          </div>

          <div class="card compact mb-2 iv-bg-subtle">
            <h3>Daily Goal</h3>
            <p class="text-sm mb-1">${goalStatus.completed ? 'You hit today\'s goal!' : `${goalStatus.practiced}/${goalStatus.goal} completed.`}</p>
            <div class="iv-progress-track full-width"><div class="iv-progress-fill ${goalStatus.completed?'success':'primary'}" style="width:${Math.min(100,(goalStatus.practiced/goalStatus.goal)*100)}%"></div></div>
          </div>

          <div class="card compact">
            <div class="iv-flex-between">
              <h3>Bookmarks</h3>
              <span class="iv-tag">${bookmarks.length}</span>
            </div>
            ${bookmarks.length > 0 ? 
              `<ul class="iv-bookmark-list mt-1">
                ${bookmarks.slice(0,3).map(b => `<li data-iv-route="/interview/${b.category}/${b.id}"><span>${b.title}</span></li>`).join('')}
                ${bookmarks.length > 3 ? `<li class="text-muted text-sm">+${bookmarks.length-3} more</li>` : ''}
              </ul>` : 
              `<p class="text-sm mt-1 text-muted">No saved questions yet.</p>`
            }
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initInterviewQuestions() {
  window.lucide?.createIcons();

  // Route Links
  document.querySelectorAll('[data-iv-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.getAttribute('data-iv-route');
      if (route) window.navigateTo(route);
    });
  });

  // Filter Event Listeners
  document.querySelectorAll('[data-filter-sub]').forEach(el => {
    el.addEventListener('click', () => {
      currentFilters.subcategory = el.getAttribute('data-filter-sub');
      window.refreshCurrentRoute();
    });
  });

  document.querySelectorAll('[data-filter-diff]').forEach(el => {
    el.addEventListener('click', () => {
      currentFilters.difficulty = el.getAttribute('data-filter-diff');
      window.refreshCurrentRoute();
    });
  });

  // Dropdowns
  const compSelect = document.getElementById('ivFilterComp');
  if (compSelect) {
    compSelect.addEventListener('change', (e) => {
      currentFilters.company = e.target.value;
      window.refreshCurrentRoute();
    });
  }

  const roleSelect = document.getElementById('ivFilterRole');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      currentFilters.role = e.target.value;
      window.refreshCurrentRoute();
    });
  }
  
  const statusSelect = document.getElementById('ivFilterStatus');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      window.refreshCurrentRoute();
    });
  }
}
