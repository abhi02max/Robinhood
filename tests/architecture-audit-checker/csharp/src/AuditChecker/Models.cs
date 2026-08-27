// Shared data model for the C# track of the architecture-audit deliverable
// checker. Mirrors the dataclasses / records / structs in the Python,
// TypeScript, and Rust tracks under tests/architecture-audit-checker/.
//
// Design contract: the six Markdown deliverables under
// .kiro/specs/architecture-audit/ load into this relational model, and the 17
// Correctness Properties run universally quantified checks over the resulting
// rows. See ../../../README.md and the architecture-audit design document for
// the row schemas and identifier conventions these records preserve.

namespace Robinhood.Audit.Models;

/// <summary>
/// One occurrence of a Drift_Prone_Field in the Reference_Inventory table of
/// audit-report.md.
/// </summary>
/// <param name="Field">Drift_Prone_Field name (closed set per Glossary).</param>
/// <param name="FilePath">Workspace-relative file path resolved at Audit_Baseline.</param>
/// <param name="LineNumber">1-indexed line number into the file at Audit_Baseline.</param>
/// <param name="Subsystem">One of the nine Subsystem names, or the marker "merged-multiple" per AC3.3.</param>
/// <param name="UsageKind">One of the nine usage_kind values from the closed set.</param>
public sealed record ReferenceInventoryRow(
    string Field,
    string FilePath,
    int LineNumber,
    string Subsystem,
    string UsageKind);

/// <summary>
/// A single (file_path, line_range) citation inside a Drift_Inventory row's
/// evidence cell.
/// </summary>
public sealed record EvidenceCitation(
    string FilePath,
    string LineRange);

/// <summary>
/// One row of the Drift_Inventory table. Identifier format is "D-NNN".
/// </summary>
public sealed record DriftInventoryRow(
    string Id,
    string FieldOrContract,
    IReadOnlyList<string> LayersInDrift,
    IReadOnlyList<EvidenceCitation> Evidence,
    string Severity,
    string Rationale,
    string RecommendedAction);

/// <summary>
/// One row of the Ownership_Map table.
/// </summary>
public sealed record OwnershipMapRow(
    string Name,
    string Kind,
    string OwnerSubsystem,
    IReadOnlyList<string> ConsumerSubsystems,
    string DefinitionFile,
    string Notes);

/// <summary>
/// One labeled directed edge in the Dependency_Map graph.
/// CycleId, when present, references a Drift_Inventory id (D-NNN) that records
/// the cycle the edge participates in (per AC7.3).
/// </summary>
public sealed record DependencyEdge(
    string Source,
    string Target,
    IReadOnlyList<string> Labels,
    string? CycleId);

/// <summary>
/// One ordered step of the Migration_Plan. Identifier format is "M-NNN".
/// </summary>
public sealed record MigrationStep(
    string Id,
    string Goal,
    string Preconditions,
    string Actions,
    string Verification,
    string Rollback,
    IReadOnlyList<string> LinkedFindings);

/// <summary>
/// One row of the Preservation_Inventory table.
/// </summary>
public sealed record PreservationRow(
    string Path,
    string Classification,
    string AssessmentState,
    string Rationale,
    IReadOnlyList<string> LinkedFindings);

/// <summary>
/// Raw Markdown bodies of the six audit deliverables, in deliverable-name
/// order. Missing files are tolerated as empty strings by the loader so the
/// 17 Correctness Properties can still report meaningful structural errors.
/// </summary>
public sealed record Deliverables(
    string AuditReport,
    string DependencyMap,
    string MigrationPlan,
    string CompatibilityStrategy,
    string PreservationInventory,
    string RebuildRecommendations);
