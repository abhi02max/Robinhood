// Judge0 API integration
import axios from 'axios';
const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const JUDGE0_TIMEOUT_MS = Number(process.env.JUDGE0_TIMEOUT_MS || 15000);
const JUDGE0_SUBMIT_MAX_CASES = Math.max(1, Number(process.env.JUDGE0_SUBMIT_MAX_CASES || 50));
const JUDGE0_MAX_RETRIES = Math.max(0, Number(process.env.JUDGE0_MAX_RETRIES || 2));
const JUDGE0_RETRY_BASE_MS = Math.max(50, Number(process.env.JUDGE0_RETRY_BASE_MS || 250));

function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function normalizeJudge0Cases(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return [{ input: '', output: '' }];
  }

  return testCases.slice(0, JUDGE0_SUBMIT_MAX_CASES).map((testCase) => ({
    input: toText(testCase?.input || ''),
    output: toText(testCase?.output || ''),
  }));
}

function toNumeric(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function buildPayload({ language, code, stdin = '', expectedOutput = '' }) {
  const languageId = mapJudge0Language(language);
  if (!languageId) {
    return null;
  }

  return {
    language_id: languageId,
    source_code: code,
    stdin,
    expected_output: expectedOutput,
  };
}

function mapJudge0Language(language) {
  if (typeof language === 'number' && Number.isFinite(language)) {
    return language;
  }

  const lang = String(language || '').toLowerCase().trim();
  if (lang === 'javascript') return 63; // Node.js
  if (lang === 'python') return 71; // Python 3
  if (lang === 'cpp' || lang === 'c++') return 54; // GCC C++
  if (lang === 'java') return 62; // OpenJDK
  return 0;
}

function resolveJudge0Endpoint() {
  if (/\/submissions\b/i.test(JUDGE0_URL)) {
    return JUDGE0_URL;
  }
  return `${JUDGE0_URL.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status) {
  const code = Number(status || 0);
  return code === 429 || code >= 500;
}

function isTransientAxiosError(error) {
  const code = String(error?.code || '').toUpperCase();
  return code === 'ECONNABORTED'
    || code === 'ECONNREFUSED'
    || code === 'ECONNRESET'
    || code === 'ENOTFOUND'
    || code === 'ETIMEDOUT';
}

function parseRetryAfterSeconds(response) {
  const fromHeader = Number(response?.headers?.['retry-after'] || 0);
  if (Number.isFinite(fromHeader) && fromHeader > 0) {
    return Math.ceil(fromHeader);
  }
  return 0;
}

function computeBackoffMs(attempt, response) {
  const retryAfterSeconds = parseRetryAfterSeconds(response);
  if (retryAfterSeconds > 0) {
    return Math.max(JUDGE0_RETRY_BASE_MS, retryAfterSeconds * 1000);
  }

  const exponent = Math.max(0, attempt - 1);
  return Math.min(5000, JUDGE0_RETRY_BASE_MS * (2 ** exponent));
}

async function requestJudge0WithRetry(payload) {
  const endpoint = resolveJudge0Endpoint();

  for (let attempt = 1; attempt <= JUDGE0_MAX_RETRIES + 1; attempt += 1) {
    try {
      const response = await axios.post(endpoint, payload, {
        timeout: JUDGE0_TIMEOUT_MS,
        validateStatus: () => true,
      });

      if (!isTransientStatus(response.status) || attempt > JUDGE0_MAX_RETRIES) {
        return response;
      }

      await sleep(computeBackoffMs(attempt, response));
      continue;
    } catch (error) {
      if (!isTransientAxiosError(error) || attempt > JUDGE0_MAX_RETRIES) {
        throw error;
      }

      await sleep(computeBackoffMs(attempt));
    }
  }

  throw new Error('Judge0 request failed after retries.');
}

function toProviderErrorPayload(statusCode, data, fallbackMessage, extras = {}) {
  const providerMessage =
    data?.error ||
    data?.message ||
    data?.stderr ||
    data?.compile_output ||
    fallbackMessage;

  return {
    status: {
      id: 0,
      description: `Judge0 request failed (${statusCode})`,
    },
    stdout: '',
    stderr: toText(providerMessage || fallbackMessage || 'Judge0 request failed.'),
    error: toText(providerMessage || fallbackMessage || 'Judge0 request failed.'),
    compile_output: data?.compile_output || '',
    time: '',
    memory: '',
    ...extras,
  };
}

export async function submitCode({ language, code, testCases }) {
  const normalizedCases = normalizeJudge0Cases(testCases);
  const payloadTemplate = buildPayload({ language, code, stdin: '', expectedOutput: '' });

  if (!payloadTemplate) {
    return {
      status: {
        id: 0,
        description: 'Unsupported language for Judge0 submission',
      },
      stdout: '',
      stderr: `Judge0 does not support language "${String(language || '')}" in this configuration.`,
      compile_output: '',
      time: '',
      memory: '',
      passed: 0,
      total: normalizedCases.length,
      caseResults: [],
    };
  }

  let passed = 0;
  let totalTimeSeconds = 0;
  let peakMemoryKb = 0;
  const caseResults = [];
  let firstFailure = null;

  for (let index = 0; index < normalizedCases.length; index += 1) {
    const testCase = normalizedCases[index];
    const payload = {
      ...payloadTemplate,
      stdin: testCase.input,
      expected_output: testCase.output,
    };

    const response = await requestJudge0WithRetry(payload);

    if (response.status >= 400) {
      return toProviderErrorPayload(
        response.status,
        response.data,
        'Judge0 rejected the submission payload.',
        {
          passed,
          total: normalizedCases.length,
          caseResults,
        }
      );
    }

    const submission = response.data || {};
    const statusId = Number(submission?.status?.id || 0);
    const statusDescription = toText(submission?.status?.description || 'Unknown');
    const stdout = toText(submission?.stdout || '');
    const stderr = toText(submission?.stderr || submission?.message || '');
    const compileOutput = toText(submission?.compile_output || '');
    const caseTime = toNumeric(submission?.time);
    const caseMemory = toNumeric(submission?.memory);
    const accepted = statusId === 3;

    if (accepted) {
      passed += 1;
    }

    totalTimeSeconds += caseTime;
    peakMemoryKb = Math.max(peakMemoryKb, caseMemory);

    const caseResult = {
      index: index + 1,
      statusId,
      statusDescription,
      passed: accepted,
      input: testCase.input,
      expectedOutput: testCase.output,
      stdout,
      stderr,
      compileOutput,
      time: toText(submission?.time || ''),
      memory: toText(submission?.memory || ''),
    };

    caseResults.push(caseResult);

    if (!accepted && !firstFailure) {
      firstFailure = caseResult;
    }

    // Compile errors and internal provider errors make subsequent case checks redundant.
    if (statusId === 6 || statusId === 13 || statusId === 0) {
      break;
    }
  }

  const total = normalizedCases.length;
  const allPassed = passed === total;

  return {
    status: {
      id: allPassed ? 3 : Number(firstFailure?.statusId || 4),
      description: allPassed ? 'Accepted' : toText(firstFailure?.statusDescription || 'Wrong Answer'),
    },
    stdout: toText(firstFailure?.stdout || caseResults[0]?.stdout || ''),
    stderr: toText(firstFailure?.stderr || ''),
    compile_output: toText(firstFailure?.compileOutput || ''),
    time: totalTimeSeconds > 0 ? Number(totalTimeSeconds.toFixed(3)).toString() : '',
    memory: peakMemoryKb > 0 ? String(peakMemoryKb) : '',
    passed,
    total,
    caseResults,
  };
}

export async function runCode({ language, code, stdin }) {
  const payload = buildPayload({
    language,
    code,
    stdin,
  });

  if (!payload) {
    return {
      status: {
        id: 0,
        description: 'Unsupported language for Judge0 execution',
      },
      stdout: '',
      stderr: `Judge0 does not support language "${String(language || '')}" in this configuration.`,
      compile_output: '',
      time: '',
      memory: '',
    };
  }

  const response = await requestJudge0WithRetry(payload);

  if (response.status >= 400) {
    return toProviderErrorPayload(response.status, response.data, 'Judge0 rejected the execution payload.');
  }

  return response.data;
}

export default { submitCode, runCode };
