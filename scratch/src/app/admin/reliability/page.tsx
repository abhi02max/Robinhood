'use client';

import { useEffect, useMemo, useState } from 'react';

type LatencySummary = {
  count?: number;
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  avgMs?: number;
  maxMs?: number;
};

type TelemetryPayload = {
  generatedAt?: string;
  uptimeSeconds?: number;
  startup?: {
    status?: string;
    strictMode?: boolean;
    warnings?: string[];
    blockers?: string[];
    checks?: Record<string, { status?: string; reason?: string }>;
  };
  aiLatency?: {
    learn?: LatencySummary;
    mentor?: LatencySummary;
  };
  providerUsageSplit?: Record<string, number>;
  executionFailures?: {
    total?: number;
    failed?: number;
    byLanguage?: Record<string, number>;
    byEndpoint?: Record<string, number>;
    byProvider?: Record<string, number>;
    failureReasons?: Record<string, number>;
  };
  routeCrashes?: {
    total?: number;
    crashRoutes?: Record<string, number>;
    statusCounts?: Record<string, number>;
  };
  userDropOff?: {
    sessionsStarted?: number;
    progressWrites?: number;
    startedUsers?: number;
    progressedUsers?: number;
    dropoffUsers?: number;
    dropoffRatePercent?: number;
  };
  sessionDuration?: LatencySummary;
  featureUsageHeatmap?: Array<{ feature: string; hits: number }>;
};

type TelemetryResponse = {
  ok?: boolean;
  telemetry?: TelemetryPayload;
};

const POLL_MS = 15000;

function numberOrDash(value: number | undefined, suffix = ''): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value}${suffix}`;
}

function asEntries(source?: Record<string, number>): Array<[string, number]> {
  if (!source) return [];
  return Object.entries(source).sort((a, b) => b[1] - a[1]);
}

export default function ReliabilityDashboardPage() {
  const [payload, setPayload] = useState<TelemetryPayload | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch('/api/admin/telemetry', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`telemetry request failed: ${response.status}`);
        }

        const data: TelemetryResponse = await response.json();
        if (active) {
          setPayload(data.telemetry || null);
          setError('');
        }
      } catch (nextError) {
        if (active) {
          setError(String((nextError as Error)?.message || nextError));
        }
      } finally {
        if (active) {
          timer = setTimeout(poll, POLL_MS);
        }
      }
    };

    poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const providerUsage = useMemo(() => asEntries(payload?.providerUsageSplit), [payload]);
  const executionByLanguage = useMemo(() => asEntries(payload?.executionFailures?.byLanguage), [payload]);
  const crashRoutes = useMemo(() => asEntries(payload?.routeCrashes?.crashRoutes), [payload]);
  const failureReasons = useMemo(() => asEntries(payload?.executionFailures?.failureReasons).slice(0, 8), [payload]);
  const featureUsage = payload?.featureUsageHeatmap || [];

  return (
    <main style={{ padding: '2rem 1rem 4rem', maxWidth: 1120, margin: '0 auto', color: '#e2e8f0' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#f8fafc' }}>Beta Reliability Dashboard</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#94a3b8' }}>
          Live metrics for startup dependencies, AI latency/provider split, execution reliability, route crashes, user drop-off, and feature usage.
        </p>
        <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Last refresh: {payload?.generatedAt || 'waiting for data'}
        </p>
      </header>

      {error && (
        <section style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 12 }}>
          Telemetry fetch error: {error}
        </section>
      )}

      <section style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1rem' }}>
        <article style={{ padding: '0.9rem', border: '1px solid #334155', borderRadius: 12, background: '#0f172a' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Startup status</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{payload?.startup?.status || '-'}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>strict mode: {String(Boolean(payload?.startup?.strictMode))}</div>
        </article>
        <article style={{ padding: '0.9rem', border: '1px solid #334155', borderRadius: 12, background: '#0f172a' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>AI p95 latency</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            learn {numberOrDash(payload?.aiLatency?.learn?.p95Ms, 'ms')} / mentor {numberOrDash(payload?.aiLatency?.mentor?.p95Ms, 'ms')}
          </div>
        </article>
        <article style={{ padding: '0.9rem', border: '1px solid #334155', borderRadius: 12, background: '#0f172a' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Execution failure rate</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {payload?.executionFailures?.total
              ? `${(((payload.executionFailures.failed || 0) / payload.executionFailures.total) * 100).toFixed(2)}%`
              : '-'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            {numberOrDash(payload?.executionFailures?.failed)} failed / {numberOrDash(payload?.executionFailures?.total)} total
          </div>
        </article>
        <article style={{ padding: '0.9rem', border: '1px solid #334155', borderRadius: 12, background: '#0f172a' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>User drop-off</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{numberOrDash(payload?.userDropOff?.dropoffRatePercent, '%')}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            started {numberOrDash(payload?.userDropOff?.startedUsers)} / progressed {numberOrDash(payload?.userDropOff?.progressedUsers)}
          </div>
        </article>
      </section>

      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>Dependency warnings and blockers</h2>
          {payload?.startup?.blockers?.length ? (
            <ul>
              {payload.startup.blockers.map((entry) => (
                <li key={`blocker-${entry}`}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#10b981' }}>No startup blockers.</p>
          )}
          {payload?.startup?.warnings?.length ? (
            <ul>
              {payload.startup.warnings.map((entry) => (
                <li key={`warning-${entry}`}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#94a3b8' }}>No startup warnings.</p>
          )}
        </article>

        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>AI provider usage split</h2>
          {providerUsage.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No provider traffic yet.</p>
          ) : (
            <ul>
              {providerUsage.map(([provider, hits]) => (
                <li key={provider}>{provider}: {hits}</li>
              ))}
            </ul>
          )}
        </article>

        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>Execution failures by language</h2>
          {executionByLanguage.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No execution telemetry yet.</p>
          ) : (
            <ul>
              {executionByLanguage.map(([language, count]) => (
                <li key={language}>{language}: {count}</li>
              ))}
            </ul>
          )}
          <h3 style={{ marginBottom: '0.3rem', fontSize: '0.95rem', color: '#cbd5e1' }}>Top failure reasons</h3>
          {failureReasons.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No failures recorded.</p>
          ) : (
            <ul>
              {failureReasons.map(([reason, count]) => (
                <li key={reason}>{reason}: {count}</li>
              ))}
            </ul>
          )}
        </article>

        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>Route crash trend</h2>
          <p>Total crashes (5xx): {numberOrDash(payload?.routeCrashes?.total)}</p>
          {crashRoutes.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No crashing routes observed.</p>
          ) : (
            <ul>
              {crashRoutes.slice(0, 10).map(([route, count]) => (
                <li key={route}>{route}: {count}</li>
              ))}
            </ul>
          )}
        </article>

        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>Session duration</h2>
          <ul>
            <li>sample count: {numberOrDash(payload?.sessionDuration?.count)}</li>
            <li>avg: {numberOrDash(payload?.sessionDuration?.avgMs, 'ms')}</li>
            <li>p95: {numberOrDash(payload?.sessionDuration?.p95Ms, 'ms')}</li>
            <li>max: {numberOrDash(payload?.sessionDuration?.maxMs, 'ms')}</li>
          </ul>
        </article>

        <article style={{ padding: '1rem', borderRadius: 12, border: '1px solid #334155', background: '#020617' }}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.1rem' }}>Feature usage heatmap</h2>
          {featureUsage.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No usage recorded yet.</p>
          ) : (
            <ul>
              {featureUsage.slice(0, 15).map((item) => (
                <li key={item.feature}>{item.feature}: {item.hits}</li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
