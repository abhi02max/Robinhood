// ============================================
// ROBINHOOD — Problem Content Registry Aggregator
// Merges all category content into a single lookup
// ============================================
import { arraysContent } from './arrays.js';
import { twoPointerContent } from './two-pointers.js';
import { slidingWindowContent } from './sliding-window.js';
import { stackContent } from './stack.js';
import { linkedListContent } from './linked-list.js';
import { treesContent } from './trees.js';
import { dpContent } from './dp.js';
import { graphsContent } from './graphs.js';
import { binarySearchContent } from './binary-search.js';
import { heapContent } from './heap.js';
import { backtrackingContent } from './backtracking.js';
import { stringsContent } from './strings.js';
import { bstContent } from './bst.js';
import { matrixContent } from './matrix.js';
import { sortingContent } from './sorting.js';

// All content maps merged — keyed by problem ID
export const PROBLEM_CONTENT = {
  ...arraysContent,
  ...twoPointerContent,
  ...slidingWindowContent,
  ...stackContent,
  ...linkedListContent,
  ...treesContent,
  ...dpContent,
  ...graphsContent,
  ...binarySearchContent,
  ...heapContent,
  ...backtrackingContent,
  ...stringsContent,
  ...bstContent,
  ...matrixContent,
  ...sortingContent,
};

/**
 * Get rich content for a problem by ID.
 * Returns null if no content exists (falls back to generated stubs).
 */
export function getProblemContent(problemId) {
  if (!problemId) return null;
  return PROBLEM_CONTENT[problemId] || null;
}

/**
 * Check if a problem has production content.
 */
export function hasProductionContent(problemId) {
  return Boolean(PROBLEM_CONTENT[problemId]);
}

/**
 * Get all problem IDs that have production content.
 */
export function getEnrichedProblemIds() {
  return Object.keys(PROBLEM_CONTENT);
}

/**
 * Get coverage statistics.
 */
export function getContentCoverage(totalProblems = 455) {
  const enriched = Object.keys(PROBLEM_CONTENT).length;
  return {
    enriched,
    total: totalProblems,
    percentage: Math.round((enriched / totalProblems) * 100),
    categories: {
      arrays: Object.keys(arraysContent).length,
      twoPointers: Object.keys(twoPointerContent).length,
      slidingWindow: Object.keys(slidingWindowContent).length,
      stack: Object.keys(stackContent).length,
      linkedList: Object.keys(linkedListContent).length,
      trees: Object.keys(treesContent).length,
      dp: Object.keys(dpContent).length,
      graphs: Object.keys(graphsContent).length,
      binarySearch: Object.keys(binarySearchContent).length,
      heap: Object.keys(heapContent).length,
      backtracking: Object.keys(backtrackingContent).length,
      strings: Object.keys(stringsContent).length,
      bst: Object.keys(bstContent).length,
      matrix: Object.keys(matrixContent).length,
      sorting: Object.keys(sortingContent).length,
    },
  };
}

export default PROBLEM_CONTENT;
