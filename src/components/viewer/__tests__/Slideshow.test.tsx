/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Slideshow } from '../Slideshow';

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
});
