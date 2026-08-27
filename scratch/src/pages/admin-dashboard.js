// ============================================
// ROBINHOOD ADMIN DASHBOARD — Full Platform Control
// Tab-based CRUD UI for Topics, Patterns, Problems,
// Resources, Companies, Analytics
// ============================================
import { showToast } from '../components/notifications.js';

const API = '/api/admin';
let activeTab = 'topics';
let modalOpen = false;
let editingItem = null;
let tabData = {};

async function apiFetch(path, opts = {}) {
  const url = `${API}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  try {
    const res = await fetch(url, { ...opts, headers });
    const data = await res.json();
    if (!data.ok && res.status >= 400) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    showToast(e.message, 'error');
    throw e;
  }
}

// ==================== RENDER ====================
export function renderAdminDashboard() {
  return `
  <div class="admin-page">
    <div class="admin-header anim-fade-up">
      <div class="admin-header-left">
        <h1 class="page-title"><i data-lucide="shield" width="28" height="28"></i> Admin Dashboard</h1>
        <p class="page-subtitle">Platform control center — manage content, resources, and analytics</p>
      </div>
      <div class="admin-header-actions">
        <button class="btn btn-secondary btn-sm" id="admin-audit-btn">
          <i data-lucide="scroll-text" width="14" height="14"></i> Audit Log
        </button>
      </div>
    </div>

    <div class="admin-tabs anim-fade-up delay-1" id="admin-tabs">
      <button class="admin-tab active" data-tab="topics">
        <i data-lucide="layers" width="16" height="16"></i> Topics
      </button>
      <button class="admin-tab" data-tab="patterns">
        <i data-lucide="brain" width="16" height="16"></i> Patterns
      </button>
      <button class="admin-tab" data-tab="problems">
        <i data-lucide="code-2" width="16" height="16"></i> Problems
      </button>
      <button class="admin-tab" data-tab="resources">
        <i data-lucide="file-text" width="16" height="16"></i> Resources
      </button>
      <button class="admin-tab" data-tab="companies">
        <i data-lucide="building-2" width="16" height="16"></i> Companies
      </button>
      <button class="admin-tab" data-tab="analytics">
        <i data-lucide="bar-chart-3" width="16" height="16"></i> Analytics
      </button>
    </div>

    <div class="admin-toolbar anim-fade-up delay-2" id="admin-toolbar">
      <div class="admin-search">
        <input class="input search-input" id="admin-search" type="text" placeholder="Search...">
      </div>
      <button class="btn btn-primary btn-sm" id="admin-create-btn">
        <i data-lucide="plus" width="14" height="14"></i> Create New
      </button>
    </div>

    <div class="admin-content anim-fade-up delay-3" id="admin-content">
      <div class="admin-loading">Loading...</div>
    </div>

    <div class="admin-modal-overlay" id="admin-modal" style="display:none;">
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3 id="admin-modal-title">Create</h3>
          <button class="admin-modal-close" id="admin-modal-close">
            <i data-lucide="x" width="18" height="18"></i>
          </button>
        </div>
        <div class="admin-modal-body" id="admin-modal-body"></div>
        <div class="admin-modal-footer">
          <button class="btn btn-secondary btn-sm" id="admin-modal-cancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="admin-modal-save">Save</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ==================== TAB RENDERERS ====================
function renderTable(columns, rows, entityType) {
  if (!rows.length) {
    return `<div class="admin-empty"><i data-lucide="inbox" width="40" height="40"></i><p>No ${entityType} found</p></div>`;
  }
  return `
    <table class="admin-table">
      <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}<th>Actions</th></tr></thead>
      <tbody>
        ${rows.map(row => `
          <tr data-id="${row.id}">
            ${columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] || '—')}</td>`).join('')}
            <td class="admin-row-actions">
              <button class="btn-icon admin-edit-btn" data-id="${row.id}" title="Edit">
                <i data-lucide="pencil" width="14" height="14"></i>
              </button>
              <button class="btn-icon admin-delete-btn" data-id="${row.id}" title="Delete">
                <i data-lucide="trash-2" width="14" height="14"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

async function renderTopicsTab() {
  const data = await apiFetch('/topics');
  tabData.topics = data.items || [];
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'order_index', label: 'Order' },
    { key: 'description', label: 'Description', render: r => (r.description || '').slice(0, 60) + ((r.description || '').length > 60 ? '…' : '') },
  ];
  return renderTable(columns, tabData.topics, 'topics');
}

async function renderPatternsTab() {
  const data = await apiFetch('/patterns');
  tabData.patterns = data.items || [];
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'topic_name', label: 'Topic' },
    { key: 'slug', label: 'Slug' },
    { key: 'order_index', label: 'Order' },
    { key: 'definition', label: 'Definition', render: r => (r.definition || '').slice(0, 50) + '…' },
  ];
  return renderTable(columns, tabData.patterns, 'patterns');
}

async function renderProblemsTab() {
  const data = await apiFetch('/problems?limit=100');
  tabData.problems = data.items || [];
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'difficulty', label: 'Difficulty', render: r => `<span class="badge badge-${(r.difficulty || 'medium').toLowerCase()}">${r.difficulty || 'Medium'}</span>` },
    { key: 'time_complexity', label: 'Time' },
  ];
  return renderTable(columns, tabData.problems, 'problems');
}

async function renderResourcesTab() {
  const data = await apiFetch('/resources');
  tabData.resources = data.items || [];
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'resource_type', label: 'Type', render: r => `<span class="badge">${r.resource_type}</span>` },
    { key: 'subject', label: 'Subject' },
    { key: 'topic', label: 'Topic' },
    { key: 'url', label: 'URL', render: r => `<a href="${r.url}" target="_blank" class="admin-link">${(r.url || '').slice(0, 40)}…</a>` },
  ];
  return renderTable(columns, tabData.resources, 'resources');
}

async function renderCompaniesTab() {
  const data = await apiFetch('/company-sets');
  tabData.companySets = data.items || [];
  const columns = [
    { key: 'company_name', label: 'Company' },
    { key: 'set_name', label: 'Set Name' },
    { key: 'problem_ids', label: 'Problems', render: r => `${(r.problem_ids || []).length} problems` },
    { key: 'is_active', label: 'Active', render: r => r.is_active ? '✓ Active' : '✗ Inactive' },
  ];
  return renderTable(columns, tabData.companySets, 'company sets');
}

async function renderAnalyticsTab() {
  try {
    const [overview, submissions, performance] = await Promise.all([
      apiFetch('/analytics/overview').catch(() => ({ stats: {} })),
      apiFetch('/analytics/submissions?days=14').catch(() => ({ items: [] })),
      apiFetch('/analytics/performance').catch(() => ({ byDifficulty: [], byStatus: [], topProblems: [] })),
    ]);
    const s = overview.stats || {};
    return `
      <div class="admin-analytics">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-value">${s.totalUsers || 0}</div>
            <div class="admin-stat-label">Total Users</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-value">${s.totalProblems || 0}</div>
            <div class="admin-stat-label">Total Problems</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-value">${s.totalSubmissions || 0}</div>
            <div class="admin-stat-label">Total Submissions</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-value">${s.totalResources || 0}</div>
            <div class="admin-stat-label">Total Resources</div>
          </div>
        </div>

        <div class="admin-analytics-section">
          <h3>Submissions by Status</h3>
          <div class="admin-status-bars">
            ${(performance.byStatus || []).map(s => `
              <div class="admin-status-bar">
                <span class="admin-status-label">${s.status}</span>
                <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${Math.min(100, Number(s.count))}px;"></div></div>
                <span class="admin-status-count">${s.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="admin-analytics-section">
          <h3>Top Attempted Problems</h3>
          <table class="admin-table">
            <thead><tr><th>Problem</th><th>Difficulty</th><th>Attempts</th><th>Accepted</th><th>Rate</th></tr></thead>
            <tbody>
              ${(performance.topProblems || []).map(p => {
                const rate = p.attempts > 0 ? Math.round((p.accepted / p.attempts) * 100) : 0;
                return `<tr><td>${p.title}</td><td><span class="badge badge-${(p.difficulty||'medium').toLowerCase()}">${p.difficulty}</span></td><td>${p.attempts}</td><td>${p.accepted}</td><td>${rate}%</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    return `<div class="admin-empty"><p>Failed to load analytics: ${e.message}</p></div>`;
  }
}

// ==================== MODAL FORMS ====================
function getFormFields(tab) {
  switch (tab) {
    case 'topics': return [
      { key: 'name', label: 'Topic Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'order_index', label: 'Order Index', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ];
    case 'patterns': return [
      { key: 'name', label: 'Pattern Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'topic_id', label: 'Topic ID', type: 'text', required: true },
      { key: 'icon', label: 'Icon', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'definition', label: 'Definition', type: 'textarea', required: true },
      { key: 'when_to_use', label: 'When to Use', type: 'textarea' },
      { key: 'intuition', label: 'Intuition', type: 'textarea' },
      { key: 'time_complexity', label: 'Time Complexity', type: 'text' },
      { key: 'space_complexity', label: 'Space Complexity', type: 'text' },
      { key: 'order_index', label: 'Order Index', type: 'number' },
    ];
    case 'problems': return [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'] },
      { key: 'pattern_id', label: 'Pattern ID', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'approach_brute', label: 'Brute Force Approach', type: 'textarea' },
      { key: 'approach_optimal', label: 'Optimal Approach', type: 'textarea' },
      { key: 'time_complexity', label: 'Time Complexity', type: 'text' },
      { key: 'space_complexity', label: 'Space Complexity', type: 'text' },
    ];
    case 'resources': return [
      { key: 'resource_type', label: 'Type', type: 'select', options: ['pdf', 'youtube', 'article', 'note'], required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'topic', label: 'Topic', type: 'text' },
      { key: 'subtopic', label: 'Subtopic', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ];
    case 'companies': return [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true },
      { key: 'set_name', label: 'Set Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ];
    default: return [];
  }
}

function renderFormFields(fields, values = {}) {
  return fields.map(f => {
    const val = values[f.key] || '';
    if (f.type === 'textarea') {
      return `<div class="admin-field"><label>${f.label}${f.required ? ' *' : ''}</label><textarea name="${f.key}" class="input admin-textarea" ${f.required ? 'required' : ''}>${val}</textarea></div>`;
    }
    if (f.type === 'select') {
      return `<div class="admin-field"><label>${f.label}${f.required ? ' *' : ''}</label><select name="${f.key}" class="select">${(f.options || []).map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'checkbox') {
      return `<div class="admin-field admin-field-check"><label><input type="checkbox" name="${f.key}" ${val ? 'checked' : ''}> ${f.label}</label></div>`;
    }
    return `<div class="admin-field"><label>${f.label}${f.required ? ' *' : ''}</label><input type="${f.type}" name="${f.key}" class="input" value="${val}" ${f.required ? 'required' : ''}></div>`;
  }).join('');
}

function collectFormData() {
  const body = document.getElementById('admin-modal-body');
  if (!body) return {};
  const data = {};
  body.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'checkbox') { data[el.name] = el.checked; }
    else if (el.type === 'number') { data[el.name] = Number(el.value) || 0; }
    else { data[el.name] = el.value; }
  });
  return data;
}

// ==================== INIT ====================
export function initAdminDashboard() {
  loadTab(activeTab);

  // Tab clicks
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Hide create button for analytics
      const createBtn = document.getElementById('admin-create-btn');
      if (createBtn) createBtn.style.display = activeTab === 'analytics' ? 'none' : '';
      loadTab(activeTab);
    });
  });

  // Create button
  document.getElementById('admin-create-btn')?.addEventListener('click', () => {
    editingItem = null;
    openModal('Create ' + activeTab.slice(0, -1), {});
  });

  // Modal close
  document.getElementById('admin-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('admin-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('admin-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-modal') closeModal();
  });

  // Modal save
  document.getElementById('admin-modal-save')?.addEventListener('click', handleSave);

  // Audit log
  document.getElementById('admin-audit-btn')?.addEventListener('click', showAuditLog);

  // Search
  document.getElementById('admin-search')?.addEventListener('input', (e) => {
    filterCurrentTab(e.target.value);
  });
}

async function loadTab(tab) {
  const container = document.getElementById('admin-content');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading"><div class="spinner"></div> Loading...</div>';

  try {
    let html;
    switch (tab) {
      case 'topics': html = await renderTopicsTab(); break;
      case 'patterns': html = await renderPatternsTab(); break;
      case 'problems': html = await renderProblemsTab(); break;
      case 'resources': html = await renderResourcesTab(); break;
      case 'companies': html = await renderCompaniesTab(); break;
      case 'analytics': html = await renderAnalyticsTab(); break;
      default: html = '<div class="admin-empty">Unknown tab</div>';
    }
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    bindRowActions();
  } catch (e) {
    container.innerHTML = `<div class="admin-empty"><p>Error: ${e.message}</p></div>`;
  }
}

function bindRowActions() {
  document.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const items = getTabItems(activeTab);
      const item = items.find(i => String(i.id) === String(id));
      if (item) {
        editingItem = item;
        openModal('Edit ' + activeTab.slice(0, -1), item);
      }
    });
  });

  document.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this item?')) return;
      const id = btn.dataset.id;
      try {
        await apiFetch(`/${activeTab === 'companies' ? 'company-sets' : activeTab}/${id}`, { method: 'DELETE' });
        showToast('Deleted successfully', 'success');
        loadTab(activeTab);
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    });
  });
}

function getTabItems(tab) {
  switch (tab) {
    case 'topics': return tabData.topics || [];
    case 'patterns': return tabData.patterns || [];
    case 'problems': return tabData.problems || [];
    case 'resources': return tabData.resources || [];
    case 'companies': return tabData.companySets || [];
    default: return [];
  }
}

function openModal(title, values) {
  const modal = document.getElementById('admin-modal');
  const titleEl = document.getElementById('admin-modal-title');
  const body = document.getElementById('admin-modal-body');
  if (!modal || !body) return;
  titleEl.textContent = title;
  const fields = getFormFields(activeTab);
  body.innerHTML = renderFormFields(fields, values);
  modal.style.display = 'flex';
  modalOpen = true;
  if (window.lucide) window.lucide.createIcons();
}

function closeModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.style.display = 'none';
  modalOpen = false;
  editingItem = null;
}

async function handleSave() {
  const data = collectFormData();
  const endpoint = activeTab === 'companies' ? 'company-sets' : activeTab;

  try {
    if (editingItem) {
      await apiFetch(`/${endpoint}/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      showToast('Updated successfully', 'success');
    } else {
      await apiFetch(`/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('Created successfully', 'success');
    }
    closeModal();
    loadTab(activeTab);
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

async function showAuditLog() {
  const container = document.getElementById('admin-content');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading"><div class="spinner"></div> Loading audit log...</div>';
  try {
    const data = await apiFetch('/audit-log?limit=50');
    const items = data.items || [];
    container.innerHTML = `
      <div class="admin-audit-header">
        <h3>Audit Log</h3>
        <button class="btn btn-secondary btn-sm" id="admin-audit-back">← Back</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>
          ${items.map(a => `
            <tr>
              <td>${new Date(a.created_at).toLocaleString()}</td>
              <td>${a.user_name || a.user_id || '—'}</td>
              <td><span class="badge">${a.action}</span></td>
              <td>${a.entity_type} ${a.entity_id ? `#${String(a.entity_id).slice(0,8)}` : ''}</td>
              <td class="admin-details-cell">${JSON.stringify(a.details || {}).slice(0,80)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    document.getElementById('admin-audit-back')?.addEventListener('click', () => loadTab(activeTab));
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    container.innerHTML = `<div class="admin-empty"><p>Error: ${e.message}</p></div>`;
  }
}

function filterCurrentTab(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.admin-table tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = !q || text.includes(q) ? '' : 'none';
  });
}
