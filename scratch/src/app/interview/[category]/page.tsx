import LegacyPageHost from '../../components/LegacyPageHost';

export default async function InterviewCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolved = await params;
  return (
    <LegacyPageHost
      routePath={`/interview/${resolved.category}`}
      params={{ category: resolved.category }}
      pageKey="interview-questions"
    />
  );
}
