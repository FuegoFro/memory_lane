import { CSSProperties, ReactNode } from 'react';

export type PhotoTone = 'warm' | 'cool' | 'dusk' | 'rose' | 'gray';

interface PhotoProps {
  src?: string;
  alt?: string;
  hue?: number;
  tone?: PhotoTone;
  rounded?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function placeholderBackground(hue: number, tone: PhotoTone): string {
  const sat =
    tone === 'gray' ? '4%' :
    tone === 'cool' ? '22%' :
    tone === 'rose' ? '32%' :
    '36%';
  return `radial-gradient(ellipse at 30% 25%, hsl(${hue} ${sat} 52%) 0%, hsl(${hue - 20} ${sat} 30%) 35%, hsl(${hue + 10} ${sat} 18%) 100%)`;
}

export function Photo({
  src,
  alt = '',
  hue = 30,
  tone = 'warm',
  rounded = 0,
  className = '',
  style = {},
  children,
}: PhotoProps) {
  const rootStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: rounded,
    background: src ? 'var(--color-paper2)' : placeholderBackground(hue, tone),
    ...style,
  };

  return (
    <div className={`photo-grain ${className}`} style={rootStyle}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
      {children}
    </div>
  );
}
