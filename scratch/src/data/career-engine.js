import store from '../store.js';
import { learningStore } from 'store';
import sqlStore from './sql-store.js';
import { interviewStore } from './interview-store.js';

import { getAllProblems, getProblemById as getProblemFromCache } from '../utils/problems-cache.js';
import { LEARNING_SUBJECT_LIST, LEARNING_SUBJECTS } from './learning-content.js';
import { SQL_PROBLEMS } from './sql-registry.js';
import { INTERVIEW_QUESTIONS } from './interview-registry.js';
import { mapResumeToQuestions } from './question-mapper.js';

const CAREER_STORAGE_KEY = 'robinhood_career_v1';

const CATEGORY_LABELS = {
  dsa: 'Data Structures & Algorithms',
  sql: 'SQL & Databases',
  backend: 'Backend Engineering',
  frontend: 'Frontend Engineering',
  systemDesign: 'System Design'
};

const CATEGORY_ORDER = ['dsa', 'sql', 'backend', 'frontend', 'systemDesign'];
const STATE_PRIORITY = { fragile: 0, weak: 1, improving: 2, strong: 3 };
const DIFFICULTY_PRIORITY = { Easy: 0, Medium: 1, Hard: 2 };
const STATE_WEIGHT = { fragile: 4, weak: 3, improving: 2, strong: 1 };
const BASE_URGENCY_BY_STATE = { fragile: 5, weak: 4, improving: 3, strong: 2 };
const SUPPORTED_TIME_BUDGETS = [15, 30, 60];
const TASK_CAP_BY_TIME_BUDGET = { 15: 2, 30: 3, 60: 5 };
const BUDGET_POINTS_BY_TIME_BUDGET = { 15: 2, 30: 4, 60: 6 };
const TASK_WEIGHT_BY_DIFFICULTY = { Easy: 1, Medium: 2, Hard: 3 };
const DEFAULT_TIME_BUDGET = 60;
const DEFAULT_TASK_CAP = 5;
const RECOVERY_TASK_CAP = 3;

// Phase A: the legacy module-load `DSA_PROBLEM_BY_ID = new Map(...)` is gone.
// All callers use `getProblemFromCache(id)` directly — the cache already
// indexes by id internally so there's no efficiency loss, and the lookup is
// always reading the latest hydrated snapshot rather than a stale module-load
// snapshot.
const SQL_PROBLEM_BY_ID = new Map(SQL_PROBLEMS.map(problem => [String(problem.id), problem]));

export const CAREER_GOALS = [
  { id: 'google_sde', name: 'Google SDE', type: 'algo' },
  { id: 'backend', name: 'Backend Engineer', type: 'backend' },
  { id: 'fullstack', name: 'Full Stack Engineer', type: 'general' }
];

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function normalizeState(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'fragile' || normalized === 'weak' || normalized === 'improving' || normalized === 'strong') {
    return normalized;
  }
  return 'weak';
}

function stateTitle(value) {
  const s = normalizeState(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugToLabel(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getGoalRole(goalId) {
  if (goalId === 'backend') return 'backend';
  if (goalId === 'fullstack') return 'frontend';
  return '';
}

function getGoalBias(goalId, categoryKey) {
  if (goalId === 'backend') {
    if (categoryKey === 'sql') return -2;
    if (categoryKey === 'backend') return -1;
    if (categoryKey === 'systemDesign') return -1;
  }
  if (goalId === 'fullstack') {
    if (categoryKey === 'frontend') return -1;
    if (categoryKey === 'dsa') return -1;
  }
  if (goalId === 'google_sde' && categoryKey === 'dsa') {
    return -1;
  }
  return 0;
}

function compareByDifficultyAndId(a, b) {
  const difficultyRankA = getDifficultyRank(a?.difficulty);
  const difficultyRankB = getDifficultyRank(b?.difficulty);
  if (difficultyRankA !== difficultyRankB) return difficultyRankA - difficultyRankB;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

function normalizeDifficulty(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'hard') return 'Hard';
  return '';
}

function getDifficultyRank(value) {
  const normalized = normalizeDifficulty(value);
  return normalized ? DIFFICULTY_PRIORITY[normalized] ?? 3 : 3;
}

function getAllowedDifficultiesForState(state) {
  const normalized = normalizeState(state);
  if (normalized === 'fragile') return new Set(['Easy']);
  if (normalized === 'weak') return new Set(['Easy', 'Medium']);
  if (normalized === 'improving') return new Set(['Medium']);
  return new Set(['Medium', 'Hard']);
}

function clampUrgency(value) {
  return Math.max(1, Math.min(5, Number(value || 1)));
}

function shiftIsoDate(isoDate, deltaDays) {
  const [year, month, day] = String(isoDate || '').split('-').map(part => Number(part));
  const source = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(Date.UTC(year, month - 1, day))
    : new Date();
  source.setUTCDate(source.getUTCDate() + Number(deltaDays || 0));
  return source.toISOString().split('T')[0];
}

class CareerEngine {
  constructor() {
    this.data = this._load();
    this.listeners = new Set();
  }

  _load() {
    const defaults = {
      goalId: null,
      streak: { current: 0, longest: 0, lastActiveDate: null },
      history: {}, // tracks dates when daily mission was fully completed
      intelligence: null,
      questHistory: {},
      backlogCount: 0,
      penalties: { lastAppliedForDate: null },
      pressureSnapshot: null,
      timeBudget: DEFAULT_TIME_BUDGET,
      weeklyStats: { last7Days: [] },
      logs: { dailyDecisions: [], userActions: [], dailySummary: [] }
    };
    try {
      const stored = localStorage.getItem(CAREER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...defaults, ...parsed };
        merged.timeBudget = this._normalizeTimeBudget(merged.timeBudget);
        const storedWeekly = safeObject(merged.weeklyStats);
        merged.weeklyStats = {
          ...defaults.weeklyStats,
          ...storedWeekly,
          last7Days: safeArray(storedWeekly.last7Days)
            .filter(entry => /^\d{4}-\d{2}-\d{2}$/.test(String(entry?.date || '')))
            .map(entry => ({
              date: String(entry.date),
              completedTasks: Math.max(0, Number(entry.completedTasks || 0)),
              failures: Math.max(0, Number(entry.failures || 0)),
              streakActive: !!entry.streakActive
            }))
        };
        return merged;
      }
    } catch (_) {}
    return defaults;
  }

  _normalizeTimeBudget(minutes) {
    const parsed = Number(minutes);
    if (SUPPORTED_TIME_BUDGETS.includes(parsed)) return parsed;
    return DEFAULT_TIME_BUDGET;
  }

  _save() {
    try {
      localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(this.data));
    } catch (_) {}
    this.listeners.forEach(cb => cb());
  }



  checkAbandonedTasks(timeWindowMs = 3600000) {
    if (!this.data.logs || !this.data.logs.userActions) return;
    const now = Date.now();
    const activeTasks = {};
    
    this.data.logs.userActions.forEach(a => {
        if (a.type === 'task_started') {
            activeTasks[a.taskId] = a;
        } else if (a.type === 'task_completed' || a.type === 'task_failed' || a.type === 'task_abandoned') {
            delete activeTasks[a.taskId];
        }
    });
    
    for (const [taskId, startedAction] of Object.entries(activeTasks)) {
        const timeSpent = now - new Date(startedAction.timestamp).getTime();
        if (timeSpent > timeWindowMs) {
            this.logAction({ type: 'task_abandoned', taskId, timeSpentMs: timeSpent });
        }
    }
  }

  getPatternMastery() {
    if (!this.data.logs || !this.data.logs.userActions) return {};
    const stats = {};
    const decisions = {}; 
    (this.data.logs.dailyDecisions || []).forEach(d => { decisions[d.taskId] = d.pattern; });
    
    this.data.logs.userActions.forEach(a => {
       const pattern = decisions[a.taskId];
       if (!pattern) return;
       if (!stats[pattern]) stats[pattern] = { attempts: 0, successes: 0, failures: 0, totalTime: 0 };
       
       if (a.type === 'task_completed') {
           stats[pattern].attempts++;
           stats[pattern].successes++;
           stats[pattern].totalTime += (a.timeSpentMs || 0);
       } else if (a.type === 'task_failed' || a.type === 'task_abandoned') {
           stats[pattern].attempts++;
           stats[pattern].failures++;
           stats[pattern].totalTime += (a.timeSpentMs || 0);
       }
    });
    
    const mastery = {};
    for (const [pattern, s] of Object.entries(stats)) {
        const avgTime = s.attempts > 0 ? (s.totalTime / s.attempts) : 0;
        const successRate = s.attempts > 0 ? (s.successes / s.attempts) : 0;
        const normalizedTimePenalty = Math.min(0.2, (avgTime / 900000) * 0.1); 
        mastery[pattern] = {
            ...s,
            avgTime,
            masteryScore: Math.max(0, successRate - normalizedTimePenalty)
        };
    }
    return mastery;
  }

  getAdvancedWeeklyInsights() {
     const mastery = this.getPatternMastery();
     let mostWeakPattern = null;
     let strongestPattern = null;
     let minScore = 1;
     let maxScore = 0;
     
     for (const [pattern, m] of Object.entries(mastery)) {
         if (m.attempts >= 2) {
             if (m.masteryScore <= minScore) { minScore = m.masteryScore; mostWeakPattern = pattern; }
             if (m.masteryScore >= maxScore) { maxScore = m.masteryScore; strongestPattern = pattern; }
         }
     }
     
     const { avgFailureRate } = this._getSmoothedSignals();
     const learningTrend = avgFailureRate < 0.3 ? 'improving' : 'struggling';
     
     return { mostWeakPattern, strongestPattern, avgFailureRate, learningTrend };
  }

  logAction(actionData) {
    if (!this.data.logs) this.data.logs = { dailyDecisions: [], userActions: [], dailySummary: [] };
    if (!this.data.logs.userActions) this.data.logs.userActions = [];
    this.data.logs.userActions.push({
      ...actionData,
      timestamp: new Date().toISOString()
    });
    this._save();
  }

  generateDailySummary(dateKey) {
    if (!this.data.logs) this.data.logs = { dailyDecisions: [], userActions: [], dailySummary: [] };
    if (!this.data.logs.dailySummary) this.data.logs.dailySummary = [];
    
    const decisions = this.data.logs.dailyDecisions.filter(d => d.date === dateKey) || [];
    const actions = this.data.logs.userActions.filter(a => a.date === dateKey) || [];
    
    const tasksAssigned = decisions.length;
    const completedTasks = actions.filter(a => a.type === 'task_completed').length;
    const failedTasks = actions.filter(a => a.type === 'task_failed').length;
    const failureRate = (completedTasks + failedTasks) > 0 ? (failedTasks / (completedTasks + failedTasks)) : 0;
    
    const burnoutTriggered = decisions.some(d => d.flags?.burnout);
    const momentumTriggered = decisions.some(d => d.flags?.momentum);
    
    const summary = {
      date: dateKey,
      tasksAssigned,
      tasksCompleted: completedTasks,
      failureRate,
      avgDifficulty: 'Medium', // Simplified for simulation
      burnoutTriggered,
      momentumTriggered,
      timestamp: new Date().toISOString()
    };
    
    // Replace if exists
    this.data.logs.dailySummary = this.data.logs.dailySummary.filter(s => s.date !== dateKey);
    this.data.logs.dailySummary.push(summary);
    this._save();
    return summary;
  }

  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  setGoal(goalId) {
    this.data.goalId = goalId;
    this.data.intelligence = null;
    this.data.pressureSnapshot = null;
    this._save();
  }

  getGoal() {
    return CAREER_GOALS.find(g => g.id === this.data.goalId) || null;
  }

  getUserTimeBudget() {
    return this._normalizeTimeBudget(this.data.timeBudget);
  }

  getWeeklyStats() {
    const stats = safeObject(this.data.weeklyStats);
    return {
      last7Days: safeArray(stats.last7Days).map(entry => ({
        date: String(entry?.date || ''),
        completedTasks: Math.max(0, Number(entry?.completedTasks || 0)),
        failures: Math.max(0, Number(entry?.failures || 0)),
        streakActive: !!entry?.streakActive
      }))
    };
  }

  setUserTimeBudget(minutes) {
    const normalized = this._normalizeTimeBudget(minutes);
    if (this.data.timeBudget === normalized) return normalized;
    this.data.timeBudget = normalized;
    this._save();
    return normalized;
  }

  _buildResumeTextForIntelligence() {
    const resumeSkills = typeof interviewStore.getResumeSkills === 'function'
      ? safeArray(interviewStore.getResumeSkills())
      : safeArray(interviewStore?.data?.resumeSkills);

    if (resumeSkills.length > 0) {
      return resumeSkills.join(' ');
    }

    if (this.data.goalId === 'backend') {
      return 'Node SQL MongoDB API microservices';
    }
    if (this.data.goalId === 'fullstack') {
      return 'React JavaScript Node SQL';
    }
    return 'Data Structures Algorithms JavaScript SQL';
  }

  getCareerIntelligence(options = {}) {
    if (!this.data.goalId) return null;

    const resumeText = String(options.resumeText || this._buildResumeTextForIntelligence());
    const role = getGoalRole(this.data.goalId);
    const resumeSignature = `${this.data.goalId}::${resumeText.trim().toLowerCase()}`;
    const current = safeObject(this.data.intelligence);

    if (
      !options.forceRefresh
      && current.resumeSignature === resumeSignature
      && current.generatedAt === getTodayISO()
      && current.payload
    ) {
      return current.payload;
    }

    const payload = mapResumeToQuestions(resumeText, {
      role,
      thresholdScore: 2,
      ...safeObject(options.mapperOptions)
    });

    const nextSnapshot = {
      goalId: this.data.goalId,
      generatedAt: getTodayISO(),
      resumeSignature,
      payload
    };

    if (JSON.stringify(current) !== JSON.stringify(nextSnapshot)) {
      this.data.intelligence = nextSnapshot;
      this._save();
    }

    return payload;
  }

  _resolveDateKey(options = {}) {
    const requested = String(options.currentDate || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(requested)) return requested;
    return getTodayISO();
  }

  _getYesterdayKey(dateKey) {
    return shiftIsoDate(dateKey, -1);
  }

  _filterProblemsByDifficultyForState(problems, state) {
    const allowed = getAllowedDifficultiesForState(state);
    return safeArray(problems).filter(problem => {
      const difficulty = normalizeDifficulty(problem?.difficulty);
      return difficulty ? allowed.has(difficulty) : false;
    });
  }

  _getTaskDifficultyRank(task) {
    const taskType = String(task?.type || '');
    if (taskType === 'learn') return -1;
    return getDifficultyRank(task?.difficulty);
  }

  _isQuickTask(task) {
    const taskType = String(task?.type || '');
    if (taskType === 'learn') return true;
    if (taskType === 'dsa' || taskType === 'sql') {
      return normalizeDifficulty(task?.difficulty) === 'Easy';
    }
    return false;
  }

  _isWeakAreaTask(task, intelligence) {
    const state = normalizeState(task?.state);
    if (state === 'fragile' || state === 'weak') return true;
    if (task?.pattern) return true;

    const weakAreas = new Set(
      safeArray(intelligence?.weakAreas).map(area => String(area || '').toLowerCase())
    );
    const categoryLabel = String(CATEGORY_LABELS[task?.category] || '').toLowerCase();
    return weakAreas.has(categoryLabel);
  }

  _isEasyCompletionTask(task) {
    if (task?.completed) return false;
    return this._isQuickTask(task);
  }

  _getTaskWeight(task) {
    const taskType = String(task?.type || '');
    if (taskType === 'learn') return 1;
    const difficulty = normalizeDifficulty(task?.difficulty) || 'Easy';
    return Number(TASK_WEIGHT_BY_DIFFICULTY[difficulty] || 1);
  }

  _getBudgetPointsForTimeBudget(timeBudget) {
    const normalized = this._normalizeTimeBudget(timeBudget);
    return Number(BUDGET_POINTS_BY_TIME_BUDGET[normalized] || BUDGET_POINTS_BY_TIME_BUDGET[DEFAULT_TIME_BUDGET]);
  }

  _getTaskSnapshotForDate(dateKey) {
    return safeArray(this.data.questHistory?.[dateKey]);
  }

  _getCompletedTasksTodayCount(dateKey, completionCtx) {
    const snapshot = this._getTaskSnapshotForDate(dateKey);
    let completed = 0;
    for (const task of snapshot) {
      if (task?.completed || this._isTaskCompleted(task, completionCtx)) {
        completed += 1;
      }
    }
    return completed;
  }

  _getConfidenceProgression(dateKey, completionCtx) {
    const snapshot = this._getTaskSnapshotForDate(dateKey);
    const progression = {
      dsa: new Set(),
      sql: new Set()
    };

    for (const task of snapshot) {
      if (!task?.confidenceBoost) continue;
      const completed = !!task.completed || this._isTaskCompleted(task, completionCtx);
      if (!completed) continue;

      const taskType = String(task.type || '');
      const pattern = String(task.pattern || '');
      if (!pattern) continue;

      if (taskType === 'dsa') progression.dsa.add(pattern);
      if (taskType === 'sql') progression.sql.add(pattern);
    }

    return progression;
  }

  _buildWeeklyEntry(dateKey, tasks) {
    const safeTasks = safeArray(tasks);
    return {
      date: dateKey,
      completedTasks: safeTasks.filter(task => task.completed).length,
      failures: safeTasks.reduce((sum, task) => sum + Math.max(0, Number(task?.failureCount || 0)), 0),
      streakActive: !!this.data.history?.[dateKey]
    };
  }

  _updateWeeklyStats(dateKey, tasks) {
    const existing = safeArray(this.data.weeklyStats?.last7Days)
      .filter(entry => /^\d{4}-\d{2}-\d{2}$/.test(String(entry?.date || '')))
      .map(entry => ({
        date: String(entry.date),
        completedTasks: Math.max(0, Number(entry.completedTasks || 0)),
        failures: Math.max(0, Number(entry.failures || 0)),
        streakActive: !!entry.streakActive
      }));

    const nextEntry = this._buildWeeklyEntry(dateKey, tasks);
    const byDate = new Map(existing.map(entry => [entry.date, entry]));
    byDate.set(nextEntry.date, nextEntry);

    const last7Days = Array.from(byDate.values())
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 7)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const nextStats = { last7Days };
    if (JSON.stringify(this.data.weeklyStats) !== JSON.stringify(nextStats)) {
      this.data.weeklyStats = nextStats;
      return true;
    }
    return false;
  }

  _getWeeklyInsights() {
    const last7Days = safeArray(this.data.weeklyStats?.last7Days);
    if (last7Days.length === 0) {
      return {
        consistencyScore: 0,
        burnoutRisk: false,
        urgencyDelta: 0
      };
    }

    const activeDays = last7Days.filter(entry => Number(entry.completedTasks || 0) > 0).length;
    const consistencyScore = activeDays / 7;
    const recent = last7Days.slice(-3);
    const recentFailures = recent.reduce((sum, entry) => sum + Number(entry.failures || 0), 0);
    const recentCompleted = recent.reduce((sum, entry) => sum + Number(entry.completedTasks || 0), 0);
    const burnoutRisk = recent.length >= 3
      && (recentFailures >= 8 || (recentFailures >= 6 && recentCompleted <= 2));

    let urgencyDelta = 0;
    if (burnoutRisk) {
      urgencyDelta -= 1;
    } else if (consistencyScore <= 0.28) {
      urgencyDelta += 1;
    } else if (consistencyScore >= 0.71) {
      urgencyDelta -= 1;
    }

    return {
      consistencyScore,
      burnoutRisk,
      urgencyDelta
    };
  }

  _computeTaskPriority(task, recentlyCompleted = false) {
    const urgency = Number(task?.urgency || 1);
    const failureCount = Number(task?.failureCount || 0);
    const overdueBonus = task?.overdue ? 3 : 0;
    const completedBonus = recentlyCompleted ? -2 : 0;
    return (urgency * 2) + failureCount + overdueBonus + completedBonus;
  }

  _withTaskPriority(task) {
    const recentlyCompleted = !!task?.completed;
    return {
      ...task,
      recentlyCompleted,
      priorityValue: this._computeTaskPriority(task, recentlyCompleted)
    };
  }

  _sortTasksByPriority(tasks, timeBudget = DEFAULT_TIME_BUDGET) {
    const preferEasy = Number(timeBudget) < DEFAULT_TIME_BUDGET;
    return tasks.slice().sort((a, b) => {
      const priorityA = Number(a?.priorityValue || 0);
      const priorityB = Number(b?.priorityValue || 0);
      if (priorityA !== priorityB) return priorityB - priorityA;

      if (Boolean(a?.overdue) !== Boolean(b?.overdue)) return a.overdue ? -1 : 1;

      if (preferEasy) {
        const difficultyA = this._getTaskDifficultyRank(a);
        const difficultyB = this._getTaskDifficultyRank(b);
        if (difficultyA !== difficultyB) return difficultyA - difficultyB;
      }

      const rankA = Number(a?.priorityRank ?? 9);
      const rankB = Number(b?.priorityRank ?? 9);
      if (rankA !== rankB) return rankA - rankB;

      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });
  }

  _selectRecoveryTasks(tasks, intelligence, maxTasks) {
    const selected = [];
    const selectedIds = new Set();

    const pushIfAvailable = (task) => {
      if (!task || selectedIds.has(task.id)) return false;
      selected.push(task);
      selectedIds.add(task.id);
      return true;
    };

    const weakTask = tasks.find(task => this._isWeakAreaTask(task, intelligence));
    pushIfAvailable(weakTask);

    const easyTask = tasks.find(task => this._isEasyCompletionTask(task));
    pushIfAvailable(easyTask);

    const pool = tasks.filter(
      task => this._isWeakAreaTask(task, intelligence) || this._isEasyCompletionTask(task)
    );
    for (const task of pool) {
      if (selected.length >= maxTasks) break;
      pushIfAvailable(task);
    }

    return selected.slice(0, maxTasks);
  }

  _findDsaFailureFocus(completionCtx) {
    const performanceByProblem = safeObject(store.getDailySystemState()?.performanceByProblem);
    const failures = [];

    for (const [problemId, perf] of Object.entries(performanceByProblem)) {
      const problem = getProblemFromCache(String(problemId));
      if (!problem) continue;

      const attempts = Number(perf?.attempts || 0);
      const failedSubmissions = safeArray(perf?.history)
        .filter(item => Number(item?.passPct || 0) < 100)
        .length;

      let failureCount = failedSubmissions;
      if (failureCount <= 0 && attempts > 0) {
        const solved = completionCtx?.dsaProgress?.[problemId]?.status === 'solved';
        failureCount = solved ? Math.max(0, attempts - 1) : attempts;
      }
      if (failureCount <= 0) continue;

      failures.push({
        problemId,
        pattern: problem.category,
        difficulty: normalizeDifficulty(problem.difficulty),
        failureCount
      });
    }

    failures.sort((a, b) => {
      if (a.failureCount !== b.failureCount) return b.failureCount - a.failureCount;
      const aDifficulty = getDifficultyRank(a.difficulty);
      const bDifficulty = getDifficultyRank(b.difficulty);
      if (aDifficulty !== bDifficulty) return bDifficulty - aDifficulty;
      return String(a.problemId).localeCompare(String(b.problemId));
    });

    return failures[0] || null;
  }

  _findSqlFailureFocus(completionCtx) {
    const failures = [];

    for (const [problemId, entry] of Object.entries(safeObject(completionCtx?.sqlProgress))) {
      const problem = SQL_PROBLEM_BY_ID.get(String(problemId));
      if (!problem) continue;

      const attempts = Number(entry?.attempts || 0);
      if (attempts <= 0) continue;
      const solved = entry?.status === 'solved';
      const failureCount = solved ? Math.max(0, attempts - 1) : attempts;
      if (failureCount <= 0) continue;

      failures.push({
        problemId,
        pattern: problem.topicId,
        difficulty: normalizeDifficulty(problem.difficulty),
        failureCount
      });
    }

    failures.sort((a, b) => {
      if (a.failureCount !== b.failureCount) return b.failureCount - a.failureCount;
      const aDifficulty = getDifficultyRank(a.difficulty);
      const bDifficulty = getDifficultyRank(b.difficulty);
      if (aDifficulty !== bDifficulty) return bDifficulty - aDifficulty;
      return String(a.problemId).localeCompare(String(b.problemId));
    });

    return failures[0] || null;
  }

  _getTaskFailureCount(task, completionCtx) {
    const explicit = Number(task?.failureCount || 0);
    if (explicit > 0) return explicit;

    const type = String(task?.type || '');

    if (type === 'dsa') {
      const perf = safeObject(store.getDailySystemState()?.performanceByProblem?.[task.problemId]);
      const attempts = Number(perf.attempts || 0);
      const failedSubmissions = safeArray(perf.history).filter(item => Number(item?.passPct || 0) < 100).length;
      if (failedSubmissions > 0) return failedSubmissions;
      if (attempts <= 0) return 0;
      const solved = completionCtx.dsaProgress?.[task.problemId]?.status === 'solved';
      return solved ? Math.max(0, attempts - 1) : attempts;
    }

    if (type === 'sql') {
      const entry = safeObject(completionCtx.sqlProgress?.[task.problemId]);
      const attempts = Number(entry.attempts || 0);
      if (attempts <= 0) return 0;
      const solved = entry.status === 'solved';
      return solved ? Math.max(0, attempts - 1) : attempts;
    }

    if (type === 'interview') {
      const entry = safeObject(completionCtx.interviewProgress?.[task.questionId]);
      const attempts = safeArray(entry.attempts).length;
      if (attempts <= 0) return 0;
      const status = String(entry.status || 'unseen');
      return status === 'mastered' ? Math.max(0, attempts - 1) : attempts;
    }

    return 0;
  }

  _computeTaskUrgency(task, failureCount, overdue = false, urgencyBoost = 0, weeklyUrgencyDelta = 0) {
    const state = normalizeState(task?.state);
    let urgency = Number(BASE_URGENCY_BY_STATE[state] || 3);

    if (String(task?.type || '') === 'learn') {
      urgency -= 1;
    }
    if (task?.pattern) urgency += 1;
    if (failureCount >= 3) urgency += 2;
    else if (failureCount > 0) urgency += 1;
    if (overdue) urgency += 1;
    urgency += Number(urgencyBoost || 0);
    urgency += Number(weeklyUrgencyDelta || 0);
    return clampUrgency(urgency);
  }

  _buildTaskPressure(task, completionCtx, { overdue = false, urgencyBoost = 0, weeklyUrgencyDelta = 0 } = {}) {
    const failureCount = this._getTaskFailureCount(task, completionCtx);
    const urgency = this._computeTaskUrgency(task, failureCount, overdue, urgencyBoost, weeklyUrgencyDelta);
    return {
      ...task,
      failureCount,
      urgency,
      overdue: !!overdue,
      urgencyLabel: urgency >= 5 ? 'Critical' : urgency >= 4 ? 'High' : 'Medium'
    };
  }

  _toTaskSnapshot(task) {
    return {
      id: task.id,
      type: task.type,
      category: task.category,
      state: task.state,
      label: task.label,
      title: task.title,
      subtitle: task.subtitle,
      route: task.route,
      reason: task.reason,
      icon: task.icon,
      problemId: task.problemId || null,
      questionId: task.questionId || null,
      subjectId: task.subjectId || null,
      topicId: task.topicId || null,
      pattern: task.pattern || null,
      difficulty: normalizeDifficulty(task.difficulty) || null,
      priorityRank: Number(task.priorityRank ?? 9),
      priorityValue: Number(task.priorityValue || 0),
      completed: !!task.completed,
      recentlyCompleted: !!task.recentlyCompleted,
      urgency: Number(task.urgency || 1),
      overdue: !!task.overdue,
      failureCount: Number(task.failureCount || 0),
      confidenceBoost: !!task.confidenceBoost,
      adaptiveDifficulty: !!task.adaptiveDifficulty
    };
  }

  _persistQuestSnapshot(dateKey, tasks) {
    const snapshot = tasks.map(task => this._toTaskSnapshot(task));
    const existing = safeArray(this.data.questHistory?.[dateKey]);
    if (JSON.stringify(existing) === JSON.stringify(snapshot)) return false;

    this.data.questHistory = {
      ...safeObject(this.data.questHistory),
      [dateKey]: snapshot
    };
    this._save();
    return true;
  }

  _applyPenaltyIfNeeded(todayKey) {
    const yesterdayKey = this._getYesterdayKey(todayKey);
    const penalties = safeObject(this.data.penalties);
    if (penalties.lastAppliedForDate === yesterdayKey) {
      return { applied: false, overdueCount: 0 };
    }

    const yesterdaySnapshot = safeArray(this.data.questHistory?.[yesterdayKey]);
    if (yesterdaySnapshot.length === 0) {
      return { applied: false, overdueCount: 0 };
    }

    const overdueCount = yesterdaySnapshot.filter(task => !task.completed).length;
    if (overdueCount <= 0) {
      return { applied: false, overdueCount: 0 };
    }

    this.data.backlogCount = Math.max(0, Number(this.data.backlogCount || 0) + overdueCount);
    this.data.streak.current = Math.max(0, Number(this.data.streak.current || 0) - 1);
    this.data.penalties = { ...penalties, lastAppliedForDate: yesterdayKey };
    this._save();

    return { applied: true, overdueCount };
  }

  _buildOverdueCarryTasks(todayKey, completionCtx) {
    const yesterdayKey = this._getYesterdayKey(todayKey);
    const yesterdaySnapshot = safeArray(this.data.questHistory?.[yesterdayKey]);
    const carry = [];

    for (const snapshotTask of yesterdaySnapshot) {
      if (snapshotTask.completed) continue;
      const cloned = {
        ...snapshotTask,
        overdue: true,
        carryForwardBoost: 1
      };
      cloned.completed = this._isTaskCompleted(cloned, completionCtx);
      if (cloned.completed) continue;
      cloned.reason = `Overdue from yesterday. ${snapshotTask.reason || 'Complete this first to avoid streak risk.'}`;
      carry.push(cloned);
    }

    return carry;
  }

  _getCompletionContext(today) {
    const learningState = safeObject(learningStore?.state);
    const dsaProgress = safeObject(store.get('progress'));
    const sqlProgress = safeObject(sqlStore?.state?.problems);
    const interviewProgress = safeObject(interviewStore?.data?.questions);
    return { today, learningState, dsaProgress, sqlProgress, interviewProgress };
  }

  _isTaskCompleted(task, ctx) {
    const taskType = String(task?.type || '');
    if (taskType === 'learn') {
      const topicsToday = safeArray(ctx.learningState?.activityByDate?.[ctx.today]?.topics);
      const completedTopics = safeArray(
        learningStore.getSubjectState(task.subjectId)?.completedTopics
      );
      const topicRef = `${task.subjectId}:${task.topicId}`;
      return topicsToday.includes(topicRef) || completedTopics.includes(task.topicId);
    }
    if (taskType === 'dsa') {
      return ctx.dsaProgress?.[task.problemId]?.status === 'solved';
    }
    if (taskType === 'sql') {
      return ctx.sqlProgress?.[task.problemId]?.status === 'solved';
    }
    if (taskType === 'interview') {
      const status = String(ctx.interviewProgress?.[task.questionId]?.status || 'unseen');
      return status === 'practiced' || status === 'mastered';
    }
    return false;
  }

  _findFirstIncompleteLearningTopic(preferredCategory = '') {
    const keywordByCategory = {
      dsa: /(array|pointer|sliding|tree|graph|dynamic|recursion|search|sort)/i,
      sql: /(sql|query|join|index|database|transaction|normalization|window)/i,
      backend: /(api|backend|database|network|system|concurrency|os)/i,
      frontend: /(frontend|react|javascript|typescript|css|html|dom|web)/i,
      systemDesign: /(system design|scalability|distributed|microservice|cache|load balanc)/i
    };
    const preferredRegex = keywordByCategory[preferredCategory];

    const candidates = [];
    for (const subject of LEARNING_SUBJECT_LIST) {
      const state = learningStore.getSubjectState(subject.id);
      const meta = LEARNING_SUBJECTS[subject.id];
      if (!meta || !state) continue;
      for (const topic of safeArray(meta.topics)) {
        if (safeArray(state.completedTopics).includes(topic.id)) continue;
        candidates.push({ subjectId: subject.id, topicId: topic.id, title: topic.title });
      }
    }

    if (candidates.length === 0) {
      return { subjectId: 'algo', topicId: 'two-pointers', title: 'Review Two Pointers' };
    }
    if (!preferredRegex) return candidates[0];

    const preferred = candidates.find(topic => preferredRegex.test(topic.title));
    return preferred || candidates[0];
  }

  _buildDsaTasks(state, intelligence, dsaSolvedSet, usedProblemIds, completionCtx, confidenceProgression, extraCtx = {}) {
    const tasks = [];
    const normalizedState = normalizeState(state);
    const weakPatterns = safeArray(intelligence?.patternWeakness?.dsa);
    const recommended = this._filterProblemsByDifficultyForState(
      safeArray(intelligence?.recommendations?.dsa)
        .map(problem => getProblemFromCache(String(problem?.id || '')) || problem)
        .filter(Boolean),
      normalizedState
    ).slice().sort(compareByDifficultyAndId);
    const stateText = stateTitle(normalizedState);

    const failureFocus = this._findDsaFailureFocus(completionCtx);
    const shouldConfidenceBoost = normalizedState === 'fragile'
      || Number(failureFocus?.failureCount || 0) >= 2;
    const progressedPatterns = confidenceProgression?.dsa instanceof Set
      ? Array.from(confidenceProgression.dsa).slice().sort((a, b) => String(a).localeCompare(String(b)))
      : [];
    const progressedPattern = String(progressedPatterns[0] || '');

    if (shouldConfidenceBoost) {
      const unresolvedPool = getAllProblems().filter(
        problem => !dsaSolvedSet.has(problem.id) && !usedProblemIds.has(problem.id)
      );
      const targetPattern = String(progressedPattern || failureFocus?.pattern || weakPatterns[0] || '');
      const shouldIncreaseDifficulty = !!progressedPattern && targetPattern === progressedPattern;
      const failureDifficultyRank = getDifficultyRank(failureFocus?.difficulty);

      const scopedPool = targetPattern
        ? unresolvedPool.filter(problem => (problem?.topic?.slug || problem?.category) === targetPattern)
        : unresolvedPool;

      let confidenceCandidates = this._filterProblemsByDifficultyForState(
        scopedPool,
        normalizedState
      );

      if (shouldIncreaseDifficulty) {
        const promoted = scopedPool.filter(
          problem => normalizeDifficulty(problem.difficulty) === 'Medium'
        );
        if (promoted.length > 0) {
          confidenceCandidates = promoted;
        }
      }

      if (!shouldIncreaseDifficulty && failureFocus && Number(failureFocus.failureCount || 0) >= 2 && failureDifficultyRank > 0) {
        const lowerDifficulty = confidenceCandidates.filter(
          problem => getDifficultyRank(problem.difficulty) < failureDifficultyRank
        );
        if (lowerDifficulty.length > 0) {
          confidenceCandidates = lowerDifficulty;
        } else {
          const nonHardFallback = confidenceCandidates.filter(
            problem => getDifficultyRank(problem.difficulty) <= failureDifficultyRank
          );
          if (nonHardFallback.length > 0) confidenceCandidates = nonHardFallback;
        }
      }

      const confidenceCandidate = confidenceCandidates.slice().sort(compareByDifficultyAndId)[0];
      if (confidenceCandidate) {
        const confidenceDifficulty = normalizeDifficulty(confidenceCandidate.difficulty) || 'Easy';
        const loweredDifficulty = failureFocus
          ? getDifficultyRank(confidenceDifficulty) < failureDifficultyRank
          : false;

        usedProblemIds.add(confidenceCandidate.id);
        tasks.push({
          id: `quest-dsa-confidence-${confidenceCandidate.category}-${confidenceCandidate.id}`,
          type: 'dsa',
          category: 'dsa',
          state: normalizedState,
          priorityRank: STATE_PRIORITY[normalizedState],
          label: `Confidence Boost (${stateText})`,
          title: 'Confidence Boost',
          subtitle: confidenceCandidate.title,
          route: `/problem/${confidenceCandidate.id}`,
          reason: shouldIncreaseDifficulty
            ? `Confidence progression: prior confidence success in ${slugToLabel(confidenceCandidate.category)} unlocked Medium difficulty.`
            : failureFocus
              ? loweredDifficulty
                ? `Confidence loop: practice ${slugToLabel(confidenceCandidate.category)} at lower difficulty (${confidenceDifficulty}).`
                : `Confidence loop: stay on ${slugToLabel(confidenceCandidate.category)} with a confidence reset task.`
              : `Fragile state detected. Start with an easy confidence reset in ${slugToLabel(confidenceCandidate.category)}.`,
          icon: 'code-2',
          problemId: confidenceCandidate.id,
          pattern: confidenceCandidate.category,
          difficulty: confidenceDifficulty,
          confidenceBoost: true,
          adaptiveDifficulty: true
        });
      }
    }

    for (const pattern of weakPatterns) {
      const candidate = this._filterProblemsByDifficultyForState(
        getAllProblems().filter(
          problem => (problem?.topic?.slug || problem?.category) === pattern && !dsaSolvedSet.has(problem.id) && !usedProblemIds.has(problem.id)
        ),
        normalizedState
      ).slice().sort(compareByDifficultyAndId)[0];
      if (!candidate) continue;
      usedProblemIds.add(candidate.id);
      tasks.push({
        id: `quest-dsa-pattern-${pattern}-${candidate.id}`,
        type: 'dsa',
        category: 'dsa',
        state: normalizedState,
        priorityRank: STATE_PRIORITY[normalizedState],
        label: `Fix your weak area: ${slugToLabel(pattern)} (${stateText})`,
        title: 'Pattern Drill',
        subtitle: candidate.title,
        route: `/problem/${candidate.id}`,
        reason: `Pattern weakness detected in ${slugToLabel(pattern)}. Practice this DSA pattern now.`,
        icon: 'code-2',
        problemId: candidate.id,
        pattern,
        difficulty: normalizeDifficulty(candidate.difficulty) || 'Easy',
        adaptiveDifficulty: true
      });
    }

    for (const problem of recommended) {
      if (!problem || dsaSolvedSet.has(problem.id) || usedProblemIds.has(problem.id)) continue;
      usedProblemIds.add(problem.id);
      tasks.push({
        id: `quest-dsa-reco-${problem.id}`,
        type: 'dsa',
        category: 'dsa',
        state: normalizedState,
        priorityRank: STATE_PRIORITY[normalizedState],
        label: `${stateText} DSA Practice`,
        title: 'Solve DSA Problem',
        subtitle: problem.title,
        route: `/problem/${problem.id}`,
        reason: `${CATEGORY_LABELS.dsa} is ${normalizeState(state)}. Reinforce with a targeted DSA solve.`,
        icon: 'code-2',
        problemId: problem.id,
        pattern: problem.category,
        difficulty: normalizeDifficulty(problem.difficulty) || 'Easy',
        adaptiveDifficulty: true
      });
    }

    if (tasks.length === 0) {
      const fallback = this._filterProblemsByDifficultyForState(
        getAllProblems().filter(problem => !dsaSolvedSet.has(problem.id) && !usedProblemIds.has(problem.id)),
        normalizedState
      ).slice().sort(compareByDifficultyAndId)[0];
      if (fallback) {
        usedProblemIds.add(fallback.id);
        tasks.push({
          id: `quest-dsa-fallback-${fallback.id}`,
          type: 'dsa',
          category: 'dsa',
          state: normalizedState,
          priorityRank: STATE_PRIORITY[normalizedState],
          label: `${stateText} DSA Practice`,
          title: 'Solve DSA Problem',
          subtitle: fallback.title,
          route: `/problem/${fallback.id}`,
          reason: 'Continue DSA progression with the next unsolved problem.',
          icon: 'code-2',
          problemId: fallback.id,
          pattern: fallback.category,
          difficulty: normalizeDifficulty(fallback.difficulty) || 'Easy',
          adaptiveDifficulty: true
        });
      }
    }

    return tasks;
  }

  _buildSqlTasks(state, intelligence, sqlSolvedSet, usedSqlIds, completionCtx, confidenceProgression, extraCtx = {}) {
    const tasks = [];
    const normalizedState = normalizeState(state);
    const weakPatterns = safeArray(intelligence?.patternWeakness?.sql);
    const recommended = this._filterProblemsByDifficultyForState(
      safeArray(intelligence?.recommendations?.sql)
        .map(problem => SQL_PROBLEM_BY_ID.get(String(problem?.id || '')) || problem)
        .filter(Boolean),
      normalizedState
    ).slice().sort(compareByDifficultyAndId);
    const stateText = stateTitle(normalizedState);

    const failureFocus = this._findSqlFailureFocus(completionCtx);
    const shouldConfidenceBoost = normalizedState === 'fragile'
      || Number(failureFocus?.failureCount || 0) >= 2;
    const progressedTopics = confidenceProgression?.sql instanceof Set
      ? Array.from(confidenceProgression.sql).slice().sort((a, b) => String(a).localeCompare(String(b)))
      : [];
    const progressedTopic = String(progressedTopics[0] || '');

    if (shouldConfidenceBoost) {
      const unresolvedPool = SQL_PROBLEMS.filter(
        problem => !sqlSolvedSet.has(problem.id) && !usedSqlIds.has(problem.id)
      );
      const targetPattern = String(progressedTopic || failureFocus?.pattern || weakPatterns[0] || '');
      const shouldIncreaseDifficulty = !!progressedTopic && targetPattern === progressedTopic;
      const failureDifficultyRank = getDifficultyRank(failureFocus?.difficulty);

      const scopedPool = targetPattern
        ? unresolvedPool.filter(problem => problem.topicId === targetPattern)
        : unresolvedPool;

      let confidenceCandidates = this._filterProblemsByDifficultyForState(
        scopedPool,
        normalizedState
      );

      if (shouldIncreaseDifficulty) {
        const promoted = scopedPool.filter(
          problem => normalizeDifficulty(problem.difficulty) === 'Medium'
        );
        if (promoted.length > 0) {
          confidenceCandidates = promoted;
        }
      }

      if (!shouldIncreaseDifficulty && failureFocus && Number(failureFocus.failureCount || 0) >= 2 && failureDifficultyRank > 0) {
        const lowerDifficulty = confidenceCandidates.filter(
          problem => getDifficultyRank(problem.difficulty) < failureDifficultyRank
        );
        if (lowerDifficulty.length > 0) {
          confidenceCandidates = lowerDifficulty;
        } else {
          const nonHardFallback = confidenceCandidates.filter(
            problem => getDifficultyRank(problem.difficulty) <= failureDifficultyRank
          );
          if (nonHardFallback.length > 0) confidenceCandidates = nonHardFallback;
        }
      }

      const confidenceCandidate = confidenceCandidates.slice().sort(compareByDifficultyAndId)[0];
      if (confidenceCandidate) {
        const confidenceDifficulty = normalizeDifficulty(confidenceCandidate.difficulty) || 'Easy';
        const loweredDifficulty = failureFocus
          ? getDifficultyRank(confidenceDifficulty) < failureDifficultyRank
          : false;

        usedSqlIds.add(confidenceCandidate.id);
        tasks.push({
          id: `quest-sql-confidence-${confidenceCandidate.topicId}-${confidenceCandidate.id}`,
          type: 'sql',
          category: 'sql',
          state: normalizedState,
          priorityRank: STATE_PRIORITY[normalizedState],
          label: `Confidence Boost (${stateText})`,
          title: 'Confidence Boost',
          subtitle: confidenceCandidate.title,
          route: `/sql-track/${confidenceCandidate.topicId}/${confidenceCandidate.id}`,
          reason: shouldIncreaseDifficulty
            ? `Confidence progression: prior confidence success in SQL ${slugToLabel(confidenceCandidate.topicId)} unlocked Medium difficulty.`
            : failureFocus
              ? loweredDifficulty
                ? `Confidence loop: practice SQL ${slugToLabel(confidenceCandidate.topicId)} at lower difficulty (${confidenceDifficulty}).`
                : `Confidence loop: stay on SQL ${slugToLabel(confidenceCandidate.topicId)} with a confidence reset task.`
              : `Fragile state detected. Start with an easy SQL confidence reset in ${slugToLabel(confidenceCandidate.topicId)}.`,
          icon: 'code-2',
          problemId: confidenceCandidate.id,
          pattern: confidenceCandidate.topicId,
          difficulty: confidenceDifficulty,
          confidenceBoost: true,
          adaptiveDifficulty: true
        });
      }
    }

    for (const pattern of weakPatterns) {
      const candidate = this._filterProblemsByDifficultyForState(
        SQL_PROBLEMS.filter(
          problem => problem.topicId === pattern && !sqlSolvedSet.has(problem.id) && !usedSqlIds.has(problem.id)
        ),
        normalizedState
      ).slice().sort(compareByDifficultyAndId)[0];
      if (!candidate) continue;
      usedSqlIds.add(candidate.id);
      tasks.push({
        id: `quest-sql-pattern-${pattern}-${candidate.id}`,
        type: 'sql',
        category: 'sql',
        state: normalizedState,
        priorityRank: STATE_PRIORITY[normalizedState],
        label: `Fix your weak area: ${slugToLabel(pattern)} (${stateText})`,
        title: 'Pattern Drill',
        subtitle: candidate.title,
        route: `/sql-track/${candidate.topicId}/${candidate.id}`,
        reason: `Pattern weakness detected in SQL ${slugToLabel(pattern)}. Target this query type.`,
        icon: 'code-2',
        problemId: candidate.id,
        pattern,
        difficulty: normalizeDifficulty(candidate.difficulty) || 'Easy',
        adaptiveDifficulty: true
      });
    }

    for (const problem of recommended) {
      if (!problem || sqlSolvedSet.has(problem.id) || usedSqlIds.has(problem.id)) continue;
      usedSqlIds.add(problem.id);
      tasks.push({
        id: `quest-sql-reco-${problem.id}`,
        type: 'sql',
        category: 'sql',
        state: normalizedState,
        priorityRank: STATE_PRIORITY[normalizedState],
        label: `${stateText} SQL Practice`,
        title: 'Solve SQL Problem',
        subtitle: problem.title,
        route: `/sql-track/${problem.topicId}/${problem.id}`,
        reason: `${CATEGORY_LABELS.sql} is ${normalizeState(state)}. Strengthen SQL accuracy with focused practice.`,
        icon: 'code-2',
        problemId: problem.id,
        pattern: problem.topicId,
        difficulty: normalizeDifficulty(problem.difficulty) || 'Easy',
        adaptiveDifficulty: true
      });
    }

    if (tasks.length === 0) {
      const fallback = this._filterProblemsByDifficultyForState(
        SQL_PROBLEMS.filter(problem => !sqlSolvedSet.has(problem.id) && !usedSqlIds.has(problem.id)),
        normalizedState
      ).slice().sort(compareByDifficultyAndId)[0];
      if (fallback) {
        usedSqlIds.add(fallback.id);
        tasks.push({
          id: `quest-sql-fallback-${fallback.id}`,
          type: 'sql',
          category: 'sql',
          state: normalizedState,
          priorityRank: STATE_PRIORITY[normalizedState],
          label: `${stateText} SQL Practice`,
          title: 'Solve SQL Problem',
          subtitle: fallback.title,
          route: `/sql-track/${fallback.topicId}/${fallback.id}`,
          reason: 'Continue SQL progression with the next unsolved topic problem.',
          icon: 'code-2',
          problemId: fallback.id,
          pattern: fallback.topicId,
          difficulty: normalizeDifficulty(fallback.difficulty) || 'Easy',
          adaptiveDifficulty: true
        });
      }
    }

    return tasks;
  }

  _questionMatchesCategory(question, categoryKey) {
    if (!question) return false;
    const subcategory = String(question.subcategory || '').toLowerCase();
    const tags = safeArray(question.tags).map(tag => String(tag).toLowerCase());
    const roles = safeArray(question.roles).map(role => String(role).toLowerCase());

    if (categoryKey === 'dsa') return subcategory === 'dsa';
    if (categoryKey === 'sql') return subcategory === 'database' || tags.includes('sql') || tags.includes('database');
    if (categoryKey === 'systemDesign') return subcategory === 'system-design' || tags.includes('system-design');
    if (categoryKey === 'backend') return roles.includes('backend') || subcategory === 'database' || subcategory === 'system-design';
    if (categoryKey === 'frontend') return roles.includes('frontend') || tags.includes('frontend') || tags.includes('react');
    return false;
  }

  _buildInterviewTasks(categoryKey, state, intelligence, usedQuestionIds) {
    const tasks = [];
    const recommendations = safeArray(intelligence?.recommendations?.interview);
    const sorted = recommendations.slice().sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
    const stateText = stateTitle(state);

    for (const question of sorted) {
      if (!question || usedQuestionIds.has(question.id)) continue;
      if (!this._questionMatchesCategory(question, categoryKey)) continue;
      usedQuestionIds.add(question.id);
      tasks.push({
        id: `quest-interview-${categoryKey}-${question.id}`,
        type: 'interview',
        category: categoryKey,
        state,
        priorityRank: STATE_PRIORITY[normalizeState(state)],
        label: `${stateText} Interview Focus`,
        title: 'Mock Question',
        subtitle: question.title,
        route: `/interview/${question.category}/${question.id}`,
        reason: `Improve ${CATEGORY_LABELS[categoryKey] || categoryKey} communication under interview pressure.`,
        icon: 'mic',
        questionId: question.id,
        difficulty: normalizeDifficulty(question.difficulty) || 'Medium'
      });
    }

    if (tasks.length === 0) {
      const fallback = INTERVIEW_QUESTIONS
        .filter(question => this._questionMatchesCategory(question, categoryKey))
        .slice()
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
      if (fallback && !usedQuestionIds.has(fallback.id)) {
        usedQuestionIds.add(fallback.id);
        tasks.push({
          id: `quest-interview-fallback-${categoryKey}-${fallback.id}`,
          type: 'interview',
          category: categoryKey,
          state,
          priorityRank: STATE_PRIORITY[normalizeState(state)],
          label: `${stateText} Interview Focus`,
          title: 'Mock Question',
          subtitle: fallback.title,
          route: `/interview/${fallback.category}/${fallback.id}`,
          reason: `Maintain ${CATEGORY_LABELS[categoryKey] || categoryKey} interview readiness with a targeted question.`,
          icon: 'mic',
          questionId: fallback.id,
          difficulty: normalizeDifficulty(fallback.difficulty) || 'Medium'
        });
      }
    }

    return tasks;
  }

  _buildLearningTask(categoryKey, state) {
    const target = this._findFirstIncompleteLearningTopic(categoryKey);
    const stateText = stateTitle(state);
    return {
      id: `quest-learn-${categoryKey}-${target.subjectId}-${target.topicId}`,
      type: 'learn',
      category: categoryKey,
      state,
      priorityRank: STATE_PRIORITY[normalizeState(state)],
      label: `${stateText} Concept Maintenance`,
      title: 'Learn Concept',
      subtitle: target.title,
      route: `/learn/${target.subjectId}/topic/${target.topicId}`,
      reason: `Reinforce ${CATEGORY_LABELS[categoryKey] || categoryKey} fundamentals with focused learning.`,
      icon: 'book-open',
      subjectId: target.subjectId,
      topicId: target.topicId,
      difficulty: 'Easy'
    };
  }

  _buildCategoryTasks(categoryKey, state, intelligence, usedRefs, completionCtx, confidenceProgression, extraCtx = {}) {
    if (categoryKey === 'dsa') {
      return this._buildDsaTasks(
        state,
        intelligence,
        usedRefs.dsaSolvedSet,
        usedRefs.usedDsaProblemIds,
        completionCtx,
        confidenceProgression
      );
    }
    if (categoryKey === 'sql') {
      return this._buildSqlTasks(
        state,
        intelligence,
        usedRefs.sqlSolvedSet,
        usedRefs.usedSqlProblemIds,
        completionCtx,
        confidenceProgression
      );
    }
    if (categoryKey === 'backend' || categoryKey === 'frontend' || categoryKey === 'systemDesign') {
      const interview = this._buildInterviewTasks(categoryKey, state, intelligence, usedRefs.usedInterviewQuestionIds);
      if (interview.length > 0) return interview;
      return [this._buildLearningTask(categoryKey, state)];
    }
    return [];
  }

  _getSlotCountForState(state, hasFragile) {
    const normalized = normalizeState(state);
    if (normalized === 'fragile') return 2;
    if (normalized === 'weak') return hasFragile ? 1 : 2;
    if (normalized === 'improving') return 1;
    return 0;
  }

  // Dynamic daily quests (new API)

  
  _getSmoothedSignals(options = {}) {
    const last7Days = Array.isArray(this.data.weeklyStats?.last7Days) ? this.data.weeklyStats.last7Days : [];
    const adaptationWindow = last7Days.slice(-3);
    if (adaptationWindow.length === 0) {
      return { avgFailureRate: 0, avgCompletion: 0 };
    }
    const totalCompleted = adaptationWindow.reduce((sum, e) => sum + Number(e.completedTasks || 0), 0);
    const totalFailures = adaptationWindow.reduce((sum, e) => sum + Number(e.failures || 0), 0);
    const totalAttempts = totalCompleted + totalFailures;
    
    const avgFailureRate = totalAttempts > 0 ? (totalFailures / totalAttempts) : 0;
    const avgCompletion = totalCompleted / adaptationWindow.length;
    
    return { avgFailureRate, avgCompletion };
  }

  getBurnoutState(options = {}) {
    const { avgFailureRate } = this._getSmoothedSignals(options);
    const burnout = avgFailureRate > 0.6;
    return { burnout, avgFailureRate };
  }

  getMomentumState(options = {}) {
    const { avgFailureRate, avgCompletion } = this._getSmoothedSignals(options);
    const hasMomentum = avgCompletion >= 3 && avgFailureRate < 0.3;
    return { momentumBoost: hasMomentum, avgFailureRate, avgCompletion };
  }

  _getPatternHistory(todayKey) {
    const patternHistory = {};
    for (let i = 1; i <= 3; i++) {
        // Simple string shift since we don't have shiftIsoDate in scope easily
        const d = new Date(todayKey);
        d.setDate(d.getDate() - i);
        const dKey = d.toISOString().split('T')[0];
        
        const snapshot = Array.isArray(this.data.questHistory?.[dKey]) ? this.data.questHistory[dKey] : [];
        for (const task of snapshot) {
            if (task.completed && task.pattern) {
                patternHistory[task.pattern] = (patternHistory[task.pattern] || 0) + 1;
            }
        }
    }
    return patternHistory;
  }


  getDailyQuests(options = {}) {
    if (!this.data.goalId && !options.intelligenceOverride) return [];

    const intelligence = options.intelligenceOverride || this.getCareerIntelligence(options);
    if (!intelligence) return [];

    const today = this._resolveDateKey(options);
    const timeBudget = this.getUserTimeBudget();

    const preRecoveryState = this.getRecoveryState({ ...options, currentDate: today });
    if (!preRecoveryState.recoveryMode) {
      this._applyPenaltyIfNeeded(today);
    }

    const recoveryState = this.getRecoveryState({ ...options, currentDate: today });

    const progressState = safeObject(intelligence.progressState);
    const hasFragile = Object.values(progressState).some(state => normalizeState(state) === 'fragile');
    const completionCtx = this._getCompletionContext(today);
  const confidenceProgression = this._getConfidenceProgression(today, completionCtx);
  const weeklyInsights = this._getWeeklyInsights();
    const burnoutState = this.getBurnoutState(options);
    const momentumState = this.getMomentumState(options);
    const patternHistory = this._getPatternHistory(today);

    const profiles = CATEGORY_ORDER
      .map((categoryKey, index) => ({
        categoryKey,
        state: normalizeState(progressState[categoryKey]),
        order: index
      }))
      .sort((a, b) => {
        const aPriority = STATE_PRIORITY[a.state] ?? 9;
        const bPriority = STATE_PRIORITY[b.state] ?? 9;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aBias = getGoalBias(this.data.goalId, a.categoryKey);
        const bBias = getGoalBias(this.data.goalId, b.categoryKey);
        if (aBias !== bBias) return aBias - bBias;
        return a.order - b.order;
      });

    const dsaSolvedSet = new Set(
      Object.entries(safeObject(completionCtx.dsaProgress))
        .filter(([, entry]) => entry?.status === 'solved')
        .map(([problemId]) => problemId)
    );
    const sqlSolvedSet = new Set(
      Object.entries(safeObject(completionCtx.sqlProgress))
        .filter(([, entry]) => entry?.status === 'solved')
        .map(([problemId]) => problemId)
    );

    const usedRefs = {
      dsaSolvedSet,
      sqlSolvedSet,
      usedDsaProblemIds: new Set(),
      usedSqlProblemIds: new Set(),
      usedInterviewQuestionIds: new Set()
    };

    const tasks = [];
    const taskIds = new Set();
    const taskRoutes = new Set();

    const pushTask = (task) => {
      if (!task || taskIds.has(task.id) || taskRoutes.has(task.route)) return false;
      const enriched = this._buildTaskPressure(task, completionCtx, {
        overdue: !!task.overdue,
        urgencyBoost: Number(task.carryForwardBoost || 0),
        weeklyUrgencyDelta: Number(weeklyInsights.urgencyDelta || 0)
      });
      enriched.completed = this._isTaskCompleted(enriched, completionCtx);
      tasks.push(enriched);
      taskIds.add(enriched.id);
      taskRoutes.add(enriched.route);
      return true;
    };

    const overdueCarry = this._buildOverdueCarryTasks(today, completionCtx)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    overdueCarry.forEach(task => pushTask(task));

    for (const profile of profiles) {
      const slots = this._getSlotCountForState(profile.state, hasFragile);
      if (slots <= 0) continue;
      const candidates = this._buildCategoryTasks(
        profile.categoryKey,
        profile.state,
        intelligence,
        usedRefs,
        completionCtx,
        confidenceProgression
      );
      let consumed = 0;
      for (const candidate of candidates) {
        if (consumed >= slots) break;
        if (pushTask(candidate)) consumed += 1;
      }
      if (tasks.length >= DEFAULT_TASK_CAP + 3) break;
    }

    const minimumBaseline = recoveryState.recoveryMode ? 2 : 3;
    if (tasks.length < minimumBaseline) {
      for (const profile of profiles) {
        const maintenance = this._buildLearningTask(profile.categoryKey, profile.state);
        if (pushTask(maintenance) && tasks.length >= minimumBaseline) {
          break;
        }
      }
    }


    
    const burnoutStateLocal = burnoutState;
    if (burnoutStateLocal.burnout) {
       // Burnout: 80% Easy, 20% Medium
       let easyCount = 0;
       let totalBurnoutTasks = tasks.length;
       const targetEasy = Math.ceil(totalBurnoutTasks * 0.8);
       
       tasks.forEach(t => {
          if (t.difficulty === 'Hard') t.difficulty = 'Medium';
          if (easyCount < targetEasy) {
              t.difficulty = 'Easy';
              easyCount++;
          } else {
              t.difficulty = 'Medium';
          }
       });
    }
    if (momentumState.momentumBoost) {
       // Momentum: allow Hard, increase Medium proportion
       // This is naturally allowed as we don't cap it here, but we can set the flag
       tasks.forEach(t => { 
           t.momentumBoost = true; 
           if (t.difficulty === 'Easy' && (t.priorityValue > 5 || t.momentumBoost)) {
               t.difficulty = 'Medium';
           }
       });
    }
    
    
    const mastery = this.getPatternMastery();
    const advancedInsights = this.getAdvancedWeeklyInsights();
    
    tasks.forEach(t => {
        const m = mastery[t.pattern];
        if (m) {
            if (m.masteryScore < 0.4) {
                t.urgency = (t.urgency || 1) + 2;
                if (t.difficulty === 'Hard') t.difficulty = 'Medium';
                else if (t.difficulty === 'Medium') t.difficulty = 'Easy';
            } else if (m.masteryScore > 0.8) {
                t.urgency = Math.max(1, (t.urgency || 1) - 1);
            }
        }
        if (t.pattern === advancedInsights.mostWeakPattern) t.urgency = (t.urgency || 1) + 2;
        if (t.pattern === advancedInsights.strongestPattern) t.urgency = Math.max(1, (t.urgency || 1) - 2);
    });

    if (patternHistory) {
       // Pattern loop prevention
       tasks.forEach(t => {
          if (t.pattern && patternHistory[t.pattern] >= 2) {
              t.urgency = Math.max(1, (t.urgency || 1) - 2); // reduce priority
          }
       });
    }

    const prioritized = this._sortTasksByPriority(
      tasks.map(task => this._withTaskPriority(task)),
      timeBudget
    );

    const budgetPoints = this._getBudgetPointsForTimeBudget(timeBudget);
    const recoveryMaxTasks = recoveryState.recoveryMode ? RECOVERY_TASK_CAP : (burnoutState.burnout ? 4 : Number.POSITIVE_INFINITY);
    const recoveryMinTasks = recoveryState.recoveryMode ? 2 : 0;

    let scoped = prioritized;
    if (timeBudget === 15) {
      scoped = prioritized.filter(task => this._isQuickTask(task));
    }

    if (recoveryState.recoveryMode) {
      scoped = this._selectRecoveryTasks(scoped, intelligence, RECOVERY_TASK_CAP);
    }

    const selected = [];
    const selectedIds = new Set();
    let pointsUsed = 0;
    const pushSelected = (task) => {
      if (!task || selectedIds.has(task.id)) return false;
      if (selected.length >= recoveryMaxTasks) return false;
      const weight = this._getTaskWeight(task);
      if (pointsUsed + weight > budgetPoints) return false;
      selected.push(task);
      selectedIds.add(task.id);
      pointsUsed += weight;
      return true;
    };

    for (const task of scoped) {
      if (selected.length >= recoveryMaxTasks || pointsUsed >= budgetPoints) break;
      pushSelected(task);
    }

    if (selected.length < recoveryMinTasks) {
      const fallbackPool = timeBudget === 15
        ? prioritized.filter(task => this._isQuickTask(task))
        : prioritized;

      for (const task of fallbackPool) {
        if (selected.length >= recoveryMinTasks || selected.length >= recoveryMaxTasks || pointsUsed >= budgetPoints) break;
        if (recoveryState.recoveryMode && !(
          this._isWeakAreaTask(task, intelligence)
          || this._isEasyCompletionTask(task)
        )) {
          continue;
        }
        pushSelected(task);
      }
    }

    const finalTasks = this._sortTasksByPriority(selected, timeBudget);

    const overdueCount = finalTasks.filter(task => task.overdue && !task.completed).length;
    const backlogCount = Math.max(0, Number(this.data.backlogCount || 0));
    const yesterdayKey = this._getYesterdayKey(today);
    const overdueFromYesterday = safeArray(this.data.questHistory?.[yesterdayKey])
      .filter(task => !task.completed)
      .length;
    const streakRisk = overdueCount > 0 || overdueFromYesterday > 0 || backlogCount > 0;
    const recoveryMode = backlogCount >= 3 || streakRisk;
    const pressureSnapshot = {
      date: today,
      overdueCount,
      backlogCount,
      streakRisk,
      recoveryMode,
      recoveryReason: recoveryMode ? (backlogCount >= 3 ? 'backlog' : 'streak_risk') : null
    };
    let shouldSave = false;
    if (JSON.stringify(this.data.pressureSnapshot) !== JSON.stringify(pressureSnapshot)) {
      this.data.pressureSnapshot = pressureSnapshot;
      shouldSave = true;
    }

    if (this._updateWeeklyStats(today, finalTasks)) {
      shouldSave = true;
    }

    if (shouldSave) this._save();

    
    if (!this.data.logs) this.data.logs = { dailyDecisions: [], userActions: [], dailySummary: [] };
    if (!this.data.logs.dailyDecisions) this.data.logs.dailyDecisions = [];
    
    this.data.logs.dailyDecisions = this.data.logs.dailyDecisions.filter(d => d.date !== today);
    
    finalTasks.forEach(t => {
       this.data.logs.dailyDecisions.push({
          date: today,
          taskId: t.id,
          category: t.category,
          difficulty: t.difficulty,
          pattern: t.pattern,
          priorityValue: t.priorityValue,
          reason: t.reason,
          flags: {
             recoveryMode: recoveryState.recoveryMode,
             burnout: burnoutStateLocal.burnout,
             momentum: momentumState.momentumBoost,
             confidenceBoost: !!t.confidenceBoost
          },
          timestamp: new Date().toISOString()
       });
    });

    this._persistQuestSnapshot(today, finalTasks);
    return finalTasks;
  }

  // Backward-compatible API
  getDailyTasks(options = {}) {
    return this.getDailyQuests(options);
  }

  getPressureState(options = {}) {
    const today = this._resolveDateKey(options);
    const yesterday = this._getYesterdayKey(today);
    const yesterdaySnapshot = safeArray(this.data.questHistory?.[yesterday]);
    const overdueFromYesterday = yesterdaySnapshot.filter(task => !task.completed).length;
    const backlogCount = Math.max(0, Number(this.data.backlogCount || 0));
    const overdueToday = Number(this.data.pressureSnapshot?.date === today
      ? this.data.pressureSnapshot?.overdueCount || 0
      : 0);
    const streakRisk = overdueToday > 0 || overdueFromYesterday > 0 || backlogCount > 0;

    return {
      backlogCount,
      overdueFromYesterday,
      overdueToday,
      streakRisk,
      lastPenaltyDate: this.data.penalties?.lastAppliedForDate || null
    };
  }

  getRecoveryState(options = {}) {
    const dateKey = this._resolveDateKey(options);
    const pressure = this.getPressureState({ ...options, currentDate: dateKey });
    const backlogCount = Math.max(0, Number(pressure.backlogCount || 0));
    const streakRisk = !!pressure.streakRisk;
    const completionCtx = this._getCompletionContext(dateKey);
    const completedTasksToday = this._getCompletedTasksTodayCount(dateKey, completionCtx);

    const burnoutState = this.getBurnoutState(options);
    let recoveryMode = backlogCount >= 3 || streakRisk || burnoutState.burnout;
    if (recoveryMode && completedTasksToday >= 2) {
      recoveryMode = false;
    }

    return {
      recoveryMode,
      reason: recoveryMode ? (backlogCount >= 3 ? 'backlog' : 'streak_risk') : null
    };
  }

  getNextAction(options = {}) {
    if (!this.data.goalId) {
      return {
        type: 'setup',
        label: 'Select Career Goal',
        route: '#select-goal',
        reason: 'Choose a target role to generate your daily plan.',
        title: 'Select Career Goal',
        subtitle: 'Choose a target role to generate your daily plan.',
        icon: 'target',
        isGoalSelection: true
      };
    }

    const tasks = this.getDailyQuests(options);
    const candidates = tasks
      .filter(task => !task.completed)
      .map(task => {
        const priority = this._computeTaskPriority(task, false);
        return { task, priority };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (Boolean(a.task.overdue) !== Boolean(b.task.overdue)) return a.task.overdue ? -1 : 1;
        const pa = Number(a.task.priorityRank ?? 9);
        const pb = Number(b.task.priorityRank ?? 9);
        if (pa !== pb) return pa - pb;
        return String(a.task.id).localeCompare(String(b.task.id));
      });

    const nextTaskWrap = candidates[0];
    const nextTask = nextTaskWrap?.task;

    if (nextTask) {
      return {
        type: nextTask.type,
        label: nextTask.label || nextTask.title,
        route: nextTask.route,
        reason: nextTask.reason || nextTask.subtitle || '',
        title: nextTask.label || nextTask.title,
        subtitle: nextTask.subtitle || nextTask.reason || '',
        icon: nextTask.icon || 'target',
        state: nextTask.state,
        category: nextTask.category,
        urgency: Number(nextTask.urgency || 1),
        overdue: !!nextTask.overdue,
        failureCount: Number(nextTask.failureCount || 0),
        priority: Number(nextTaskWrap?.priority || 0),
        priorityValue: Number(nextTask.priorityValue || nextTaskWrap?.priority || 0),
        confidenceBoost: !!nextTask.confidenceBoost,
        adaptiveDifficulty: !!nextTask.adaptiveDifficulty
      };
    }

    return {
      type: 'complete',
      label: 'Mission Complete',
      route: '/problems',
      reason: "You cleared today's dynamic quests. Continue with optional practice.",
      title: 'Mission Complete',
      subtitle: "You cleared today's tasks! Come back tomorrow or do extra practice.",
      icon: 'check-circle-2',
      isComplete: true
    };
  }

  // UNIFIED STREAK
  checkAndUpdateUnifiedStreak() {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();

    if (this.data.history[today]) {
      return; // already recorded today
    }

    const tasks = this.getDailyQuests();
    const allCompleted = tasks.length > 0 && tasks.every(task => task.completed);

    if (allCompleted) {
      this.data.history[today] = true;

      if (this.data.streak.lastActiveDate === yesterday) {
        this.data.streak.current += 1;
      } else if (this.data.streak.lastActiveDate !== today) {
        this.data.streak.current = 1;
      }

      this.data.streak.lastActiveDate = today;
      if (this.data.streak.current > this.data.streak.longest) {
        this.data.streak.longest = this.data.streak.current;
      }

      this._save();
    }
  }

  getUnifiedStreak() {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    let current = this.data.streak.current;

    if (this.data.streak.lastActiveDate !== today && this.data.streak.lastActiveDate !== yesterday) {
      current = 0;
    }

    return {
      current,
      longest: this.data.streak.longest,
      lastActiveDate: this.data.streak.lastActiveDate
    };
  }
}

export const careerEngine = new CareerEngine();
