/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Slideshow } from '../Slideshow';
import { NarrationPlayer } from '../NarrationPlayer';
import { ViewerControls } from '../ViewerControls';

vi.mock('../NarrationPlayer', () => ({
  NarrationPlayer: vi.fn(() => <div data-testid="narration-player" />),
}));

vi.mock('../ViewerControls', () => ({
  ViewerControls: vi.fn(({ visible, onToggleNarration }) => (
    <div data-testid="viewer-controls" className={`viewer-chrome ${visible ? '' : 'idle'}`}>
      <button data-testid="toggle-narration" onClick={onToggleNarration}>Toggle</button>
    </div>
  )),
}));

describe('Slideshow', () => {
  it('hides controls after 2.5 seconds of inactivity', () => {
    vi.useFakeTimers();
    const { container } = render(
      <Slideshow
        entries={[{
          id: 'e1', dropbox_path: '/a.jpg', title: 'A',
          transcript: null, position: 1, disabled: 0, has_narration: 0,
          created_at: '', updated_at: '',
        }]}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );
    // simulate activity, then wait
    fireEvent.mouseMove(window);
    act(() => { vi.advanceTimersByTime(2499); });
    // controls still visible
    expect(container.querySelector('.viewer-chrome.idle')).toBeNull();
    act(() => { vi.advanceTimersByTime(2); });
    expect(container.querySelector('.viewer-chrome.idle')).not.toBeNull();
    vi.useRealTimers();
  });

  it('does not toggle narration when canPlay is false (no narration, not video)', () => {
    const entries = [{
      id: 'e1', dropbox_path: '/a.jpg', title: 'A',
      transcript: null, position: 1, disabled: 0, has_narration: 0,
      created_at: '', updated_at: '',
    }];
    const { getByTestId } = render(
      <Slideshow
        entries={entries}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );

    const toggleBtn = getByTestId('toggle-narration');
    fireEvent.click(toggleBtn);

    // Check if NarrationPlayer was called with isPlaying: true
    // In current implementation it WILL be called with isPlaying: true because it doesn't check canPlay
    const narrationPlayerCalls = vi.mocked(NarrationPlayer).mock.calls;
    const lastCall = narrationPlayerCalls[narrationPlayerCalls.length - 1];
    expect(lastCall[0].isPlaying).toBe(false);
  });

  it('toggles narration when canPlay is true (has narration)', () => {
    const entries = [{
      id: 'e1', dropbox_path: '/a.jpg', title: 'A',
      transcript: null, position: 1, disabled: 0, has_narration: 1,
      created_at: '', updated_at: '',
    }];
    const { getByTestId } = render(
      <Slideshow
        entries={entries}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );

    const toggleBtn = getByTestId('toggle-narration');
    fireEvent.click(toggleBtn);

    const narrationPlayerCalls = vi.mocked(NarrationPlayer).mock.calls;
    const lastCall = narrationPlayerCalls[narrationPlayerCalls.length - 1];
    expect(lastCall[0].isPlaying).toBe(true);
  });

  it('toggles narration when canPlay is true (is video)', () => {
    const entries = [{
      id: 'e1', dropbox_path: '/a.mp4', title: 'A',
      transcript: null, position: 1, disabled: 0, has_narration: 0,
      created_at: '', updated_at: '',
    }];
    const { getByTestId } = render(
      <Slideshow
        entries={entries}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );

    const toggleBtn = getByTestId('toggle-narration');
    fireEvent.click(toggleBtn);

    const narrationPlayerCalls = vi.mocked(NarrationPlayer).mock.calls;
    const lastCall = narrationPlayerCalls[narrationPlayerCalls.length - 1];
    expect(lastCall[0].isPlaying).toBe(true);
  });

  it('does not toggle narration via keyboard when canPlay is false', () => {
    const entries = [{
      id: 'e1', dropbox_path: '/a.jpg', title: 'A',
      transcript: null, position: 1, disabled: 0, has_narration: 0,
      created_at: '', updated_at: '',
    }];
    render(
      <Slideshow
        entries={entries}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );

    fireEvent.keyDown(window, { key: ' ' });

    const narrationPlayerCalls = vi.mocked(NarrationPlayer).mock.calls;
    const lastCall = narrationPlayerCalls[narrationPlayerCalls.length - 1];
    expect(lastCall[0].isPlaying).toBe(false);
  });
});
