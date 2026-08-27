import { getLearningSubject, getTopicById } from '../data/learning-content.js';
import { getLessonsByTopic } from '../data/learning-relations.js';
import { learningStore } from 'store';
import { showToast } from '../components/notifications.js';
import { renderSupportFooter } from '../components/support-footer.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';
import { SUBJECT_ICONS } from '../components/brand.js';
import { router } from '../router.js';

const AI_ACTION_LABELS = {
  simpler: 'Explain Simpler',
  analogy: 'Give Analogy',
  doubt: 'Ask Doubt',
  interview: 'Interview Question',
  company: 'Company Use Case',
  realworld: 'Real-world Example',
  quiz: 'Quiz Me',
};
const LEARN_AI_MAX_RETRY_ATTEMPTS = 3;
const LEARN_AI_MAX_BACKOFF_SECONDS = 12;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(response, payload, fallbackSeconds = 2) {
  const headerValue = Number(response?.headers?.get('retry-after') || 0);
  if (Number.isFinite(headerValue) && headerValue > 0) {
    return Math.ceil(headerValue);
  }

  const payloadValue = Number(payload?.retryAfter || 0);
  if (Number.isFinite(payloadValue) && payloadValue > 0) {
    return Math.ceil(payloadValue);
  }

  return Math.max(1, Number(fallbackSeconds || 1));
}

// Track current stage filter (null = show all)
let _currentStageFilter = null;

function renderStagePath(subject, completedCount) {
  const progressRatio = Math.max(0, Math.min(1, completedCount / Math.max(subject.topics.length, 1)));
  const stageIndex = Math.floor(progressRatio * (subject.stages.length - 1));
  return `
    <div class="learn-stage-path">
      ${subject.stages.map((stage, idx) => `<div class="learn-stage-node ${idx <= stageIndex ? 'active' : ''}">${stage}</div>`).join('')}
    </div>
  `;
}

/**
 * Render clickable level filter buttons
 */
function renderLevelFilters(subject) {
  const stages = subject.stages || ['Beginner', 'Intermediate', 'Advanced', 'Interview', 'Industry Use Cases'];
  return `
    <div class="learn-level-filters" role="tablist">
      <button class="level-filter-btn ${!_currentStageFilter ? 'active' : ''}" data-stage-filter="all" role="tab" aria-selected="${!_currentStageFilter}">
        All
      </button>
      ${stages.map(stage => `
        <button class="level-filter-btn ${_currentStageFilter === stage ? 'active' : ''}" data-stage-filter="${stage}" role="tab" aria-selected="${_currentStageFilter === stage}">
          ${stage}
        </button>
      `).join('')}
    </div>
  `;
}

function renderTopicTree(subject, state, activeTopicId) {
  // Filter topics by current stage filter
  const filteredTopics = _currentStageFilter
    ? subject.topics.filter(t => t.stage === _currentStageFilter)
    : subject.topics;
    
  if (filteredTopics.length === 0) {
    return `<p class="learn-empty" style="padding: var(--sp-4); color: var(--text-3);">No topics in this level yet.</p>`;
  }
  
  return filteredTopics.map((topic) => {
    const idx = subject.topics.indexOf(topic);
    const completed = state.completedTopics.includes(topic.id);
    const bookmarked = state.bookmarks.includes(topic.id);
    return `
      <button class="learn-topic-item ${topic.id === activeTopicId ? 'active' : ''}" data-topic-select="${topic.id}">
        <span class="learn-topic-index">${String(idx + 1).padStart(2, '0')}</span>
        <span class="learn-topic-body">
          <strong>${topic.title}</strong>
          <small>${topic.stage}</small>
        </span>
        ${completed ? '<i data-lucide="check-circle-2" width="14" height="14" class="learn-topic-check"></i>' : ''}
        ${bookmarked ? '<i data-lucide="bookmark" width="14" height="14" class="learn-topic-bookmarked"></i>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Get subject icon based on subject ID
 */
function getSubjectIcon(subjectId) {
  const iconMap = {
    os: SUBJECT_ICONS.os,
    cn: SUBJECT_ICONS.cn,
    dbms: SUBJECT_ICONS.dbms,
    oops: SUBJECT_ICONS.oops,
    'system-design': SUBJECT_ICONS.sd,
  };
  return iconMap[subjectId] || SUBJECT_ICONS.os;
}

/**
 * PDF-Style Topic Content Viewer
 * Premium layout with clear sections and visual hierarchy
 */
function renderContent(topic, subjectId, topicId, subject, topicIndex) {
  const note = learningStore.getTopicNote(subjectId, topicId);
  const storedScore = learningStore.getSubjectState(subjectId)?.quizScores?.[topicId];
  const totalTopics = subject?.topics?.length || 1;
  const prevTopic = topicIndex > 0 ? subject.topics[topicIndex - 1] : null;
  const nextTopic = topicIndex < totalTopics - 1 ? subject.topics[topicIndex + 1] : null;
  const completedTopics = learningStore.getSubjectState(subjectId)?.completedTopics || [];
  const isCompleted = completedTopics.includes(topicId);
  const fundamentalNarrative = `At its core, ${topic.title} is about building a strong mental model first, then mapping that model to systems behavior and trade-offs. Instead of memorizing isolated definitions, treat this topic as a sequence: what problem this concept solves, what assumptions it makes, where it breaks, and how experts reason under constraints. In real interviews and production systems, this layered understanding is what separates surface familiarity from true engineering depth.`;
  const advancedNarrative = `From an advanced perspective, ${topic.title} should be analyzed through performance boundaries, reliability risks, and operational constraints. Ask: how does this behave under scale? what fails first under stress? what observability signals prove correctness? and which trade-offs are acceptable for the product context? When you articulate this clearly, you demonstrate system-thinking maturity, not just textbook recall.`;
  const implementationChecklist = [
    `Start by clearly defining the core entities and invariants in ${topic.title}.`,
    'List assumptions explicitly before selecting an approach.',
    'Validate edge cases and boundary conditions early.',
    'Map theory to one concrete production-style workflow.',
    'Measure trade-offs: latency, throughput, consistency, and maintainability.',
    'Prepare a concise 60-second interview explanation.',
  ];
  const misconceptionPatterns = [
    `Treating ${topic.title} as memorization instead of reasoning.`,
    'Skipping constraints and discussing only ideal scenarios.',
    'Confusing mechanism-level details with design-level decisions.',
    'Not connecting abstract concepts to real production incidents.',
  ];
  const selfCheckQuestions = [
    `Can I explain ${topic.title} to a beginner without jargon?`,
    'Can I compare two alternative approaches and justify a choice?',
    'Can I identify failure modes and mitigation strategies?',
    'Can I connect this concept to one company-scale example?',
  ];
  
  return `
    <article class="pdf-topic-viewer">
      <!-- Topic Header -->
      <header class="pdf-topic-header">
        <div class="pdf-header-left">
          <div class="pdf-breadcrumb">
            <a href="#" onclick="navigateTo('/learn');return false;">Learn</a>
            <span>/</span>
            <a href="#" onclick="navigateTo('/learn/${subjectId}');return false;">${subject?.title || 'Subject'}</a>
            <span>/</span>
            <span>${topic.title}</span>
          </div>
          <div class="pdf-title-row">
            <span class="pdf-topic-number">${String(topicIndex + 1).padStart(2, '0')}</span>
            <h1 class="pdf-topic-title">${topic.title}</h1>
          </div>
          <div class="pdf-topic-meta">
            <span class="badge badge-outline">${topic.stage}</span>
            <span class="pdf-reading-time"><i data-lucide="clock" width="14" height="14"></i> ~8 min read</span>
            ${isCompleted ? '<span class="badge badge-success">✓ Completed</span>' : ''}
          </div>
        </div>
        <div class="pdf-header-actions">
          <button class="btn btn-ghost btn-sm" data-topic-bookmark="${topic.id}" title="Bookmark">
            <i data-lucide="bookmark-plus" width="16" height="16"></i>
          </button>
          <button class="btn btn-primary btn-sm" data-topic-complete="${topic.id}">
            <i data-lucide="${isCompleted ? 'check-check' : 'check'}" width="14" height="14"></i>
            ${isCompleted ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </header>

      <!-- Learning Objective Card -->
      <section class="pdf-section pdf-objective-card">
        <div class="pdf-objective-icon">
          <i data-lucide="target" width="24" height="24"></i>
        </div>
        <div class="pdf-objective-content">
          <h3>Learning Objective</h3>
          <p>After this topic, you will understand <strong>${topic.title}</strong> — its core concepts, real-world applications, and how to explain it confidently in interviews.</p>
        </div>
      </section>

      <!-- Beginner Explanation -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon beginner"><i data-lucide="book-open" width="18" height="18"></i></span>
          <h2>Beginner-Friendly Explanation</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${topic.content.beginnerExplanation}</p>
        </div>
      </section>

      <!-- Intuition -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon intuition"><i data-lucide="lightbulb" width="18" height="18"></i></span>
          <h2>The Intuition</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${topic.content.intuition}</p>
        </div>
      </section>

      <!-- Analogy Card -->
      <section class="pdf-section pdf-analogy-card">
        <div class="pdf-analogy-label">
          <i data-lucide="puzzle" width="16" height="16"></i>
          <span>Real-World Analogy</span>
        </div>
        <p class="pdf-analogy-text">${topic.content.analogy}</p>
      </section>

      <!-- Diagram -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon diagram"><i data-lucide="git-branch" width="18" height="18"></i></span>
          <h2>Diagram / Visual Flow</h2>
        </div>
        <div class="pdf-section-body">
          <pre class="pdf-diagram-block">${topic.content.diagram}</pre>
        </div>
      </section>

      <!-- Example -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon example"><i data-lucide="code-2" width="18" height="18"></i></span>
          <h2>Example</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${topic.content.example}</p>
        </div>
      </section>

      <!-- Deep Foundation Narrative -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon beginner"><i data-lucide="book-text" width="18" height="18"></i></span>
          <h2>Foundation Narrative (Basic → Intermediate)</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${fundamentalNarrative}</p>
        </div>
      </section>

      <!-- Real-World Use -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon realworld"><i data-lucide="globe" width="18" height="18"></i></span>
          <h2>Real-World Applications</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${topic.content.realWorldUse}</p>
        </div>
      </section>

      <!-- Advanced Engineering Perspective -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon interview"><i data-lucide="cpu" width="18" height="18"></i></span>
          <h2>Advanced Engineering Perspective</h2>
        </div>
        <div class="pdf-section-body pdf-prose">
          <p>${advancedNarrative}</p>
        </div>
      </section>

      <!-- Interview Perspective -->
      <section class="pdf-section pdf-interview-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon interview"><i data-lucide="briefcase" width="18" height="18"></i></span>
          <h2>Interview Perspective</h2>
        </div>
        <div class="pdf-section-body">
          <h4>Common Interview Questions</h4>
          <ul class="pdf-list pdf-list-numbered">
            ${topic.content.interviewQuestions.map((q, i) => `<li><span class="pdf-list-num">${i + 1}</span>${q}</li>`).join('')}
          </ul>
          
          <h4>Company Usage Examples</h4>
          <ul class="pdf-list pdf-list-icons">
            ${topic.content.companyUsageExamples.map(q => `<li><i data-lucide="building-2" width="14" height="14"></i>${q}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Implementation Checklist -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon practice"><i data-lucide="list-checks" width="18" height="18"></i></span>
          <h2>Implementation Checklist</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-checkmarks">
            ${implementationChecklist.map((item) => `<li><i data-lucide="check" width="14" height="14"></i>${item}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Common Mistakes -->
      <section class="pdf-section pdf-warning-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon warning"><i data-lucide="alert-triangle" width="18" height="18"></i></span>
          <h2>Common Mistakes to Avoid</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-warning">
            ${topic.content.commonMistakes.map(q => `<li><i data-lucide="x-circle" width="14" height="14"></i>${q}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Misconceptions -->
      <section class="pdf-section pdf-warning-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon warning"><i data-lucide="shield-alert" width="18" height="18"></i></span>
          <h2>Frequent Misconceptions</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-warning">
            ${misconceptionPatterns.map((item) => `<li><i data-lucide="x-circle" width="14" height="14"></i>${item}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Summary & Revision -->
      <section class="pdf-section pdf-summary-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon summary"><i data-lucide="clipboard-list" width="18" height="18"></i></span>
          <h2>Key Takeaways</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-checkmarks">
            ${topic.content.revisionNotes.map(q => `<li><i data-lucide="check" width="14" height="14"></i>${q}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Self-Check -->
      <section class="pdf-section pdf-summary-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon summary"><i data-lucide="check-square" width="18" height="18"></i></span>
          <h2>Self-Check Questions</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-numbered">
            ${selfCheckQuestions.map((q, i) => `<li><span class="pdf-list-num">${i + 1}</span>${q}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Practice Questions -->
      <section class="pdf-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon practice"><i data-lucide="pencil" width="18" height="18"></i></span>
          <h2>Practice Questions</h2>
        </div>
        <div class="pdf-section-body">
          <ul class="pdf-list pdf-list-numbered">
            ${topic.practiceQuestions.map((q, i) => `<li><span class="pdf-list-num">${i + 1}</span>${q}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- Quiz Section -->
      ${topic.quiz?.length ? `
      <section class="pdf-section pdf-quiz-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon quiz"><i data-lucide="help-circle" width="18" height="18"></i></span>
          <h2>Quick Quiz</h2>
          <span class="badge badge-outline">${storedScore ?? 0}% last score</span>
        </div>
        <div class="pdf-section-body">
          <div class="pdf-quiz-list">
            ${topic.quiz.map((q, idx) => `
              <div class="pdf-quiz-card" data-quiz-q="${idx}">
                <p class="pdf-quiz-question"><span class="pdf-quiz-num">Q${idx + 1}</span>${q.q}</p>
                <div class="pdf-quiz-options">
                  ${q.options.map((opt, oIdx) => `
                    <label class="pdf-quiz-option">
                      <input type="radio" name="quiz-${idx}" value="${oIdx}" />
                      <span class="pdf-quiz-option-text">${opt}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="pdf-quiz-actions">
            <button class="btn btn-primary btn-sm" data-topic-quiz-submit="${topic.id}">
              <i data-lucide="check-circle" width="14" height="14"></i> Submit Quiz
            </button>
          </div>
          <div id="learn-quiz-result" class="pdf-quiz-result"></div>
        </div>
      </section>
      ` : ''}

      <!-- Personal Notes -->
      <section class="pdf-section pdf-notes-section">
        <div class="pdf-section-header">
          <span class="pdf-section-icon notes"><i data-lucide="sticky-note" width="18" height="18"></i></span>
          <h2>Your Notes</h2>
        </div>
        <div class="pdf-section-body">
          <textarea id="learn-topic-note" class="input pdf-notes-input" placeholder="Capture key insights for revision...">${note}</textarea>
          <button class="btn btn-secondary btn-sm" data-topic-note-save="${topic.id}" style="margin-top:8px;">
            <i data-lucide="save" width="14" height="14"></i> Save Notes
          </button>
        </div>
      </section>

      <!-- Navigation Footer -->
      <footer class="pdf-topic-nav">
        <div class="pdf-nav-left">
          ${prevTopic ? `
            <button type="button" class="btn btn-secondary" data-topic-select="${prevTopic.id}">
              <i data-lucide="arrow-left" width="16" height="16"></i>
              <span class="pdf-nav-label">
                <small>Previous</small>
                <strong>${prevTopic.title}</strong>
              </span>
            </button>
          ` : '<div></div>'}
        </div>
        <div class="pdf-nav-center">
          <button type="button" class="btn btn-secondary" data-topic-lesson-open="${topic.id}">
            <i data-lucide="book-open-check" width="16" height="16"></i>
            Open Lesson View
          </button>
          <button type="button" class="btn btn-primary" data-topic-complete="${topic.id}">
            <i data-lucide="${isCompleted ? 'check-check' : 'check'}" width="16" height="16"></i>
            ${isCompleted ? 'Completed!' : 'Mark as Complete'}
          </button>
        </div>
        <div class="pdf-nav-right">
          ${nextTopic ? `
            <button type="button" class="btn btn-secondary" data-topic-select="${nextTopic.id}">
              <span class="pdf-nav-label">
                <small>Next</small>
                <strong>${nextTopic.title}</strong>
              </span>
              <i data-lucide="arrow-right" width="16" height="16"></i>
            </button>
          ` : '<div></div>'}
        </div>
      </footer>
    </article>
  `;
}

function renderRightPanel(subject, subjectState, topic, subjectProgress) {
  const due = learningStore.getDueRevisions(subject.id).length;
  const dueItems = learningStore.getDueRevisions(subject.id).slice(0, 4);
  const strengths = learningStore.getStrengthBuckets(subject.id);
  return `
    <aside class="learn-right-panel">
      <div class="card learn-sticky-panel">
        <h3 class="learn-panel-title"><i data-lucide="gauge" width="16" height="16"></i> Progress</h3>
        <div class="learn-progress-row"><span>${subject.title}</span><strong>${subjectProgress}%</strong></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${subjectProgress}%"></div></div>
        <div class="learn-metrics">
          <div><small>Completed Topics</small><strong>${subjectState.completedTopics.length}/${subject.topics.length}</strong></div>
          <div><small>Revisions Due</small><strong>${due}</strong></div>
          <div><small>Bookmarks</small><strong>${subjectState.bookmarks.length}</strong></div>
        </div>
      </div>

      <div class="card">
        <h3 class="learn-panel-title"><i data-lucide="sparkles" width="16" height="16"></i> Ask AI</h3>
        <div class="learn-ai-actions">
          ${Object.entries(AI_ACTION_LABELS).map(([key, label]) => `<button class="btn btn-secondary btn-sm" data-learn-ai="${key}" data-topic-id="${topic.id}">${label}</button>`).join('')}
        </div>
        <div class="learn-ai-result" id="learn-ai-result">No AI response yet.</div>
      </div>

      <div class="card">
        <h3 class="learn-panel-title"><i data-lucide="bell-ring" width="16" height="16"></i> Revision Reminders</h3>
        ${dueItems.length ? dueItems.map((item) => `
          <div class="learn-list-row">
            <span>${item.topicId.replaceAll('-', ' ')}</span>
            <button class="btn btn-secondary btn-sm" data-revision-done="${item.topicId}">Done</button>
          </div>
        `).join('') : '<p class="learn-empty">No revisions due right now.</p>'}
      </div>

      <div class="card">
        <h3 class="learn-panel-title"><i data-lucide="brain" width="16" height="16"></i> Strength Radar</h3>
        <div class="learn-strength-block">
          <p><strong>Strong Areas</strong></p>
          ${strengths.strong.length ? strengths.strong.map((s) => `<div class="learn-list-row"><span>${s.title}</span><strong>${s.strengthScore}</strong></div>`).join('') : '<p class="learn-empty">Keep practicing to unlock strengths.</p>'}
        </div>
        <div class="learn-strength-block">
          <p><strong>Weak Areas</strong></p>
          ${strengths.weak.length ? strengths.weak.map((s) => `<div class="learn-list-row"><span>${s.title}</span><strong>${s.strengthScore}</strong></div>`).join('') : '<p class="learn-empty">No weak hotspots yet.</p>'}
        </div>
      </div>
    </aside>
  `;
}

export function renderLearnSubject(params) {
  const subjectId = params.subject || 'cn';
  const subject = getLearningSubject(subjectId);
  if (!subject) {
    return `
      <div class="page-wrap">
        <h1 class="page-title">Learning Subject Not Found</h1>
        <button class="btn btn-primary" onclick="navigateTo('/learn')">Back to Learn Hub</button>
      </div>
    `;
  }

  const state = learningStore.getSubjectState(subject.id);
  const activeTopicId = params.topic || subject.topics[0]?.id;
  const activeTopic = getTopicById(subject.id, activeTopicId) || subject.topics[0];
  const subjectProgress = learningStore.getSubjectProgress(subject.id);
  const topicIndex = subject.topics.findIndex(t => t.id === activeTopicId);

  return `
    <div class="learn-subject-page anim-fade-up">
      <header class="learn-subject-header">
        <div>
          <div class="learn-breadcrumbs">
            <a href="#/dashboard">Dashboard</a>
            <span>/</span>
            <a href="#/learn">Learn</a>
            <span>/</span>
            <span>${subject.title}</span>
            <span>/</span>
            <span>${activeTopic.title}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('/learn')"><i data-lucide="arrow-left" width="14" height="14"></i> Learn Hub</button>
          <h1>${subject.title}</h1>
          <p>${subject.summary}</p>
        </div>
        <div class="learn-header-right">
          ${renderLevelFilters(subject)}
        </div>
      </header>

      <div class="learn-subject-layout">
        <aside class="learn-left-tree card">
          <div class="learn-tree-head">
            <h3><i data-lucide="${subject.icon}" width="16" height="16"></i> Topic Tree</h3>
            <span class="badge badge-secondary">${state.completedTopics.length}/${subject.topics.length} done</span>
          </div>
          <div class="learn-topic-tree">
            ${renderTopicTree(subject, state, activeTopic.id)}
          </div>
        </aside>

        <main class="learn-center-content">
          ${renderContent(activeTopic, subject.id, activeTopic.id, subject, topicIndex >= 0 ? topicIndex : 0)}
        </main>

        ${renderRightPanel(subject, state, activeTopic, subjectProgress)}
      </div>

      ${renderSupportFooter()}
      
      <!-- Ask Robin AI Companion -->
      ${renderAskRobinFab()}
      ${renderAskRobinPanel()}
    </div>
  `;
}

async function askLearningAI({ subjectTitle, topicTitle, actionKey, context, onRetryWait }) {
  for (let attempt = 1; attempt <= LEARN_AI_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const response = await fetch('/api/ai/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectTitle, topicTitle, actionType: actionKey, context }),
    });

    const payload = await response.json().catch(() => ({ reason: 'Learning AI unavailable right now.' }));
    if (response.ok) {
      return payload;
    }

    const shouldRetry = attempt < LEARN_AI_MAX_RETRY_ATTEMPTS && (response.status === 429 || response.status >= 500);
    if (shouldRetry) {
      const retryAfterSeconds = parseRetryAfterSeconds(
        response,
        payload,
        Math.min(LEARN_AI_MAX_BACKOFF_SECONDS, 2 ** (attempt - 1)),
      );
      const waitSeconds = Math.min(
        LEARN_AI_MAX_BACKOFF_SECONDS,
        Math.max(retryAfterSeconds, 2 ** (attempt - 1)),
      );

      for (let left = waitSeconds; left >= 1; left -= 1) {
        onRetryWait?.({
          attempt,
          maxAttempts: LEARN_AI_MAX_RETRY_ATTEMPTS,
          secondsLeft: left,
          status: response.status,
        });
        await sleep(1000);
      }
      continue;
    }

    const failure = new Error(payload.reason || 'Learning AI unavailable right now.');
    failure.status = response.status;
    failure.retryAfter = parseRetryAfterSeconds(response, payload, 1);
    throw failure;
  }

  throw new Error('Learning AI unavailable right now.');
}

function submitTopicQuiz(subject, topic) {
  const quiz = topic.quiz || [];
  if (!quiz.length) return;
  let correct = 0;
  let answered = 0;
  quiz.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="quiz-${idx}"]:checked`);
    if (!selected) return;
    answered += 1;
    if (Number(selected.value) === q.answerIndex) correct += 1;
  });

  if (answered !== quiz.length) {
    showToast('Please answer all quiz questions first.', 'warning');
    return;
  }

  const score = Math.round((correct / quiz.length) * 100);
  learningStore.recordQuizScore(subject.id, topic.id, score);
  const target = document.getElementById('learn-quiz-result');
  if (target) {
    target.innerHTML = score >= 70
      ? `Great work! Score: <strong>${score}%</strong> (${correct}/${quiz.length}).`
      : `Score: <strong>${score}%</strong> (${correct}/${quiz.length}). Revise key notes and retry.`;
  }
  showToast(`Quiz submitted: ${score}%`, score >= 70 ? 'success' : 'info');
}

// Store current subject globally for client-side topic switching
let _currentSubject = null;
let _currentTopicId = null;
let _learnSubjectPopstateHandler = null;

function registerLearnSubjectCleanup(cleanup) {
  const previousLeave = router.onRouteLeave;
  const wrappedLeave = () => {
    try {
      cleanup();
    } catch (_) {
      // no-op
    }

    if (typeof previousLeave === 'function') {
      try {
        previousLeave();
      } catch (_) {
        // no-op
      }
    }

    if (router.onRouteLeave === wrappedLeave) {
      router.onRouteLeave = null;
    }
  };

  router.onRouteLeave = wrappedLeave;
}

/**
 * Switch to a different topic WITHOUT triggering Next.js navigation
 * This re-renders only the necessary DOM elements
 */
function switchToTopic(topicId) {
  if (!_currentSubject) return;
  
  const topic = getTopicById(_currentSubject.id, topicId);
  if (!topic) {
    showToast('Topic not found', 'error');
    return;
  }
  
  _currentTopicId = topicId;
  setRobinContext(_currentSubject.title, topic.title, topic.content.beginnerExplanation);
  const state = learningStore.getSubjectState(_currentSubject.id);
  const subjectProgress = learningStore.getSubjectProgress(_currentSubject.id);
  const topicIndex = _currentSubject.topics.findIndex(t => t.id === topicId);
  
  // Update URL without triggering navigation (for bookmarking/sharing)
  const newUrl = `/learn/${_currentSubject.id}?topic=${topicId}`;
  window.history.pushState({ topic: topicId }, '', newUrl);
  
  // Update topic tree active states
  document.querySelectorAll('[data-topic-select]').forEach(node => {
    const nodeTopicId = node.getAttribute('data-topic-select');
    node.classList.toggle('active', nodeTopicId === topicId);
  });
  
  // Re-render main content area
  const contentArea = document.querySelector('.learn-center-content');
  if (contentArea) {
    contentArea.innerHTML = renderContent(topic, _currentSubject.id, topicId, _currentSubject, topicIndex >= 0 ? topicIndex : 0);
    
    // Re-initialize Lucide icons for new content
    if (window.lucide) window.lucide.createIcons();
    
    // Re-bind event handlers for the new content
    bindTopicContentEvents(_currentSubject, topic, topicId);
  }

  const rightPanel = document.querySelector('.learn-right-panel');
  if (rightPanel) {
    rightPanel.outerHTML = renderRightPanel(_currentSubject, state, topic, subjectProgress);
    bindTopicContentEvents(_currentSubject, topic, topicId);
  }
  
  // Update breadcrumb if exists
  const breadcrumb = document.querySelector('.pdf-breadcrumb');
  if (breadcrumb) {
    const lastSpan = breadcrumb.querySelector('span:last-child');
    if (lastSpan) lastSpan.textContent = topic.title;
  }
  
  // Scroll content to top
  contentArea?.scrollTo(0, 0);
  contentArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Bind event handlers for topic content (complete, bookmark, quiz, etc.)
 */
function bindTopicContentEvents(subject, topic, topicId) {
  // Topic switching (sidebar + prev/next buttons inside content)
  document.querySelectorAll('[data-topic-select]').forEach((node) => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-select');
      if (tid && tid !== _currentTopicId) {
        switchToTopic(tid);
      }
    };
  });

  // Mark complete button
  document.querySelectorAll('[data-topic-complete]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-complete');
      if (!tid) return;
      learningStore.markTopicCompleted(subject.id, tid);
      showToast('Topic marked complete. Progress updated.', 'success');
      
      // Update UI to show completed state
      node.innerHTML = '<i data-lucide="check-check" width="14" height="14"></i> Completed';
      if (window.lucide) window.lucide.createIcons();
      
      // Update topic tree item
      const treeItem = document.querySelector(`[data-topic-select="${tid}"]`);
      if (treeItem && !treeItem.querySelector('.learn-topic-check')) {
        const checkIcon = document.createElement('i');
        checkIcon.setAttribute('data-lucide', 'check-circle-2');
        checkIcon.setAttribute('width', '14');
        checkIcon.setAttribute('height', '14');
        checkIcon.className = 'learn-topic-check';
        treeItem.appendChild(checkIcon);
        if (window.lucide) window.lucide.createIcons();
      }

      const currentIndex = subject.topics.findIndex((t) => t.id === tid);
      const nextTopic = currentIndex >= 0 ? subject.topics[currentIndex + 1] : null;
      const updatedState = learningStore.getSubjectState(subject.id);
      const updatedProgress = learningStore.getSubjectProgress(subject.id);

      const doneBadge = document.querySelector('.learn-tree-head .badge');
      if (doneBadge) {
        doneBadge.textContent = `${updatedState.completedTopics.length}/${subject.topics.length} done`;
      }
      const progressValue = document.querySelector('.learn-progress-row strong');
      if (progressValue) {
        progressValue.textContent = `${updatedProgress}%`;
      }
      const progressFill = document.querySelector('.learn-progress-row')?.nextElementSibling?.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.width = `${updatedProgress}%`;
      }

      if (nextTopic) {
        switchToTopic(nextTopic.id);
      } else {
        showToast('Module complete! Great work.', 'success');
        const contentArea = document.querySelector('.learn-center-content');
        if (contentArea) {
          contentArea.innerHTML = `
            <section class="card" style="padding:24px;text-align:center;">
              <h2 style="margin-bottom:8px;">🎉 Module Complete</h2>
              <p style="color:var(--text-3);margin-bottom:16px;">You completed all ${subject.topics.length} topics in ${subject.title}.</p>
              <button class="btn btn-primary" onclick="navigateTo('/learn')">Go to Learn Hub</button>
            </section>
          `;
        }
      }
    };
  });
  
  // Bookmark button
  document.querySelectorAll('[data-topic-bookmark]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-bookmark');
      if (!tid) return;
      const bookmarked = learningStore.toggleTopicBookmark(subject.id, tid);
      showToast(bookmarked ? 'Topic bookmarked.' : 'Bookmark removed.', 'info');
    };
  });
  
  // Save notes button
  document.querySelectorAll('[data-topic-note-save]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-note-save');
      const noteVal = document.getElementById('learn-topic-note')?.value || '';
      if (!tid) return;
      learningStore.setTopicNote(subject.id, tid, noteVal);
      showToast('Quick notes saved.', 'success');
    };
  });
  
  // Quiz submit button
  document.querySelectorAll('[data-topic-quiz-submit]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-quiz-submit');
      const quizTopic = getTopicById(subject.id, tid || topicId);
      if (!quizTopic) return;
      submitTopicQuiz(subject, quizTopic);
    };
  });
  
  // Open lesson button
  document.querySelectorAll('[data-topic-lesson-open]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-topic-lesson-open');
      if (!tid) return;
      const lessons = getLessonsByTopic(tid);
      const firstLesson = lessons[0];
      if (!firstLesson) {
        showToast('No lesson available for this topic yet.', 'warning');
        return;
      }
      window.navigateTo(`/learn/${subject.id}/topic/${tid}/lesson/${firstLesson.id}`);
    };
  });
  
  // AI action buttons
  document.querySelectorAll('[data-learn-ai]').forEach(node => {
    node.onclick = async (e) => {
      e.preventDefault();
      const actionType = node.getAttribute('data-learn-ai');
      const resultNode = document.getElementById('learn-ai-result');
      if (!actionType || !resultNode) return;

      const aiButtons = Array.from(document.querySelectorAll('[data-learn-ai]'));
      aiButtons.forEach((button) => {
        if (!button.dataset.defaultLabel) {
          button.dataset.defaultLabel = button.textContent || 'Ask AI';
        }
        button.disabled = true;
      });

      node.textContent = 'Thinking...';
      resultNode.innerHTML = '<span class="learn-empty">Thinking...</span>';

      try {
        const payload = await askLearningAI({
          subjectTitle: subject.title,
          topicTitle: topic.title,
          actionKey: actionType,
          context: {
            stage: topic.stage,
            beginnerExplanation: topic.content.beginnerExplanation,
            intuition: topic.content.intuition,
          },
          onRetryWait: ({ attempt, maxAttempts, secondsLeft, status }) => {
            const reasonText = status === 429 ? 'AI rate limit reached' : 'AI service is recovering';
            node.textContent = `Retry in ${secondsLeft}s`;
            resultNode.innerHTML = `
              <span class="learn-empty">
                ${reasonText}. Retrying in ${secondsLeft}s (attempt ${attempt}/${maxAttempts})...
              </span>
            `;
          },
        });
        const text = (payload?.reply || '').replace(/\n/g, '<br/>');
        resultNode.innerHTML = text || '<span class="learn-empty">No response from AI.</span>';
      } catch (error) {
        if (Number(error?.status || 0) === 429) {
          const retryAfter = Math.max(1, Number(error?.retryAfter || 1));
          resultNode.innerHTML = `<span class="learn-empty">AI is rate-limited. Try again in ${retryAfter}s.</span>`;
          showToast(`AI is rate-limited. Retry in ${retryAfter}s.`, 'warning');
        } else {
          resultNode.innerHTML = '<span class="learn-empty">AI request failed.</span>';
          showToast('Learning AI request failed. Please retry.', 'error');
        }
      } finally {
        aiButtons.forEach((button) => {
          button.disabled = false;
          if (button.dataset.defaultLabel) {
            button.textContent = button.dataset.defaultLabel;
          }
        });
      }
    };
  });
  
  // Prev/Next topic navigation
  document.querySelectorAll('[data-nav-topic]').forEach(node => {
    node.onclick = (e) => {
      e.preventDefault();
      const tid = node.getAttribute('data-nav-topic');
      if (tid) switchToTopic(tid);
    };
  });
}

export function initLearnSubject(params) {
  const subject = getLearningSubject(params.subject || 'cn');
  if (!subject) return;

  const activeTopicId = params.topic || subject.topics[0]?.id;
  const activeTopic = getTopicById(subject.id, activeTopicId) || subject.topics[0];
  if (!activeTopic) return;

  // Store globally for client-side switching
  _currentSubject = subject;
  _currentTopicId = activeTopicId;
  _currentStageFilter = null; // Reset filter on page load

  // Level filter buttons
  document.querySelectorAll('[data-stage-filter]').forEach((node) => {
    node.onclick = (e) => {
      e.preventDefault();
      const stage = node.getAttribute('data-stage-filter');
      
      // Update filter state
      _currentStageFilter = stage === 'all' ? null : stage;
      
      // Update button active states
      document.querySelectorAll('[data-stage-filter]').forEach((btn) => {
        const btnStage = btn.getAttribute('data-stage-filter');
        const isActive = (_currentStageFilter === null && btnStage === 'all') || 
                         (_currentStageFilter === btnStage);
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive.toString());
      });
      
      // Re-render topic tree with filter applied
      const state = learningStore.getSubjectState(subject.id);
      const topicTree = document.querySelector('.learn-topic-tree');
      if (topicTree) {
        topicTree.innerHTML = renderTopicTree(subject, state, _currentTopicId);
        if (window.lucide) window.lucide.createIcons();
        
        // Re-bind topic click handlers
        document.querySelectorAll('[data-topic-select]').forEach((topicNode) => {
          topicNode.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const tid = topicNode.getAttribute('data-topic-select');
            if (tid && tid !== _currentTopicId) {
              switchToTopic(tid);
            }
          };
        });
      }
      
      // Update done count badge
      const filteredTopics = _currentStageFilter
        ? subject.topics.filter(t => t.stage === _currentStageFilter)
        : subject.topics;
      const filteredCompleted = filteredTopics.filter(t => state.completedTopics.includes(t.id)).length;
      const countBadge = document.querySelector('.learn-tree-head .badge');
      if (countBadge) {
        countBadge.textContent = `${filteredCompleted}/${filteredTopics.length} done`;
      }
    };
  });

  // Topic tree navigation - CLIENT-SIDE switching (no page reload)
  document.querySelectorAll('[data-topic-select]').forEach((node) => {
    const topicId = node.getAttribute('data-topic-select');
    
    node.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (topicId && topicId !== _currentTopicId) {
        switchToTopic(topicId);
      }
    };
  });

  // Bind content event handlers
  bindTopicContentEvents(subject, activeTopic, activeTopicId);
  
  // Revision done buttons (in right panel)
  document.querySelectorAll('[data-revision-done]').forEach((node) => {
    node.onclick = (e) => {
      e.preventDefault();
      const topicId = node.getAttribute('data-revision-done');
      if (!topicId) return;
      learningStore.markRevisionDone(subject.id, topicId);
      showToast('Revision marked done.', 'success');
      // Refresh the panel
      switchToTopic(_currentTopicId);
    };
  });
  
  // Initialize Ask Robin AI Companion
  setRobinContext(subject.title, activeTopic.title, activeTopic.content.beginnerExplanation);
  initAskRobin();

  // Sync browser back/forward with selected topic
  if (_learnSubjectPopstateHandler) {
    window.removeEventListener('popstate', _learnSubjectPopstateHandler);
  }

  _learnSubjectPopstateHandler = () => {
    const pathnameParts = window.location.pathname.split('/').filter(Boolean);
    const maybeSubject = pathnameParts[1] || subject.id;
    const queryTopic = new URLSearchParams(window.location.search).get('topic');
    if (_currentSubject?.id === maybeSubject && queryTopic && queryTopic !== _currentTopicId) {
      switchToTopic(queryTopic);
    }
  };

  window.addEventListener('popstate', _learnSubjectPopstateHandler);

  registerLearnSubjectCleanup(() => {
    if (_learnSubjectPopstateHandler) {
      window.removeEventListener('popstate', _learnSubjectPopstateHandler);
      _learnSubjectPopstateHandler = null;
    }
    _currentSubject = null;
    _currentTopicId = null;
    _currentStageFilter = null;
  });
}

