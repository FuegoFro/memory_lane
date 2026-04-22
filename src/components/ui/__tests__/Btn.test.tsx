/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Btn } from '../Btn';

describe('Btn', () => {
  it('renders children', () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Go</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick} disabled>Go</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant background', () => {
    render(<Btn kind="primary">Primary</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('var(--color-ink)');
    expect(btn.style.color).toBe('var(--color-paper)');
  });

  it('applies accent variant', () => {
    render(<Btn kind="accent">Accent</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('var(--color-accent)');
  });

  it('applies ghost variant with border', () => {
    render(<Btn kind="ghost">Ghost</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
    expect(btn.style.border).toContain('var(--color-rule)');
  });
});
