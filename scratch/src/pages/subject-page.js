import { askLearningAi, fetchSubjectTree } from './experience-api.js';
import { getSubjectTree, listSubjects, normalizeSubjectName, toSlug } from './experience-data.js';
import { getLearnToProblemsRoute } from '../data/product-flow.js';

function renderChapterTree(subjectName, tree) {
  return (tree.chapters || []).map((chapter, chapterIndex) => `
    <section class="subject-chapter-block card" data-chapter-block="${chapterIndex}">
      <button class="subject-chapter-toggle" data-chapter-toggle="${chapterIndex}">
        <span>
          <small>Chapter ${chapterIndex + 1}</small>
          <strong>${chapter.name}</strong>
        </span>
        <i data-lucide="chevron-down" width="16" height="16"></i>
      </button>
      <div class="subject-topic-stack" data-chapter-body="${chapterIndex}">
        ${chapter.topics.map((topic) => `
          <article class="subject-topic-card">
            <header>
              <h3>${topic.name}</h3>
              <span>${topic.subtopics.length} subtopics</span>
            </header>
            <div class="subject-subtopic-chip-list">
              ${topic.subtopics.slice(0, 4).map((subtopic) => `<span class="subject-subtopic-chip">${subtopic}</span>`).join('')}
            </div>
            <button class="btn btn-primary btn-sm" data-topic-open="${topic.name}">
              Open Topic
              <i data-lucide="arrow-right" width="14" height="14"></i>
            </button>
          </article>
        `).join('')}
      </div>
    </section>
  `).join('');
}

export function renderSubjectPage(params = {}) {
  const subjectName = normalizeSubjectName(params.subject);
  const subjectTree = getSubjectTree(subjectName);
  const subjects = listSubjects();
  const chapterCount = subjectTree.chapters.length;
  const topicCount = subjectTree.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0);

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Subject Explorer</p>
          <h1>${subjectName}</h1>
          <p>Traverse the chapter tree and move from topic hierarchy into subtopic-level learning tabs.</p>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="folder-tree" width="14" height="14"></i> ${chapterCount} Chapters</span>
          <span class="meta-pill"><i data-lucide="list-tree" width="14" height="14"></i> ${topicCount} Topics</span>
          <span class="meta-pill"><i data-lucide="book-marked" width="14" height="14"></i> 4-tab Learning</span>
        </div>
      </header>

      <div class="experience-shell">
        <aside class="experience-left">
          <div class="card experience-panel">
            <h3><i data-lucide="list" width="16" height="16"></i> Subjects</h3>
            <div class="experience-list">
              ${subjects.map((subject) => `
                <button class="experience-list-item ${subject.name === subjectName ? 'active' : ''}" data-subject-open="${subject.name}">
                  <span>${subject.name}</span>
                  <i data-lucide="chevron-right" width="14" height="14"></i>
                </button>
              `).join('')}
            </div>
          </div>
        </aside>

        <main class="experience-main">
          <div class="experience-stack" id="subject-chapter-tree">
            ${renderChapterTree(subjectName, subjectTree)}
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel">
            <h3><i data-lucide="sparkles" width="16" height="16"></i> AI Subject Coach</h3>
            <p class="experience-muted">Ask for study order, interview focus, and high-yield revision cues.</p>
            <textarea id="subject-ai-input" class="input experience-ai-input" rows="4" placeholder="What should I prioritize first in this subject?"></textarea>
            <button class="btn btn-primary" id="subject-ai-submit">Generate Plan</button>
            <div class="experience-ai-output" id="subject-ai-output">No AI response yet.</div>
          </div>

          <div class="card experience-panel compact">
            <h3><i data-lucide="navigation" width="16" height="16"></i> Quick Paths</h3>
            <button class="btn btn-secondary btn-sm" id="subject-open-first-topic">Open First Topic</button>
            <button class="btn btn-secondary btn-sm" id="subject-open-problems">Practice Problems</button>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('/learn')">Back to Learn Hub</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

export function initSubjectPage(params = {}) {
  const subjectName = normalizeSubjectName(params.subject);
  const subjectSlug = toSlug(subjectName);

  const wireTopicButtons = () => {
    document.querySelectorAll('[data-topic-open]').forEach((node) => {
      node.addEventListener('click', () => {
        const topicName = node.getAttribute('data-topic-open');
        if (!topicName) return;
        window.navigateTo(`/learn/${subjectSlug}/topic/${toSlug(topicName)}`);
      });
    });
  };

  const wireChapterToggles = () => {
    document.querySelectorAll('[data-chapter-toggle]').forEach((node) => {
      node.addEventListener('click', () => {
        const idx = node.getAttribute('data-chapter-toggle');
        const body = document.querySelector(`[data-chapter-body="${idx}"]`);
        if (!body) return;
        body.classList.toggle('collapsed');
        node.classList.toggle('collapsed');
      });
    });
  };

  wireTopicButtons();
  wireChapterToggles();

  document.querySelectorAll('[data-subject-open]').forEach((node) => {
    node.addEventListener('click', () => {
      const targetSubject = node.getAttribute('data-subject-open');
      if (!targetSubject) return;
      window.navigateTo(`/learn/${toSlug(targetSubject)}`);
    });
  });

  const openFirstTopic = document.getElementById('subject-open-first-topic');
  if (openFirstTopic) {
    openFirstTopic.addEventListener('click', () => {
      const tree = getSubjectTree(subjectName);
      const topicName = tree.chapters?.[0]?.topics?.[0]?.name;
      if (!topicName) return;
      window.navigateTo(`/learn/${subjectSlug}/topic/${toSlug(topicName)}`);
    });
  }

  const openProblemsBtn = document.getElementById('subject-open-problems');
  if (openProblemsBtn) {
    openProblemsBtn.addEventListener('click', () => {
      const tree = getSubjectTree(subjectName);
      const topicName = tree.chapters?.[0]?.topics?.[0]?.name || '';
      window.navigateTo(getLearnToProblemsRoute(subjectName, topicName));
    });
  }

  const aiSubmit = document.getElementById('subject-ai-submit');
  const aiInput = document.getElementById('subject-ai-input');
  const aiOutput = document.getElementById('subject-ai-output');
  if (aiSubmit && aiInput && aiOutput) {
    aiSubmit.addEventListener('click', async () => {
      const tree = getSubjectTree(subjectName);
      const topicName = tree.chapters?.[0]?.topics?.[0]?.name || 'Foundations';
      aiOutput.textContent = 'Generating...';
      try {
        const result = await askLearningAi(subjectName, topicName, 'learn', aiInput.value || 'Give me a practical study plan.');
        aiOutput.textContent = result?.reply || 'No response';
      } catch (error) {
        aiOutput.textContent = error.message || 'AI request failed';
      }
    });
  }

  fetchSubjectTree(subjectName)
    .then((tree) => {
      const mount = document.getElementById('subject-chapter-tree');
      if (!mount) return;
      mount.innerHTML = renderChapterTree(subjectName, tree);
      wireTopicButtons();
      wireChapterToggles();
      window.lucide?.createIcons();
    })
    .catch(() => {});

  window.lucide?.createIcons();
}
