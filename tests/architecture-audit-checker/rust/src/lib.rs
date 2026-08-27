//! architecture-audit-checker-rs
//!
//! Rust track of the architecture-audit deliverable checker harness.
//!
//! This crate scaffolds the loader, parser, and shared data model used by the
//! 17 Correctness Properties defined in
//! `.kiro/specs/architecture-audit/design.md`. The 17 properties themselves
//! are intentionally left out of this scaffold — they will be added under
//! `tests/` in subsequent harness tasks.
//!
//! The crate is read-only with respect to the spec deliverables: it only
//! reads the six Markdown files under `.kiro/specs/architecture-audit/` and
//! never writes to them.

pub mod loader;
pub mod models;
pub mod parser;
