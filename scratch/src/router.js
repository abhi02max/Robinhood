// ============================================
// ROBINHOOD SPA ROUTER
// Hash-based routing with transitions
// ============================================

import store from './store.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.currentPage = null;
    this.mainContent = null;
    this.onRouteChange = null;
  }

  renderNotFound(path) {
    return `
      <div class="page-wrap">
        <h1 class="page-title">Page not found</h1>
        <p class="page-subtitle">The route <code>${path}</code> does not exist.</p>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="navigateTo('/dashboard')">Go to Dashboard</button>
          <button class="btn btn-secondary" onclick="navigateTo('/problems')">Browse Problems</button>
        </div>
      </div>
    `;
  }

  init(mainContent) {
    this.mainContent = mainContent;
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    const newHash = path.startsWith('/') ? path : `/${path}`;
    const currentHash = window.location.hash.slice(1);
    console.log('[Router] navigate() called:', { path, newHash, currentHash });
    
    if (currentHash === newHash) {
      console.log('[Router] Same hash, forcing re-render');
      this.handleRoute();
    } else {
      console.log('[Router] Setting new hash');
      window.location.hash = newHash;
    }
  }

  handleRoute() {
    const hashRoute = window.location.hash.slice(1);
    console.log('[Router] handleRoute() - hashRoute:', hashRoute);
    const pathnameRoute = window.location.pathname && window.location.pathname !== '/' ? window.location.pathname : '';
    const normalizedHash = hashRoute && !hashRoute.startsWith('/') ? `/${hashRoute}` : hashRoute;
    const rawRoute = normalizedHash || pathnameRoute || '/';
    const [path, ...queryParts] = rawRoute.split('?');
    const params = {};
    console.log('[Router] Parsed:', { path, queryParts });
    
    if (queryParts.length) {
      const searchParams = new URLSearchParams(queryParts.join('?'));
      searchParams.forEach((value, key) => { params[key] = value; });
    }
    console.log('[Router] Query params:', params);

    // Auth guard
    const publicRoutes = ['/', '/auth'];
    if (!store.isAuthenticated() && !publicRoutes.includes(path)) {
      this.navigate('/auth');
      return;
    }

    // Find matching route
    let handler = this.routes[path];
    let routeParams = { ...params };

    if (!handler) {
      // Check dynamic routes
      for (const [routePath, routeHandler] of Object.entries(this.routes)) {
        const routeParts = routePath.split('/');
        const pathParts = path.split('/');
        
        if (routeParts.length !== pathParts.length) continue;
        
        const match = routeParts.every((part, i) => {
          if (part.startsWith(':')) {
            routeParams[part.slice(1)] = pathParts[i];
            return true;
          }
          return part === pathParts[i];
        });

        if (match) {
          handler = routeHandler;
          break;
        }
      }
    }

    if (!handler) {
      handler = () => this.renderNotFound(path);
    }

    // Execute teardown of current page if registered
    if (this.onRouteLeave) {
      try {
        this.onRouteLeave();
      } catch(e) {
        console.error('Error during route teardown:', e);
      }
      this.onRouteLeave = null; // Clear hook after execution
    }

    this.currentRoute = path;
    console.log('[Router] Final routeParams:', routeParams);
    
    // Animate transition
    if (this.mainContent) {
      this.mainContent.style.opacity = '0';
      this.mainContent.style.transform = 'translateY(8px)';
      
      setTimeout(() => {
        console.log('[Router] Calling handler with routeParams:', routeParams);
        const content = handler(routeParams);
        if (typeof content === 'string') {
          this.mainContent.innerHTML = content;
          console.log('[Router] Content updated');
        }
        
        // Initialize page-specific scripts
        if (this.onRouteChange) {
          console.log('[Router] Calling onRouteChange with path:', path, 'params:', routeParams);
          this.onRouteChange(path, routeParams);
        }

        // Animate in
        requestAnimationFrame(() => {
          this.mainContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          this.mainContent.style.opacity = '1';
          this.mainContent.style.transform = 'translateY(0)';
        });

        // Reinitialize Lucide icons
        if (window.lucide) {
          window.lucide.createIcons();
        }

        // Scroll to top
        this.mainContent.scrollTop = 0;
      }, 150);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();
export default router;
