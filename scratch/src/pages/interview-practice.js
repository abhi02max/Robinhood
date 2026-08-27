import { getQuestionById, getCategoryById, getQuestionsByCategory } from '../data/interview-registry.js';
import { interviewStore } from '../data/interview-store.js';

let currentQuestion = null;
let currentCategory = null;
let timerInterval = null;
let secondsElapsed = 0;
let phase = 'answering'; // 'answering' | 'grading' | 'mastered'
let selectedChecklist = new Set();
let hasSubmittedOnce = false;

// Helpers
const formatTime = (sec) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const timerEl = document.getElementById('ivTimerAmount');
    if (timerEl) timerEl.textContent = formatTime(secondsElapsed);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

export function renderInterviewPractice(params = {}) {
  const type = params?.category || 'technical';
  const questionId = params?.questionId || '';

  currentQuestion = getQuestionById(questionId);
  currentCategory = getCategoryById(type);
  
  // State reset on mount
  secondsElapsed = 0;
  selectedChecklist.clear();
  phase = 'answering';
  hasSubmittedOnce = false;

  if (!currentQuestion) {
    return `<div class="iv-page"><h2>Question Not Found</h2></div>`;
  }

  // Find neighbor questions for Next/Prev
  const categoryQs = getQuestionsByCategory(type);
  const currentIndex = categoryQs.findIndex(q => q.id === questionId);
  const prevId = currentIndex > 0 ? categoryQs[currentIndex - 1].id : null;
  const nextId = currentIndex < categoryQs.length - 1 ? categoryQs[currentIndex + 1].id : null;

  startTimer();

  const isBookmarked = interviewStore.isBookmarked(currentQuestion.id);
  const lastAttempt = interviewStore.getLastAttempt(currentQuestion.id);

  return `
    <div class="iv-practice-workspace">
      <!-- Top header bar spanning full width -->
      <header class="iv-prac-header">
        <div class="iv-prac-h-left">
          <button class="btn btn-icon btn-sm" data-iv-route="/interview/${type}"><i data-lucide="arrow-left" width="16" height="16"></i></button>
          <span>${currentCategory.name} Track</span>
        </div>
        <div class="iv-prac-h-center">
          <span class="iv-timer"><i data-lucide="clock" width="16" height="16"></i> <span id="ivTimerAmount">00:00</span></span>
        </div>
        <div class="iv-prac-h-right">
          ${prevId ? `<button class="btn btn-secondary btn-sm" data-iv-route="/interview/${type}/${prevId}"><i data-lucide="chevron-left" width="16" height="16"></i></button>` : ''}
          <span class="text-sm text-muted">Q ${currentIndex + 1} of ${categoryQs.length}</span>
          ${nextId ? `<button class="btn btn-secondary btn-sm" data-iv-route="/interview/${type}/${nextId}"><i data-lucide="chevron-right" width="16" height="16"></i></button>` : ''}
        </div>
      </header>

      <div class="iv-prac-split">
        
        <!-- Left Panel: Question Details -->
        <div class="iv-prac-left">
          <div class="iv-prac-top-tags">
            <span class="iv-tag iv-tag-${currentQuestion.difficulty.toLowerCase()}">${currentQuestion.difficulty}</span>
            <span class="iv-tag iv-tag-primary">+${currentQuestion.xpReward} XP</span>
            ${currentQuestion.companies ? currentQuestion.companies.slice(0,3).map(c => `<span class="iv-comp-badge">${c.charAt(0).toUpperCase()}</span>`).join('') : ''}
            <button class="btn btn-icon btn-sm ml-auto ${isBookmarked ? 'text-primary' : 'text-muted'}" id="ivBookmarkToggle">
              <i data-lucide="bookmark" width="16" height="16" fill="${isBookmarked ? 'currentColor' : 'none'}"></i>
            </button>
          </div>

          <h1 class="iv-prac-title">${currentQuestion.title}</h1>
          <p class="iv-prac-sub">${currentCategory.subcategories.find(s=>s.id===currentQuestion.subcategory)?.name || currentQuestion.subcategory}</p>

          <div class="iv-prac-prompt">
            ${currentQuestion.question}
          </div>

          ${currentQuestion.followUps && currentQuestion.followUps.length > 0 ? `
            <div class="iv-prac-followups mt-2">
              <h3>Follow-up Questions</h3>
              <ul>
                ${currentQuestion.followUps.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Hidden until grading phase -->
          <div id="ivModelAnswerLayer" class="iv-hidden">
            <h3 class="mt-2 text-primary"><i data-lucide="zap" width="18" height="18"></i> Ideal Answer</h3>
            <div class="iv-prac-ideal-ans">
              ${currentQuestion.idealAnswer}
            </div>
          </div>
        </div>

        <!-- Right Panel: Workspace -->
        <div class="iv-prac-right">
          
          <div id="ivAnsweringPhase">
            <h3>Your Answer</h3>
            <p class="text-sm text-muted mb-1">Type your answer out or speak it loud, then summarize it here.</p>
            <textarea id="ivUserAnswerArea" class="iv-textarea mb-1" rows="10" placeholder="Break down your approach, trace your logic, and address edge cases..."></textarea>
            
            <button class="btn btn-primary full-width" id="ivSubmitAnswerBtn">Submit Answer for Grading</button>
            ${lastAttempt ? `<p class="text-sm text-muted mt-1 text-center">Last attempt: ${lastAttempt.pct}% match on ${new Date(lastAttempt.date).toLocaleDateString()}</p>` : ''}
          </div>

          <div id="ivGradingPhase" class="iv-hidden">
            <h3>Key-Point Checklist</h3>
            <p class="text-sm text-muted mb-1">Check the points you successfully covered in your answer. Be honest to ensure accurate spaced repetition.</p>
            
            <div class="iv-checklist">
              ${currentQuestion.keyPoints.map((kp, idx) => `
                <label class="iv-check-item">
                  <input type="checkbox" data-idx="${idx}">
                  <span>${kp}</span>
                </label>
              `).join('')}
            </div>

            <div class="iv-score-preview mt-1 mb-1">
              <span>Score: <strong id="ivLiveScore">0%</strong> (<span id="ivLiveCount">0</span>/${currentQuestion.keyPoints.length})</span>
            </div>

            <button class="btn btn-primary full-width mb-1" id="ivSaveScoreBtn">Confirm Score & Reward Tracker</button>
            <button class="btn btn-secondary full-width" id="ivShowNextBtn">Next Question <i data-lucide="arrow-right" width="16" height="16"></i></button>
          </div>

        </div>

      </div>
    </div>
  `;
}

export function initInterviewPractice() {
  window.lucide?.createIcons();

  // Hide the global sidebar while in practice mode
  const sidebar = document.querySelector('nav.sidebar');
  if (sidebar) sidebar.style.display = 'none';

  // Component references
  const btnSubmit = document.getElementById('ivSubmitAnswerBtn');
  const btnSave = document.getElementById('ivSaveScoreBtn');
  const btnNext = document.getElementById('ivShowNextBtn');
  const layerAnswering = document.getElementById('ivAnsweringPhase');
  const layerGrading = document.getElementById('ivGradingPhase');
  const layerIdealAnswer = document.getElementById('ivModelAnswerLayer');
  const bookmarkBtn = document.getElementById('ivBookmarkToggle');
  const liveScoreEl = document.getElementById('ivLiveScore');
  const liveCountEl = document.getElementById('ivLiveCount');
  
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      stopTimer();
      layerAnswering.style.display = 'none';
      layerGrading.classList.remove('iv-hidden');
      layerIdealAnswer.classList.remove('iv-hidden');
    });
  }

  // Live checklist scoring updates
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-idx');
      if (e.target.checked) selectedChecklist.add(idx);
      else selectedChecklist.delete(idx);

      const count = selectedChecklist.size;
      const total = currentQuestion.keyPoints.length;
      const pct = Math.round((count / total) * 100);

      if (liveCountEl) liveCountEl.textContent = count;
      if (liveScoreEl) {
        liveScoreEl.textContent = `${pct}%`;
        liveScoreEl.style.color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
      }
    });
  });

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (hasSubmittedOnce) return;
      hasSubmittedOnce = true;
      
      const payload = {
        matchedPoints: selectedChecklist.size,
        totalPoints: currentQuestion.keyPoints.length,
        xp: currentQuestion.xpReward
      };

      const result = interviewStore.recordAttempt(currentQuestion.id, payload);
      
      btnSave.innerHTML = `<i data-lucide="check" width="16" height="16"></i> Saved! +${result.xpEarned} XP`;
      btnSave.classList.remove('btn-primary');
      btnSave.classList.add('btn-success');
      btnSave.disabled = true;
      
      window.lucide?.createIcons();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      // Find the next question ID
      if (!currentQuestion) return;
      const categoryQs = getQuestionsByCategory(currentQuestion.category);
      const currentIndex = categoryQs.findIndex(q => q.id === currentQuestion.id);
      
      if (currentIndex < categoryQs.length - 1) {
        window.navigateTo(`/interview/${currentQuestion.category}/${categoryQs[currentIndex + 1].id}`);
      } else {
        window.navigateTo(`/interview/${currentQuestion.category}`);
      }
    });
  }

  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      interviewStore.toggleBookmark(currentQuestion.id);
      const isBookmarked = interviewStore.isBookmarked(currentQuestion.id);
      bookmarkBtn.classList.toggle('text-primary', isBookmarked);
      bookmarkBtn.classList.toggle('text-muted', !isBookmarked);
      bookmarkBtn.innerHTML = `<i data-lucide="bookmark" width="16" height="16" fill="${isBookmarked ? 'currentColor' : 'none'}"></i>`;
      window.lucide?.createIcons();
    });
  }

  // Cleanup block when leaving the page (Router handles this if we hook into it, but if not we assume global styling reset)
  const currentPath = window.location.pathname;
  const resetSidebar = setInterval(() => {
    if (window.location.pathname !== currentPath) {
      if (sidebar) sidebar.style.display = 'flex';
      stopTimer();
      clearInterval(resetSidebar);
    }
  }, 500);

  // Setup routing bindings for top buttons
  document.querySelectorAll('[data-iv-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.getAttribute('data-iv-route');
      if (route) window.navigateTo(route);
    });
  });
}
