'use client';

import { ChangeEvent } from 'react';
import { Icon } from '@/components/ui/Icon';

export type SectionKey = 'active' | 'staging' | 'disabled';

interface EditorToolbarProps {
  counts: Record<SectionKey, number>;
  search: string;
  onSearchChange: (q: string) => void;
  density: number; // 4..8
  onDensityChange: (d: number) => void;
  onJump: (key: SectionKey) => void;
}

const DEFS: { key: SectionKey; label: string; color: string }[] = [
  { key: 'active', label: 'In the slideshow', color: 'var(--color-accent)' },
  { key: 'staging', label: 'Just arrived', color: 'var(--color-staging)' },
  { key: 'disabled', label: 'Set aside', color: 'var(--color-disabled-ink)' },
];

export function EditorToolbar({
  counts,
  search,
  onSearchChange,
  density,
  onDensityChange,
  onJump,
}: EditorToolbarProps) {
  return (
    <div
      style={{
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {DEFS.map((d) => {
          const hot = d.key === 'staging' && counts.staging > 0;
          return (
            <button
              key={d.key}
              onClick={() => onJump(d.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 999,
                background: hot ? 'var(--color-accent-soft)' : 'transparent',
                border: hot ? '1px solid var(--color-accent)' : '1px solid transparent',
                fontSize: 12,
                color: 'var(--color-ink2)',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
              {d.label}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)' }}>
                {String(counts[d.key]).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-paper2)',
          padding: '6px 12px',
          borderRadius: 999,
          width: 260,
        }}
      >
        <Icon name="search" size={12} stroke="var(--color-ink3)" />
        <input
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder="Search titles, transcripts, years…"
          style={{
            border: 0,
            background: 'transparent',
            outline: 'none',
            fontSize: 12,
            flex: 1,
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        {search ? (
          <button aria-label="Clear search" onClick={() => onSearchChange('')} style={{ background: 'transparent', border: 0, color: 'var(--color-ink3)', cursor: 'pointer' }}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-rule)' }}>
        <Icon name="grid" size={12} stroke="var(--color-ink3)" />
        <input
          type="range"
          aria-label="Grid density"
          min={4}
          max={8}
          step={1}
          value={density}
          onChange={(e) => onDensityChange(Number(e.target.value))}
          style={{ width: 70 }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)', minWidth: 16 }}>{density}</span>
      </div>
    </div>
  );
}
