/**
 * Code Analysis Engine — Phase 7
 * Pure functions: regex-based pattern detection, complexity estimation,
 * reasoning failure detection, intelligent feedback generation.
 * No DB, no I/O — LLM-ready interface.
 */

// ─── Language-aware regex patterns ───

const LOOP_PATTERNS = {
  javascript: /\b(for|while)\s*\(/g,
  python: /\b(for|while)\b/g,
  cpp: /\b(for|while)\s*\(/g,
  java: /\b(for|while)\s*\(/g,
};
const RECURSION_PATTERNS = {
  javascript: /function\s+(\w+)[^]*?\b\1\s*\(/,
  python: /def\s+(\w+)[^]*?\b\1\s*\(/,
  cpp: /\b(\w+)\s*\([^)]*\)\s*\{[^]*?\b\1\s*\(/,
  java: /\b(\w+)\s*\([^)]*\)\s*\{[^]*?\b\1\s*\(/,
};
const MEMO_PATTERNS = {
  javascript: /\b(memo|cache|dp|Map|Object\.create|new\s+Map)\b/i,
  python: /\b(memo|cache|dp|lru_cache|functools|defaultdict|\{\})\b/i,
  cpp: /\b(memo|cache|dp|unordered_map|map<|vector<vector)\b/i,
  java: /\b(memo|cache|dp|HashMap|Map<)\b/i,
};
const VISITED_PATTERNS = {
  javascript: /\b(visited|seen|Set|new\s+Set)\b/i,
  python: /\b(visited|seen|set\(\))\b/i,
  cpp: /\b(visited|seen|unordered_set|set<)\b/i,
  java: /\b(visited|seen|HashSet|Set<)\b/i,
};
const HASHMAP_PATTERNS = {
  javascript: /\b(Map|Object|new\s+Map|\{\})\b/,
  python: /\b(dict|defaultdict|\{\}|Counter)\b/i,
  cpp: /\b(unordered_map|map<)\b/i,
  java: /\b(HashMap|Map<|TreeMap)\b/i,
};
const SORT_PATTERNS = {
  javascript: /\.sort\s*\(/,
  python: /\b(sorted|\.sort)\s*\(/,
  cpp: /\b(sort|stable_sort)\s*\(/,
  java: /\b(Arrays\.sort|Collections\.sort|\.sort)\s*\(/,
};

function countLoops(code, lang) {
  const pat = LOOP_PATTERNS[lang] || LOOP_PATTERNS.javascript;
  return (code.match(pat) || []).length;
}

function hasNestedLoops(code, lang) {
  const lines = code.split('\n');
  let depth = 0; let maxDepth = 0;
  const loopKw = lang === 'python' ? /^\s*(for|while)\b/ : /\b(for|while)\s*\(/;
  const openBrace = /\{/g; const closeBrace = /\}/g;
  if (lang === 'python') {
    let indents = [];
    for (const line of lines) {
      if (/^\s*$/.test(line)) continue;
      const indent = line.match(/^(\s*)/)[1].length;
      if (loopKw.test(line)) {
        while (indents.length > 0 && indents[indents.length - 1] >= indent) indents.pop();
        indents.push(indent);
        if (indents.length > maxDepth) maxDepth = indents.length;
      }
    }
  } else {
    for (const line of lines) {
      if (loopKw.test(line)) { depth++; if (depth > maxDepth) maxDepth = depth; }
      const opens = (line.match(openBrace) || []).length;
      const closes = (line.match(closeBrace) || []).length;
      depth = Math.max(0, depth - closes + (opens > 0 && !loopKw.test(line) ? 0 : 0));
      if (closes > 0 && depth > 0) depth = Math.max(0, depth - 1);
    }
  }
  return maxDepth >= 2;
}

function hasRecursion(code, lang) {
  const pat = RECURSION_PATTERNS[lang] || RECURSION_PATTERNS.javascript;
  return pat.test(code);
}
function hasMemoization(code, lang) {
  return (MEMO_PATTERNS[lang] || MEMO_PATTERNS.javascript).test(code);
}
function hasVisitedSet(code, lang) {
  return (VISITED_PATTERNS[lang] || VISITED_PATTERNS.javascript).test(code);
}
function hasHashMap(code, lang) {
  return (HASHMAP_PATTERNS[lang] || HASHMAP_PATTERNS.javascript).test(code);
}
function hasSorting(code, lang) {
  return (SORT_PATTERNS[lang] || SORT_PATTERNS.javascript).test(code);
}
function lineCount(code) { return code.split('\n').filter(l => l.trim().length > 0).length; }

// ─── 1. Code Pattern Detection ───

export function detectCodePatterns(code, language) {
  const lang = (language || 'javascript').toLowerCase();
  return {
    loop_count: countLoops(code, lang),
    has_nested_loops: hasNestedLoops(code, lang),
    has_recursion: hasRecursion(code, lang),
    has_memoization: hasMemoization(code, lang),
    has_visited_set: hasVisitedSet(code, lang),
    has_hash_map: hasHashMap(code, lang),
    has_sorting: hasSorting(code, lang),
    line_count: lineCount(code),
  };
}

// ─── 2. Complexity Estimation ───

const COMPLEXITY_RANK = { 'O(1)': 0, 'O(log n)': 1, 'O(n)': 2, 'O(n log n)': 3, 'O(n²)': 4, 'O(n^2)': 4, 'O(n³)': 5, 'O(n^3)': 5, 'O(2^n)': 6, 'O(2ⁿ)': 6, 'O(n!)': 7 };

function normalizeComplexity(c) {
  if (!c) return null;
  const s = c.trim().replace(/\s+/g, ' ');
  if (/n\s*!/.test(s)) return 'O(n!)';
  if (/2\s*[\^ⁿ]\s*n/i.test(s)) return 'O(2^n)';
  if (/n\s*[\^²³]\s*3|n\s*\*\s*n\s*\*\s*n/i.test(s)) return 'O(n³)';
  if (/n\s*[\^²]\s*2|n\s*\*\s*n/i.test(s)) return 'O(n²)';
  if (/n\s*log/i.test(s)) return 'O(n log n)';
  if (/log/i.test(s)) return 'O(log n)';
  if (/\bn\b/i.test(s)) return 'O(n)';
  if (/1/.test(s)) return 'O(1)';
  return s;
}

export function estimateComplexity(patterns, patternName) {
  const pn = (patternName || '').toLowerCase();
  let estimated = 'O(n)';

  if (patterns.has_recursion && !patterns.has_memoization) {
    estimated = 'O(2^n)';
  } else if (patterns.has_nested_loops) {
    estimated = patterns.loop_count >= 3 ? 'O(n³)' : 'O(n²)';
  } else if (patterns.has_sorting) {
    estimated = 'O(n log n)';
  } else if (patterns.has_recursion && patterns.has_memoization) {
    estimated = pn.includes('dynamic') || pn.includes('dp') ? 'O(n²)' : 'O(n)';
  } else if (patterns.has_hash_map && patterns.loop_count <= 1) {
    estimated = 'O(n)';
  } else if (patterns.loop_count === 0) {
    estimated = 'O(1)';
  }

  let space = 'O(1)';
  if (patterns.has_memoization || patterns.has_hash_map || patterns.has_visited_set) space = 'O(n)';
  if (patterns.has_recursion && !patterns.has_memoization) space = 'O(n)';

  return { time: estimated, space };
}

export function compareComplexity(estimated, expected) {
  const normEst = normalizeComplexity(estimated);
  const normExp = normalizeComplexity(expected);
  if (!normEst || !normExp) return { match: 'unknown', delta: 0 };
  const estRank = COMPLEXITY_RANK[normEst] ?? 3;
  const expRank = COMPLEXITY_RANK[normExp] ?? 3;
  const delta = estRank - expRank;
  return {
    estimated: normEst, expected: normExp,
    match: delta === 0 ? 'optimal' : delta > 0 ? 'suboptimal' : 'better',
    delta,
  };
}

// ─── 3. Reasoning Failure Detection ───

export function detectReasoningFailures(patterns, patternName, status) {
  const pn = (patternName || '').toLowerCase();
  const failures = [];

  if (patterns.has_nested_loops && (pn.includes('sliding window') || pn.includes('two pointer')))
    failures.push({ type: 'brute_force', message: 'Nested loops detected on a problem solvable with a linear technique.', severity: 'warning' });

  if (patterns.has_recursion && !patterns.has_memoization && (pn.includes('dynamic') || pn.includes('dp')))
    failures.push({ type: 'missing_memo', message: 'Recursion without memoization on a DP problem. Add caching to avoid recomputation.', severity: 'critical' });

  if ((pn.includes('graph') || pn.includes('bfs') || pn.includes('dfs')) && !patterns.has_visited_set)
    failures.push({ type: 'missing_visited', message: 'Graph traversal without a visited set. This may cause infinite loops or TLE.', severity: 'critical' });

  if (pn.includes('hash') && !patterns.has_hash_map && patterns.has_nested_loops)
    failures.push({ type: 'missing_hashmap', message: 'Nested loops instead of hash map lookup. Use a Map/dict for O(1) lookups.', severity: 'warning' });

  if ((status || '').toLowerCase().includes('time limit') && patterns.has_nested_loops)
    failures.push({ type: 'tle_nested', message: 'TLE with nested loops. Reduce to single-pass with appropriate data structure.', severity: 'critical' });

  if (patterns.has_sorting && (pn.includes('hash') || pn.includes('two pointer')))
    failures.push({ type: 'unnecessary_sort', message: 'Sorting may be unnecessary. A hash-based or pointer approach can be O(n).', severity: 'info' });

  return failures;
}

// ─── 4. Intelligent Feedback ───

export function generateCodeFeedback(analysis) {
  const { patterns, complexity, comparison, failures, status } = analysis;
  const feedback = [];

  if (comparison?.match === 'suboptimal') {
    const diff = comparison.delta;
    feedback.push({
      type: 'complexity', severity: diff >= 2 ? 'critical' : 'warning',
      message: `Your solution is ${comparison.estimated} but optimal is ${comparison.expected}. ${diff >= 2 ? 'Consider a fundamentally different approach.' : 'Look for ways to eliminate redundant iterations.'}`,
    });
  } else if (comparison?.match === 'optimal' && (status || '').toLowerCase() === 'accepted') {
    feedback.push({ type: 'optimal', severity: 'success', message: `Optimal complexity achieved (${comparison.estimated}). Clean solution!` });
  }

  for (const f of failures) {
    feedback.push({ type: f.type, severity: f.severity, message: f.message });
  }

  if (patterns.line_count > 80)
    feedback.push({ type: 'verbose', severity: 'info', message: 'Your solution is quite long. Consider refactoring for clarity.' });

  if (patterns.has_recursion && patterns.has_memoization && (status || '').toLowerCase() === 'accepted')
    feedback.push({ type: 'good_pattern', severity: 'success', message: 'Good use of memoization with recursion!' });

  if (patterns.has_hash_map && !patterns.has_nested_loops && (status || '').toLowerCase() === 'accepted')
    feedback.push({ type: 'good_pattern', severity: 'success', message: 'Efficient hash map usage — keeps lookup O(1).' });

  return feedback;
}

// ─── 5. Performance Signals ───

export function computePerformanceSignals(submissions) {
  if (!submissions || submissions.length === 0) return { independent_solve_rate: 0, optimization_skill: 0, debug_recovery_speed: 0, total_analyzed: 0 };

  let firstAttemptSolves = 0; let totalProblems = 0;
  let optimalCount = 0; let totalWithComplexity = 0;
  let recoveries = 0; let recoveryAttempts = 0;

  const byProblem = {};
  for (const s of submissions) {
    const pid = s.problem_id;
    if (!byProblem[pid]) byProblem[pid] = [];
    byProblem[pid].push(s);
  }

  for (const [, subs] of Object.entries(byProblem)) {
    const sorted = [...subs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    totalProblems++;
    if (sorted[0].status === 'Accepted') firstAttemptSolves++;
    const solved = sorted.some(s => s.status === 'Accepted');
    if (solved && sorted.length > 1) {
      const failedBefore = sorted.findIndex(s => s.status === 'Accepted');
      if (failedBefore > 0) { recoveries++; recoveryAttempts += failedBefore; }
    }
  }

  return {
    independent_solve_rate: totalProblems > 0 ? Math.round((firstAttemptSolves / totalProblems) * 100) / 100 : 0,
    optimization_skill: totalWithComplexity > 0 ? Math.round((optimalCount / totalWithComplexity) * 100) / 100 : 0,
    debug_recovery_speed: recoveries > 0 ? Math.round((recoveries / (recoveryAttempts || 1)) * 100) / 100 : 0,
    total_analyzed: totalProblems,
    first_attempt_solves: firstAttemptSolves,
    total_recoveries: recoveries,
  };
}

// ─── Main analysis orchestrator ───

export function analyzeSubmittedCode({ code, language, patternName, status, expectedTimeComplexity, expectedSpaceComplexity }) {
  const patterns = detectCodePatterns(code, language);
  const complexity = estimateComplexity(patterns, patternName);
  const timeComparison = compareComplexity(complexity.time, expectedTimeComplexity);
  const spaceComparison = compareComplexity(complexity.space, expectedSpaceComplexity);
  const failures = detectReasoningFailures(patterns, patternName, status);
  const analysis = { patterns, complexity, comparison: timeComparison, space_comparison: spaceComparison, failures, status };
  const feedback = generateCodeFeedback(analysis);
  return { patterns, complexity, time_comparison: timeComparison, space_comparison: spaceComparison, reasoning_failures: failures, feedback };
}
