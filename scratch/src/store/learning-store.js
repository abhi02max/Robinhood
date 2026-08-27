import { LEARNING_SUBJECT_LIST, LEARNING_SUBJECTS } from '../data/learning-content.js';

const LEARNING_STORAGE_KEY = 'robinhood_learning_v1';
const DAILY_STREAK_MIN_MINUTES = 15;
const DEFAULT_REVISION_GAP_DAYS = 3;

const DEFAULT_SUBJECT_PROGRESS = Object.fromEntries(
  LEARNING_SUBJECT_LIST.map((subject) => [
    subject.id,
    {
      completedTopics: [],
      bookmarks: [],
      revisionQueue: [],
      quizScores: {},
      totalStudyMins: 0,
      lastStudiedAt: null,
    },
  ])
);

const DEFAULT_STATE = {
  streak: {
    current: 0,
    longest: 0,
    lastActiveDate: null,
  },
  activityByDate: {},
  subjects: DEFAULT_SUBJECT_PROGRESS,
  notes: {},
  revisionReminders: [],
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

class LearningStore {
  constructor() {
    this.state = this.loadState();
    this.syncUserId = null;
    this.syncToken = null;
    this.syncInFlight = false;
    this.lastSyncedAt = null;
  }

  loadState() {
    try {
      const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
      if (!raw) return cloneDefaultState();
      const parsed = JSON.parse(raw);
      const merged = cloneDefaultState();
      merged.streak = { ...merged.streak, ...(parsed?.streak || {}) };
      merged.activityByDate = { ...(parsed?.activityByDate || {}) };
      merged.notes = { ...(parsed?.notes || {}) };
      merged.revisionReminders = safeArray(parsed?.revisionReminders);

      for (const subject of LEARNING_SUBJECT_LIST) {
        const incoming = parsed?.subjects?.[subject.id] || {};
        merged.subjects[subject.id] = {
          completedTopics: safeArray(incoming.completedTopics),
          bookmarks: safeArray(incoming.bookmarks),
          revisionQueue: safeArray(incoming.revisionQueue),
          quizScores: { ...(incoming.quizScores || {}) },
          totalStudyMins: Number(incoming.totalStudyMins || 0),
          lastStudiedAt: incoming.lastStudiedAt || null,
        };
      }
      return merged;
    } catch (error) {
      console.warn('Failed to load learning state:', error);
      return cloneDefaultState();
    }
  }

  saveState() {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(this.state));
    this.scheduleSync();
  }

  getState() {
    return this.state;
  }

  getSyncMeta() {
    return {
      syncUserId: this.syncUserId,
      lastSyncedAt: this.lastSyncedAt,
      hasToken: !!this.syncToken,
    };
  }

  async getOrCreateSyncToken(userId) {
    if (userId) {
      const nextUserId = String(userId);
      if (!this.syncUserId || this.syncUserId !== nextUserId) {
        this.syncUserId = nextUserId;
      }
    }
    await this.ensureSessionToken();
    return this.syncToken || null;
  }

  async initSync(userId) {
    if (!userId) return;
    const nextUserId = String(userId);
    if (this.syncUserId && this.syncUserId !== nextUserId) {
      this.clearSyncSession();
    }
    this.syncUserId = nextUserId;
    await this.ensureSessionToken();
    await this.pullFromServer();
  }

  clearSyncSession() {
    this.syncUserId = null;
    this.syncToken = null;
    this.syncInFlight = false;
    this.lastSyncedAt = null;
    clearTimeout(this._syncTimer);
  }

  async ensureSessionToken() {
    if (this.syncToken || !this.syncUserId) return;
    try {
      const response = await fetch('/api/learn/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.syncUserId }),
      });
      if (!response.ok) return;
      const data = await response.json();
      this.syncToken = data?.token || null;
    } catch (error) {
      console.warn('Learning session token request failed:', error);
    }
  }

  getAuthHeaders() {
    if (!this.syncToken) return { 'Content-Type': 'application/json' };
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.syncToken}`,
    };
  }

  async pullFromServer(retryCount = 0) {
    if (!this.syncUserId) return;
    try {
      await this.ensureSessionToken();
      if (!this.syncToken) return;
      const response = await fetch(`/api/learn/progress/${encodeURIComponent(this.syncUserId)}`, {
        headers: this.getAuthHeaders(),
      });
      if (response.status === 401) {
        if (retryCount >= 1) return;
        this.syncToken = null;
        await this.ensureSessionToken();
        return this.pullFromServer(retryCount + 1);
      }
      if (!response.ok) return;
      const data = await response.json();
      if (data?.exists && data?.state && typeof data.state === 'object') {
        this.state = { ...cloneDefaultState(), ...data.state };
        localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(this.state));
        this.lastSyncedAt = data.updatedAt || new Date().toISOString();
      } else {
        await this.pushToServer();
      }
    } catch (error) {
      console.warn('Learning pull sync failed:', error);
    }
  }

  async pushToServer() {
    if (!this.syncUserId || this.syncInFlight) return;
    this.syncInFlight = true;
    try {
      await this.ensureSessionToken();
      const updatedAt = new Date().toISOString();
      const response = await fetch(`/api/learn/progress/${encodeURIComponent(this.syncUserId)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ state: this.state, updatedAt }),
      });
      if (response.status === 409) {
        const conflict = await response.json().catch(() => null);
        if (conflict?.serverState && typeof conflict.serverState === 'object') {
          this.state = this.mergeStates(conflict.serverState, this.state);
          localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(this.state));
          await fetch(`/api/learn/progress/${encodeURIComponent(this.syncUserId)}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ state: this.state, updatedAt: new Date().toISOString() }),
          });
        }
      } else if (response.ok) {
        this.lastSyncedAt = updatedAt;
      } else if (response.status === 401) {
        this.syncToken = null;
        await this.ensureSessionToken();
      }
    } catch (error) {
      console.warn('Learning push sync failed:', error);
    } finally {
      this.syncInFlight = false;
    }
  }

  scheduleSync() {
    if (!this.syncUserId) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this.pushToServer();
    }, 600);
  }

  mergeStates(serverState, clientState) {
    const merged = cloneDefaultState();
    merged.streak = clientState?.streak?.lastActiveDate >= serverState?.streak?.lastActiveDate
      ? { ...serverState.streak, ...clientState.streak }
      : { ...clientState.streak, ...serverState.streak };
    merged.activityByDate = { ...(serverState.activityByDate || {}), ...(clientState.activityByDate || {}) };
    merged.notes = { ...(serverState.notes || {}), ...(clientState.notes || {}) };
    merged.revisionReminders = [
      ...new Set([...(serverState.revisionReminders || []), ...(clientState.revisionReminders || [])]),
    ];

    for (const subject of LEARNING_SUBJECT_LIST) {
      const s = serverState?.subjects?.[subject.id] || {};
      const c = clientState?.subjects?.[subject.id] || {};
      merged.subjects[subject.id] = {
        completedTopics: [...new Set([...(s.completedTopics || []), ...(c.completedTopics || [])])],
        bookmarks: [...new Set([...(s.bookmarks || []), ...(c.bookmarks || [])])],
        revisionQueue: [...(s.revisionQueue || []), ...(c.revisionQueue || [])].reduce((acc, item) => {
          const key = `${item.topicId}-${item.dueDate}`;
          if (!acc.some((a) => `${a.topicId}-${a.dueDate}` === key)) acc.push(item);
          return acc;
        }, []),
        quizScores: { ...(s.quizScores || {}), ...(c.quizScores || {}) },
        totalStudyMins: Math.max(Number(s.totalStudyMins || 0), Number(c.totalStudyMins || 0)),
        lastStudiedAt: c.lastStudiedAt || s.lastStudiedAt || null,
      };
    }
    return merged;
  }

  exportBackup() {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state: this.state,
    };
  }

  importBackup(payload) {
    const importedState = payload?.state;
    if (!importedState || typeof importedState !== 'object' || Array.isArray(importedState)) {
      throw new Error('Invalid backup payload');
    }
    this.state = { ...cloneDefaultState(), ...importedState };
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(this.state));
    this.scheduleSync();
  }

  getSubjectState(subjectId) {
    return this.state.subjects[subjectId] || cloneDefaultState().subjects[subjectId];
  }

  getTodayISO() {
    return new Date().toISOString().split('T')[0];
  }

  updateLearningStreakIfNeeded() {
    const today = this.getTodayISO();
    const streak = { ...this.state.streak };
    if (streak.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().split('T')[0];

    if (streak.lastActiveDate === yesterdayIso) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }

    streak.lastActiveDate = today;
    streak.longest = Math.max(streak.longest, streak.current);
    this.state.streak = streak;
  }

  markTopicCompleted(subjectId, topicId) {
    const subject = this.getSubjectState(subjectId);
    if (!subject) return;
    if (!subject.completedTopics.includes(topicId)) {
      subject.completedTopics.push(topicId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + DEFAULT_REVISION_GAP_DAYS);
      subject.revisionQueue.push({ topicId, dueDate: dueDate.toISOString().split('T')[0], done: false });
    }
    this.recordActivity(subjectId, topicId, 20);
    this.saveState();
  }

  toggleTopicBookmark(subjectId, topicId) {
    const subject = this.getSubjectState(subjectId);
    if (!subject) return false;
    const idx = subject.bookmarks.indexOf(topicId);
    if (idx >= 0) {
      subject.bookmarks.splice(idx, 1);
      this.saveState();
      return false;
    }
    subject.bookmarks.push(topicId);
    this.saveState();
    return true;
  }

  setTopicNote(subjectId, topicId, note) {
    const key = `${subjectId}:${topicId}`;
    this.state.notes[key] = note;
    this.saveState();
  }

  getTopicNote(subjectId, topicId) {
    return this.state.notes[`${subjectId}:${topicId}`] || '';
  }

  recordQuizScore(subjectId, topicId, scorePercent) {
    const subject = this.getSubjectState(subjectId);
    if (!subject) return;
    subject.quizScores[topicId] = scorePercent;
    this.recordActivity(subjectId, topicId, 8);
    this.saveState();
  }

  recordActivity(subjectId, topicId, minutes = 0) {
    const today = this.getTodayISO();
    const subject = this.getSubjectState(subjectId);
    if (!subject) return;

    subject.totalStudyMins += minutes;
    subject.lastStudiedAt = new Date().toISOString();

    const existing = this.state.activityByDate[today] || { minutes: 0, topics: [] };
    existing.minutes += minutes;
    if (topicId && !existing.topics.includes(`${subjectId}:${topicId}`)) {
      existing.topics.push(`${subjectId}:${topicId}`);
    }
    this.state.activityByDate[today] = existing;

    if (existing.minutes >= DAILY_STREAK_MIN_MINUTES) {
      this.updateLearningStreakIfNeeded();
    }
  }

  getSubjectProgress(subjectId) {
    const subjectMeta = LEARNING_SUBJECTS[subjectId];
    const subject = this.getSubjectState(subjectId);
    if (!subjectMeta || !subject) return 0;
    const total = subjectMeta.topics.length || 1;
    return Math.round((subject.completedTopics.length / total) * 100);
  }

  getAllSubjectProgress() {
    const result = {};
    for (const subject of LEARNING_SUBJECT_LIST) {
      result[subject.id] = this.getSubjectProgress(subject.id);
    }
    return result;
  }

  getDueRevisions(subjectId) {
    const today = this.getTodayISO();
    const subjects = subjectId ? [subjectId] : LEARNING_SUBJECT_LIST.map((s) => s.id);
    const due = [];
    for (const sid of subjects) {
      const state = this.getSubjectState(sid);
      for (const item of state.revisionQueue) {
        if (!item.done && item.dueDate <= today) due.push({ ...item, subjectId: sid });
      }
    }
    return due;
  }

  markRevisionDone(subjectId, topicId) {
    const state = this.getSubjectState(subjectId);
    if (!state) return;
    const target = state.revisionQueue.find((r) => r.topicId === topicId && !r.done);
    if (target) target.done = true;
    this.recordActivity(subjectId, topicId, 10);
    this.saveState();
  }

  getStrengthBuckets(subjectId) {
    const subjectMeta = LEARNING_SUBJECTS[subjectId];
    const state = this.getSubjectState(subjectId);
    if (!subjectMeta || !state) return { weak: [], strong: [] };

    const byTopic = subjectMeta.topics.map((topic) => {
      const completed = state.completedTopics.includes(topic.id);
      const quiz = state.quizScores[topic.id] ?? null;
      const strengthScore = (completed ? 40 : 0) + (quiz ?? 0) * 0.6;
      return {
        id: topic.id,
        title: topic.title,
        strengthScore: Math.round(strengthScore),
        completed,
        quiz,
      };
    });

    const weak = byTopic.filter((t) => t.strengthScore < 45).sort((a, b) => a.strengthScore - b.strengthScore).slice(0, 4);
    const strong = byTopic.filter((t) => t.strengthScore >= 75).sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 4);
    return { weak, strong };
  }

  getHeatmapData(days = 120) {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const iso = date.toISOString().split('T')[0];
      const mins = this.state.activityByDate[iso]?.minutes || 0;
      data.push({
        date: iso,
        minutes: mins,
        level: mins === 0 ? 0 : mins <= 15 ? 1 : mins <= 35 ? 2 : mins <= 60 ? 3 : 4,
      });
    }
    return data;
  }
}

export const learningStore = new LearningStore();
export default learningStore;

