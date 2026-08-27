import LegacyPageHost from '../../components/LegacyPageHost';

export default async function RevisionTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <LegacyPageHost
      routePath={`/revision/${resolvedParams.topicId}`}
      params={{ topicId: resolvedParams.topicId }}
      pageKey="revision-topic"
    />
  );
}

