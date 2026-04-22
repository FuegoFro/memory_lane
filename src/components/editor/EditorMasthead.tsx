'use client';

import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';

interface EditorMastheadProps {
  tagline?: string;
  syncing: boolean;
  canPlay: boolean;
  onSync: () => void;
  onPlay: () => void;
}

export function EditorMasthead({ tagline, syncing, canPlay, onSync, onPlay }: EditorMastheadProps) {
  return (
    <header
      style={{
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'baseline',
        gap: 20,
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          Memory Lane
        </h1>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink3)',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {tagline ?? 'Editing'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <Btn kind="ghost" onClick={onSync} disabled={syncing}>
        <Icon name="sync" size={12} /> {syncing ? 'Syncing…' : 'Sync from Dropbox'}
      </Btn>
      <Btn kind="primary" onClick={onPlay} disabled={!canPlay}>
        <Icon name="play" size={11} stroke="var(--color-paper)" /> Play slideshow
      </Btn>
    </header>
  );
}
