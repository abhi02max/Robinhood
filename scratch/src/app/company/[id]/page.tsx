import LegacyPageHost from '../../components/LegacyPageHost';

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <LegacyPageHost routePath={`/company/${resolved.id}`} params={{ id: resolved.id }} pageKey="company-detail" />;
}

