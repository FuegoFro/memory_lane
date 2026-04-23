'use client';

import { CSSProperties, DragEvent, MouseEvent, useState } from 'react';
import { Photo } from './Photo';
import { Icon } from './Icon';

export interface ThumbEntry {
  id: string;
  title: string;
  year: number | null;
  kind: 'photo' | 'video';
  src: string;
  hasNarration: boolean;
  duration: string | null; // "m:ss" or null
}

interface ThumbProps {
  entry: ThumbEntry;
  index?: number;
  showPosition?: boolean;
  selected: boolean;
  multiSelectActive: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onOpen?: () => void;
  onToggleSelect?: (e: MouseEvent) => void;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
}

export function Thumb({
  entry,
  index,
  showPosition = false,
  selected,
  multiSelectActive,
  draggable = false,
  dragging = false,
  dragOver = false,
  onOpen,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ThumbProps) {
  const [hover, setHover] = useState(false);
  const showCheck = multiSelectActive || hover || selected;

  const outline =
    dragOver || selected
      ? '2px solid var(--color-accent)'
      : '1px solid var(--color-rule)';

  const monoTag: CSSProperties = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    color: 'var(--color-paper)',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => {
        if (e.shiftKey) {
          // Prevent browser text/image selection on shift-click
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-thumb-check]')) return;
        if (e.shiftKey && onToggleSelect) {
          e.preventDefault();
          onToggleSelect(e);
          return;
        }
        onOpen?.();
      }}
      style={{
        position: 'relative',
        cursor: draggable ? 'grab' : 'pointer',
        opacity: dragging ? 0.3 : 1,
        transition: 'opacity 0.15s',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 6,
          overflow: 'hidden',
          outline,
          outlineOffset: selected || dragOver ? 0 : -1,
        }}
      >
        <Photo
          src={entry.src}
          alt={entry.title}
          style={{ width: '100%', aspectRatio: '4 / 3' }}
        />

        {showPosition && typeof index === 'number' ? (
          <div style={{ ...monoTag, top: 6, left: 6, letterSpacing: 0.05 }}>
            {String(index).padStart(2, '0')}
          </div>
        ) : null}

        {entry.kind === 'video' && entry.duration ? (
          <div style={{ ...monoTag, bottom: 6, right: 6 }}>▶ {entry.duration}</div>
        ) : null}

        {entry.kind === 'photo' && entry.hasNarration && entry.duration ? (
          <div
            style={{
              ...monoTag,
              bottom: 6,
              right: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="sound" size={9} stroke="var(--color-paper)" sw={1.8} />
            {entry.duration}
          </div>
        ) : null}

        {showCheck ? (
          <div
            data-thumb-check
            data-testid="thumb-check"
            onMouseDown={(e) => {
              if (e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) e.preventDefault();
              onToggleSelect?.(e);
            }}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `1.5px solid ${
                selected ? 'var(--color-accent)' : 'rgba(255,255,255,0.85)'
              }`,
              background: selected ? 'var(--color-accent)' : 'rgba(0,0,0,0.25)',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.12s',
              cursor: 'pointer',
            }}
          >
            {selected ? (
              <Icon name="check" size={13} stroke="var(--color-paper)" sw={2.5} />
            ) : null}
          </div>
        ) : null}

        {draggable && hover && !selected ? (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: showPosition ? 38 : 6,
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="drag" size={12} stroke="var(--color-paper)" sw={1.8} />
          </div>
        ) : null}
      </div>

      <div style={{ paddingTop: 7, paddingLeft: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entry.title}
        </div>
        {entry.year ? (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--color-ink3)',
              marginTop: 2,
              letterSpacing: 0.1,
            }}
          >
            {entry.year}
          </div>
        ) : null}
      </div>
    </div>
  );
}
