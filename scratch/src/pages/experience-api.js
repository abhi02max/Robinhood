import { getSubjectTree, subjectToApiName } from './experience-data.js';

const runtimeWindow = typeof window !== 'undefined' ? window : null;
const REQUEST_TIMEOUT_MS = Math.max(1_000, Number(runtimeWindow?.__ROBIN_API_TIMEOUT_MS || 12000));
const REQUEST_MAX_RETRIES = Math.max(0, Number(runtimeWindow?.__ROBIN_API_RETRIES || 2));
const REQUEST_RETRY_BASE_MS = Math.max(100, Number(runtimeWindow?.__ROBIN_API_RETRY_BASE_MS || 250));

function getSessionTokenFromStorage() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('robinhood_data');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.sessionToken;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch (_) {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  const value = Number(status || 0);
  return value === 429 || value >= 500;
}

function parseRetryAfterSeconds(response, payload, fallbackSeconds = 1) {
  const headerValue = Number(response?.headers?.get?.('retry-after') || 0);
  if (Number.isFinite(headerValue) && headerValue > 0) {
    return Math.ceil(headerValue);
  }

  const payloadValue = Number(payload?.retryAfter || 0);
  if (Number.isFinite(payloadValue) && payloadValue > 0) {
    return Math.ceil(payloadValue);
  }

  return Math.max(1, Number(fallbackSeconds || 1));
}

function isRetryableError(error) {
  return error?.name === 'AbortError' || error instanceof TypeError;
}

async function requestJson(url, options = {}) {
  const sessionToken = getSessionTokenFromStorage();
  const {
    headers: callerHeaders = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
    maxRetries = REQUEST_MAX_RETRIES,
    retry = true,
    ...requestOptions
  } = options;
  const authHeader = callerHeaders.Authorization || callerHeaders.authorization || null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const externalSignal = requestOptions.signal;
    let abortHandler = null;
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        abortHandler = () => controller.abort();
        externalSignal.addEventListener('abort', abortHandler, { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken && !authHeader ? { Authorization: `Bearer ${sessionToken}` } : {}),
          ...callerHeaders,
        },
        signal: controller.signal,
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      if (response.ok) {
        return data;
      }

      const canRetry = retry && attempt <= maxRetries && shouldRetryStatus(response.status);
      if (canRetry) {
        const waitSeconds = parseRetryAfterSeconds(
          response,
          data,
          Math.min(8, 2 ** (attempt - 1)),
        );
        await sleep(Math.min(12000, waitSeconds * 1000));
        continue;
      }

      const message = data?.reason || data?.error || `Request failed: ${response.status}`;
      throw new Error(message);
    } catch (error) {
      const canRetry = retry && attempt <= maxRetries && isRetryableError(error);
      if (!canRetry) {
        throw error;
      }
      const waitMs = Math.min(5000, REQUEST_RETRY_BASE_MS * (2 ** (attempt - 1)));
      await sleep(waitMs);
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal && abortHandler) {
        externalSignal.removeEventListener('abort', abortHandler);
      }
    }
  }

  throw new Error('Request failed after retries.');
}

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function fetchSubjectTree(subjectName) {
  const apiSubject = encodeURIComponent(subjectToApiName(subjectName));
  try {
    const payload = await requestJson(`/api/content/subject/${apiSubject}`);
    if (payload?.tree?.chapters?.length) {
      return payload.tree;
    }
  } catch (_) {
    // Fall through to local fallback tree.
  }
  return getSubjectTree(subjectName);
}

export async function fetchPdf(subjectName, topicName, options = {}) {
  const subject = encodeURIComponent(subjectToApiName(subjectName));
  const topic = encodeURIComponent(topicName);
  return requestJson(withQuery(`/api/content/pdf/${subject}/${topic}`, {
    chapter: options.chapter,
    subtopic: options.subtopic,
    format: options.format,
  }));
}

export async function fetchNotes(subjectName, topicName, options = {}) {
  const subject = encodeURIComponent(subjectToApiName(subjectName));
  const topic = encodeURIComponent(topicName);
  return requestJson(withQuery(`/api/content/notes/${subject}/${topic}`, {
    format: options.format,
    item: options.item,
    subtopic: options.subtopic,
  }));
}

export async function fetchYoutube(subjectName, topicName, options = {}) {
  const subject = encodeURIComponent(subjectToApiName(subjectName));
  const topic = encodeURIComponent(topicName);
  return requestJson(withQuery(`/api/content/youtube/${subject}/${topic}`, {
    subtopic: options.subtopic,
    company: options.company,
  }));
}

export async function askLearningAi(subjectTitle, topicTitle, actionType = 'learn', context = '') {
  return requestJson('/api/ai/learn', {
    method: 'POST',
    body: JSON.stringify({
      subjectTitle,
      topicTitle,
      actionType,
      context,
    }),
  });
}

export async function fetchInterviewRound(roundType, company) {
  const safeRound = encodeURIComponent(roundType);
  const safeCompany = encodeURIComponent(company);
  return requestJson(`/api/interview/${safeRound}/${safeCompany}`);
}

export async function createMockSession(payload) {
  return requestJson('/api/interview/mock-session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runDebuggerCode(payload) {
  return requestJson('/api/debugger/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitDebuggerCode(payload) {
  return requestJson('/api/execute/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function debugSql(query) {
  return requestJson('/api/debugger/sql', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function explainDebugger(error, code) {
  return requestJson('/api/debugger/explain', {
    method: 'POST',
    body: JSON.stringify({ error, code }),
  });
}

export async function fetchAnalyticsProgress(options = {}) {
  return requestJson('/api/analytics/progress', options);
}

export async function fetchAnalyticsStreaks(options = {}) {
  return requestJson('/api/analytics/streaks', options);
}

export async function fetchSchedulerToday() {
  return requestJson('/api/scheduler/today');
}

export async function createSchedulerTask(task) {
  return requestJson('/api/scheduler/create', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}
