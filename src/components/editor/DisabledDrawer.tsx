'use client';

import { ReactNode } from 'react';
import { Entry } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import { SECTION_IDS } from './shared';

interface DisabledDrawerProps {
  entries: Entry[];
  open: boolean;
  onToggle: () => void;
  children: ReactNode; // grid contents, rendered only when open
}

export function DisabledDrawer({ entries, open, onToggle, children }: DisabledDrawerProps) {
  return (
    <section id={SECTION_IDS.disabled} style={{ margin: '24px 0 0' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          padding: '24px 0 14px',
          borderBottom: '1px solid var(--color-rule)',
          marginBottom: 14,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-disabled-ink)' }} />
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 26,
            letterSpacing: -0.3,
          }}
        >
          Set aside
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink3)', letterSpacing: 0.15 }}>
          {String(entries.length).padStart(2, '0')} · hidden from slideshow
        </span>
        <div style={{ flex: 1 }} />
        <Icon
          name="chev"
          size={14}
          stroke="var(--color-ink3)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>
      {!open && entries.length > 0 ? (
        <div
          onClick={onToggle}
          style={{ display: 'flex', gap: 10, paddingBottom: 24, overflow: 'hidden', cursor: 'pointer' }}
        >
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} data-testid="drawer-peek-thumb" style={{ flexShrink: 0, width: 80 }}>
              <Photo
                src={`/api/media/${e.id}`}
                alt={e.title ?? ''}
                rounded={4}
                style={{ width: 80, height: 60, filter: 'grayscale(0.6) opacity(0.6)' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink3)' }}>Click to open</span>
          </div>
        </div>
      ) : null}
      {open ? children : null}
    </section>
  );
}
