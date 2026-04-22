/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Photo } from '../Photo';

describe('Photo', () => {
  it('renders an <img> when src is provided', () => {
    render(<Photo src="/api/media/abc" alt="Grand Canyon" />);
    const img = screen.getByRole('img', { name: 'Grand Canyon' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/media/abc');
  });

  it('renders a placeholder (no img) when src is omitted', () => {
    const { container } = render(<Photo hue={180} tone="warm" alt="placeholder" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.photo-grain')).not.toBeNull();
  });

  it('applies rounded corners via style', () => {
    const { container } = render(<Photo src="/x" alt="x" rounded={8} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.borderRadius).toBe('8px');
  });

  it('forwards className and style to the root', () => {
    const { container } = render(
      <Photo src="/x" alt="x" className="my-photo" style={{ width: 200 }} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('my-photo');
    expect(root.style.width).toBe('200px');
  });
});
