import { describe, it, expect } from 'vitest';
import { Entry, getEntryStatus, isVideoFile } from '../index';

describe('getEntryStatus', () => {
  const baseEntry: Entry = {
    id: '123',
    dropbox_path: '/test/photo.jpg',
    title: 'Test Photo',
    transcript: null,
    position: 1,
    disabled: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('returns "disabled" for disabled entries', () => {
    const entry: Entry = { ...baseEntry, disabled: 1 };
    expect(getEntryStatus(entry)).toBe('disabled');
  });

  it('returns "disabled" for disabled entries even with null position', () => {
    const entry: Entry = { ...baseEntry, disabled: 1, position: null };
    expect(getEntryStatus(entry)).toBe('disabled');
  });

  it('returns "staging" for entries with null position', () => {
    const entry: Entry = { ...baseEntry, position: null };
    expect(getEntryStatus(entry)).toBe('staging');
  });

  it('returns "active" for active entries with position', () => {
    const entry: Entry = { ...baseEntry, position: 1 };
    expect(getEntryStatus(entry)).toBe('active');
  });

  it('returns "active" for entries with position 0', () => {
    const entry: Entry = { ...baseEntry, position: 0 };
    expect(getEntryStatus(entry)).toBe('active');
  });
});

describe('isVideoFile', () => {
  it('returns true for .mp4 files', () => {
    expect(isVideoFile('/path/to/video.mp4')).toBe(true);
  });

  it('returns true for .mov files', () => {
    expect(isVideoFile('/path/to/video.mov')).toBe(true);
  });

  it('returns true for .webm files', () => {
    expect(isVideoFile('/path/to/video.webm')).toBe(true);
  });

  it('returns true for .avi files', () => {
    expect(isVideoFile('/path/to/video.avi')).toBe(true);
  });

  it('returns false for .jpg image files', () => {
    expect(isVideoFile('/path/to/photo.jpg')).toBe(false);
  });

  it('returns false for .png image files', () => {
    expect(isVideoFile('/path/to/photo.png')).toBe(false);
  });

  it('returns false for .gif image files', () => {
    expect(isVideoFile('/path/to/photo.gif')).toBe(false);
  });

  it('is case insensitive - returns true for .MP4', () => {
    expect(isVideoFile('/path/to/video.MP4')).toBe(true);
  });

  it('is case insensitive - returns true for .MoV', () => {
    expect(isVideoFile('/path/to/video.MoV')).toBe(true);
  });

  it('returns false for files without extension', () => {
    expect(isVideoFile('/path/to/file')).toBe(false);
  });
});
