"""Shared relational data model for the architecture-audit deliverable checker.

These dataclasses mirror the schemas defined in
`.kiro/specs/architecture-audit/design.md` (see "Reference_Inventory (rows)",
"Drift_Inventory (rows)", "Ownership_Map (rows)", "Dependency_Map (graph
model)", "Migration_Plan step model", and "Preservation_Inventory (rows)").

The dataclasses are *structural* containers only. They store cell strings as
parsed from the Markdown tables. Semantic validation (closed-set membership,
ID format, adjacency, cross-reference resolution, etc.) is the job of the
Correctness Properties, not these types.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class ReferenceInventoryRow:
    """One row of the ``Reference_Inventory`` table in ``audit-report.md``.

    Schema (design.md → Reference_Inventory):
        field        — Drift_Prone_Field name (or newly discovered field).
        file_path    — workspace-relative path; existence at ``Audit_Baseline``
                       is verified by a separate Correctness Property.
        line_number  — 1-indexed integer; stored as parsed string for
                       structural-only loading, coerced by checks.
        subsystem    — one of the nine Subsystem names, or the marker
                       ``merged-multiple`` per AC3.3 fallback.
        usage_kind   — one of the closed nine-value set.
    """

    field: str
    file_path: str
    line_number: str
    subsystem: str
    usage_kind: str


@dataclass(frozen=True)
class DriftInventoryRow:
    """One row of the ``Drift_Inventory`` table in ``audit-report.md``.

    Schema (design.md → Drift_Inventory):
        id                  — ``D-NNN`` zero-padded ordinal.
        field_or_contract   — Drift_Prone_Field, endpoint path, or contract.
        layers_in_drift     — raw cell text (``,``- or ``↔``-separated list of
                              Subsystem names); split is left to checks.
        evidence            — raw cell text; ``{file_path, line_range}`` list
                              parsing is left to checks.
        severity            — one of ``{blocker, high, medium, low}``.
        rationale           — must reference the rubric criterion (and the
                              Docker-rebuild origin where applicable).
        recommended_action  — short imperative phrase.
    """

    id: str
    field_or_contract: str
    layers_in_drift: str
    evidence: str
    severity: str
    rationale: str
    recommended_action: str


@dataclass(frozen=True)
class OwnershipMapRow:
    """One row of the ``Ownership_Map`` table in ``audit-report.md``.

    Schema (design.md → Ownership_Map):
        name                 — field, column, or endpoint path.
        kind                 — one of the closed eight-value set.
        owner_subsystem      — one of the nine Subsystem names.
        consumer_subsystems  — raw cell text; possibly empty.
        definition_file      — workspace-relative path.
        notes                — free-form; flags contested or zero-consumer
                               ownership.
    """

    name: str
    kind: str
    owner_subsystem: str
    consumer_subsystems: str
    definition_file: str
    notes: str


@dataclass(frozen=True)
class DependencyEdge:
    """One directed edge of the ``Dependency_Map`` graph.

    Schema (design.md → Dependency_Map graph model):
        source    — Subsystem (or data-source) node name.
        target    — Subsystem (or data-source) node name.
        labels    — non-empty list of Drift_Prone_Fields and/or contract
                    names; stored as raw strings in load order.
        cycle_id  — when the edge is part of an annotated cycle, the
                    corresponding ``D-NNN`` finding id (per AC7.3); empty
                    string when the edge is acyclic.
    """

    source: str
    target: str
    labels: List[str] = field(default_factory=list)
    cycle_id: str = ""


@dataclass(frozen=True)
class MigrationStep:
    """One step of the ``Migration_Plan`` in ``migration-plan.md``.

    Schema (design.md → Migration_Plan step model):
        id               — ``M-NNN`` zero-padded ordinal.
        goal             — single-sentence post-step state.
        preconditions    — raw cell text; list-parsing left to checks.
        actions          — raw cell text; list-parsing left to checks.
        verification     — raw cell text; list-parsing left to checks.
        rollback         — no-data-loss reversal description.
        linked_findings  — raw cell text; list of ``D-NNN`` ids.
    """

    id: str
    goal: str
    preconditions: str
    actions: str
    verification: str
    rollback: str
    linked_findings: str


@dataclass(frozen=True)
class PreservationRow:
    """One row of the ``Preservation_Inventory`` table.

    Schema (design.md → Preservation_Inventory):
        path              — workspace-relative path.
        classification    — one of ``{preserve-byte-identical,
                            preserve-with-migration, regenerate-from-source}``.
        assessment_state  — one of ``{unassessed, assessed}`` (AC10.4);
                            defaults to ``unassessed``.
        rationale         — required when ``classification`` is not the
                            default; must cite ``D-NNN`` for
                            ``regenerate-from-source``.
        linked_findings   — raw cell text; list of ``D-NNN`` ids.
    """

    path: str
    classification: str
    assessment_state: str
    rationale: str
    linked_findings: str


@dataclass(frozen=True)
class Deliverables:
    """Bundle of the six Markdown deliverable bodies under
    ``.kiro/specs/architecture-audit/``.

    Each field stores the raw Markdown source for a single deliverable. A
    missing file is represented as the empty string so a downstream
    Correctness Property can report the absence with a clean message rather
    than crash on file I/O.
    """

    audit_report: str = ""
    dependency_map: str = ""
    migration_plan: str = ""
    compatibility_strategy: str = ""
    preservation_inventory: str = ""
    rebuild_recommendations: str = ""


__all__ = [
    "ReferenceInventoryRow",
    "DriftInventoryRow",
    "OwnershipMapRow",
    "DependencyEdge",
    "MigrationStep",
    "PreservationRow",
    "Deliverables",
]
