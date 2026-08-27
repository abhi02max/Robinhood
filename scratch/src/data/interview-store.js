import { getQuestionsByCategory, getQuestionsByTags, INTERVIEW_QUESTIONS } from './interview-registry.js';

const IV_STORAGE_KEY = 'robinhood_interview_v1';
const DAILY_GOAL_DEFAULT = 5;

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
    questions: {}, // questionId -> { status 'practiced'|'mastered', attempts: [{matched, total, pct, date}], xpEarned }
    streak: { current: 0, longest: 0, lastActiveDate: null },
    dailyActivity: {}, // "2026-04-21" -> count
    settings: { dailyGoal: DAILY_GOAL_DEFAULT },
    resumeSkills: [], // ['react', 'javascript', 'sql']
    sessions: [], // history of mock rounds
    bookmarks: [], // array of question IDs
    totalXp: 0
  };
}

class InterviewStore {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(IV_STORAGE_KEY);
      if (!raw) return getDefaultState();
      return { ...getDefaultState(), ...JSON.parse(raw) };
    } catch (_) {
      return getDefaultState();
    }
  }

  _save() {
    try {
      localStorage.setItem(IV_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[InterviewStore] Failed to save to local storage', e);
    }
  }

  // ─── Question Progress ───

  getQuestionStatus(questionId) {
    const entry = this.data.questions[questionId];
    if (!entry) return 'unseen';
    return entry.status || 'unseen'; // 'practiced' or 'mastered'
  }

  getLastAttempt(questionId) {
    const q = this.data.questions[questionId];
    if (!q || !q.attempts || q.attempts.length === 0) return null;
    return q.attempts[q.attempts.length - 1];
  }

  recordAttempt(questionId, { matchedPoints, totalPoints, xp }) {
    if (!this.data.questions[questionId]) {
      this.data.questions[questionId] = { status: 'practiced', attempts: [], xpEarned: 0 };
    }
    const target = this.data.questions[questionId];
    
    const pct = Math.round((matchedPoints / totalPoints) * 100) || 0;
    const attemptRec = { matchedPoints, totalPoints, pct, date: new Date().toISOString() };
    
    target.attempts.push(attemptRec);

    // Mastery threshold
    if (pct >= 80) target.status = 'mastered';
    else if (target.status !== 'mastered') target.status = 'practiced';

    // Ensure we only grant XP once per question to avoid farming
    if (target.xpEarned === 0 && xp > 0) {
      // 100% xp if mastered, 60% if just practiced (>=50%), 30% if < 50%
      let grantedXp = 0;
      if (pct >= 80) grantedXp = xp;
      else if (pct >= 50) grantedXp = Math.floor(xp * 0.6);
      else grantedXp = Math.floor(xp * 0.3);

      target.xpEarned = grantedXp;
      this.data.totalXp += grantedXp;
    }

    this._recordDailyActivity();
    this._save();
    return { status: target.status, xpEarned: target.xpEarned };
  }

  // ─── Progress & Stats ───

  getOverallProgress() {
    let practiced = 0;
    let mastered = 0;
    Object.values(this.data.questions).forEach(q => {
      if (q.status === 'mastered') mastered++;
      else if (q.status === 'practiced') practiced++;
    });
    
    const total = INTERVIEW_QUESTIONS.length;
    return {
      total,
      practiced,
      mastered,
      pct: total === 0 ? 0 : Math.round(((practiced + mastered) / total) * 100),
      xp: this.data.totalXp
    };
  }

  getCategoryProgress(categoryId) {
    const questions = getQuestionsByCategory(categoryId);
    let practiced = 0;
    let mastered = 0;
    
    questions.forEach(q => {
      const status = this.getQuestionStatus(q.id);
      if (status === 'mastered') mastered++;
      else if (status === 'practiced') practiced++;
    });

    const total = questions.length;
    return {
      total,
      practiced,
      mastered,
      pct: total === 0 ? 0 : Math.round(((practiced + mastered) / total) * 100)
    };
  }

  getSubcategoryProgress(categoryId, subcategoryId) {
    const questions = getQuestionsByCategory(categoryId).filter(q => q.subcategory === subcategoryId);
    let practiced = 0;
    let mastered = 0;
    
    questions.forEach(q => {
      const status = this.getQuestionStatus(q.id);
      if (status === 'mastered') mastered++;
      else if (status === 'practiced') practiced++;
    });

    const total = questions.length;
    return {
      total,
      practiced,
      mastered,
      pct: total === 0 ? 0 : Math.round(((practiced + mastered) / total) * 100)
    };
  }

  // ─── Retention & Streaks ───

  _recordDailyActivity() {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    
    if (!this.data.dailyActivity[today]) {
        this.data.dailyActivity[today] = 0;
        
        // Check streak continuation
        if (this.data.streak.lastActiveDate === yesterday) {
            this.data.streak.current += 1;
        } else if (this.data.streak.lastActiveDate !== today) {
            this.data.streak.current = 1; // reset/start
        }
    }
    
    this.data.dailyActivity[today] += 1;
    this.data.streak.lastActiveDate = today;

    if (this.data.streak.current > this.data.streak.longest) {
        this.data.streak.longest = this.data.streak.current;
    }
  }

  getDailyGoalStatus() {
    const today = getTodayISO();
    const practiced = this.data.dailyActivity[today] || 0;
    const goal = this.data.settings.dailyGoal;
    return {
      goal,
      practiced,
      completed: practiced >= goal,
      remaining: Math.max(0, goal - practiced)
    };
  }

  getInterviewStreak() {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    let current = this.data.streak.current;
    
    // If not active today AND not active yesterday, current streak is broken in UI implicitly.
    if (this.data.streak.lastActiveDate !== today && this.data.streak.lastActiveDate !== yesterday) {
      current = 0;
    }

    return {
      current,
      longest: this.data.streak.longest,
      lastActiveDate: this.data.streak.lastActiveDate
    };
  }

  getNextRecommendedQuestion() {
    // 1. Prioritize questions matching resume skills that are completely unseen
    if (this.data.resumeSkills.length > 0) {
      const matched = getQuestionsByTags(this.data.resumeSkills);
      const unseenMatch = matched.find(q => this.getQuestionStatus(q.id) === 'unseen');
      if (unseenMatch) return promptLabel(unseenMatch, "Matches your resume skills");
    }

    // 2. Prioritize 'practiced' but NOT 'mastered' (Space repetition)
    const practicedButNotMastered = Object.keys(this.data.questions).filter(id => this.data.questions[id].status === 'practiced');
    if (practicedButNotMastered.length > 0) {
      // Find the one attempted longest ago
      let oldestId = practicedButNotMastered[0];
      let oldestDate = new Date(this.getLastAttempt(oldestId).date).getTime();
      
      for (let i = 1; i < practicedButNotMastered.length; i++) {
        const id = practicedButNotMastered[i];
        const date = new Date(this.getLastAttempt(id).date).getTime();
        if (date < oldestDate) {
          oldestDate = date;
          oldestId = id;
        }
      }
      const q = INTERVIEW_QUESTIONS.find(q => q.id === oldestId);
      if (q) return promptLabel(q, "Review needed (Not mastered)");
    }

    // 3. Fallback to any unseen question
    const unseen = INTERVIEW_QUESTIONS.filter(q => this.getQuestionStatus(q.id) === 'unseen');
    if (unseen.length > 0) {
      // Pick a random easy one to build momentum
      const easyUnseen = unseen.filter(q => q.difficulty === 'Easy');
      if (easyUnseen.length > 0) {
          const randomIndex = Math.floor(Math.random() * easyUnseen.length);
          return promptLabel(easyUnseen[randomIndex], "New question to build momentum");
      }
      
      const randomIndex = Math.floor(Math.random() * unseen.length);
      return promptLabel(unseen[randomIndex], "New unpracticed question");
    }

    // 4. Default if all 120 mastered
    return null;
  }

  // ─── Resume Skills ───

  setResumeSkills(skillsArray) {
    this.data.resumeSkills = Array.from(new Set(skillsArray));
    this._save();
  }

  getResumeSkills() {
    return this.data.resumeSkills || [];
  }

  getResumeMatchedQuestions() {
    if (this.data.resumeSkills.length === 0) return [];
    return getQuestionsByTags(this.data.resumeSkills);
  }

  // ─── Session History ───

  recordSession(sessionData) {
    // { type, company, role, questionsAnswered, avgScore, duration }
    this.data.sessions.unshift({
      ...sessionData,
      id: 'sess_' + Date.now().toString(36),
      date: new Date().toISOString()
    });
    
    // limit to last 20
    if (this.data.sessions.length > 20) {
      this.data.sessions = this.data.sessions.slice(0, 20);
    }
    
    this._save();
  }

  getSessionHistory(limit = 10) {
    return this.data.sessions.slice(0, limit);
  }

  getLatestSession() {
      if (this.data.sessions.length === 0) return null;
      return this.data.sessions[0];
  }

  // ─── Bookmarks ───

  toggleBookmark(questionId) {
    if (!this.data.bookmarks) this.data.bookmarks = [];
    const index = this.data.bookmarks.indexOf(questionId);
    if (index === -1) {
      this.data.bookmarks.push(questionId);
    } else {
      this.data.bookmarks.splice(index, 1);
    }
    this._save();
  }

  isBookmarked(questionId) {
    if (!this.data.bookmarks) return false;
    return this.data.bookmarks.includes(questionId);
  }

  getBookmarkedQuestions() {
    if (!this.data.bookmarks) return [];
    return INTERVIEW_QUESTIONS.filter(q => this.data.bookmarks.includes(q.id));
  }
}

function promptLabel(questionObj, reason) {
    if (!questionObj) return null;
    questionObj._recommendReason = reason;
    return questionObj;
}

export const interviewStore = new InterviewStore();
