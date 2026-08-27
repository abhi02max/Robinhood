import LegacyPageHost from '../components/LegacyPageHost';

export default async function SheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const legacyParams: Record<string, string> = {};

  if (typeof resolvedSearchParams.sheet === 'string') {
    legacyParams.sheet = resolvedSearchParams.sheet;
  }

  return (
    <LegacyPageHost
      routePath="/sheets"
      params={Object.keys(legacyParams).length ? legacyParams : undefined}
      pageKey="sheets"
    />
  );
}
