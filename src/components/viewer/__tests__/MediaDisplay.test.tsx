/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MediaDisplay } from '../MediaDisplay';
import { Entry } from '@/types';

const mockEntry1: Entry = {
  id: '1',
  dropbox_path: '/photo1.jpg',
  title: 'Title 1',
  transcript: null,
  position: 1,
  disabled: 0,
  has_narration: 0,
  created_at: '',
  updated_at: '',
};

const mockEntry2: Entry = {
  id: '2',
  dropbox_path: '/photo2.jpg',
  title: 'Title 2',
  transcript: null,
  position: 2,
  disabled: 0,
  has_narration: 0,
  created_at: '',
  updated_at: '',
};

describe('MediaDisplay', () => {
  it('replaces the image element when key changes (simulated by rerender with key)', () => {
    const { getByRole, rerender } = render(
      <MediaDisplay
        key={mockEntry1.id}
        entry={mockEntry1}
        isVideo={false}
        isNarrationPlaying={false}
        onClick={() => {}}
      />
    );

    const img1 = getByRole('img');
    
    rerender(
      <MediaDisplay
        key={mockEntry2.id}
        entry={mockEntry2}
        isVideo={false}
        isNarrationPlaying={false}
        onClick={() => {}}
      />
    );

    const img2 = getByRole('img');
    expect(img1).not.toBe(img2);
    expect(img2).toHaveAttribute('src', '/api/media/2');
  });

  it('calls onLoad when the image loads', () => {
    const onLoad = vi.fn();
    const { getByRole } = render(
      <MediaDisplay
        entry={mockEntry1}
        isVideo={false}
        isNarrationPlaying={false}
        onClick={() => {}}
        onLoad={onLoad}
      />
    );

    const img = getByRole('img');
    fireEvent.load(img);
    expect(onLoad).toHaveBeenCalled();
  });

  it('calls onLoad (onLoadedData) when the video loads', () => {
    const onLoad = vi.fn();
    const { container } = render(
      <MediaDisplay
        entry={{ ...mockEntry1, dropbox_path: '/video.mp4' }}
        isVideo={true}
        isNarrationPlaying={false}
        onClick={() => {}}
        onLoad={onLoad}
      />
    );

    const video = container.querySelector('video')!;
    fireEvent(video, new Event('loadeddata'));
    expect(onLoad).toHaveBeenCalled();
  });
});
