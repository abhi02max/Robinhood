const LEGACY_ROUTES = new Set([
  '/dashboard',
  '/learn',
  '/problems',
  '/sheets',
  '/sql-track',
  '/companies',
  '/interview',
  '/debugger',
  '/roadmap',
  '/concept-map',
  '/revision',
  '/scheduler',
  '/analytics',
  '/profile',
]);

export function legacyHashHref(path, query = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/#${normalized}${query || ''}`;
}

export function isLegacyRoute(path) {
  if (LEGACY_ROUTES.has(path)) return true;
  if (path.startsWith('/learn/')) return true;
  if (path.startsWith('/problem/')) return true;
  if (path.startsWith('/company/')) return true;
  if (path.startsWith('/revision/')) return true;
  return false;
}

