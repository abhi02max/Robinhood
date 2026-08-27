import store from '../../store.js';
import { showToast } from '../../components/notifications.js';
import {
  EXECUTION_LANGUAGES,
  normalizeExecutionLanguage,
  resolveProblemTemplate,
} from './problem-template-resolver.js';
import {
  getCurrentLanguage,
  setCurrentLanguage,
  getMonacoEditor,
  setMonacoEditor,
  notifyTimerProgressTouch,
} from './problem-state.js';

const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  c: 'c',
  csharp: 'csharp',
};

let editorInitSequence = 0;

export function invalidateProblemEditorInit() {
  editorInitSequence += 1;
}

export function getCurrentEditorCode() {
  const editor = getMonacoEditor();
  if (editor) return editor.getValue();
  const fallback = document.getElementById('fallback-editor');
  return fallback ? fallback.value : '';
}

export function setEditorCode(code) {
  const editor = getMonacoEditor();
  if (editor) {
    editor.setValue(code);
    return;
  }

  const fallback = document.getElementById('fallback-editor');
  if (fallback) fallback.value = code;
}

export function saveCurrentEditorCode(problem, code) {
  if (!problem?.id) return;

  const progress = { ...(store.get('progress') || {}) };
  const current = progress[problem.id] || {};
  progress[problem.id] = {
    ...current,
    code,
    language: getCurrentLanguage(),
  };
  store.set('progress', progress);
}

function ensureEditorContainer() {
  const container = document.getElementById('monaco-container');
  if (!container) {
    showToast('Editor container missing on this route.', 'error');
    return null;
  }
  return container;
}

function createFallbackEditor(container, initialValue) {
  container.innerHTML = `<textarea class="input" id="fallback-editor" style="width:100%;height:100%;font-family:var(--font-mono);font-size:14px;resize:none;padding:16px;background:var(--surface-inset);border:none;">${initialValue}</textarea>`;
}

export function initProblemEditor(problem) {
  const container = ensureEditorContainer();
  if (!container || !problem?.id) return;
  const initSequence = ++editorInitSequence;

  const savedCode = store.get('progress')?.[problem.id]?.code;
  const template = resolveProblemTemplate(problem, getCurrentLanguage());
  const initialCode = savedCode || template;
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
  const editorSettings = store.get('preferences')?.editor || { fontSize: 14, wordWrap: 'off', tabSize: 4 };

  if (!window.require) {
    createFallbackEditor(container, initialCode);
    return;
  }

  window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
  window.require(['vs/editor/editor.main'], () => {
    if (initSequence !== editorInitSequence) return;
    if (!container.isConnected || !document.body.contains(container)) return;
    if (window._currentProblemId !== problem.id) return;

    setMonacoEditor(null);

    const languageId = LANGUAGE_MAP[getCurrentLanguage()] || 'javascript';
    const model = window.monaco.editor.createModel(initialCode, languageId);
    const editor = window.monaco.editor.create(container, {
      model,
      theme: isDarkTheme ? 'vs-dark' : 'vs',
      fontSize: Number(editorSettings.fontSize || 14),
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      roundedSelection: true,
      automaticLayout: true,
      tabSize: Number(editorSettings.tabSize || 4),
      wordWrap: editorSettings.wordWrap || 'off',
      lineHeight: Math.max(20, Number(editorSettings.fontSize || 14) + 6),
      bracketPairColorization: { enabled: true },
      quickSuggestions: { other: true, comments: false, strings: true },
      formatOnType: true,
      formatOnPaste: true,
    });

    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => {
      window._invokeRunCode?.(problem.id);
    });

    editor.onDidChangeModelContent(() => {
      notifyTimerProgressTouch();
    });

    setMonacoEditor(editor);
  });
}

export function updateEditorLanguage(problem, nextLanguage) {
  const normalized = normalizeExecutionLanguage(nextLanguage);
  if (!EXECUTION_LANGUAGES.includes(normalized)) return;

  saveCurrentEditorCode(problem, getCurrentEditorCode());
  setCurrentLanguage(normalized);

  const template = resolveProblemTemplate(problem, normalized);
  const editor = getMonacoEditor();
  if (editor && window.monaco?.editor) {
    const model = editor.getModel();
    if (!model) return;
    window.monaco.editor.setModelLanguage(model, LANGUAGE_MAP[normalized] || 'javascript');
    editor.setValue(template);
    return;
  }

  const fallback = document.getElementById('fallback-editor');
  if (fallback) fallback.value = template;
}

export function resetEditorToTemplate(problem) {
  if (!problem) return;
  const template = resolveProblemTemplate(problem, getCurrentLanguage());
  setEditorCode(template);
}

export function updateEditorFontSize(size) {
  const parsed = Math.max(12, Number(size) || 14);
  const editor = getMonacoEditor();
  if (editor) {
    editor.updateOptions({ fontSize: parsed, lineHeight: Math.max(20, parsed + 6) });
  }

  const preferences = store.get('preferences') || {};
  preferences.editor = { ...(preferences.editor || {}), fontSize: parsed };
  store.update('preferences', preferences);
}
