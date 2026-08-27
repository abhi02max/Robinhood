// ============================================
// QUESTION MAPPER — Map Skills to Questions
// State-aware and deterministic recommendation engine
// ============================================

import store from 'store';
import dsaStore from '../store.js';
import sqlStore from './sql-store.js';
import { interviewStore } from './interview-store.js';
// Phase A migration note (Apr 2026): swapped static `allProblems` for the
// hydrated cache. The legacy module-load `PROBLEM_BY_ID = new Map(...)` is
// gone — the cache exposes its own id-keyed lookup so callers fetch directly.
import { getAllProblems, getProblemById as getProblemFromCache } from '../utils/problems-cache.js';
import { SQL_PROBLEMS } from './sql-registry.js';
import { INTERVIEW_QUESTIONS, getQuestionsByTags } from './interview-registry.js';
import { extractSkills } from './skill-extractor.js';
import { parseResume } from './resume-parser.js';

const DEFAULT_WEAK_SCORE_THRESHOLD = 2;
const DEFAULT_STRONG_SCORE_THRESHOLD_MULTIPLIER = 1.5;
const DEFAULT_SKILL_WEIGHT = 1;
const DEFAULT_SOLVED_RELIEF_THRESHOLD = 4;
const DEFAULT_SOLVED_RELIEF_WEIGHT = 1.25;
const DEFAULT_SOLVED_RELIEF_MAX = 4;
const DEFAULT_STRONG_SOLVED_THRESHOLD = 8;
const DEFAULT_RECENT_TOPIC_LOOKBACK_DAYS = 7;
const DEFAULT_REPEATED_ATTEMPT_THRESHOLD = 2;
const DEFAULT_STRUGGLING_ATTEMPT_THRESHOLD = 3;
const DEFAULT_WEAK_MASTERY_ATTEMPT_THRESHOLD = 2;
const DEFAULT_LONG_SOLVE_MINS_THRESHOLD = 45;
const DEFAULT_PATTERN_WEAKNESS_LIMIT = 3;

const CATEGORY_LABELS = {
  frontend: 'Frontend Engineering',
  backend: 'Backend Engineering',
  dsa: 'Data Structures & Algorithms',
  sql: 'SQL & Databases',
  systemDesign: 'System Design'
};

const CATEGORY_TO_SUBCATEGORY = {
  frontend: new Set(['frontend']),
  backend: new Set(['backend']),
  dsa: new Set(['dsa']),
  sql: new Set(['database']),
  systemDesign: new Set(['system-design'])
};

const SKILL_WEIGHTS = {
  node: 2,
  react: 2,
  javascript: 2,
  typescript: 2,
  sql: 2,
  mongodb: 1,
  mysql: 2,
  postgresql: 2,
  postgres: 2,
  python: 2,
  java: 2,
  go: 2,
  rust: 2,
  docker: 1,
  aws: 1,
  kubernetes: 1,
  redis: 1,
  kafka: 1,
  'data structures': 2,
  algorithms: 2,
  scalability: 2,
  'distributed systems': 2,
  'load balancing': 2,
  microservices: 2
};

// `PROBLEM_BY_ID` removed in Phase A (was: `new Map(allProblems.map(...))`).
// Callers use `getProblemFromCache(id)` instead, which always reflects the
// latest hydrated snapshot rather than a frozen module-load copy.
const SQL_PROBLEM_BY_ID = new Map(SQL_PROBLEMS.map(problem => [problem.id, problem]));
const INTERVIEW_BY_ID = new Map(INTERVIEW_QUESTIONS.map(question => [question.id, question]));

function normalizeRole(role = '') {
  return String(role || '').toLowerCase().trim();
}

function getStableKey(item) {
  return String(item?.id || item?.title || item?.name || '');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeRead(readFn, fallback) {
  try {
    const value = readFn();
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function getDateISO(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - Number(daysAgo || 0));
  return date.toISOString().split('T')[0];
}

function getWeakScoreThreshold(options = {}) {
  const fromOptions = Number(
    options.thresholdScore ?? options.weakScoreThreshold ?? options.weakAreaThreshold ?? options.weakThreshold
  );
  if (Number.isFinite(fromOptions) && fromOptions >= 1) {
    return Math.floor(fromOptions);
  }
  return DEFAULT_WEAK_SCORE_THRESHOLD;
}

function getStrongScoreThreshold(weakThreshold) {
  return Math.max(
    weakThreshold + 1,
    Math.ceil(weakThreshold * DEFAULT_STRONG_SCORE_THRESHOLD_MULTIPLIER)
  );
}

function getSolvedReliefThreshold(options = {}) {
  const value = Number(options.solvedReliefThreshold);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_SOLVED_RELIEF_THRESHOLD;
}

function getSolvedReliefWeight(options = {}) {
  const value = Number(options.solvedReliefWeight);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SOLVED_RELIEF_WEIGHT;
}

function getSolvedReliefMax(options = {}) {
  const value = Number(options.solvedReliefMax);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SOLVED_RELIEF_MAX;
}

function getStrongSolvedThreshold(options = {}) {
  const value = Number(options.strongSolvedThreshold);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_STRONG_SOLVED_THRESHOLD;
}

function getRecentTopicLookbackDays(options = {}) {
  const value = Number(options.recentTopicLookbackDays);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_RECENT_TOPIC_LOOKBACK_DAYS;
}

function getRepeatedAttemptThreshold(options = {}) {
  const value = Number(options.repeatedAttemptThreshold);
  return Number.isFinite(value) && value >= 2 ? Math.floor(value) : DEFAULT_REPEATED_ATTEMPT_THRESHOLD;
}

function getStrugglingAttemptThreshold(options = {}) {
  const value = Number(options.strugglingAttemptThreshold);
  return Number.isFinite(value) && value >= 2 ? Math.floor(value) : DEFAULT_STRUGGLING_ATTEMPT_THRESHOLD;
}

function getWeakMasteryAttemptThreshold(options = {}) {
  const value = Number(options.weakMasteryAttemptThreshold);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_WEAK_MASTERY_ATTEMPT_THRESHOLD;
}

function getLongSolveMinsThreshold(options = {}) {
  const value = Number(options.longSolveMinsThreshold);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_LONG_SOLVE_MINS_THRESHOLD;
}

function getPatternWeaknessLimit(options = {}) {
  const value = Number(options.patternWeaknessLimit);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_PATTERN_WEAKNESS_LIMIT;
}

function getSkillWeight(skill) {
  return SKILL_WEIGHTS[String(skill || '').toLowerCase()] ?? DEFAULT_SKILL_WEIGHT;
}

function computeCategoryScores(categorized = {}) {
  return Object.keys(CATEGORY_LABELS).reduce((scores, category) => {
    const skills = categorized[category] || [];
    scores[category] = skills.reduce((total, skill) => total + getSkillWeight(skill), 0);
    return scores;
  }, {});
}

function rankAndSelect(items, scoreSelector, limit) {
  return items
    .map(item => ({ item, score: scoreSelector(item) }))
    .sort((a, b) => b.score - a.score || getStableKey(a.item).localeCompare(getStableKey(b.item)))
    .slice(0, limit)
    .map(({ item }) => item);
}

function toAreaSets(weakAreas = [], strongAreas = []) {
  return {
    weak: new Set(weakAreas),
    strong: new Set(strongAreas)
  };
}

function isWeakArea(areaSets, categoryKey) {
  return areaSets.weak.has(CATEGORY_LABELS[categoryKey]);
}

function isStrongArea(areaSets, categoryKey) {
  return areaSets.strong.has(CATEGORY_LABELS[categoryKey]);
}

function getCategoryKeyForQuestion(question) {
  const subcategory = String(question?.subcategory || '').toLowerCase();
  if (subcategory === 'dsa') return 'dsa';
  if (subcategory === 'database') return 'sql';
  if (subcategory === 'system-design') return 'systemDesign';

  const tags = (question?.tags || []).map(tag => String(tag).toLowerCase());
  if (tags.some(tag => ['frontend', 'javascript', 'react', 'css', 'dom', 'web'].includes(tag))) return 'frontend';
  if ((question?.roles || []).includes('backend')) return 'backend';
  return null;
}

function getCountFromMap(map, key) {
  return Number(map?.get(key) || 0);
}

function incrementMapCount(map, key, increment = 1) {
  map.set(key, getCountFromMap(map, key) + Number(increment || 0));
}

function collectCompletedTopics(learningState = {}) {
  const subjects = safeObject(learningState.subjects);
  const completed = [];
  for (const [subjectId, subjectState] of Object.entries(subjects)) {
    for (const topicId of safeArray(subjectState?.completedTopics)) {
      completed.push(`${subjectId}:${topicId}`);
    }
  }
  return completed;
}

function collectRecentCompletedTopics(learningState = {}, lookbackDays = DEFAULT_RECENT_TOPIC_LOOKBACK_DAYS) {
  const activityByDate = safeObject(learningState.activityByDate);
  const recent = new Set();
  for (let i = 0; i < lookbackDays; i += 1) {
    const dateKey = getDateISO(i);
    const topics = safeArray(activityByDate[dateKey]?.topics);
    topics.forEach(topic => recent.add(String(topic)));
  }
  return Array.from(recent);
}

function mapTopicRefToAreas(topicRef) {
  const normalized = String(topicRef || '').toLowerCase();
  const areas = new Set();

  if (/(algo|dsa|array|tree|graph|dp|hash|two-pointer|sliding|binary-search|recursion)/.test(normalized)) {
    areas.add('dsa');
  }
  if (/(sql|join|query|database|normalization|index|transaction|window)/.test(normalized)) {
    areas.add('sql');
  }
  if (/(distributed|scalability|microservice|load-balanc|system-design|system design|cache|queue|kafka)/.test(normalized)) {
    areas.add('systemDesign');
  }
  if (/(backend|api|server|node|express|microservice|database)/.test(normalized)) {
    areas.add('backend');
  }
  if (/(frontend|react|javascript|typescript|css|html|dom|ui)/.test(normalized)) {
    areas.add('frontend');
  }

  return areas;
}

function buildStoreProgressSnapshot(options = {}) {
  const dsaProgress = safeObject(safeRead(() => dsaStore.get('progress'), {}));
  const solvedProblems = Object.entries(dsaProgress)
    .filter(([, entry]) => entry?.status === 'solved')
    .map(([problemId]) => problemId);

  const dailySystem = safeObject(safeRead(() => dsaStore.getDailySystemState(), {}));
  const dsaAttemptsByProblem = {};
  const dsaFailedSubmissionsByProblem = {};
  const dsaTimeSpentByProblem = {};
  for (const [problemId, perf] of Object.entries(safeObject(dailySystem.performanceByProblem))) {
    const attempts = Number(perf?.attempts || 0);
    if (attempts > 0) dsaAttemptsByProblem[problemId] = attempts;

    const failedSubmissions = safeArray(perf?.history)
      .filter(item => Number(item?.passPct || 0) < 100)
      .length;
    if (failedSubmissions > 0) {
      dsaFailedSubmissionsByProblem[problemId] = failedSubmissions;
    }
  }
  for (const [problemId, entry] of Object.entries(dsaProgress)) {
    const timeSpent = Number(entry?.timeSpent || 0);
    if (timeSpent > 0) {
      dsaTimeSpentByProblem[problemId] = timeSpent;
    }
  }

  const learningState = safeObject(safeRead(() => store.getState(), {}));
  const completedTopics = collectCompletedTopics(learningState);
  const recentCompletedTopics = collectRecentCompletedTopics(
    learningState,
    getRecentTopicLookbackDays(options)
  );

  const sqlProgressMap = safeObject(safeRead(() => sqlStore.state?.problems, {}));
  const sqlSolvedProblems = Object.entries(sqlProgressMap)
    .filter(([, entry]) => entry?.status === 'solved')
    .map(([problemId]) => problemId);
  const sqlAttemptsByProblem = Object.entries(sqlProgressMap).reduce((acc, [problemId, entry]) => {
    const attempts = Number(entry?.attempts || 0);
    if (attempts > 0) acc[problemId] = attempts;
    return acc;
  }, {});
  const sqlFailedSubmissionsByProblem = Object.entries(sqlProgressMap).reduce((acc, [problemId, entry]) => {
    const attempts = Number(entry?.attempts || 0);
    if (attempts <= 0) return acc;
    const solved = entry?.status === 'solved';
    const failedSubmissions = solved ? Math.max(0, attempts - 1) : attempts;
    if (failedSubmissions > 0) acc[problemId] = failedSubmissions;
    return acc;
  }, {});

  const interviewQuestionsState = safeObject(safeRead(() => interviewStore.data?.questions, {}));
  const interviewProgress = Object.entries(interviewQuestionsState).reduce((acc, [questionId, questionState]) => {
    acc[questionId] = {
      status: String(questionState?.status || 'unseen'),
      attempts: safeArray(questionState?.attempts)
    };
    return acc;
  }, {});

  return {
    solvedProblems,
    completedTopics,
    recentCompletedTopics,
    interviewProgress,
    sqlSolvedProblems,
    dsaAttemptsByProblem,
    dsaFailedSubmissionsByProblem,
    dsaTimeSpentByProblem,
    sqlAttemptsByProblem,
    sqlFailedSubmissionsByProblem
  };
}

function hasOwnKey(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function resolveUserProgressSnapshot(options = {}) {
  const base = buildStoreProgressSnapshot(options);
  const override = safeObject(options.userProgress);
  if (Object.keys(override).length === 0) return base;

  return {
    ...base,
    solvedProblems: hasOwnKey(override, 'solvedProblems') ? safeArray(override.solvedProblems) : base.solvedProblems,
    completedTopics: hasOwnKey(override, 'completedTopics') ? safeArray(override.completedTopics) : base.completedTopics,
    recentCompletedTopics: hasOwnKey(override, 'recentCompletedTopics')
      ? safeArray(override.recentCompletedTopics)
      : base.recentCompletedTopics,
    interviewProgress: hasOwnKey(override, 'interviewProgress')
      ? safeObject(override.interviewProgress)
      : base.interviewProgress,
    sqlSolvedProblems: hasOwnKey(override, 'sqlSolvedProblems')
      ? safeArray(override.sqlSolvedProblems)
      : base.sqlSolvedProblems,
    dsaAttemptsByProblem: hasOwnKey(override, 'dsaAttemptsByProblem')
      ? safeObject(override.dsaAttemptsByProblem)
      : base.dsaAttemptsByProblem,
    dsaFailedSubmissionsByProblem: hasOwnKey(override, 'dsaFailedSubmissionsByProblem')
      ? safeObject(override.dsaFailedSubmissionsByProblem)
      : base.dsaFailedSubmissionsByProblem,
    dsaTimeSpentByProblem: hasOwnKey(override, 'dsaTimeSpentByProblem')
      ? safeObject(override.dsaTimeSpentByProblem)
      : base.dsaTimeSpentByProblem,
    sqlAttemptsByProblem: hasOwnKey(override, 'sqlAttemptsByProblem')
      ? safeObject(override.sqlAttemptsByProblem)
      : base.sqlAttemptsByProblem,
    sqlFailedSubmissionsByProblem: hasOwnKey(override, 'sqlFailedSubmissionsByProblem')
      ? safeObject(override.sqlFailedSubmissionsByProblem)
      : base.sqlFailedSubmissionsByProblem
  };
}

function getEmptyFailureMetrics() {
  return {
    attempts: 0,
    failedSubmissions: 0,
    struggling: 0,
    weakMastery: 0,
    longSolve: 0
  };
}

function finalizePatternWeakness(patternScoreMap, options = {}) {
  const limit = getPatternWeaknessLimit(options);
  return Array.from(patternScoreMap.entries())
    .filter(([, score]) => Number(score) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([pattern]) => pattern);
}

function buildProgressSignals(progressSnapshot, options = {}) {
  const repeatedThreshold = getRepeatedAttemptThreshold(options);
  const strugglingThreshold = getStrugglingAttemptThreshold(options);
  const weakMasteryThreshold = getWeakMasteryAttemptThreshold(options);
  const longSolveMinsThreshold = getLongSolveMinsThreshold(options);

  const solvedSets = {
    dsa: new Set(safeArray(progressSnapshot.solvedProblems)),
    sql: new Set(safeArray(progressSnapshot.sqlSolvedProblems))
  };

  const solvedByArea = {
    frontend: 0,
    backend: 0,
    dsa: solvedSets.dsa.size,
    sql: solvedSets.sql.size,
    systemDesign: 0
  };

  const interviewByArea = {
    frontend: 0,
    backend: 0,
    dsa: 0,
    sql: 0,
    systemDesign: 0
  };

  const attemptsByArea = {
    frontend: 0,
    backend: 0,
    dsa: 0,
    sql: 0,
    systemDesign: 0
  };

  const failureByArea = {
    frontend: getEmptyFailureMetrics(),
    backend: getEmptyFailureMetrics(),
    dsa: getEmptyFailureMetrics(),
    sql: getEmptyFailureMetrics(),
    systemDesign: getEmptyFailureMetrics()
  };

  const patternScores = {
    dsa: new Map(),
    sql: new Map()
  };

  for (const [questionId, state] of Object.entries(safeObject(progressSnapshot.interviewProgress))) {
    const status = String(state?.status || 'unseen');
    const attempts = safeArray(state?.attempts).length;
    const question = INTERVIEW_BY_ID.get(questionId);
    const categoryKey = getCategoryKeyForQuestion(question);
    if (!categoryKey || !hasOwnKey(interviewByArea, categoryKey)) continue;

    if (status === 'practiced' || status === 'mastered') {
      interviewByArea[categoryKey] += 1;
      solvedByArea[categoryKey] += status === 'mastered' ? 1 : 0;
    }
    if (attempts > 0) {
      attemptsByArea[categoryKey] += attempts;
    }
  }

  const improvingAreas = new Set();
  for (const topicRef of safeArray(progressSnapshot.recentCompletedTopics)) {
    mapTopicRefToAreas(topicRef).forEach(area => improvingAreas.add(area));
  }

  const repeated = {
    dsaCategories: new Map(),
    sqlTopics: new Map(),
    interviewSubcategories: new Map()
  };

  for (const [problemId, attemptsRaw] of Object.entries(safeObject(progressSnapshot.dsaAttemptsByProblem))) {
    const attempts = Number(attemptsRaw || 0);
    if (attempts <= 0) continue;
    attemptsByArea.dsa += attempts;
    failureByArea.dsa.attempts += attempts;

    const problem = getProblemFromCache(problemId);
    if (!problem) continue;

    const solved = solvedSets.dsa.has(problemId);
    const failedSubmissions = Number(
      safeObject(progressSnapshot.dsaFailedSubmissionsByProblem)[problemId]
      ?? (solved ? Math.max(0, attempts - 1) : attempts)
    );
    const timeSpentMins = Number(safeObject(progressSnapshot.dsaTimeSpentByProblem)[problemId] || 0);

    if (attempts >= repeatedThreshold) {
      incrementMapCount(repeated.dsaCategories, problem.category, 1);
    }

    failureByArea.dsa.failedSubmissions += Math.max(0, failedSubmissions);
    if (!solved && attempts > strugglingThreshold) {
      failureByArea.dsa.struggling += 1;
      incrementMapCount(patternScores.dsa, problem.category, 3);
    }
    if (solved && attempts > weakMasteryThreshold) {
      failureByArea.dsa.weakMastery += 1;
      incrementMapCount(patternScores.dsa, problem.category, 2);
    }
    if (timeSpentMins > longSolveMinsThreshold) {
      failureByArea.dsa.longSolve += 1;
      incrementMapCount(patternScores.dsa, problem.category, 1);
    }
  }

  for (const [problemId, attemptsRaw] of Object.entries(safeObject(progressSnapshot.sqlAttemptsByProblem))) {
    const attempts = Number(attemptsRaw || 0);
    if (attempts <= 0) continue;
    attemptsByArea.sql += attempts;
    attemptsByArea.backend += attempts;
    failureByArea.sql.attempts += attempts;
    failureByArea.backend.attempts += attempts;

    const problem = SQL_PROBLEM_BY_ID.get(problemId);
    if (!problem) continue;

    const solved = solvedSets.sql.has(problemId);
    const failedSubmissions = Number(
      safeObject(progressSnapshot.sqlFailedSubmissionsByProblem)[problemId]
      ?? (solved ? Math.max(0, attempts - 1) : attempts)
    );

    if (attempts >= repeatedThreshold) {
      incrementMapCount(repeated.sqlTopics, problem.topicId, 1);
    }

    failureByArea.sql.failedSubmissions += Math.max(0, failedSubmissions);
    failureByArea.backend.failedSubmissions += Math.max(0, failedSubmissions);
    if (!solved && attempts > strugglingThreshold) {
      failureByArea.sql.struggling += 1;
      failureByArea.backend.struggling += 1;
      incrementMapCount(patternScores.sql, problem.topicId, 3);
    }
    if (solved && attempts > weakMasteryThreshold) {
      failureByArea.sql.weakMastery += 1;
      failureByArea.backend.weakMastery += 1;
      incrementMapCount(patternScores.sql, problem.topicId, 2);
    }
  }

  for (const [questionId, state] of Object.entries(safeObject(progressSnapshot.interviewProgress))) {
    const attempts = safeArray(state?.attempts).length;
    if (attempts < repeatedThreshold) continue;
    const question = INTERVIEW_BY_ID.get(questionId);
    if (!question?.subcategory) continue;
    incrementMapCount(repeated.interviewSubcategories, question.subcategory, 1);
  }

  const patternWeakness = {
    dsa: finalizePatternWeakness(patternScores.dsa, options),
    sql: finalizePatternWeakness(patternScores.sql, options)
  };

  return {
    solvedSets,
    solvedByArea,
    interviewByArea,
    attemptsByArea,
    improvingAreas,
    repeated,
    patternWeakness,
    failureByArea,
    interviewProgress: safeObject(progressSnapshot.interviewProgress)
  };
}

function computeProgressBonus(areaKey, progressSignals, options = {}) {
  const solvedCount = Number(progressSignals.solvedByArea[areaKey] || 0);
  const interviewCount = Number(progressSignals.interviewByArea[areaKey] || 0);
  const solvedReliefThreshold = getSolvedReliefThreshold(options);
  const solvedReliefWeight = getSolvedReliefWeight(options);
  const solvedReliefMax = getSolvedReliefMax(options);

  let bonus = 0;
  if (solvedCount > solvedReliefThreshold) {
    bonus += Math.min(
      solvedReliefMax,
      (solvedCount - solvedReliefThreshold + 1) * solvedReliefWeight
    );
  }
  if (interviewCount > 0) {
    bonus += Math.min(2, interviewCount * 0.5);
  }

  // Backend proficiency can come from SQL execution consistency.
  if (areaKey === 'backend') {
    const sqlSolved = Number(progressSignals.solvedByArea.sql || 0);
    if (sqlSolved > 0) {
      bonus += Math.min(1.5, sqlSolved * 0.25);
    }
  }

  if (progressSignals.improvingAreas.has(areaKey)) {
    bonus += 0.5;
  }

  return bonus;
}

function computeFailurePressure(metrics = {}) {
  const struggling = Number(metrics.struggling || 0);
  const weakMastery = Number(metrics.weakMastery || 0);
  const failedSubmissions = Number(metrics.failedSubmissions || 0);
  const longSolve = Number(metrics.longSolve || 0);
  return (struggling * 3) + (weakMastery * 2) + Math.min(4, failedSubmissions * 0.5) + longSolve;
}

function deriveProgressState(baseCategoryScores, progressSignals, thresholdScore, strongThreshold, options = {}) {
  const adjustedScores = {};
  const progressState = {};
  const strongSolvedThreshold = getStrongSolvedThreshold(options);

  for (const categoryKey of Object.keys(CATEGORY_LABELS)) {
    const baseScore = Number(baseCategoryScores[categoryKey] || 0);
    let adjustedScore = baseScore + computeProgressBonus(categoryKey, progressSignals, options);

    // Recently completed topic means active improvement and should not remain weak.
    if (progressSignals.improvingAreas.has(categoryKey)) {
      adjustedScore = Math.max(adjustedScore, thresholdScore);
    }

    const solvedCount = Number(progressSignals.solvedByArea[categoryKey] || 0);
    const interviewCount = Number(progressSignals.interviewByArea[categoryKey] || 0);
    const attempts = Number(progressSignals.attemptsByArea[categoryKey] || 0);
    const failureMetrics = safeObject(progressSignals.failureByArea?.[categoryKey]);
    const failurePressure = computeFailurePressure(failureMetrics);
    const hasExposure = solvedCount > 0 || interviewCount > 0 || attempts > 0;

    adjustedScores[categoryKey] = Math.round(adjustedScore * 100) / 100;

    if (!hasExposure && adjustedScore < thresholdScore) {
      progressState[categoryKey] = 'weak';
    } else if (failurePressure >= 2) {
      progressState[categoryKey] = 'fragile';
    } else if (
      adjustedScore >= strongThreshold
      || (solvedCount >= strongSolvedThreshold && failurePressure === 0)
    ) {
      progressState[categoryKey] = 'strong';
    } else if (
      adjustedScore >= thresholdScore
      || progressSignals.improvingAreas.has(categoryKey)
      || solvedCount > 0
      || interviewCount > 0
      || attempts > 0
    ) {
      progressState[categoryKey] = 'improving';
    } else {
      progressState[categoryKey] = 'weak';
    }
  }

  const weakAreas = Object.entries(progressState)
    .filter(([, state]) => state === 'weak')
    .map(([categoryKey]) => CATEGORY_LABELS[categoryKey]);

  const strongAreas = Object.entries(progressState)
    .filter(([, state]) => state === 'strong')
    .map(([categoryKey]) => CATEGORY_LABELS[categoryKey]);

  return { adjustedScores, progressState, weakAreas, strongAreas };
}

function prioritizeWeakCoverage(scored, limit, weakBoostKeys = [], diversityKeySelector = null) {
  const sorted = scored
    .slice()
    .sort((a, b) => b.score - a.score || getStableKey(a.item).localeCompare(getStableKey(b.item)));

  const picked = [];
  const pickedIds = new Set();
  const pickedDiversityKeys = new Set();

  function tryPick(entry) {
    const id = getStableKey(entry.item);
    if (pickedIds.has(id)) return false;
    if (diversityKeySelector) {
      const diversityKey = diversityKeySelector(entry.item);
      if (pickedDiversityKeys.has(diversityKey)) return false;
      pickedDiversityKeys.add(diversityKey);
    }
    pickedIds.add(id);
    picked.push(entry.item);
    return true;
  }

  for (const key of weakBoostKeys) {
    if (picked.length >= limit) break;
    const candidate = sorted.find(entry => entry.areaKey === key && !pickedIds.has(getStableKey(entry.item)));
    if (candidate) tryPick(candidate);
  }

  for (const entry of sorted) {
    if (picked.length >= limit) break;
    tryPick(entry);
  }

  return picked.slice(0, limit);
}

function prioritizePatternMix(scored, limit, weakPatternSet, patternSelector) {
  const sorted = scored
    .slice()
    .sort((a, b) => b.score - a.score || getStableKey(a.item).localeCompare(getStableKey(b.item)));

  if (!weakPatternSet || weakPatternSet.size === 0) {
    return sorted.slice(0, limit).map(entry => entry.item);
  }

  const picked = [];
  const pickedIds = new Set();

  function pickFirst(predicate) {
    const candidate = sorted.find(entry => !pickedIds.has(getStableKey(entry.item)) && predicate(entry.item));
    if (!candidate) return;
    picked.push(candidate.item);
    pickedIds.add(getStableKey(candidate.item));
  }

  pickFirst(item => weakPatternSet.has(patternSelector(item)) && item.difficulty === 'Easy');
  pickFirst(item => weakPatternSet.has(patternSelector(item)) && item.difficulty === 'Medium');

  for (const entry of sorted) {
    if (picked.length >= limit) break;
    const id = getStableKey(entry.item);
    if (pickedIds.has(id)) continue;
    picked.push(entry.item);
    pickedIds.add(id);
  }

  return picked.slice(0, limit);
}

function mapToDsaProblems(dsaSkills = [], role = '', areaSets = toAreaSets(), progressSignals = {}, progressState = {}) {
  const normalizedRole = normalizeRole(role);
  const skillText = dsaSkills.join(' ').toLowerCase();
  const hasDsaSkills = dsaSkills.length > 0;
  const dsaSolvedSet = progressSignals.solvedSets?.dsa || new Set();
  const repeatedDsaCategories = progressSignals.repeated?.dsaCategories || new Map();
  const weakPatternSet = new Set(safeArray(progressSignals.patternWeakness?.dsa));

  const weakDsa = isWeakArea(areaSets, 'dsa');
  const strongDsa = isStrongArea(areaSets, 'dsa');
  const improvingDsa = progressState.dsa === 'improving';
  const fragileDsa = progressState.dsa === 'fragile';

  const scored = getAllProblems()
    .map(problem => {
      let score = 0;

      if (dsaSolvedSet.has(problem.id)) {
        return { item: problem, score: -999, areaKey: 'dsa' };
      }

      if (problem.difficulty === 'Easy') score += 2;
      if (problem.difficulty === 'Medium') score += 1;
      if (problem.frequency >= 4) score += 2;
      if (problem.frequency >= 3 && problem.frequency < 4) score += 1;

      if (!hasDsaSkills && ['arrays', 'two-pointers', 'sliding-window'].includes(problem.category)) {
        score += 3;
      }

      if (hasDsaSkills && (skillText.includes('array') || skillText.includes('hash')) && problem.category === 'arrays') {
        score += 3;
      }
      if (hasDsaSkills && (skillText.includes('pointer') || skillText.includes('sliding')) && ['two-pointers', 'sliding-window'].includes(problem.category)) {
        score += 3;
      }
      if (hasDsaSkills && (skillText.includes('graph') || skillText.includes('tree')) && ['graphs', 'trees'].includes(problem.category)) {
        score += 2;
      }

      const repeatedCount = getCountFromMap(repeatedDsaCategories, problem.category);
      if (repeatedCount > 0) {
        score += 2 + repeatedCount;
      }
      if (weakPatternSet.has(problem.category)) {
        score += 7;
        if (problem.difficulty === 'Easy' || problem.difficulty === 'Medium') {
          score += 2;
        }
      }

      if (weakDsa) {
        score += 5;
        if (['arrays', 'two-pointers', 'sliding-window'].includes(problem.category)) {
          score += 3;
        }
      }

      if (improvingDsa && problem.difficulty === 'Medium') {
        score += 2;
      }
      if (fragileDsa && (problem.difficulty === 'Easy' || problem.difficulty === 'Medium')) {
        score += 3;
      }

      if (strongDsa && ['arrays', 'two-pointers', 'sliding-window'].includes(problem.category)) {
        score -= 2;
      }
      if (strongDsa && problem.difficulty === 'Easy') {
        score -= 2;
      }

      if (normalizedRole === 'frontend') {
        score += 2;
      }

      return { item: problem, score, areaKey: 'dsa' };
    })
    .filter(({ score }) => score > 0);

  if (weakPatternSet.size > 0 || fragileDsa) {
    return prioritizePatternMix(scored, 3, weakPatternSet, problem => problem.category);
  }

  const diversity = strongDsa ? problem => problem.category : null;
  return prioritizeWeakCoverage(scored, 3, weakDsa ? ['dsa'] : [], diversity);
}

function mapToSqlProblems(sqlSkills = [], role = '', areaSets = toAreaSets(), progressSignals = {}, progressState = {}) {
  const normalizedRole = normalizeRole(role);
  const hasSqlSkills = sqlSkills.length > 0;
  const sqlSolvedSet = progressSignals.solvedSets?.sql || new Set();
  const repeatedSqlTopics = progressSignals.repeated?.sqlTopics || new Map();
  const weakPatternSet = new Set(safeArray(progressSignals.patternWeakness?.sql));

  const weakSql = isWeakArea(areaSets, 'sql');
  const strongSql = isStrongArea(areaSets, 'sql');
  const improvingSql = progressState.sql === 'improving';
  const fragileSql = progressState.sql === 'fragile';

  const scored = SQL_PROBLEMS.map(problem => {
    let score = 0;

    if (sqlSolvedSet.has(problem.id)) {
      return { item: problem, score: -999, areaKey: 'sql' };
    }

    if (problem.difficulty === 'Easy') score += 2;
    if (problem.difficulty === 'Medium') score += 1;
    score += Math.max(0, 5 - Number(problem.tier || 5));

    if (problem.topicId === 'basics') score += 2;
    if (problem.topicId === 'joins') score += 2;
    if (problem.topicId === 'aggregation') score += 1;

    if (hasSqlSkills) score += 2;

    if (normalizedRole === 'backend') {
      score += 4;
      if (['joins', 'subqueries', 'window-functions', 'advanced'].includes(problem.topicId)) {
        score += 2;
      }
    }

    const repeatedCount = getCountFromMap(repeatedSqlTopics, problem.topicId);
    if (repeatedCount > 0) {
      score += 2 + repeatedCount;
    }
    if (weakPatternSet.has(problem.topicId)) {
      score += 7;
      if (problem.difficulty === 'Easy' || problem.difficulty === 'Medium') {
        score += 2;
      }
    }

    if (weakSql) {
      score += 5;
      if (['basics', 'joins', 'aggregation'].includes(problem.topicId)) {
        score += 2;
      }
    }

    if (improvingSql && problem.difficulty === 'Medium') {
      score += 2;
    }
    if (fragileSql && (problem.difficulty === 'Easy' || problem.difficulty === 'Medium')) {
      score += 3;
    }

    if (strongSql) {
      if (problem.topicId === 'basics') score -= 2;
      if (problem.difficulty === 'Easy') score -= 2;
    }

    return { item: problem, score, areaKey: 'sql' };
  }).filter(({ score }) => score > 0);

  if (weakPatternSet.size > 0 || fragileSql) {
    return prioritizePatternMix(scored, 3, weakPatternSet, problem => problem.topicId);
  }

  const diversity = strongSql ? problem => problem.topicId : null;
  return prioritizeWeakCoverage(scored, 3, weakSql ? ['sql'] : [], diversity);
}

function scoreInterviewQuestion(question, allExtractedSkills, categorized, role, areaSets, progressSignals, progressState, options = {}) {
  let score = 0;
  const normalizedRole = normalizeRole(role);
  const skillSet = new Set((allExtractedSkills || []).map(skill => String(skill).toLowerCase()));
  const tags = (question.tags || []).map(tag => String(tag).toLowerCase());
  const categoryKey = getCategoryKeyForQuestion(question);
  const categoryState = categoryKey ? progressState[categoryKey] : null;

  for (const tag of tags) {
    if (skillSet.has(tag)) score += 3;
  }

  if (question.difficulty === 'Easy') score += 2;
  if (question.difficulty === 'Medium') score += 1;

  if (normalizedRole === 'backend') {
    if ((question.roles || []).includes('backend')) score += 4;
    if (question.subcategory === 'database' || question.subcategory === 'system-design') score += 4;
    if (tags.some(tag => ['sql', 'database', 'system-design', 'architecture', 'microservices', 'distributed-systems'].includes(tag))) {
      score += 3;
    }
  }

  if (normalizedRole === 'frontend') {
    if ((question.roles || []).includes('frontend')) score += 8;
    if (question.subcategory === 'dsa') score += 8;
    if (tags.some(tag => ['frontend', 'javascript', 'react', 'css', 'dom', 'web'].includes(tag))) {
      score += 6;
    }
    if (question.subcategory === 'database' || question.subcategory === 'system-design') score -= 2;
  }

  if ((categorized.systemDesign?.length || 0) > 0 && question.subcategory === 'system-design') score += 1;
  if ((categorized.sql?.length || 0) > 0 && question.subcategory === 'database') score += 1;
  if ((categorized.frontend?.length || 0) > 0 && tags.some(tag => ['frontend', 'javascript', 'react'].includes(tag))) score += 1;
  if ((categorized.dsa?.length || 0) > 0 && question.subcategory === 'dsa') score += 1;

  const repeatedBySubcategory = progressSignals.repeated?.interviewSubcategories || new Map();
  const repeatedCount = getCountFromMap(repeatedBySubcategory, question.subcategory);
  if (repeatedCount > 0) {
    score += 2 + repeatedCount;
  }

  const interviewEntry = safeObject(progressSignals.interviewProgress?.[question.id]);
  const interviewStatus = String(interviewEntry.status || 'unseen');
  const attempts = safeArray(interviewEntry.attempts).length;
  if (interviewStatus === 'mastered') {
    score -= 12;
  } else if (interviewStatus === 'practiced') {
    score -= 4;
  }
  if (attempts >= getRepeatedAttemptThreshold(options)) {
    score += Math.min(4, attempts);
  }

  if (isWeakArea(areaSets, 'dsa') && question.subcategory === 'dsa') score += 10;
  if (isWeakArea(areaSets, 'sql') && question.subcategory === 'database') score += 8;
  if (isWeakArea(areaSets, 'systemDesign') && question.subcategory === 'system-design') score += 8;
  if (isWeakArea(areaSets, 'backend') && (question.roles || []).includes('backend')) score += 5;
  if (isWeakArea(areaSets, 'frontend') && tags.some(tag => ['frontend', 'javascript', 'react', 'css', 'dom', 'web'].includes(tag))) score += 5;

  if (isStrongArea(areaSets, 'dsa') && question.subcategory === 'dsa') score -= 3;
  if (isStrongArea(areaSets, 'sql') && question.subcategory === 'database') score -= 4;
  if (isStrongArea(areaSets, 'systemDesign') && question.subcategory === 'system-design') score -= 3;
  if (isStrongArea(areaSets, 'backend') && (question.roles || []).includes('backend')) score -= 2;
  if (isStrongArea(areaSets, 'frontend') && tags.some(tag => ['frontend', 'javascript', 'react', 'css', 'dom', 'web'].includes(tag))) score -= 2;

  if (categoryState === 'improving' && question.difficulty === 'Medium') score += 2;
  if (categoryState === 'fragile' && (question.difficulty === 'Easy' || question.difficulty === 'Medium')) score += 3;
  if (categoryState === 'strong' && question.difficulty === 'Easy') score -= 2;

  return score;
}

function mapToInterviewQuestions(
  allExtractedSkills = [],
  categorized = {},
  role = '',
  areaSets = toAreaSets(),
  progressSignals = {},
  progressState = {},
  options = {}
) {
  const normalizedRole = normalizeRole(role);

  let candidatePool = allExtractedSkills.length > 0
    ? getQuestionsByTags(allExtractedSkills)
    : INTERVIEW_QUESTIONS.filter(question => question.category === 'technical');

  if (normalizedRole === 'backend') {
    const roleRelevant = INTERVIEW_QUESTIONS.filter(
      question => (question.roles || []).includes('backend') || question.subcategory === 'database' || question.subcategory === 'system-design'
    );
    candidatePool = [...candidatePool, ...roleRelevant];
  }

  if (normalizedRole === 'frontend') {
    const roleRelevant = INTERVIEW_QUESTIONS.filter(
      question => (question.roles || []).includes('frontend') || question.subcategory === 'dsa'
    );
    candidatePool = [...candidatePool, ...roleRelevant];
  }

  for (const [categoryKey, label] of Object.entries(CATEGORY_LABELS)) {
    if (!areaSets.weak.has(label)) continue;
    const subcategories = CATEGORY_TO_SUBCATEGORY[categoryKey] || new Set();
    const weakRelevant = INTERVIEW_QUESTIONS.filter(question => subcategories.has(question.subcategory));
    candidatePool = [...candidatePool, ...weakRelevant];
  }

  if (candidatePool.length === 0) {
    candidatePool = INTERVIEW_QUESTIONS;
  }

  const uniquePool = [];
  const seen = new Set();
  for (const question of candidatePool) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    uniquePool.push(question);
  }

  const scored = uniquePool
    .map(question => ({
      item: question,
      score: scoreInterviewQuestion(
        question,
        allExtractedSkills,
        categorized,
        role,
        areaSets,
        progressSignals,
        progressState,
        options
      ),
      areaKey: getCategoryKeyForQuestion(question)
    }))
    .filter(({ score }) => score > 0);

  const weakBoostKeys = Object.entries(CATEGORY_LABELS)
    .filter(([, label]) => areaSets.weak.has(label))
    .map(([key]) => key);

  const useDiversity = areaSets.strong.size > 0;
  return prioritizeWeakCoverage(
    scored,
    5,
    weakBoostKeys,
    useDiversity ? question => question.subcategory : null
  );
}

export function mapResumeToQuestions(resumeText = '', options = {}) {
  const role = normalizeRole(options.role);
  const thresholdScore = getWeakScoreThreshold(options);
  const strongThresholdScore = getStrongScoreThreshold(thresholdScore);

  const parsed = parseResume(resumeText);
  const allText = [
    parsed.cleanedText,
    parsed.sections.skills.join(' '),
    parsed.sections.projects.join(' ')
  ].join(' ');

  const extracted = extractSkills(allText);
  const baseCategoryScores = computeCategoryScores(extracted.categorized);
  const progressSnapshot = resolveUserProgressSnapshot(options);
  const progressSignals = buildProgressSignals(progressSnapshot, options);
  const progressComputed = deriveProgressState(
    baseCategoryScores,
    progressSignals,
    thresholdScore,
    strongThresholdScore,
    options
  );

  const areaSets = toAreaSets(progressComputed.weakAreas, progressComputed.strongAreas);

  const recommendations = {
    dsa: mapToDsaProblems(
      extracted.categorized.dsa,
      role,
      areaSets,
      progressSignals,
      progressComputed.progressState
    ),
    sql: mapToSqlProblems(
      extracted.categorized.sql,
      role,
      areaSets,
      progressSignals,
      progressComputed.progressState
    ),
    interview: mapToInterviewQuestions(
      extracted.skills,
      extracted.categorized,
      role,
      areaSets,
      progressSignals,
      progressComputed.progressState,
      options
    )
  };

  return {
    skills: extracted.skills,
    categorized: extracted.categorized,
    weakAreas: progressComputed.weakAreas,
    progressState: progressComputed.progressState,
    patternWeakness: progressSignals.patternWeakness,
    recommendations
  };
}

// ============================================
// TEST BLOCK
// ============================================

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const sampleResume = 'React Node SQL MongoDB JavaScript';
  const freshUserProgress = {
    solvedProblems: [],
    sqlSolvedProblems: [],
    completedTopics: [],
    recentCompletedTopics: [],
    interviewProgress: {},
    dsaAttemptsByProblem: {},
    dsaFailedSubmissionsByProblem: {},
    dsaTimeSpentByProblem: {},
    sqlAttemptsByProblem: {}
  };

  // Topic match: legacy used `problem.category` (flat string). Cache rows
  // expose `problem.topic.slug` with DB-canonical names
  // (e.g. `sliding-window-two-pointers` rather than two separate slugs). We
  // accept either spelling so the seed picker keeps working through the
  // taxonomy migration.
  const fragileSeedTopics = new Set(['sliding-window', 'two-pointers', 'sliding-window-two-pointers']);
  const _allProblemsRef = getAllProblems();
  const fragileSeedProblem = _allProblemsRef.find(
    problem => fragileSeedTopics.has(problem?.topic?.slug || problem?.category)
  ) || _allProblemsRef[0] || null;

  if (!fragileSeedProblem) {
    console.log('\n[FAILURE-INTELLIGENCE PIPELINE TEST] Skipped — problem cache is empty.\n');
  }

  const fragileDsaProgress = fragileSeedProblem ? {
    ...freshUserProgress,
    dsaAttemptsByProblem: { [fragileSeedProblem.id]: 5 },
    dsaFailedSubmissionsByProblem: { [fragileSeedProblem.id]: 3 },
    dsaTimeSpentByProblem: { [fragileSeedProblem.id]: 72 }
  } : freshUserProgress;

  const case1 = mapResumeToQuestions(sampleResume, {
    role: 'backend',
    thresholdScore: 2,
    userProgress: freshUserProgress
  });
  const case2 = mapResumeToQuestions(sampleResume, {
    role: 'backend',
    thresholdScore: 2,
    userProgress: fragileDsaProgress
  });

  const deterministicCheck = JSON.stringify(
    mapResumeToQuestions(sampleResume, {
      role: 'backend',
      thresholdScore: 2,
      userProgress: fragileDsaProgress
    })
  ) === JSON.stringify(case2);

  const patternAligned = case2.recommendations.dsa.some(
    problem => safeArray(case2.patternWeakness?.dsa).includes(problem.category)
  );

  console.log('\n[FAILURE-INTELLIGENCE PIPELINE TEST] Question Mapper');
  console.log('Sample Resume:', sampleResume);
  console.log('---');
  console.log('Case 1 (fresh user):');
  console.log('  Weak Areas:', case1.weakAreas);
  console.log('  Progress State:', case1.progressState);
  console.log('  Pattern Weakness:', case1.patternWeakness);
  console.log('  DSA Recs:', case1.recommendations.dsa.map(problem => problem.title));
  console.log('  SQL Recs:', case1.recommendations.sql.map(problem => problem.title));
  console.log('  Interview Recs:', case1.recommendations.interview.map(question => `${question.subcategory}: ${question.title}`));
  console.log('---');
  console.log('Case 2 (DSA attempts=5, failed submissions=3):');
  console.log('  Weak Areas:', case2.weakAreas);
  console.log('  Progress State:', case2.progressState);
  console.log('  Pattern Weakness:', case2.patternWeakness);
  console.log('  DSA Recs:', case2.recommendations.dsa.map(problem => problem.title));
  console.log('  SQL Recs:', case2.recommendations.sql.map(problem => problem.title));
  console.log('  Interview Recs:', case2.recommendations.interview.map(question => `${question.subcategory}: ${question.title}`));
  console.log('Checks:');
  console.log('  DSA marked fragile:', case2.progressState.dsa === 'fragile');
  console.log('  DSA not treated as strong:', case2.progressState.dsa !== 'strong');
  console.log('  Pattern weakness used in recommendations:', patternAligned);
  console.log('  Deterministic output:', deterministicCheck);
  console.log('\n✔ Failure-intelligence pipeline test complete\n');
}

export default { mapResumeToQuestions };
