// ============================================
// ROBINHOOD - Main Application Entry Point
// ============================================
import './styles/design-system.css';
import './styles/components.css';
import './styles/pages.css';
import { router } from './router.js';
import store from './store.js';
import { renderLanding } from './pages/landing.js';
import { renderAuth, initAuth } from './pages/auth.js';
import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderProblems, initProblems } from './pages/problems.js';
import { renderProblemDetail, initProblemDetail } from './pages/problem-detail.js';
import { renderCompanies, initCompanies } from './pages/companies.js';
import { renderCompanyDetail, initCompanyDetail } from './pages/company-detail.js';
import { renderRoadmap, initRoadmap } from './pages/roadmap.js';
import { renderConceptMap, initConceptMap } from './pages/concept-map.js';
import { renderProfile, initProfile } from './pages/profile.js';
import { renderSidebar, updateSidebar } from './components/sidebar.js';
import { renderRevision, initRevision } from './pages/revision.js';
import { renderLearnHub, initLearnHub } from './pages/learn-hub.js';
import { renderLearnLesson, initLearnLesson } from './pages/learn-lesson.js';
import { renderSubjectPage, initSubjectPage } from './pages/subject-page.js';
import { renderTopicPage, initTopicPage } from './pages/topic-page.js';
import { renderSubtopicView, initSubtopicView } from './pages/subtopic-view.js';
import { renderInterviewHub, initInterviewHub } from './pages/interview-hub.js';
import { renderInterviewQuestions, initInterviewQuestions } from './pages/interview-questions.js';
import { renderInterviewPractice, initInterviewPractice } from './pages/interview-practice.js';
import { renderMockSession, initMockSession } from './pages/mock-session.js';
import { renderDebuggerHub, initDebuggerHub } from './pages/debugger-hub.js';
import { renderSheets, initSheets } from './pages/sheets.js';
import { renderSqlTrack, initSqlTrack } from './pages/sql-track.js';
import { renderSqlTopic, initSqlTopic } from './pages/sql-topic.js';
import { renderSqlProblem, initSqlProblem } from './pages/sql-problem.js';
import { renderSchedulerDashboard, initSchedulerDashboard } from './pages/scheduler-dashboard.js';
import { renderAnalyticsDashboard, initAnalyticsDashboard } from './pages/analytics-dashboard.js';
import { renderAdminDashboard, initAdminDashboard } from './pages/admin-dashboard.js';
import { learningStore } from 'store';
import { initTimer } from './components/timer.js';
import { showToast } from './components/notifications.js';
import { initCommandPalette } from './components/command-palette.js';
import { robinhoodBrandMark } from './components/brand.js';
import { BRAND_ASSETS } from './config/assets.js';
import { hydrate as hydrateProblemsCache } from './utils/problems-cache.js';

// -----------------------------------------------------------------------------
// Phase A hydration boot-strap
//
// Kick the /api/learning/problems-index fetch IMMEDIATELY when this module
// loads. The promise runs in parallel with module evaluation and DOM parsing,
// and is awaited inside the DOMContentLoaded handler before the router takes
// over. Pages that read from the cache after that see a fully hydrated
// snapshot synchronously.
// -----------------------------------------------------------------------------
const _problemsCacheReady = hydrateProblemsCache().catch((error) => {
  // Swallow + log here; the DOMContentLoaded handler decides whether to
  // proceed with a degraded UI (cache returns []) or surface a global toast.
  console.error('[bootstrap] problems-cache hydration failed:', error);
  return null;
});

// Apply saved theme
const savedTheme = store.get('preferences')?.theme || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function installGlobalErrorTracking() {
  if (typeof window === 'undefined') return;
  if (window.__robinhoodErrorTrackingInstalled) return;
  window.__robinhoodErrorTrackingInstalled = true;

  const reportFrontendError = (kind, payload) => {
    try {
      const existing = Array.isArray(window.__frontendRuntimeErrors)
        ? window.__frontendRuntimeErrors
        : [];
      existing.push({
        kind,
        at: new Date().toISOString(),
        ...payload,
      });
      window.__frontendRuntimeErrors = existing.slice(-25);

      console.error('[FrontendError]', JSON.stringify({ kind, ...payload }));
      showToast('Something went wrong. The issue was logged.', 'error');
    } catch (error) {
      console.error('Frontend error reporting failed:', error);
    }
  };

  window.addEventListener('error', (event) => {
    reportFrontendError('window.error', {
      message: event?.message || 'Unknown frontend error',
      source: event?.filename || '',
      line: event?.lineno || 0,
      column: event?.colno || 0,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportFrontendError('window.unhandledrejection', {
      reason: String(event?.reason?.message || event?.reason || 'Unhandled promise rejection'),
    });
  });
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', async () => {
  installGlobalErrorTracking();

  const loadingMark = document.querySelector('.loading-mark');
  if (loadingMark) loadingMark.innerHTML = BRAND_ASSETS.logo.mark(28);

  const mainContent = document.getElementById('main-content');
  const sidebar = document.getElementById('sidebar');
  const loadingScreen = document.getElementById('loading-screen');

  // Never let the splash screen become permanent if boot-time code fails.
  setTimeout(() => {
    loadingScreen?.classList.add('fade-out');
    setTimeout(() => loadingScreen?.remove(), 500);
  }, 1200);

  try {
    // Wait for the problems-cache to hydrate before the first route fires,
    // so initial page renders see populated synchronous data. The fetch was
    // started at module-load time so this is mostly a no-op by the time
    // DOMContentLoaded resolves.
    await _problemsCacheReady;

    initCommandPalette();

    // Register routes
    router.register('/', (params) => renderLanding());
    router.register('/auth', (params) => renderAuth());
    router.register('/dashboard', (params) => renderDashboard());
    router.register('/dsa', (params) => renderDashboard());
    router.register('/problems', (params) => renderProblems(params));
    router.register('/problem/:id', (params) => renderProblemDetail(params));
    router.register('/companies', (params) => renderCompanies());
    router.register('/company/:id', (params) => renderCompanyDetail(params));
    router.register('/roadmap', (params) => renderRoadmap());
    router.register('/concept-map', (params) => renderConceptMap());
    router.register('/revision', (params) => renderRevision(params));
    router.register('/revision/:topicId', (params) => renderRevision(params));
    router.register('/profile', (params) => renderProfile());
    router.register('/settings', (params) => renderProfile());
    router.register('/learn', (params) => renderLearnHub());
    router.register('/learn/:subject', (params) => renderSubjectPage(params));
    router.register('/learn/:subject/topic/:topic', (params) => renderTopicPage(params));
    router.register('/learn/:subject/topic/:topic/subtopic/:subtopic', (params) => renderSubtopicView(params));
    router.register('/learn/:subject/topic/:topic/lesson/:lessonId', (params) => renderLearnLesson(params));
    router.register('/interview', (params) => renderInterviewHub());
    router.register('/interview/mock', (params) => renderMockSession(params));
    router.register('/interview/:category', (params) => renderInterviewQuestions(params));
    router.register('/interview/:category/:questionId', (params) => renderInterviewPractice(params));
    router.register('/debugger', (params) => renderDebuggerHub(params));
    router.register('/sheets', (params) => renderSheets(params));
    router.register('/sql-track', (params) => renderSqlTrack(params));
    router.register('/sql-track/:topic', (params) => renderSqlTopic(params.topic));
    router.register('/sql-track/:topic/:problemId', (params) => renderSqlProblem(params.topic, params.problemId));
    router.register('/scheduler', (params) => renderSchedulerDashboard());
    router.register('/analytics', (params) => renderAnalyticsDashboard());
    router.register('/admin', (params) => renderAdminDashboard());

    // Route change handler
    router.onRouteChange = (path, params) => {
      const needsSidebar = !['/', '/auth'].includes(path) && store.isAuthenticated() && !path.startsWith('/problem/') && !(path.startsWith('/sql-track/') && path.split('/').length >= 4) && !(path.startsWith('/interview/') && path.split('/').length >= 4);
      
      if (needsSidebar) {
        sidebar.classList.remove('hidden');
        sidebar.innerHTML = renderSidebar();
        mainContent.classList.add('with-sidebar');
        initSidebarEvents();
      } else {
        sidebar.classList.add('hidden');
        sidebar.innerHTML = '';
        mainContent.classList.remove('with-sidebar');
      }

      // Reset AI Context to prevent bleeding between completely unrelated pages
      import('./components/ask-robin.js').then(({ setRobinContext }) => {
        setRobinContext('', '', '');
      });

      // Initialize page-specific logic
      setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
        
        switch(true) {
          case path === '/auth': initAuth(); break;
          case path === '/dashboard': initDashboard(); break;
          case path === '/dsa': initDashboard(); break;
          case path === '/problems': initProblems(params); break;
          case path.startsWith('/problem/'): initProblemDetail(params); break;
          case path === '/companies': initCompanies(); break;
          case path.startsWith('/company/'): initCompanyDetail(params); break;
          case path === '/roadmap': initRoadmap(); break;
          case path === '/concept-map': initConceptMap(); break;
          case path === '/revision': initRevision(); break;
          case path.startsWith('/revision/'): initRevision(); break;
          case path === '/profile': initProfile(); break;
          case path === '/settings': initProfile(); break;
          case path === '/learn': initLearnHub(); break;
          case path === '/interview': initInterviewHub(); break;
          case path === '/interview/mock': initMockSession(params); break;
          case path.startsWith('/interview/') && path.split('/').length === 3: initInterviewQuestions(); break;
          case path.startsWith('/interview/') && path.split('/').length === 4: initInterviewPractice(); break;
          case path === '/debugger': initDebuggerHub(params); break;
          case path === '/sheets': initSheets(params); break;
          case path === '/sql-track': initSqlTrack(params); break;
          case path.startsWith('/sql-track/') && path.split('/').length === 3: initSqlTopic(params.topic); break;
          case path.startsWith('/sql-track/') && path.split('/').length >= 4: initSqlProblem(params.topic, params.problemId); break;
          case path === '/scheduler': initSchedulerDashboard(); break;
          case path === '/analytics': initAnalyticsDashboard(); break;
          case path === '/admin': initAdminDashboard(); break;
          case path.startsWith('/learn/') && path.includes('/topic/') && path.includes('/lesson/'): initLearnLesson(params); break;
          case path.startsWith('/learn/') && path.includes('/topic/') && path.includes('/subtopic/'): initSubtopicView(params); break;
          case path.startsWith('/learn/') && path.includes('/topic/'): initTopicPage(params); break;
          case path.startsWith('/learn/'): initSubjectPage(params); break;
        }
      }, 50);
    };

    // Initialize router
    router.init(mainContent);

    // Update streak on load
    if (store.isAuthenticated()) {
      store.updateStreak();
      const userId = store.get('user')?.id;
      if (userId) learningStore.initSync(userId);
    }

    let lastSyncedUserId = store.get('user')?.id || null;
    store.on('user', (user) => {
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

    // Init timer
    initTimer();
  } catch (error) {
    console.error('App bootstrap failed:', error);
  }
});

function initSidebarEvents() {
  // Nav items
  document.querySelectorAll('.nav-item[data-route]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate(item.dataset.route);
    });
  });

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = store.toggleTheme();
      showToast(`Switched to ${newTheme} mode`, 'info');
      // Re-render sidebar to update icon
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.innerHTML = renderSidebar();
        initSidebarEvents();
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Timer toggle
  const timerToggle = document.getElementById('timer-toggle-btn');
  if (timerToggle) {
    timerToggle.addEventListener('click', () => {
      window._toggleTimerVisibility?.();
    });
  }

  // User profile click
  const userProfile = document.querySelector('.sidebar-user');
  if (userProfile) {
    userProfile.addEventListener('click', () => router.navigate('/profile'));
  }

  // Mobile menu
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });
  }

  // Highlight active nav
  const currentRoute = router.getCurrentRoute();
  const navItems = Array.from(document.querySelectorAll('.nav-item[data-route]'));
  let bestRoute = '';

  navItems.forEach((item) => {
    const route = String(item.dataset.route || '').trim();
    if (!route || !currentRoute) return;
    const matches = route === currentRoute || currentRoute.startsWith(`${route}/`);
    if (matches && route.length > bestRoute.length) {
      bestRoute = route;
    }
  });

  navItems.forEach((item) => {
    item.classList.toggle('active', String(item.dataset.route || '').trim() === bestRoute);
  });
}

// Global helpers
window.navigateTo = (path) => router.navigate(path);
window.showToast = showToast;
window.refreshCurrentRoute = () => router.handleRoute();
