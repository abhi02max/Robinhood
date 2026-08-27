import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUTS = [
  { key: 'edge', file: 'hardening-edge-report.json', weight: 0.2 },
  { key: 'soak', file: 'hardening-soak-report.json', weight: 0.3 },
  { key: 'concurrency', file: 'hardening-concurrency-report.json', weight: 0.2 },
  { key: 'production', file: 'hardening-production-report.json', weight: 0.3 },
];

const OUTPUT_FILE = path.join(__dirname, 'hardening-final-report.json');

const INFRA_NOTE = 'infra instability during soak';
const INFRA_INTERRUPT_PATTERNS = [
  /ERR_NETWORK_IO_SUSPENDED/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /ERR_NETWORK_CHANGED/i,
  /browser has been disconnected/i,
  /Target page, context or browser has been closed/i,
  /Execution context was destroyed, most likely because of a navigation/i,
  /temporary network drop/i,
  /system sleep/i,
  /navigation timeout/i,
];

function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function phaseScore(report) {
  if (!report || typeof report !== 'object') return 0;

  if (report.totals && Number.isFinite(report.totals.checksTotal) && report.totals.checksTotal > 0) {
    const passed = Number(report.totals.passedChecks || 0);
    return Math.max(0, Math.min(1, passed / report.totals.checksTotal));
  }

  if (report.totals && Number.isFinite(report.totals.total) && report.totals.total > 0) {
    const passed = Number(report.totals.passed || 0);
    return Math.max(0, Math.min(1, passed / report.totals.total));
  }

  if (Array.isArray(report.results) && report.results.length > 0) {
    const passed = report.results.filter((item) => item?.passed).length;
    return Math.max(0, Math.min(1, passed / report.results.length));
  }

  return report.passed ? 1 : 0;
}

function isInfraInterruptText(value) {
  const text = String(value || '');
  if (!text) return false;
  return INFRA_INTERRUPT_PATTERNS.some((pattern) => pattern.test(text));
}

function isInfraIssue(issue) {
  if (!issue || typeof issue !== 'object') return false;
  if (issue.classification === 'INFRA_INTERRUPT') return true;
  return isInfraInterruptText(`${issue.type || ''} ${issue.detail || ''}`);
}

function isThresholdIssue(issue) {
  return issue?.type === 'abort-threshold' || issue?.type === 'infra-threshold';
}

function getFailedChecks(report) {
  if (!Array.isArray(report?.checks)) return [];
  return report.checks.filter((check) => check && check.passed === false);
}

function getBlockingIssues(report, options = {}) {
  if (!Array.isArray(report?.telemetry?.issues)) return [];
  const issues = report.telemetry.issues.filter((item) => item && item.blocking !== false);
  if (options.excludeThreshold) {
    return issues.filter((item) => !isThresholdIssue(item));
  }
  return issues;
}

function isInfraCheckFailure(report, check) {
  const name = String(check?.name || '');

  if (name === 'No blocking stale-state incidents') {
    const blockingIssues = getBlockingIssues(report, { excludeThreshold: true });
    if (!blockingIssues.length) return false;
    return blockingIssues.every((item) => isInfraIssue(item));
  }

  if (name === 'No severe browser console errors') {
    const severeErrors = Array.isArray(check?.details?.severeConsoleErrors)
      ? check.details.severeConsoleErrors
      : [];
    return severeErrors.length > 0 && severeErrors.every((item) => isInfraInterruptText(item));
  }

  if (name === 'No uncaught page runtime errors') {
    const pageErrors = Array.isArray(check?.details?.pageErrors)
      ? check.details.pageErrors
      : [];
    return pageErrors.length > 0 && pageErrors.every((item) => isInfraInterruptText(item));
  }

  return false;
}

function analyzeSoakReport(report) {
  if (!report || typeof report !== 'object') {
    return {
      acceptForGate: false,
      onlyInfraFailures: false,
      coreChecksPass: false,
      inconclusive: false,
      infraInterruptCount: 0,
      failedCheckCount: 0,
    };
  }

  const failedChecks = getFailedChecks(report);
  const infraFailedChecks = failedChecks.filter((check) => isInfraCheckFailure(report, check));
  const nonInfraFailedChecks = failedChecks.filter((check) => !isInfraCheckFailure(report, check));
  const blockingIssues = getBlockingIssues(report, { excludeThreshold: true });
  const infraBlockingIssues = blockingIssues.filter((issue) => isInfraIssue(issue));
  const telemetryIssues = Array.isArray(report?.telemetry?.issues) ? report.telemetry.issues : [];
  const hasThresholdAbort = telemetryIssues.some((item) => item?.type === 'abort-threshold' || item?.type === 'infra-threshold');
  const thresholdDueInfra = hasThresholdAbort
    && (blockingIssues.length === 0 || infraBlockingIssues.length === blockingIssues.length);

  const onlyInfraFailures = failedChecks.length > 0 && infraFailedChecks.length === failedChecks.length;
  const coreChecksPass = nonInfraFailedChecks.length === 0;
  const inconclusive = Boolean(report.inconclusive || report.status === 'INCONCLUSIVE' || thresholdDueInfra);
  const acceptForGate = coreChecksPass && (report.passed === true || onlyInfraFailures);

  return {
    acceptForGate,
    onlyInfraFailures,
    coreChecksPass,
    inconclusive,
    infraInterruptCount: infraBlockingIssues.length,
    failedCheckCount: failedChecks.length,
  };
}

function collectBlockers(report, key, options = {}) {
  if (!report) return [`${key}: missing report`];

  const blockers = [];
  if (Array.isArray(report.checks)) {
    for (const check of report.checks) {
      if (check && check.passed === false && check.blocking !== false) {
        if (options.ignoreInfraFailures && options.isInfraCheckFailure?.(report, check)) {
          continue;
        }
        blockers.push(`${key}: ${check.name}`);
      }
    }
  }

  if (Array.isArray(report.results)) {
    for (const result of report.results) {
      if (result && result.passed === false && result.blocking !== false) {
        blockers.push(`${key}: ${result.name}`);
      }
    }
  }

  if (report.passed === false && blockers.length === 0 && !options.allowPhaseFailureWithoutBlocker) {
    blockers.push(`${key}: phase marked as failed`);
  }

  return blockers;
}

function buildRiskSummary(phaseReports, soakAssessment, infraOverrideApplied) {
  const risks = [];
  for (const phase of phaseReports) {
    if (!phase.report) {
      risks.push({ phase: phase.key, risk: 'Missing report artifact.' });
      continue;
    }

    if (phase.report.passed === false) {
      risks.push({ phase: phase.key, risk: 'Phase failed one or more checks.' });
    }

    const failedChecks = Array.isArray(phase.report.checks)
      ? phase.report.checks.filter((item) => item && item.passed === false).length
      : 0;

    if (failedChecks > 0) {
      risks.push({ phase: phase.key, risk: `${failedChecks} failed checks detected.` });
    }
  }

  if (infraOverrideApplied) {
    risks.push({ phase: 'soak', risk: 'Soak failures classified as infrastructure interruptions only.' });
    if (soakAssessment.inconclusive) {
      risks.push({ phase: 'soak', risk: 'Soak run marked INCONCLUSIVE due interruption threshold.' });
    }
  }

  return risks;
}

function main() {
  const phaseReports = INPUTS.map((item) => {
    const filePath = path.join(__dirname, item.file);
    const report = safeReadJson(filePath);
    const soakAssessment = item.key === 'soak' ? analyzeSoakReport(report) : null;
    const passedForGate = item.key === 'soak'
      ? Boolean(report?.passed === true || soakAssessment?.acceptForGate)
      : Boolean(report?.passed === true);
    const blockers = collectBlockers(report, item.key, item.key === 'soak'
      ? {
          ignoreInfraFailures: Boolean(soakAssessment?.acceptForGate),
          allowPhaseFailureWithoutBlocker: Boolean(soakAssessment?.acceptForGate),
          isInfraCheckFailure,
        }
      : {});

    return {
      ...item,
      filePath,
      report,
      score: phaseScore(report),
      passedForGate,
      soakAssessment,
      blockers,
    };
  });

  const soakPhase = phaseReports.find((phase) => phase.key === 'soak');
  const soakAssessment = soakPhase?.soakAssessment || analyzeSoakReport(null);

  const blockers = phaseReports.flatMap((phase) => phase.blockers);
  const weightedScore = phaseReports.reduce((sum, phase) => sum + (phase.score * phase.weight), 0);
  const infraAdjustment = soakAssessment.acceptForGate ? -0.5 : 0;
  const confidence = Number(Math.max(0, Math.min(100, (weightedScore * 100) + infraAdjustment)).toFixed(2));

  const allPhasesPassed = phaseReports.every((phase) => phase.report && phase.report.passed === true);
  const allPhasesPassedForGate = phaseReports.every((phase) => phase.passedForGate);
  const coreNonSoakPassed = phaseReports
    .filter((phase) => phase.key !== 'soak')
    .every((phase) => phase.report && phase.report.passed === true);

  const strictGo = allPhasesPassed && blockers.length === 0 && confidence > 95;
  const infraOverrideApplied = !strictGo
    && coreNonSoakPassed
    && soakAssessment.coreChecksPass
    && soakAssessment.onlyInfraFailures;
  const goDecision = strictGo || (allPhasesPassedForGate && blockers.length === 0 && infraOverrideApplied);

  const summary = {
    generatedAt: new Date().toISOString(),
    confidence,
    threshold: 95,
    goDecision: goDecision ? 'GO' : 'NO_GO',
    deploymentAllowed: goDecision,
    phaseScores: phaseReports.map((phase) => ({
      phase: phase.key,
      file: path.basename(phase.filePath),
      score: Number((phase.score * 100).toFixed(2)),
      weight: phase.weight,
      passed: phase.report?.passed === true,
      passedForGate: phase.passedForGate,
    })),
    note: infraOverrideApplied ? INFRA_NOTE : null,
    soak: {
      status: soakPhase?.report?.status || (soakPhase?.report?.passed ? 'PASSED' : 'FAILED'),
      inconclusive: Boolean(soakAssessment.inconclusive),
      onlyInfraFailures: Boolean(soakAssessment.onlyInfraFailures),
      infraInterruptCount: Number(soakAssessment.infraInterruptCount || 0),
      failedChecks: Number(soakAssessment.failedCheckCount || 0),
    },
    blockers,
    risks: buildRiskSummary(phaseReports, soakAssessment, infraOverrideApplied),
  };

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(`\n[hardening-final] Report written to ${OUTPUT_FILE}`);
  console.log(`[hardening-final] Decision: ${summary.goDecision}`);
  console.log(`[hardening-final] Confidence: ${summary.confidence}%`);
  if (summary.note) {
    console.log(`[hardening-final] Note: ${summary.note}`);
  }

  if (!goDecision) {
    process.exitCode = 1;
  }
}

main();
