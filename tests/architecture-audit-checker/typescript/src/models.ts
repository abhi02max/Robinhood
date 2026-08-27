/**
 * Shared relational data model for the architecture-audit deliverable checker.
 *
 * These TypeScript interfaces mirror the Python track's dataclasses field-for-field.
 * Each language track is required to converge on the same logical schema so that
 * the 17 Correctness Properties produce identical pass/fail results across all
 * seven tracks (Python, TypeScript, JavaScript, Java, Go, Rust, C#).
 *
 * Naming convention: TypeScript uses camelCase per language idiom while the
 * Python track preserves snake_case. Field semantics are identical.
 */

/**
 * One occurrence of a Drift_Prone_Field in the in-scope corpus.
 *
 * Mirrors `audit-report.md` `Reference_Inventory` table rows.
 *
 * `usageKind` is drawn from a closed nine-value set (validated by Property checks,
 * not by this type). When the per-Subsystem expansion cannot disambiguate, the
 * merged-row fallback (AC3.3) sets `subsystem` to the marker `"merged-multiple"`.
 */
export interface ReferenceInventoryRow {
  field: string;
  filePath: string;
  lineNumber: number;
  subsystem: string;
  usageKind: string;
}

/**
 * One Drift_Inventory finding (`D-NNN`).
 *
 * Mirrors `audit-report.md` `Drift_Inventory` table rows.
 *
 * `evidence` is a list of citations, each pinning a workspace-relative file path
 * and a line range (e.g., `"42-58"`). `severity` is drawn from a closed
 * four-value set (`blocker | high | medium | low`). `layersInDrift` lists the
 * adjacent Subsystem pair (per AC4.2 adjacency-only scope).
 */
export interface DriftInventoryRow {
  id: string;
  fieldOrContract: string;
  layersInDrift: string[];
  evidence: Array<{ filePath: string; lineRange: string }>;
  severity: string;
  rationale: string;
  recommendedAction: string;
}

/**
 * One Ownership_Map row.
 *
 * Mirrors `audit-report.md` `Ownership_Map` table rows. `kind` is drawn from a
 * closed eight-value set. `consumerSubsystems` is the list of Subsystems that
 * read or transitively depend on the named asset; an empty list flags potential
 * dead code (recorded in `notes`).
 */
export interface OwnershipMapRow {
  name: string;
  kind: string;
  ownerSubsystem: string;
  consumerSubsystems: string[];
  definitionFile: string;
  notes: string;
}

/**
 * One directed edge in the Dependency_Map graph.
 *
 * Mirrors `dependency-map.md` per-edge tabular listing rows. `labels` carries
 * the list of Drift_Prone_Fields or contract names that justify the edge.
 * `cycleId`, when present, points to a `D-NNN` Drift_Inventory finding that
 * records the cycle this edge participates in (per AC7.3 dual-recording).
 */
export interface DependencyEdge {
  source: string;
  target: string;
  labels: string[];
  cycleId?: string;
}

/**
 * One ordered Migration_Plan step (`M-NNN`).
 *
 * Mirrors `migration-plan.md` step blocks. The seven required fields are kept
 * verbatim. `linkedFindings` is the list of `D-NNN` Drift_Inventory ids the
 * step addresses; coverage of every `blocker` and `high` finding is enforced
 * by the property tests, not by this type.
 */
export interface MigrationStep {
  id: string;
  goal: string;
  preconditions: string[];
  actions: string[];
  verification: string[];
  rollback: string;
  linkedFindings: string[];
}

/**
 * One Preservation_Inventory row.
 *
 * Mirrors `preservation-inventory.md` rows. `classification` is drawn from a
 * closed three-value set (`preserve-byte-identical | preserve-with-migration |
 * regenerate-from-source`). `assessmentState` (per AC10.4) is drawn from
 * `{unassessed, assessed}` and gates the conditional minimum-classification
 * rule for Real_Problems_Dataset and Learning_JSON files.
 */
export interface PreservationRow {
  path: string;
  classification: string;
  assessmentState: string;
  rationale: string;
  linkedFindings: string[];
}

/**
 * Raw Markdown payload of all six deliverables, keyed by deliverable name.
 *
 * Produced by {@link import("./loader.ts").loadDeliverables}. Each field is the
 * UTF-8 contents of the corresponding `.kiro/specs/architecture-audit/*.md`
 * file, or the empty string when the file is missing (loader is tolerant of
 * missing files so harness can run against partial deliverable sets).
 */
export interface Deliverables {
  auditReport: string;
  dependencyMap: string;
  migrationPlan: string;
  compatibilityStrategy: string;
  preservationInventory: string;
  rebuildRecommendations: string;
}
