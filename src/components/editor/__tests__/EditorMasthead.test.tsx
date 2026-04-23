/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EditorMasthead } from '../EditorMasthead';

describe('EditorMasthead', () => {
  it('renders wordmark and tagline', () => {
    render(
      <EditorMasthead
        syncing={false}
        canPlay={true}
        onSync={() => {}}
        onPlay={() => {}}
        onLogout={() => {}}
      />
    );

    expect(screen.getByText('Memory Lane')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();
  });

  it('renders custom tagline', () => {
    render(
      <EditorMasthead
        tagline="Custom Tag"
        syncing={false}
        canPlay={true}
        onSync={() => {}}
        onPlay={() => {}}
        onLogout={() => {}}
      />
    );

    expect(screen.getByText('Custom Tag')).toBeInTheDocument();
  });

  it('calls onSync when sync button is clicked', () => {
    const onSync = vi.fn();
    render(
      <EditorMasthead
        syncing={false}
        canPlay={true}
        onSync={onSync}
        onPlay={() => {}}
        onLogout={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Sync from Dropbox'));
    expect(onSync).toHaveBeenCalled();
  });

  it('calls onPlay when play button is clicked', () => {
    const onPlay = vi.fn();
    render(
      <EditorMasthead
        syncing={false}
        canPlay={true}
        onSync={() => {}}
        onPlay={onPlay}
        onLogout={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Play slideshow'));
    expect(onPlay).toHaveBeenCalled();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();
    render(
      <EditorMasthead
        syncing={false}
        canPlay={true}
        onSync={() => {}}
        onPlay={() => {}}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
  });

  it('disables sync button when syncing is true', () => {
    render(
      <EditorMasthead
        syncing={true}
        canPlay={true}
        onSync={() => {}}
        onPlay={() => {}}
        onLogout={() => {}}
      />
    );

    const syncBtn = screen.getByText('Syncing…');
    expect(syncBtn).toBeDisabled();
  });

  it('disables play button when canPlay is false', () => {
    render(
      <EditorMasthead
        syncing={false}
        canPlay={false}
        onSync={() => {}}
        onPlay={() => {}}
        onLogout={() => {}}
      />
    );

    const playBtn = screen.getByText('Play slideshow');
    expect(playBtn).toBeDisabled();
  });
});
