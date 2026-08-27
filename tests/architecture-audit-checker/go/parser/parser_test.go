package parser

import "testing"

// TestExtractTablesParsesTwoRowTable verifies the parser scaffold can extract
// a simple GFM table with two body rows. This is the smoke test for the
// goldmark Table extension wiring; the 17 Correctness Properties are
// implemented in later tasks.
func TestExtractTablesParsesTwoRowTable(t *testing.T) {
	md := `# sample

| field | subsystem |
| --- | --- |
| cpp_signature | sql-schema |
| tags | validators |
`

	tables := ExtractTables(md)
	if len(tables) != 1 {
		t.Fatalf("want 1 table, got %d", len(tables))
	}

	got := tables[0]
	wantHeaders := []string{"field", "subsystem"}
	if !equalStrings(got.Headers, wantHeaders) {
		t.Errorf("headers: want %v, got %v", wantHeaders, got.Headers)
	}

	if len(got.Rows) != 2 {
		t.Fatalf("rows: want 2, got %d", len(got.Rows))
	}

	wantRow0 := []string{"cpp_signature", "sql-schema"}
	wantRow1 := []string{"tags", "validators"}
	if !equalStrings(got.Rows[0], wantRow0) {
		t.Errorf("row 0: want %v, got %v", wantRow0, got.Rows[0])
	}
	if !equalStrings(got.Rows[1], wantRow1) {
		t.Errorf("row 1: want %v, got %v", wantRow1, got.Rows[1])
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
