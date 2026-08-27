'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { loadLegacyRuntime } from './legacy-host/loaders';
import { bootstrapCoreRuntime, initSidebarEvents, resolveLegacyPage } from './legacy-host/runtime';
import type { LegacyPageKey, LegacyParams } from './legacy-host/types';

type LegacyPageHostProps = {
  routePath: string;
  pageKey: LegacyPageKey;
  params?: LegacyParams;
  requireAuth?: boolean;
  showSidebar?: boolean;
};

export default function LegacyPageHost({
  routePath,
  pageKey,
  params,
  requireAuth = true,
  showSidebar = true,
}: LegacyPageHostProps) {
  const router = useRouter();
  
  // Serialize params to detect changes properly
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stableParams = JSON.parse(paramsKey) as LegacyParams;

    let initHandle = 0;
    let isCancelled = false;
    let legacyRouterRef: any = null;

    const setup = async () => {
      const { runtime, pages } = await loadLegacyRuntime();
      if (isCancelled) return;

      const routerPush = (path: string) => router.push(path);
      bootstrapCoreRuntime(routerPush, runtime);
      window.navigateTo = (path: string) => routerPush(path);

      const theme = runtime.store.get('preferences')?.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);

      if (requireAuth && !runtime.store.isAuthenticated()) {
        router.push('/auth');
        return;
      }

      legacyRouterRef = runtime.legacyRouter;
      try {
        legacyRouterRef.onRouteLeave?.();
        legacyRouterRef.onRouteLeave = null;
      } catch (error) {
        console.error('Failed during legacy teardown:', error);
      }

      const mainContent = document.getElementById('main-content');
      const sidebar = document.getElementById('sidebar');
      if (!mainContent || !sidebar) return;

      const shouldShowSidebar = showSidebar && runtime.store.isAuthenticated();
      if (shouldShowSidebar) {
        sidebar.classList.remove('hidden');
        sidebar.innerHTML = runtime.renderSidebar();
        mainContent.classList.add('with-sidebar');
        initSidebarEvents(routePath, routerPush, runtime);
      } else {
        sidebar.classList.add('hidden');
        sidebar.innerHTML = '';
        mainContent.classList.remove('with-sidebar');
        mainContent.classList.remove('sidebar-collapsed');
      }

      const { renderPage, initPage } = resolveLegacyPage(pageKey, pages);
      mainContent.innerHTML = renderPage(stableParams);
      initHandle = window.setTimeout(() => {
        // Rebind timer widget to the newly mounted DOM node on every route render
        runtime.initTimer();
        window.lucide?.createIcons();
        initPage?.(stableParams);
        window.lucide?.createIcons();
      }, 0);
    };

    setup().catch((error) => {
      console.error('Legacy page setup failed:', error);
    });

    return () => {
      isCancelled = true;
      window.clearTimeout(initHandle);
      try {
        legacyRouterRef?.onRouteLeave?.();
        if (legacyRouterRef) legacyRouterRef.onRouteLeave = null;
      } catch (error) {
        console.error('Failed to cleanup legacy route:', error);
      }
    };
  }, [router, routePath, pageKey, paramsKey, requireAuth, showSidebar]);

  return (
    <div id="app">
      <div id="mobile-overlay" className="mobile-overlay hidden" onClick={() => document.getElementById('sidebar')?.classList.remove('open')}></div>
      <button id="mobile-menu-btn" className="mobile-menu-btn" aria-label="Menu" onClick={() => {
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('mobile-overlay')?.classList.remove('hidden');
      }}>
        <i data-lucide="menu" style={{ width: 20, height: 20 }} />
      </button>
      <aside id="sidebar" className="sidebar hidden" />
      <main id="main-content" className="main-content" />
      <div id="timer-widget" className="timer-widget hidden" />
      <div id="notification-container" className="notification-container" />
    </div>
  );
}

