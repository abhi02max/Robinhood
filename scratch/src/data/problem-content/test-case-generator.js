// ============================================
// ROBINHOOD — Deterministic Test Case Generator
// Produces 50+ hidden test cases per problem
// based on constraint specifications
// ============================================

// Seedable PRNG (Mulberry32) for deterministic output
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(problemId) {
  let hash = 0;
  for (let i = 0; i < problemId.length; i++) {
    hash = ((hash << 5) - hash + problemId.charCodeAt(i)) | 0;
  }
  return mulberry32(Math.abs(hash) || 42);
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randArray(rng, len, minVal, maxVal) {
  return Array.from({ length: len }, () => randInt(rng, minVal, maxVal));
}

function randString(rng, len, charset = 'abcdefghijklmnopqrstuvwxyz') {
  return Array.from({ length: len }, () => charset[randInt(rng, 0, charset.length - 1)]).join('');
}

function randSortedArray(rng, len, minVal, maxVal) {
  return randArray(rng, len, minVal, maxVal).sort((a, b) => a - b);
}

function randMatrix(rng, rows, cols, minVal, maxVal) {
  return Array.from({ length: rows }, () => randArray(rng, cols, minVal, maxVal));
}

function randBinaryTree(rng, size) {
  if (size <= 0) return [];
  const arr = [randInt(rng, -100, 100)];
  for (let i = 1; i < size; i++) {
    arr.push(rng() > 0.2 ? randInt(rng, -100, 100) : null);
  }
  return arr;
}

function randLinkedList(rng, size, minVal, maxVal) {
  return randArray(rng, size, minVal, maxVal);
}

function randGraph(rng, nodes, edgeCount) {
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < edgeCount && edges.length < edgeCount; i++) {
    const u = randInt(rng, 0, nodes - 1);
    const v = randInt(rng, 0, nodes - 1);
    const key = `${Math.min(u,v)}-${Math.max(u,v)}`;
    if (u !== v && !seen.has(key)) { seen.add(key); edges.push([u, v]); }
  }
  return { nodes, edges };
}

// ==================== CATEGORY GENERATORS ====================

const GENERATORS = {
  // --- ARRAY PROBLEMS ---
  twoSum(rng, size) {
    const nums = randArray(rng, size, -1e4, 1e4);
    const i = randInt(rng, 0, size - 2);
    const j = randInt(rng, i + 1, size - 1);
    const target = nums[i] + nums[j];
    return { input: { nums, target }, note: `Array of size ${size}` };
  },
  genericArray(rng, size) {
    return { input: { nums: randArray(rng, size, -1e5, 1e5) }, note: `Random array size ${size}` };
  },
  sortedArray(rng, size) {
    return { input: { nums: randSortedArray(rng, size, -1e4, 1e4) }, note: `Sorted array size ${size}` };
  },
  matrixProblem(rng, size) {
    const rows = Math.max(1, Math.floor(Math.sqrt(size)));
    return { input: { matrix: randMatrix(rng, rows, rows, 0, 100) }, note: `${rows}x${rows} matrix` };
  },
  
  // --- STRING PROBLEMS ---
  stringProblem(rng, size) {
    return { input: { s: randString(rng, size) }, note: `String length ${size}` };
  },
  twoStrings(rng, size) {
    return { input: { s: randString(rng, size), t: randString(rng, size) }, note: `Two strings length ${size}` };
  },
  substringProblem(rng, size) {
    const s = randString(rng, size);
    const k = randInt(rng, 1, Math.min(26, size));
    return { input: { s, k }, note: `String length ${size}, k=${k}` };
  },

  // --- LINKED LIST ---
  linkedList(rng, size) {
    return { input: { head: randLinkedList(rng, size, -1000, 1000) }, note: `List size ${size}` };
  },
  twoLinkedLists(rng, size) {
    return { input: { l1: randLinkedList(rng, size, 0, 9), l2: randLinkedList(rng, Math.max(1, size - 2), 0, 9) }, note: `Two lists` };
  },

  // --- TREE ---
  treeProblem(rng, size) {
    return { input: { root: randBinaryTree(rng, size) }, note: `Tree size ${size}` };
  },
  bstProblem(rng, size) {
    const vals = randSortedArray(rng, size, -1000, 1000);
    return { input: { root: vals }, note: `BST with ${size} nodes` };
  },

  // --- GRAPH ---
  graphProblem(rng, size) {
    const nodes = Math.max(2, size);
    const edges = Math.min(nodes * 2, nodes * (nodes - 1) / 2);
    return { input: randGraph(rng, nodes, edges), note: `Graph ${nodes} nodes` };
  },

  // --- DP ---
  dpArray(rng, size) {
    return { input: { nums: randArray(rng, size, -100, 100) }, note: `DP array size ${size}` };
  },
  dpGrid(rng, size) {
    const rows = Math.max(1, Math.floor(Math.sqrt(size)));
    return { input: { grid: randMatrix(rng, rows, rows, 0, 1) }, note: `${rows}x${rows} grid` };
  },
  knapsack(rng, size) {
    const weights = randArray(rng, size, 1, 50);
    const values = randArray(rng, size, 1, 100);
    const capacity = randInt(rng, size, size * 25);
    return { input: { weights, values, capacity }, note: `${size} items, cap=${capacity}` };
  },

  // --- INTERVAL ---
  intervals(rng, size) {
    const intervals = [];
    for (let i = 0; i < size; i++) {
      const s = randInt(rng, 0, 1000);
      intervals.push([s, s + randInt(rng, 1, 100)]);
    }
    return { input: { intervals }, note: `${size} intervals` };
  },

  // --- GENERIC FALLBACK ---
  generic(rng, size) {
    return { input: { data: randArray(rng, size, -1e4, 1e4) }, note: `Input size ${size}` };
  },
};

// ==================== MAIN GENERATOR ====================

const SIZE_TIERS = [
  // Edge cases
  { size: 1, count: 2 },
  { size: 2, count: 3 },
  // Small
  { size: 5, count: 5 },
  { size: 10, count: 5 },
  // Medium
  { size: 50, count: 8 },
  { size: 100, count: 8 },
  // Large
  { size: 500, count: 8 },
  { size: 1000, count: 6 },
  // Stress
  { size: 5000, count: 5 },
  { size: 10000, count: 5 },
];

export function generateHiddenTests(problemId, generatorKey = 'generic', constraints = {}) {
  const rng = seededRng(problemId);
  const gen = GENERATORS[generatorKey] || GENERATORS.generic;
  const tests = [];

  for (const tier of SIZE_TIERS) {
    const maxSize = constraints.maxLen || 10000;
    const effectiveSize = Math.min(tier.size, maxSize);
    for (let i = 0; i < tier.count; i++) {
      try {
        const tc = gen(rng, effectiveSize);
        tests.push({
          id: `hidden-${tests.length + 1}`,
          ...tc,
          hidden: true,
        });
      } catch (e) {
        // Skip failed generations
      }
    }
  }

  return tests;
}

export function getHiddenTestCount(problemId, generatorKey = 'generic') {
  return generateHiddenTests(problemId, generatorKey).length;
}

export { GENERATORS };
