/**
 * Concept Questions Enrichment Layer
 * Maps question IDs from curriculum-registry.json to expected key points for the Session Engine.
 */

export const CONCEPT_QUESTIONS_REGISTRY = {
  // OS Process vs Thread examples
  "cq-os-1001": {
    difficulty: "easy",
    keyPoints: [
      "Process provides strong isolation (crash boundaries)",
      "Threads share memory space, making context switching cheaper",
      "Process consumes more memory overhead per instance"
    ]
  },
  "cq-os-1002": {
    difficulty: "medium",
    keyPoints: [
      "Use one process per tab for crash isolation (if one tab crashes, others survive)",
      "Use threads within the tab for rendering, JS execution, and network fetching",
      "Inter-process communication (IPC) is required between tabs and the browser core"
    ]
  },
  "cq-os-1003": {
    difficulty: "hard",
    keyPoints: [
      "Identify the shared state causing the cascading failure",
      "Separate critical components into isolated processes",
      "Implement a watchdog process to monitor and restart failed worker threads/processes safely"
    ]
  }
};

/**
 * Retrieves the enriched data for a conceptual question.
 * Generates a generic fallback if the ID is not explicitly mapped.
 */
export function getConceptQuestionDetails(id, prompt) {
  if (CONCEPT_QUESTIONS_REGISTRY[id]) {
    return CONCEPT_QUESTIONS_REGISTRY[id];
  }

  // Fallback for unmapped questions to ensure the engine always runs
  return {
    difficulty: "medium",
    keyPoints: [
      "Clearly define the core concept and its primary purpose.",
      "Identify the main trade-offs (e.g., performance vs memory).",
      "Provide a practical scenario where this applies."
    ]
  };
}
