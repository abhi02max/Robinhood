'use client';

import { useEffect, useMemo, useState } from 'react';

type StartupWarningPayload = {
  status?: string;
  strictMode?: boolean;
  warnings?: string[];
  blockers?: string[];
  checkedAt?: string;
};

const POLL_MS = 20000;
const SHOW_GLOBALLY = process.env.NEXT_PUBLIC_SHOW_STARTUP_WARNINGS === 'true';

function shouldShowBanner(): boolean {
  if (SHOW_GLOBALLY) return true;
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname || '';
  if (path.startsWith('/admin')) return true;

  const params = new URLSearchParams(window.location.search || '');
  if (params.get('admin') === '1') return true;

  try {
    const role = String(window.localStorage.getItem('role') || window.localStorage.getItem('userRole') || '').toLowerCase();
    return role === 'admin';
  } catch {
    return false;
  }
}

async function fetchStartupWarnings(): Promise<StartupWarningPayload> {
  const response = await fetch('/api/admin/startup-warnings', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`startup warning request failed: ${response.status}`);
  }

  return response.json();
}

export default function AdminDependencyWarningBanner() {
  const [payload, setPayload] = useState<StartupWarningPayload | null>(null);
  const [isVisibleForViewer, setIsVisibleForViewer] = useState<boolean>(false);

  useEffect(() => {
    setIsVisibleForViewer(shouldShowBanner());
  }, []);

  useEffect(() => {
    if (!isVisibleForViewer) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const nextPayload = await fetchStartupWarnings();
        if (active) {
          setPayload(nextPayload);
        }
      } catch {
        if (active) {
          setPayload((previous) => previous || { status: 'unknown', warnings: ['Unable to fetch startup warnings.'], blockers: [] });
        }
      } finally {
        if (active) {
          timer = setTimeout(load, POLL_MS);
        }
      }
    };

    load();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [isVisibleForViewer]);

  const blockers = useMemo(() => payload?.blockers || [], [payload]);
  const warnings = useMemo(() => payload?.warnings || [], [payload]);
  const hasIssues = blockers.length > 0 || warnings.length > 0;

  if (!isVisibleForViewer || !hasIssues) {
    return null;
  }

  return (
    <section className="startup-warning-banner" role="status" aria-live="polite">
      <div className="startup-warning-banner__title">
        Startup dependency warnings
        {payload?.strictMode ? ' (strict mode enabled)' : ' (strict mode disabled)'}
      </div>
      {blockers.length > 0 && (
        <ul className="startup-warning-banner__list startup-warning-banner__list--blocker">
          {blockers.map((entry) => (
            <li key={`blocker-${entry}`}>{entry}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="startup-warning-banner__list">
          {warnings.map((entry) => (
            <li key={`warning-${entry}`}>{entry}</li>
          ))}
        </ul>
      )}
      <div className="startup-warning-banner__meta">Last checked: {payload?.checkedAt || 'unknown'}</div>
    </section>
  );
}
