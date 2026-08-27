# architecture-audit-checker — Go track

Property-based deliverable checker for the `architecture-audit` spec, Go track.

This harness loads the six Markdown deliverables produced under
`.kiro/specs/architecture-audit/` and runs the 17 Correctness Properties
defined in `design.md` against them. The harness is read-only: it never
edits the deliverables, never executes SQL, and never invokes deployment
tooling.

## Layout

```
tests/architecture-audit-checker/go/
├── go.mod                  # module + pgregory.net/rapid + goldmark
├── models/models.go        # shared relational data model (Go structs)
├── loader/loader.go        # reads the six deliverables (missing files → "")
├── parser/parser.go        # goldmark-backed table / section / code-block extractors
├── parser/parser_test.go   # smoke test for the table extractor
└── README.md               # this file
```

## Running

```
go test ./...
```

`go mod tidy` will fetch `pgregory.net/rapid` and `github.com/yuin/goldmark`
on first run.

## Properties

The 17 Correctness Properties from `design.md` are implemented as
property-based tests in later tasks. Each property is universally
quantified over the parsed deliverable model and produces a pass/fail
result identical to every other language track.

| # | Property | Status |
| --- | --- | --- |
| 1 | Closed-set deliverable file inventory | TODO |
| 2 | Reference_Inventory row schema and closed `usage_kind` set | TODO |
| 3 | Reference_Inventory per-Subsystem expansion (with merged-row fallback marker) | TODO |
| 4 | Drift_Inventory row schema and unique `D-NNN` ids | TODO |
| 5 | Drift_Inventory adjacency-only `layers_in_drift` (Requirement 4.2) | TODO |
| 6 | Severity rubric closed-set assignment with rationale | TODO |
| 7 | Severity histogram count matches Drift_Inventory row count | TODO |
| 8 | Ownership_Map row schema and closed `kind` set | TODO |
| 9 | Dependency_Map renderings agree (graph ↔ adjacency table ↔ per-edge listing) | TODO |
| 10 | Dependency_Map cycles dual-recorded (annotation + Drift_Inventory finding) | TODO |
| 11 | Migration_Plan minimum-cardinality (≥ 1 step) | TODO |
| 12 | Migration_Plan ordering invariant (preconditions resolve to earlier steps) | TODO |
| 13 | Migration_Plan coverage of every blocker/high Drift_Inventory row | TODO |
| 14 | Compatibility_Strategy three-scope schema-evolution preservation (Requirement 9.5) | TODO |
| 15 | Preservation_Inventory conditional minimum classification (Requirement 10.4) | TODO |
| 16 | Cross-deliverable referential integrity for `D-NNN` / `M-NNN` / paths | TODO |
| 17 | Tempting-fix prohibition + narrow in-place patch exception (Requirement 12.8) | TODO |

## Read-only constraints

This harness directory lives at `tests/architecture-audit-checker/go/`,
which is outside both protected scopes
(`.kiro/specs/platform-architecture-consolidation/` and `scratch/`).
No code in this directory writes to either scope.
