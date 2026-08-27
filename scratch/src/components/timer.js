// ROBINHOOD - Timer & Pomodoro Component
import store from '../store.js';
import { showToast } from './notifications.js';

let timerInterval = null;
let unsubscribeTimer = null;

function getTimerState() {
  return store.getTimerState();
}

function setTimerState(next) {
  store.setTimerState(next);
}

function stopInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function syncRunningTimer() {
  const state = getTimerState();
  if (!state.isRunning || !state.endsAt) {
    stopInterval();
    return;
  }

  if (timerInterval) return;

  timerInterval = setInterval(() => {
    const liveState = getTimerState();
    const now = Date.now();
    const nextRemaining = Math.max(0, Math.ceil((liveState.endsAt - now) / 1000));
    if (nextRemaining <= 0) {
      stopInterval();
      setTimerState({
        remaining: 0,
        isRunning: false,
        endsAt: null,
      });
      showToast('⏰ Timer complete! Take a break or continue your grind.', 'success', 5000);
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play().catch(() => {}); } catch (e) {}
      return;
    }
    setTimerState({ remaining: nextRemaining });
  }, 1000);
}

export function initTimer() {
  const state = getTimerState();
  if (state.isRunning && state.endsAt) {
    const nextRemaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    if (nextRemaining <= 0) {
      setTimerState({ isRunning: false, remaining: 0, endsAt: null });
    } else {
      // Timer is running - ensure it's visible and update remaining time
      if (nextRemaining !== state.remaining || !state.visible) {
        setTimerState({ remaining: nextRemaining, visible: true });
      }
    }
  }

  if (unsubscribeTimer) unsubscribeTimer();
  unsubscribeTimer = store.on('timerState', () => {
    syncRunningTimer();
    renderTimerWidget();
  });

  syncRunningTimer();
  renderTimerWidget();
}

function renderTimerWidget() {
  const widget = document.getElementById('timer-widget');
  if (!widget) return;

  const state = getTimerState();
  const hours = Math.floor(state.remaining / 3600);
  const mins = Math.floor((state.remaining % 3600) / 60);
  const secs = state.remaining % 60;

  widget.innerHTML = `
    <div class="timer-label">${state.mode === 'pomodoro' ? '🍅 Pomodoro' : '⏱️ Focus Timer'}</div>
    <div class="timer-display" id="timer-display">${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div>
    <div class="timer-manual-set">
      <div class="timer-manual-row">
        <label>H</label>
        <input type="number" min="0" max="23" id="timer-hours-input" value="${hours}" />
        <label>M</label>
        <input type="number" min="0" max="59" id="timer-minutes-input" value="${mins}" />
        <label>S</label>
        <input type="number" min="0" max="59" id="timer-seconds-input" value="${secs}" />
      </div>
      <button class="btn btn-sm btn-secondary" onclick="window._timerApplyManual()">Set Time</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;">
      <button class="btn btn-sm btn-secondary" onclick="window._timerSetTime(15)">15m</button>
      <button class="btn btn-sm btn-secondary" onclick="window._timerSetTime(25)">25m</button>
      <button class="btn btn-sm btn-secondary" onclick="window._timerSetTime(45)">45m</button>
      <button class="btn btn-sm btn-secondary" onclick="window._timerSetTime(60)">60m</button>
    </div>
    <div class="timer-controls">
      <button class="btn btn-sm ${state.isRunning ? 'btn-danger' : 'btn-primary'}" onclick="window._timerToggle()">
        ${state.isRunning ? 'Pause' : 'Start'}
      </button>
      <button class="btn btn-sm btn-secondary" onclick="window._timerReset()">Reset</button>
      <button class="btn btn-sm btn-ghost" onclick="window._timerMode()">
        ${state.mode === 'pomodoro' ? 'Manual' : '🍅'}
      </button>
    </div>
    <button class="btn-icon" style="position:absolute;top:8px;right:8px;" onclick="window._toggleTimerVisibility(false)">
      <i data-lucide="x" width="16" height="16"></i>
    </button>
  `;

  widget.classList.toggle('hidden', !state.visible);
  if (window.lucide) window.lucide.createIcons({ nodes: [widget] });
}

window._timerSetTime = (minutes) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  stopInterval();
  setTimerState({
    remaining: safeMinutes * 60,
    isRunning: false,
    endsAt: null,
    visible: true,
  });
};

window._timerApplyManual = () => {
  const hEl = document.getElementById('timer-hours-input');
  const mEl = document.getElementById('timer-minutes-input');
  const sEl = document.getElementById('timer-seconds-input');
  const hours = Math.min(23, Math.max(0, Number(hEl?.value) || 0));
  const minutes = Math.min(59, Math.max(0, Number(mEl?.value) || 0));
  const seconds = Math.min(59, Math.max(0, Number(sEl?.value) || 0));
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
  stopInterval();
  setTimerState({
    remaining: totalSeconds,
    isRunning: false,
    endsAt: null,
    visible: true,
  });
};

window._timerToggle = () => {
  const state = getTimerState();
  if (state.remaining <= 0) {
    setTimerState({
      remaining: 25 * 60,
      isRunning: true,
      endsAt: Date.now() + 25 * 60 * 1000,
      visible: true,
    });
    return;
  }

  if (state.isRunning) {
    stopInterval();
    setTimerState({
      isRunning: false,
      endsAt: null,
    });
  } else {
    setTimerState({
      isRunning: true,
      endsAt: Date.now() + state.remaining * 1000,
      visible: true,
    });
  }
};

window._timerReset = () => {
  stopInterval();
  setTimerState({
    isRunning: false,
    remaining: 0,
    endsAt: null,
  });
};

window._timerMode = () => {
  const state = getTimerState();
  const nextMode = state.mode === 'pomodoro' ? 'manual' : 'pomodoro';
  const nextRemaining = nextMode === 'pomodoro' ? (store.get('preferences')?.pomodoroWork || 25) * 60 : state.remaining;
  stopInterval();
  setTimerState({
    mode: nextMode,
    remaining: nextRemaining,
    isRunning: false,
    endsAt: null,
    visible: true,
  });
};

window._toggleTimerVisibility = (forceVisible) => {
  if (typeof forceVisible === 'boolean') {
    setTimerState({ visible: forceVisible });
    return;
  }
  const state = getTimerState();
  setTimerState({ visible: !state.visible });
};
