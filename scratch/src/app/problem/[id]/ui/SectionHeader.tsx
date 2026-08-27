import { memo } from 'react';

function SectionHeaderInner({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="pp-section-header">
      <span className="pp-section-header__icon">{icon}</span>
      <span className="pp-section-header__title">{title}</span>
    </div>
  );
}

const SectionHeader = memo(SectionHeaderInner);
export default SectionHeader;
