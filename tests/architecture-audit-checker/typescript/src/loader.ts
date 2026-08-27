/**
 * Deliverable loader for the architecture-audit deliverable checker.
 *
 * Reads the six Markdown deliverables under
 * `.kiro/specs/architecture-audit/` and returns their raw contents. Missing
 * files are tolerated and surfaced as empty strings so the harness can run
 * over partially-authored deliverable sets and still report which properties
 * fail because the underlying file is absent.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Deliverables } from "./models.js";

/**
 * Mapping from {@link Deliverables} field name to the on-disk Markdown file
 * name. Kept in lockstep with the Python track's loader so both tracks load
 * exactly the same six files in the same order.
 */
export const DELIVERABLE_FILES: ReadonlyArray<{
  key: keyof Deliverables;
  fileName: string;
}> = [
  { key: "auditReport", fileName: "audit-report.md" },
  { key: "dependencyMap", fileName: "dependency-map.md" },
  { key: "migrationPlan", fileName: "migration-plan.md" },
  { key: "compatibilityStrategy", fileName: "compatibility-strategy.md" },
  { key: "preservationInventory", fileName: "preservation-inventory.md" },
  { key: "rebuildRecommendations", fileName: "rebuild-recommendations.md" },
];

/**
 * Read one Markdown file, returning the empty string when the file does not
 * exist. Any other I/O error (permission denied, decoding failure, ...) is
 * propagated to the caller — the harness must distinguish "absent" from
 * "unreadable".
 */
async function readMarkdownFileTolerant(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return "";
    }
    throw err;
  }
}

/**
 * Load all six architecture-audit deliverables from `specDir` and return them
 * as raw Markdown strings.
 *
 * @param specDir Absolute or workspace-relative path to the directory holding
 *   the six deliverable Markdown files (typically
 *   `.kiro/specs/architecture-audit`).
 * @returns A {@link Deliverables} object with one string per deliverable;
 *   missing files appear as the empty string.
 */
export async function loadDeliverables(specDir: string): Promise<Deliverables> {
  const result: Deliverables = {
    auditReport: "",
    dependencyMap: "",
    migrationPlan: "",
    compatibilityStrategy: "",
    preservationInventory: "",
    rebuildRecommendations: "",
  };

  await Promise.all(
    DELIVERABLE_FILES.map(async ({ key, fileName }) => {
      const filePath = join(specDir, fileName);
      result[key] = await readMarkdownFileTolerant(filePath);
    }),
  );

  return result;
}
