import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000';
const HEALTH_TIMEOUT_MS = Number(process.env.RELEASE_GATE_TIMEOUT_MS || 10000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.join(__dirname, '..');
const REPORT_PATH = path.join(__dirname, 'final-release-gate-report.json');

function runCommand(command, args, label, cwd = WORKSPACE_DIR) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    console.log(`\n[release-gate] ${label}`);
    console.log(`[release-gate] > ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

    child.on('error', (error) => {
      resolve({
        ok: false,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        reason: String(error?.message || error),
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: Number(code || 0),
        durationMs: Date.now() - startedAt,
        reason: code === 0 ? '' : `exit code ${code}`,
      });
    });
  });
}

function runNpmScript(scriptName, label, cwd = WORKSPACE_DIR) {
  if (process.platform === 'win32') {
    return runCommand('cmd.exe', ['/d', '/s', '/c', `npm run ${scriptName}`], label, cwd);
  }
  return runCommand('npm', ['run', scriptName], label, cwd);
}

async function fetchJson(pathname) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${pathname}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: {}, error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function toCheck(name, passed, details, critical = true) {
  return { name, passed: Boolean(passed), details: details || '', critical };
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = [];

  const regressionShield = await runCommand(process.execPath, ['scripts/regression-shield.mjs'], 'Regression shield (routes/api/latency/matrix/flows/journeys)');
  checks.push(toCheck(
    'Routes + API + provider latency + execution matrix + beta journeys',
    regressionShield.ok,
    regressionShield.ok ? 'regression shield passed' : `regression shield failed (${regressionShield.reason})`,
    true,
  ));

  const buildResult = await runNpmScript('build', 'Production build verification');
  checks.push(toCheck(
    'Production build verification',
    buildResult.ok,
    buildResult.ok ? 'next build succeeded' : `next build failed (${buildResult.reason})`,
    true,
  ));

  const health = await fetchJson('/api/health');
  checks.push(toCheck(
    'Health endpoint liveness',
    health.ok && health.body?.status === 'ok',
    `status=${health.status} body.status=${health.body?.status || 'unknown'}`,
    true,
  ));

  const healthLive = await fetchJson('/api/health/live');
  checks.push(toCheck(
    'Health live process check',
    healthLive.ok && healthLive.body?.status === 'ok',
    `status=${healthLive.status} body.status=${healthLive.body?.status || 'unknown'}`,
    true,
  ));

  const healthReady = await fetchJson('/api/health/ready');
  const readinessChecks = healthReady.body?.checks || {};

  checks.push(toCheck(
    'Overall dependency readiness',
    healthReady.ok && (healthReady.body?.status === 'ok' || healthReady.body?.status === 'degraded'),
    `status=${healthReady.status} ready=${healthReady.body?.status || 'unknown'}`,
    true,
  ));

  checks.push(toCheck(
    'Piston availability',
    readinessChecks?.piston?.status === 'ok',
    readinessChecks?.piston?.reason || `status=${readinessChecks?.piston?.status || 'unknown'}`,
    true,
  ));

  checks.push(toCheck(
    'Judge0 availability',
    readinessChecks?.judge0?.status === 'ok',
    readinessChecks?.judge0?.reason || `status=${readinessChecks?.judge0?.status || 'unknown'}`,
    true,
  ));

  checks.push(toCheck(
    'Postgres connectivity',
    readinessChecks?.postgres?.status === 'ok',
    readinessChecks?.postgres?.reason || `status=${readinessChecks?.postgres?.status || 'unknown'}`,
    true,
  ));

  checks.push(toCheck(
    'Redis session backend',
    readinessChecks?.redis?.status === 'ok',
    readinessChecks?.redis?.reason || `status=${readinessChecks?.redis?.status || 'unknown'}`,
    true,
  ));

  const aiHealth = await fetchJson('/api/ai/health');
  const aiProviderState = readinessChecks?.aiProviders?.status;
  checks.push(toCheck(
    'AI provider readiness',
    aiHealth.ok && aiHealth.body?.status === 'ok' && aiProviderState !== 'error',
    `health=${aiHealth.status} aiHealth=${aiHealth.body?.status || 'unknown'} startup=${aiProviderState || 'unknown'}`,
    true,
  ));

  const criticalChecks = checks.filter((check) => check.critical);
  const passedChecks = checks.filter((check) => check.passed).length;
  const criticalFailures = criticalChecks.filter((check) => !check.passed);
  const blockers = criticalFailures.map((check) => `${check.name}: ${check.details}`);
  const warnings = Array.isArray(healthReady.body?.warnings) ? healthReady.body.warnings : [];

  const confidenceScore = checks.length > 0
    ? Math.round((passedChecks / checks.length) * 100)
    : 0;

  const verdict = blockers.length === 0 ? 'GO' : 'NO_GO';

  const report = {
    phase: 'final-release-gate',
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    verdict,
    confidenceScore,
    checks,
    warnings,
    blockers,
    readiness: healthReady.body || null,
    aiHealth: aiHealth.body || null,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\n[release-gate] Report written to ${REPORT_PATH}`);
  console.log(`[release-gate] VERDICT: ${verdict}`);
  console.log(`[release-gate] Confidence: ${confidenceScore}%`);

  if (warnings.length) {
    console.log('[release-gate] Warnings:');
    for (const warning of warnings) {
      console.log(` - ${warning}`);
    }
  }

  if (blockers.length) {
    console.error('[release-gate] Blockers:');
    for (const blocker of blockers) {
      console.error(` - ${blocker}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[release-gate] Fatal error:', error?.stack || error?.message || error);
  process.exitCode = 1;
});
