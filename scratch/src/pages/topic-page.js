import { askLearningAi, fetchSubjectTree } from './experience-api.js';
import { findTopicInTree, listSubjects, normalizeSubjectName, toSlug } from './experience-data.js';
import { getLearnToProblemsRoute, getSheetsRoute } from '../data/product-flow.js';

function renderTopicTree(tree, activeTopicName) {
  return (tree.chapters || []).map((chapter) => `
    <div class="topic-tree-chapter">
      <h4>${chapter.name}</h4>
      <div class="topic-tree-list">
        ${chapter.topics.map((topic) => `
          <button class="topic-tree-item ${topic.name === activeTopicName ? 'active' : ''}" data-topic-switch="${topic.name}">
            <span>${topic.name}</span>
            <small>${topic.subtopics.length} subtopics</small>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderSubtopics(topic, subjectSlug, topicSlug) {
  return topic.subtopics.map((subtopic) => `
    <article class="subtopic-card card">
      <h3>${subtopic}</h3>
      <p>Open the 4-tab flow for explanation, PDF, YouTube, and mapped practice problems.</p>
      <button class="btn btn-primary btn-sm" data-subtopic-open="${subtopic}">
        Start Subtopic Flow
        <i data-lucide="arrow-right" width="14" height="14"></i>
      </button>
      <a class="subtopic-link" href="#" data-subtopic-open="${subtopic}">Go to /learn/${subjectSlug}/topic/${topicSlug}/subtopic/${toSlug(subtopic)}</a>
    </article>
  `).join('');
}

export function renderTopicPage(params = {}) {
  const subjectName = normalizeSubjectName(params.subject);
  const subjectSlug = toSlug(subjectName);
  const resolved = findTopicInTree(subjectName, params.topic);
  const topicName = resolved.topic.name;
  const topicSlug = toSlug(topicName);
  const subjects = listSubjects();

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Topic Hierarchy</p>
          <h1>${topicName}</h1>
          <p>Explore subtopics and open the complete 4-tab learning flow for each subtopic.</p>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="book-copy" width="14" height="14"></i> Subject: ${subjectName}</span>
          <span class="meta-pill"><i data-lucide="layers-3" width="14" height="14"></i> ${resolved.topic.subtopics.length} Subtopics</span>
        </div>
      </header>

      <div class="experience-shell">
        <aside class="experience-left">
          <div class="card experience-panel">
            <h3><i data-lucide="folder-tree" width="16" height="16"></i> Topic Menu</h3>
            <div class="experience-list compact">
              ${subjects.map((subject) => `
                <button class="experience-list-item ${subject.name === subjectName ? 'active' : ''}" data-subject-jump="${subject.name}">
                  <span>${subject.name}</span>
                </button>
              `).join('')}
            </div>
            <div class="topic-tree-wrap" id="topic-tree-wrap">
              ${renderTopicTree(resolved.tree, topicName)}
            </div>
          </div>
        </aside>

        <main class="experience-main">
          <div class="card experience-panel">
            <div class="experience-section-head">
              <div>
                <p class="experience-kicker">${resolved.chapter.name}</p>
                <h2>${topicName}</h2>
              </div>
              <div class="flow-link-row">
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('/learn/${subjectSlug}')">Back to Subject</button>
                <button class="btn btn-secondary btn-sm" id="topic-open-problems">Practice Problems</button>
                <button class="btn btn-secondary btn-sm" id="topic-open-sheets">Open Sheets</button>
              </div>
            </div>
            <div class="subtopic-grid" id="subtopic-grid">
              ${renderSubtopics(resolved.topic, subjectSlug, topicSlug)}
            </div>
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel">
            <h3><i data-lucide="sparkle" width="16" height="16"></i> AI Topic Mentor</h3>
            <div class="experience-ai-chip-row">
              <button class="btn btn-secondary btn-sm" data-topic-ai-action="learn">Explain</button>
              <button class="btn btn-secondary btn-sm" data-topic-ai-action="interview">Interview Prep</button>
              <button class="btn btn-secondary btn-sm" data-topic-ai-action="quiz">Quick Quiz</button>
            </div>
            <textarea class="input experience-ai-input" id="topic-ai-input" rows="4" placeholder="How should I study this topic from basic to advanced?"></textarea>
            <button class="btn btn-primary" id="topic-ai-submit">Ask AI</button>
            <div class="experience-ai-output" id="topic-ai-output">Ask a question to get a guided study sequence and interview framing.</div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initTopicPage(params = {}) {
  const subjectName = normalizeSubjectName(params.subject);
  const subjectSlug = toSlug(subjectName);
  const resolved = findTopicInTree(subjectName, params.topic);
  let selectedAction = 'learn';

  const wireSubtopicButtons = () => {
    document.querySelectorAll('[data-subtopic-open]').forEach((node) => {
      node.addEventListener('click', (event) => {
        event.preventDefault();
        const subtopicName = node.getAttribute('data-subtopic-open');
        if (!subtopicName) return;
        window.navigateTo(`/learn/${subjectSlug}/topic/${toSlug(resolved.topic.name)}/subtopic/${toSlug(subtopicName)}`);
      });
    });
  };

  wireSubtopicButtons();

  document.querySelectorAll('[data-subject-jump]').forEach((node) => {
    node.addEventListener('click', () => {
      const nextSubject = node.getAttribute('data-subject-jump');
      if (!nextSubject) return;
      window.navigateTo(`/learn/${toSlug(nextSubject)}`);
    });
  });

  document.querySelectorAll('[data-topic-switch]').forEach((node) => {
    node.addEventListener('click', () => {
      const nextTopic = node.getAttribute('data-topic-switch');
      if (!nextTopic) return;
      window.navigateTo(`/learn/${subjectSlug}/topic/${toSlug(nextTopic)}`);
    });
  });

  document.querySelectorAll('[data-topic-ai-action]').forEach((node) => {
    node.addEventListener('click', () => {
      selectedAction = node.getAttribute('data-topic-ai-action') || 'learn';
      document.querySelectorAll('[data-topic-ai-action]').forEach((button) => button.classList.remove('active'));
      node.classList.add('active');
    });
  });

  const aiInput = document.getElementById('topic-ai-input');
  const aiOutput = document.getElementById('topic-ai-output');
  const aiSubmit = document.getElementById('topic-ai-submit');
  if (aiSubmit && aiInput && aiOutput) {
    aiSubmit.addEventListener('click', async () => {
      aiOutput.textContent = 'Thinking...';
      try {
        const response = await askLearningAi(subjectName, resolved.topic.name, selectedAction, aiInput.value || 'Explain this topic with examples.');
        aiOutput.textContent = response?.reply || 'No response received';
      } catch (error) {
        aiOutput.textContent = error.message || 'AI request failed';
      }
    });
  }

  document.getElementById('topic-open-problems')?.addEventListener('click', () => {
    window.navigateTo(getLearnToProblemsRoute(subjectName, resolved.topic.name));
  });

  document.getElementById('topic-open-sheets')?.addEventListener('click', () => {
    window.navigateTo(getSheetsRoute(75));
  });

  fetchSubjectTree(subjectName)
    .then((tree) => {
      const treeWrap = document.getElementById('topic-tree-wrap');
      if (treeWrap) {
        treeWrap.innerHTML = renderTopicTree(tree, resolved.topic.name);
        document.querySelectorAll('[data-topic-switch]').forEach((node) => {
          node.addEventListener('click', () => {
            const nextTopic = node.getAttribute('data-topic-switch');
            if (!nextTopic) return;
            window.navigateTo(`/learn/${subjectSlug}/topic/${toSlug(nextTopic)}`);
          });
        });
      }
      window.lucide?.createIcons();
    })
    .catch(() => {});

  window.lucide?.createIcons();
}
