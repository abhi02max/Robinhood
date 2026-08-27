import LegacyPageHost from '../components/LegacyPageHost';

export default async function SqlTrackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const legacyParams: Record<string, string> = {};

  if (typeof resolvedSearchParams.level === 'string') {
    legacyParams.level = resolvedSearchParams.level;
  }

  return (
    <LegacyPageHost
      routePath="/sql-track"
      params={Object.keys(legacyParams).length ? legacyParams : undefined}
      pageKey="sql-track"
    />
  );
}
