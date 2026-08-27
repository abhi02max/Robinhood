/**
 * Shared relational data model for the architecture-audit deliverable checker
 * (JavaScript track).
 *
 * Mirrors the Python and TypeScript tracks. Field names use snake_case so the
 * raw Markdown table headers in `.kiro/specs/architecture-audit/*.md` map
 * 1:1 to row property names across all language tracks. This makes
 * cross-language property tests easier to write and read.
 *
 * The audit's Correctness Properties (design.md §Correctness Properties) are
 * written against six row shapes plus a `Deliverables` aggregate:
 *   - ReferenceInventoryRow
 *   - DriftInventoryRow
 *   - OwnershipMapRow
 *   - DependencyEdge
 *   - MigrationStep
 *   - PreservationRow
 *
 * No runtime type system is used; types are documented via JSDoc `@typedef`
 * blocks. Factory helpers below return plain objects with the same shape so
 * test code has lightweight constructors.
 */

// ---------------------------------------------------------------------------
// Closed-set string constants (mirrored from design.md §Identifier conventions)
// ---------------------------------------------------------------------------

/** @type {readonly string[]} */
export const SUBSYSTEMS = Object.freeze([
  "sql-schema",
  "seed-scripts",
  "validators",
  "typescript-interfaces",
  "execution-engine",
  "learning-engine",
  "api-contracts",
  "frontend-renderer",
  "sql-execution-subsystem",
]);

/** @type {readonly string[]} */
export const USAGE_KINDS = Object.freeze([
  "schema-definition",
  "seed-write",
  "validator-shape",
  "typescript-type",
  "execution-engine-read",
  "api-response-key",
  "frontend-render",
  "test-fixture",
  "documentation",
]);

/** @type {readonly string[]} */
export const OWNERSHIP_KINDS = Object.freeze([
  "column",
  "enum",
  "json-shape",
  "endpoint-request",
  "endpoint-response",
  "event-payload",
  "validator-schema",
  "typescript-interface",
]);

/** @type {readonly string[]} */
export const SEVERITIES = Object.freeze(["blocker", "high", "medium", "low"]);

/** @type {readonly string[]} */
export const PRESERVATION_CLASSIFICATIONS = Object.freeze([
  "preserve-byte-identical",
  "preserve-with-migration",
  "regenerate-from-source",
]);

/** @type {readonly string[]} */
export const ASSESSMENT_STATES = Object.freeze(["unassessed", "assessed"]);

/** @type {readonly string[]} */
export const DEPLOYMENT_TARGETS = Object.freeze([
  "local-dev",
  "docker",
  "cloud-db",
]);

/**
 * Marker value permitted in Reference_Inventory.subsystem when the per-Subsystem
 * expansion fallback fires (design.md §Reference_Inventory — Merged-row fallback,
 * Requirement 3.3).
 */
export const MERGED_SUBSYSTEM_MARKER = "merged-multiple";

// ---------------------------------------------------------------------------
// Row typedefs
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ReferenceInventoryRow
 * @property {string} field
 *   Drift_Prone_Field name (or a newly discovered field documented with a
 *   rationale row).
 * @property {string} file_path
 *   Workspace-relative path resolving at Audit_Baseline.
 * @property {number} line_number
 *   1-indexed line number into the file at Audit_Baseline.
 * @property {string} subsystem
 *   One of SUBSYSTEMS, OR the marker {@link MERGED_SUBSYSTEM_MARKER} when the
 *   merged-row fallback (Requirement 3.3) fires.
 * @property {string} usage_kind
 *   One of USAGE_KINDS.
 */

/**
 * @typedef {Object} EvidenceCitation
 * @property {string} file_path
 *   Workspace-relative path resolving at Audit_Baseline.
 * @property {string} line_range
 *   1-indexed inclusive line range, e.g. "12-37".
 */

/**
 * @typedef {Object} DriftInventoryRow
 * @property {string} id
 *   Format `D-NNN`, zero-padded ordinal beginning at `D-001`.
 * @property {string} field_or_contract
 *   Drift_Prone_Field name, endpoint path, or contract name.
 * @property {string[]} layers_in_drift
 *   At least two Subsystem names from the closed set; pairs MUST be adjacent
 *   in the dependency chain (design.md §C4 Drift Detector — Adjacency-only
 *   scope).
 * @property {EvidenceCitation[]} evidence
 *   At least one citation per Subsystem listed in `layers_in_drift`.
 * @property {string} severity
 *   One of SEVERITIES.
 * @property {string} rationale
 *   References the rubric criterion that justifies the severity; if the drift
 *   originated from the Docker-rebuild incident, states that origin
 *   (Requirement 4.7).
 * @property {string} recommended_action
 *   Short imperative phrase; the actual execution belongs to a Migration_Plan
 *   step.
 */

/**
 * @typedef {Object} OwnershipMapRow
 * @property {string} name
 *   Field name, column name, or endpoint path.
 * @property {string} kind
 *   One of OWNERSHIP_KINDS.
 * @property {string} owner_subsystem
 *   One of SUBSYSTEMS; chosen by the SQL_Schema > Seed_Script >
 *   Validator_Schema > TypeScript_Interface authoritativeness rubric.
 * @property {string[]} consumer_subsystems
 *   Possibly empty; if empty, `notes` MUST flag potential dead code.
 * @property {string} definition_file
 *   Workspace-relative path where the owner Subsystem declares the name.
 * @property {string} notes
 *   Free-form; flags contested ownership and zero-consumer rows.
 */

/**
 * @typedef {Object} DependencyEdge
 * @property {string} from_subsystem
 *   Producer Subsystem (or `Real_Problems_Dataset` / `Learning_JSON` for the
 *   optional data-source nodes).
 * @property {string} to_subsystem
 *   Consumer Subsystem.
 * @property {string[]} labels
 *   Non-empty list of Drift_Prone_Field or contract names.
 * @property {string[]} citations
 *   At least one workspace-relative file path demonstrating the dependency.
 * @property {string|null} cycle_id
 *   `D-NNN` id of the Drift_Inventory row that records this edge as part of a
 *   cycle, or `null` for non-cycle edges.
 */

/**
 * @typedef {Object} MigrationStep
 * @property {string} id
 *   Format `M-NNN`, zero-padded ordinal beginning at `M-001`.
 * @property {string} goal
 *   One sentence stating the desired post-step state.
 * @property {string[]} preconditions
 *   Each entry is a Drift_Inventory id, a previous Migration_Plan step id, or
 *   an environmental precondition stated explicitly.
 * @property {string[]} actions
 *   Documentation-only imperative phrases; the Migration_Plan does not
 *   execute anything (Requirement 8.6).
 * @property {string[]} verification
 *   How to confirm the step succeeded post-execution.
 * @property {string} rollback
 *   No-data-loss reversal action (Requirement 8.4).
 * @property {string[]} linked_findings
 *   Non-empty list of Drift_Inventory ids (Requirement 8.2).
 */

/**
 * @typedef {Object} PreservationRow
 * @property {string} path
 *   Workspace-relative path resolving at Audit_Baseline.
 * @property {string} classification
 *   One of PRESERVATION_CLASSIFICATIONS.
 * @property {string} rationale
 *   Required when classification ≠ `preserve-byte-identical`.
 * @property {string[]} linked_findings
 *   Drift_Inventory ids; required when the asset depends on a
 *   Drift_Prone_Field.
 * @property {string} assessment_state
 *   One of ASSESSMENT_STATES; defaults to `unassessed` (Requirement 10.4).
 */

/**
 * @typedef {Object} Deliverables
 * @property {string} audit_report
 *   Raw Markdown content of `.kiro/specs/architecture-audit/audit-report.md`.
 * @property {string} dependency_map
 *   Raw Markdown content of `dependency-map.md`.
 * @property {string} migration_plan
 *   Raw Markdown content of `migration-plan.md`.
 * @property {string} compatibility_strategy
 *   Raw Markdown content of `compatibility-strategy.md`.
 * @property {string} preservation_inventory
 *   Raw Markdown content of `preservation-inventory.md`.
 * @property {string} rebuild_recommendations
 *   Raw Markdown content of `rebuild-recommendations.md`.
 */

// ---------------------------------------------------------------------------
// Factory helpers
//
// Each factory accepts a partial object and returns a fully-populated row with
// schema-aligned defaults. Test code uses these instead of object literals so
// new columns can be added in one place.
// ---------------------------------------------------------------------------

/**
 * @param {Partial<ReferenceInventoryRow>} fields
 * @returns {ReferenceInventoryRow}
 */
export function makeReferenceInventoryRow(fields = {}) {
  return {
    field: "",
    file_path: "",
    line_number: 1,
    subsystem: SUBSYSTEMS[0],
    usage_kind: USAGE_KINDS[0],
    ...fields,
  };
}

/**
 * @param {Partial<DriftInventoryRow>} fields
 * @returns {DriftInventoryRow}
 */
export function makeDriftInventoryRow(fields = {}) {
  return {
    id: "D-001",
    field_or_contract: "",
    layers_in_drift: [],
    evidence: [],
    severity: SEVERITIES[0],
    rationale: "",
    recommended_action: "",
    ...fields,
  };
}

/**
 * @param {Partial<OwnershipMapRow>} fields
 * @returns {OwnershipMapRow}
 */
export function makeOwnershipMapRow(fields = {}) {
  return {
    name: "",
    kind: OWNERSHIP_KINDS[0],
    owner_subsystem: SUBSYSTEMS[0],
    consumer_subsystems: [],
    definition_file: "",
    notes: "",
    ...fields,
  };
}

/**
 * @param {Partial<DependencyEdge>} fields
 * @returns {DependencyEdge}
 */
export function makeDependencyEdge(fields = {}) {
  return {
    from_subsystem: SUBSYSTEMS[0],
    to_subsystem: SUBSYSTEMS[1],
    labels: [],
    citations: [],
    cycle_id: null,
    ...fields,
  };
}

/**
 * @param {Partial<MigrationStep>} fields
 * @returns {MigrationStep}
 */
export function makeMigrationStep(fields = {}) {
  return {
    id: "M-001",
    goal: "",
    preconditions: [],
    actions: [],
    verification: [],
    rollback: "",
    linked_findings: [],
    ...fields,
  };
}

/**
 * @param {Partial<PreservationRow>} fields
 * @returns {PreservationRow}
 */
export function makePreservationRow(fields = {}) {
  return {
    path: "",
    classification: PRESERVATION_CLASSIFICATIONS[0],
    rationale: "",
    linked_findings: [],
    assessment_state: ASSESSMENT_STATES[0],
    ...fields,
  };
}

/**
 * @param {Partial<Deliverables>} fields
 * @returns {Deliverables}
 */
export function makeDeliverables(fields = {}) {
  return {
    audit_report: "",
    dependency_map: "",
    migration_plan: "",
    compatibility_strategy: "",
    preservation_inventory: "",
    rebuild_recommendations: "",
    ...fields,
  };
}
