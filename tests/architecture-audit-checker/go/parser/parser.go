// Package parser exposes Markdown extraction helpers used by the Go track
// of the architecture-audit deliverable checker.
//
// The parser is intentionally narrow: it surfaces just the three primitives
// the 17 Correctness Properties need from each deliverable.
//
//   - ExtractTables    — every GFM table in a document, header row + body rows.
//   - ExtractSection   — the body of a single ATX heading (## Foo, ### Bar) by exact text match.
//   - ExtractCodeBlocks — every fenced code block, optionally filtered by language tag.
//
// All three operate on the in-memory Markdown string (typically loaded by
// the sibling loader package) and return plain Go values so property tests
// can quantify over them without further AST traversal.
package parser

import (
	"bytes"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	gmext "github.com/yuin/goldmark/extension"
	gmast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/text"
)

// Table is a parsed GFM table with a header row and zero or more body rows.
// Each cell is the trimmed plain-text content of the underlying Markdown
// cell; inline emphasis, links, and code spans are flattened to text.
type Table struct {
	Headers []string
	Rows    [][]string
}

// newParser constructs a goldmark parser with the GFM Table extension
// enabled. The Table extension is required for ExtractTables to recognize
// pipe-delimited tables; the default goldmark parser does not.
func newParser() goldmark.Markdown {
	return goldmark.New(goldmark.WithExtensions(gmext.Table))
}

// parseDoc parses md into a goldmark AST and returns both the document
// node and the underlying source bytes (needed for text segment extraction).
func parseDoc(md string) (ast.Node, []byte) {
	src := []byte(md)
	doc := newParser().Parser().Parse(text.NewReader(src))
	return doc, src
}

// ExtractTables returns every GFM table in md, in document order.
// Each table's Headers and Rows are flattened to plain text.
func ExtractTables(md string) []Table {
	doc, src := parseDoc(md)
	var out []Table
	_ = ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		tbl, ok := n.(*gmast.Table)
		if !ok {
			return ast.WalkContinue, nil
		}
		out = append(out, flattenTable(tbl, src))
		return ast.WalkSkipChildren, nil
	})
	return out
}

// flattenTable converts a goldmark Table AST node into a Table value.
// Header cells come from the *TableHeader child; body rows come from the
// *TableRow siblings.
func flattenTable(tbl *gmast.Table, src []byte) Table {
	var t Table
	for child := tbl.FirstChild(); child != nil; child = child.NextSibling() {
		switch row := child.(type) {
		case *gmast.TableHeader:
			t.Headers = rowCells(row, src)
		case *gmast.TableRow:
			t.Rows = append(t.Rows, rowCells(row, src))
		}
	}
	return t
}

// rowCells walks a header or body row node and returns each cell's
// plain-text content.
func rowCells(row ast.Node, src []byte) []string {
	var cells []string
	for c := row.FirstChild(); c != nil; c = c.NextSibling() {
		if _, ok := c.(*gmast.TableCell); !ok {
			continue
		}
		cells = append(cells, strings.TrimSpace(nodeText(c, src)))
	}
	return cells
}

// nodeText returns the concatenated plain text under n. Code spans, emphasis,
// strong, links, and similar inline nodes contribute their literal text.
func nodeText(n ast.Node, src []byte) string {
	var buf bytes.Buffer
	_ = ast.Walk(n, func(c ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch t := c.(type) {
		case *ast.Text:
			buf.Write(t.Segment.Value(src))
		case *ast.CodeSpan:
			for cc := t.FirstChild(); cc != nil; cc = cc.NextSibling() {
				if tt, ok := cc.(*ast.Text); ok {
					buf.Write(tt.Segment.Value(src))
				}
			}
			return ast.WalkSkipChildren, nil
		case *ast.AutoLink:
			buf.Write(t.URL(src))
			return ast.WalkSkipChildren, nil
		}
		return ast.WalkContinue, nil
	})
	return buf.String()
}

// ExtractSection returns the body of the first heading whose plain text
// equals heading exactly. The body runs from the node immediately after
// the matched heading up to (but not including) the next heading of equal
// or shallower level. The returned string is the raw Markdown source for
// that range (preserving formatting, tables, and code blocks).
//
// If no heading matches, ExtractSection returns the empty string.
func ExtractSection(md string, heading string) string {
	doc, src := parseDoc(md)
	target := strings.TrimSpace(heading)

	var (
		startOff = -1
		endOff   = -1
		matchLvl int
	)

	for n := doc.FirstChild(); n != nil; n = n.NextSibling() {
		h, ok := n.(*ast.Heading)
		if !ok {
			continue
		}
		if startOff == -1 {
			if strings.TrimSpace(nodeText(h, src)) == target {
				matchLvl = h.Level
				if next := h.NextSibling(); next != nil {
					startOff = firstOffset(next)
				} else {
					startOff = len(src)
				}
			}
			continue
		}
		// We have a start; close on the next heading of equal-or-shallower level.
		if h.Level <= matchLvl {
			endOff = firstOffset(h)
			break
		}
	}

	if startOff == -1 {
		return ""
	}
	if endOff == -1 {
		endOff = len(src)
	}
	if startOff > endOff {
		return ""
	}
	return string(src[startOff:endOff])
}

// firstOffset returns the byte offset of the first text segment under n,
// or len(src) if no text segment is reachable.
func firstOffset(n ast.Node) int {
	if n == nil {
		return -1
	}
	if l, ok := n.(interface{ Lines() *text.Segments }); ok {
		if segs := l.Lines(); segs != nil && segs.Len() > 0 {
			return segs.At(0).Start
		}
	}
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		if off := firstOffset(c); off >= 0 {
			return off
		}
	}
	return -1
}

// ExtractCodeBlocks returns the raw text of every fenced code block in md.
// If lang is non-empty, only blocks whose info string equals lang
// (case-insensitive) are returned. An empty lang matches all fenced and
// indented code blocks.
func ExtractCodeBlocks(md string, lang string) []string {
	doc, src := parseDoc(md)
	want := strings.ToLower(strings.TrimSpace(lang))
	var out []string
	_ = ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch b := n.(type) {
		case *ast.FencedCodeBlock:
			info := ""
			if l := b.Language(src); l != nil {
				info = strings.ToLower(strings.TrimSpace(string(l)))
			}
			if want != "" && info != want {
				return ast.WalkContinue, nil
			}
			out = append(out, codeBlockText(b, src))
		case *ast.CodeBlock:
			if want != "" {
				return ast.WalkContinue, nil
			}
			out = append(out, codeBlockText(b, src))
		}
		return ast.WalkContinue, nil
	})
	return out
}

// codeBlockText concatenates every line segment under a code-block node.
func codeBlockText(n ast.Node, src []byte) string {
	var buf bytes.Buffer
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		seg := lines.At(i)
		buf.Write(seg.Value(src))
	}
	return buf.String()
}
