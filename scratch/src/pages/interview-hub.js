import { 
  INTERVIEW_CATEGORIES, 
  INTERVIEW_COMPANIES, 
  INTERVIEW_ROLES, 
  SKILL_DICTIONARY,
  getCategoryStats,
  parseResumeSkills,
  getQuestionsByCompany
} from '../data/interview-registry.js';
import { interviewStore } from '../data/interview-store.js';

export function renderInterviewHub() {
  const overall = interviewStore.getOverallProgress();
  const goalStatus = interviewStore.getDailyGoalStatus();
  const streak = interviewStore.getInterviewStreak();
  const nextQ = interviewStore.getNextRecommendedQuestion();
  const resumeSkills = interviewStore.getResumeSkills();
  const sessionHistory = interviewStore.getSessionHistory(5);

  let nextQHtml = '';
  if (nextQ) {
    nextQHtml = `
      <div class="iv-next-up-card">
        <div class="iv-next-up-meta">
          <span class="iv-tag iv-tag-primary"><i data-lucide="sparkles" width="14" height="14"></i> ${nextQ._recommendReason}</span>
          <span class="iv-tag">${nextQ.difficulty}</span>
        </div>
        <h4>${nextQ.title}</h4>
        <p class="iv-card-kicker">${nextQ.subcategory} · ${nextQ.companies?.[0] || 'General'}</p>
        <button class="btn btn-primary" data-iv-route="/interview/${nextQ.category}/${nextQ.id}">Practice Now <i data-lucide="arrow-right" width="16" height="16"></i></button>
      </div>
    `;
  } else {
    nextQHtml = `
      <div class="iv-next-up-card iv-empty">
        <i data-lucide="check-circle-2" width="24" height="24" style="color:var(--success)"></i>
        <h4>All Caught Up!</h4>
        <p>You have mastered the current curriculum or need to reset your practice history.</p>
      </div>
    `;
  }

  const categoryCardsHtml = INTERVIEW_CATEGORIES.map(cat => {
    const prog = interviewStore.getCategoryProgress(cat.id);
    return `
      <div class="card iv-category-card" data-iv-route="/interview/${cat.id}">
        <div class="iv-cat-header">
          <div class="iv-cat-icon" style="background: ${cat.color}20; color: ${cat.color}">
            <i data-lucide="${cat.icon}" width="24" height="24"></i>
          </div>
          <div>
            <h3>${cat.name}</h3>
            <span class="iv-card-kicker">${prog.total} Questions</span>
          </div>
        </div>
        <p class="iv-cat-desc">${cat.description}</p>
        <div class="iv-progress-container">
          <div class="iv-progress-labels">
            <span>Progress</span>
            <span>${prog.pct}% (${prog.practiced + prog.mastered}/${prog.total})</span>
          </div>
          <div class="iv-progress-track">
            <div class="iv-progress-fill" style="width: ${prog.pct}%"></div>
          </div>
        </div>
        <div class="iv-cat-footer">
          <span>Browse ${cat.name} <i data-lucide="chevron-right" width="16" height="16"></i></span>
        </div>
      </div>
    `;
  }).join('');

  const companyGridHtml = INTERVIEW_COMPANIES.map(comp => {
    const compQs = getQuestionsByCompany(comp.id);
    return `
      <button class="iv-company-chip" data-iv-route="/interview/mock?type=technical&company=${comp.id}">
        <span class="iv-comp-name">${comp.name}</span>
        <span class="iv-comp-count">${compQs.length} Qs</span>
      </button>
    `;
  }).join('');

  const renderResumeSkillsHtml = () => {
    if (resumeSkills.length === 0) {
      return `
        <div class="iv-resume-empty">
          <i data-lucide="file-text" width="24" height="24"></i>
          <p>Upload your resume to instantly identify your core skills and match them to our question bank.</p>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer">
            Upload File (.txt, .md, .json)
            <input type="file" id="ivResumeUpload" accept=".txt,.md,.json" style="display:none;">
          </label>
        </div>
      `;
    }
    
    const matchedQs = interviewStore.getResumeMatchedQuestions();
    
    return `
      <div class="iv-resume-active">
        <div class="iv-skills-row">
          ${resumeSkills.map(s => `<span class="iv-skill-chip selected">${s}</span>`).join('')}
          <button class="btn btn-link btn-sm" id="ivResetResume">Clear</button>
        </div>
        <div class="iv-resume-matched">
          <i data-lucide="check-circle-2" width="16" height="16" style="color:var(--success)"></i>
          <span>${matchedQs.length} questions strongly match your skills profile.</span>
        </div>
      </div>
    `;
  };

  const sessionsHtml = sessionHistory.length > 0 ? sessionHistory.map(sess => `
    <div class="iv-session-row">
      <div class="iv-sess-date">${new Date(sess.date).toLocaleDateString()}</div>
      <div class="iv-sess-info">
        <strong>${sess.type === 'technical' ? 'Technical' : sess.type === 'behavioral' ? 'Behavioral' : 'HR'}</strong>
        <span>· ${sess.company || 'Mixed'} </span>
      </div>
      <div class="iv-sess-score" style="color: ${sess.avgScore > 75 ? 'var(--success)' : sess.avgScore > 50 ? 'var(--warning)' : 'var(--text-muted)'}">
        ${Math.round(sess.avgScore)}%
      </div>
      <div class="iv-sess-meta">${sess.duration ? sess.duration + 'm' : ''}</div>
    </div>
  `).join('') : '<p class="iv-empty-text">No mock sessions completed yet.</p>';

  return `
    <div class="iv-page anim-fade-up">
      <header class="iv-hero">
        <div class="iv-hero-left">
          <p class="iv-kicker">Interview Engine</p>
          <h1>Interview Preparation Hub</h1>
          <p>Deterministic preparation tracks matching your resume to the exact technical and behavioral questions top tier companies ask.</p>
          <div class="iv-hero-stats">
            <span class="iv-tag"><i data-lucide="bar-chart-2" width="14" height="14"></i> ${overall.pct}% Complete (${overall.practiced + overall.mastered}/${overall.total})</span>
            <span class="iv-tag"><i data-lucide="star" width="14" height="14"></i> ${overall.xp} XP</span>
          </div>
        </div>
        <div class="iv-hero-right">
          <button class="btn btn-primary iv-pulse-btn" data-iv-route="/interview/mock?type=technical&company=google&mode=placement">
            <i data-lucide="play" width="16" height="16"></i> Start Mock Placement
          </button>
        </div>
      </header>

      <div class="iv-dashboard-grid">
        
        <!-- Left Column: Main Journey -->
        <div class="iv-dash-main">
          <section class="iv-section">
            <div class="iv-section-header">
              <h2>Continue Practicing</h2>
              <span class="iv-kicker">Algorithmically recommended</span>
            </div>
            ${nextQHtml}
          </section>

          <section class="iv-section">
            <div class="iv-section-header">
              <h2>Curriculum Categories</h2>
              <span class="iv-kicker">120 Questions total</span>
            </div>
            <div class="iv-card-grid-3">
              ${categoryCardsHtml}
            </div>
          </section>

          <section class="iv-section">
            <div class="iv-section-header">
              <h2>Target Company Focus</h2>
              <span class="iv-kicker">Generate a targeted mock session</span>
            </div>
            <div class="iv-companies-grid">
              ${companyGridHtml}
            </div>
          </section>
        </div>

        <!-- Right Column: Retention & Profile -->
        <aside class="iv-dash-sidebar">
          
          <div class="card iv-retention-card">
            <h3>Today's Goal</h3>
            <div class="iv-progress-container mb-1">
              <div class="iv-progress-labels">
                <span>Practiced</span>
                <span>${goalStatus.practiced} / ${goalStatus.goal}</span>
              </div>
              <div class="iv-progress-track">
                <div class="iv-progress-fill ${goalStatus.completed ? 'success' : ''}" style="width: ${Math.min(100, (goalStatus.practiced / goalStatus.goal) * 100)}%"></div>
              </div>
            </div>
            ${goalStatus.completed ? '<p class="iv-goal-msg success"><i data-lucide="check" width="14" height="14"></i> Goal completed!</p>' : `<p class="iv-goal-msg text-muted">${goalStatus.remaining} more to go!</p>`}
            
            <div class="iv-divider"></div>

            <h3>Active Streak</h3>
            <div class="iv-streak-display">
              <div class="iv-fire-icon ${streak.current > 0 ? 'active' : ''}">
                <i data-lucide="flame" width="32" height="32"></i>
              </div>
              <div class="iv-streak-stats">
                <div class="iv-streak-current">${streak.current} <span>days</span></div>
                <div class="iv-streak-longest text-muted">Longest: ${streak.longest} days</div>
              </div>
            </div>
          </div>

          <div class="card iv-resume-card">
            <div class="iv-card-header">
              <h3>Resume Profile</h3>
              <i data-lucide="file-text" width="18" height="18" class="text-muted"></i>
            </div>
            ${renderResumeSkillsHtml()}
          </div>

          <div class="card iv-history-card">
            <div class="iv-card-header">
              <h3>Recent Sessions</h3>
              <button class="btn btn-icon btn-sm"><i data-lucide="history" width="16" height="16"></i></button>
            </div>
            <div class="iv-history-list">
              ${sessionsHtml}
            </div>
          </div>

        </aside>
      </div>
    </div>
  `;
}

export function initInterviewHub() {
  window.lucide?.createIcons();

  // Route handling
  document.querySelectorAll('[data-iv-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.getAttribute('data-iv-route');
      if (route) window.navigateTo(route);
    });
  });

  // Resume Upload Logic
  const uploadInput = document.getElementById('ivResumeUpload');
  if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const detectedSkills = parseResumeSkills(text);
        if (detectedSkills.length > 0) {
          interviewStore.setResumeSkills(detectedSkills);
          // Rerender hub to show active skills (quick refresh)
          window.navigateTo('/interview');
        } else {
          alert('Could not detect specific canonical skills from this document. Ensure it contains identifiable technical terms.');
        }
      } catch (err) {
        console.error('Error parsing resume:', err);
        alert('Failed to parse resume file.');
      }
    });
  }

  const resetResumeBtn = document.getElementById('ivResetResume');
  if (resetResumeBtn) {
    resetResumeBtn.addEventListener('click', () => {
      interviewStore.setResumeSkills([]);
      window.navigateTo('/interview');
    });
  }
}
