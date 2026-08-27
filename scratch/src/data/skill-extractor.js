// ============================================
// SKILL EXTRACTOR — Extract & Categorize Skills
// Pure function: no side effects
// Reuses SKILL_DICTIONARY from interview-registry.js
// ============================================

import { SKILL_DICTIONARY } from './interview-registry.js';

const EMPTY_CATEGORIZED = {
  frontend: [],
  backend: [],
  dsa: [],
  sql: [],
  systemDesign: []
};

// Prefer practical extracted labels for runtime UX.
const SKILL_LABEL_OVERRIDES = {
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react'
};

// Alias-specific category overrides (canonical tags are used otherwise).
const SKILL_CATEGORY_OVERRIDES = {
  node: ['backend']
};

// Only these signals should populate systemDesign.
const SYSTEM_DESIGN_TERMS = [
  'scalability',
  'distributed systems',
  'load balancing',
  'microservices'
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s+#.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSkillLabel(value) {
  const normalized = normalizeText(value);
  return SKILL_LABEL_OVERRIDES[normalized] || normalized;
}

function buildBoundaryRegex(term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return null;

  const escaped = escapeRegex(normalizedTerm).replace(/\s+/g, '\\s+');

  // Word-style terms are matched with strict word boundaries.
  if (/^[a-z0-9\s]+$/i.test(normalizedTerm)) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }

  // Terms with punctuation still use boundary guards.
  return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i');
}

function getFirstMatchIndex(text, term) {
  const regex = buildBoundaryRegex(term);
  if (!regex) return -1;
  const match = regex.exec(text);
  return match && typeof match.index === 'number' ? match.index : -1;
}

function mapTagsToCategories(tags = []) {
  const categories = [];
  if (tags.includes('frontend')) categories.push('frontend');
  if (tags.includes('backend')) categories.push('backend');
  if (tags.includes('dsa') || tags.includes('data-structures') || tags.includes('algorithms')) categories.push('dsa');
  if (tags.includes('sql') || tags.includes('database')) categories.push('sql');
  return categories;
}

function addToCategory(categorized, category, skill) {
  if (!categorized[category].includes(skill)) {
    categorized[category].push(skill);
  }
}

function detectSystemDesignSignals(text) {
  return SYSTEM_DESIGN_TERMS
    .map(term => ({ term, index: getFirstMatchIndex(text, term) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(({ term }) => term);
}

/**
 * Extract skills from cleaned resume text and categorize them.
 * @param {string} cleanedText - Normalized resume text
 * @returns {object} { skills, categorized }
 */
export function extractSkills(cleanedText = '') {
  const text = normalizeText(cleanedText);
  
  if (!text) {
    return {
      skills: [],
      categorized: { ...EMPTY_CATEGORIZED }
    };
  }

  const matchesBySkill = new Map();

  function registerMatch(rawSkill, canonical, index) {
    if (index < 0) return;
    const skill = normalizeSkillLabel(rawSkill);
    const current = matchesBySkill.get(skill);
    if (!current || index < current.index) {
      matchesBySkill.set(skill, { canonical, index });
    }
  }

  // Scan SKILL_DICTIONARY with strict boundary matching.
  for (const [canonical, data] of Object.entries(SKILL_DICTIONARY)) {
    registerMatch(canonical, canonical, getFirstMatchIndex(text, canonical));

    for (const alias of data.aliases || []) {
      const index = getFirstMatchIndex(text, alias);
      if (index >= 0) {
        registerMatch(alias, canonical, index);
      }
    }
  }

  const orderedMatches = Array.from(matchesBySkill.entries())
    .sort((a, b) => a[1].index - b[1].index);

  const skills = orderedMatches.map(([skill]) => skill);
  const categorized = { ...EMPTY_CATEGORIZED };

  for (const [skill, meta] of orderedMatches) {
    const overrideCategories = SKILL_CATEGORY_OVERRIDES[skill];
    if (overrideCategories) {
      overrideCategories.forEach(category => addToCategory(categorized, category, skill));
      continue;
    }

    const tags = SKILL_DICTIONARY[meta.canonical]?.tags || [];
    const mappedCategories = mapTagsToCategories(tags);
    mappedCategories.forEach(category => addToCategory(categorized, category, skill));
  }

  // Explicit-only System Design categorization.
  detectSystemDesignSignals(text).forEach(term => addToCategory(categorized, 'systemDesign', term));

  return {
    skills,
    categorized
  };
}

export default { extractSkills };
