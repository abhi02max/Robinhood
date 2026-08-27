import { askLearningAi, fetchSubjectTree } from './experience-api.js';
import { getSubjectTree, listSubjects, normalizeSubjectName, toSlug } from './experience-data.js';
import { getLearnToProblemsRoute, getSheetsRoute } from '../data/product-flow.js';

function renderSubjectTree(subjectName, tree) {
  return `
    <div class="learn-tree-grid">
      ${(tree.chapters || []).map((chapter, chapterIndex) => `
        <section class="learn-chapter-card" data-chapter-card="${chapterIndex}">
          <header>
            <p class="learn-chapter-kicker">Chapter ${chapterIndex + 1}</p>
            <h3>${chapter.name}</h3>
          </header>
          <div class="learn-topic-list">
            ${chapter.topics.map((topic) => `
              <button class="learn-topic-row" data-topic-open="${topic.name}">
                <span>
                  <strong>${topic.name}</strong>
                  <small>${topic.subtopics.length} subtopics</small>
                </span>
                <i data-lucide="arrow-right" width="15" height="15"></i>
              </button>
            `).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function getRequestedSubject(params) {
  const routeSubject = params?.subject ? normalizeSubjectName(params.subject) : '';
  if (routeSubject) return routeSubject;

  if (typeof window !== 'undefined') {
    const query = new URLSearchParams(window.location.search || '');
    const querySubject = query.get('subject');
    if (querySubject) return normalizeSubjectName(querySubject);
  }

  return listSubjects()[0].name;
}

export function renderLearnHub(params = {}) {
  const selectedSubject = getRequestedSubject(params);
  const tree = getSubjectTree(selectedSubject);
  const subjectOptions = listSubjects();

  return `
    <div class="experience-page learn-experience anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Learn Hub</p>
          <h1>Structured Computer Science Mastery</h1>
          <p>Pick a subject, traverse chapters, open topic hierarchy, and move into subtopic-level learning in one flow.</p>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="layers" width="14" height="14"></i> ${subjectOptions.length} Subjects</span>
          <span class="meta-pill"><i data-lucide="network" width="14" height="14"></i> Chapter Tree</span>
          <span class="meta-pill"><i data-lucide="sparkles" width="14" height="14"></i> AI Helper Ready</span>
        </div>
      </header>

      <div class="experience-shell">
        <aside class="experience-left">
          <div class="card experience-panel">
            <h3><i data-lucide="book-open" width="16" height="16"></i> Subject Explorer</h3>
            <label class="experience-label" for="learn-subject-select">Subjects</label>
            <select class="select" id="learn-subject-select">
              ${subjectOptions.map((subject) => `
                <option value="${subject.name}" ${subject.name === selectedSubject ? 'selected' : ''}>${subject.name}</option>
              `).join('')}
            </select>
            <div class="experience-list" id="learn-subject-list">
              ${subjectOptions.map((subject) => `
                <button class="experience-list-item ${subject.name === selectedSubject ? 'active' : ''}" data-subject-open="${subject.name}">
                  <span>${subject.name}</span>
                  <i data-lucide="chevron-right" width="14" height="14"></i>
                </button>
              `).join('')}
            </div>
          </div>
        </aside>

        <main class="experience-main">
          <div class="card experience-panel">
            <div class="experience-section-head">
              <div>
                <p class="experience-kicker">Current Subject</p>
                <h2>${selectedSubject}</h2>
              </div>
              <div class="flow-link-row">
                <button class="btn btn-primary btn-sm" id="learn-start-journey-btn">Start Journey</button>
                <button class="btn btn-secondary btn-sm" id="learn-open-problems-btn">Practice Problems</button>
              </div>
            </div>
            <div class="journey-caption">One click opens the selected subject flow. Then move to problems, sheets, or SQL practice from the same screen.</div>
            <div id="learn-tree-container">
              ${renderSubjectTree(selectedSubject, tree)}
            </div>
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel">
            <h3><i data-lucide="bot" width="16" height="16"></i> AI Study Helper</h3>
            <p class="experience-muted">Ask for a beginner-first explanation, interview framing, or revision plan.</p>
            <div class="experience-ai-chip-row">
              <button class="btn btn-secondary btn-sm" data-learn-ai-action="learn">Concept Brief</button>
              <button class="btn btn-secondary btn-sm" data-learn-ai-action="interview">Interview Angle</button>
              <button class="btn btn-secondary btn-sm" data-learn-ai-action="real_world">Real Use Case</button>
            </div>
            <textarea id="learn-ai-input" class="input experience-ai-input" rows="4" placeholder="Ask AI about this subject..."></textarea>
            <button class="btn btn-primary" id="learn-ai-submit">
              <i data-lucide="send" width="14" height="14"></i>
              Ask AI
            </button>
            <div class="experience-ai-output" id="learn-ai-output">Your AI response will appear here.</div>
          </div>

          <div class="card experience-panel compact">
            <h3><i data-lucide="route" width="16" height="16"></i> Product Flow</h3>
            <button class="btn btn-secondary btn-sm" id="learn-open-sheets-btn">Open Coding Sheets</button>
            <button class="btn btn-secondary btn-sm" id="learn-open-sql-track-btn">Open SQL A-Z Track</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initLearnHub(params = {}) {
  const selectedSubject = getRequestedSubject(params);

  const openSubject = (subjectName) => {
    const subjectSlug = toSlug(subjectName);
    window.navigateTo(`/learn/${subjectSlug}`);
  };

  const selectEl = document.getElementById('learn-subject-select');
  if (selectEl) {
    selectEl.addEventListener('change', (event) => {
      const target = event.target;
      const nextSubject = target?.value || selectedSubject;
      openSubject(nextSubject);
    });
  }

  document.querySelectorAll('[data-subject-open]').forEach((node) => {
    node.addEventListener('click', () => {
      const subjectName = node.getAttribute('data-subject-open') || selectedSubject;
      openSubject(subjectName);
    });
  });

  document.querySelectorAll('[data-topic-open]').forEach((node) => {
    node.addEventListener('click', () => {
      const topicName = node.getAttribute('data-topic-open');
      if (!topicName) return;
      window.navigateTo(`/learn/${toSlug(selectedSubject)}/topic/${toSlug(topicName)}`);
    });
  });

  document.getElementById('learn-start-journey-btn')?.addEventListener('click', () => {
    openSubject(selectedSubject);
  });

  const openProblemsBtn = document.getElementById('learn-open-problems-btn');
  if (openProblemsBtn) {
    openProblemsBtn.addEventListener('click', () => {
      const tree = getSubjectTree(selectedSubject);
      const firstTopic = tree.chapters?.[0]?.topics?.[0]?.name || '';
      window.navigateTo(getLearnToProblemsRoute(selectedSubject, firstTopic));
    });
  }

  document.getElementById('learn-open-sheets-btn')?.addEventListener('click', () => {
    window.navigateTo(getSheetsRoute(75));
  });

  document.getElementById('learn-open-sql-track-btn')?.addEventListener('click', () => {
    window.navigateTo('/sql-track');
  });

  const aiOutput = document.getElementById('learn-ai-output');
  const aiInput = document.getElementById('learn-ai-input');
  let selectedAction = 'learn';

  document.querySelectorAll('[data-learn-ai-action]').forEach((node) => {
    node.addEventListener('click', () => {
      selectedAction = node.getAttribute('data-learn-ai-action') || 'learn';
      document.querySelectorAll('[data-learn-ai-action]').forEach((button) => button.classList.remove('active'));
      node.classList.add('active');
    });
  });

  const aiSubmit = document.getElementById('learn-ai-submit');
  if (aiSubmit && aiInput && aiOutput) {
    aiSubmit.addEventListener('click', async () => {
      const prompt = aiInput.value.trim();
      const tree = getSubjectTree(selectedSubject);
      const firstTopic = tree.chapters?.[0]?.topics?.[0]?.name || 'Foundations';
      aiOutput.textContent = 'Asking AI...';
      try {
        const response = await askLearningAi(selectedSubject, firstTopic, selectedAction, prompt || 'Give me a structured learning guide.');
        aiOutput.textContent = response?.reply || 'No response received.';
      } catch (error) {
        aiOutput.textContent = error.message || 'AI request failed.';
      }
    });
  }

  fetchSubjectTree(selectedSubject)
    .then((tree) => {
      const container = document.getElementById('learn-tree-container');
      if (!container) return;
      container.innerHTML = renderSubjectTree(selectedSubject, tree);
      document.querySelectorAll('[data-topic-open]').forEach((node) => {
        node.addEventListener('click', () => {
          const topicName = node.getAttribute('data-topic-open');
          if (!topicName) return;
          window.navigateTo(`/learn/${toSlug(selectedSubject)}/topic/${toSlug(topicName)}`);
        });
      });
      window.lucide?.createIcons();
    })
    .catch(() => {});

  window.lucide?.createIcons();
}
