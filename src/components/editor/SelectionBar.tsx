'use client';

import { Icon } from '@/components/ui/Icon';
import { EntryStatus } from '@/types';

interface SelectionBarProps {
  count: number;
  commonStatus: EntryStatus | 'mixed';
  onMoveTo: (status: EntryStatus) => void;
  onClear: () => void;
}

const DESTS: { label: string; status: EntryStatus; dot: string }[] = [
  { label: 'Slideshow', status: 'active', dot: 'var(--color-accent)' },
  { label: 'Just arrived', status: 'staging', dot: 'var(--color-staging)' },
  { label: 'Set aside', status: 'disabled', dot: 'var(--color-disabled-ink)' },
];

export function SelectionBar({ count, commonStatus, onMoveTo, onClear }: SelectionBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-ink)',
        color: 'var(--color-paper)',
        borderRadius: 999,
        padding: '8px 8px 8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
        zIndex: 40,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ fontSize: 12 }}>{count} selected</span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
      <span style={{ fontSize: 11, opacity: 0.7 }}>Move to:</span>
      {DESTS.map((d) => {
        const disabled = commonStatus === d.status;
        return (
          <button
            key={d.status}
            disabled={disabled}
            onClick={() => onMoveTo(d.status)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 999,
              background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: disabled ? 'rgba(255,255,255,0.35)' : 'var(--color-paper)',
              border: 0,
              cursor: disabled ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.dot }} />
            {d.label}
          </button>
        );
      })}
      <button
        aria-label="Clear selection"
        onClick={onClear}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--color-paper)',
          border: 0,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}
