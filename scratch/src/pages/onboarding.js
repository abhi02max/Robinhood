import store from '../store.js';
import { careerEngine, CAREER_GOALS } from '../data/career-engine.js';
import { showToast } from '../components/notifications.js';

const EXPERIENCE_OPTIONS = [
  { id: 'new', title: 'Starting from zero', body: 'Build fundamentals before pattern practice.', icon: 'sprout' },
  { id: 'basics', title: 'I know the basics', body: 'Turn concepts into reliable problem-solving patterns.', icon: 'blocks' },
  { id: 'practicing', title: 'Already practicing', body: 'Diagnose weak patterns and improve consistency.', icon: 'code-2' },
  { id: 'interviewing', title: 'Interview approaching', body: 'Prioritize recall, timed practice, and mock interviews.', icon: 'briefcase-business' },
];

const LANGUAGE_OPTIONS = [
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['cpp', 'C++'],
];

export function renderOnboarding() {
  return `
    <main class="onboarding-page">
      <header class="onboarding-topbar">
        <button class="onboarding-brand" type="button" onclick="navigateTo('/')">
          <span class="onboarding-brand-mark">R</span>
          <span>Robinhood <small>For Good</small></span>
        </button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="navigateTo('/dashboard')">Do this later</button>
      </header>

      <div class="onboarding-shell">
        <aside class="onboarding-context">
          <span class="onboarding-kicker">Personal setup</span>
          <h1>Your plan should fit your life—not the other way around.</h1>
          <p>Four quick choices help Robinhood select the right sequence, workload, and interview emphasis.</p>
          <div class="onboarding-proof">
            <div><i data-lucide="route"></i><span><strong>Adaptive sequence</strong> based on where you are now</span></div>
            <div><i data-lucide="calendar-clock"></i><span><strong>Realistic workload</strong> matched to your time</span></div>
            <div><i data-lucide="shield-check"></i><span><strong>Fully adjustable</strong> whenever your goals change</span></div>
          </div>
        </aside>

        <section class="onboarding-card" aria-labelledby="onboarding-step-title">
          <div class="onboarding-progress" aria-label="Onboarding progress">
            <span id="onboarding-step-label">Step 1 of 4</span>
            <div class="onboarding-progress-track"><span id="onboarding-progress-fill"></span></div>
          </div>
          <div id="onboarding-step"></div>
          <footer class="onboarding-actions">
            <button id="onboarding-back" class="btn btn-secondary" type="button">Back</button>
            <button id="onboarding-next" class="btn btn-primary" type="button">Continue <i data-lucide="arrow-right"></i></button>
          </footer>
        </section>
      </div>
    </main>
  `;
}

export function initOnboarding() {
  const saved = store.getLearnerProfile?.();
  const state = {
    step: 0,
    experience: saved?.experience || 'basics',
    goalId: saved?.goalId || careerEngine.getGoal()?.id || 'google_sde',
    timeBudget: saved?.timeBudget || careerEngine.getUserTimeBudget() || 30,
    horizonDays: saved?.horizonDays || 90,
    language: saved?.language || 'javascript',
    confidence: saved?.confidence || 2,
  };

  const stepRoot = document.getElementById('onboarding-step');
  const nextButton = document.getElementById('onboarding-next');
  const backButton = document.getElementById('onboarding-back');
  const label = document.getElementById('onboarding-step-label');
  const progress = document.getElementById('onboarding-progress-fill');
  if (!stepRoot || !nextButton || !backButton || !label || !progress) return;

  const option = (group, value, title, body = '', icon = '') => `
    <label class="onboarding-option${String(state[group]) === String(value) ? ' is-selected' : ''}">
      <input type="radio" name="${group}" value="${value}" ${String(state[group]) === String(value) ? 'checked' : ''}>
      ${icon ? `<span class="onboarding-option-icon"><i data-lucide="${icon}"></i></span>` : ''}
      <span class="onboarding-option-copy"><strong>${title}</strong>${body ? `<small>${body}</small>` : ''}</span>
      <span class="onboarding-option-check"><i data-lucide="check"></i></span>
    </label>
  `;

  const renderStep = () => {
    label.textContent = `Step ${state.step + 1} of 4`;
    progress.style.width = `${(state.step + 1) * 25}%`;
    backButton.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    nextButton.innerHTML = state.step === 3
      ? 'Build my roadmap <i data-lucide="sparkles"></i>'
      : 'Continue <i data-lucide="arrow-right"></i>';

    if (state.step === 0) {
      stepRoot.innerHTML = `
        <div class="onboarding-step-heading">
          <span>01 · Starting point</span>
          <h2 id="onboarding-step-title">Where are you today?</h2>
          <p>This controls how much foundational material appears before independent practice.</p>
        </div>
        <div class="onboarding-option-grid">
          ${EXPERIENCE_OPTIONS.map(item => option('experience', item.id, item.title, item.body, item.icon)).join('')}
        </div>
      `;
    } else if (state.step === 1) {
      stepRoot.innerHTML = `
        <div class="onboarding-step-heading">
          <span>02 · Destination</span>
          <h2 id="onboarding-step-title">What outcome are you targeting?</h2>
          <p>Your plan will emphasize the patterns and interview formats that matter most.</p>
        </div>
        <div class="onboarding-option-grid onboarding-option-grid-single">
          ${CAREER_GOALS.map(goal => option('goalId', goal.id, goal.name, goal.type === 'algo'
            ? 'Algorithm depth, pattern recognition, and coding interviews.'
            : goal.type === 'backend'
              ? 'DSA, SQL, APIs, databases, and system design.'
              : 'Balanced frontend, backend, DSA, and architecture prep.',
          goal.type === 'algo' ? 'binary' : goal.type === 'backend' ? 'server' : 'panels-top-left')).join('')}
        </div>
      `;
    } else if (state.step === 2) {
      stepRoot.innerHTML = `
        <div class="onboarding-step-heading">
          <span>03 · Sustainable pace</span>
          <h2 id="onboarding-step-title">How much time can you protect?</h2>
          <p>Choose the pace you can sustain on an ordinary day—not your most motivated day.</p>
        </div>
        <div class="onboarding-pace-grid">
          ${option('timeBudget', 15, '15 minutes', 'One focused drill', 'coffee')}
          ${option('timeBudget', 30, '30 minutes', 'Concept + practice', 'timer')}
          ${option('timeBudget', 60, '60 minutes', 'Full learning session', 'focus')}
        </div>
        <div class="onboarding-field-block">
          <label for="onboarding-horizon">Preparation horizon</label>
          <select id="onboarding-horizon" class="select">
            <option value="30" ${state.horizonDays === 30 ? 'selected' : ''}>30 days · interview sprint</option>
            <option value="60" ${state.horizonDays === 60 ? 'selected' : ''}>60 days · focused preparation</option>
            <option value="90" ${state.horizonDays === 90 ? 'selected' : ''}>90 days · recommended</option>
            <option value="180" ${state.horizonDays === 180 ? 'selected' : ''}>6 months · steady mastery</option>
          </select>
        </div>
      `;
    } else {
      stepRoot.innerHTML = `
        <div class="onboarding-step-heading">
          <span>04 · Working style</span>
          <h2 id="onboarding-step-title">Set your practice defaults</h2>
          <p>You can change these later without losing roadmap progress.</p>
        </div>
        <div class="onboarding-field-block">
          <span class="onboarding-field-label">Primary coding language</span>
          <div class="onboarding-language-grid">
            ${LANGUAGE_OPTIONS.map(([id, title]) => option('language', id, title)).join('')}
          </div>
        </div>
        <div class="onboarding-confidence">
          <div>
            <span class="onboarding-field-label">Current problem-solving confidence</span>
            <small>1 means “I need guidance”; 5 means “I solve mediums independently.”</small>
          </div>
          <output id="confidence-output">${state.confidence}/5</output>
          <input id="onboarding-confidence" type="range" min="1" max="5" step="1" value="${state.confidence}" aria-label="Problem-solving confidence">
        </div>
        <div class="onboarding-summary">
          <i data-lucide="wand-sparkles"></i>
          <p>Your first roadmap will prioritize <strong>${state.experience === 'interviewing' ? 'timed recall and interview simulation' : 'durable pattern mastery'}</strong> in ${state.timeBudget}-minute daily sessions.</p>
        </div>
      `;
    }

    stepRoot.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', event => {
        const target = event.currentTarget;
        const key = target.name;
        state[key] = ['timeBudget'].includes(key) ? Number(target.value) : target.value;
        renderStep();
      });
    });

    document.getElementById('onboarding-horizon')?.addEventListener('change', event => {
      state.horizonDays = Number(event.currentTarget.value);
    });
    document.getElementById('onboarding-confidence')?.addEventListener('input', event => {
      state.confidence = Number(event.currentTarget.value);
      const output = document.getElementById('confidence-output');
      if (output) output.textContent = `${state.confidence}/5`;
    });
    window.lucide?.createIcons();
  };

  backButton.addEventListener('click', () => {
    state.step = Math.max(0, state.step - 1);
    renderStep();
  });

  nextButton.addEventListener('click', () => {
    if (state.step < 3) {
      state.step += 1;
      renderStep();
      return;
    }
    const profile = store.setLearnerProfile(state);
    careerEngine.setGoal(profile.goalId);
    careerEngine.setUserTimeBudget(profile.timeBudget);
    showToast('Your personalized roadmap is ready.', 'success');
    window.navigateTo?.('/roadmap');
  });

  renderStep();
}
