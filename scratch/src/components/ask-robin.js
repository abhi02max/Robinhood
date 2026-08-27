// ROBINHOOD — Ask Robin AI Companion v1
// Contextual AI assistant for learning pages

import { showToast } from './notifications.js';

const ROBIN_ACTIONS = {
  explain: { icon: '💡', label: 'Explain Simply', desc: 'Break it down for beginners' },
  analogy: { icon: '🎯', label: 'Give Analogy', desc: 'Real-world comparison' },
  interview: { icon: '💼', label: 'Interview Q', desc: 'Common interview questions' },
  company: { icon: '🏢', label: 'Company Use', desc: 'How companies use this' },
  quiz: { icon: '🧠', label: 'Quiz Me', desc: 'Test your understanding' },
  deeper: { icon: '🔬', label: 'Go Deeper', desc: 'Advanced concepts' },
  debug: { icon: '🐛', label: 'Common Bugs', desc: 'Mistakes to avoid' },
  practice: { icon: '💻', label: 'Practice', desc: 'Hands-on exercises' },
};

let robinPanelOpen = false;
let currentContext = { subject: '', topic: '', content: '' };
let robinResponseCache = new Map();
let robinListenersAbortController = null;
let robinRequestInFlight = false;

const ROBIN_CACHE_MAX_ENTRIES = 80;
const ROBIN_CACHE_TTL_MS = 20 * 60 * 1000;
const ROBIN_MAX_RETRY_ATTEMPTS = 3;
const ROBIN_MAX_BACKOFF_SECONDS = 12;

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

function setRobinControlsDisabled(disabled, label = 'Ask') {
  document.querySelectorAll('[data-robin-action]').forEach((button) => {
    button.disabled = disabled;
  });

  const askButton = document.getElementById('robin-ask-btn');
  if (askButton) {
    if (!askButton.dataset.defaultLabel) {
      askButton.dataset.defaultLabel = askButton.textContent || 'Ask';
    }
    askButton.disabled = disabled;
    askButton.textContent = disabled ? label : (askButton.dataset.defaultLabel || 'Ask');
  }

  const questionInput = document.getElementById('robin-question-input');
  if (questionInput) {
    questionInput.disabled = disabled;
  }
}

async function runCountdown(seconds, onTick) {
  const total = Math.max(1, Number(seconds || 1));
  for (let left = total; left >= 1; left -= 1) {
    onTick?.(left);
    await sleep(1000);
  }
}

function pickNewestPortalNode(nodes) {
  if (!nodes.length) return null;

  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    if (node.parentElement !== document.body) {
      return node;
    }
  }

  return nodes[nodes.length - 1] || null;
}

function pruneRobinResponseCache(now = Date.now()) {
  for (const [key, entry] of robinResponseCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      robinResponseCache.delete(key);
    }
  }

  while (robinResponseCache.size > ROBIN_CACHE_MAX_ENTRIES) {
    const oldestKey = robinResponseCache.keys().next().value;
    if (!oldestKey) break;
    robinResponseCache.delete(oldestKey);
  }
}

function getCachedRobinResponse(cacheKey) {
  pruneRobinResponseCache();
  const cached = robinResponseCache.get(cacheKey);
  if (!cached) return null;

  robinResponseCache.delete(cacheKey);
  robinResponseCache.set(cacheKey, {
    value: cached.value,
    expiresAt: Date.now() + ROBIN_CACHE_TTL_MS,
  });
  return cached.value;
}

function setCachedRobinResponse(cacheKey, value) {
  robinResponseCache.delete(cacheKey);
  robinResponseCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ROBIN_CACHE_TTL_MS,
  });
  pruneRobinResponseCache();
}

function ensureRobinPortal() {
  const allFabs = Array.from(document.querySelectorAll('#ask-robin-fab'));
  const allPanels = Array.from(document.querySelectorAll('#ask-robin-panel'));
  const fab = pickNewestPortalNode(allFabs);
  const panel = pickNewestPortalNode(allPanels);

  allFabs.slice(0, -1).forEach((node) => node.remove());
  allPanels.slice(0, -1).forEach((node) => node.remove());

  if (fab && fab.parentElement !== document.body) document.body.appendChild(fab);
  if (panel && panel.parentElement !== document.body) document.body.appendChild(panel);
}

export function setRobinContext(subject, topic, content) {
  currentContext = { subject, topic, content };
}

export function renderAskRobinFab() {
  return `
    <button class="ask-robin-fab" id="ask-robin-fab" aria-label="Ask Robin AI">
      <span class="robin-mascot">🐦</span>
      Ask Robin
    </button>
  `;
}

export function renderAskRobinPanel() {
  const actionButtons = Object.entries(ROBIN_ACTIONS).map(([key, action]) => `
    <button class="robin-action-btn" data-robin-action="${key}">
      <span class="robin-action-icon" style="background: var(--${getActionColor(key)}-muted); color: var(--${getActionColor(key)});">
        ${action.icon}
      </span>
      <span class="robin-action-label">${action.label}</span>
      <span class="robin-action-desc">${action.desc}</span>
    </button>
  `).join('');

  return `
    <div class="ask-robin-panel ${robinPanelOpen ? '' : 'hidden'}" id="ask-robin-panel">
      <div class="ask-robin-header">
        <div class="ask-robin-title">
          <span class="robin-mascot">🐦</span>
          <div>
            <h4>Ask Robin</h4>
            <small>Your AI learning companion</small>
          </div>
        </div>
        <button class="ask-robin-close" id="ask-robin-close" aria-label="Close">
          <i data-lucide="x" width="16" height="16"></i>
        </button>
      </div>
      
      <div class="ask-robin-actions">
        ${actionButtons}
      </div>
      
      <div class="ask-robin-response" id="robin-response">
        <div class="robin-response-empty">
          <i data-lucide="message-circle" width="32" height="32"></i>
          <p>Click an action above or ask a question below</p>
        </div>
      </div>
      
      <div class="robin-quick-input">
        <input type="text" id="robin-question-input" placeholder="Ask anything about ${currentContext.topic || 'this topic'}..." />
        <button id="robin-ask-btn">Ask</button>
      </div>
    </div>
  `;
}

function getActionColor(action) {
  const colors = {
    explain: 'primary',
    analogy: 'accent',
    interview: 'info',
    company: 'success',
    quiz: 'warning',
    deeper: 'primary',
    debug: 'danger',
    practice: 'success',
  };
  return colors[action] || 'primary';
}

function renderRobinLoading() {
  return `
    <div class="robin-loading">
      <span class="robin-mascot" style="width:24px;height:24px;font-size:14px;">🐦</span>
      <span>Robin is thinking...</span>
      <div class="robin-loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

function formatRobinResponse(text) {
  // Convert markdown-style formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>');
}

async function askRobin(actionType, customQuestion = '') {
  const responseEl = document.getElementById('robin-response');
  if (!responseEl) return;

  if (robinRequestInFlight) {
    showToast('Robin is already processing your previous request.', 'info', 2200);
    return;
  }

  // Check cache first
  const cacheKey = `${currentContext.subject}:${currentContext.topic}:${actionType}:${customQuestion}`;
  const cachedResponse = getCachedRobinResponse(cacheKey);
  if (cachedResponse) {
    responseEl.innerHTML = `<div class="robin-response-content">${formatRobinResponse(cachedResponse)}</div>`;
    return;
  }

  robinRequestInFlight = true;
  setRobinControlsDisabled(true, 'Thinking...');
  responseEl.innerHTML = renderRobinLoading();

  try {
    let payload = null;

    for (let attempt = 1; attempt <= ROBIN_MAX_RETRY_ATTEMPTS; attempt += 1) {
      const response = await fetch('/api/ai/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectTitle: currentContext.subject,
          topicTitle: currentContext.topic,
          actionType,
          context: customQuestion || currentContext.content,
        }),
      });

      const parsed = await response.json().catch(() => ({}));

      if (response.ok) {
        payload = parsed;
        break;
      }

      const shouldRetry = attempt < ROBIN_MAX_RETRY_ATTEMPTS && (response.status === 429 || response.status >= 500);
      if (shouldRetry) {
        const retryAfter = parseRetryAfterSeconds(
          response,
          parsed,
          Math.min(ROBIN_MAX_BACKOFF_SECONDS, 2 ** (attempt - 1)),
        );
        const waitSeconds = Math.min(
          ROBIN_MAX_BACKOFF_SECONDS,
          Math.max(retryAfter, 2 ** (attempt - 1)),
        );

        showToast(
          response.status === 429
            ? `Robin is busy. Retrying in ${waitSeconds}s.`
            : `Robin had a temporary issue. Retrying in ${waitSeconds}s.`,
          response.status === 429 ? 'warning' : 'info',
          2300,
        );

        await runCountdown(waitSeconds, (secondsLeft) => {
          setRobinControlsDisabled(true, `Retry in ${secondsLeft}s`);
          responseEl.innerHTML = `
            <div class="robin-response-content">
              <strong>Robin is temporarily busy.</strong><br>
              <small>Retrying in ${secondsLeft}s (attempt ${attempt}/${ROBIN_MAX_RETRY_ATTEMPTS})...</small>
            </div>
          `;
        });
        continue;
      }

      const failure = new Error(parsed?.reason || parsed?.error || 'Robin is taking a break. Try again in a moment.');
      failure.status = response.status;
      failure.retryAfter = parseRetryAfterSeconds(response, parsed, 1);
      throw failure;
    }

    if (!payload) {
      throw new Error('Robin could not complete the request right now.');
    }

    const answer = payload.reply || payload.response || payload.answer || 'Robin couldn\'t find an answer. Try rephrasing your question.';
    
    // Cache the response
    setCachedRobinResponse(cacheKey, answer);
    
    responseEl.innerHTML = `<div class="robin-response-content">${formatRobinResponse(answer)}</div>`;
    
  } catch (error) {
    const isRateLimited = Number(error?.status || 0) === 429;
    const retryAfter = Math.max(1, Number(error?.retryAfter || 0));

    if (isRateLimited) {
      showToast(`Robin is rate-limited. Try again in ${retryAfter}s.`, 'warning', 2600);
    }

    responseEl.innerHTML = `
      <div class="robin-response-content" style="color: var(--danger);">
        <strong>Oops!</strong> ${error.message}
        <br><br>
        <small>💡 Tip: Check your internet connection or try a different question.</small>
      </div>
    `;
  } finally {
    robinRequestInFlight = false;
    setRobinControlsDisabled(false);
  }
}

export function initAskRobin() {
  ensureRobinPortal();

  if (robinListenersAbortController) {
    robinListenersAbortController.abort();
  }
  robinListenersAbortController = new AbortController();
  const listenerSignal = robinListenersAbortController.signal;

  // Toggle panel
  const fab = document.getElementById('ask-robin-fab');
  const panel = document.getElementById('ask-robin-panel');
  const closeBtn = document.getElementById('ask-robin-close');
  
  if (fab) {
    fab.addEventListener('click', () => {
      robinPanelOpen = !robinPanelOpen;
      if (panel) {
        panel.classList.toggle('hidden', !robinPanelOpen);
      }
      // Re-init Lucide icons
      if (window.lucide) window.lucide.createIcons();
    }, { signal: listenerSignal });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      robinPanelOpen = false;
      if (panel) panel.classList.add('hidden');
    }, { signal: listenerSignal });
  }
  
  // Action buttons
  document.querySelectorAll('[data-robin-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-robin-action');
      askRobin(action);
    }, { signal: listenerSignal });
  });
  
  // Quick question
  const questionInput = document.getElementById('robin-question-input');
  const askBtn = document.getElementById('robin-ask-btn');
  
  if (askBtn && questionInput) {
    askBtn.addEventListener('click', () => {
      const question = questionInput.value.trim();
      if (question) {
        askRobin('doubt', question);
        questionInput.value = '';
      }
    }, { signal: listenerSignal });
    
    questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const question = questionInput.value.trim();
        if (question) {
          askRobin('doubt', question);
          questionInput.value = '';
        }
      }
    }, { signal: listenerSignal });
  }
}

// Export for external use
export function openRobinWithQuestion(question) {
  robinPanelOpen = true;
  const panel = document.getElementById('ask-robin-panel');
  if (panel) panel.classList.remove('hidden');
  
  if (question) {
    askRobin('doubt', question);
  }
}
