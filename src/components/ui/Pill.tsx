import { CSSProperties, ReactNode } from 'react';

interface PillProps {
  children?: ReactNode;
  dot?: string;
  count?: number;
  bg?: string;
  fg?: string;
  style?: CSSProperties;
  className?: string;
}

export function Pill({
  children,
  dot,
  count,
  bg,
  fg,
  style = {},
  className = '',
}: PillProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: bg ?? 'rgba(0,0,0,0.06)',
        color: fg ?? 'var(--color-ink2)',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        ...style,
      }}
    >
      {dot ? (
        <span
          data-pill-dot
          style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}
        />
      ) : null}
      {children}
      {typeof count === 'number' ? (
        <span
          data-pill-count
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: 0.1,
            opacity: 0.7,
          }}
        >
          {String(count).padStart(2, '0')}
        </span>
      ) : null}
    </span>
  );
}
