import ProblemPage from './ProblemPage';

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <ProblemPage id={resolved.id} />;
}

