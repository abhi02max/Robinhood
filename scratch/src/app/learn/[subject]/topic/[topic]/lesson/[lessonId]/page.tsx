import LegacyPageHost from '../../../../../../components/LegacyPageHost';

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string; lessonId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <LegacyPageHost
      routePath={`/learn/${resolvedParams.subject}/topic/${resolvedParams.topic}/lesson/${resolvedParams.lessonId}`}
      params={{
        subject: resolvedParams.subject,
        topic: resolvedParams.topic,
        lessonId: resolvedParams.lessonId,
      }}
      pageKey="learn-lesson"
    />
  );
}

