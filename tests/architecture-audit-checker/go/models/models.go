// Package models defines the shared relational data model that the Go track of
// the architecture-audit deliverable checker materializes from the six
// Markdown deliverables.
//
// The six deliverables (Audit_Report, Dependency_Map, Migration_Plan,
// Compatibility_Strategy, Preservation_Inventory, Rebuild_Recommendations)
// are parsed into this model so the 17 Correctness Properties from the
// architecture-audit design document can be checked uniformly across every
// language track.
package models

// ReferenceInventoryRow corresponds to one row of the Reference_Inventory
// table in audit-report.md.
//
// Row identity is the tuple (Field, FilePath, LineNumber, Subsystem,
// UsageKind); duplicates are forbidden (design.md Reference_Inventory
// schema). UsageKind is drawn from the closed nine-value set:
// {schema-definition, seed-write, validator-shape, typescript-type,
// execution-engine-read, api-response-key, frontend-render, test-fixture,
// documentation}. Subsystem is one of the nine Subsystem names OR the
// merged-row marker value "merged-multiple" (Requirement 3.3 fallback).
type ReferenceInventoryRow struct {
	Field      string
	FilePath   string
	LineNumber int
	Subsystem  string
	UsageKind  string
}

// EvidenceCitation is a (file_path, line_range) pair backing a Drift_Inventory
// row or any other evidence-pinned claim. LineRange is kept as a free-form
// string ("12-34", "12", "12,40-42") because the deliverable Markdown does
// not commit to a single line-range syntax.
type EvidenceCitation struct {
	FilePath  string
	LineRange string
}

// DriftInventoryRow corresponds to one row of the Drift_Inventory table in
// audit-report.md. ID has the format D-NNN, zero-padded ordinal beginning
// at D-001 and globally unique. LayersInDrift is a list of Subsystem names
// of length >= 2; the pair(s) MUST be drawn from adjacent positions in the
// dependency chain (Requirement 4.2 adjacency-only scope). Severity is one
// of {blocker, high, medium, low}.
type DriftInventoryRow struct {
	ID                string
	FieldOrContract   string
	LayersInDrift     []string
	Evidence          []EvidenceCitation
	Severity          string
	Rationale         string
	RecommendedAction string
}

// OwnershipMapRow corresponds to one row of the Ownership_Map table in
// audit-report.md. Kind is drawn from the closed eight-value set:
// {column, enum, json-shape, endpoint-request, endpoint-response,
// event-payload, validator-schema, typescript-interface}. Notes is free-form
// but MUST flag contested ownership and zero-consumer rows.
type OwnershipMapRow struct {
	Name               string
	Kind               string
	OwnerSubsystem     string
	ConsumerSubsystems []string
	DefinitionFile     string
	Notes              string
}

// DependencyEdge corresponds to one edge in the Dependency_Map graph
// rendered in dependency-map.md. Labels is a non-empty list of
// Drift_Prone_Field names and/or contract names. CycleID is empty for
// non-cycle edges and otherwise points at the corresponding Drift_Inventory
// finding (D-NNN) annotated under Requirement 7.3.
type DependencyEdge struct {
	Source  string
	Target  string
	Labels  []string
	CycleID string
}

// MigrationStep corresponds to one step of the Migration_Plan in
// migration-plan.md. ID has the format M-NNN, zero-padded and unique.
// Preconditions, Actions, and Verification are documented as ordered lists.
// LinkedFindings is non-empty (every step links to >= 1 Drift_Inventory id,
// Requirement 8.2 coverage invariant), except for the verification-only
// no-action baseline step that may link to a placeholder row (Requirement
// 8.1 minimum-cardinality invariant).
type MigrationStep struct {
	ID             string
	Goal           string
	Preconditions  []string
	Actions        []string
	Verification   []string
	Rollback       string
	LinkedFindings []string
}

// PreservationRow corresponds to one row of the Preservation_Inventory
// table in preservation-inventory.md. Classification is one of
// {preserve-byte-identical, preserve-with-migration, regenerate-from-source}
// and defaults to preserve-byte-identical (Requirement 10.2). AssessmentState
// is one of {unassessed, assessed} and conditions the minimum-classification
// rule for Real_Problems_Dataset and Learning_JSON rows (Requirement 10.4).
type PreservationRow struct {
	Path            string
	Classification  string
	AssessmentState string
	Rationale       string
	LinkedFindings  []string
}

// Deliverables holds the raw Markdown content of the six audit deliverables
// as loaded from disk. Missing files surface as empty strings so downstream
// parsers and property tests can run uniformly. The field set is closed:
// no other deliverables exist under .kiro/specs/architecture-audit/
// (Property 1, closed-set rule).
type Deliverables struct {
	AuditReport             string
	DependencyMap           string
	MigrationPlan           string
	CompatibilityStrategy   string
	PreservationInventory   string
	RebuildRecommendations  string
}
