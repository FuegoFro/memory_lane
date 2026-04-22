/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EditorToolbar } from '../EditorToolbar';

describe('EditorToolbar', () => {
  const counts = { active: 42, staging: 4, disabled: 6 };

  it('renders the three section-jump pills with counts', () => {
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    expect(screen.getByText('In the slideshow')).toBeInTheDocument();
    expect(screen.getByText('Just arrived')).toBeInTheDocument();
    expect(screen.getByText('Set aside')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();
  });

  it('calls onJump with the section key when a pill is clicked', () => {
    const onJump = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={onJump}
      />
    );
    fireEvent.click(screen.getByText('Just arrived'));
    expect(onJump).toHaveBeenCalledWith('staging');
  });

  it('highlights Just arrived when staging count > 0', () => {
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    const pill = screen.getByText('Just arrived').closest('button') as HTMLElement;
    expect(pill.style.background).toBe('var(--color-accent-soft)');
  });

  it('emits onSearchChange as the user types', () => {
    const onSearchChange = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={onSearchChange}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), {
      target: { value: 'beach' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('beach');
  });

  it('emits onDensityChange when the slider moves', () => {
    const onDensityChange = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={onDensityChange}
        onJump={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText(/grid density/i), {
      target: { value: '8' },
    });
    expect(onDensityChange).toHaveBeenCalledWith(8);
  });
});
