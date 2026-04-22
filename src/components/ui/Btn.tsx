import { CSSProperties, MouseEvent, ReactNode } from 'react';

export type BtnKind = 'primary' | 'accent' | 'danger' | 'ghost' | 'subtle' | 'clear';

interface BtnProps {
  kind?: BtnKind;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

function variantStyle(kind: BtnKind): CSSProperties {
  switch (kind) {
    case 'primary':
      return { background: 'var(--color-ink)', color: 'var(--color-paper)' };
    case 'accent':
      return { background: 'var(--color-accent)', color: 'var(--color-paper)' };
    case 'danger':
      return { background: '#c04a3a', color: 'var(--color-paper)' };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--color-ink2)',
        border: '1px solid var(--color-rule)',
      };
    case 'subtle':
      return { background: 'var(--color-paper2)', color: 'var(--color-ink2)' };
    case 'clear':
      return { background: 'transparent', color: 'var(--color-ink3)' };
  }
}

export function Btn({
  kind = 'ghost',
  children,
  onClick,
  style = {},
  className = '',
  disabled = false,
  title,
  type = 'button',
}: BtnProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 0,
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      style={{ ...base, ...variantStyle(kind), ...style }}
    >
      {children}
    </button>
  );
}
