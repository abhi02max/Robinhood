import LegacyPageHost from '../../../../components/LegacyPageHost';

export default async function LearnTopicPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}) {
  const resolvedParams = await params;

  return (
    <LegacyPageHost
      routePath={`/learn/${resolvedParams.subject}/topic/${resolvedParams.topic}`}
      params={{
        subject: resolvedParams.subject,
        topic: resolvedParams.topic,
      }}
      pageKey="learn-topic"
    />
  );
}
