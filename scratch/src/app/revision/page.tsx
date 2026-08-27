import LegacyPageHost from '../components/LegacyPageHost';

export default async function RevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const legacyParams: Record<string, string> = {};

  if (typeof resolvedSearchParams.topicId === 'string') {
    legacyParams.topicId = resolvedSearchParams.topicId;
  }

  return (
    <LegacyPageHost
      routePath="/revision"
      params={Object.keys(legacyParams).length ? legacyParams : undefined}
      pageKey="revision"
    />
  );
}

