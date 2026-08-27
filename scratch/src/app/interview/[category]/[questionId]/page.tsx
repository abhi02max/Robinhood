import LegacyPageHost from '../../../components/LegacyPageHost';

export default async function InterviewPracticePage({ params }: { params: Promise<{ category: string, questionId: string }> }) {
  const resolved = await params;
  return (
    <LegacyPageHost
      routePath={`/interview/${resolved.category}/${resolved.questionId}`}
      params={{ category: resolved.category, questionId: resolved.questionId }}
      pageKey="interview-practice"
    />
  );
}
