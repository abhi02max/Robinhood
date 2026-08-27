//! Read-only loader for the six Markdown deliverables under
//! `.kiro/specs/architecture-audit/`.
//!
//! The loader never writes to disk and never executes shell commands. A
//! missing deliverable file is represented as the empty string so the 17
//! Correctness Properties can still run and report structural defects rather
//! than crashing on `ENOENT`.

use std::fs;
use std::path::Path;

use crate::models::Deliverables;

/// Filename of each deliverable, in the canonical order documented in
/// `.kiro/specs/architecture-audit/design.md`.
const AUDIT_REPORT: &str = "audit-report.md";
const DEPENDENCY_MAP: &str = "dependency-map.md";
const MIGRATION_PLAN: &str = "migration-plan.md";
const COMPATIBILITY_STRATEGY: &str = "compatibility-strategy.md";
const PRESERVATION_INVENTORY: &str = "preservation-inventory.md";
const REBUILD_RECOMMENDATIONS: &str = "rebuild-recommendations.md";

/// Load every deliverable Markdown file from `spec_dir`. Files that do not
/// exist (or cannot be read) yield an empty string for that field.
pub fn load_deliverables(spec_dir: &Path) -> Deliverables {
    Deliverables {
        audit_report: read_or_empty(spec_dir, AUDIT_REPORT),
        dependency_map: read_or_empty(spec_dir, DEPENDENCY_MAP),
        migration_plan: read_or_empty(spec_dir, MIGRATION_PLAN),
        compatibility_strategy: read_or_empty(spec_dir, COMPATIBILITY_STRATEGY),
        preservation_inventory: read_or_empty(spec_dir, PRESERVATION_INVENTORY),
        rebuild_recommendations: read_or_empty(spec_dir, REBUILD_RECOMMENDATIONS),
    }
}

fn read_or_empty(spec_dir: &Path, filename: &str) -> String {
    fs::read_to_string(spec_dir.join(filename)).unwrap_or_default()
}
