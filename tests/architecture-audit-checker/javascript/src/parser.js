/**
 * Markdown parser utilities for the architecture-audit checker harness
 * (JavaScript track).
 *
 * Provides three exports that mirror the TypeScript track:
 *
 *   - {@link extractTables}     parse all GFM tables in a Markdown document
 *                               into header/row arrays.
 *   - {@link extractSection}    extract the body of a heading-bounded section
 *                               by exact heading text.
 *   - {@link extractCodeBlocks} return all fenced code blocks, optionally
 *                               filtered by info-string language.
 *
 * Backed by `unified` + `remark-parse` + `remark-gfm` so GFM tables, fenced
 * code blocks, and standard Markdown headings parse identically across the
 * TS and JS tracks.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

/**
 * @typedef {Object} ParsedTable
 * @property {string[]} headers
 *   Trimmed header cell text in document order.
 * @property {string[][]} rows
 *   Each row is an array of trimmed cell strings, length-aligned to headers.
 *   Cells beyond `headers.length` are dropped; missing cells are filled with
 *   the empty string.
 */

/**
 * @typedef {Object} CodeBlock
 * @property {string|null} lang
 *   The fenced code-block info-string language, or null when absent.
 * @property {string} value
 *   Raw text content of the code block (no surrounding fences).
 */

/**
 * Internal helper: build the shared remark processor. We instantiate per-call
 * so concurrent parses cannot interfere with one another's state.
 *
 * @returns {ReturnType<typeof unified>}
 */
function buildProcessor() {
  return unified().use(remarkParse).use(remarkGfm);
}

/**
 * Extract the visible text of a remark AST node and all its descendants. Used
 * to flatten heading and table-cell nodes into plain strings.
 *
 * @param {any} node
 * @returns {string}
 */
function nodeText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(nodeText).join("");
  }
  return "";
}

/**
 * Parse all GFM tables in a Markdown document.
 *
 * @param {string} markdown
 *   Raw Markdown source. An empty string yields an empty array.
 * @returns {ParsedTable[]}
 */
export function extractTables(markdown) {
  if (!markdown) return [];

  const tree = buildProcessor().parse(markdown);
  /** @type {ParsedTable[]} */
  const tables = [];

  for (const node of tree.children ?? []) {
    if (node.type !== "table") continue;

    const tableRows = node.children ?? [];
    if (tableRows.length === 0) continue;

    const headerCells = tableRows[0].children ?? [];
    const headers = headerCells.map((cell) => nodeText(cell).trim());

    const rows = [];
    for (let i = 1; i < tableRows.length; i++) {
      const dataCells = tableRows[i].children ?? [];
      const row = headers.map((_, idx) =>
        idx < dataCells.length ? nodeText(dataCells[idx]).trim() : "",
      );
      rows.push(row);
    }

    tables.push({ headers, rows });
  }

  return tables;
}

/**
 * Extract the body of a section by its exact heading text.
 *
 * The returned slice begins at the first character after the matched heading
 * line and ends just before the next heading whose depth is less than or
 * equal to the matched heading's depth (closing the section), or end of file.
 *
 * @param {string} markdown
 *   Raw Markdown source.
 * @param {string} headingText
 *   The exact heading text to match (case-sensitive, whitespace-trimmed).
 * @returns {string|null}
 *   The section body, or `null` if no matching heading exists.
 */
export function extractSection(markdown, headingText) {
  if (!markdown) return null;

  const tree = buildProcessor().parse(markdown);
  const children = tree.children ?? [];

  let startIdx = -1;
  let startDepth = -1;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type !== "heading") continue;
    if (nodeText(node).trim() === headingText.trim()) {
      startIdx = i;
      startDepth = node.depth;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = children.length;
  for (let i = startIdx + 1; i < children.length; i++) {
    const node = children[i];
    if (node.type === "heading" && node.depth <= startDepth) {
      endIdx = i;
      break;
    }
  }

  // Convert the AST-positional bound back to a substring of the source.
  const headingNode = children[startIdx];
  const startOffset = headingNode.position?.end?.offset;
  const endNode = endIdx < children.length ? children[endIdx] : null;
  const endOffset = endNode?.position?.start?.offset ?? markdown.length;

  if (typeof startOffset !== "number") return "";
  return markdown.slice(startOffset, endOffset).replace(/^\n+/, "");
}

/**
 * Return all fenced code blocks in document order.
 *
 * @param {string} markdown
 *   Raw Markdown source.
 * @param {string} [lang]
 *   Optional info-string filter. When provided, only blocks whose `lang`
 *   matches exactly are returned.
 * @returns {CodeBlock[]}
 */
export function extractCodeBlocks(markdown, lang) {
  if (!markdown) return [];

  const tree = buildProcessor().parse(markdown);
  /** @type {CodeBlock[]} */
  const blocks = [];

  for (const node of tree.children ?? []) {
    if (node.type !== "code") continue;
    const blockLang = typeof node.lang === "string" ? node.lang : null;
    if (lang !== undefined && blockLang !== lang) continue;
    blocks.push({ lang: blockLang, value: typeof node.value === "string" ? node.value : "" });
  }

  return blocks;
}
