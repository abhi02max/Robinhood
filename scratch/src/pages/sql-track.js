// ============================================
// SQL TRACK — Hub Page (Complete Rewrite)
// /sql-track → Topic grid + journey + goals
// ============================================

import { SQL_TOPICS, SQL_PROBLEMS, SQL_COMPANIES, getSqlTopicStats } from '../data/sql-registry.js';
import { sqlStore } from '../data/sql-store.js';

export function renderSqlTrack() {
  const overall = sqlStore.getOverallProgress();
  const streak = sqlStore.getSqlStreak();
  const dailyGoal = sqlStore.getDailyGoalStatus();
  const nextProblem = sqlStore.getNextRecommendedProblem();

  const topicCards = SQL_TOPICS.map(topic => {
    const stats = getSqlTopicStats(topic.id);
    const progress = sqlStore.getTopicProgress(topic.id);
    const isComplete = progress.solved === progress.total;

    const difficultyPills = `
      <span class="sql-diff-pill sql-diff-easy">${progress.tier1.solved}/${progress.tier1.total} Beginner</span>
      <span class="sql-diff-pill sql-diff-medium">${progress.tier2.solved}/${progress.tier2.total} Intermediate</span>
      <span class="sql-diff-pill sql-diff-hard">${progress.tier3.solved}/${progress.tier3.total} Advanced</span>
    `;

    const ctaLabel = progress.solved === 0 ? 'Start' :
                     isComplete ? 'Review' : 'Continue';

    return `
      <div class="sql-topic-card anim-fade-up" data-sql-topic="${topic.id}">
        <div class="sql-topic-card-header" style="background: ${topic.color}">
          <span class="sql-topic-icon"><i data-lucide="${topic.icon}"></i></span>
          ${isComplete ? '<span class="sql-topic-complete-badge">✓</span>' : ''}
        </div>
        <div class="sql-topic-card-body">
          <h3 class="sql-topic-card-title">${topic.name}</h3>
          <p class="sql-topic-card-desc">${topic.description}</p>
          <div class="sql-topic-card-stats">
            <span>${stats.total} Problems</span>
            <span>·</span>
            <span>${stats.easy}E ${stats.medium}M ${stats.hard}H</span>
          </div>
          <div class="sql-topic-progress-bar">
            <div class="sql-topic-progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <div class="sql-topic-card-diff-row">${difficultyPills}</div>
          <button class="btn btn-sm btn-primary sql-topic-card-cta" data-sql-topic-nav="${topic.id}">
            ${ctaLabel} →
          </button>
        </div>
      </div>
    `;
  }).join('');

  const nextProblemHtml = nextProblem ? `
    <div class="sql-journey-cta glass anim-fade-up delay-2" id="sql-journey-cta">
      <div class="sql-journey-cta-left">
        <span class="sql-journey-cta-kicker">Continue Your SQL Journey</span>
        <h3 class="sql-journey-cta-title">${nextProblem.title}</h3>
        <div class="sql-journey-cta-meta">
          <span class="difficulty-badge difficulty-${nextProblem.difficulty.toLowerCase()}">${nextProblem.difficulty}</span>
          <span>·</span>
          <span>${SQL_TOPICS.find(t => t.id === nextProblem.topicId)?.name || nextProblem.topicId}</span>
          ${nextProblem.companies.length ? `<span>·</span><span>${nextProblem.companies[0]}</span>` : ''}
        </div>
      </div>
      <div class="sql-journey-cta-right">
        <button class="btn btn-primary" data-sql-solve="${nextProblem.topicId}/${nextProblem.id}">
          Solve Now →
        </button>
      </div>
    </div>
  ` : `
    <div class="sql-journey-cta glass anim-fade-up delay-2">
      <div class="sql-journey-cta-left">
        <span class="sql-journey-cta-kicker">All Problems Solved</span>
        <h3 class="sql-journey-cta-title">Congratulations! 🎉</h3>
        <p class="sql-journey-cta-meta">You've completed all ${SQL_PROBLEMS.length} SQL problems.</p>
      </div>
    </div>
  `;

  const streakFire = streak.current > 0
    ? '🔥'.repeat(Math.min(streak.current, 5))
    : '—';

  const dailyProgressChunks = Array.from({ length: dailyGoal.goal }, (_, i) =>
    `<div class="sql-goal-chunk ${i < dailyGoal.solved ? 'filled' : ''}"></div>`
  ).join('');

  const companyCloud = SQL_COMPANIES.slice(0, 12).map(c =>
    `<span class="sql-company-tag">${c}</span>`
  ).join('');

  return `
    <div class="sql-hub-page page-wrap">
      <div class="sql-hub-hero anim-fade-up">
        <div class="sql-hub-hero-content">
          <span class="experience-kicker">SQL A to Z</span>
          <h1 class="page-title">Master SQL<br/><em class="text-gradient">From SELECT to Analytics</em></h1>
          <p class="sql-hub-hero-desc">
            ${SQL_PROBLEMS.length} production-grade problems across ${SQL_TOPICS.length} topics.
            Real company interview questions. In-browser execution.
          </p>
        </div>
        <div class="sql-hub-hero-stats">
          <div class="sql-stat-card">
            <span class="sql-stat-value">${overall.solved}/${overall.total}</span>
            <span class="sql-stat-label">Solved</span>
          </div>
          <div class="sql-stat-card">
            <span class="sql-stat-value">${overall.percentage}%</span>
            <span class="sql-stat-label">Complete</span>
          </div>
          <div class="sql-stat-card">
            <span class="sql-stat-value">${sqlStore.getTotalXp()}</span>
            <span class="sql-stat-label">XP Earned</span>
          </div>
        </div>
      </div>

      <div class="sql-hub-progress-section anim-fade-up delay-1">
        <div class="sql-hub-progress-bar-wrap">
          <div class="sql-hub-progress-bar">
            <div class="sql-hub-progress-fill" style="width: ${overall.percentage}%"></div>
          </div>
          <div class="sql-hub-diff-breakdown">
            <span class="sql-diff-mini sql-diff-easy">Easy: ${overall.easy.solved}/${overall.easy.total}</span>
            <span class="sql-diff-mini sql-diff-medium">Medium: ${overall.medium.solved}/${overall.medium.total}</span>
            <span class="sql-diff-mini sql-diff-hard">Hard: ${overall.hard.solved}/${overall.hard.total}</span>
          </div>
        </div>
      </div>

      ${nextProblemHtml}

      <div class="sql-hub-widgets anim-fade-up delay-3">
        <div class="sql-widget sql-widget-streak">
          <span class="sql-widget-label">Streak</span>
          <span class="sql-widget-value">${streakFire} ${streak.current} day${streak.current !== 1 ? 's' : ''}</span>
          <span class="sql-widget-sub">Longest: ${streak.longest} days</span>
        </div>
        <div class="sql-widget sql-widget-goal">
          <span class="sql-widget-label">Today's Goal</span>
          <div class="sql-goal-bar">${dailyProgressChunks}</div>
          <span class="sql-widget-sub">${dailyGoal.solved}/${dailyGoal.goal} problems${dailyGoal.completed ? ' ✓ Complete!' : ''}</span>
        </div>
      </div>

      <section class="sql-hub-topics-section anim-fade-up delay-3">
        <div class="experience-section-head">
          <h2>Topics</h2>
          <span class="experience-muted">${SQL_TOPICS.length} topics · ${SQL_PROBLEMS.length} problems</span>
        </div>
        <div class="sql-topic-grid">
          ${topicCards}
        </div>
      </section>

      <section class="sql-hub-companies anim-fade-up delay-4">
        <div class="experience-section-head">
          <h2>Companies Covered</h2>
        </div>
        <div class="sql-company-cloud">
          ${companyCloud}
          ${SQL_COMPANIES.length > 12 ? `<span class="sql-company-tag sql-company-more">+${SQL_COMPANIES.length - 12} more</span>` : ''}
        </div>
      </section>
    </div>
  `;
}

export function initSqlTrack() {
  // Topic card click
  document.querySelectorAll('[data-sql-topic-nav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const topicId = btn.dataset.sqlTopicNav;
      window.location.hash = `#/sql-track/${topicId}`;
    });
  });

  // Full card click
  document.querySelectorAll('[data-sql-topic]').forEach(card => {
    card.addEventListener('click', () => {
      const topicId = card.dataset.sqlTopic;
      window.location.hash = `#/sql-track/${topicId}`;
    });
  });

  // Solve CTA
  document.querySelectorAll('[data-sql-solve]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = btn.dataset.sqlSolve;
      window.location.hash = `#/sql-track/${path}`;
    });
  });

  // Render Lucide icons if available
  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  }
}

export default { renderSqlTrack, initSqlTrack };
