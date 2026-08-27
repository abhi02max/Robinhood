# architecture-audit-checker — Rust track

Rust track of the architecture-audit deliverable checker harness. Loads the
six Markdown deliverables under `.kiro/specs/architecture-audit/` and runs
the 17 Correctness Properties from
`.kiro/specs/architecture-audit/design.md` via `proptest`.

This directory contains only the scaffolding: a loader, a Markdown parser
wrapper around `pulldown-cmark`, the shared relational data model as Rust
structs, and a smoke test verifying the wiring. The 17 properties are tracked
as TODOs below and will land in subsequent harness tasks.

## Layout

```
rust/
  Cargo.toml          # crate manifest (edition 2021, lib target)
  src/
    lib.rs            # re-exports models / loader / parser
    models.rs         # Reference_Inventory, Drift_Inventory, etc. as structs
    loader.rs         # read-only loader for the six deliverables
    parser.rs         # pulldown-cmark wrappers (tables, sections, code blocks)
  tests/
    smoke.rs          # scaffolding smoke test
```

## Running

```sh
cargo test
```

`cargo test` runs the scaffolding smoke test plus, in later tasks, every
property in the harness.

## Read-only constraints

- The harness only **reads** the deliverable Markdown files under
  `.kiro/specs/architecture-audit/`.
- No SQL, migration runner, seed runner, Docker, Terraform, or cloud CLI is
  invoked from this crate.
- The crate writes nothing to the spec deliverables, the codebase, or any
  external system.

## Properties — TODO

The 17 Correctness Properties are defined in
`.kiro/specs/architecture-audit/design.md`. Each will be implemented as a
`proptest!` block in this track.

- [ ] Property 1 — Closed-set deliverable file enumeration
- [ ] Property 2 — Subsystem section template completeness
- [ ] Property 3 — Reference_Inventory row schema and `usage_kind` closed set
- [ ] Property 4 — Drift_Inventory row schema and adjacency-only scope
- [ ] Property 5 — Severity rubric coverage and histogram match
- [ ] Property 6 — Ownership_Map row schema and `kind` closed set
- [ ] Property 7 — Dependency graph dual rendering and cycle dual recording
- [ ] Property 8 — Migration_Plan ordering, coverage, and minimum cardinality
- [ ] Property 9 — Compatibility_Strategy three-target structure and schema-evolution preservation
- [ ] Property 10 — Preservation_Inventory classification rules and `assessment_state`
- [ ] Property 11 — Rebuild_Recommendations sections and traceability
- [ ] Property 12 — Cross-reference resolution (`D-NNN`, `M-NNN`, paths, headings)
- [ ] Property 13 — Deliverable Index presence and accuracy
- [ ] Property 14 — Methodology read-only tool enumeration and forbidden-set disjointness
- [ ] Property 15 — Stop-condition contract enforcement
- [ ] Property 16 — Process_Errors and Process_Warnings disjoint from Drift_Inventory
- [ ] Property 17 — Tempting-fix prohibition and narrow in-place patch exception
