/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Pill } from '../Pill';

describe('Pill', () => {
  it('renders children', () => {
    render(<Pill>In the slideshow</Pill>);
    expect(screen.getByText('In the slideshow')).toBeInTheDocument();
  });

  it('renders a dot when dot color is given', () => {
    const { container } = render(<Pill dot="#b14a2a">Active</Pill>);
    const dot = container.querySelector('[data-pill-dot]');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.background).toBe('rgb(177, 74, 42)');
  });

  it('renders a mono count when count is given', () => {
    render(<Pill count={7}>Staging</Pill>);
    expect(screen.getByText('07')).toBeInTheDocument();
  });

  it('does not render a count when count is undefined', () => {
    const { container } = render(<Pill>Just arrived</Pill>);
    expect(container.querySelector('[data-pill-count]')).toBeNull();
  });
});
