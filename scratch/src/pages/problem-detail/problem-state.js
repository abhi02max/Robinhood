import { showToast } from '../../components/notifications.js';

const state = {
  problemId: null,
  problem: null,
  currentLang: 'cpp',
  monacoEditor: null,
  sqlMonacoEditor: null,
  testCases: [],
  hiddenTests: [],
  testSuite: { prebuilt: [], hidden: [] },
  disposers: [],
  sqlIsRunning: false,
  timer: {
    running: false,
    startTimeMs: null,
    elapsedSeconds: 0,
    targetSeconds: 0,
    intervalId: null,
  },
};

export function getProblemState() {
  return state;
}

export function setActiveProblem(problem) {
  state.problem = problem || null;
  state.problemId = problem?.id || null;
}

export function setCurrentLanguage(language) {
  state.currentLang = language;
}

export function getCurrentLanguage() {
  return state.currentLang;
}

function disposeEditorAndModel(editor) {
  if (!editor) return;

  let model = null;
  try {
    model = typeof editor.getModel === 'function' ? editor.getModel() : null;
  } catch (_) {
    model = null;
  }

  try {
    editor.dispose();
  } catch (_) {
    // no-op
  }

  if (model) {
    try {
      if (!model.isDisposed?.()) {
        model.dispose();
      }
    } catch (_) {
      // no-op
    }
  }
}

export function setMonacoEditor(editor) {
  if (state.monacoEditor && state.monacoEditor !== editor) {
    disposeEditorAndModel(state.monacoEditor);
  }
  state.monacoEditor = editor || null;
}

export function getMonacoEditor() {
  return state.monacoEditor;
}

export function setSqlMonacoEditor(editor) {
  if (state.sqlMonacoEditor && state.sqlMonacoEditor !== editor) {
    disposeEditorAndModel(state.sqlMonacoEditor);
  }
  state.sqlMonacoEditor = editor || null;
}

export function getSqlMonacoEditor() {
  return state.sqlMonacoEditor;
}

export function setTestData({ uiCases, hiddenTests, tests }) {
  state.testCases = Array.isArray(uiCases) ? uiCases : [];
  state.hiddenTests = Array.isArray(hiddenTests) ? hiddenTests : [];
  state.testSuite = tests || { prebuilt: [], hidden: [] };
}

export function getTestData() {
  return {
    uiCases: state.testCases,
    hiddenTests: state.hiddenTests,
    tests: state.testSuite,
  };
}

export function trackDisposer(disposer) {
  if (typeof disposer === 'function') {
    state.disposers.push(disposer);
  }
}

export function flushDisposers() {
  while (state.disposers.length) {
    const disposer = state.disposers.pop();
    try {
      disposer();
    } catch (_) {
      // no-op
    }
  }
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const elapsedNode = document.getElementById('problem-timer-display');
  if (elapsedNode) elapsedNode.textContent = formatSeconds(state.timer.elapsedSeconds);

  const targetNode = document.getElementById('problem-timer-target');
  if (targetNode) targetNode.textContent = formatSeconds(state.timer.targetSeconds);

  const toggleNode = document.getElementById('problem-timer-btn');
  if (toggleNode) {
    toggleNode.innerHTML = `<i data-lucide="${state.timer.running ? 'pause' : 'play'}" width="14" height="14"></i>`;
    window.lucide?.createIcons({ nodes: [toggleNode] });
  }
}

export function setTimerTargetMinutes(minutes) {
  const nextMinutes = Math.max(0, Number(minutes) || 0);
  state.timer.targetSeconds = nextMinutes * 60;
  updateTimerDisplay();
}

function stopTimerInterval() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

export function pauseProblemTimer() {
  state.timer.running = false;
  stopTimerInterval();
  updateTimerDisplay();
}

function checkTimerAlert() {
  if (!state.timer.targetSeconds) return;
  if (state.timer.elapsedSeconds < state.timer.targetSeconds) return;
  pauseProblemTimer();
  showToast('Problem timer target reached.', 'info');
}

export function startProblemTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timer.startTimeMs = Date.now() - state.timer.elapsedSeconds * 1000;
  state.timer.intervalId = setInterval(() => {
    state.timer.elapsedSeconds = Math.floor((Date.now() - state.timer.startTimeMs) / 1000);
    updateTimerDisplay();
    checkTimerAlert();
  }, 1000);
  updateTimerDisplay();
}

export function toggleProblemTimer() {
  if (state.timer.running) {
    pauseProblemTimer();
  } else {
    startProblemTimer();
  }
}

export function resetProblemTimer() {
  pauseProblemTimer();
  state.timer.startTimeMs = null;
  state.timer.elapsedSeconds = 0;
  updateTimerDisplay();
}

export function initializeTimerUi() {
  updateTimerDisplay();
}

export function notifyTimerProgressTouch() {
  checkTimerAlert();
}

export function setSqlRunning(value) {
  state.sqlIsRunning = Boolean(value);
}

export function isSqlRunning() {
  return state.sqlIsRunning;
}

export function cleanupProblemState() {
  flushDisposers();
  pauseProblemTimer();
  setMonacoEditor(null);
  setSqlMonacoEditor(null);

  if (window.monaco?.editor?.getModels) {
    window.monaco.editor.getModels().forEach((model) => {
      try {
        if (!model.isDisposed?.()) model.dispose();
      } catch (_) {
        // no-op
      }
    });
  }

  state.problem = null;
  state.problemId = null;
  state.testCases = [];
  state.hiddenTests = [];
  state.testSuite = { prebuilt: [], hidden: [] };
  state.sqlIsRunning = false;
}
