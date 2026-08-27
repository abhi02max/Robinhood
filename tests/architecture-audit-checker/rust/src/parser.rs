//! Thin Markdown parser wrappers built on top of `pulldown-cmark`.
//!
//! The 17 Correctness Properties only need three coarse extractors:
//!
//! 1. [`extract_tables`] — every GFM table in document order, returned as a
//!    list of headers + rows of plain-text cell content.
//! 2. [`extract_section`] — the body text of a section identified by its
//!    heading text, terminated by the next heading at the same level or a
//!    higher (smaller-numbered) level.
//! 3. [`extract_code_blocks`] — fenced code-block bodies, optionally filtered
//!    by the language tag (e.g. `mermaid`, `json`).
//!
//! GFM tables are enabled via [`Options::ENABLE_TABLES`] so that the
//! deliverable Markdown round-trips through this parser without losing
//! structure.

use pulldown_cmark::{CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag, TagEnd};

/// One Markdown table, flattened to plain-text cell strings.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Table {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

fn options() -> Options {
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts
}

/// Extract every GFM table from `md` in document order.
pub fn extract_tables(md: &str) -> Vec<Table> {
    let parser = Parser::new_ext(md, options());

    let mut tables: Vec<Table> = Vec::new();
    let mut current: Option<Table> = None;
    let mut in_head = false;
    let mut in_row = false;
    let mut in_cell = false;
    let mut current_row: Vec<String> = Vec::new();
    let mut cell_buf = String::new();

    for event in parser {
        match event {
            Event::Start(Tag::Table(_)) => {
                current = Some(Table {
                    headers: Vec::new(),
                    rows: Vec::new(),
                });
            }
            Event::End(TagEnd::Table) => {
                if let Some(table) = current.take() {
                    tables.push(table);
                }
            }
            Event::Start(Tag::TableHead) => {
                in_head = true;
                current_row = Vec::new();
            }
            Event::End(TagEnd::TableHead) => {
                if let Some(table) = current.as_mut() {
                    table.headers = std::mem::take(&mut current_row);
                }
                in_head = false;
            }
            Event::Start(Tag::TableRow) => {
                in_row = true;
                current_row = Vec::new();
            }
            Event::End(TagEnd::TableRow) => {
                if let Some(table) = current.as_mut() {
                    table.rows.push(std::mem::take(&mut current_row));
                }
                in_row = false;
            }
            Event::Start(Tag::TableCell) => {
                in_cell = true;
                cell_buf.clear();
            }
            Event::End(TagEnd::TableCell) => {
                if in_head || in_row {
                    current_row.push(cell_buf.trim().to_string());
                }
                cell_buf.clear();
                in_cell = false;
            }
            Event::Text(text) | Event::Code(text) | Event::Html(text) => {
                if in_cell {
                    cell_buf.push_str(&text);
                }
            }
            Event::SoftBreak | Event::HardBreak => {
                if in_cell {
                    cell_buf.push(' ');
                }
            }
            _ => {}
        }
    }

    tables
}

/// Extract the body text of the first section whose heading text exactly
/// equals `heading`. The section ends at the next heading whose level is the
/// same as or higher than the matched heading (i.e. `## Foo` is terminated by
/// the next `## ...` or any `# ...`).
///
/// Returns the empty string if no matching heading is found.
pub fn extract_section(md: &str, heading: &str) -> String {
    let parser = Parser::new_ext(md, options()).into_offset_iter();
    let target = heading.trim();

    let mut match_level: Option<HeadingLevel> = None;
    let mut heading_open: Option<HeadingLevel> = None;
    let mut heading_text = String::new();
    let mut start_byte: Option<usize> = None;
    let mut end_byte: Option<usize> = None;

    for (event, range) in parser {
        match event {
            Event::Start(Tag::Heading { level, .. }) => {
                heading_open = Some(level);
                heading_text.clear();
            }
            Event::End(TagEnd::Heading(level)) => {
                heading_open = None;
                if match_level.is_none() && heading_text.trim() == target {
                    match_level = Some(level);
                    start_byte = Some(range.end);
                } else if let Some(matched) = match_level {
                    if heading_level_rank(level) <= heading_level_rank(matched) {
                        end_byte = Some(range.start);
                        break;
                    }
                }
            }
            Event::Text(text) | Event::Code(text) => {
                if heading_open.is_some() {
                    heading_text.push_str(&text);
                }
            }
            _ => {}
        }
    }

    match (start_byte, end_byte) {
        (Some(s), Some(e)) if e > s => md[s..e].trim().to_string(),
        (Some(s), None) => md[s..].trim().to_string(),
        _ => String::new(),
    }
}

fn heading_level_rank(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

/// Extract every fenced code-block body. When `lang` is `Some`, only blocks
/// whose info string starts with that language tag (case-sensitive) are
/// returned; when `lang` is `None`, every fenced block is returned.
pub fn extract_code_blocks(md: &str, lang: Option<&str>) -> Vec<String> {
    let parser = Parser::new_ext(md, options());

    let mut blocks: Vec<String> = Vec::new();
    let mut buf = String::new();
    let mut capturing = false;

    for event in parser {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                let info = match kind {
                    CodeBlockKind::Fenced(s) => s.into_string(),
                    CodeBlockKind::Indented => String::new(),
                };
                let info_lang = info.split_whitespace().next().unwrap_or("");
                capturing = match lang {
                    Some(target) => info_lang == target,
                    None => true,
                };
                buf.clear();
            }
            Event::End(TagEnd::CodeBlock) => {
                if capturing {
                    blocks.push(std::mem::take(&mut buf));
                }
                capturing = false;
                buf.clear();
            }
            Event::Text(text) => {
                if capturing {
                    buf.push_str(&text);
                }
            }
            _ => {}
        }
    }

    blocks
}
