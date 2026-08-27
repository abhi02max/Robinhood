'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';

export default function CollapsibleSection({ icon, title, defaultOpen = false, children }: {
  icon: string; title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      setHeight(bodyRef.current.scrollHeight);
      const timer = setTimeout(() => setHeight(undefined), 300);
      return () => clearTimeout(timer);
    } else {
      setHeight(bodyRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  return (
    <div className={`pp-collapsible ${open ? 'pp-collapsible--open' : ''}`}>
      <button className="pp-collapsible__trigger" onClick={() => setOpen(!open)} type="button">
        <span className="pp-collapsible__icon">{icon}</span>
        <span className="pp-collapsible__title">{title}</span>
        <span className={`pp-collapsible__chevron ${open ? 'pp-collapsible__chevron--open' : ''}`}>▾</span>
      </button>
      <div className="pp-collapsible__body" ref={bodyRef} style={{ height: height !== undefined ? height : 'auto', overflow: 'hidden', transition: 'height 0.25s ease' }}>
        {children}
      </div>
    </div>
  );
}
