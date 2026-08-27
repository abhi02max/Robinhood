// ROBINHOOD — Personalized, progress-aware roadmap
import store from '../store.js';
import { careerEngine } from '../data/career-engine.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

const EXPERIENCE_LABELS = {
  new: 'Foundation first',
  basics: 'Pattern builder',
  practicing: 'Practice accelerator',
  interviewing: 'Interview sprint',
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getRoadmapModel() {
  const profile = store.getLearnerProfile?.() || {
    experience: 'basics',
    goalId: careerEngine.getGoal()?.id || 'google_sde',
    timeBudget: careerEngine.getUserTimeBudget() || 30,
    horizonDays: 90,
    language: 'javascript',
    confidence: 2,
  };
  const goal = careerEngine.getGoal();
  const solved = store.getSolvedCount();
  const readiness = store.getReadinessBreakdown();
  const categoryMastery = store.getCategoryMastery();
  const weakest = [...categoryMastery].sort((a, b) => a.pct - b.pct)[0];

  const foundationTarget = profile.experience === 'new' ? 24 : profile.experience === 'basics' ? 14 : 8;
  const coreTarget = foundationTarget + 52;
  const advancedTarget = coreTarget + 54;

  const phases = [
    {
      id: 'foundation',
      label: 'Phase 01',
      title: profile.experience === 'new' ? 'Build algorithmic foundations' : 'Close foundation gaps',
      description: 'Complexity, arrays, strings, sorting, hashing, and the habits behind correct implementation.',
      icon: 'blocks',
      progress: clamp((solved / foundationTarget) * 100),
      target: foundationTarget,
      topics: ['Complexity', 'Arrays', 'Hashing'],
      route: '/learn',
    },
    {
      id: 'patterns',
      label: 'Phase 02',
      title: 'Master reusable patterns',
      description: 'Two pointers, sliding window, binary search, recursion, linked lists, stacks, and queues.',
      icon: 'route',
      progress: clamp(((solved - foundationTarget) / (coreTarget - foundationTarget)) * 100),
      target: coreTarget,
      topics: ['Two pointers', 'Binary search', 'Recursion'],
      route: '/sheets',
    },
    {
      id: 'advanced',
      label: 'Phase 03',
      title: 'Connect advanced structures',
      description: 'Trees, graphs, heaps, greedy reasoning, dynamic programming, and system-aware problem solving.',
      icon: 'network',
      progress: clamp(((solved - coreTarget) / (advancedTarget - coreTarget)) * 100),
      target: advancedTarget,
      topics: ['Trees', 'Graphs', 'Dynamic programming'],
      route: '/problems',
    },
    {
      id: 'interview',
      label: 'Phase 04',
      title: 'Prove interview readiness',
      description: 'Timed mixed sets, delayed recall, communication practice, debugging, and realistic mock interviews.',
      icon: 'messages-square',
      progress: clamp(readiness.score),
      target: 100,
      topics: ['Timed sets', 'Recall', 'Mock interviews'],
      route: '/interview/mock',
    },
  ];

  const currentIndex = Math.max(0, phases.findIndex(phase => phase.progress < 100));
  phases.forEach((phase, index) => {
    phase.status = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
  });

  const sessionsPerWeek = profile.timeBudget === 15 ? 5 : profile.timeBudget === 30 ? 5 : 6;
  const estimatedProblems = Math.max(1, Math.round((profile.timeBudget / 30) * sessionsPerWeek));

  return {
    profile,
    goal,
    solved,
    readiness,
    weakest,
    phases,
    current: phases[currentIndex],
    sessionsPerWeek,
    estimatedProblems,
  };
}

export function renderRoadmap() {
  const model = getRoadmapModel();
  const { profile, goal, readiness, phases, current, weakest } = model;

  return `
    <div class="roadmap-page roadmap-personalized anim-fade-up">
      <header class="roadmap-hero">
        <div class="roadmap-hero-copy">
          <span class="roadmap-kicker">Your adaptive roadmap</span>
          <h1>${escapeHtml(goal?.name || 'Software Engineering')} preparation, built around your week.</h1>
          <p>${escapeHtml(EXPERIENCE_LABELS[profile.experience] || 'Personalized plan')} · ${profile.timeBudget} minutes/day · ${escapeHtml(LANGUAGE_LABELS[profile.language] || profile.language)} · target horizon ${profile.horizonDays} days.</p>
          <div class="roadmap-hero-actions">
            <button class="btn btn-primary btn-lg" onclick="navigateTo('${current.route}')">
              Continue ${escapeHtml(current.title)} <i data-lucide="arrow-right"></i>
            </button>
            <button class="btn btn-secondary" onclick="navigateTo('/onboarding')">
              Adjust plan
            </button>
          </div>
        </div>
        <div class="roadmap-readiness-card">
          <span>Interview readiness</span>
          <strong>${readiness.score}<small>/100</small></strong>
          <div class="roadmap-readiness-track"><span style="width:${readiness.score}%"></span></div>
          <p>${readiness.score < 35 ? 'Building evidence' : readiness.score < 70 ? 'Developing reliability' : 'Approaching interview range'}</p>
          <button onclick="navigateTo('/analytics')">View score evidence <i data-lucide="arrow-up-right"></i></button>
        </div>
      </header>

      <section class="roadmap-plan-strip" aria-label="Roadmap plan summary">
        <article>
          <i data-lucide="calendar-days"></i>
          <div><strong>${model.sessionsPerWeek} sessions</strong><span>recommended each week</span></div>
        </article>
        <article>
          <i data-lucide="list-checks"></i>
          <div><strong>~${model.estimatedProblems} problems</strong><span>at your current pace</span></div>
        </article>
        <article>
          <i data-lucide="scan-search"></i>
          <div><strong>${escapeHtml(weakest?.name || 'Baseline pending')}</strong><span>current focus area</span></div>
        </article>
        <article>
          <i data-lucide="flag"></i>
          <div><strong>${addDays(profile.horizonDays)}</strong><span>target checkpoint</span></div>
        </article>
      </section>

      <div class="roadmap-content-grid">
        <section class="roadmap-main" aria-labelledby="roadmap-phases-title">
          <div class="roadmap-section-heading">
            <div>
              <span class="roadmap-kicker">Learning sequence</span>
              <h2 id="roadmap-phases-title">Four phases, one clear next step</h2>
            </div>
            <span>${model.solved} problems solved</span>
          </div>

          <div class="roadmap-phase-list">
            ${phases.map((phase, index) => `
              <article class="roadmap-phase roadmap-phase-${phase.status}">
                <div class="roadmap-phase-rail">
                  <span class="roadmap-phase-node"><i data-lucide="${phase.status === 'complete' ? 'check' : phase.icon}"></i></span>
                  ${index < phases.length - 1 ? '<span class="roadmap-phase-line"></span>' : ''}
                </div>
                <div class="roadmap-phase-card">
                  <div class="roadmap-phase-topline">
                    <span>${phase.label}</span>
                    <span class="roadmap-phase-status">${phase.status === 'complete' ? 'Mastered' : phase.status === 'current' ? 'In progress' : 'Upcoming'}</span>
                  </div>
                  <h3>${escapeHtml(phase.title)}</h3>
                  <p>${escapeHtml(phase.description)}</p>
                  <div class="roadmap-topic-row">
                    ${phase.topics.map(topic => `<span>${escapeHtml(topic)}</span>`).join('')}
                  </div>
                  <div class="roadmap-phase-progress">
                    <div><span style="width:${phase.progress}%"></span></div>
                    <strong>${phase.progress}%</strong>
                  </div>
                  ${phase.status === 'current' ? `
                    <button class="roadmap-phase-action" onclick="navigateTo('${phase.route}')">
                      Open current phase <i data-lucide="arrow-right"></i>
                    </button>
                  ` : ''}
                </div>
              </article>
            `).join('')}
          </div>
        </section>

        <aside class="roadmap-side">
          <section class="chart-card roadmap-week-card">
            <span class="roadmap-kicker">This week</span>
            <h2>Protect the rhythm</h2>
            <div class="roadmap-week-days">
              ${['M','T','W','T','F','S','S'].map((day, index) => `<span class="${index < model.sessionsPerWeek ? 'is-planned' : ''}">${day}</span>`).join('')}
            </div>
            <p>${model.sessionsPerWeek} focused sessions leave room for recovery without losing momentum.</p>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('/scheduler')">Open schedule</button>
          </section>

          <section class="chart-card roadmap-adaptation-card">
            <span class="roadmap-kicker">Why this plan</span>
            <h2>What Robinhood adapted</h2>
            <ul>
              <li><i data-lucide="check"></i><span>${profile.experience === 'new' ? 'Foundation depth increased' : 'Known basics compressed'}</span></li>
              <li><i data-lucide="check"></i><span>Daily load capped at ${profile.timeBudget} minutes</span></li>
              <li><i data-lucide="check"></i><span>${profile.confidence <= 2 ? 'Guided problems appear before independent sets' : 'Independent practice appears earlier'}</span></li>
              <li><i data-lucide="check"></i><span>Weak-topic evidence will reorder future sessions</span></li>
            </ul>
          </section>

          <section class="chart-card roadmap-sync-card">
            <div>
              <span class="roadmap-kicker">Server enrichment</span>
              <h2>Detailed day plan</h2>
              <p>Your roadmap works locally now. Generate a day-wise schedule when the learning service is available.</p>
            </div>
            <button id="generate-roadmap-btn" class="btn btn-secondary btn-sm">
              <i data-lucide="sparkles"></i> Generate days
            </button>
            <div id="roadmap-error" role="status"></div>
          </section>
        </aside>
      </div>

      <section id="roadmap-server-schedule" class="roadmap-server-schedule" hidden></section>
      ${renderAskRobinFab()}
      ${renderAskRobinPanel()}
    </div>
  `;
}

export function initRoadmap() {
  setRobinContext('Roadmap', 'Personal Plan', 'Help me understand and adjust my personalized learning sequence.');
  initAskRobin();

  const generateBtn = document.getElementById('generate-roadmap-btn');
  const container = document.getElementById('roadmap-server-schedule');
  const errorEl = document.getElementById('roadmap-error');
  const profile = store.getLearnerProfile?.();
  const userId = store.get('user')?.id || 'mock-uuid-for-demo';
  const targetRole = careerEngine.getGoal()?.name || 'Software Engineer';

  generateBtn?.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="loading-spinner loading-spinner-sm"></span> Generating days';
    if (errorEl) errorEl.textContent = '';

    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          targetRole,
          experience: profile?.experience,
          timeBudget: profile?.timeBudget,
          horizonDays: profile?.horizonDays,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.reason || 'Learning service is unavailable.');
      const schedule = Array.isArray(data.schedule) ? data.schedule : [];
      if (!schedule.length) throw new Error('No day-wise curriculum is available yet.');

      container.hidden = false;
      container.innerHTML = `
        <div class="roadmap-section-heading">
          <div><span class="roadmap-kicker">Generated schedule</span><h2>Your next ${schedule.length} learning days</h2></div>
        </div>
        <div class="roadmap-day-grid">
          ${schedule.slice(0, 14).map(task => `
            <article class="chart-card roadmap-day-card">
              <span>Day ${Number(task.day) || 1}</span>
              <strong>${escapeHtml(task.title || 'Focused practice')}</strong>
              <small>${escapeHtml(task.category || 'DSA')} · ${escapeHtml(task.status || 'Pending')}</small>
            </article>
          `).join('')}
        </div>
      `;
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (errorEl) errorEl.textContent = `${error.message} Your adaptive phase plan remains active.`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i data-lucide="sparkles"></i> Generate days';
      window.lucide?.createIcons();
    }
  });

  window.lucide?.createIcons();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
