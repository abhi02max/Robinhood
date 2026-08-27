import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const REQUEST_TIMEOUT_MS = Number(process.env.EXEC_MATRIX_TIMEOUT_MS || 25000);
const REQUEST_RETRIES = Math.max(1, Number(process.env.EXEC_MATRIX_RETRIES || 3));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'execution-correctness-matrix-report.json');

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  let lastResult = {
    ok: false,
    status: 0,
    payload: null,
    durationMs: 0,
    timedOut: false,
    error: 'request-not-started',
    attempts: 0,
  };

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const result = {
        ok: response.ok,
        status: response.status,
        payload,
        durationMs: Date.now() - startedAt,
        timedOut: false,
        attempts: attempt,
      };

      if (response.status !== 0) {
        return result;
      }

      lastResult = result;
    } catch (error) {
      const message = String(error?.message || error);
      const timedOut = error?.name === 'AbortError';
      lastResult = {
        ok: false,
        status: 0,
        payload: null,
        durationMs: Date.now() - startedAt,
        timedOut,
        error: message,
        attempts: attempt,
      };
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < REQUEST_RETRIES) {
      await sleep(250 * attempt);
    }
  }

  return lastResult;
}

function jsDoubleProgram() {
  return [
    'const fs = require("fs");',
    'const raw = fs.readFileSync(0, "utf8").trim();',
    'const n = Number(raw || 0);',
    'console.log(n * 2);',
  ].join('\n');
}

function pyDoubleProgram() {
  return [
    'import sys',
    'raw = sys.stdin.read().strip()',
    'n = int(raw or "0")',
    'print(n * 2)',
  ].join('\n');
}

function cppDoubleProgram() {
  return [
    '#include <bits/stdc++.h>',
    'using namespace std;',
    'int main() {',
    '  long long n = 0;',
    '  if (!(cin >> n)) n = 0;',
    '  cout << (n * 2);',
    '  return 0;',
    '}',
  ].join('\n');
}

function buildCases() {
  const cases = [];
  let id = 1;

  const pushCase = (entry) => {
    cases.push({
      id: id,
      ...entry,
    });
    id += 1;
  };

  const runNumbers = [1, 2, 3, 4, 5, 6, 7];

  for (const n of runNumbers) {
    pushCase({
      group: 'run-javascript',
      language: 'javascript',
      endpoint: '/api/execute/run',
      payload: {
        language: 'javascript',
        code: jsDoubleProgram(),
        stdin: `${n}\n`,
      },
      expected: String(n * 2),
      validator: 'run',
    });
  }

  for (const n of runNumbers) {
    pushCase({
      group: 'run-python',
      language: 'python',
      endpoint: '/api/execute/run',
      payload: {
        language: 'python',
        code: pyDoubleProgram(),
        stdin: `${n}\n`,
      },
      expected: String(n * 2),
      validator: 'run',
    });
  }

  for (const n of runNumbers) {
    pushCase({
      group: 'run-cpp',
      language: 'cpp',
      endpoint: '/api/execute/run',
      payload: {
        language: 'cpp',
        code: cppDoubleProgram(),
        stdin: `${n}\n`,
      },
      expected: String(n * 2),
      validator: 'run',
    });
  }

  const submitBases = [11, 12, 13, 14, 15, 16, 17];
  for (const base of submitBases) {
    const testCases = [base, base + 1, base + 2].map((value) => ({
      input: `${value}\n`,
      output: `${value * 2}`,
    }));

    pushCase({
      group: 'submit-javascript',
      language: 'javascript',
      endpoint: '/api/execute/submit',
      payload: {
        language: 'javascript',
        code: jsDoubleProgram(),
        testCases,
      },
      expected: testCases,
      validator: 'submit',
    });
  }

  for (const base of submitBases) {
    const testCases = [base, base + 1, base + 2].map((value) => ({
      input: `${value}\n`,
      output: `${value * 2}`,
    }));

    pushCase({
      group: 'submit-python',
      language: 'python',
      endpoint: '/api/execute/submit',
      payload: {
        language: 'python',
        code: pyDoubleProgram(),
        testCases,
      },
      expected: testCases,
      validator: 'submit',
    });
  }

  for (const base of submitBases) {
    const testCases = [base, base + 1, base + 2].map((value) => ({
      input: `${value}\n`,
      output: `${value * 2}`,
    }));

    pushCase({
      group: 'submit-cpp',
      language: 'cpp',
      endpoint: '/api/execute/submit',
      payload: {
        language: 'cpp',
        code: cppDoubleProgram(),
        testCases,
      },
      expected: testCases,
      validator: 'submit',
    });
  }

  const sqlCases = [
    { query: 'SELECT 1 AS value', expected: 1 },
    { query: 'SELECT 2 + 3 AS value', expected: 5 },
    { query: 'SELECT CAST(9 AS INTEGER) AS value', expected: 9 },
    { query: 'SELECT COALESCE(NULL, 42) AS value', expected: 42 },
    { query: "SELECT CASE WHEN 5 > 3 THEN 1 ELSE 0 END AS value", expected: 1 },
    { query: 'WITH x AS (SELECT 7 AS n) SELECT n * 3 AS value FROM x', expected: 21 },
    { query: 'SELECT ABS(-9) AS value', expected: 9 },
    { query: 'SELECT ROUND(3.6) AS value', expected: 4 },
  ];

  for (const sqlCase of sqlCases) {
    pushCase({
      group: 'sql',
      language: 'sql',
      endpoint: '/api/execute/sql',
      payload: {
        query: sqlCase.query,
      },
      expected: sqlCase.expected,
      validator: 'sql',
    });
  }

  return cases;
}

function validateCase(item, response) {
  const payload = response.payload || {};

  if (!response.ok || response.status !== 200 || response.timedOut) {
    return {
      passed: false,
      reason: response.timedOut
        ? 'request-timeout'
        : `http-status-${response.status}`,
    };
  }

  if (item.validator === 'run') {
    const output = normalizeText(payload.output);
    const expected = normalizeText(item.expected);
    const passed = Boolean(payload.success) && output === expected;
    return {
      passed,
      reason: passed ? null : `run-mismatch expected=${expected} actual=${output} error=${normalizeText(payload.error)}`,
    };
  }

  if (item.validator === 'submit') {
    const total = Number(payload.totalTestCases || 0);
    const passedCount = Number(payload.testCasesPassed || 0);
    const passed = Boolean(payload.success) && total > 0 && passedCount === total;
    return {
      passed,
      reason: passed
        ? null
        : `submit-mismatch verdict=${payload.verdict || 'unknown'} passed=${passedCount}/${total} error=${normalizeText(payload.error)}`,
    };
  }

  if (item.validator === 'sql') {
    const rows = Array.isArray(payload.output) ? payload.output : [];
    const value = rows[0]?.value;
    const passed = Boolean(payload.success) && Number(value) === Number(item.expected);
    return {
      passed,
      reason: passed
        ? null
        : `sql-mismatch expected=${item.expected} actual=${value} error=${normalizeText(payload.error)}`,
    };
  }

  return {
    passed: false,
    reason: 'unknown-validator',
  };
}

function summarize(results) {
  const summaryByGroup = {};
  const summaryByLanguage = {};
  const failed = [];

  for (const result of results) {
    summaryByGroup[result.group] = summaryByGroup[result.group] || { total: 0, passed: 0, failed: 0 };
    summaryByLanguage[result.language] = summaryByLanguage[result.language] || { total: 0, passed: 0, failed: 0 };

    summaryByGroup[result.group].total += 1;
    summaryByLanguage[result.language].total += 1;

    if (result.passed) {
      summaryByGroup[result.group].passed += 1;
      summaryByLanguage[result.language].passed += 1;
    } else {
      summaryByGroup[result.group].failed += 1;
      summaryByLanguage[result.language].failed += 1;
      failed.push(result);
    }
  }

  return {
    summaryByGroup,
    summaryByLanguage,
    failed,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const cases = buildCases();
  const results = [];

  for (const item of cases) {
    const response = await requestJson(`${API_BASE}${item.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: item.payload,
      timeoutMs: item.language === 'cpp' ? REQUEST_TIMEOUT_MS * 2 : REQUEST_TIMEOUT_MS,
    });

    const validation = validateCase(item, response);
    results.push({
      id: item.id,
      group: item.group,
      language: item.language,
      endpoint: item.endpoint,
      status: response.status,
      durationMs: response.durationMs,
      timedOut: response.timedOut,
      passed: validation.passed,
      reason: validation.reason,
      response: response.payload,
    });
  }

  const aggregated = summarize(results);
  const passedCount = results.filter((item) => item.passed).length;

  const report = {
    phase: 'execution-correctness-matrix',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    totals: {
      totalCases: results.length,
      passedCases: passedCount,
      failedCases: results.length - passedCount,
    },
    summaryByGroup: aggregated.summaryByGroup,
    summaryByLanguage: aggregated.summaryByLanguage,
    passed: passedCount === results.length,
    failedCases: aggregated.failed,
    results,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[execution-correctness-matrix] Report written to ${REPORT_PATH}`);
  console.log(`[execution-correctness-matrix] Passed ${passedCount}/${results.length}`);

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[execution-correctness-matrix] Fatal error:', error?.stack || error?.message || error);
  process.exitCode = 1;
});
