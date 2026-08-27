// ============================================
// ROBINHOOD STATE MANAGEMENT
// Reactive store with localStorage persistence
// ============================================

import { ACHIEVEMENT_DEFS, computeAchievementProgress, evaluateAchievements } from './data/achievements.js';
import { getAllProblems } from './utils/problems-cache.js';

// -----------------------------------------------------------------------------
// Phase A migration note (Apr 2026):
// Previously imported `allProblems` from `./data/problems.js` (static) and
// `CATEGORIES` from `./data/categories.js` (legacy 26-entry palette). All
// mastery / weak-area / recommendation methods now read from the DB-backed
// cache via `getAllProblems()`. CATEGORIES is no longer referenced because
// the cache groups by `problem.topic.slug` directly — the canonical taxonomy.
// `getCategoryMastery()` derives its color from a stable palette keyed by
// topic-slug ordinal so the dashboard widget keeps looking colourful without
// re-introducing the static dependency.
// -----------------------------------------------------------------------------
const MASTERY_COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
];
function colorForTopicSlug(slug, index) {
  if (typeof index === 'number' && index >= 0) {
    return MASTERY_COLOR_PALETTE[index % MASTERY_COLOR_PALETTE.length];
  }
  let hash = 0;
  const s = String(slug || '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return MASTERY_COLOR_PALETTE[Math.abs(hash) % MASTERY_COLOR_PALETTE.length];
}

const STORAGE_KEY = 'robinhood_data';

const DEFAULT_STATE = {
  user: null,
  progress: {},
  streaks: {
    current: 0,
    longest: 0,
    lastActiveDate: null,
    shieldAvailable: true,
    history: {}
  },
  xp: { total: 0, level: 1, title: 'Novice' },
  achievements: [],
  bookmarks: [],
  customLists: {},
  preferences: {
    theme: 'dark',
    timerDefault: 25,
    pomodoroWork: 25,
    pomodoroBreak: 5,
    soundEnabled: true,
    sidebarCollapsed: false
  },
  timerState: {
    visible: false,
    isRunning: false,
    mode: 'manual',
    remaining: 0,
    endsAt: null
  },
  dailySystem: {
    goals: {
      problems: 3,
      interviews: 1,
    },
    activityByDate: {},
    goalStreak: {
      current: 0,
      longest: 0,
      lastGoalDate: null,
    },
    masterySnapshots: {},
    performanceByProblem: {},
    interviewSessions: {},
  },
  learnerProfile: null,
  problemNotes: {},
  dailyChallengeCompleted: {}
};

const LEVEL_TITLES = [
  'Novice', 'Beginner', 'Learner', 'Apprentice', 'Explorer',
  'Solver', 'Adept', 'Skilled', 'Proficient', 'Competent',
  'Warrior', 'Fighter', 'Challenger', 'Contender', 'Raider',
  'Striker', 'Champion', 'Elite', 'Master', 'Virtuoso',
  'Expert', 'Sage', 'Wizard', 'Legend', 'Mythic',
  'Titan', 'Conqueror', 'Overlord', 'Supreme', 'Ascendant',
  'Hero', 'Demigod', 'Immortal', 'Transcendent', 'Celestial',
  'Cosmic', 'Infinite', 'Eternal', 'Godlike', 'Omniscient',
  'Apex', 'Zenith', 'Pinnacle', 'Paragon', 'Sovereign',
  'Emperor', 'Architect', 'Creator', 'Grandmaster', 'Beyond'
];

const XP_PER_LEVEL = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateKey(value = new Date()) {
  return new Date(value).toISOString().split('T')[0];
}

function toDateMs(dateKey) {
  return Date.parse(`${dateKey}T00:00:00Z`);
}

function getDefaultDailyActivity() {
  return {
    problemsSolved: 0,
    interviewsCompleted: 0,
    solvedImprovementSum: 0,
    solvedEvents: 0,
    masteryPct: 0,
    readinessPct: 0,
  };
}

function normalizeDailySystem(value = {}) {
  const incoming = value && typeof value === 'object' ? value : {};
  const defaults = DEFAULT_STATE.dailySystem;
  return {
    ...defaults,
    ...incoming,
    goals: {
      ...defaults.goals,
      ...(incoming.goals || {}),
    },
    activityByDate: { ...(incoming.activityByDate || {}) },
    goalStreak: {
      ...defaults.goalStreak,
      ...(incoming.goalStreak || {}),
    },
    masterySnapshots: { ...(incoming.masterySnapshots || {}) },
    performanceByProblem: { ...(incoming.performanceByProblem || {}) },
    interviewSessions: { ...(incoming.interviewSessions || {}) },
  };
}

function isDailyGoalMet(activity = {}, goals = {}) {
  const solved = Number(activity.problemsSolved || 0);
  const interviews = Number(activity.interviewsCompleted || 0);
  const targetProblems = Math.max(0, Number(goals.problems || 0));
  const targetInterviews = Math.max(0, Number(goals.interviews || 0));
  return solved >= targetProblems && interviews >= targetInterviews;
}

function computeGoalStreak(activityByDate = {}, goals = {}) {
  const metDates = Object.keys(activityByDate)
    .filter((dateKey) => isDailyGoalMet(activityByDate[dateKey], goals))
    .sort((a, b) => toDateMs(a) - toDateMs(b));

  if (!metDates.length) {
    return {
      current: 0,
      longest: 0,
      lastGoalDate: null,
    };
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < metDates.length; i += 1) {
    const isConsecutive = toDateMs(metDates[i]) - toDateMs(metDates[i - 1]) === MS_PER_DAY;
    run = isConsecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = toDateKey();
  let current = 0;
  let cursor = today;
  while (activityByDate[cursor] && isDailyGoalMet(activityByDate[cursor], goals)) {
    current += 1;
    cursor = toDateKey(toDateMs(cursor) - MS_PER_DAY);
  }

  return {
    current,
    longest,
    lastGoalDate: metDates[metDates.length - 1],
  };
}

function summarizeWeekActivity(activityByDate = {}, goals = {}, weekOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday - (Number(weekOffset || 0) * 7));

  let solved = 0;
  let interviews = 0;
  let solvedEvents = 0;
  let solvedImprovementSum = 0;
  let goalHitDays = 0;
  let activeDays = 0;

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateKey = toDateKey(date);
    const activity = {
      ...getDefaultDailyActivity(),
      ...(activityByDate[dateKey] || {}),
    };

    const daySolved = Number(activity.problemsSolved || 0);
    const dayInterviews = Number(activity.interviewsCompleted || 0);

    solved += daySolved;
    interviews += dayInterviews;
    solvedEvents += Number(activity.solvedEvents || 0);
    solvedImprovementSum += Number(activity.solvedImprovementSum || 0);
    if (isDailyGoalMet(activity, goals)) {
      goalHitDays += 1;
    }
    if (daySolved > 0 || dayInterviews > 0) {
      activeDays += 1;
    }
  }

  return {
    solved,
    interviews,
    goalHitDays,
    activeDays,
    consistencyPct: Math.round((activeDays / 7) * 100),
    avgSolveImprovementPct: solvedEvents ? Math.round((solvedImprovementSum / solvedEvents) * 10) / 10 : 0,
  };
}

function computeDeltaPct(current = 0, previous = 0) {
  const safeCurrent = Number(current || 0);
  const safePrevious = Number(previous || 0);
  if (safePrevious <= 0) {
    return safeCurrent > 0 ? 100 : 0;
  }
  return Math.round(((safeCurrent - safePrevious) / safePrevious) * 100);
}

class Store {
  constructor() {
    this.state = this.loadState();
    this.listeners = new Map();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            ...DEFAULT_STATE,
            ...parsed,
            preferences: { ...DEFAULT_STATE.preferences, ...(parsed.preferences || {}) },
            timerState: { ...DEFAULT_STATE.timerState, ...(parsed.timerState || {}) },
            dailySystem: normalizeDailySystem(parsed.dailySystem),
            learnerProfile: parsed.learnerProfile && typeof parsed.learnerProfile === 'object'
              ? parsed.learnerProfile
              : null,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
    return { ...DEFAULT_STATE };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  get(key) {
    return key ? this.state[key] : this.state;
  }

  set(key, value) {
    this.state[key] = value;
    this.saveState();
    this.emit(key, value);
    this.emit('*', this.state);
  }

  update(key, updater) {
    const current = this.state[key];
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    this.set(key, next);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch(e) { console.error('Listener error:', e); }
    });
  }

  // --- Auth ---
  isAuthenticated() {
    return !!this.state.user;
  }

  login(name, email) {
    const user = {
      id: crypto.randomUUID?.() || Date.now().toString(36),
      name,
      email,
      joinDate: new Date().toISOString().split('T')[0]
    };
    this.set('user', user);
    this.updateStreak();
    return user;
  }

  // New method for session-based login
  loginWithSession(user, sessionToken) {
    const fullUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      joinDate: new Date().toISOString().split('T')[0]
    };
    this.set('user', fullUser);
    this.set('sessionToken', sessionToken);
    return fullUser;
  }

  getSessionToken() {
    return this.state.sessionToken || null;
  }

  // Check session validity with server
  async validateSession() {
    const token = this.getSessionToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        // Update user data from server
        this.set('user', {
          ...this.state.user,
          ...data.user,
          joinDate: this.state.user?.joinDate || new Date().toISOString().split('T')[0]
        });
        return true;
      } else {
        // Session invalid, clear local state
        this.logout();
        return false;
      }
    } catch (error) {
      console.warn('Session validation failed:', error);
      return !!this.state.user; // Fall back to local state
    }
  }

  logout() {
    const token = this.getSessionToken();
    
    // Call logout API if we have a session
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {}); // Fire and forget
    }
    
    this.set('user', null);
    this.set('sessionToken', null);
  }

  // --- Streak ---
  getDayNumber() {
    if (!this.state.user?.joinDate) return 1;
    const join = new Date(this.state.user.joinDate);
    const today = new Date();
    const diff = Math.floor((today - join) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const streaks = { ...this.state.streaks };
    
    if (streaks.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streaks.lastActiveDate === yesterdayStr) {
      streaks.current += 1;
    } else if (streaks.lastActiveDate && streaks.lastActiveDate !== today) {
      if (streaks.shieldAvailable) {
        streaks.shieldAvailable = false;
      } else {
        streaks.current = 1;
      }
    } else {
      streaks.current = 1;
    }

    streaks.lastActiveDate = today;
    streaks.longest = Math.max(streaks.longest, streaks.current);
    streaks.history = { ...streaks.history, [today]: 0 };

    this.set('streaks', streaks);
  }

  // --- Problem Progress ---
  solveProblem(problemId, difficulty, data = {}) {
    const progress = { ...this.state.progress };
    const wasAlreadySolved = progress[problemId]?.status === 'solved';

    progress[problemId] = {
      status: 'solved',
      solvedDate: new Date().toISOString().split('T')[0],
      lastRevisedAt: progress[problemId]?.lastRevisedAt || null,
      nextRevisionDate: progress[problemId]?.nextRevisionDate || null,
      revisionIntervalDays: progress[problemId]?.revisionIntervalDays || 3,
      timeSpent: data.timeSpent || 0,
      language: data.language || 'javascript',
      code: data.code || '',
      notes: data.notes || progress[problemId]?.notes || '',
      difficulty
    };
    this.set('progress', progress);

    if (wasAlreadySolved && data?.countAsSolve) {
      this.updateStreak();
      const today = new Date().toISOString().split('T')[0];
      const streaks = { ...this.state.streaks };
      streaks.history[today] = (streaks.history[today] || 0) + 1;
      this.set('streaks', streaks);
      this.recordProblemSolve({
        improvementPct: Number(data?.improvementPct || 0),
      });
    }

    if (!wasAlreadySolved) {
      this.updateStreak();

      // Add XP
      const xpGain = difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 25 : 50;
      this.addXP(xpGain);

      // Update streak history
      const today = new Date().toISOString().split('T')[0];
      const streaks = { ...this.state.streaks };
      streaks.history[today] = (streaks.history[today] || 0) + 1;
      this.set('streaks', streaks);

      this.recordProblemSolve({
        improvementPct: Number(data?.improvementPct || 0),
      });

      // Check achievements
      this.checkAchievements();
    }
  }

  markProblem(problemId, status) {
    const progress = { ...this.state.progress };
    progress[problemId] = { ...progress[problemId], status };
    this.set('progress', progress);
  }

  getProblemStatus(problemId) {
    return this.state.progress[problemId]?.status || null;
  }

  setRevisionFeedback(problemId, outcome = 'got_it') {
    const progress = { ...this.state.progress };
    const current = progress[problemId] || {};
    const today = new Date();
    const interval = outcome === 'need_practice'
      ? 1
      : Math.min((Number(current.revisionIntervalDays) || 3) + 2, 14);
    const next = new Date(today);
    next.setDate(next.getDate() + interval);

    progress[problemId] = {
      ...current,
      lastRevisedAt: today.toISOString().split('T')[0],
      nextRevisionDate: next.toISOString().split('T')[0],
      revisionIntervalDays: interval,
      revisionOutcome: outcome,
    };
    this.set('progress', progress);
  }

  getRevisionMeta(problemId) {
    return this.state.progress[problemId] || {};
  }

  getSolvedCount() {
    return Object.values(this.state.progress).filter(p => p.status === 'solved').length;
  }

  getSolvedByDifficulty() {
    const solved = Object.values(this.state.progress).filter(p => p.status === 'solved');
    return {
      Easy: solved.filter(p => p.difficulty === 'Easy').length,
      Medium: solved.filter(p => p.difficulty === 'Medium').length,
      Hard: solved.filter(p => p.difficulty === 'Hard').length
    };
  }

  getMasteryPercent() {
    const totals = getAllProblems().reduce((acc, problem) => {
      const difficulty = String(problem?.difficulty || 'Easy');
      if (!acc[difficulty]) acc[difficulty] = 0;
      acc[difficulty] += 1;
      return acc;
    }, { Easy: 0, Medium: 0, Hard: 0 });

    const solved = this.getSolvedByDifficulty();
    const difficultyWeight = { Easy: 1, Medium: 1.5, Hard: 2 };

    const weightedTotal = Object.entries(totals)
      .reduce((sum, [difficulty, count]) => sum + (count * (difficultyWeight[difficulty] || 1)), 0);
    if (!weightedTotal) return 0;

    const weightedSolved = Object.entries(solved)
      .reduce((sum, [difficulty, count]) => sum + (count * (difficultyWeight[difficulty] || 1)), 0);

    return Math.round((weightedSolved / weightedTotal) * 100);
  }

  getCategoryMastery() {
    // Derive categories from the DB-backed cache. Each row exposes
    // `problem.topic` ({ id, slug, name }) which is the canonical taxonomy.
    // We group by `topic.slug`, preserve the order of first-appearance, and
    // assign a stable palette color so the dashboard widget remains visual.
    const progress = this.state.progress || {};
    const groups = new Map();
    for (const problem of getAllProblems()) {
      const slug = problem?.topic?.slug;
      if (!slug) continue;
      let group = groups.get(slug);
      if (!group) {
        group = {
          id: slug,
          name: problem.topic.name || slug,
          color: colorForTopicSlug(slug, groups.size),
          items: [],
        };
        groups.set(slug, group);
      }
      group.items.push(problem);
    }
    const result = [];
    for (const group of groups.values()) {
      const solved = group.items.filter((p) => progress[p.id]?.status === 'solved').length;
      const total = group.items.length;
      const pct = total ? Math.round((solved / total) * 100) : 0;
      result.push({ id: group.id, name: group.name, color: group.color, solved, total, pct });
    }
    return result.filter((item) => item.total > 0);
  }

  getWeakAreas(limit = 3) {
    const safeLimit = Math.max(1, Number(limit) || 3);
    return this.getCategoryMastery()
      .sort((a, b) => a.pct - b.pct)
      .slice(0, safeLimit);
  }

  getGlobalProgressSnapshot() {
    const solved = this.getSolvedCount();
    const totalProblems = getAllProblems().length;
    const solvedPct = totalProblems ? Math.round((solved / totalProblems) * 100) : 0;
    const masteryPct = this.getMasteryPercent();
    const readiness = this.getReadinessScore();
    const streak = Number(this.state.streaks?.current || 0);
    const dailyGoal = this.getDailyGoalSnapshot();

    return {
      solved,
      totalProblems,
      solvedPct,
      streak,
      masteryPct,
      readiness,
      goalStreak: Number(dailyGoal?.streak?.current || 0),
      dailyGoalPct: Number(dailyGoal?.totalPct || 0),
      momentumLabel: readiness >= 75 ? 'Interview Ready' : readiness >= 50 ? 'Rising Fast' : 'On Track',
    };
  }

  getPersonalizedRecommendations() {
    // Sources problems from the cache; matches the weak-area key against
    // `problem.topic.slug` (the cache's grouping key, which matches the IDs
    // emitted by getCategoryMastery() above).
    const progress = this.state.progress || {};
    const weakAreas = this.getWeakAreas(3);
    const readiness = this.getReadinessScore();
    const solvedByDifficulty = this.getSolvedByDifficulty();
    const allProblemsRef = getAllProblems();
    const unsolved = allProblemsRef.filter((problem) => progress[problem.id]?.status !== 'solved');

    const primaryWeak = weakAreas[0] || null;
    const weakProblems = primaryWeak
      ? unsolved.filter((problem) => problem?.topic?.slug === primaryWeak.id)
      : unsolved;
    const nextProblem = weakProblems[0] || unsolved[0] || allProblemsRef[0] || null;

    const mediumHardSolved = Number(solvedByDifficulty.Medium || 0) + Number(solvedByDifficulty.Hard || 0);
    const needsSqlFocus = weakAreas.some((area) => /sql|design/i.test(area.id));

    const moduleRoute = needsSqlFocus
      ? '/sql-track?level=Beginner'
      : mediumHardSolved < 40
        ? '/sheets?sheet=75'
        : '/interview/mock?type=technical&difficulty=medium';

    const moduleLabel = needsSqlFocus
      ? 'SQL Track Boost'
      : mediumHardSolved < 40
        ? 'Coding Sheets Sprint'
        : 'Interview Simulation';

    const interviewDifficulty = readiness < 45 ? 'easy' : readiness < 70 ? 'medium' : 'hard';

    return {
      weakAreas,
      recommendations: [
        {
          key: 'next-problem',
          title: nextProblem ? `Next Problem: ${nextProblem.title}` : 'Open Problems Board',
          subtitle: primaryWeak ? `Weak area focus: ${primaryWeak.name}` : 'Continue from your unsolved queue',
          route: nextProblem ? `/problem/${nextProblem.id}` : '/problems',
          badge: nextProblem?.difficulty || 'Practice',
          progress: primaryWeak ? primaryWeak.pct : 0,
        },
        {
          key: 'module-focus',
          title: moduleLabel,
          subtitle: needsSqlFocus
            ? 'Build query confidence and pattern speed.'
            : mediumHardSolved < 40
              ? 'Raise medium/hard consistency with structured sheets.'
              : 'Pressure-test communication and reasoning.',
          route: moduleRoute,
          badge: 'Recommended',
          progress: readiness,
        },
        {
          key: 'interview-readiness',
          title: 'Interview Readiness Drill',
          subtitle: `Run a ${interviewDifficulty} technical mock and review feedback loops.`,
          route: `/interview/mock?type=technical&difficulty=${interviewDifficulty}&mode=placement`,
          badge: 'Readiness',
          progress: readiness,
        },
      ],
    };
  }

  getDailySystemState() {
    return normalizeDailySystem(this.state.dailySystem);
  }

  updateDailySystem(updater) {
    const current = this.getDailySystemState();
    const draft = typeof updater === 'function'
      ? updater(current)
      : { ...current, ...(updater || {}) };
    const next = normalizeDailySystem(draft);
    this.set('dailySystem', next);
    return next;
  }

  getDailyGoalSnapshot(referenceDate = new Date()) {
    const daily = this.getDailySystemState();
    const dateKey = toDateKey(referenceDate);
    const todayActivity = {
      ...getDefaultDailyActivity(),
      ...(daily.activityByDate[dateKey] || {}),
    };
    const goals = {
      problems: Math.max(1, Number(daily.goals?.problems || 3)),
      interviews: Math.max(0, Number(daily.goals?.interviews || 1)),
    };

    const problemsPct = Math.min(100, Math.round((todayActivity.problemsSolved / goals.problems) * 100));
    const interviewsPct = goals.interviews
      ? Math.min(100, Math.round((todayActivity.interviewsCompleted / goals.interviews) * 100))
      : 100;
    const complete = isDailyGoalMet(todayActivity, goals);

    return {
      dateKey,
      goals,
      today: todayActivity,
      complete,
      problemsRemaining: Math.max(0, goals.problems - Number(todayActivity.problemsSolved || 0)),
      interviewsRemaining: Math.max(0, goals.interviews - Number(todayActivity.interviewsCompleted || 0)),
      problemsPct,
      interviewsPct,
      totalPct: Math.round((problemsPct + interviewsPct) / 2),
      streak: {
        current: Number(daily.goalStreak?.current || 0),
        longest: Number(daily.goalStreak?.longest || 0),
        lastGoalDate: daily.goalStreak?.lastGoalDate || null,
      },
    };
  }

  recordProblemSolve({ improvementPct = 0 } = {}) {
    const dateKey = toDateKey();
    const masteryPct = this.getMasteryPercent();
    const readinessPct = this.getReadinessScore();

    this.updateDailySystem((daily) => {
      const current = {
        ...getDefaultDailyActivity(),
        ...(daily.activityByDate[dateKey] || {}),
      };
      const activityByDate = {
        ...daily.activityByDate,
        [dateKey]: {
          ...current,
          problemsSolved: Number(current.problemsSolved || 0) + 1,
          solvedImprovementSum: Number(current.solvedImprovementSum || 0) + Number(improvementPct || 0),
          solvedEvents: Number(current.solvedEvents || 0) + 1,
          masteryPct,
          readinessPct,
        },
      };

      return {
        ...daily,
        activityByDate,
        masterySnapshots: {
          ...daily.masterySnapshots,
          [dateKey]: masteryPct,
        },
        goalStreak: computeGoalStreak(activityByDate, daily.goals),
      };
    });
  }

  recordInterviewCompletion({ score = 0 } = {}) {
    const dateKey = toDateKey();

    this.updateStreak();
    const streaks = { ...this.state.streaks };
    streaks.history[dateKey] = (streaks.history[dateKey] || 0) + 1;
    this.set('streaks', streaks);

    this.updateDailySystem((daily) => {
      const current = {
        ...getDefaultDailyActivity(),
        ...(daily.activityByDate[dateKey] || {}),
      };
      const activityByDate = {
        ...daily.activityByDate,
        [dateKey]: {
          ...current,
          interviewsCompleted: Number(current.interviewsCompleted || 0) + 1,
          readinessPct: this.getReadinessScore(),
          masteryPct: this.getMasteryPercent(),
          lastInterviewScore: Number(score || 0),
        },
      };

      return {
        ...daily,
        activityByDate,
        interviewSessions: {
          ...daily.interviewSessions,
          [dateKey]: Number(daily.interviewSessions?.[dateKey] || 0) + 1,
        },
        goalStreak: computeGoalStreak(activityByDate, daily.goals),
      };
    });
  }

  recordSubmissionResult(problemId, { passed = 0, total = 0, mode = 'submit' } = {}) {
    if (!problemId) {
      return {
        passPct: 0,
        improvementPct: 0,
        bestPassPct: 0,
        attempts: 0,
      };
    }

    const safePassed = Math.max(0, Number(passed || 0));
    const rawTotal = Number(total || 0);
    const safeTotal = rawTotal > 0 ? rawTotal : Math.max(safePassed, 1);
    const passPct = Math.max(0, Math.min(100, Math.round((safePassed / safeTotal) * 100)));
    const dateKey = toDateKey();

    let summary = {
      passPct,
      improvementPct: passPct,
      bestPassPct: passPct,
      attempts: 1,
    };

    this.updateDailySystem((daily) => {
      const performanceByProblem = { ...daily.performanceByProblem };
      const previous = performanceByProblem[problemId] || {
        attempts: 0,
        bestPassPct: 0,
        lastPassPct: 0,
        improvementPct: 0,
        history: [],
      };

      const prevBest = Number(previous.bestPassPct || 0);
      const improvementPct = passPct - prevBest;
      const bestPassPct = Math.max(prevBest, passPct);
      const history = Array.isArray(previous.history) ? [...previous.history] : [];
      history.push({
        date: dateKey,
        mode,
        passed: safePassed,
        total: safeTotal,
        passPct,
        improvementPct,
      });

      const nextEntry = {
        ...previous,
        attempts: Number(previous.attempts || 0) + 1,
        bestPassPct,
        lastPassPct: passPct,
        improvementPct,
        history: history.slice(-24),
      };

      performanceByProblem[problemId] = nextEntry;
      summary = {
        passPct,
        improvementPct,
        bestPassPct,
        attempts: nextEntry.attempts,
      };

      return {
        ...daily,
        performanceByProblem,
      };
    });

    return summary;
  }

  getProblemPerformance(problemId) {
    const daily = this.getDailySystemState();
    return daily.performanceByProblem?.[problemId] || {
      attempts: 0,
      bestPassPct: 0,
      lastPassPct: 0,
      improvementPct: 0,
      history: [],
    };
  }

  getMasteryTrend(days = 7) {
    const safeDays = Math.max(3, Number(days || 7));
    const daily = this.getDailySystemState();
    const snapshots = daily.masterySnapshots || {};
    let lastKnown = Number(this.getMasteryPercent() || 0);
    const trend = [];

    for (let i = safeDays - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = toDateKey(date);
      const maybeSnapshot = Number(snapshots[dateKey]);
      if (Number.isFinite(maybeSnapshot)) {
        lastKnown = maybeSnapshot;
      }

      trend.push({
        date: dateKey,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: lastKnown,
      });
    }

    return trend;
  }

  getWeeklySummary() {
    const daily = this.getDailySystemState();
    const goals = daily.goals || { problems: 3, interviews: 1 };
    let solved = 0;
    let interviews = 0;
    let solvedEvents = 0;
    let solvedImprovementSum = 0;
    let goalHitDays = 0;

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = toDateKey(date);
      const activity = {
        ...getDefaultDailyActivity(),
        ...(daily.activityByDate[dateKey] || {}),
      };
      solved += Number(activity.problemsSolved || 0);
      interviews += Number(activity.interviewsCompleted || 0);
      solvedEvents += Number(activity.solvedEvents || 0);
      solvedImprovementSum += Number(activity.solvedImprovementSum || 0);
      if (isDailyGoalMet(activity, goals)) {
        goalHitDays += 1;
      }
    }

    const masteryTrend = this.getMasteryTrend(8);
    const masteryStart = Number(masteryTrend[0]?.value || 0);
    const masteryEnd = Number(masteryTrend[masteryTrend.length - 1]?.value || 0);

    return {
      solved,
      interviews,
      goalHitDays,
      avgSolveImprovementPct: solvedEvents ? Math.round((solvedImprovementSum / solvedEvents) * 10) / 10 : 0,
      masteryDelta: Math.round(masteryEnd - masteryStart),
      readiness: this.getReadinessScore(),
      consistency: this.getConsistencyScore(),
    };
  }

  getWeekOverWeekComparison() {
    const daily = this.getDailySystemState();
    const goals = daily.goals || { problems: 3, interviews: 1 };

    const thisWeek = summarizeWeekActivity(daily.activityByDate, goals, 0);
    const lastWeek = summarizeWeekActivity(daily.activityByDate, goals, 1);

    const solvedDelta = Number(thisWeek.solved || 0) - Number(lastWeek.solved || 0);
    const interviewDelta = Number(thisWeek.interviews || 0) - Number(lastWeek.interviews || 0);
    const consistencyDelta = Number(thisWeek.consistencyPct || 0) - Number(lastWeek.consistencyPct || 0);
    const goalHitDelta = Number(thisWeek.goalHitDays || 0) - Number(lastWeek.goalHitDays || 0);

    return {
      thisWeek,
      lastWeek,
      solvedDelta,
      solvedDeltaPct: computeDeltaPct(thisWeek.solved, lastWeek.solved),
      interviewDelta,
      interviewDeltaPct: computeDeltaPct(thisWeek.interviews, lastWeek.interviews),
      consistencyDelta,
      consistencyDeltaPct: computeDeltaPct(thisWeek.consistencyPct, lastWeek.consistencyPct),
      goalHitDelta,
      trendLabel: solvedDelta > 0 || consistencyDelta > 0
        ? 'Improving week over week'
        : solvedDelta < 0 || consistencyDelta < 0
          ? 'Regression risk detected'
          : 'Holding steady',
    };
  }

  getDailyEngagementSignals(referenceDate = new Date()) {
    const snapshot = this.getDailyGoalSnapshot(referenceDate);
    const now = new Date(referenceDate);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const secondsLeft = Math.max(0, Math.floor((dayEnd.getTime() - now.getTime()) / 1000));
    const hoursLeft = secondsLeft / 3600;
    const yesterdayKey = toDateKey(now.getTime() - MS_PER_DAY);
    const yesterday = {
      ...getDefaultDailyActivity(),
      ...(this.state.dailySystem?.activityByDate?.[yesterdayKey] || {}),
    };

    const missedYesterdayGoal = Boolean(
      (Number(yesterday.problemsSolved || 0) > 0 || Number(yesterday.interviewsCompleted || 0) > 0)
      && !isDailyGoalMet(yesterday, snapshot.goals)
    );

    let urgencyLevel = 'safe';
    if (snapshot.complete) {
      urgencyLevel = 'complete';
    } else if (hoursLeft <= 2) {
      urgencyLevel = 'critical';
    } else if (hoursLeft <= 6) {
      urgencyLevel = 'warning';
    }

    const missionExpiryMessage = snapshot.complete
      ? 'Mission complete. Push one extra challenge to extend your edge.'
      : urgencyLevel === 'critical'
        ? 'Mission expires very soon. Complete mandatory tasks now.'
        : urgencyLevel === 'warning'
          ? 'Mission window is shrinking. Protect today\'s streak.'
          : 'Mission is active. Build buffer before the final hours.';

    const atRiskOfBreak = !snapshot.complete && (urgencyLevel === 'warning' || urgencyLevel === 'critical');
    const lossAversionMessage = missedYesterdayGoal
      ? 'Yesterday missed target. A second miss can break momentum.'
      : atRiskOfBreak
        ? 'Unfinished mission will reduce consistency score and goal streak.'
        : '';

    const rewardMessage = snapshot.complete
      ? `Streak secured: ${Number(snapshot.streak?.current || 0)} day run is alive.`
      : '';

    return {
      ...snapshot,
      secondsLeft,
      urgencyLevel,
      missionExpiryMessage,
      atRiskOfBreak,
      missedYesterdayGoal,
      lossAversionMessage,
      rewardMessage,
      shouldCelebrate: snapshot.complete && Number(snapshot.streak?.current || 0) > 0,
    };
  }

  getMandatoryNextTask() {
    const dailySnapshot = this.getDailyGoalSnapshot();
    const personalized = this.getPersonalizedRecommendations();
    const nextProblem = personalized.recommendations?.find((item) => item.key === 'next-problem')
      || personalized.recommendations?.[0]
      || null;
    const nextInterview = personalized.recommendations?.find((item) => item.key === 'interview-readiness')
      || null;

    if (dailySnapshot.today.problemsSolved < dailySnapshot.goals.problems) {
      return {
        title: `Solve Problem ${dailySnapshot.today.problemsSolved + 1}/${dailySnapshot.goals.problems}`,
        subtitle: nextProblem?.subtitle || 'Complete your daily solve target before moving to optional tasks.',
        route: nextProblem?.route || '/problems',
        badge: nextProblem?.badge || 'Mandatory',
        progress: dailySnapshot.problemsPct,
        reason: 'Daily solve goal pending',
      };
    }

    if (dailySnapshot.today.interviewsCompleted < dailySnapshot.goals.interviews) {
      const baseRoute = nextInterview?.route || '/interview/mock?type=technical&difficulty=medium';
      const route = baseRoute.includes('mode=')
        ? baseRoute
        : `${baseRoute}${baseRoute.includes('?') ? '&' : '?'}mode=placement`;
      return {
        title: `Complete Interview ${dailySnapshot.today.interviewsCompleted + 1}/${dailySnapshot.goals.interviews}`,
        subtitle: 'Placement simulation is required to complete today\'s system goal.',
        route,
        badge: 'Mandatory',
        progress: dailySnapshot.interviewsPct,
        reason: 'Daily interview goal pending',
      };
    }

    const fallback = personalized.recommendations?.[0] || {
      title: 'Advance to next challenge',
      subtitle: 'Keep momentum with your next focused task.',
      route: '/problems',
      badge: 'Next',
      progress: 100,
    };

    return {
      title: fallback.title,
      subtitle: fallback.subtitle,
      route: fallback.route,
      badge: fallback.badge,
      progress: Math.max(70, Number(fallback.progress || 0)),
      reason: 'Daily goal complete; continue momentum',
    };
  }

  getMilestoneStatus(limit = 3) {
    this.checkAchievements();

    const safeLimit = Math.max(1, Number(limit || 3));
    const unlockedIds = new Set(this.state.achievements || []);
    const stats = {
      solved: this.getSolvedCount(),
      streak: this.state.streaks?.current || 0,
      byDiff: this.getSolvedByDifficulty(),
      xp: this.state.xp?.total || 0,
    };

    const unlocked = ACHIEVEMENT_DEFS
      .filter((def) => unlockedIds.has(def.id))
      .map((def) => ({ id: def.id, name: def.name, emoji: def.emoji, desc: def.desc }));

    const upcoming = ACHIEVEMENT_DEFS
      .filter((def) => !unlockedIds.has(def.id))
      .map((def) => {
        const progress = computeAchievementProgress(def, stats);
        return {
          id: def.id,
          name: def.name,
          emoji: def.emoji,
          desc: def.desc,
          current: progress.current,
          target: progress.target,
          percentage: progress.percentage,
          remaining: Math.max(0, progress.target - progress.current),
        };
      })
      .sort((a, b) => a.remaining - b.remaining || b.percentage - a.percentage)
      .slice(0, safeLimit);

    return {
      unlockedCount: unlocked.length,
      totalCount: ACHIEVEMENT_DEFS.length,
      completionPct: ACHIEVEMENT_DEFS.length
        ? Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100)
        : 0,
      recentUnlocked: unlocked.slice(-safeLimit),
      upcoming,
    };
  }

  // --- XP & Levels ---
  addXP(amount) {
    const xp = { ...this.state.xp };
    xp.total += amount;
    xp.level = Math.floor(xp.total / XP_PER_LEVEL) + 1;
    xp.level = Math.min(xp.level, 50);
    xp.title = LEVEL_TITLES[xp.level - 1] || 'Beyond';
    this.set('xp', xp);
  }

  getXPProgress() {
    const xp = this.state.xp;
    const currentLevelXP = (xp.level - 1) * XP_PER_LEVEL;
    const nextLevelXP = xp.level * XP_PER_LEVEL;
    return {
      current: xp.total - currentLevelXP,
      needed: XP_PER_LEVEL,
      percentage: Math.min(((xp.total - currentLevelXP) / XP_PER_LEVEL) * 100, 100)
    };
  }

  // --- Achievements ---
  checkAchievements() {
    const solved = this.getSolvedCount();
    const streak = this.state.streaks.current;
    const byDiff = this.getSolvedByDifficulty();
    const xp = this.state.xp?.total || 0;
    const nextAchievements = evaluateAchievements({ solved, streak, byDiff, xp });
    const prev = this.state.achievements || [];
    const changed = prev.length !== nextAchievements.length || prev.some((id) => !nextAchievements.includes(id));
    if (changed) {
      this.set('achievements', nextAchievements);
    }
  }

  // --- Bookmarks ---
  toggleBookmark(problemId) {
    const bookmarks = [...this.state.bookmarks];
    const idx = bookmarks.indexOf(problemId);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push(problemId);
    }
    this.set('bookmarks', bookmarks);
  }

  isBookmarked(problemId) {
    return this.state.bookmarks.includes(problemId);
  }

  // --- Notes ---
  setProblemNote(problemId, note) {
    const notes = { ...this.state.problemNotes };
    notes[problemId] = note;
    this.set('problemNotes', notes);
  }

  getProblemNote(problemId) {
    return this.state.problemNotes[problemId] || '';
  }

  // --- Heatmap Data ---
  getHeatmapData() {
    const history = this.state.streaks.history || {};
    const data = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = history[dateStr] || 0;
      data.push({
        date: dateStr,
        count,
        level: count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4
      });
    }
    return data;
  }

  // --- Interview Readiness ---
  getReadinessBreakdown() {
    const solved = this.getSolvedCount();
    const byDiff = this.getSolvedByDifficulty();
    const progress = Object.values(this.state.progress || {});
    const daily = this.getDailySystemState();
    const performance = Object.values(daily.performanceByProblem || {});
    const interviewDays = Object.keys(daily.interviewSessions || {});
    const interviewScores = Object.values(daily.activityByDate || {})
      .map(entry => Number(entry?.lastInterviewScore))
      .filter(Number.isFinite);

    const independentPasses = performance.filter(entry =>
      Number(entry?.bestPassPct || entry?.lastPassPct || 0) >= 100
      && Number(entry?.attempts || 0) <= 2
    ).length;
    const executionEvidence = performance.length;

    const revised = progress.filter(entry => entry?.lastRevisedAt);
    const retained = revised.filter(entry => entry?.revisionOutcome === 'got_it').length;

    const coverage = Math.min(100, Math.round((solved / 150) * 100));
    const execution = executionEvidence
      ? Math.min(100, Math.round((independentPasses / executionEvidence) * 100))
      : 0;
    const difficulty = Math.min(
      100,
      Math.round(((byDiff.Medium + (byDiff.Hard * 1.75)) / 75) * 100),
    );
    const retention = revised.length
      ? Math.round((retained / revised.length) * 100)
      : 0;
    const consistency = this.getConsistencyScore();
    const mockAverage = interviewScores.length
      ? Math.round(interviewScores.reduce((sum, score) => sum + score, 0) / interviewScores.length)
      : 0;
    const interviews = interviewDays.length
      ? Math.min(100, Math.round((mockAverage * 0.8) + (Math.min(interviewDays.length, 5) * 4)))
      : 0;

    const score = Math.round(
      (coverage * 0.20)
      + (execution * 0.25)
      + (difficulty * 0.15)
      + (retention * 0.20)
      + (consistency * 0.10)
      + (interviews * 0.10),
    );

    return {
      score,
      dimensions: [
        { key: 'execution', label: 'Independent execution', value: execution, weight: 25 },
        { key: 'coverage', label: 'Pattern coverage', value: coverage, weight: 20 },
        { key: 'retention', label: 'Delayed recall', value: retention, weight: 20 },
        { key: 'difficulty', label: 'Interview difficulty', value: difficulty, weight: 15 },
        { key: 'consistency', label: 'Consistency', value: consistency, weight: 10 },
        { key: 'interviews', label: 'Mock interviews', value: interviews, weight: 10 },
      ],
      evidence: {
        solved,
        executionEvidence,
        revised: revised.length,
        interviewSessions: interviewDays.length,
      },
    };
  }

  getLearnerProfile() {
    return this.state.learnerProfile && typeof this.state.learnerProfile === 'object'
      ? { ...this.state.learnerProfile }
      : null;
  }

  setLearnerProfile(profile) {
    const normalized = {
      experience: String(profile?.experience || 'basics'),
      goalId: String(profile?.goalId || 'google_sde'),
      timeBudget: [15, 30, 60].includes(Number(profile?.timeBudget))
        ? Number(profile.timeBudget)
        : 30,
      horizonDays: [30, 60, 90, 180].includes(Number(profile?.horizonDays))
        ? Number(profile.horizonDays)
        : 90,
      language: String(profile?.language || 'javascript'),
      confidence: Math.max(1, Math.min(5, Number(profile?.confidence || 2))),
      completedAt: profile?.completedAt || new Date().toISOString(),
    };
    this.set('learnerProfile', normalized);
    return normalized;
  }

  getReadinessScore() {
    return this.getReadinessBreakdown().score;
  }

  getConsistencyScore() {
    const history = this.state.streaks.history || {};
    const last30Days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.push(history[dateStr] || 0);
    }
    const activeDays = last30Days.filter(d => d > 0).length;
    return Math.round((activeDays / 30) * 100);
  }

  // --- Theme ---
  getTheme() {
    return this.state.preferences.theme;
  }

  setTheme(theme) {
    this.update('preferences', prev => ({ ...prev, theme }));
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  // --- Global Timer ---
  getTimerState() {
    return { ...DEFAULT_STATE.timerState, ...(this.state.timerState || {}) };
  }

  setTimerState(next) {
    const current = this.getTimerState();
    const resolved = typeof next === 'function' ? next(current) : { ...current, ...next };
    this.set('timerState', { ...current, ...resolved });
  }
}

export const store = new Store();
export default store;
