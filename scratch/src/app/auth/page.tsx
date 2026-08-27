import LegacyPageHost from '../components/LegacyPageHost';

export default function AuthPage() {
  return <LegacyPageHost routePath="/auth" pageKey="auth" requireAuth={false} showSidebar={false} />;
}

