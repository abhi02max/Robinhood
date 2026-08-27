// Loader for the six Markdown deliverables under
// .kiro/specs/architecture-audit/. The loader is read-only, takes the
// directory path as input, tolerates missing files (returns empty strings),
// and never writes outside its own track.

using Robinhood.Audit.Models;

namespace Robinhood.Audit;

/// <summary>
/// Reads the six Markdown deliverables from a spec directory into a
/// <see cref="Deliverables"/> record. Missing files yield empty strings so
/// the 17 Correctness Properties run end-to-end and report structural gaps
/// rather than crashing at I/O time.
/// </summary>
public static class Loader
{
    /// <summary>
    /// Filenames of the six audit deliverables, in the order they appear in
    /// the <see cref="Deliverables"/> record's constructor.
    /// </summary>
    public static readonly IReadOnlyList<string> DeliverableFilenames = new[]
    {
        "audit-report.md",
        "dependency-map.md",
        "migration-plan.md",
        "compatibility-strategy.md",
        "preservation-inventory.md",
        "rebuild-recommendations.md",
    };

    /// <summary>
    /// Loads the six deliverable Markdown files from <paramref name="specDir"/>.
    /// </summary>
    /// <param name="specDir">
    /// Absolute or workspace-relative path of the
    /// <c>.kiro/specs/architecture-audit/</c> directory.
    /// </param>
    /// <returns>
    /// A <see cref="Deliverables"/> populated with each file's text. Any file
    /// that does not exist on disk is represented by an empty string.
    /// </returns>
    public static Deliverables Load(string specDir)
    {
        ArgumentNullException.ThrowIfNull(specDir);

        return new Deliverables(
            AuditReport: ReadOrEmpty(specDir, "audit-report.md"),
            DependencyMap: ReadOrEmpty(specDir, "dependency-map.md"),
            MigrationPlan: ReadOrEmpty(specDir, "migration-plan.md"),
            CompatibilityStrategy: ReadOrEmpty(specDir, "compatibility-strategy.md"),
            PreservationInventory: ReadOrEmpty(specDir, "preservation-inventory.md"),
            RebuildRecommendations: ReadOrEmpty(specDir, "rebuild-recommendations.md"));
    }

    private static string ReadOrEmpty(string specDir, string filename)
    {
        var path = Path.Combine(specDir, filename);
        return File.Exists(path) ? File.ReadAllText(path) : string.Empty;
    }
}
