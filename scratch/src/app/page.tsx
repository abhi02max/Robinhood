import LegacyPageHost from './components/LegacyPageHost';

export default function HomePage() {
  return <LegacyPageHost routePath="/" pageKey="landing" requireAuth={false} showSidebar={false} />;
}

