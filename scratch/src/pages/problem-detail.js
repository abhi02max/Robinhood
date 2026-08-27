import store from '../store.js';
// Phase A migration: legacy `getProblemById` from `../data/problems.js` is
// gone. Source the lookup from the hydrated cache instead.
import { getProblemById } from '../utils/problems-cache.js';
import { router } from '../router.js';
import { initAskRobin, setRobinContext } from '../components/ask-robin.js';
import { EXECUTION_LANGUAGES, normalizeExecutionLanguage } from './problem-detail/problem-template-resolver.js';
import { buildProblemViewModel, renderProblemDetailPage, renderProblemNotFound } from './problem-detail/problem-ui-renderer.js';
import { initProblemEditor, invalidateProblemEditorInit } from './problem-detail/problem-editor.js';
import { bindProblemDetailEvents, resetWindowBindings } from './problem-detail/problem-events.js';
import { cleanupProblemState, setActiveProblem, setCurrentLanguage, setTestData } from './problem-detail/problem-state.js';

function resolveInitialLanguage(problemId) {
  const savedLanguage = store.get('progress')?.[problemId]?.language;
  const normalized = normalizeExecutionLanguage(savedLanguage || 'cpp');
  return EXECUTION_LANGUAGES.includes(normalized) ? normalized : 'javascript';
}

function teardownProblemDetail() {
  invalidateProblemEditorInit();
  cleanupProblemState();
  resetWindowBindings();
  delete window._currentProblemId;
  delete window._currentProblemCategory;
}

export function renderProblemDetail(params) {
  const problem = getProblemById(params?.id);
  if (!problem) return renderProblemNotFound();

  const progressEntry = store.get('progress')?.[problem.id] || {};
  const currentLang = resolveInitialLanguage(problem.id);
  const model = buildProblemViewModel(problem);

  setCurrentLanguage(currentLang);

  return renderProblemDetailPage({
    problem,
    progressEntry,
    model,
    currentLang,
  });
}

export function initProblemDetail(params) {
  const problem = getProblemById(params?.id);
  if (!problem) return;

  teardownProblemDetail();

  setActiveProblem(problem);
  setCurrentLanguage(resolveInitialLanguage(problem.id));

  const model = buildProblemViewModel(problem);
  setTestData({
    uiCases: model.uiCases,
    hiddenTests: model.hiddenTests,
    tests: model.tests,
  });

  window._currentProblemId = problem.id;
  // Cache rows expose `topic.slug` rather than the legacy flat `category`.
  window._currentProblemCategory = problem?.topic?.slug || problem?.category || '';

  setRobinContext('Problem Workspace', problem.title, 'Help me solve this problem step-by-step and debug my approach.');
  initAskRobin();

  initProblemEditor(problem);
  bindProblemDetailEvents(problem);

  const teardownOnPageExit = () => {
    teardownProblemDetail();
  };

  window.addEventListener('pagehide', teardownOnPageExit, { once: true });
  window.addEventListener('beforeunload', teardownOnPageExit, { once: true });
  window.addEventListener('unload', teardownOnPageExit, { once: true });

  router.onRouteLeave = () => {
    window.removeEventListener('pagehide', teardownOnPageExit);
    window.removeEventListener('beforeunload', teardownOnPageExit);
    window.removeEventListener('unload', teardownOnPageExit);
    teardownProblemDetail();
    router.onRouteLeave = null;
  };
}
