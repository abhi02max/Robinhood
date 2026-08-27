/**
 * Predictive Intelligence Engine — Phase 9
 * Pure functions: interview readiness, risk detection, recovery interventions,
 * learning velocity forecasting, predictive profile.
 * No DB, no I/O — LLM-ready interfaces.
 */

// ─── 1. Interview Readiness Prediction ───

export function predictReadiness(masteryScores, totalSolved, totalPatterns) {
  if (!masteryScores || masteryScores.length === 0)
    return { medium_probability: 0, hard_probability: 0, readiness_level: 'not_ready', growth_trajectory: 'unknown' };

  const scores = masteryScores.map((m) => Number(m.mastery_score) || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const coverage = scores.length / Math.max(totalPatterns, 1);
  const aboveThreshold = scores.filter((s) => s >= 0.5).length / scores.length;

  // Medium probability: average mastery × coverage factor
  const mediumProb = Math.min(1, Math.round((avg * 0.6 + aboveThreshold * 0.3 + coverage * 0.1) * 100) / 100);
  // Hard probability: needs strong mastery + breadth
  const hardProb = Math.min(1, Math.round((Math.max(0, avg - 0.2) * 0.5 + Math.max(0, aboveThreshold - 0.3) * 0.3 + coverage * 0.2) * 100) / 100);

  let readiness = 'not_ready';
  if (mediumProb >= 0.8 && hardProb >= 0.5) readiness = 'strong';
  else if (mediumProb >= 0.6) readiness = 'ready';
  else if (mediumProb >= 0.35) readiness = 'developing';

  // Growth trajectory based on mastery distribution
  const highCount = scores.filter((s) => s >= 0.7).length;
  const lowCount = scores.filter((s) => s < 0.3).length;
  let trajectory = 'steady';
  if (highCount > lowCount * 2) trajectory = 'accelerating';
  else if (lowCount > highCount * 2) trajectory = 'needs_focus';

  return {
    medium_probability: mediumProb,
    hard_probability: hardProb,
    readiness_level: readiness,
    growth_trajectory: trajectory,
    patterns_mastered: highCount,
    patterns_developing: scores.filter((s) => s >= 0.3 && s < 0.7).length,
    patterns_weak: lowCount,
    coverage_percent: Math.round(coverage * 100),
  };
}

// ─── 2. Risk Detection ───

export function detectRisks(submissions, profile) {
  const risks = {
    burnout: { detected: false, confidence: 0, signal: '' },
    stagnation: { detected: false, confidence: 0, signal: '' },
    frustration: { detected: false, confidence: 0, signal: '' },
    hint_dependence: { detected: false, confidence: 0, signal: '' },
  };

  if (!submissions || submissions.length < 3) return risks;

  // Sort newest first
  const sorted = [...submissions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Burnout: submission frequency drop (compare last 7 days vs prior 7 days)
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const twoWeeksAgo = new Date(now - 14 * 86400000);
  const recentCount = sorted.filter((s) => new Date(s.created_at) >= weekAgo).length;
  const priorCount = sorted.filter((s) => {
    const d = new Date(s.created_at);
    return d >= twoWeeksAgo && d < weekAgo;
  }).length;

  if (priorCount >= 3 && recentCount <= Math.max(1, priorCount * 0.3)) {
    risks.burnout = {
      detected: true,
      confidence: Math.min(0.9, Math.round((1 - recentCount / priorCount) * 100) / 100),
      signal: `Activity dropped from ${priorCount} to ${recentCount} submissions this week`,
    };
  }

  // Stagnation: same pattern attempted repeatedly without improvement
  const byPattern = {};
  for (const s of sorted.slice(0, 30)) {
    const pn = s.pattern_name || 'unknown';
    if (!byPattern[pn]) byPattern[pn] = { total: 0, accepted: 0 };
    byPattern[pn].total++;
    if (s.status === 'Accepted') byPattern[pn].accepted++;
  }
  for (const [pn, stats] of Object.entries(byPattern)) {
    if (stats.total >= 5 && stats.accepted === 0) {
      risks.stagnation = {
        detected: true,
        confidence: Math.min(0.85, Math.round((stats.total / 10) * 100) / 100),
        signal: `${stats.total} attempts on "${pn}" pattern with no accepted solutions`,
      };
      break;
    }
  }

  // Frustration: consecutive failures (5+ in a row on same problem)
  const recentByProblem = {};
  for (const s of sorted.slice(0, 20)) {
    const pid = s.problem_id;
    if (!recentByProblem[pid]) recentByProblem[pid] = [];
    recentByProblem[pid].push(s.status);
  }
  for (const [, statuses] of Object.entries(recentByProblem)) {
    const consecutiveFails = statuses.findIndex((s) => s === 'Accepted');
    const failStreak = consecutiveFails === -1 ? statuses.length : consecutiveFails;
    if (failStreak >= 5) {
      risks.frustration = {
        detected: true,
        confidence: Math.min(0.9, Math.round((failStreak / 8) * 100) / 100),
        signal: `${failStreak} consecutive failures on a single problem`,
      };
      break;
    }
  }

  // Hint dependence: if profile indicates heavy hint usage
  if (profile) {
    const errorTendency = profile.error_tendency;
    const weaknesses = profile.weaknesses || [];
    if (weaknesses.length >= 3 && profile.learning_speed === 'slow') {
      risks.hint_dependence = {
        detected: true,
        confidence: 0.6,
        signal: 'Multiple weak patterns with slow learning speed suggest over-reliance on hints',
      };
    }
  }

  return risks;
}

// ─── 3. Recovery Interventions ───

export function generateInterventions(risks, masteryScores) {
  const interventions = [];

  if (risks.burnout?.detected) {
    interventions.push({
      type: 'take_break', priority: 'high',
      icon: '🧘', message: 'Consider taking a short break. Consistent learning beats marathons.',
      action: 'Reduce daily goal to 1 problem for a few days',
    });
  }

  if (risks.stagnation?.detected) {
    interventions.push({
      type: 'suggest_review', priority: 'high',
      icon: '📚', message: `You seem stuck on a pattern. Review the approach section before trying again.`,
      action: 'Switch to an easier problem in the same pattern to rebuild momentum',
    });
  }

  if (risks.frustration?.detected) {
    interventions.push({
      type: 'inject_confidence', priority: 'high',
      icon: '💪', message: 'Multiple failures are normal. Try a simpler variant of this problem.',
      action: 'Auto-suggest an Easy problem in the same pattern',
    });
    interventions.push({
      type: 'reduce_difficulty', priority: 'medium',
      icon: '⬇️', message: 'Temporarily lowering recommended difficulty to rebuild confidence.',
      action: 'Next recommendation will be one difficulty level lower',
    });
  }

  if (risks.hint_dependence?.detected) {
    interventions.push({
      type: 'independence_challenge', priority: 'medium',
      icon: '🎯', message: 'Try solving the next problem without hints. You know more than you think!',
      action: 'Disable hint button for next attempt (user can re-enable)',
    });
  }

  // If no risks, give positive reinforcement
  if (interventions.length === 0) {
    const strongPatterns = (masteryScores || []).filter((m) => (Number(m.mastery_score) || 0) >= 0.7);
    if (strongPatterns.length > 0) {
      interventions.push({
        type: 'positive_reinforcement', priority: 'low',
        icon: '🌟', message: `You're making great progress! ${strongPatterns.length} pattern${strongPatterns.length > 1 ? 's' : ''} mastered.`,
        action: 'Keep going at your current pace',
      });
    }
  }

  return interventions.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
  });
}

// ─── 4. Learning Velocity Forecasting ───

export function forecastVelocity(submissions) {
  if (!submissions || submissions.length < 2)
    return { problems_per_week: 0, estimated_days_to_mastery: null, improvement_trend: 'steady', confidence_trend: 'stable' };

  const sorted = [...submissions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const first = new Date(sorted[0].created_at);
  const last = new Date(sorted[sorted.length - 1].created_at);
  const daySpan = Math.max(1, (last - first) / 86400000);

  // Problems per week
  const uniqueProblems = new Set(sorted.map((s) => s.problem_id)).size;
  const problemsPerWeek = Math.round((uniqueProblems / daySpan) * 7 * 10) / 10;

  // Solve rate trend: compare first half vs second half
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const solveRate1 = firstHalf.filter((s) => s.status === 'Accepted').length / Math.max(firstHalf.length, 1);
  const solveRate2 = secondHalf.filter((s) => s.status === 'Accepted').length / Math.max(secondHalf.length, 1);

  let improvement = 'steady';
  if (solveRate2 > solveRate1 + 0.1) improvement = 'accelerating';
  else if (solveRate2 < solveRate1 - 0.1) improvement = 'decelerating';

  // Confidence trend: are recent submissions more successful?
  const recent10 = sorted.slice(-10);
  const recentSolveRate = recent10.filter((s) => s.status === 'Accepted').length / recent10.length;
  let confidence = 'stable';
  if (recentSolveRate >= 0.7) confidence = 'rising';
  else if (recentSolveRate < 0.3) confidence = 'falling';

  // Estimated days to full mastery (rough: 200 problems)
  const remaining = Math.max(0, 200 - uniqueProblems);
  const dailyRate = uniqueProblems / daySpan;
  const daysToMastery = dailyRate > 0 ? Math.round(remaining / dailyRate) : null;

  return {
    problems_per_week: problemsPerWeek,
    total_problems_attempted: uniqueProblems,
    day_span: Math.round(daySpan),
    solve_rate_early: Math.round(solveRate1 * 100),
    solve_rate_recent: Math.round(solveRate2 * 100),
    improvement_trend: improvement,
    confidence_trend: confidence,
    estimated_days_to_mastery: daysToMastery,
  };
}

// ─── 5. Predictive Profile Builder ───

export function buildPredictiveProfile(readiness, risks, velocity, interventions) {
  const activeRisks = Object.entries(risks).filter(([, v]) => v.detected).map(([k, v]) => ({
    type: k, confidence: v.confidence, signal: v.signal,
  }));

  return {
    readiness,
    velocity,
    risk_alerts: activeRisks,
    interventions,
    health_score: computeHealthScore(readiness, activeRisks, velocity),
  };
}

function computeHealthScore(readiness, activeRisks, velocity) {
  let score = 50; // baseline

  // Readiness contribution (+0 to +25)
  const rMap = { strong: 25, ready: 20, developing: 10, not_ready: 0 };
  score += rMap[readiness.readiness_level] || 0;

  // Velocity contribution (+0 to +15)
  if (velocity.improvement_trend === 'accelerating') score += 15;
  else if (velocity.improvement_trend === 'steady') score += 10;
  else score += 0;

  // Confidence contribution (+0 to +10)
  if (velocity.confidence_trend === 'rising') score += 10;
  else if (velocity.confidence_trend === 'stable') score += 5;

  // Risk penalties (-10 each)
  score -= activeRisks.length * 10;

  return Math.max(0, Math.min(100, score));
}
