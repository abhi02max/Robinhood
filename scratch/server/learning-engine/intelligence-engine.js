/**
 * Intelligence Engine — Phase 6
 *
 * Pure functions that take submission data and produce intelligence insights.
 * No DB access, no I/O — designed to be testable and swap-ready for LLM.
 *
 * Exports:
 *   analyzeErrorPatterns(submissions)
 *   computeAdaptiveWeights(errorProfile)
 *   buildUserProfile(patternStats, errorProfile, submissions)
 *   buildLearningPath(patterns, masteryBySlug)
 *   generateContextualHint(context)
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. ERROR PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────────

const ERROR_CATEGORIES = {
  off_by_one:    { label: 'Off-by-One',       icon: '🔢' },
  null_ref:      { label: 'Null Reference',    icon: '⚠️' },
  bounds_error:  { label: 'Index Out of Bounds', icon: '📏' },
  tle:           { label: 'Time Limit',        icon: '⏱️' },
  wrong_return:  { label: 'Wrong Return Type', icon: '↩️' },
  logic_error:   { label: 'Logic Error',       icon: '🧠' },
  stack_overflow:{ label: 'Stack Overflow',    icon: '📚' },
  syntax_error:  { label: 'Syntax Error',      icon: '✏️' },
};

/**
 * Classify a single failed submission into an error category.
 * Returns null for Accepted submissions.
 */
function classifySubmissionError(sub) {
  if (sub.status === 'Accepted') return null;

  const status = (sub.status || '').toLowerCase();
  const failCases = sub.fail_cases || [];
  const firstFail = Array.isArray(failCases) && failCases.length > 0 ? failCases[0] : null;
  const msg = (firstFail?.message || firstFail?.stderr || '').toLowerCase();
  const actual = JSON.stringify(firstFail?.actual ?? '').toLowerCase();
  const expected = JSON.stringify(firstFail?.expected ?? '').toLowerCase();

  // TLE
  if (status.includes('time limit')) return 'tle';

  // Compilation / syntax
  if (status.includes('compilation') || msg.includes('syntax')) return 'syntax_error';

  // Stack overflow
  if (msg.includes('stack') || msg.includes('recursion') || msg.includes('maximum call'))
    return 'stack_overflow';

  // Null reference
  if (msg.includes('null') || msg.includes('undefined') || msg.includes('nonetype') || msg.includes("'none'"))
    return 'null_ref';

  // Index out of bounds
  if (msg.includes('index') || msg.includes('range') || msg.includes('bounds') || msg.includes('out of'))
    return 'bounds_error';

  // Off-by-one: expected and actual are numbers that differ by 1
  try {
    const expNum = Number(expected.replace(/"/g, ''));
    const actNum = Number(actual.replace(/"/g, ''));
    if (!isNaN(expNum) && !isNaN(actNum) && Math.abs(expNum - actNum) === 1)
      return 'off_by_one';
  } catch (_) { /* ignore */ }

  // Wrong return type: actual is null/undefined but expected isn't
  if ((actual === 'null' || actual === '"null"' || actual === 'undefined' || actual === '"none"') &&
      expected !== 'null' && expected !== '"null"')
    return 'wrong_return';

  // Generic logic error for Wrong Answer
  if (status.includes('wrong')) return 'logic_error';

  // Runtime errors that don't match specific patterns
  if (status.includes('runtime')) return 'logic_error';

  return 'logic_error';
}

/**
 * Analyze all failed submissions and return error pattern summary.
 *
 * @param {Array} submissions — raw submission rows with fail_cases JSONB
 * @returns {Object} keyed by error category
 */
export function analyzeErrorPatterns(submissions) {
  const categories = {};
  const failedSubs = submissions.filter((s) => s.status !== 'Accepted');

  for (const sub of failedSubs) {
    const cat = classifySubmissionError(sub);
    if (!cat) continue;

    if (!categories[cat]) {
      categories[cat] = {
        ...ERROR_CATEGORIES[cat],
        count: 0,
        frequency: 0,
        recent_problems: [],
      };
    }
    categories[cat].count++;
    // Track most recent 3 problem IDs for context
    if (categories[cat].recent_problems.length < 3 &&
        !categories[cat].recent_problems.includes(sub.problem_id)) {
      categories[cat].recent_problems.push(sub.problem_id);
    }
  }

  // Compute frequency (relative to total failures)
  const totalFailed = failedSubs.length || 1;
  for (const cat of Object.values(categories)) {
    cat.frequency = Math.round((cat.count / totalFailed) * 100) / 100;
  }

  // Sort by count descending
  const sorted = Object.entries(categories)
    .sort(([, a], [, b]) => b.count - a.count)
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

  return {
    patterns: sorted,
    total_failures: failedSubs.length,
    total_submissions: submissions.length,
    dominant_error: Object.keys(sorted)[0] || null,
  };
}


// ─────────────────────────────────────────────────────────────────────────
// 2. ADAPTIVE WEIGHT CALCULATOR
// ─────────────────────────────────────────────────────────────────────────

/**
 * Dynamically adjust mastery scoring weights based on user's error profile.
 *
 * Default weights: correctness=0.4, efficiency=0.3, speed=0.2, volume=0.1
 *
 * Adjustments:
 * - High wrong-answer rate → increase correctness weight
 * - High TLE rate → increase efficiency weight
 * - Slow but correct → increase speed weight
 *
 * @param {Object} errorProfile — output of analyzeErrorPatterns
 * @returns {{ correctness: number, efficiency: number, speed: number, volume: number }}
 */
export function computeAdaptiveWeights(errorProfile) {
  let correctness = 0.4;
  let efficiency = 0.3;
  let speed = 0.2;
  let volume = 0.1;

  if (!errorProfile || errorProfile.total_submissions === 0) {
    return { correctness, efficiency, speed, volume };
  }

  const patterns = errorProfile.patterns || {};
  const tleFreq = patterns.tle?.frequency || 0;
  const wrongFreq = (patterns.logic_error?.frequency || 0) +
                    (patterns.off_by_one?.frequency || 0) +
                    (patterns.wrong_return?.frequency || 0);

  // User gets TLE frequently → increase efficiency weight
  if (tleFreq > 0.3) {
    efficiency += 0.1;
    correctness -= 0.05;
    speed -= 0.05;
  }

  // User gets wrong answers frequently → increase correctness weight
  if (wrongFreq > 0.5) {
    correctness += 0.1;
    efficiency -= 0.05;
    speed -= 0.05;
  }

  // Low failure rate but slow → increase speed weight
  const failureRate = errorProfile.total_failures / (errorProfile.total_submissions || 1);
  if (failureRate < 0.3 && errorProfile.total_submissions > 5) {
    speed += 0.05;
    volume -= 0.05;
  }

  // Normalize to sum to 1.0
  const total = correctness + efficiency + speed + volume;
  return {
    correctness: Math.round((correctness / total) * 100) / 100,
    efficiency:  Math.round((efficiency / total) * 100) / 100,
    speed:       Math.round((speed / total) * 100) / 100,
    volume:      Math.round((volume / total) * 100) / 100,
  };
}


// ─────────────────────────────────────────────────────────────────────────
// 3. USER PROFILE BUILDER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build a comprehensive user intelligence profile.
 *
 * @param {Array}  patternStats — from getUserPatternStatsDetailed
 * @param {Object} errorProfile — from analyzeErrorPatterns
 * @param {Array}  submissions  — raw submission rows
 */
export function buildUserProfile(patternStats, errorProfile, submissions) {
  // Strengths & weaknesses from pattern stats
  const scored = patternStats.map((s) => {
    const attempted = Number(s.problems_attempted || 0);
    const solved = Number(s.problems_solved || 0);
    const rate = attempted > 0 ? solved / attempted : 0;
    return { name: s.pattern_name, slug: s.pattern_slug, topic: s.topic_name, rate, attempted, solved };
  });

  const strengths = scored
    .filter((s) => s.rate >= 0.7 && s.solved >= 2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map((s) => s.name);

  const weaknesses = scored
    .filter((s) => s.attempted >= 2 && s.rate < 0.4)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5)
    .map((s) => s.name);

  // Learning speed: based on avg attempts per solve across all patterns
  const avgAttemptsAll = patternStats.reduce((sum, s) => {
    const a = Number(s.avg_attempts_per_solve || 0);
    return sum + (a > 0 ? a : 0);
  }, 0) / (patternStats.length || 1);

  let learningSpeed = 'moderate';
  if (avgAttemptsAll > 0 && avgAttemptsAll <= 1.5) learningSpeed = 'fast';
  else if (avgAttemptsAll > 3) learningSpeed = 'slow';

  // Consistency: based on active days (unique days with submissions)
  const activeDays = new Set();
  let latestDate = null;
  let earliestDate = null;
  for (const sub of submissions) {
    const day = new Date(sub.created_at).toISOString().slice(0, 10);
    activeDays.add(day);
    const dt = new Date(sub.created_at);
    if (!latestDate || dt > latestDate) latestDate = dt;
    if (!earliestDate || dt < earliestDate) earliestDate = dt;
  }

  const totalDays = activeDays.size;
  const spanDays = latestDate && earliestDate
    ? Math.max(1, Math.ceil((latestDate - earliestDate) / 86400000))
    : 1;
  const dayRatio = totalDays / spanDays;

  let consistency = 'sporadic';
  if (dayRatio >= 0.7) consistency = 'daily';
  else if (dayRatio >= 0.3) consistency = 'regular';

  // Streak calculation (current + best)
  const sortedDays = [...activeDays].sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) { streak++; }
    else { streak = 1; }
    if (streak > bestStreak) bestStreak = streak;
  }

  // Current streak: count backwards from today
  currentStreak = sortedDays.includes(today) ? 1 : 0;
  if (currentStreak > 0) {
    for (let i = sortedDays.indexOf(today) - 1; i >= 0; i--) {
      const prev = new Date(sortedDays[i]);
      const curr = new Date(sortedDays[i + 1]);
      if (Math.round((curr - prev) / 86400000) === 1) currentStreak++;
      else break;
    }
  }
  if (bestStreak < currentStreak) bestStreak = currentStreak;
  if (sortedDays.length === 1) bestStreak = 1;

  // Error tendency
  const errorTendency = errorProfile?.dominant_error
    ? ERROR_CATEGORIES[errorProfile.dominant_error]?.label || null
    : null;

  // Total stats
  const totalSolved = scored.reduce((sum, s) => sum + s.solved, 0);

  return {
    strengths,
    weaknesses,
    learning_speed: learningSpeed,
    consistency,
    error_tendency: errorTendency,
    error_patterns: errorProfile?.patterns || {},
    total_problems_solved: totalSolved,
    total_problems_attempted: scored.reduce((sum, s) => sum + s.attempted, 0),
    total_submissions: submissions.length,
    active_days: totalDays,
    streak_current: currentStreak,
    streak_best: bestStreak,
    patterns_touched: scored.length,
  };
}


// ─────────────────────────────────────────────────────────────────────────
// 4. LEARNING PATH GRAPH
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build a learning path DAG from patterns and their prerequisites.
 *
 * @param {Array}  patterns      — pattern rows with { slug, name, topic_name, prerequisites, order_index }
 * @param {Object} masteryBySlug — map of pattern_slug → { score, level }
 * @returns {{ nodes, edges, next_unlocked, blocked }}
 */
export function buildLearningPath(patterns, masteryBySlug) {
  const nodes = patterns.map((p) => {
    const mastery = masteryBySlug[p.slug] || { score: 0, level: 'not_started' };
    const prereqs = Array.isArray(p.prerequisites) ? p.prerequisites : [];
    return {
      id: p.slug,
      name: p.name,
      topic: p.topic_name || p.topic_slug || '',
      order_index: p.order_index || 0,
      mastery_score: mastery.score,
      mastery_level: mastery.level,
      prerequisites: prereqs,
    };
  });

  // Build edges
  const edges = [];
  for (const node of nodes) {
    for (const prereq of node.prerequisites) {
      edges.push({ from: prereq, to: node.id });
    }
  }

  // Determine unlocked vs blocked
  const next_unlocked = [];
  const blocked = [];

  for (const node of nodes) {
    if (node.mastery_level === 'strong') continue; // already mastered
    if (node.prerequisites.length === 0) {
      // No prereqs — always unlocked
      if (node.mastery_level !== 'strong') next_unlocked.push(node.id);
      continue;
    }

    const allPrereqsMet = node.prerequisites.every((prereqSlug) => {
      const prereqMastery = masteryBySlug[prereqSlug];
      return prereqMastery && (prereqMastery.level === 'strong' || prereqMastery.level === 'improving');
    });

    if (allPrereqsMet) {
      next_unlocked.push(node.id);
    } else {
      blocked.push({ id: node.id, missing: node.prerequisites.filter((ps) => {
        const m = masteryBySlug[ps];
        return !m || (m.level !== 'strong' && m.level !== 'improving');
      })});
    }
  }

  return { nodes, edges, next_unlocked, blocked };
}


// ─────────────────────────────────────────────────────────────────────────
// 5. CONTEXTUAL HINT GENERATOR (RAG-ready interface)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a contextual, personalized hint using:
 *   - problem pattern
 *   - user's error history
 *   - current attempt count
 *   - the specific failed test
 *
 * This function has the same interface an LLM call would use.
 * Replace the body with an API call when ready.
 *
 * @param {Object} context
 * @param {string} context.pattern_name
 * @param {string} context.status — 'Wrong Answer' | 'Runtime Error' | etc.
 * @param {number} context.attempt_number
 * @param {string|null} context.error_tendency — user's dominant error type
 * @param {Array}  context.user_weaknesses — pattern names user is weak in
 * @param {Object|null} context.failed_test — { input, expected, actual, message }
 * @param {string|null} context.problem_title
 * @returns {{ message: string, severity: 'info'|'warning'|'critical', category: string }}
 */
export function generateContextualHint(context) {
  const {
    pattern_name = '',
    status = 'Wrong Answer',
    attempt_number = 1,
    error_tendency = null,
    user_weaknesses = [],
    failed_test = null,
    problem_title = null,
  } = context;

  const statusLower = status.toLowerCase();
  const msg = (failed_test?.message || '').toLowerCase();
  const actual = JSON.stringify(failed_test?.actual ?? '').toLowerCase();
  const expected = JSON.stringify(failed_test?.expected ?? '').toLowerCase();
  const patternLower = pattern_name.toLowerCase();
  const attempt = attempt_number;

  let severity = attempt >= 5 ? 'critical' : attempt >= 3 ? 'warning' : 'info';
  let category = 'general';
  let message = '';

  // ---- TLE ----
  if (statusLower.includes('time limit')) {
    category = 'performance';
    if (patternLower.includes('sliding window')) {
      message = `Your solution exceeds the time limit. For Sliding Window problems, ensure your window operations run in O(1) per step — avoid nested iterations inside the window logic.`;
    } else if (patternLower.includes('binary search')) {
      message = `TLE on a Binary Search problem — verify your search space halves each iteration and your termination condition is correct.`;
    } else if (patternLower.includes('dynamic')) {
      message = `TLE with DP — check if you're using memoization/tabulation correctly. Ensure no redundant recomputation.`;
    } else {
      message = `Time Limit Exceeded. Consider: Is there a more efficient data structure? Can you reduce nested loops? Hash maps and two pointers often help.`;
    }
    if (attempt >= 3) {
      message += ` This is attempt #${attempt} — consider a fundamentally different algorithm.`;
    }
    return { message, severity, category };
  }

  // ---- Runtime errors ----
  if (statusLower.includes('runtime') || statusLower.includes('error')) {
    category = 'runtime';

    // User-specific: if they tend to make this kind of error, give pointed advice
    if (error_tendency === 'Index Out of Bounds' || msg.includes('index') || msg.includes('bounds')) {
      message = attempt >= 3
        ? `You've hit array bounds errors ${attempt} times. Systematic fix: add explicit boundary checks before EVERY array access. Check: empty arrays, single elements, last index.`
        : `Array index out of bounds. Verify your loop boundaries handle edge cases: empty input, arrays of length 1.`;
      category = 'bounds';
    } else if (error_tendency === 'Null Reference' || msg.includes('null') || msg.includes('undefined')) {
      message = attempt >= 3
        ? `Null reference error persists (attempt #${attempt}). Add guards before every node/property access. Ask yourself: "What if this value is null?"`
        : `Null/undefined reference detected. Check that all variables are initialized and handle null inputs gracefully.`;
      category = 'null_ref';
    } else if (msg.includes('stack') || msg.includes('recursion')) {
      message = `Stack overflow — your recursion lacks a proper base case or the input exceeds stack depth. Consider converting to an iterative approach.`;
      category = 'stack';
    } else {
      message = `Runtime error. Add input validation and trace your code with the failing test input manually.`;
    }
    return { message, severity, category };
  }

  // ---- Wrong Answer ----
  category = 'logic';

  // Off-by-one detection
  try {
    const expNum = Number(expected.replace(/"/g, ''));
    const actNum = Number(actual.replace(/"/g, ''));
    if (!isNaN(expNum) && !isNaN(actNum) && Math.abs(expNum - actNum) === 1) {
      message = `Off-by-one error detected! Check: < vs <=, 0-indexed vs 1-indexed, inclusive vs exclusive boundaries.`;
      category = 'off_by_one';
      return { message, severity, category };
    }
  } catch (_) { /* ignore */ }

  // Wrong return type
  if (actual === 'null' || actual === '"null"' || actual === 'undefined') {
    message = `Your function returns null/undefined. Ensure every code path returns a value. Check early returns and default cases.`;
    category = 'wrong_return';
    return { message, severity, category };
  }

  // Pattern-specific hints
  if (attempt >= 5 && pattern_name) {
    message = `Attempt #${attempt} on a ${pattern_name} problem. Step back: what is the core invariant of the ${pattern_name} pattern? What condition must hold at every step?`;
    if (user_weaknesses.includes(pattern_name)) {
      message += ` This is a pattern you're working to improve — consider reviewing the approach before your next attempt.`;
    }
    severity = 'critical';
  } else if (attempt >= 3 && pattern_name) {
    const patternHint =
      patternLower.includes('pointer') ? 'Check pointer movement logic for all edge cases. Do both pointers move correctly?' :
      patternLower.includes('window') ? 'Verify window expansion and contraction conditions. What happens at the boundaries?' :
      patternLower.includes('binary') ? 'Double-check your mid calculation, comparison logic, and search space reduction.' :
      patternLower.includes('dynamic') || patternLower.includes('dp') ? 'Verify your recurrence relation and base cases. Are state transitions correct?' :
      patternLower.includes('graph') || patternLower.includes('bfs') || patternLower.includes('dfs') ? 'Check your visited tracking and neighbor processing. Handle disconnected components.' :
      `Re-examine your ${pattern_name} implementation against the pattern's core logic.`;
    message = `Multiple attempts (${attempt}) — ${patternHint}`;
  } else {
    message = `Wrong answer. Trace through your algorithm with the failing test input step by step.`;
  }

  return { message, severity, category };
}
