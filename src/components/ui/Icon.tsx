import { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'play' | 'pause' | 'prev' | 'next'
  | 'mic' | 'stop' | 'check' | 'x'
  | 'chev' | 'chevR' | 'chevL'
  | 'sync' | 'search' | 'grid' | 'drag' | 'trash'
  | 'sound' | 'eye' | 'rotate' | 'arrow';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  sw?: number;
  style?: CSSProperties;
  className?: string;
}

const PATHS: Record<IconName, (stroke: string) => ReactNode> = {
  play: (s) => <polygon points="5,4 19,12 5,20" fill={s} stroke="none" />,
  pause: (s) => (
    <g>
      <rect x="6" y="5" width="4" height="14" fill={s} />
      <rect x="14" y="5" width="4" height="14" fill={s} />
    </g>
  ),
  prev: () => <polyline points="15,6 9,12 15,18" fill="none" />,
  next: () => <polyline points="9,6 15,12 9,18" fill="none" />,
  mic: () => (
    <g>
      <rect x="9" y="3" width="6" height="12" rx="3" fill="none" />
      <path d="M5 11c0 4 3 7 7 7s7-3 7-7M12 18v3" fill="none" />
    </g>
  ),
  stop: (s) => <rect x="6" y="6" width="12" height="12" rx="1" fill={s} />,
  check: () => <polyline points="4,12 10,18 20,6" fill="none" />,
  x: () => (
    <g>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </g>
  ),
  chev: () => <polyline points="6,9 12,15 18,9" fill="none" />,
  chevR: () => <polyline points="9,6 15,12 9,18" fill="none" />,
  chevL: () => <polyline points="15,6 9,12 15,18" fill="none" />,
  sync: () => (
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" fill="none" />
  ),
  search: () => (
    <g>
      <circle cx="11" cy="11" r="6" fill="none" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </g>
  ),
  grid: () => (
    <g>
      <rect x="4" y="4" width="7" height="7" fill="none" />
      <rect x="13" y="4" width="7" height="7" fill="none" />
      <rect x="4" y="13" width="7" height="7" fill="none" />
      <rect x="13" y="13" width="7" height="7" fill="none" />
    </g>
  ),
  drag: (s) => (
    <g>
      <circle cx="9" cy="6" r="1.3" fill={s} />
      <circle cx="15" cy="6" r="1.3" fill={s} />
      <circle cx="9" cy="12" r="1.3" fill={s} />
      <circle cx="15" cy="12" r="1.3" fill={s} />
      <circle cx="9" cy="18" r="1.3" fill={s} />
      <circle cx="15" cy="18" r="1.3" fill={s} />
    </g>
  ),
  trash: () => (
    <g>
      <polyline points="4,7 20,7" fill="none" />
      <path d="M6 7l1 13h10l1-13M10 7V4h4v3" fill="none" />
    </g>
  ),
  sound: () => (
    <g>
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="none" />
      <path d="M16 9a4 4 0 0 1 0 6" fill="none" />
    </g>
  ),
  eye: () => (
    <g>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" />
      <circle cx="12" cy="12" r="3" fill="none" />
    </g>
  ),
  rotate: () => <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" fill="none" />,
  arrow: () => (
    <g>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13,6 19,12 13,18" fill="none" />
    </g>
  ),
};

export function Icon({
  name,
  size = 14,
  stroke = 'currentColor',
  sw = 1.5,
  style,
  className,
}: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {PATHS[name](stroke)}
    </svg>
  );
}
