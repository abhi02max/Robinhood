// ROBINHOOD — Guided Career Engine Dashboard
import store from '../store.js';
import { careerEngine, CAREER_GOALS } from '../data/career-engine.js';
import { BRAND_ASSETS } from '../config/assets.js';
import { showToast } from '../components/notifications.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STAT_ICONS = {
    'target': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    'book-open': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    'code-2': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    'mic': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
    'check-circle-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    'flame': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
};

function getIcon(name) {
    return STAT_ICONS[name] || `<i data-lucide="${name}"></i>`;
}

function getUrgencyMeta(urgency) {
    const value = Number(urgency || 1);
    if (value >= 5) return { label: 'Critical', color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' };
    if (value >= 4) return { label: 'High', color: 'var(--warning)', bg: 'rgba(245,158,11,0.15)' };
    return { label: 'Medium', color: 'var(--primary)', bg: 'rgba(59,130,246,0.12)' };
}

export function renderDashboard() {
    careerEngine.checkAndUpdateUnifiedStreak();
    const user = store.get('user');
    const goal = careerEngine.getGoal();
    const streak = careerEngine.getUnifiedStreak();
    const nextAction = careerEngine.getNextAction();
    const tasks = careerEngine.getDailyQuests();
    const intelligence = careerEngine.getCareerIntelligence() || {};
    const pressure = careerEngine.getPressureState();
    const recovery = careerEngine.getRecoveryState();
    const timeBudget = careerEngine.getUserTimeBudget();
    const readiness = store.getReadinessBreakdown();
    const completedTasks = tasks.filter(task => task.completed).length;
    const readinessLead = [...readiness.dimensions].sort((a, b) => a.value - b.value)[0];
    const weakAreas = Array.isArray(intelligence.weakAreas) ? intelligence.weakAreas : [];
    const patternWeakness = intelligence.patternWeakness || { dsa: [], sql: [] };
    const progressState = intelligence.progressState || {};
    const nextUrgency = getUrgencyMeta(nextAction.urgency);

    if (!goal) {
        return `
        <div class="dashboard-page anim-fade-up" style="max-width:600px;margin:10% auto;text-align:center;">
            <div style="margin-bottom:var(--sp-6);display:flex;justify-content:center;">
                ${BRAND_ASSETS.logo.lockup({ iconSize: 32, textSize: 'lg', showTagline: false })}
            </div>
            <h1 style="font-family:var(--font-heading);font-size:32px;margin-bottom:var(--sp-2);">Select Career Track</h1>
            <p style="color:var(--text-2);margin-bottom:var(--sp-8);">Answer four quick questions to generate a plan matched to your goal, experience, and available time.</p>
            <button class="btn btn-primary btn-lg" onclick="navigateTo('/onboarding')" style="width:100%;margin-bottom:var(--sp-4);">
                Build My Roadmap <i data-lucide="arrow-right"></i>
            </button>
            
            <details style="margin-top:var(--sp-4);">
              <summary style="cursor:pointer;color:var(--text-3);font-size:13px;">Or choose a track directly</summary>
              <div style="display:flex;flex-direction:column;gap:var(--sp-4);margin-top:var(--sp-4);">
                ${CAREER_GOALS.map(g => `
                    <button class="btn btn-secondary" style="padding:20px;font-size:18px;justify-content:flex-start;" onclick="window.setCareerGoal('${g.id}')">
                        <span style="color:var(--primary);margin-right:12px;">${getIcon('target')}</span>
                        ${escapeHtml(g.name)}
                    </button>
                `).join('')}
              </div>
            </details>
        </div>
        `;
    }

    return `
    <div class="dashboard-page career-dashboard anim-fade-up">
        <header style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:var(--sp-8);">
            <div>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:var(--sp-2);">
                    <span class="badge badge-easy">${escapeHtml(goal.name)}</span>
                    <button class="btn btn-ghost btn-sm" onclick="window.setCareerGoal(null); window.refreshCurrentRoute();" style="font-size:12px;opacity:0.7;">
                        Change Track
                    </button>
                </div>
                <p class="dashboard-eyebrow">Today’s plan</p>
                <h1 class="dashboard-title">Welcome back, ${escapeHtml(user?.name?.split(' ')[0] || 'User')}</h1>
                <p class="dashboard-subtitle">One focused session. Every task has a reason.</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;background:var(--bg-card);padding:10px 16px;border-radius:12px;border:1px solid var(--border-1);">
                <div style="color:var(--warning);">${getIcon('flame')}</div>
                <div style="display:flex;flex-direction:column;">
                    <strong style="line-height:1;font-size:16px;">${streak.current} day streak</strong>
                    <span style="font-size:12px;color:var(--text-3);">Best: ${streak.longest}</span>
                </div>
            </div>
        </header>

        ${pressure.streakRisk ? `
          <div class="chart-card dashboard-notice dashboard-notice-attention">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
              <strong>Plan needs a reset</strong>
              <span style="font-size:12px;color:var(--text-3);">Backlog: ${pressure.backlogCount} · Overdue: ${pressure.overdueToday || pressure.overdueFromYesterday}</span>
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-top:4px;">
              A few tasks carried over. Today’s plan has been reordered to restore momentum.
            </div>
          </div>
        ` : ''}

                ${recovery.recoveryMode ? `
                    <div class="chart-card dashboard-notice dashboard-notice-recovery">
                        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
                            <strong style="color:var(--warning);font-size:13px;">Recovery Mode Active</strong>
                            <span style="font-size:12px;color:var(--text-3);">Reason: ${escapeHtml(recovery.reason === 'backlog' ? 'Backlog' : 'Streak Risk')}</span>
                        </div>
                        <div style="font-size:12px;color:var(--text-3);margin-top:4px;">
                            Mission load is reduced and focused on confidence restoration.
                        </div>
                    </div>
                ` : ''}

                <section class="dashboard-pulse-grid" aria-label="Today at a glance">
                    <article class="chart-card dashboard-pulse-card dashboard-readiness-card">
                        <div>
                            <span class="dashboard-card-label">Interview readiness</span>
                            <strong class="dashboard-pulse-value">${readiness.score}<small>/100</small></strong>
                        </div>
                        <div class="dashboard-readiness-ring" style="--readiness:${readiness.score * 3.6}deg;" aria-label="${readiness.score} out of 100">
                            <span>${readiness.score}</span>
                        </div>
                        <p>Next lift: <strong>${escapeHtml(readinessLead.label)}</strong></p>
                        <button class="dashboard-text-action" onclick="navigateTo('/analytics')">See evidence <i data-lucide="arrow-right"></i></button>
                    </article>
                    <article class="chart-card dashboard-pulse-card">
                        <span class="dashboard-card-label">Daily mission</span>
                        <strong class="dashboard-pulse-value">${completedTasks}<small>/${tasks.length}</small></strong>
                        <div class="dashboard-progress-track" aria-hidden="true">
                            <span style="width:${tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0}%"></span>
                        </div>
                        <p>${tasks.length - completedTasks > 0 ? `${tasks.length - completedTasks} focused step${tasks.length - completedTasks === 1 ? '' : 's'} remaining` : 'Today’s plan is complete'}</p>
                    </article>
                    <article class="chart-card dashboard-pulse-card">
                        <span class="dashboard-card-label">Focus budget</span>
                        <strong class="dashboard-pulse-value">${Number(timeBudget)}<small> min</small></strong>
                        <p>${recovery.recoveryMode ? 'A lighter session designed to rebuild confidence.' : 'Calibrated to your available practice time.'}</p>
                        <button class="dashboard-text-action" onclick="window._toggleTimerVisibility && window._toggleTimerVisibility(true)">Start focus timer <i data-lucide="timer"></i></button>
                    </article>
                </section>

                <div class="dashboard-section-heading">
                    <div>
                        <span class="dashboard-card-label">Recommended next</span>
                        <h2>Your highest-impact action</h2>
                    </div>
                </div>

        <!-- NEXT ACTION HERO -->
        <div class="chart-card dashboard-next-action">
            <div style="color:${nextAction.isComplete ? 'var(--success)' : 'var(--primary)'};margin-bottom:var(--sp-4);">
                ${getIcon(nextAction.icon)}
            </div>
            <h2 style="font-family:var(--font-heading);font-size:24px;margin-bottom:var(--sp-2);">${escapeHtml(nextAction.title)}</h2>
            <p style="color:var(--text-2);margin-bottom:var(--sp-6);font-size:16px;">${escapeHtml(nextAction.subtitle)}</p>
            ${nextAction.type !== 'complete' && !nextAction.isGoalSelection ? `
              <div style="display:flex;align-items:center;gap:8px;margin-top:-10px;margin-bottom:12px;">
                <span style="padding:2px 8px;border-radius:999px;background:${nextUrgency.bg};color:${nextUrgency.color};font-size:11px;font-weight:700;">${nextUrgency.label} Urgency</span>
                ${nextAction.overdue ? `<span class="badge badge-hard">Overdue</span>` : ''}
                ${Number(nextAction.failureCount || 0) > 0 ? `<span class="badge badge-medium">Failures: ${Number(nextAction.failureCount)}</span>` : ''}
                                ${nextAction.confidenceBoost ? '<span class="badge badge-easy">Confidence Boost</span>' : ''}
                                ${nextAction.adaptiveDifficulty ? '<span class="badge badge-medium">Adaptive Difficulty</span>' : ''}
              </div>
            ` : ''}
            ${nextAction.reason ? `<p class="dashboard-action-reason"><span>Why this now</span>${escapeHtml(nextAction.reason)}</p>` : ''}
            ${!nextAction.isComplete ? `
                <button class="btn btn-primary btn-lg" style="padding:0 32px;" onclick="navigateTo('${nextAction.route}')">
                    Start Now <i data-lucide="arrow-right" style="margin-left:8px;"></i>
                </button>
            ` : ''}
        </div>

        <details class="chart-card dashboard-signals">
            <summary>
                <span><i data-lucide="activity"></i> Learning signals</span>
                <span class="dashboard-signal-summary">${weakAreas.length ? `${weakAreas.length} focus area${weakAreas.length === 1 ? '' : 's'}` : 'On track'}</span>
            </summary>
            <div class="dashboard-signals-body">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;">
                <strong style="font-size:14px;">Evidence used for today’s plan</strong>
                <span style="font-size:12px;color:var(--text-3);">
                    ${Object.entries(progressState).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`).join(' · ')}
                </span>
            </div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
                ${weakAreas.length
                  ? weakAreas.map(area => `<span class="badge badge-hard">${escapeHtml(area)}</span>`).join('')
                  : '<span class="badge badge-easy">No weak areas detected</span>'}
            </div>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-3);">
                <div><strong style="color:var(--text-2);">DSA Pattern Weakness:</strong> ${escapeHtml((patternWeakness.dsa || []).join(', ') || 'None')}</div>
                <div><strong style="color:var(--text-2);">SQL Pattern Weakness:</strong> ${escapeHtml((patternWeakness.sql || []).join(', ') || 'None')}</div>
            </div>
            </div>
        </details>

        <!-- DAILY MISSION -->
        <section class="dashboard-mission">
            <div class="dashboard-section-heading">
                <div>
                    <span class="dashboard-card-label">Your session</span>
                    <h2>Daily mission</h2>
                </div>
                <span class="dashboard-mission-count">${completedTasks} of ${tasks.length} complete</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
                ${tasks.map((t) => {
                    const urgencyMeta = getUrgencyMeta(t.urgency);
                    return `
                    <button type="button" class="chart-card dashboard-mission-row${t.completed ? ' is-complete' : ''}" ${t.completed ? 'disabled' : `onclick="navigateTo('${t.route}')"`}>
                        <div style="color:${t.completed ? 'var(--success)' : 'var(--text-3)'};">
                            ${t.completed ? getIcon('check-circle-2') : `<div style="width:24px;height:24px;border:2px solid var(--border-2);border-radius:50%;"></div>`}
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:15px;color:var(--text-1);">${escapeHtml(t.title)}</div>
                            <div style="font-size:13px;color:var(--text-3);">${escapeHtml(t.subtitle)}</div>
                            ${t.reason ? `<div style="font-size:12px;color:var(--text-4);margin-top:4px;">${escapeHtml(t.reason)}</div>` : ''}
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                                <span style="padding:1px 8px;border-radius:999px;background:${urgencyMeta.bg};color:${urgencyMeta.color};font-size:10px;font-weight:700;">${urgencyMeta.label}</span>
                                ${t.overdue ? '<span class="badge badge-hard">Overdue</span>' : ''}
                                ${Number(t.failureCount || 0) > 0 ? `<span class="badge badge-medium">Failures: ${Number(t.failureCount)}</span>` : ''}
                                ${t.confidenceBoost ? '<span class="badge badge-easy">Confidence Boost</span>' : ''}
                                ${t.adaptiveDifficulty ? '<span class="badge badge-medium">Adaptive Difficulty</span>' : ''}
                            </div>
                        </div>
                        <div style="color:var(--text-4);">
                            ${t.completed ? getIcon(t.icon) : getIcon('arrow-right')}
                        </div>
                    </button>
                    `;
                }).join('')}
            </div>
        </section>
    </div>
    `;
}

export function initDashboard() {
    window.setCareerGoal = (id) => {
        careerEngine.setGoal(id);
        showToast('Career Goal Updated', 'success');
        if (window.refreshCurrentRoute) {
            window.refreshCurrentRoute();
        }
    };
    
    // Auto refresh if they just completed something and returned to dashboard without reload
    const unlisten = careerEngine.subscribe(() => {
        if (window.location.hash.startsWith('#/dashboard') || window.location.hash === '#/' || window.location.hash === '') {
            if (window.refreshCurrentRoute) window.refreshCurrentRoute();
        }
    });

    return () => unlisten();
}
