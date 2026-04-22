/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Icon } from '../Icon';

describe('Icon', () => {
  it('renders an svg with default size', () => {
    const { container } = render(<Icon name="play" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('14');
    expect(svg!.getAttribute('height')).toBe('14');
  });

  it('respects size prop', () => {
    const { container } = render(<Icon name="play" size={24} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('applies stroke prop', () => {
    const { container } = render(<Icon name="check" stroke="#ff0000" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('#ff0000');
  });

  it('renders a known icon name without warning', () => {
    const names = [
      'play', 'pause', 'prev', 'next', 'mic', 'stop', 'check', 'x',
      'chev', 'chevR', 'chevL', 'sync', 'search', 'grid', 'drag',
      'trash', 'sound', 'eye', 'rotate', 'arrow',
    ] as const;
    for (const name of names) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });
});
