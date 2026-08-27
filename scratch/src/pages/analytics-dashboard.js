import { fetchAnalyticsProgress, fetchAnalyticsStreaks } from './experience-api.js';
import { router } from '../router.js';

export function renderAnalyticsDashboard() {
  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Analytics Dashboard</p>
          <h1>Progress and Readiness Insights</h1>
          <p>Track mastery, streaks, and trajectory with a chart-ready analytics panel.</p>
        </div>
      </header>

      <div class="experience-shell single-main">
        <main class="experience-main">
          <div class="analytics-grid">
            <article class="card experience-panel analytics-card">
              <h3>Mastery Snapshot</h3>
              <div class="analytics-stat" id="analytics-mastery">--</div>
              <p class="experience-muted">Subject mastery percentage based on completed milestones.</p>
            </article>

            <article class="card experience-panel analytics-card">
              <h3>Current Streak</h3>
              <div class="analytics-stat" id="analytics-streak">--</div>
              <p class="experience-muted">Consecutive active preparation days.</p>
            </article>

            <article class="card experience-panel analytics-chart-card">
              <h3>Streak Trend</h3>
              <canvas id="analytics-streak-chart" height="180"></canvas>
            </article>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initAnalyticsDashboard() {
  const masteryEl = document.getElementById('analytics-mastery');
  const streakEl = document.getElementById('analytics-streak');
  const requestController = new AbortController();

  const previousRouteLeave = router.onRouteLeave;
  const analyticsRouteLeave = () => {
    requestController.abort();
    if (window.__analyticsChartInstance) {
      window.__analyticsChartInstance.destroy();
      window.__analyticsChartInstance = null;
    }

    if (typeof previousRouteLeave === 'function') {
      try {
        previousRouteLeave();
      } catch (_) {
        // no-op
      }
    }

    if (router.onRouteLeave === analyticsRouteLeave) {
      router.onRouteLeave = null;
    }
  };

  router.onRouteLeave = analyticsRouteLeave;

  try {
    const [progress, streaks] = await Promise.all([
      fetchAnalyticsProgress({ signal: requestController.signal }),
      fetchAnalyticsStreaks({ signal: requestController.signal }),
    ]);

    if (masteryEl) masteryEl.textContent = `${progress?.mastery ?? 0}%`;
    if (streakEl) streakEl.textContent = `${streaks?.currentStreak ?? progress?.streak ?? 0} days`;

    const canvas = document.getElementById('analytics-streak-chart');
    if (canvas && window.Chart) {
      if (window.__analyticsChartInstance) {
        window.__analyticsChartInstance.destroy();
      }

      const mappedDays = Array.isArray(streaks?.mappedDays) ? streaks.mappedDays : [];
      const labels = mappedDays.length
        ? mappedDays.map((item) => String(item.date || '').slice(5))
        : ['Today'];
      const values = mappedDays.length
        ? mappedDays.map((item) => Number(item.minutes || 0))
        : [Number(streaks?.currentStreak || progress?.streak || 0)];

      window.__analyticsChartInstance = new window.Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: '#E95849',
            backgroundColor: 'rgba(233,88,73,0.2)',
            tension: 0.35,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(120,120,120,0.15)' } },
            y: { grid: { color: 'rgba(120,120,120,0.15)' }, beginAtZero: true },
          },
        },
      });
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (masteryEl) masteryEl.textContent = 'Error';
    if (streakEl) streakEl.textContent = 'Error';
  }

  window.lucide?.createIcons();
}
