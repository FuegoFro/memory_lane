'use client';

import { Icon } from '@/components/ui/Icon';

interface ViewerControlsProps {
  visible: boolean;
  currentIndex: number;
  totalEntries: number;
  autoAdvanceDelay: number;
  showTitles: boolean;
  isNarrationPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleNarration: () => void;
  onToggleAutoAdvance: () => void;
  onToggleTitles: () => void;
  canPlay: boolean;
}

export function ViewerControls({
  visible,
  currentIndex,
  totalEntries,
  autoAdvanceDelay,
  showTitles,
  isNarrationPlaying,
  onPrev,
  onNext,
  onToggleNarration,
  onToggleAutoAdvance,
  onToggleTitles,
  canPlay,
}: ViewerControlsProps) {
  const chromeClass = `viewer-chrome ${visible ? '' : 'idle'}`;
  const autoAdvanceOn = autoAdvanceDelay > 0;

  return (
    <>
      {/* Top chrome */}
      <div
        className={chromeClass}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '22px 28px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, letterSpacing: 0.3, color: 'var(--color-paper)' }}>
          memory lane
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 0.2, color: 'rgba(247,240,227,0.6)', textTransform: 'uppercase' }}>
          {String(currentIndex + 1).padStart(2, '0')} of {String(totalEntries).padStart(2, '0')}
        </div>
      </div>

      {/* Prev / next */}
      <button
        aria-label="Previous"
        onClick={onPrev}
        className={chromeClass}
        style={navBtn('left')}
      >
        <Icon name="chevL" size={20} stroke="var(--color-paper)" />
      </button>
      <button
        aria-label="Next"
        onClick={onNext}
        className={chromeClass}
        style={navBtn('right')}
      >
        <Icon name="chevR" size={20} stroke="var(--color-paper)" />
      </button>

      {/* Bottom chrome */}
      <div
        className={chromeClass}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '28px 28px 22px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 2,
        }}
      >
        {canPlay && (
          <button
            aria-label={isNarrationPlaying ? 'Pause narration' : 'Play narration'}
            onClick={onToggleNarration}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
              display: 'grid',
              placeItems: 'center',
              border: 0,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(26,12,4,0.4)',
            }}
          >
            <Icon name={isNarrationPlaying ? 'pause' : 'play'} size={14} stroke="var(--color-ink)" />
          </button>
        )}

        <div style={{ flex: 1 }} />

        <TogglePill label="Titles" letter="T" active={showTitles} onClick={onToggleTitles} />
        <TogglePill label="Auto-advance" letter="A" active={autoAdvanceOn} onClick={onToggleAutoAdvance} />
      </div>
    </>
  );
}

function navBtn(side: 'left' | 'right') {
  return {
    position: 'absolute' as const,
    [side]: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: 'rgba(247,240,227,0.08)',
    backdropFilter: 'blur(8px)',
    border: 0,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-paper)',
    cursor: 'pointer',
    zIndex: 2,
  };
}

function TogglePill({ label, letter, active, onClick }: { label: string; letter: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.12)',
        color: active ? 'var(--color-paper)' : 'rgba(247,240,227,0.7)',
        padding: '7px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.6 }}>{letter}</span>
      {label}
    </button>
  );
}
