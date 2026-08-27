import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_P95_TARGET_MS = Number(process.env.AI_P95_TARGET_MS || 5000);
const EXECUTION_PASS_TARGET = Number(process.env.EXEC_MATRIX_PASS_TARGET || 1);
const REPORT_PATH = path.join(__dirname, 'regression-shield-report.json');
const PROVIDER_REPORT_PATH = path.join(__dirname, 'provider-latency-validation-report.json');
const EXECUTION_REPORT_PATH = path.join(__dirname, 'execution-correctness-matrix-report.json');

function runNodeScript(scriptPath, label) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

    child.on('error', (error) => {
      resolve({
        label,
        scriptPath,
        ok: false,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        reason: String(error?.message || error),
      });
    });

    child.on('close', (code) => {
      resolve({
        label,
        scriptPath,
        ok: code === 0,
        exitCode: Number(code || 0),
        durationMs: Date.now() - startedAt,
        reason: code === 0 ? '' : `exit code ${code}`,
      });
    });
  });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const blockers = [];

  const tasks = [
    { label: 'Route smoke', scriptPath: 'scripts/smoke-routes.mjs' },
    { label: 'API smoke', scriptPath: 'scripts/smoke-api.mjs' },
    { label: 'Flow smoke', scriptPath: 'scripts/smoke-flows.mjs' },
    { label: 'Beta journeys', scriptPath: 'scripts/beta-journeys.mjs' },
    { label: 'Provider latency validation', scriptPath: 'scripts/provider-latency-validation.mjs' },
    { label: 'Execution correctness matrix', scriptPath: 'scripts/execution-correctness-matrix.mjs' },
  ];

  const taskResults = [];
  for (const task of tasks) {
    console.log(`\n[regression-shield] ${task.label}`);
    const result = await runNodeScript(task.scriptPath, task.label);
    taskResults.push(result);
    if (!result.ok) {
      blockers.push(`${task.label} failed (${result.reason || 'unknown reason'})`);
    }
  }

  const providerReport = readJson(PROVIDER_REPORT_PATH);
  const executionReport = readJson(EXECUTION_REPORT_PATH);

  const learnSummary = providerReport?.summaries?.learn || {};
  const mentorSummary = providerReport?.summaries?.mentor || {};

  const learnP95 = Number(learnSummary?.successLatency?.p95Ms || 0);
  const mentorP95 = Number(mentorSummary?.successLatency?.p95Ms || 0);
  const providerP95TargetMet = Boolean(providerReport?.overallP95TargetMet)
    && learnP95 <= AI_P95_TARGET_MS
    && mentorP95 <= AI_P95_TARGET_MS;

  function isFullyDegradedFallback(summary) {
    const successfulResponses = Number(summary?.successfulResponses || 0);
    const degradedResponses = Number(summary?.degraded || 0);
    const providerCounts = summary?.providerCounts || {};
    const nonFallbackHits = Object.entries(providerCounts)
      .filter(([provider]) => String(provider).toLowerCase() !== 'fallback')
      .reduce((acc, [, count]) => acc + Number(count || 0), 0);

    return successfulResponses > 0
      && degradedResponses >= successfulResponses
      && nonFallbackHits === 0;
  }

  const learnFullyDegraded = isFullyDegradedFallback(learnSummary);
  const mentorFullyDegraded = isFullyDegradedFallback(mentorSummary);

  if (!providerReport) {
    blockers.push('Provider latency report missing.');
  } else if (!providerP95TargetMet) {
    blockers.push(`AI p95 latency threshold breach (target <= ${AI_P95_TARGET_MS}ms, learn=${learnP95}ms, mentor=${mentorP95}ms).`);
  }

  if (learnFullyDegraded && mentorFullyDegraded) {
    blockers.push('AI validation is fully degraded: all successful learn/mentor responses came from fallback provider.');
  }

  const totalCases = Number(executionReport?.totals?.totalCases || 0);
  const passedCases = Number(executionReport?.totals?.passedCases || 0);
  const passRate = totalCases > 0 ? passedCases / totalCases : 0;
  const executionTargetMet = Boolean(executionReport?.passed) && passRate >= EXECUTION_PASS_TARGET;

  if (!executionReport) {
    blockers.push('Execution matrix report missing.');
  } else if (!executionTargetMet) {
    blockers.push(`Execution matrix below threshold (required ${Math.round(EXECUTION_PASS_TARGET * 100)}%, actual ${(passRate * 100).toFixed(2)}%).`);
  }

  const report = {
    phase: 'regression-shield',
    startedAt,
    finishedAt: new Date().toISOString(),
    thresholds: {
      aiP95TargetMs: AI_P95_TARGET_MS,
      executionPassTarget: EXECUTION_PASS_TARGET,
    },
    tasks: taskResults,
    providerLatency: {
      available: Boolean(providerReport),
      overallP95TargetMet: providerP95TargetMet,
      learnP95Ms: learnP95,
      mentorP95Ms: mentorP95,
      learnFullyDegraded,
      mentorFullyDegraded,
      learnProviderCounts: learnSummary?.providerCounts || {},
      mentorProviderCounts: mentorSummary?.providerCounts || {},
    },
    executionMatrix: {
      available: Boolean(executionReport),
      passed: executionTargetMet,
      totalCases,
      passedCases,
      passRate: Number((passRate * 100).toFixed(2)),
    },
    blockers,
    passed: blockers.length === 0,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[regression-shield] Report written to ${REPORT_PATH}`);
  if (report.passed) {
    console.log('[regression-shield] PASS: all thresholds and suites satisfied.');
    return;
  }

  console.error('[regression-shield] FAIL: blockers detected.');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('[regression-shield] Fatal error:', error?.stack || error?.message || error);
  process.exitCode = 1;
});
