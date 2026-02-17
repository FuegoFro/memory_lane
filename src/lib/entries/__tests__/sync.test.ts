import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dropbox module before importing sync
vi.mock('@/lib/dropbox', () => ({
  listMediaFiles: vi.fn(),
}));

import db from '@/lib/db';
import { syncFromDropbox } from '../sync';
import { createEntry, getAllEntries, getEntryByPath } from '../repository';
import { listMediaFiles } from '@/lib/dropbox';

// Get the mocked function
const mockListMediaFiles = vi.mocked(listMediaFiles);

describe('syncFromDropbox', () => {
  beforeEach(() => {
    db.exec('DELETE FROM entries');
    vi.clearAllMocks();
  });

  it('creates entries for new files from Dropbox', async () => {
    mockListMediaFiles.mockResolvedValue([
      { path: '/photo1.jpg', name: 'photo1.jpg', isVideo: false, hasNarration: false },
      { path: '/photo2.jpg', name: 'photo2.jpg', isVideo: false, hasNarration: false },
    ]);

    const result = await syncFromDropbox();

    const entries = getAllEntries();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.dropbox_path)).toContain('/photo1.jpg');
    expect(entries.map((e) => e.dropbox_path)).toContain('/photo2.jpg');
    expect(result.added).toBe(2);
  });

  it('counts unchanged (existing) entries', async () => {
    // Pre-create an entry that already exists
    createEntry('/existing.jpg');

    mockListMediaFiles.mockResolvedValue([
      { path: '/existing.jpg', name: 'existing.jpg', isVideo: false, hasNarration: false },
    ]);

    const result = await syncFromDropbox();

    expect(result.unchanged).toBe(1);
    expect(result.added).toBe(0);
  });

  it('counts removed (missing from Dropbox) entries', async () => {
    // Pre-create an entry that no longer exists in Dropbox
    createEntry('/deleted.jpg');

    mockListMediaFiles.mockResolvedValue([]);

    const result = await syncFromDropbox();

    expect(result.removed).toBe(1);
    // Entry should still exist (not auto-deleted)
    const entry = getEntryByPath('/deleted.jpg');
    expect(entry).toBeDefined();
  });

  it('does not create duplicates for existing paths', async () => {
    // Pre-create an entry
    createEntry('/photo.jpg');

    mockListMediaFiles.mockResolvedValue([
      { path: '/photo.jpg', name: 'photo.jpg', isVideo: false, hasNarration: false },
    ]);

    await syncFromDropbox();

    // Should still have only one entry
    const entries = getAllEntries();
    expect(entries).toHaveLength(1);
  });

  it('returns SyncResult with correct counts', async () => {
    // Pre-create some entries
    createEntry('/existing1.jpg');
    createEntry('/existing2.jpg');
    createEntry('/removed.jpg');

    mockListMediaFiles.mockResolvedValue([
      { path: '/existing1.jpg', name: 'existing1.jpg', isVideo: false, hasNarration: false },
      { path: '/existing2.jpg', name: 'existing2.jpg', isVideo: false, hasNarration: false },
      { path: '/new1.jpg', name: 'new1.jpg', isVideo: false, hasNarration: false },
      { path: '/new2.jpg', name: 'new2.jpg', isVideo: false, hasNarration: false },
      { path: '/new3.jpg', name: 'new3.jpg', isVideo: false, hasNarration: false },
    ]);

    const result = await syncFromDropbox();

    expect(result).toEqual({
      added: 3,      // new1, new2, new3
      removed: 1,    // removed.jpg (in DB but not in Dropbox)
      unchanged: 2,  // existing1, existing2
    });

    // Total entries should be 6 (3 pre-existing + 3 new)
    const entries = getAllEntries();
    expect(entries).toHaveLength(6);
  });

  it('handles empty Dropbox folder', async () => {
    mockListMediaFiles.mockResolvedValue([]);

    const result = await syncFromDropbox();

    expect(result).toEqual({
      added: 0,
      removed: 0,
      unchanged: 0,
    });
  });

  it('handles empty database with files in Dropbox', async () => {
    mockListMediaFiles.mockResolvedValue([
      { path: '/photo1.jpg', name: 'photo1.jpg', isVideo: false, hasNarration: false },
      { path: '/photo2.jpg', name: 'photo2.jpg', isVideo: false, hasNarration: false },
      { path: '/video.mp4', name: 'video.mp4', isVideo: true, hasNarration: false },
    ]);

    const result = await syncFromDropbox();

    expect(result).toEqual({
      added: 3,
      removed: 0,
      unchanged: 0,
    });

    const entries = getAllEntries();
    expect(entries).toHaveLength(3);
  });
});
