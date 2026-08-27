import { problemSignatures, getTemplate, generateFallbackSignature } from '../../data/problem-signatures.js';

const LANGUAGE_ALIASES = {
  js: 'javascript',
  py: 'python',
  'c++': 'cpp',
  'c#': 'csharp',
};

export const EXECUTION_LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'c', 'csharp'];

export function normalizeExecutionLanguage(language) {
  const key = String(language || '').toLowerCase();
  return LANGUAGE_ALIASES[key] || key;
}

function titleToFunctionBase(title = '') {
  const parts = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'solveProblem';
  return parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
}

function toPascalCase(value = '') {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function buildProblemSignatures(problem) {
  const curated = problemSignatures[problem?.id];
  const title = problem?.title || 'Solve Problem';
  const category = problem?.category || '';

  return {
    javascript: curated?.signatures?.javascript || generateFallbackSignature(title, 'javascript', category),
    python: curated?.signatures?.python || generateFallbackSignature(title, 'python', category),
    cpp: curated?.signatures?.cpp || generateFallbackSignature(title, 'cpp', category),
    java: curated?.signatures?.java || generateFallbackSignature(title, 'java', category),
    c: curated?.signatures?.c || `int ${titleToFunctionBase(title)}(int* input, int inputSize)`,
    csharp: curated?.signatures?.csharp || generateFallbackSignature(title, 'csharp', category),
  };
}

function buildFallbackTemplate(problem, language, signatures) {
  const title = problem?.title || 'this problem';
  const normalizedLanguage = normalizeExecutionLanguage(language);

  if (normalizedLanguage === 'javascript') {
    return `${signatures.javascript} {\n  // TODO: implement ${title}\n}\n`;
  }

  if (normalizedLanguage === 'python') {
    const sig = String(signatures.python || `def ${titleToFunctionBase(title)}(self, input):`).trim();
    const pythonSig = sig.startsWith('def ') ? sig : `def ${titleToFunctionBase(title)}(self, input):`;
    return `class Solution:\n    ${pythonSig}\n        # TODO: implement ${title}\n        pass\n`;
  }

  if (normalizedLanguage === 'cpp') {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${signatures.cpp} {\n        // TODO: implement ${title}\n    }\n};\n`;
  }

  if (normalizedLanguage === 'java') {
    return `import java.util.*;\n\nclass Solution {\n    ${signatures.java} {\n        // TODO: implement ${title}\n    }\n}\n`;
  }

  if (normalizedLanguage === 'csharp') {
    const fallback = signatures.csharp || `public int ${toPascalCase(titleToFunctionBase(title))}(int[] input)`;
    return `using System;\n\npublic class Solution {\n    ${fallback} {\n        // TODO: implement ${title}\n    }\n}\n`;
  }

  return `${signatures.c} {\n    // TODO: implement ${title}\n}\n`;
}

export function resolveProblemTemplate(problem, language) {
  if (!problem) return '';

  const normalizedLanguage = normalizeExecutionLanguage(language);
  const curated = getTemplate(problem.id, normalizedLanguage);
  if (typeof curated === 'string' && curated.trim().length > 0) {
    return curated;
  }

  const signatures = buildProblemSignatures(problem);
  return buildFallbackTemplate(problem, normalizedLanguage, signatures);
}
