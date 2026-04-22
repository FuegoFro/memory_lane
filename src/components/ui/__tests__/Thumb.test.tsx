/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Thumb, ThumbEntry } from '../Thumb';

function makeEntry(overrides: Partial<ThumbEntry> = {}): ThumbEntry {
  return {
    id: 'e1',
    title: "Nonna's kitchen",
    year: 1989,
    kind: 'photo',
    src: '/api/media/e1',
    hasNarration: false,
    duration: null,
    ...overrides,
  };
}

describe('Thumb', () => {
  it('renders title and year', () => {
    render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText("Nonna's kitchen")).toBeInTheDocument();
    expect(screen.getByText('1989')).toBeInTheDocument();
  });

  it('shows position tag when showPosition is true', () => {
    render(
      <Thumb
        entry={makeEntry()}
        index={3}
        showPosition
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('does not show position tag when showPosition is false', () => {
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        index={3}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(container.textContent).not.toContain('03');
  });

  it('shows video duration tag for video kind', () => {
    render(
      <Thumb
        entry={makeEntry({ kind: 'video', duration: '1:42' })}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText(/1:42/)).toBeInTheDocument();
  });

  it('shows narration duration for photos with narration', () => {
    render(
      <Thumb
        entry={makeEntry({ hasNarration: true, duration: '0:58' })}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText(/0:58/)).toBeInTheDocument();
  });

  it('calls onOpen when the card body is clicked', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
        onOpen={onOpen}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('does not call onOpen when the checkbox is clicked', () => {
    const onOpen = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <Thumb
        entry={makeEntry()}
        selected
        multiSelectActive
        onOpen={onOpen}
        onToggleSelect={onToggleSelect}
      />
    );
    fireEvent.click(screen.getByTestId('thumb-check'));
    expect(onToggleSelect).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows the checkbox persistently when multiSelectActive', () => {
    render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive
      />
    );
    expect(screen.getByTestId('thumb-check')).toBeInTheDocument();
  });

  it('reduces opacity when dragging', () => {
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
        dragging
      />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.opacity).toBe('0.3');
  });
});
