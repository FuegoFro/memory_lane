/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DisabledDrawer } from '../DisabledDrawer';
import { Entry } from '@/types';

function makeEntry(id: string): Entry {
  return {
    id,
    dropbox_path: `/p/${id}.jpg`,
    title: `Entry ${id}`,
    transcript: null,
    position: null,
    disabled: 1,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
  };
}

describe('DisabledDrawer', () => {
  it('renders the header with the count', () => {
    render(
      <DisabledDrawer
        entries={[makeEntry('1'), makeEntry('2')]}
        open={false}
        onToggle={() => {}}
      >
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.getByText('Set aside')).toBeInTheDocument();
    expect(screen.getByText(/02/)).toBeInTheDocument();
    expect(screen.getByText(/hidden from slideshow/i)).toBeInTheDocument();
  });

  it('shows peek thumbnails when closed', () => {
    render(
      <DisabledDrawer
        entries={[makeEntry('1'), makeEntry('2')]}
        open={false}
        onToggle={() => {}}
      >
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.queryByTestId('grid-slot')).toBeNull();
    expect(screen.getAllByTestId('drawer-peek-thumb')).toHaveLength(2);
  });

  it('renders children when open', () => {
    render(
      <DisabledDrawer entries={[makeEntry('1')]} open={true} onToggle={() => {}}>
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.getByTestId('grid-slot')).toBeInTheDocument();
  });

  it('peek thumbnails use the protected edit media endpoint', () => {
    render(
      <DisabledDrawer
        entries={[makeEntry('abc'), makeEntry('def')]}
        open={false}
        onToggle={() => {}}
      >
        <div />
      </DisabledDrawer>
    );
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    imgs.forEach((img) => {
      expect(img).toHaveAttribute('src', expect.stringContaining('/api/edit/media/'));
    });
  });

  it('calls onToggle when the header is clicked', () => {
    const onToggle = vi.fn();
    render(
      <DisabledDrawer entries={[]} open={false} onToggle={onToggle}>
        <div />
      </DisabledDrawer>
    );
    fireEvent.click(screen.getByText('Set aside'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
