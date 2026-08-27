import { memo, type ReactNode } from 'react';

type BadgeVariant = 'easy' | 'medium' | 'hard' | 'success' | 'warn' | 'error' | 'info' | 'neutral';

function BadgeInner({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`pp-badge pp-badge--${variant}`}>{children}</span>;
}

const Badge = memo(BadgeInner);
export default Badge;
