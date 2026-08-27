// ============================================
// SQL STORE — Progress, streaks, recommendations
// localStorage-persisted state
// ============================================

import { SQL_TOPICS, SQL_PROBLEMS, getSqlProblemsByTopic } from './sql-registry.js';

const SQL_STORAGE_KEY = 'robinhood_sql_v1';
const SQL_DAILY_GOAL = 3;
const TIER_UNLOCK_THRESHOLD = 0.6; // 60%

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getDefaultState() {
  return {
    streak: { current: 0, longest: 0, lastActiveDate: null },
    dailyActivity: {},
    problems: {},
    topicProgress: {},
    totalXp: 0,
    totalSolved: 0,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

class SqlStore {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SQL_STORAGE_KEY);
      if (!raw) return getDefaultState();
      const parsed = JSON.parse(raw);
      return { ...getDefaultState(), ...parsed };
    } catch (_) {
      return getDefaultState();
    }
  }

  _save() {
    try {
      localStorage.setItem(SQL_STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {
      console.warn('[SqlStore] Failed to save state');
    }
  }

  // ── Problem Status ─────────────────────

  getSqlProblemStatus(problemId) {
    const entry = this.state.problems[problemId];
    if (!entry) return 'unseen';
    return entry.status || 'unseen';
  }

  getLastAttemptedQuery(problemId) {
    return this.state.problems[problemId]?.lastQuery || null;
  }

  saveSqlAttempt(problemId, query) {
    if (!this.state.problems[problemId]) {
      this.state.problems[problemId] = { status: 'attempted', attempts: 0, lastQuery: '', solvedAt: null };
    }
    const entry = this.state.problems[problemId];
    entry.lastQuery = query;
    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.status === 'unseen') entry.status = 'attempted';
    this._save();
  }

  markSqlProblemSolved(problemId, xpReward = 10) {
    if (!this.state.problems[problemId]) {
      this.state.problems[problemId] = { status: 'attempted', attempts: 0, lastQuery: '', solvedAt: null };
    }
    const entry = this.state.problems[problemId];
    const wasAlreadySolved = entry.status === 'solved';
    entry.status = 'solved';
    entry.solvedAt = new Date().toISOString();

    if (!wasAlreadySolved) {
      this.state.totalSolved = (this.state.totalSolved || 0) + 1;
      this.state.totalXp = (this.state.totalXp || 0) + xpReward;

      // Update daily activity
      const today = getTodayISO();
      if (!this.state.dailyActivity[today]) {
        this.state.dailyActivity[today] = { solved: 0, attempted: 0, problemIds: [] };
      }
      this.state.dailyActivity[today].solved += 1;
      if (!this.state.dailyActivity[today].problemIds.includes(problemId)) {
        this.state.dailyActivity[today].problemIds.push(problemId);
      }

      // Update topic progress cache
      const problem = SQL_PROBLEMS.find(p => p.id === problemId);
      if (problem) {
        const key = problem.topicId;
        if (!this.state.topicProgress[key]) {
          this.state.topicProgress[key] = { tier1Solved: 0, tier2Solved: 0, tier3Solved: 0 };
        }
        const tp = this.state.topicProgress[key];
        if (problem.tier === 1) tp.tier1Solved = (tp.tier1Solved || 0) + 1;
        else if (problem.tier === 2) tp.tier2Solved = (tp.tier2Solved || 0) + 1;
        else if (problem.tier === 3) tp.tier3Solved = (tp.tier3Solved || 0) + 1;
      }

      // Update streak
      this._updateStreak();
    }

    this._save();
  }

  // ── Streak ──────────────────────────────

  _updateStreak() {
    const today = getTodayISO();
    const streak = this.state.streak;

    if (streak.lastActiveDate === today) return;

    const yesterday = getYesterdayISO();
    if (streak.lastActiveDate === yesterday) {
      streak.current = (streak.current || 0) + 1;
    } else {
      streak.current = 1;
    }

    streak.lastActiveDate = today;
    streak.longest = Math.max(streak.longest || 0, streak.current);
  }

  getSqlStreak() {
    return {
      current: this.state.streak.current || 0,
      longest: this.state.streak.longest || 0,
      lastActiveDate: this.state.streak.lastActiveDate,
    };
  }

  // ── Daily Goal ──────────────────────────

  getDailyGoalStatus() {
    const today = getTodayISO();
    const todayActivity = this.state.dailyActivity[today] || { solved: 0, attempted: 0, problemIds: [] };

    return {
      solved: todayActivity.solved,
      goal: SQL_DAILY_GOAL,
      completed: todayActivity.solved >= SQL_DAILY_GOAL,
      remaining: Math.max(0, SQL_DAILY_GOAL - todayActivity.solved),
      percentage: Math.min(100, Math.round((todayActivity.solved / SQL_DAILY_GOAL) * 100)),
    };
  }

  // ── Topic Progress ──────────────────────

  getTopicProgress(topicId) {
    const problems = getSqlProblemsByTopic(topicId);
    const total = problems.length;
    const solved = problems.filter(p => this.getSqlProblemStatus(p.id) === 'solved').length;

    const tier1 = problems.filter(p => p.tier === 1);
    const tier2 = problems.filter(p => p.tier === 2);
    const tier3 = problems.filter(p => p.tier === 3);

    const tier1Solved = tier1.filter(p => this.getSqlProblemStatus(p.id) === 'solved').length;
    const tier2Solved = tier2.filter(p => this.getSqlProblemStatus(p.id) === 'solved').length;
    const tier3Solved = tier3.filter(p => this.getSqlProblemStatus(p.id) === 'solved').length;

    return {
      solved,
      total,
      percentage: total ? Math.round((solved / total) * 100) : 0,
      tier1: { solved: tier1Solved, total: tier1.length },
      tier2: { solved: tier2Solved, total: tier2.length },
      tier3: { solved: tier3Solved, total: tier3.length },
    };
  }

  getAllTopicProgress() {
    const result = {};
    SQL_TOPICS.forEach(topic => {
      result[topic.id] = this.getTopicProgress(topic.id);
    });
    return result;
  }

  // ── Tier Unlocking ──────────────────────

  isTierUnlocked(topicId, tier) {
    if (tier <= 1) return true;

    const prevTierProblems = getSqlProblemsByTopic(topicId).filter(p => p.tier === tier - 1);
    if (!prevTierProblems.length) return true;

    const solvedCount = prevTierProblems.filter(p => this.getSqlProblemStatus(p.id) === 'solved').length;
    return (solvedCount / prevTierProblems.length) >= TIER_UNLOCK_THRESHOLD;
  }

  isProblemUnlocked(problemId) {
    const problem = SQL_PROBLEMS.find(p => p.id === problemId);
    if (!problem) return false;
    return this.isTierUnlocked(problem.topicId, problem.tier);
  }

  // ── Next Recommended Problem ────────────

  getNextRecommendedProblem() {
    // 1. Find first unsolved Tier 1 problem across all topics
    for (const topic of SQL_TOPICS) {
      const tier1 = getSqlProblemsByTopic(topic.id)
        .filter(p => p.tier === 1 && this.getSqlProblemStatus(p.id) !== 'solved');
      if (tier1.length) {
        // Prefer unattempted over attempted
        const unattempted = tier1.find(p => this.getSqlProblemStatus(p.id) === 'unseen');
        return unattempted || tier1[0];
      }
    }

    // 2. All Tier 1 complete → find first unsolved Tier 2
    for (const topic of SQL_TOPICS) {
      if (!this.isTierUnlocked(topic.id, 2)) continue;
      const tier2 = getSqlProblemsByTopic(topic.id)
        .filter(p => p.tier === 2 && this.getSqlProblemStatus(p.id) !== 'solved');
      if (tier2.length) {
        const unattempted = tier2.find(p => this.getSqlProblemStatus(p.id) === 'unseen');
        return unattempted || tier2[0];
      }
    }

    // 3. All Tier 2 complete → find first unsolved Tier 3
    for (const topic of SQL_TOPICS) {
      if (!this.isTierUnlocked(topic.id, 3)) continue;
      const tier3 = getSqlProblemsByTopic(topic.id)
        .filter(p => p.tier === 3 && this.getSqlProblemStatus(p.id) !== 'solved');
      if (tier3.length) {
        const unattempted = tier3.find(p => this.getSqlProblemStatus(p.id) === 'unseen');
        return unattempted || tier3[0];
      }
    }

    // 4. Fallback: any unsolved
    const anySolved = SQL_PROBLEMS.find(p => this.getSqlProblemStatus(p.id) !== 'solved');
    return anySolved || null;
  }

  // ── XP & Stats ──────────────────────────

  getTotalXp() {
    return this.state.totalXp || 0;
  }

  getTotalSolved() {
    return this.state.totalSolved || 0;
  }

  getOverallProgress() {
    const total = SQL_PROBLEMS.length;
    const solved = this.getTotalSolved();
    const easy = SQL_PROBLEMS.filter(p => p.difficulty === 'Easy' && this.getSqlProblemStatus(p.id) === 'solved').length;
    const medium = SQL_PROBLEMS.filter(p => p.difficulty === 'Medium' && this.getSqlProblemStatus(p.id) === 'solved').length;
    const hard = SQL_PROBLEMS.filter(p => p.difficulty === 'Hard' && this.getSqlProblemStatus(p.id) === 'solved').length;
    const totalEasy = SQL_PROBLEMS.filter(p => p.difficulty === 'Easy').length;
    const totalMedium = SQL_PROBLEMS.filter(p => p.difficulty === 'Medium').length;
    const totalHard = SQL_PROBLEMS.filter(p => p.difficulty === 'Hard').length;

    return {
      solved,
      total,
      percentage: total ? Math.round((solved / total) * 100) : 0,
      easy: { solved: easy, total: totalEasy },
      medium: { solved: medium, total: totalMedium },
      hard: { solved: hard, total: totalHard },
    };
  }

  // ── Heatmap ─────────────────────────────

  getSqlHeatmapData(days = 90) {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const activity = this.state.dailyActivity[iso];
      const solved = activity?.solved || 0;
      data.push({
        date: iso,
        solved,
        level: solved === 0 ? 0 : solved <= 1 ? 1 : solved <= 3 ? 2 : solved <= 5 ? 3 : 4,
      });
    }
    return data;
  }
}

export const sqlStore = new SqlStore();
export default sqlStore;
