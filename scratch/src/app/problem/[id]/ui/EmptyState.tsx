import { memo } from 'react';

function EmptyStateInner({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="pp-idle">
      <div className="pp-idle__icon">{icon}</div>
      <span>{message}</span>
    </div>
  );
}

const EmptyState = memo(EmptyStateInner);
export default EmptyState;
