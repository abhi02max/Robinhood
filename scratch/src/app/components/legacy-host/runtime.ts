import type { LegacyPageKey, PageRuntime, Runtime } from './types';

export function initSidebarEvents(routePath: string, routerPush: (path: string) => void, runtime: Runtime) {
  const { store, renderSidebar, showToast } = runtime;
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const isDesktop = () => !(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches);

  const setSidebarCollapsed = (collapsed: boolean) => {
    if (!sidebar || !mainContent) return;
    sidebar.classList.toggle('collapsed', collapsed);
    mainContent.classList.toggle('sidebar-collapsed', collapsed);
    store.update('preferences', (prev: Record<string, unknown>) => ({ ...prev, sidebarCollapsed: collapsed }));

    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      collapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      collapseBtn.innerHTML = collapsed
        ? '<i data-lucide="panel-left-open" width="16" height="16"></i>'
        : '<i data-lucide="panel-left-close" width="16" height="16"></i>';
    }

    let openBtn = document.getElementById('sidebar-open-btn');
    if (!openBtn) {
      openBtn = document.createElement('button');
      openBtn.id = 'sidebar-open-btn';
      openBtn.className = 'sidebar-open-btn hidden';
      openBtn.setAttribute('aria-label', 'Open sidebar');
      openBtn.setAttribute('title', 'Open sidebar');
      openBtn.innerHTML = '<i data-lucide="panel-left-open" width="16" height="16"></i>';
      document.body.appendChild(openBtn);
      openBtn.addEventListener('click', () => setSidebarCollapsed(false));
    }
    openBtn.classList.toggle('hidden', !collapsed || !isDesktop());
    window.lucide?.createIcons({ nodes: [sidebar, openBtn] });
  };

  document.querySelectorAll('.nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const route = (item as HTMLElement).dataset.route;
      if (route) {
        const shouldAutoCollapse = isDesktop();
        if (shouldAutoCollapse) {
          setSidebarCollapsed(true);
        }
        routerPush(route);
      }
    });
  });

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = store.toggleTheme();
      showToast(`Switched to ${nextTheme} mode`, 'info');
      document.documentElement.setAttribute('data-theme', nextTheme);
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.classList.contains('hidden')) {
        sidebar.innerHTML = renderSidebar();
        initSidebarEvents(routePath, routerPush, runtime);
        window.lucide?.createIcons();
      }
    });
  }

  const timerToggle = document.getElementById('timer-toggle-btn');
  if (timerToggle) {
    timerToggle.addEventListener('click', () => {
      if (typeof (window as any)._toggleTimerVisibility === 'function') {
        (window as any)._toggleTimerVisibility();
      } else {
        document.getElementById('timer-widget')?.classList.toggle('hidden');
      }
    });
  }

  const userProfile = document.querySelector('.sidebar-user');
  if (userProfile) {
    userProfile.addEventListener('click', () => routerPush('/profile'));
  }

  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      if (!isDesktop()) {
        sidebar?.classList.remove('open');
        document.getElementById('mobile-overlay')?.classList.add('hidden');
        return;
      }
      const isCollapsed = sidebar?.classList.contains('collapsed');
      setSidebarCollapsed(!isCollapsed);
    });
  }

  // Also close sidebar on mobile when a link is clicked
  document.querySelectorAll('.nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', () => {
      if (!isDesktop()) {
        sidebar?.classList.remove('open');
        document.getElementById('mobile-overlay')?.classList.add('hidden');
      }
    });
  });



  // Allow clicking logo mark to expand sidebar when collapsed
  const sidebarMark = sidebar?.querySelector('.sidebar-mark');
  if (sidebarMark) {
    (sidebarMark as HTMLElement).style.cursor = 'pointer';
    sidebarMark.addEventListener('click', () => {
      if (sidebar?.classList.contains('collapsed')) {
        setSidebarCollapsed(false);
      }
    });
  }

  const savedCollapsed = !!store.get('preferences')?.sidebarCollapsed;
  setSidebarCollapsed(savedCollapsed);

  if (sidebar) {
    sidebar.onmouseenter = () => {
      if (!isDesktop()) return;
      if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('hover-expanded');
        // Also expand main-content margin so content is pushed, not overlayed
        mainContent?.classList.remove('sidebar-collapsed');
      }
    };
    sidebar.onmouseleave = () => {
      if (sidebar.classList.contains('hover-expanded')) {
        sidebar.classList.remove('hover-expanded');
        // Restore collapsed margin when hover ends
        if (sidebar.classList.contains('collapsed')) {
          mainContent?.classList.add('sidebar-collapsed');
        }
      }
    };
  }

  document.querySelectorAll('.nav-item[data-route]').forEach((item) => {
    const route = (item as HTMLElement).dataset.route;
    item.classList.toggle('active', route === routePath);
  });
}

export function bootstrapCoreRuntime(routerPush: (path: string) => void, runtime: Runtime) {
  if (window.__rhCoreBootstrapped) return;
  const { store, initCommandPalette, initTimer, learningStore, showToast } = runtime;

  initCommandPalette();
  initTimer();

  if (store.isAuthenticated()) {
    store.updateStreak();
    const userId = store.get('user')?.id;
    if (userId) learningStore.initSync(userId);
  }

  let lastSyncedUserId = store.get('user')?.id || null;
  store.on('user', (user: { id?: string } | null) => {
    const nextUserId = user?.id || null;
    if (!nextUserId) {
      learningStore.clearSyncSession();
      lastSyncedUserId = null;
      return;
    }
    if (lastSyncedUserId !== nextUserId) {
      learningStore.initSync(nextUserId);
      lastSyncedUserId = nextUserId;
    }
  });

  window.navigateTo = (path: string) => routerPush(path);
  window.showToast = showToast;
  window.__rhCoreBootstrapped = true;
}

function renderMissingLegacyPage(pageKey: LegacyPageKey) {
  return `
    <section class="experience-page anim-fade-up">
      <div class="card experience-panel">
        <p class="experience-kicker">Route Fallback</p>
        <h2>This page is currently unavailable</h2>
        <p class="experience-muted">We could not resolve the route key: ${pageKey}. Use one of the stable paths below.</p>
        <div class="flow-link-row">
          <button class="btn btn-primary btn-sm" onclick="window.navigateTo?.('/dashboard')">Open Dashboard</button>
          <button class="btn btn-secondary btn-sm" onclick="window.navigateTo?.('/learn')">Open Learn Hub</button>
          <button class="btn btn-secondary btn-sm" onclick="window.navigateTo?.('/problems')">Open Problems</button>
        </div>
      </div>
    </section>
  `;
}

export function resolveLegacyPage(pageKey: LegacyPageKey, pages: PageRuntime) {
  switch (pageKey) {
    case 'landing':
      return pages.landing;
    case 'auth':
      return pages.auth;
    case 'onboarding':
      return pages.onboarding;
    case 'dashboard':
      return pages.dashboard;
    case 'sheets':
      return pages.sheets;
    case 'sql-track':
      return pages.sqlTrack;
    case 'problems':
      return pages.problems;
    case 'problem-detail':
      return pages.problemDetail;
    case 'companies':
      return pages.companies;
    case 'company-detail':
      return pages.companyDetail;
    case 'roadmap':
      return pages.roadmap;
    case 'concept-map':
      return pages.conceptMap;
    case 'revision':
      return pages.revision;
    case 'revision-topic':
      return pages.revisionTopic || pages.revision;
    case 'profile':
      return pages.profile;
    case 'learn-hub':
      return pages.learnHub;
    case 'learn-subject':
      return pages.learnSubject;
    case 'learn-topic':
      return pages.learnTopic;
    case 'learn-subtopic':
      return pages.learnSubtopic;
    case 'learn-lesson':
      return pages.learnLesson;
    case 'interview-hub':
      return pages.interviewHub;
    case 'interview-questions':
      return pages.interviewQuestions;
    case 'interview-practice':
      return pages.interviewPractice;
    case 'interview-mock-session':
      return pages.interviewMockSession;
    case 'debugger-hub':
      return pages.debuggerHub;
    case 'scheduler-dashboard':
      return pages.schedulerDashboard;
    case 'analytics-dashboard':
      return pages.analyticsDashboard;

    default:
      return { renderPage: () => renderMissingLegacyPage(pageKey), initPage: undefined };
  }
}

