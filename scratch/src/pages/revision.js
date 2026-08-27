// ROBINHOOD — Revision Mode Page v2 (DB-driven via /api/learning/problems-index)
//
// Migration note (Apr 2026):
// Previously imported `{ allProblems, getProblemById }` from '../data/problems.js'
// to resolve bookmarks / due-for-review / failed-attempts lists. The static
// dependency is gone — the page now fetches the compact problems index
// from /api/learning/problems-index on init and builds an in-memory
// id→problem Map for O(1) lookups.
//
// Surfaces failed, bookmarked, and spaced-repetition-due problems.
import store from '../store.js';
import { fetchProblemsIndex, indexProblemsById, ApiError } from '../utils/learning-api.js';
import CATEGORIES from '../data/categories.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

let problemIndexById = new Map();
let abortController = null;

function normalizeTopicId(topicId) {
  return String(topicId || '').trim().toLowerCase();
}

function getTopicLabel(topicId) {
  const category = CATEGORIES.find((c) => c.id === topicId);
  return category?.name || topicId;
}

/**
 * O(1) lookup against the in-memory index built from /problems-index.
 * Returns null until the index has loaded — callers must filter Boolean.
 */
function getProblemFromIndex(id) {
  if (!id) return null;
  return problemIndexById.get(String(id)) || null;
}

function renderProblemRow(p, badge, today) {
  const topicSlug = p?.topic?.slug || '';
  const topicLabelForRow = p?.topic?.name
    || (CATEGORIES.find((c) => c.id === topicSlug)?.name)
    || topicSlug
    || 'General';
  return `
    <div class="revision-row" onclick="navigateTo('/problem/${p.slug || p.id}')">
      <div class="revision-row-info">
        <span class="revision-row-title">${p.title}</span>
        <span class="badge badge-${(p.difficulty || 'Easy').toLowerCase()}" style="font-size:10px;">${p.difficulty || 'Easy'}</span>
        ${badge ? `<span class="tag" style="font-size:10px;">${badge}</span>` : ''}
        ${badge && String(badge).includes('d ago') ? `<span class="badge badge-warning" style="font-size:10px;">Due for Revision</span>` : ''}
      </div>
      <div class="revision-row-cat">
        ${topicLabelForRow}
        <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="event.stopPropagation();window._revisionFeedback('${p.id}','got_it')">Got it</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window._revisionFeedback('${p.id}','need_practice')">Need practice</button>
      </div>
    </div>`;
}

function buildRevisionViewModel(selectedTopicId) {
  const bookmarks = store.get('bookmarks') || [];
  const progress = store.get('progress') || {};

  const bookmarkedProblems = bookmarks.map((id) => getProblemFromIndex(id)).filter(Boolean);

  const solvedEntries = Object.entries(progress).filter(([, v]) => v.status === 'solved');
  const solvedProblems = solvedEntries
    .map(([id, data]) => {
      const problem = getProblemFromIndex(id);
      if (!problem) return null;
      return {
        ...problem,
        solvedDate: data.solvedDate,
        difficulty: data.difficulty,
        nextRevisionDate: data.nextRevisionDate || null,
        lastRevisedAt: data.lastRevisedAt || null,
      };
    })
    .filter((p) => p && p.id);

  const today = new Date();
  const dueForReview = solvedProblems
    .filter((p) => {
      const anchorDate = p.nextRevisionDate || p.solvedDate;
      if (!anchorDate) return false;
      const daysSince = Math.floor((today - new Date(anchorDate)) / (1000 * 60 * 60 * 24));
      return daysSince >= 3;
    })
    .sort((a, b) => {
      const aDate = new Date(a.nextRevisionDate || a.solvedDate || 0).getTime();
      const bDate = new Date(b.nextRevisionDate || b.solvedDate || 0).getTime();
      return aDate - bDate;
    })
    .slice(0, 15);

  const attemptedNotSolved = Object.entries(progress)
    .filter(([, v]) => v.status !== 'solved')
    .map(([id]) => getProblemFromIndex(id))
    .filter(Boolean);

  const failedProblems = attemptedNotSolved.slice(0, 40);
  const interviewRevision = [...bookmarkedProblems, ...dueForReview]
    .filter((p, idx, arr) => p && arr.findIndex((x) => x.id === p.id) === idx)
    .slice(0, 50);

  // Topic filter: index rows have `topic.slug` (e.g. "sliding-window-two-pointers").
  // The legacy `category` field was effectively the same dimension, so match
  // against topic.slug for parity.
  const byTopic = (items) => {
    if (!selectedTopicId) return items;
    return items.filter((p) => String(p?.topic?.slug || '').toLowerCase() === selectedTopicId);
  };

  return {
    today,
    topicLabel: selectedTopicId ? getTopicLabel(selectedTopicId) : '',
    filteredBookmarked: byTopic(bookmarkedProblems),
    filteredDueForReview: byTopic(dueForReview),
    filteredAttemptedNotSolved: byTopic(attemptedNotSolved),
    filteredFailedProblems: byTopic(failedProblems),
    filteredInterviewRevision: byTopic(interviewRevision),
  };
}

function renderRevisionShell(selectedTopicId) {
  const isLoading = problemIndexById.size === 0;
  const vm = buildRevisionViewModel(selectedTopicId);
  const {
    today,
    topicLabel,
    filteredBookmarked,
    filteredDueForReview,
    filteredAttemptedNotSolved,
    filteredFailedProblems,
    filteredInterviewRevision,
  } = vm;

  return `
  <div class="page-wrap">
    <div class="revision-header anim-fade-up">
      <div>
        <h1 class="page-title"><i data-lucide="rotate-ccw" width="24" height="24" style="vertical-align:middle;margin-right:8px;color:var(--primary);"></i> Revision Mode</h1>
        <p class="page-subtitle">${isLoading ? 'Loading your revision queue…' : 'Review problems you\'ve bookmarked, attempted, or are due for spaced repetition.'}</p>
        ${selectedTopicId ? `
          <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
            <span class="tag">Topic: ${topicLabel}</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('/revision')">Clear filter</button>
          </div>
        ` : ''}
      </div>
      <div class="revision-stats">
        <div class="revision-stat"><span class="revision-stat-num">${filteredBookmarked.length}</span><span class="revision-stat-label">Bookmarked</span></div>
        <div class="revision-stat"><span class="revision-stat-num">${filteredDueForReview.length}</span><span class="revision-stat-label">Due Review</span></div>
        <div class="revision-stat"><span class="revision-stat-num">${filteredFailedProblems.length}</span><span class="revision-stat-label">Failed</span></div>
      </div>
    </div>

    <div class="revision-tabs anim-fade-up delay-1" id="revision-tabs">
      <button class="revision-tab active" data-tab="bookmarked">
        <i data-lucide="bookmark" width="14" height="14"></i> Bookmarked (${filteredBookmarked.length})
      </button>
      <button class="revision-tab" data-tab="due">
        <i data-lucide="clock" width="14" height="14"></i> Due for Review (${filteredDueForReview.length})
      </button>
      <button class="revision-tab" data-tab="retry">
        <i data-lucide="refresh-cw" width="14" height="14"></i> Retry (${filteredAttemptedNotSolved.length})
      </button>
      <button class="revision-tab" data-tab="failed">
        <i data-lucide="x-circle" width="14" height="14"></i> Failed (${filteredFailedProblems.length})
      </button>
      <button class="revision-tab" data-tab="interview">
        <i data-lucide="briefcase" width="14" height="14"></i> Interview List (${filteredInterviewRevision.length})
      </button>
    </div>

    <div class="revision-content anim-fade-up delay-2">
      <div class="revision-panel active" id="panel-bookmarked">
        ${filteredBookmarked.length ? filteredBookmarked.map((p) => renderProblemRow(p, '⭐', today)).join('') :
          '<div class="revision-empty"><i data-lucide="bookmark" width="32" height="32" style="color:var(--text-4);margin-bottom:8px;"></i><div>No bookmarked problems yet.</div><div style="font-size:12px;color:var(--text-3);margin-top:4px;">Bookmark problems while solving to add them here.</div></div>'}
      </div>
      <div class="revision-panel" id="panel-due">
        ${filteredDueForReview.length ? filteredDueForReview.map((p) => renderProblemRow(p, `${Math.floor((today - new Date(p.solvedDate)) / (1000 * 60 * 60 * 24))}d ago`, today)).join('') :
          '<div class="revision-empty"><i data-lucide="check-circle" width="32" height="32" style="color:var(--success);margin-bottom:8px;"></i><div>No problems due for review!</div><div style="font-size:12px;color:var(--text-3);margin-top:4px;">Solved problems appear here after 7+ days for spaced repetition.</div></div>'}
      </div>
      <div class="revision-panel" id="panel-retry">
        ${filteredAttemptedNotSolved.length ? filteredAttemptedNotSolved.map((p) => renderProblemRow(p, 'Retry', today)).join('') :
          '<div class="revision-empty"><i data-lucide="sparkles" width="32" height="32" style="color:var(--accent);margin-bottom:8px;"></i><div>No attempted problems to retry.</div><div style="font-size:12px;color:var(--text-3);margin-top:4px;">Problems you attempt but don\'t solve will appear here.</div></div>'}
      </div>
      <div class="revision-panel" id="panel-failed">
        ${filteredFailedProblems.length ? filteredFailedProblems.map((p) => renderProblemRow(p, 'Failed', today)).join('') :
          '<div class="revision-empty"><i data-lucide="shield-check" width="32" height="32" style="color:var(--success);margin-bottom:8px;"></i><div>No failed attempts currently.</div><div style="font-size:12px;color:var(--text-3);margin-top:4px;">Great job — keep your streak going.</div></div>'}
      </div>
      <div class="revision-panel" id="panel-interview">
        ${filteredInterviewRevision.length ? filteredInterviewRevision.map((p) => renderProblemRow(p, 'Interview', today)).join('') :
          '<div class="revision-empty"><i data-lucide="briefcase" width="32" height="32" style="color:var(--primary);margin-bottom:8px;"></i><div>No interview list yet.</div><div style="font-size:12px;color:var(--text-3);margin-top:4px;">Bookmark or solve more problems to auto-build this list.</div></div>'}
      </div>
    </div>
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function renderRevision(params = {}) {
  const selectedTopicId = normalizeTopicId(params.topicId);
  // First render emits the shell synchronously. With the index Map empty
  // every section renders empty/loading; initRevision() then fetches
  // /problems-index and re-renders in place once data arrives.
  return renderRevisionShell(selectedTopicId);
}

export function initRevision(params = {}) {
  const selectedTopicId = normalizeTopicId(params.topicId);
  setRobinContext('Revision Mode', 'Spaced Repetition', 'Help me revise due problems and improve retention.');
  initAskRobin();

  // Cancel any inflight fetch from a previous navigation
  if (abortController) abortController.abort();
  abortController = new AbortController();

  fetchProblemsIndex({ signal: abortController.signal })
    .then((problems) => {
      problemIndexById = indexProblemsById(problems);
      // Re-render the shell with the now-populated index
      const root = document.querySelector('.page-wrap');
      if (root && root.parentElement) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderRevisionShell(selectedTopicId);
        const fresh = wrapper.firstElementChild;
        if (fresh) root.parentElement.replaceChild(fresh, root);
        wireRevisionEvents();
      }
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return;
      const message = error instanceof ApiError ? error.message : 'Failed to load revision data';
      const subtitle = document.querySelector('.revision-header .page-subtitle');
      if (subtitle) subtitle.textContent = `Couldn't load your revision queue — ${message}.`;
    });

  wireRevisionEvents();
}

function wireRevisionEvents() {
  // Tab switching
  document.querySelectorAll('.revision-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.revision-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.revision-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
  window._revisionFeedback = (problemId, outcome) => {
    store.setRevisionFeedback(problemId, outcome);
    navigateTo(window.location.pathname + window.location.search);
  };
  if (window.lucide) window.lucide.createIcons();
}
