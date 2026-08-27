// Package loader reads the six audit deliverable Markdown files from the
// architecture-audit spec directory into a models.Deliverables value.
//
// Missing files are tolerated: a file that does not exist surfaces as an
// empty string in the corresponding field. Any other read error
// (permission denied, I/O error) is returned to the caller.
package loader

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/robinhood/architecture-audit-checker-go/models"
)

// deliverableFiles enumerates the six expected Markdown deliverables in the
// order they appear in the architecture-audit design document. The closed
// set is enforced by Property 1; this loader never reads any other file.
var deliverableFiles = []string{
	"audit-report.md",
	"dependency-map.md",
	"migration-plan.md",
	"compatibility-strategy.md",
	"preservation-inventory.md",
	"rebuild-recommendations.md",
}

// Load reads the six audit deliverables from specDir and returns a
// populated models.Deliverables. specDir is typically
// .kiro/specs/architecture-audit/ relative to the repository root.
//
// A missing file (os.ErrNotExist) is tolerated and surfaces as an empty
// string in the corresponding field. Any other error is returned wrapped
// with the offending path.
func Load(specDir string) (models.Deliverables, error) {
	contents := make(map[string]string, len(deliverableFiles))
	for _, name := range deliverableFiles {
		full := filepath.Join(specDir, name)
		data, err := os.ReadFile(full)
		switch {
		case err == nil:
			contents[name] = string(data)
		case errors.Is(err, fs.ErrNotExist):
			contents[name] = ""
		default:
			return models.Deliverables{}, fmt.Errorf("loader: read %s: %w", full, err)
		}
	}
	return models.Deliverables{
		AuditReport:            contents["audit-report.md"],
		DependencyMap:          contents["dependency-map.md"],
		MigrationPlan:          contents["migration-plan.md"],
		CompatibilityStrategy:  contents["compatibility-strategy.md"],
		PreservationInventory:  contents["preservation-inventory.md"],
		RebuildRecommendations: contents["rebuild-recommendations.md"],
	}, nil
}
