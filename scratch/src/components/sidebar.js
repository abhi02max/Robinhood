// ROBINHOOD — Sidebar Component v2
import store from '../store.js';
import { robinhoodBrandMark } from './brand.js';
import { BRAND_ASSETS } from '../config/assets.js';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { route: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      { route: '/learn/dsa', icon: 'rocket', label: 'Start Journey', badge: 'Guided', featured: true },
      { route: '/learn', icon: 'graduation-cap', label: 'Learn CS', badge: 'Core' },
      { route: '/problems', icon: 'code-2', label: 'Problems', badge: '465' },
      { route: '/sheets', icon: 'notebook-tabs', label: 'Coding Sheets' },
      { route: '/sql-track', icon: 'database', label: 'SQL A-Z' },
      { route: '/companies', icon: 'building-2', label: 'Companies', badge: '86' },
      { route: '/interview', icon: 'mic', label: 'Interview Hub', badge: 'Pro' },
      { route: '/debugger', icon: 'bug', label: 'Debugger' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { route: '/roadmap', icon: 'map', label: 'Roadmap' },
      { route: '/concept-map', icon: 'git-merge', label: 'Concept Map' },
      { route: '/revision', icon: 'rotate-ccw', label: 'Revision' },
      { route: '/scheduler', icon: 'calendar-clock', label: 'Scheduler' },
      { route: '/analytics', icon: 'line-chart', label: 'Analytics' },
      { route: '/admin', icon: 'shield', label: 'Admin', badge: 'Ctrl' },
    ],
  },
];

function renderNavItem(item) {
  return `
    <button class="nav-item ${item.featured ? 'nav-item-featured' : ''}" data-route="${item.route}">
      <i data-lucide="${item.icon}" width="18" height="18"></i>
      <span class="nav-item-label">${item.label}</span>
      ${item.badge ? `<span class="nav-item-badge">${item.badge}</span>` : ''}
    </button>
  `;
}

export function renderSidebar() {
  const user = store.get('user');
  const streak = store.get('streaks');
  const xp = store.get('xp');
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'R';
  const theme = store.getTheme();

  return `
  <div class="sidebar-header" style="position:relative; display:flex; align-items:center; padding: 20px; white-space: nowrap; overflow: hidden;">
    <div class="sidebar-mark" style="flex-shrink:0;">
      ${robinhoodBrandMark(24)}
    </div>
    <div class="sidebar-brand-block" style="display:flex; flex-direction:column; line-height:1.1; margin-left:12px;">
      <span class="sidebar-brand" style="font-family:var(--font-heading); font-size:18px; font-weight:800; letter-spacing:-0.02em; color:var(--text-1);">${BRAND_ASSETS.wordmarkTop}</span>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.12em;color:var(--accent);text-transform:uppercase;margin-top:2px;">For Good</span>
    </div>
    <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar" style="position:absolute; right:16px;">
      <i data-lucide="panel-left-close" width="16" height="16"></i>
    </button>
  </div>

  <nav class="sidebar-nav">
    ${NAV_SECTIONS.map((section) => `
      <span class="nav-section-label">${section.label}</span>
      ${section.items.map((item) => renderNavItem(item)).join('')}
    `).join('')}

    <span class="nav-section-label">Tools</span>
    <button class="nav-item" id="timer-toggle-btn">
      <i data-lucide="timer" width="18" height="18"></i>
      <span class="nav-item-label">Focus Timer</span>
    </button>
    <button class="nav-item" id="theme-toggle">
      <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" width="18" height="18"></i>
      <span class="nav-item-label">${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>

    <span class="nav-section-label">Account</span>
    <button class="nav-item" data-route="/profile">
      <i data-lucide="user" width="18" height="18"></i>
      <span class="nav-item-label">Profile</span>
    </button>
  </nav>

  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar">${initial}</div>
      <div class="sidebar-user-meta">
        <div class="sidebar-user-name">${user?.name || 'User'}</div>
        <div class="sidebar-user-streak">🔥 ${streak?.current || 0} day streak · Lvl ${xp?.level || 1}</div>
      </div>
    </div>
  </div>
  `;
}

export function updateSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('hidden')) {
    sidebar.innerHTML = renderSidebar();
  }
}
