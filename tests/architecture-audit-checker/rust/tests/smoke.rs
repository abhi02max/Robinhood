//! Scaffolding smoke test.
//!
//! Constructs one of each model struct, parses a small GFM table, and
//! verifies the parser/table extractor wiring is sound. The 17 Correctness
//! Properties are intentionally NOT exercised here — they will be added in
//! later harness tasks.

use architecture_audit_checker_rs::models::{
    Deliverables, DependencyEdge, DriftInventoryRow, EvidenceCitation, MigrationStep,
    OwnershipMapRow, PreservationRow, ReferenceInventoryRow,
};
use architecture_audit_checker_rs::parser::{extract_code_blocks, extract_section, extract_tables};

#[test]
fn model_structs_construct() {
    let _ref_row = ReferenceInventoryRow {
        field: "cpp_signature".to_string(),
        file_path: "scratch/server/scripts/01_schema.sql".to_string(),
        line_number: 42,
        subsystem: "sql-schema".to_string(),
        usage_kind: "column-definition".to_string(),
    };

    let evidence = EvidenceCitation {
        file_path: "scratch/server/scripts/01_schema.sql".to_string(),
        line_range: "L40-L48".to_string(),
    };

    let _drift_row = DriftInventoryRow {
        id: "D-001".to_string(),
        field_or_contract: "cpp_signature".to_string(),
        layers_in_drift: vec!["sql-schema".to_string(), "seed-scripts".to_string()],
        evidence: vec![evidence.clone()],
        severity: "high".to_string(),
        rationale: "Originates from Docker rebuild incident.".to_string(),
        recommended_action: "Trace forward to Migration_Plan step M-001.".to_string(),
    };

    let _ownership_row = OwnershipMapRow {
        name: "cpp_signature".to_string(),
        kind: "drift-prone-field".to_string(),
        owner_subsystem: "sql-schema".to_string(),
        consumer_subsystems: vec!["validators".to_string(), "execution-engine".to_string()],
        definition_file: "scratch/server/scripts/01_schema.sql".to_string(),
        notes: String::new(),
    };

    let _edge = DependencyEdge {
        source: "sql-schema".to_string(),
        target: "seed-scripts".to_string(),
        labels: vec!["cpp_signature".to_string()],
        cycle_id: None,
    };

    let _step = MigrationStep {
        id: "M-001".to_string(),
        goal: "Add missing cpp_signature column".to_string(),
        preconditions: "Audit_Baseline pinned".to_string(),
        actions: "ALTER TABLE problems ADD COLUMN cpp_signature TEXT".to_string(),
        verification: "Validator schema accepts new column".to_string(),
        rollback: "ALTER TABLE problems DROP COLUMN cpp_signature".to_string(),
        linked_findings: vec!["D-001".to_string()],
    };

    let _preservation = PreservationRow {
        path: "scratch/src/data/learning-content.js".to_string(),
        classification: "preserve-byte-identical".to_string(),
        assessment_state: "unassessed".to_string(),
        rationale: String::new(),
        linked_findings: vec![],
    };

    let _deliverables = Deliverables {
        audit_report: String::new(),
        dependency_map: String::new(),
        migration_plan: String::new(),
        compatibility_strategy: String::new(),
        preservation_inventory: String::new(),
        rebuild_recommendations: String::new(),
    };
}

#[test]
fn extract_tables_parses_a_simple_gfm_table() {
    let md = "\
# Sample

| id    | severity |
| ----- | -------- |
| D-001 | high     |
| D-002 | medium   |
";

    let tables = extract_tables(md);
    assert_eq!(tables.len(), 1);

    let table = &tables[0];
    assert_eq!(table.headers, vec!["id".to_string(), "severity".to_string()]);
    assert_eq!(table.rows.len(), 2);
    assert_eq!(table.rows[0], vec!["D-001".to_string(), "high".to_string()]);
    assert_eq!(
        table.rows[1],
        vec!["D-002".to_string(), "medium".to_string()]
    );
}

#[test]
fn extract_section_returns_section_body() {
    let md = "\
# Title

## Methodology

Body of methodology.

## Other

Body of other.
";

    let body = extract_section(md, "Methodology");
    assert!(body.contains("Body of methodology."));
    assert!(!body.contains("Body of other."));
}

#[test]
fn extract_code_blocks_filters_by_language() {
    let md = "\
```mermaid
flowchart TD
  A --> B
```

```json
{ \"id\": \"D-001\" }
```
";

    let mermaid = extract_code_blocks(md, Some("mermaid"));
    assert_eq!(mermaid.len(), 1);
    assert!(mermaid[0].contains("flowchart"));

    let all = extract_code_blocks(md, None);
    assert_eq!(all.len(), 2);
}
