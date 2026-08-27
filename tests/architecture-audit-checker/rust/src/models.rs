//! Shared relational data model for the architecture-audit deliverable
//! checker harness (Rust track).
//!
//! Each struct mirrors one row of a Markdown table or one bundle of
//! deliverable contents loaded from `.kiro/specs/architecture-audit/`. Field
//! names use `snake_case` and match the column names defined in
//! `.kiro/specs/architecture-audit/design.md`.

/// One row of the Reference_Inventory table in `audit-report.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReferenceInventoryRow {
    pub field: String,
    pub file_path: String,
    pub line_number: u32,
    pub subsystem: String,
    pub usage_kind: String,
}

/// A single workspace-relative file-path + line-range citation supporting a
/// Drift_Inventory finding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceCitation {
    pub file_path: String,
    pub line_range: String,
}

/// One row of the Drift_Inventory table in `audit-report.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriftInventoryRow {
    pub id: String,
    pub field_or_contract: String,
    pub layers_in_drift: Vec<String>,
    pub evidence: Vec<EvidenceCitation>,
    pub severity: String,
    pub rationale: String,
    pub recommended_action: String,
}

/// One row of the Ownership_Map table in `audit-report.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OwnershipMapRow {
    pub name: String,
    pub kind: String,
    pub owner_subsystem: String,
    pub consumer_subsystems: Vec<String>,
    pub definition_file: String,
    pub notes: String,
}

/// One directed edge of the dependency graph rendered in `dependency-map.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DependencyEdge {
    pub source: String,
    pub target: String,
    pub labels: Vec<String>,
    pub cycle_id: Option<String>,
}

/// One step (`M-NNN`) of the Migration_Plan in `migration-plan.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MigrationStep {
    pub id: String,
    pub goal: String,
    pub preconditions: String,
    pub actions: String,
    pub verification: String,
    pub rollback: String,
    pub linked_findings: Vec<String>,
}

/// One row of the Preservation_Inventory table in `preservation-inventory.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PreservationRow {
    pub path: String,
    pub classification: String,
    pub assessment_state: String,
    pub rationale: String,
    pub linked_findings: Vec<String>,
}

/// Bundle of the six Markdown deliverable contents loaded from
/// `.kiro/specs/architecture-audit/`. Missing files are represented as the
/// empty string so downstream property tests can degrade gracefully.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Deliverables {
    pub audit_report: String,
    pub dependency_map: String,
    pub migration_plan: String,
    pub compatibility_strategy: String,
    pub preservation_inventory: String,
    pub rebuild_recommendations: String,
}
