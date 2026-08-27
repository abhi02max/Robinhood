import LegacyPageHost from '../../../../../../components/LegacyPageHost';

export default async function LearnSubtopicPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string; subtopic: string }>;
}) {
  const resolvedParams = await params;

  return (
    <LegacyPageHost
      routePath={`/learn/${resolvedParams.subject}/topic/${resolvedParams.topic}/subtopic/${resolvedParams.subtopic}`}
      params={{
        subject: resolvedParams.subject,
        topic: resolvedParams.topic,
        subtopic: resolvedParams.subtopic,
      }}
      pageKey="learn-subtopic"
    />
  );
}
