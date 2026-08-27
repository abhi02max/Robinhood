import { askLearningAi, fetchNotes, fetchPdf, fetchYoutube } from 'pages/experience-api.js';
import { toSlug } from 'pages/experience-data.js';
import { getSubtopicContentRegistryEntry, resolveSubtopicContext } from 'data/content-registry.js';
import { getDebuggerFailureRoute, getSheetsRoute } from 'data/product-flow.js';
import { getConceptQuestionDetails } from 'data/concept-questions-registry.js';
import { showToast } from 'components/notifications.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getErrorMessage(error) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  return 'Request failed.';
}

function renderLearningTabs(activeTab, registryEntry) {
  const isTheoryMode = Array.isArray(registryEntry?.problems?.items) && registryEntry.problems.items.some(p => p.isTheory);
  const practiceLabel = isTheoryMode ? 'Practice' : 'Problems';

  const tabs = [
    { id: 'pdf', label: 'PDF', icon: 'file-text' },
    { id: 'notes', label: 'Notes', icon: 'notebook-pen' },
    { id: 'youtube', label: 'YouTube', icon: 'play-circle' },
    { id: 'problems', label: practiceLabel, icon: 'list-checks' },
  ];

  return `
    <div class="learning-tabs" role="tablist" aria-label="Learning mode">
      ${tabs.map((tab) => `
        <button class="learning-tab ${tab.id === activeTab ? 'active' : ''}" data-tab-open="${tab.id}" role="tab" aria-selected="${tab.id === activeTab}">
          <i data-lucide="${tab.icon}" width="14" height="14"></i>
          ${tab.label}
        </button>
      `).join('')}
    </div>
  `;
}

function renderDefaultPanel(registryEntry) {
  const chapterLabel = escapeHtml(registryEntry?.chapter || 'Core');
  const explanation = escapeHtml(
    registryEntry?.explanation
      || 'Build concept clarity, then reinforce it with curated practice and interview checkpoints.'
  );
  return `
    <div class="tab-card-grid">
      <article class="tab-card">
        <h3>Core Explanation</h3>
        <p>${explanation}</p>
      </article>
      <article class="tab-card">
        <h3>Beginner Path</h3>
        <p>Start with definitions and intuition, then map to one practical scenario.</p>
      </article>
      <article class="tab-card">
        <h3>Interview Pointers</h3>
        <p>Focus on trade-offs, constraints, and edge cases while explaining this subtopic.</p>
      </article>
      <article class="tab-card">
        <h3>Revision Snapshot</h3>
        <p>Summarize in 3 bullets and one visual model before moving forward.</p>
      </article>
      <article class="tab-card">
        <h3>Mapped Chapter</h3>
        <p>${chapterLabel}</p>
      </article>
    </div>
  `;
}

function renderExternalLinkButton(label, url) {
  if (!url) {
    return `<button class="btn btn-secondary btn-sm" type="button" disabled>${escapeHtml(label)}</button>`;
  }
  const safeUrl = escapeHtml(url);
  return `<a class="btn btn-secondary btn-sm" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderPdfPanel(payload, registryEntry, errorMessage = '') {
  const topicName = escapeHtml(registryEntry?.topic || 'Topic');
  const subtopicName = escapeHtml(registryEntry?.subtopic || 'Overview');
  const sourceUrl = payload?.url || registryEntry?.pdf?.url || '';
  const markdownUrl = registryEntry?.pdf?.markdownUrl || '';
  const source = escapeHtml(payload?.provider || registryEntry?.pdf?.source || 'content-registry');
  const outline = Array.isArray(payload?.outline) && payload.outline.length
    ? payload.outline
    : [
        `Core intuition of ${registryEntry?.topic || 'this topic'}`,
        `Visual mental model for ${registryEntry?.subtopic || 'this subtopic'}`,
        'Interview drill and revision checklist',
      ];

  const statusNote = errorMessage
    ? '<p class="experience-muted">Standard handout links are loaded so you can continue without interruption.</p>'
    : '';

  return `
    <section class="tab-content-panel">
      <h3>PDF Learning Plan</h3>
      <p>This subtopic follows a basic to advanced progression with visual anchors and interview-ready framing.</p>
      ${statusNote}
      <ul class="tab-bullet-list">
        ${outline.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
      <p class="experience-muted">Focus: ${topicName} -> ${subtopicName}</p>
      <div class="flow-link-row">
        ${renderExternalLinkButton('Open Generated Handout', sourceUrl)}
        ${renderExternalLinkButton('Open Markdown Handout', markdownUrl)}
        ${sourceUrl ? `<button class="btn btn-secondary btn-sm" data-copy-text="${escapeHtml(sourceUrl)}">Copy PDF Source URL</button>` : ''}
      </div>
      <p class="experience-muted">Source: ${source}</p>
    </section>
  `;
}

function renderNotesPanel(payload, registryEntry, errorMessage = '') {
  const subjectName = escapeHtml(registryEntry?.subject || 'Subject');
  const topicName = escapeHtml(registryEntry?.topic || 'Topic');
  const subtopicName = escapeHtml(registryEntry?.subtopic || 'Overview');
  const notes = Array.isArray(payload?.notes) ? payload.notes : [];
  const fallbackItems = Array.isArray(registryEntry?.notes?.fallbackItems)
    ? registryEntry.notes.fallbackItems
    : [];
  const noteItems = notes.length
    ? notes.map((note) => ({
        title: note?.title || note?.file_url || 'Mapped note item',
        url: note?.file_url || '',
      }))
    : fallbackItems;
  const effectiveNoteItems = noteItems.length
    ? noteItems
    : [
        {
          title: `${subtopicName} quick revision notes`,
          url: registryEntry?.notes?.markdownUrl || registryEntry?.pdf?.markdownUrl || '',
        },
        {
          title: `${subtopicName} interview checklist`,
          url: registryEntry?.pdf?.markdownUrl || '',
        },
      ];

  const statusNote = errorMessage
    ? '<p class="experience-muted">Curated note links are loaded while live note sync catches up.</p>'
    : '';

  return `
    <section class="tab-content-panel">
      <h3>Handwritten Notes</h3>
      <p>Notes are mapped to subject, chapter, topic, and subtopic context.</p>
      ${statusNote}
      <ul class="tab-bullet-list">
        ${effectiveNoteItems.map((note) => {
          const title = escapeHtml(note?.title || 'Mapped note item');
          const url = note?.url ? escapeHtml(note.url) : '';
          if (!url) return `<li>${title}</li>`;
          return `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
        }).join('')}
      </ul>
      <div class="flow-link-row">
        ${renderExternalLinkButton('Open Notes Markdown', registryEntry?.notes?.markdownUrl || '')}
      </div>
      <p class="experience-muted">Mapped path: ${subjectName} -> ${topicName} -> ${subtopicName}</p>
    </section>
  `;
}

function renderYoutubePanel(payload, registryEntry, errorMessage = '') {
  const videos = Array.isArray(payload?.videos) ? payload.videos : [];
  const primaryVideo = registryEntry?.youtube?.primaryUrl
    ? [{ title: `${registryEntry?.subtopic || 'Subtopic'} primary lesson`, url: registryEntry.youtube.primaryUrl }]
    : [];
  const fallbackVideos = Array.isArray(registryEntry?.youtube?.fallbackItems)
    ? registryEntry.youtube.fallbackItems
    : [];
  const registryVideos = [...primaryVideo, ...fallbackVideos];
  const videoItems = videos.length
    ? videos
    : registryVideos;
  const effectiveVideos = videoItems.length
    ? videoItems
    : [
        {
          title: `${registryEntry?.subtopic || 'Subtopic'} interview prep`,
          url: registryEntry?.youtube?.url || '',
        },
      ];

  const statusNote = errorMessage
    ? '<p class="experience-muted">Curated YouTube links are loaded while live sync catches up.</p>'
    : '';

  return `
    <section class="tab-content-panel">
      <h3>YouTube Learning Map</h3>
      <p>Topic and subtopic focused videos, including company-oriented resources where relevant.</p>
      ${statusNote}
      <div class="video-grid">
        ${effectiveVideos.map((video) => `
          <article class="video-card">
            <h4>${escapeHtml(video?.title || 'Mapped Video')}</h4>
            <a href="${escapeHtml(video?.url || '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(video?.url || 'Open resource')}</a>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderProblemsPanel(registryEntry) {
  const route = registryEntry?.problems?.route || '/problems';
  const debuggerRoute = getDebuggerFailureRoute({ autostart: true, source: 'learn-subtopic' });
  const problemItems = Array.isArray(registryEntry?.problems?.items)
    ? registryEntry.problems.items
    : [];
  const effectiveProblems = problemItems.length
    ? problemItems
    : [
        {
          id: 'core-problem',
          level: 'medium',
          prompt: 'Solve one core interview problem for this subtopic.',
          mappedProblemTitle: 'Core Interview Problem',
          difficulty: 'Medium',
          route,
        },
      ];

  const isTheoryMode = effectiveProblems.some(p => p.isTheory);

  if (isTheoryMode) {
    // Store questions as a data attribute to initialize later
    const encodedProblems = escapeHtml(JSON.stringify(effectiveProblems));
    return `
      <section class="tab-content-panel" id="conceptual-practice-session-container" data-problems="${encodedProblems}">
        <!-- Managed by JS session engine -->
        <div style="text-align: center; padding: 40px 20px;">
           <h3>Loading Practice Session...</h3>
        </div>
      </section>
    `;
  }

  return `
    <section class="tab-content-panel">
      <h3>Practice Problems</h3>
      <p>Solve in problem detail first, then submit to continue into debugger with failed-case context.</p>
      <div class="video-grid">
        ${effectiveProblems.map((problem) => {
          const level = escapeHtml(String(problem?.level || 'medium').toUpperCase());
          const prompt = escapeHtml(problem?.prompt || 'Practice this concept with one coding problem.');
          const mappedTitle = escapeHtml(problem?.mappedProblemTitle || 'Curated Problem');
          const mappedDifficulty = escapeHtml(problem?.difficulty || 'Medium');
          const problemRoute = escapeHtml(problem?.route || route);
          return `
            <article class="video-card">
              <h4>${level} - ${mappedTitle}</h4>
              <p>${prompt}</p>
              <p class="experience-muted">Difficulty: ${mappedDifficulty}</p>
              <div class="flow-link-row">
                <button class="btn btn-primary btn-sm" data-problem-route="${problemRoute}">Open Problem Detail</button>
                <button class="btn btn-secondary btn-sm" data-debugger-route="${escapeHtml(debuggerRoute)}">Open Debugger</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <div class="flow-link-row">
        <button class="btn btn-primary btn-sm" id="subtopic-tab-open-problems">Start with First Problem</button>
        <button class="btn btn-secondary btn-sm" id="subtopic-tab-open-debugger">Open Debugger</button>
        <button class="btn btn-secondary btn-sm" id="subtopic-tab-open-sheets">Open Coding Sheets</button>
        <button class="btn btn-secondary btn-sm" id="subtopic-tab-open-sql-track">Open SQL A-Z Track</button>
      </div>
      <p class="experience-muted">Practice lane: ${escapeHtml(route)}</p>
    </section>
  `;
}

function getPrimaryProblemRoute(registryEntry) {
  const problemItems = Array.isArray(registryEntry?.problems?.items)
    ? registryEntry.problems.items
    : [];
  const mappedRoute = problemItems.find((problem) => problem?.route)?.route;
  return mappedRoute || registryEntry?.problems?.route || '/problems';
}

export function renderSubtopicView(params = {}) {
  const context = resolveSubtopicContext(params);
  const registryEntry = getSubtopicContentRegistryEntry(context);
  const activeTab = 'pdf';
  const primaryProblemRoute = escapeHtml(getPrimaryProblemRoute(registryEntry));

  const subjectName = escapeHtml(context.subjectName);
  const topicName = escapeHtml(context.topicName);
  const subtopicName = escapeHtml(context.subtopicName);

  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">4-Tab Learning Mode</p>
          <h1>${subtopicName}</h1>
          <p>Complete this subtopic with one guided flow: learn, watch, practice, and debug.</p>
          <div class="flow-link-row" style="margin-top:10px;">
            <button class="btn btn-primary btn-sm" id="subtopic-hero-open-problem" data-problem-route="${primaryProblemRoute}">Start Practice</button>
            <button class="btn btn-secondary btn-sm" id="subtopic-hero-open-debugger">Open Debugger</button>
          </div>
        </div>
        <div class="experience-meta-pills">
          <span class="meta-pill"><i data-lucide="library" width="14" height="14"></i> ${subjectName}</span>
          <span class="meta-pill"><i data-lucide="folder-open" width="14" height="14"></i> ${topicName}</span>
          <span class="meta-pill"><i data-lucide="panel-top" width="14" height="14"></i> ${subtopicName}</span>
        </div>
      </header>

      <div class="experience-shell">
        <aside class="experience-left">
          <div class="card experience-panel">
            <h3><i data-lucide="compass" width="16" height="16"></i> Subtopic Explorer</h3>
            <div class="experience-list compact">
              ${context.subtopics.map((subtopic) => `
                <button class="experience-list-item ${toSlug(subtopic) === context.subtopicSlug ? 'active' : ''}" data-subtopic-switch="${escapeHtml(subtopic)}">
                  <span>${escapeHtml(subtopic)}</span>
                </button>
              `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('/learn/${context.subjectSlug}/topic/${context.topicSlug}')">Back to Topic</button>
          </div>
        </aside>

        <main class="experience-main">
          <div class="card experience-panel">
            ${renderLearningTabs(activeTab, registryEntry)}
            <div id="subtopic-tab-content">
              ${renderDefaultPanel(registryEntry)}
            </div>
            <div class="subtopic-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid var(--border);">
              <button class="btn btn-primary" id="subtopic-mark-complete">Mark as Complete</button>
            </div>
          </div>
        </main>

        <aside class="experience-right">
          <div class="card experience-panel">
            <h3><i data-lucide="bot" width="16" height="16"></i> AI Helper</h3>
            <p class="experience-muted">Ask for simplified explanation, interview framing, or revision summary.</p>
            <textarea class="input experience-ai-input" id="subtopic-ai-input" rows="4" placeholder="Explain this subtopic with an analogy and interview points."></textarea>
            <button class="btn btn-primary" id="subtopic-ai-submit">Ask AI</button>
            <div class="experience-ai-output" id="subtopic-ai-output">Ask a question to generate an instant explanation and revision-ready response.</div>
          </div>

          <div class="card experience-panel compact">
            <h3><i data-lucide="route" width="16" height="16"></i> Practice Flow</h3>
            <button class="btn btn-primary btn-sm" id="subtopic-open-problems">Open Problem Detail</button>
            <button class="btn btn-secondary btn-sm" id="subtopic-open-debugger">Open Debugger</button>
            <button class="btn btn-secondary btn-sm" id="subtopic-open-sheets">Open Coding Sheets</button>
            <button class="btn btn-secondary btn-sm" id="subtopic-open-sql-track">Open SQL A-Z Track</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

async function initConceptualSessionUI(container, registryEntry, context) {
  const problemsRaw = container.getAttribute('data-problems') || '[]';
  const decoded = String(problemsRaw)
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
    
  let allProblems = [];
  try {
    allProblems = JSON.parse(decoded);
  } catch (e) {
    allProblems = [];
  }

  const questions = allProblems.slice(0, 5); // Limit to 5
  if (questions.length === 0) {
    container.innerHTML = `<div style="padding:20px;">No practice questions available.</div>`;
    return;
  }

  let currentIndex = 0;
  let ratings = [];

  const renderStartScreen = () => {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h3>Conceptual Practice Session</h3>
        <p style="margin-bottom:24px; color:var(--text-3);">Test your understanding with ${questions.length} scenario-based questions. Self-rate your answers to track mastery.</p>
        <button class="btn btn-primary" id="session-start-btn">Start Session</button>
      </div>
    `;
    document.getElementById('session-start-btn').addEventListener('click', renderQuestion);
  };

  const renderQuestion = () => {
    if (currentIndex >= questions.length) {
      return renderSummary();
    }
    const q = questions[currentIndex];
    
    container.innerHTML = `
      <div class="session-header" style="display:flex; justify-content:space-between; margin-bottom:16px;">
        <span class="experience-muted">Question ${currentIndex + 1} of ${questions.length}</span>
        <span class="badge badge-medium">${escapeHtml(String(q.level || 'Medium').toUpperCase())}</span>
      </div>
      <article class="video-card" style="display:flex; flex-direction:column;">
        <h4 style="margin-bottom:12px;">${escapeHtml(q.prompt)}</h4>
        <textarea id="session-answer-input" class="input" rows="4" placeholder="Draft your interview response here..." style="width:100%; margin-bottom:16px;"></textarea>
        
        <div id="session-reveal-area">
          <button class="btn btn-primary" id="session-reveal-btn">Reveal Answer</button>
        </div>
        
        <div id="session-feedback-area" style="display:none; margin-top:20px; border-top:1px solid var(--border-1); padding-top:16px;">
          <h4 style="margin-bottom:8px;">Expected Key Points</h4>
          <ul id="session-keypoints" style="margin-bottom:16px; color:var(--text-2); padding-left:20px;"></ul>
          
          <h4 style="margin-bottom:8px;">Rate Your Answer</h4>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary btn-sm" data-rating="3" style="color:var(--success); border-color:var(--success);">Good</button>
            <button class="btn btn-secondary btn-sm" data-rating="2" style="color:var(--warning); border-color:var(--warning);">Average</button>
            <button class="btn btn-secondary btn-sm" data-rating="1" style="color:var(--danger); border-color:var(--danger);">Poor</button>
          </div>
        </div>
      </article>
    `;

    document.getElementById('session-reveal-btn').addEventListener('click', () => {
      document.getElementById('session-answer-input').disabled = true;
      document.getElementById('session-reveal-btn').style.display = 'none';
      
      const details = getConceptQuestionDetails(q.id, q.prompt);
      const list = document.getElementById('session-keypoints');
      list.innerHTML = details.keyPoints.map(kp => `<li>${escapeHtml(kp)}</li>`).join('');
      
      document.getElementById('session-feedback-area').style.display = 'block';
    });

    document.querySelectorAll('[data-rating]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const score = parseInt(e.target.getAttribute('data-rating'), 10);
        ratings.push(score);
        currentIndex++;
        renderQuestion();
      });
    });
  };

  const renderSummary = async () => {
    const totalScore = ratings.reduce((a, b) => a + b, 0);
    const maxScore = questions.length * 3;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    const passed = percentage >= 60;
    
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h3 style="margin-bottom:12px;">Session Complete!</h3>
        <p style="font-size: 24px; font-weight: bold; color: ${passed ? 'var(--success)' : 'var(--warning)'}; margin-bottom: 12px;">Score: ${percentage}%</p>
        <p style="margin-bottom:24px; color:var(--text-3);">You rated ${ratings.filter(r=>r===3).length} Good, ${ratings.filter(r=>r===2).length} Average, and ${ratings.filter(r=>r===1).length} Poor.</p>
        
        ${passed 
          ? `<p style="color:var(--success); margin-bottom:24px;"><i data-lucide="check-circle" width="16" height="16"></i> Mastery threshold reached. Topic marked as complete.</p>` 
          : `<p style="color:var(--warning); margin-bottom:24px;"><i data-lucide="alert-circle" width="16" height="16"></i> Try reviewing the material and practicing again to achieve mastery.</p>`
        }
        
        <button class="btn btn-secondary" onclick="window.navigateTo('/dashboard')">Back to Dashboard</button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons(container);

    if (passed) {
      try {
        const { learningStore } = await import('store');
        const { careerEngine } = await import('data/career-engine.js');
        
        const subjectId = registryEntry?.subjectId || context.subjectSlug;
        const topicId = registryEntry?.topicId || context.topicSlug;
        
        if (subjectId && topicId) {
          learningStore.markTopicComplete(subjectId, topicId);
          careerEngine.checkAndUpdateUnifiedStreak();
          showToast('Practice Session Complete! Topic Mastered.', 'success');
        }
      } catch (e) {
        console.error('Failed to mark complete', e);
      }
    }
  };

  renderStartScreen();
}

export function initSubtopicView(params = {}) {
  const context = resolveSubtopicContext(params);
  const registryEntry = getSubtopicContentRegistryEntry(context);
  const subjectName = context.subjectName;
  const topicName = context.topicName;
  const subtopicName = context.subtopicName;

  const mount = document.getElementById('subtopic-tab-content');

  const wireTabPanelActions = () => {
    document.querySelectorAll('[data-copy-text]').forEach((node) => {
      node.addEventListener('click', async () => {
        const value = node.getAttribute('data-copy-text') || '';
        if (!value) return;
        await navigator.clipboard.writeText(value).catch(() => {});
      });
    });

    document.getElementById('subtopic-tab-open-problems')?.addEventListener('click', () => {
      window.navigateTo(getPrimaryProblemRoute(registryEntry));
    });

    document.querySelectorAll('[data-problem-route]').forEach((node) => {
      node.addEventListener('click', () => {
        const route = node.getAttribute('data-problem-route');
        if (!route) return;
        window.navigateTo(route);
      });
    });

    document.querySelectorAll('[data-debugger-route]').forEach((node) => {
      node.addEventListener('click', () => {
        const route = node.getAttribute('data-debugger-route');
        if (!route) return;
        window.navigateTo(route);
      });
    });

    document.getElementById('subtopic-tab-open-sheets')?.addEventListener('click', () => {
      window.navigateTo(getSheetsRoute(75));
    });

    document.getElementById('subtopic-tab-open-debugger')?.addEventListener('click', () => {
      window.navigateTo(getDebuggerFailureRoute({ autostart: true, source: 'learn-subtopic' }));
    });

    document.getElementById('subtopic-tab-open-sql-track')?.addEventListener('click', () => {
      window.navigateTo('/sql-track');
    });

    const sessionContainer = document.getElementById('conceptual-practice-session-container');
    if (sessionContainer) {
      initConceptualSessionUI(sessionContainer, registryEntry, context);
    }
  };

  const markCompleteButton = document.getElementById('subtopic-mark-complete');
  if (markCompleteButton) {
    markCompleteButton.addEventListener('click', async () => {
      const { learningStore } = await import('store');
      const { careerEngine } = await import('data/career-engine.js');
      
      const subjectId = registryEntry?.subjectId || context.subjectSlug;
      const topicId = registryEntry?.topicId || context.topicSlug;
      
      if (subjectId && topicId) {
        learningStore.markTopicComplete(subjectId, topicId);
        careerEngine.checkAndUpdateUnifiedStreak();
        
        markCompleteButton.textContent = 'Completed!';
        markCompleteButton.disabled = true;
        markCompleteButton.classList.add('btn-secondary');
        markCompleteButton.classList.remove('btn-primary');
      }
    });
  }

  const loadTab = async (tabId) => {
    if (!mount) return;
    mount.innerHTML = '<p class="experience-muted">Loading...</p>';

    if (tabId === 'pdf') {
      try {
        const payload = await fetchPdf(subjectName, topicName, {
          chapter: context.chapterName,
          subtopic: subtopicName,
        });
        mount.innerHTML = renderPdfPanel(payload, registryEntry);
      } catch (error) {
        mount.innerHTML = renderPdfPanel(null, registryEntry, getErrorMessage(error));
      }
    } else if (tabId === 'notes') {
      try {
        const payload = await fetchNotes(subjectName, topicName, {
          item: 1,
          subtopic: subtopicName,
        });
        mount.innerHTML = renderNotesPanel(payload, registryEntry);
      } catch (error) {
        mount.innerHTML = renderNotesPanel(null, registryEntry, getErrorMessage(error));
      }
    } else if (tabId === 'youtube') {
      try {
        const payload = await fetchYoutube(subjectName, topicName, {
          subtopic: subtopicName,
        });
        mount.innerHTML = renderYoutubePanel(payload, registryEntry);
      } catch (error) {
        mount.innerHTML = renderYoutubePanel(null, registryEntry, getErrorMessage(error));
      }
    } else if (tabId === 'problems') {
      mount.innerHTML = renderProblemsPanel(registryEntry);
    } else {
      mount.innerHTML = renderDefaultPanel(registryEntry);
    }

    wireTabPanelActions();
    window.lucide?.createIcons();
  };

  document.querySelectorAll('[data-tab-open]').forEach((node) => {
    node.addEventListener('click', () => {
      const tabId = node.getAttribute('data-tab-open') || 'pdf';
      document.querySelectorAll('[data-tab-open]').forEach((button) => {
        const isActive = button === node;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
      loadTab(tabId);
    });
  });

  document.querySelectorAll('[data-subtopic-switch]').forEach((node) => {
    node.addEventListener('click', () => {
      const nextSubtopic = node.getAttribute('data-subtopic-switch');
      if (!nextSubtopic) return;
      window.navigateTo(`/learn/${context.subjectSlug}/topic/${context.topicSlug}/subtopic/${toSlug(nextSubtopic)}`);
    });
  });

  const aiInput = document.getElementById('subtopic-ai-input');
  const aiOutput = document.getElementById('subtopic-ai-output');
  const aiSubmit = document.getElementById('subtopic-ai-submit');
  if (aiInput && aiOutput && aiSubmit) {
    aiSubmit.addEventListener('click', async () => {
      aiSubmit.disabled = true;
      aiSubmit.classList.add('loading');
      aiOutput.textContent = 'Thinking...';
      try {
        const result = await askLearningAi(subjectName, topicName, 'learn', aiInput.value || `Teach ${subtopicName} from basics to advanced.`);
        aiOutput.textContent = result?.reply || 'No response received.';
      } catch (error) {
        aiOutput.textContent = error.message || 'AI request failed.';
      } finally {
        aiSubmit.disabled = false;
        aiSubmit.classList.remove('loading');
      }
    });
  }

  document.getElementById('subtopic-open-problems')?.addEventListener('click', () => {
    window.navigateTo(getPrimaryProblemRoute(registryEntry));
  });

  document.getElementById('subtopic-open-debugger')?.addEventListener('click', () => {
    window.navigateTo(getDebuggerFailureRoute({ autostart: true, source: 'learn-subtopic' }));
  });

  document.getElementById('subtopic-hero-open-problem')?.addEventListener('click', () => {
    window.navigateTo(getPrimaryProblemRoute(registryEntry));
  });

  document.getElementById('subtopic-hero-open-debugger')?.addEventListener('click', () => {
    window.navigateTo(getDebuggerFailureRoute({ autostart: true, source: 'learn-subtopic' }));
  });

  document.getElementById('subtopic-open-sheets')?.addEventListener('click', () => {
    window.navigateTo(getSheetsRoute(75));
  });

  document.getElementById('subtopic-open-sql-track')?.addEventListener('click', () => {
    window.navigateTo('/sql-track');
  });

  loadTab('pdf');
  window.lucide?.createIcons();
}
