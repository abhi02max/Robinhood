import { memo } from 'react';

type StatItem = { label: string; value: string | number; suffix?: string };

function StatGridInner({ items, columns = 4 }: { items: StatItem[]; columns?: number }) {
  return (
    <div className="pp-stat-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map((item, i) => (
        <div key={i} className="pp-stat-grid__cell">
          <div className="pp-stat-grid__value">{item.value}{item.suffix || ''}</div>
          <div className="pp-stat-grid__label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

const StatGrid = memo(StatGridInner);
export default StatGrid;
