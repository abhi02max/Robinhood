/**
 * Deliverable loader for the architecture-audit checker harness (JavaScript track).
 *
 * Reads the six Markdown deliverables under `.kiro/specs/architecture-audit/`
 * into a {@link Deliverables} object. Missing files are tolerated and surface
 * as empty strings so downstream property tests can attribute the failure to a
 * specific deliverable instead of crashing on the load step.
 *
 * Pure ESM, no transpile step.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { makeDeliverables } from "./models.js";

/**
 * Closed map from logical deliverable name to its file basename. Mirrors
 * design.md §"Deliverable file locations (closed set)".
 *
 * @type {Readonly<Record<keyof import("./models.js").Deliverables, string>>}
 */
export const DELIVERABLE_FILENAMES = Object.freeze({
  audit_report: "audit-report.md",
  dependency_map: "dependency-map.md",
  migration_plan: "migration-plan.md",
  compatibility_strategy: "compatibility-strategy.md",
  preservation_inventory: "preservation-inventory.md",
  rebuild_recommendations: "rebuild-recommendations.md",
});

/**
 * Load all six deliverables from a spec directory.
 *
 * @param {string} specDir
 *   Absolute or workspace-relative path to the directory holding the six
 *   audit deliverables. Typically `.kiro/specs/architecture-audit/`.
 * @returns {Promise<import("./models.js").Deliverables>}
 *   A populated Deliverables object. Missing files yield empty strings rather
 *   than throwing, so the caller can decide whether absence is a property
 *   failure or expected for the test scenario.
 */
export async function loadDeliverables(specDir) {
  /** @type {import("./models.js").Deliverables} */
  const deliverables = makeDeliverables();

  await Promise.all(
    Object.entries(DELIVERABLE_FILENAMES).map(async ([key, filename]) => {
      const fullPath = path.join(specDir, filename);
      try {
        const content = await readFile(fullPath, "utf8");
        // @ts-ignore — key is statically one of the Deliverables fields
        deliverables[key] = content;
      } catch (err) {
        if (err && /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
          // Tolerate missing deliverables; the parser layer surfaces this as
          // an empty document and the property tests can fail with a precise
          // attribution.
          // @ts-ignore — key is statically one of the Deliverables fields
          deliverables[key] = "";
          return;
        }
        throw err;
      }
    }),
  );

  return deliverables;
}
