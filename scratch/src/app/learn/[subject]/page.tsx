import LegacyPageHost from '../../components/LegacyPageHost';

export default async function LearnSubjectPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Merge route params with query params for the legacy page
  const legacyParams: Record<string, string> = {
    subject: resolvedParams.subject,
  };
  
  // Only add topic if it exists as a string
  if (typeof resolvedSearchParams.topic === 'string') {
    legacyParams.topic = resolvedSearchParams.topic;
  }
  
  return (
    <LegacyPageHost 
      routePath={`/learn/${resolvedParams.subject}`} 
      params={legacyParams} 
      pageKey="learn-subject" 
    />
  );
}

