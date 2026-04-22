'use client';

import { ReactNode } from 'react';

interface SectionHeaderProps {
  id: string;
  label: string;
  count: number;
  color: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export function SectionHeader({ id, label, count, color, hint, rightSlot }: SectionHeaderProps) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        padding: '24px 0 14px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: 18,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 26,
          letterSpacing: -0.3,
          color: 'var(--color-ink)',
        }}
      >
        {label}
      </h2>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-ink3)',
          letterSpacing: 0.15,
        }}
      >
        {String(count).padStart(2, '0')}
        {hint ? ` · ${hint}` : ''}
      </span>
      <div style={{ flex: 1 }} />
      {rightSlot}
    </div>
  );
}
