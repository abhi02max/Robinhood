import { getLessonById, getLessonsByTopic, getTopicContext } from '../data/learning-relations.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

function lessonNavItem(lesson, currentLessonId) {
  const active = lesson.id === currentLessonId ? 'active' : '';
  return `
    <button class="lesson-nav-item ${active}" data-lesson-id="${lesson.id}" type="button">
      <span>${lesson.orderIndex}. ${lesson.title}</span>
    </button>
  `;
}

export function renderLearnLesson(params) {
  const { subject, topic, lessonId } = params || {};
  const lesson = getLessonById(lessonId);
  const context = getTopicContext(subject, topic);
  if (!lesson || !context.subject || !context.topic) {
    return `
      <div class="page-wrap">
        <h1 class="page-title">Lesson not found</h1>
        <p class="page-subtitle">The requested lesson path is invalid.</p>
        <button class="btn btn-primary" onclick="navigateTo('/learn')">Back to Learn Hub</button>
      </div>
    `;
  }

  const lessons = getLessonsByTopic(topic);
  const lessonIndex = lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  const topicContent = context.topic.content || {};
  const interviewQuestions = topicContent.interviewQuestions || [];
  const companyUsageExamples = topicContent.companyUsageExamples || [];
  const commonMistakes = topicContent.commonMistakes || [];
  const revisionNotes = lesson.revisionNotes || [];
  const practiceQuestions = lesson.practiceQuestions || [];
  const focusByLesson = {
    1: 'Beginner-first explanation + core definitions',
    2: 'Intuition, mechanisms, and technical flow',
    3: 'Production architecture and real-world trade-offs',
    4: 'Interview framing, red flags, and edge-case reasoning',
    5: 'Revision notes, memory hooks, and final self-check',
  };

  return `
    <div class="learn-subject-page anim-fade-up">
      <header class="learn-subject-header">
        <div>
          <div class="learn-breadcrumbs">
            <a href="#/dashboard">Dashboard</a>
            <span>/</span>
            <a href="#/learn">Learn</a>
            <span>/</span>
            <a href="#/learn/${context.subject.id}?topic=${context.topic.id}">${context.subject.title}</a>
            <span>/</span>
            <span>${context.topic.title}</span>
            <span>/</span>
            <span>${lesson.title}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('/learn/${context.subject.id}?topic=${context.topic.id}')">
            <i data-lucide="arrow-left" width="14" height="14"></i> Back to Topic
          </button>
          <h1>${lesson.title}</h1>
          <p>${lesson.summary}</p>
        </div>
      </header>

      <div class="learn-subject-layout">
        <aside class="learn-left-tree card">
          <div class="learn-tree-head">
            <h3><i data-lucide="book-open" width="16" height="16"></i> Lesson Sequence</h3>
            <span class="badge badge-secondary">${lesson.orderIndex}/${lessons.length}</span>
          </div>
          <div class="lesson-nav-list">
            ${lessons.map((entry) => lessonNavItem(entry, lesson.id)).join('')}
          </div>
        </aside>

        <main class="learn-center-content">
          <article class="pdf-topic-viewer">
            <header class="pdf-topic-header">
              <div class="pdf-header-left">
                <div class="pdf-topic-number">${String(lesson.orderIndex).padStart(2, '0')}</div>
                <div>
                  <h1>${lesson.title}</h1>
                  <p>${lesson.objective}</p>
                </div>
              </div>
            </header>

            <section class="pdf-section">
              <h2>Learning Focus</h2>
              <p>${focusByLesson[lesson.orderIndex] || 'Layered topic understanding from basics to advanced interview readiness.'}</p>
            </section>

            <section class="pdf-section">
              <h2>Core Notes</h2>
              <ul class="pdf-list">
                ${revisionNotes.map((note) => `<li>${note}</li>`).join('') || '<li>No revision notes available.</li>'}
              </ul>
            </section>

            <section class="pdf-section">
              <h2>Practice Questions</h2>
              <ul class="pdf-list">
                ${practiceQuestions.map((q) => `<li>${q}</li>`).join('') || '<li>No practice questions available.</li>'}
              </ul>
            </section>

            <section class="pdf-section">
              <h2>Interview Perspective</h2>
              <ul class="pdf-list">
                ${interviewQuestions.map((q) => `<li>${q}</li>`).join('') || '<li>No interview questions available.</li>'}
              </ul>
            </section>

            <section class="pdf-section">
              <h2>Industry Use Cases</h2>
              <ul class="pdf-list">
                ${companyUsageExamples.map((q) => `<li>${q}</li>`).join('') || '<li>No company examples available.</li>'}
              </ul>
            </section>

            <section class="pdf-section">
              <h2>Common Mistakes</h2>
              <ul class="pdf-list">
                ${commonMistakes.map((m) => `<li>${m}</li>`).join('') || '<li>No common mistakes listed.</li>'}
              </ul>
            </section>

            <footer class="pdf-topic-nav">
              <div class="pdf-nav-left">
                ${prevLesson ? `
                  <button type="button" class="btn btn-secondary" data-lesson-nav="${prevLesson.id}">
                    <i data-lucide="arrow-left" width="16" height="16"></i>
                    <span class="pdf-nav-label"><small>Previous</small><strong>${prevLesson.title}</strong></span>
                  </button>
                ` : '<div></div>'}
              </div>
              <div class="pdf-nav-center">
                <button type="button" class="btn btn-primary" onclick="navigateTo('/learn/${context.subject.id}?topic=${context.topic.id}')">
                  Return to Topic
                </button>
              </div>
              <div class="pdf-nav-right">
                ${nextLesson ? `
                  <button type="button" class="btn btn-secondary" data-lesson-nav="${nextLesson.id}">
                    <span class="pdf-nav-label"><small>Next</small><strong>${nextLesson.title}</strong></span>
                    <i data-lucide="arrow-right" width="16" height="16"></i>
                  </button>
                ` : '<div></div>'}
              </div>
            </footer>
          </article>
        </main>
      </div>

      ${renderAskRobinFab()}
      ${renderAskRobinPanel()}
    </div>
  `;
}

export function initLearnLesson(params) {
  const { subject, topic } = params || {};
  const lessonId = params?.lessonId || '';
  const lesson = getLessonById(lessonId);
  const context = getTopicContext(subject, topic);
  setRobinContext(
    context?.subject?.title || 'CS Fundamentals',
    lesson?.title || context?.topic?.title || 'Lesson',
    `Explain this lesson from basics to advanced with interview-focused takeaways and practical examples.`
  );
  initAskRobin();

  document.querySelectorAll('[data-lesson-id]').forEach((node) => {
    node.addEventListener('click', () => {
      const id = node.getAttribute('data-lesson-id');
      if (id) window.navigateTo(`/learn/${subject}/topic/${topic}/lesson/${id}`);
    });
  });

  document.querySelectorAll('[data-lesson-nav]').forEach((node) => {
    node.addEventListener('click', () => {
      const id = node.getAttribute('data-lesson-nav');
      if (id) window.navigateTo(`/learn/${subject}/topic/${topic}/lesson/${id}`);
    });
  });
}

