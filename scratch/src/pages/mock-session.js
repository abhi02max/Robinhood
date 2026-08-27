import { INTERVIEW_QUESTIONS } from '../data/interview-registry.js';
import { interviewStore } from '../data/interview-store.js';
import { getInterviewToProblemsRoute, getSheetsRoute } from '../data/product-flow.js';

const COMPANY_OPTIONS = ['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys', 'Startups'];
const ROLE_OPTIONS = [
  'Software Engineer Intern',
  'Software Engineer I',
  'Software Engineer II',
  'Backend Engineer',
  'Frontend Engineer',
  'Full Stack Engineer',
  'Data Engineer',
];
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const SESSION_MODE_OPTIONS = ['practice', 'placement'];
const TARGET_QUESTIONS = 6;

const DIFFICULTY_TIMEBOX_SECONDS = {
  easy: 7 * 60,
  medium: 5 * 60,
  hard: 4 * 60,
};

const PLACEMENT_SESSION_TIMEBOX_SECONDS = {
  easy: 35 * 60,
  medium: 30 * 60,
  hard: 25 * 60,
};

function toText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeType(rawType) {
  const value = String(rawType || '').trim().toLowerCase();
  if (value === 'behavioral') return 'behavioral';
  if (value === 'hr') return 'hr';
  return 'technical';
}

function parseDefaultFromParams(params = {}) {
  const defaultType = normalizeType(params.type || 'technical');
  const defaultCompany = COMPANY_OPTIONS.find(
    (company) => company.toLowerCase() === String(params.company || '').trim().toLowerCase()
  ) || 'Google';

  return {
    type: defaultType,
    company: defaultCompany,
    role: String(params.role || ROLE_OPTIONS[2]),
    difficulty: DIFFICULTY_OPTIONS.includes(String(params.difficulty || '').toLowerCase())
      ? String(params.difficulty).toLowerCase()
      : 'medium',
    mode: SESSION_MODE_OPTIONS.includes(String(params.mode || '').toLowerCase())
      ? String(params.mode).toLowerCase()
      : 'practice',
  };
}

async function extractResumeContext(file) {
  if (!file) return '';
  const fileName = String(file.name || 'resume');
  const sizeKb = Math.max(1, Math.round((Number(file.size || 0) / 1024)));
  const textLike = /^text\//.test(file.type)
    || /\.(txt|md|json|csv)$/i.test(fileName);

  if (!textLike) {
    return `Resume uploaded: ${fileName} (${sizeKb} KB).`;
  }

  const rawText = await file.text();
  const normalized = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return `Resume uploaded: ${fileName} (${sizeKb} KB).`;
  }
  return normalized.slice(0, 3500);
}

function buildCandidateContext(state) {
  const recentTranscript = state.transcript.slice(-8)
    .map((item) => `${item.role}: ${item.message}`)
    .join('\n');

  return [
    `Role: ${state.role}`,
    `Company: ${state.company}`,
    `Round Type: ${state.type}`,
    `Difficulty: ${state.difficulty}`,
    `Candidate Notes: ${state.resumeNotes || 'N/A'}`,
    `Resume Context: ${state.resumeContext || 'N/A'}`,
    `Recent Transcript:\n${recentTranscript || 'N/A'}`,
  ].join('\n\n');
}

function scoreAnswer(answer) {
  const content = String(answer || '').trim();
  const tokenCount = content.split(/\s+/).filter(Boolean).length;
  const structureSignals = /(because|therefore|trade-?off|complexity|impact|result|metric|constraint)/i.test(content);
  const confidence = tokenCount >= 30 ? 5 : tokenCount >= 18 ? 4 : tokenCount >= 10 ? 3 : tokenCount > 0 ? 2 : 0;
  return Math.min(10, confidence + (structureSignals ? 2 : 0));
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function describeAnswerFeedback(score, type = 'technical') {
  if (score >= 8) {
    return {
      tone: 'strong',
      label: 'Strong answer',
      message: type === 'behavioral'
        ? 'Great structure and impact clarity. Keep this depth for follow-up probes.'
        : 'Clear reasoning and trade-off communication. Keep this depth in follow-ups.',
    };
  }
  if (score >= 5) {
    return {
      tone: 'improving',
      label: 'Good foundation',
      message: type === 'behavioral'
        ? 'Good narrative base. Add clearer metrics and stronger STAR closure.'
        : 'Approach is reasonable. Add edge cases, complexity, and stronger conclusion.',
    };
  }
  return {
    tone: 'weak',
    label: 'Needs depth',
    message: type === 'behavioral'
      ? 'Use STAR explicitly: situation, task, actions, and measurable result.'
      : 'Start with a high-level plan, then explain constraints and complexity.',
  };
}

function renderTranscript(transcript = []) {
  if (!transcript.length) {
    return '<p class="experience-muted">Session output appears here.</p>';
  }

  return transcript.map((message, index) => {
    const isInterviewer = message.role === 'interviewer';
    const isCandidate = message.role === 'candidate';
    const roleLabel = isInterviewer ? 'Interviewer' : isCandidate ? 'Candidate' : 'Feedback Coach';
    const roleClass = isInterviewer ? 'interviewer' : isCandidate ? 'candidate' : 'system';
    return `
      <article class="interview-message ${roleClass}">
        <header class="interview-message-head">
          <strong>${roleLabel}</strong>
          <small>#${index + 1}</small>
        </header>
        <p>${toText(message.message || '')}</p>
      </article>
    `;
  }).join('');
}

function renderSessionSummary(state) {
  const answers = Number(state.answersSubmitted || 0);
  const questions = Number(state.questionsGenerated || 0);
  const averageScore = answers > 0
    ? (Number(state.answerScoreTotal || 0) / answers).toFixed(1)
    : '0.0';
  const target = Number(state.targetQuestions || TARGET_QUESTIONS);
  const progressPct = Math.min(100, Math.round((questions / Math.max(1, target)) * 100));
  const timerValue = formatClock(state.questionTimeRemainingSec || 0);
  const timerLabel = state.timerRunning ? `Question left: ${timerValue}` : `Question timebox: ${timerValue}`;
  const placementLabel = state.sessionMode === 'placement'
    ? `Session left: ${formatClock(state.sessionRemainingSec || 0)}`
    : 'Practice mode';
  const modeLabel = state.sessionMode === 'placement' ? 'Placement Mode' : 'Practice Mode';
  const feedbackClass = state.lastFeedbackTone ? `mock-feedback-${state.lastFeedbackTone}` : '';

  return `
    <div class="flow-link-row" style="justify-content:flex-start;">
      <span class="debugger-chip">${modeLabel}</span>
      <span class="debugger-chip">Progress: ${questions}/${target}</span>
      <span class="debugger-chip">Answers: ${answers}</span>
      <span class="debugger-chip">Avg answer score: ${averageScore}/10</span>
      <span class="debugger-chip">${timerLabel}</span>
      <span class="debugger-chip">${placementLabel}</span>
      ${state.sessionMode === 'placement' ? `<span class="debugger-chip">No skipping enabled</span>` : ''}
    </div>
    <div class="journey-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPct}">
      <div class="journey-progress-fill" style="width:${progressPct}%;"></div>
    </div>
    <div class="mock-feedback-pill ${feedbackClass}">${toText(state.lastFeedbackLabel || 'Feedback appears after you submit an answer.')}</div>
  `;
}

export function renderMockSession(params = {}) {
  const defaults = parseDefaultFromParams(params);

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Mock AI Interview</p>
          <h1>Interview Session Studio</h1>
          <p>Upload resume context, select role/company, generate interview questions, and run a complete session loop.</p>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="file-up" width="14" height="14"></i> Resume upload</span>
          <span class="meta-pill"><i data-lucide="messages-square" width="14" height="14"></i> Multi-turn questions</span>
          <span class="meta-pill"><i data-lucide="code-2" width="14" height="14"></i> Problem-linked practice</span>
        </div>
      </header>

      <div class="experience-shell">
        <main class="experience-main">
          <div class="card experience-panel">
            <div class="mock-session-grid">
              <label class="input-group">
                <span class="experience-label">Session Mode</span>
                <select class="select" id="mock-mode">
                  <option value="practice" ${defaults.mode === 'practice' ? 'selected' : ''}>Practice</option>
                  <option value="placement" ${defaults.mode === 'placement' ? 'selected' : ''}>Placement Simulation</option>
                </select>
              </label>
              <label class="input-group">
                <span class="experience-label">Interview Type</span>
                <select class="select" id="mock-type">
                  <option value="technical" ${defaults.type === 'technical' ? 'selected' : ''}>Technical</option>
                  <option value="behavioral" ${defaults.type === 'behavioral' ? 'selected' : ''}>Behavioral</option>
                  <option value="hr" ${defaults.type === 'hr' ? 'selected' : ''}>HR</option>
                </select>
              </label>
              <label class="input-group">
                <span class="experience-label">Company</span>
                <select class="select" id="mock-company">
                  ${COMPANY_OPTIONS.map((company) => `<option value="${company}" ${company === defaults.company ? 'selected' : ''}>${company}</option>`).join('')}
                </select>
              </label>
              <label class="input-group">
                <span class="experience-label">Role</span>
                <select class="select" id="mock-role">
                  ${ROLE_OPTIONS.map((role) => `<option value="${role}" ${role === defaults.role ? 'selected' : ''}>${role}</option>`).join('')}
                </select>
              </label>
              <label class="input-group">
                <span class="experience-label">Difficulty</span>
                <select class="select" id="mock-difficulty">
                  ${DIFFICULTY_OPTIONS.map((difficulty) => `<option value="${difficulty}" ${difficulty === defaults.difficulty ? 'selected' : ''}>${difficulty}</option>`).join('')}
                </select>
              </label>
            </div>

            <div class="flow-link-row" style="justify-content:flex-start;">
              <label class="btn btn-secondary btn-sm" for="mock-resume-file" style="cursor:pointer;">
                <i data-lucide="file-up" width="14" height="14"></i>
                Upload Resume
              </label>
              <input id="mock-resume-file" type="file" accept=".txt,.md,.pdf,.doc,.docx" style="display:none;" />
              <span class="experience-muted" id="mock-resume-status">No resume uploaded.</span>
            </div>

            <label class="input-group">
              <span class="experience-label">Resume Highlights / Candidate Context</span>
              <textarea class="input" id="mock-resume-notes" rows="3" placeholder="Add impact highlights, key projects, and strengths you want emphasized."></textarea>
            </label>

            <div class="flow-link-row" style="justify-content:flex-start;">
              <button class="btn btn-primary" id="mock-session-start">Start Journey</button>
              <button class="btn btn-secondary" id="mock-next-question">Generate Next Question</button>
              <button class="btn btn-secondary" id="mock-end-session">End Session</button>
            </div>

            <div class="journey-caption">Each question is timeboxed by difficulty. Submit answers to get instant coaching feedback and progress updates.</div>
            <div class="mock-placement-rules" id="mock-placement-rules">
              Placement Mode enforces strict timing, no skipping, and a company-anchored simulation loop.
            </div>

            <div class="interview-transcript" id="mock-session-output">
              <p class="experience-muted">Session output appears here.</p>
            </div>

            <label class="input-group">
              <span class="experience-label">Your Answer</span>
              <textarea class="input" id="mock-answer-input" rows="4" placeholder="Write your answer. For behavioral rounds, use STAR. For technical rounds, explain approach + trade-offs."></textarea>
            </label>

            <div class="flow-link-row" style="justify-content:flex-start;">
              <button class="btn btn-primary btn-sm" id="mock-submit-answer">Submit Answer</button>
            </div>

            <div id="mock-session-summary" class="experience-muted">Session metrics will appear here.</div>
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel compact">
            <h3>Interview Tabs</h3>
            <div class="experience-list compact">
              <button class="experience-list-item" data-mock-route="/interview/technical">Technical</button>
              <button class="experience-list-item" data-mock-route="/interview/behavioral">Behavioral</button>
              <button class="experience-list-item" data-mock-route="/interview/hr">HR</button>
              <button class="experience-list-item" data-mock-route="/interview">Company Wise</button>
            </div>
          </div>

          <div class="card experience-panel compact">
            <h3><i data-lucide="route" width="16" height="16"></i> Connected Practice</h3>
            <button class="btn btn-secondary btn-sm" id="mock-open-company-problems">Open Company Problems</button>
            <button class="btn btn-secondary btn-sm" id="mock-open-sheets">Open Coding Sheets</button>
            <button class="btn btn-secondary btn-sm" id="mock-open-debugger">Open Debugger</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initMockSession(params = {}) {
  const defaults = parseDefaultFromParams(params);

  const output = document.getElementById('mock-session-output');
  const modeEl = document.getElementById('mock-mode');
  const typeEl = document.getElementById('mock-type');
  const companyEl = document.getElementById('mock-company');
  const roleEl = document.getElementById('mock-role');
  const difficultyEl = document.getElementById('mock-difficulty');
  const placementRuleEl = document.getElementById('mock-placement-rules');
  const resumeNotesEl = document.getElementById('mock-resume-notes');
  const resumeFileEl = document.getElementById('mock-resume-file');
  const resumeStatusEl = document.getElementById('mock-resume-status');
  const answerEl = document.getElementById('mock-answer-input');
  const startBtn = document.getElementById('mock-session-start');
  const nextQuestionBtn = document.getElementById('mock-next-question');
  const submitAnswerBtn = document.getElementById('mock-submit-answer');
  const endSessionBtn = document.getElementById('mock-end-session');
  const summaryEl = document.getElementById('mock-session-summary');

  const state = {
    sessionMode: defaults.mode,
    type: defaults.type,
    company: defaults.company,
    role: defaults.role,
    difficulty: defaults.difficulty,
    resumeContext: '',
    resumeNotes: '',
    transcript: [],
    sessionId: null,
    questionsGenerated: 0,
    answersSubmitted: 0,
    answerScoreTotal: 0,
    sessionActive: false,
    targetQuestions: TARGET_QUESTIONS,
    questionTimeLimitSec: DIFFICULTY_TIMEBOX_SECONDS[defaults.difficulty] || DIFFICULTY_TIMEBOX_SECONDS.medium,
    questionTimeRemainingSec: 0,
    sessionTimeLimitSec: PLACEMENT_SESSION_TIMEBOX_SECONDS[defaults.difficulty] || PLACEMENT_SESSION_TIMEBOX_SECONDS.medium,
    sessionRemainingSec: 0,
    pendingAnswer: false,
    completionRecorded: false,
    timerRunning: false,
    lastFeedbackLabel: 'Feedback appears after you submit an answer.',
    lastFeedbackTone: '',
  };

  let questionTimer = null;
  let placementTimer = null;

  const isPlacementMode = () => state.sessionMode === 'placement';

  const resolveSessionTimeLimitSec = () => {
    if (!isPlacementMode()) return 0;
    return PLACEMENT_SESSION_TIMEBOX_SECONDS[state.difficulty] || PLACEMENT_SESSION_TIMEBOX_SECONDS.medium;
  };

  const stopQuestionTimer = () => {
    if (questionTimer) {
      clearInterval(questionTimer);
      questionTimer = null;
    }
    state.timerRunning = false;
  };

  const stopPlacementTimer = () => {
    if (placementTimer) {
      clearInterval(placementTimer);
      placementTimer = null;
    }
  };

  const recordInterviewCompletion = (reason = 'session-end') => {
    if (state.completionRecorded || !state.answersSubmitted) return;
    const avgScore = state.answersSubmitted
      ? Number(state.answerScoreTotal || 0) / Number(state.answersSubmitted || 1)
      : 0;
    // Save to local retention store
    interviewStore.recordSession({
      type: state.type,
      company: state.company,
      role: state.role,
      questionsAnswered: state.answersSubmitted,
      avgScore: (avgScore / 10) * 100, // convert 1-10 to percentage
      duration: Math.round(((state.sessionTimeLimitSec || 0) - (state.sessionRemainingSec || 0)) / 60) || 0
    });
    state.completionRecorded = true;
  };

  const updateActionState = () => {
    const placement = isPlacementMode();
    const sessionLocked = placement && state.sessionActive && state.answersSubmitted < state.targetQuestions;

    if (startBtn) {
      startBtn.disabled = state.sessionActive;
      startBtn.textContent = placement ? 'Start Placement Simulation' : 'Start Journey';
      startBtn.classList.toggle('dashboard-placement-cta', placement);
    }
    if (nextQuestionBtn) {
      nextQuestionBtn.disabled = !state.sessionActive
        || (placement && state.pendingAnswer)
        || (placement && state.questionsGenerated >= state.targetQuestions);
    }
    if (submitAnswerBtn) {
      submitAnswerBtn.disabled = !state.sessionActive || (placement && !state.pendingAnswer);
    }
    if (endSessionBtn) {
      endSessionBtn.disabled = sessionLocked && Number(state.sessionRemainingSec || 0) > 0;
      endSessionBtn.title = endSessionBtn.disabled
        ? `Placement mode locks ending early until ${state.targetQuestions} answers are submitted.`
        : '';
    }

    if (placementRuleEl) {
      placementRuleEl.classList.toggle('active', placement);
      placementRuleEl.innerHTML = placement
        ? `Placement Mode: ${toText(state.company)} ${toText(state.role)} simulation. No skipping, strict timing, and ${state.targetQuestions} mandatory answers.`
        : 'Practice Mode: flexible pace with optional follow-up question flow.';
    }
  };

  const renderSummary = () => {
    const dynSummary = document.getElementById('mock-session-summary');
    if (dynSummary) {
      dynSummary.innerHTML = renderSessionSummary(state);
    }
    updateActionState();
  };

  const startQuestionTimer = () => {
    stopQuestionTimer();
    state.questionTimeLimitSec = DIFFICULTY_TIMEBOX_SECONDS[state.difficulty] || DIFFICULTY_TIMEBOX_SECONDS.medium;
    state.questionTimeRemainingSec = state.questionTimeLimitSec;
    state.timerRunning = true;
    renderSummary();

    questionTimer = window.setInterval(() => {
      if (state.questionTimeRemainingSec <= 1) {
        state.questionTimeRemainingSec = 0;
        stopQuestionTimer();
        pushMessage('system', 'Timebox completed. Share your core approach and final trade-off in one concise response.');
        renderState();
        return;
      }
      state.questionTimeRemainingSec -= 1;
      renderSummary();
    }, 1000);
  };

  const startPlacementTimer = () => {
    stopPlacementTimer();
    if (!isPlacementMode()) {
      state.sessionTimeLimitSec = 0;
      state.sessionRemainingSec = 0;
      return;
    }

    state.sessionTimeLimitSec = resolveSessionTimeLimitSec();
    state.sessionRemainingSec = state.sessionTimeLimitSec;

    placementTimer = window.setInterval(() => {
      if (!state.sessionActive) {
        stopPlacementTimer();
        return;
      }

      if (state.sessionRemainingSec <= 1) {
        state.sessionRemainingSec = 0;
        stopPlacementTimer();
        stopQuestionTimer();
        state.sessionActive = false;
        state.pendingAnswer = false;
        pushMessage('system', 'Placement timer ended. Session auto-submitted. Review feedback and move to a targeted coding drill.');
        recordInterviewCompletion('placement-timeout');
        renderState();
        return;
      }

      state.sessionRemainingSec -= 1;
      renderSummary();
    }, 1000);
  };

  const syncProfileState = () => {
    state.sessionMode = SESSION_MODE_OPTIONS.includes(String(modeEl?.value || '').toLowerCase())
      ? String(modeEl?.value).toLowerCase()
      : state.sessionMode;
    state.type = normalizeType(typeEl?.value || state.type);
    state.company = companyEl?.value || state.company;
    state.role = roleEl?.value || state.role;
    state.difficulty = String(difficultyEl?.value || state.difficulty || 'medium').toLowerCase();
    state.sessionTimeLimitSec = resolveSessionTimeLimitSec();
    if (!isPlacementMode()) {
      state.sessionRemainingSec = 0;
    } else if (!state.sessionActive || !state.sessionRemainingSec) {
      state.sessionRemainingSec = state.sessionTimeLimitSec;
    }
    state.resumeNotes = String(resumeNotesEl?.value || '').trim();
  };

  const renderState = () => {
    const dynOutput = document.getElementById('mock-session-output');
    if (dynOutput) {
      dynOutput.innerHTML = renderTranscript(state.transcript);
    }
    renderSummary();
  };

  const pushMessage = (role, message) => {
    if (!message) return;
    state.transcript.push({
      role,
      message: String(message),
      createdAt: new Date().toISOString(),
    });
  };

  const generateQuestion = async ({ freshSession = false } = {}) => {
    syncProfileState();

    if (isPlacementMode() && !freshSession && state.pendingAnswer) {
      pushMessage('system', 'Placement mode does not allow skipping. Submit your current answer before requesting the next question.');
      renderState();
      return;
    }

    if (isPlacementMode() && !freshSession && state.questionsGenerated >= state.targetQuestions) {
      pushMessage('system', 'Target round count reached. Submit your current answer or end the session review.');
      renderState();
      return;
    }

    const dynOutput = document.getElementById('mock-session-output');
    if (dynOutput) {
      dynOutput.innerHTML = '<p class="experience-muted">Generating interview question...</p>';
    }

    // Offline deterministic question selection
    let pool = INTERVIEW_QUESTIONS.filter(q => q.category === state.type);
    
    if (state.company && state.company !== 'any') {
      const c = state.company.toLowerCase();
      const filtered = pool.filter(q => !q.companies || q.companies.includes(c));
      if (filtered.length > 0) pool = filtered;
    }
    
    if (state.role && state.role !== 'any') {
      const r = state.role.toLowerCase();
      const filtered = pool.filter(q => !q.roles || q.roles.some(role => r.includes(role) || role.includes(r)));
      if (filtered.length > 0) pool = filtered;
    }

    const d = state.difficulty.toLowerCase();
    const diffMatch = pool.filter(q => q.difficulty.toLowerCase() === d);
    if (diffMatch.length > 0) pool = diffMatch;

    const unseen = pool.filter(q => interviewStore.getQuestionStatus(q.id) === 'unseen');
    if (unseen.length > 0) pool = unseen;

    const selectedQ = pool[Math.floor(Math.random() * pool.length)];
    
    await new Promise(res => setTimeout(res, 800));

    if (freshSession) {
      state.sessionId = 'mock_' + Date.now().toString(36);
      state.transcript = [];
      state.questionsGenerated = 0;
      state.answersSubmitted = 0;
      state.answerScoreTotal = 0;
      state.pendingAnswer = false;
      state.completionRecorded = false;
      startPlacementTimer();
    }

    const question = selectedQ ? `[${selectedQ.title}]\n${selectedQ.question}\n\n(Hint: Follow-ups may include: ${selectedQ.followUps?.join(' ') || 'None'})` : 'No questions found for this criteria.';
    pushMessage('interviewer', question);
    state.questionsGenerated += 1;
    state.sessionActive = true;
    state.pendingAnswer = true;
    state.lastFeedbackLabel = `Question ${state.questionsGenerated} ready. Answer within ${Math.floor((DIFFICULTY_TIMEBOX_SECONDS[state.difficulty] || 300) / 60)} minutes.`;
    state.lastFeedbackTone = '';
    startQuestionTimer();
    renderState();
  };

  const submitAnswer = () => {
    const answer = String(answerEl?.value || '').trim();
    if (!state.sessionActive) {
      return;
    }
    if (!answer) {
      return;
    }

    if (isPlacementMode()) {
      const wordCount = answer.split(/\s+/).filter(Boolean).length;
      if (wordCount < 18) {
        pushMessage('system', 'Placement mode requires a fuller response. Submit at least 18 words with structure and trade-offs.');
        renderState();
        return;
      }
    }

    pushMessage('candidate', answer);
    const score = scoreAnswer(answer);
    const feedback = describeAnswerFeedback(score, state.type);
    state.answersSubmitted += 1;
    state.answerScoreTotal += score;
    state.pendingAnswer = false;
    state.lastFeedbackLabel = `${feedback.label} · ${score}/10`;
    state.lastFeedbackTone = feedback.tone;
    pushMessage('system', `Feedback: ${feedback.message}`);
    stopQuestionTimer();

    if (isPlacementMode() && state.answersSubmitted >= state.targetQuestions) {
      state.sessionActive = false;
      stopPlacementTimer();
      recordInterviewCompletion('placement-target-complete');
      pushMessage('system', 'Placement round completed. Great work sustaining pressure through all mandatory questions.');
    }

    if (answerEl) {
      answerEl.value = '';
    }
    renderState();
  };

  if (resumeFileEl && resumeStatusEl) {
    resumeFileEl.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0];
      if (!file) {
        state.resumeContext = '';
        resumeStatusEl.textContent = 'No resume uploaded.';
        return;
      }

      resumeStatusEl.textContent = 'Extracting resume context...';
      try {
        state.resumeContext = await extractResumeContext(file);
        resumeStatusEl.textContent = `Resume ready: ${file.name}`;
      } catch (_) {
        state.resumeContext = `Resume uploaded: ${file.name}`;
        resumeStatusEl.textContent = `Resume attached: ${file.name}`;
      }
    });
  }

  if (output && typeEl && companyEl && startBtn) {
    startBtn.addEventListener('click', async () => {
      try {
        stopQuestionTimer();
        stopPlacementTimer();
        await generateQuestion({ freshSession: true });
      } catch (error) {
        const dynOutput = document.getElementById('mock-session-output');
        if (dynOutput) dynOutput.innerHTML = `<p class="experience-muted">Failed to create session: ${toText(error.message)}</p>`;
      }
    });
  }

  if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', () => {
      submitAnswer();
    });
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', async () => {
      if (!state.sessionActive) {
        const dynOutput = document.getElementById('mock-session-output');
        if (dynOutput) dynOutput.innerHTML = '<p class="experience-muted">Start a session first.</p>';
        return;
      }
      try {
        await generateQuestion({ freshSession: false });
      } catch (error) {
        const dynOutput = document.getElementById('mock-session-output');
        if (dynOutput) dynOutput.innerHTML = `<p class="experience-muted">Failed to generate next question: ${toText(error.message)}</p>`;
      }
    });
  }

  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', () => {
      if (isPlacementMode() && state.answersSubmitted < state.targetQuestions && Number(state.sessionRemainingSec || 0) > 0) {
        pushMessage('system', `Placement mode locks ending early. Submit ${state.targetQuestions - state.answersSubmitted} more answer(s) or wait for timer completion.`);
        renderState();
        return;
      }

      stopQuestionTimer();
      stopPlacementTimer();
      state.sessionActive = false;
      state.sessionId = null;
      state.pendingAnswer = false;
      recordInterviewCompletion('manual-end');
      pushMessage('system', 'Session closed. Review your responses and jump into targeted coding practice.');
      renderState();
    });
  }

  if (difficultyEl) {
    difficultyEl.addEventListener('change', () => {
      syncProfileState();
      state.questionTimeLimitSec = DIFFICULTY_TIMEBOX_SECONDS[state.difficulty] || DIFFICULTY_TIMEBOX_SECONDS.medium;
      if (!state.timerRunning) {
        state.questionTimeRemainingSec = state.questionTimeLimitSec;
      }
      if (!state.sessionActive) {
        state.sessionTimeLimitSec = resolveSessionTimeLimitSec();
        state.sessionRemainingSec = state.sessionTimeLimitSec;
      }
      renderSummary();
    });
  }

  if (modeEl) {
    modeEl.addEventListener('change', () => {
      syncProfileState();
      if (!isPlacementMode()) {
        stopPlacementTimer();
      } else if (state.sessionActive && !placementTimer) {
        startPlacementTimer();
      }
      renderSummary();
    });
  }

  document.querySelectorAll('[data-mock-route]').forEach((node) => {
    node.addEventListener('click', () => {
      const route = node.getAttribute('data-mock-route');
      if (!route) return;
      window.navigateTo(route);
    });
  });

  document.getElementById('mock-open-company-problems')?.addEventListener('click', () => {
    const company = companyEl?.value || state.company || 'Google';
    window.navigateTo(getInterviewToProblemsRoute(company));
  });

  document.getElementById('mock-open-sheets')?.addEventListener('click', () => {
    window.navigateTo(getSheetsRoute(75));
  });

  document.getElementById('mock-open-debugger')?.addEventListener('click', () => {
    window.navigateTo('/debugger');
  });

  if (modeEl) modeEl.value = defaults.mode;
  typeEl.value = defaults.type;
  companyEl.value = defaults.company;
  if (roleEl) roleEl.value = defaults.role;
  if (difficultyEl) difficultyEl.value = defaults.difficulty;
  state.questionTimeRemainingSec = state.questionTimeLimitSec;
  state.sessionTimeLimitSec = resolveSessionTimeLimitSec();
  state.sessionRemainingSec = state.sessionTimeLimitSec;
  renderState();
  window.addEventListener('hashchange', () => {
    stopQuestionTimer();
    stopPlacementTimer();
  }, { once: true });

  window.lucide?.createIcons();
}
