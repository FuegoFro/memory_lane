/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SelectionBar } from '../SelectionBar';

describe('SelectionBar', () => {
  it('renders the selection count', () => {
    render(
      <SelectionBar
        count={3}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('disables the button for the common status', () => {
    render(
      <SelectionBar
        count={2}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    const slideshowBtn = screen.getByRole('button', { name: /slideshow/i });
    expect(slideshowBtn).toBeDisabled();
  });

  it('enables all three when status is mixed', () => {
    render(
      <SelectionBar
        count={2}
        commonStatus="mixed"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /slideshow/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /just arrived/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /set aside/i })).not.toBeDisabled();
  });

  it('calls onMoveTo with the right status', () => {
    const onMoveTo = vi.fn();
    render(
      <SelectionBar
        count={1}
        commonStatus="staging"
        onMoveTo={onMoveTo}
        onClear={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /set aside/i }));
    expect(onMoveTo).toHaveBeenCalledWith('disabled');
  });

  it('calls onClear when × is clicked', () => {
    const onClear = vi.fn();
    render(
      <SelectionBar
        count={1}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
