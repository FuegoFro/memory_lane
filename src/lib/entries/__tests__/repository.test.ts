import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Create a test database path
const TEST_DB_PATH = '/tmp/test-memory-lane-entries.db';

// Set environment variable before importing anything that uses db
process.env.DATABASE_PATH = TEST_DB_PATH;

// Ensure the test database is initialized with schema before importing repository
import Database from 'better-sqlite3';

// Initialize test database with schema before module loads
const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
const initDb = new Database(TEST_DB_PATH);
initDb.exec(schema);
initDb.close();

// Now import the repository and db (they will use our test database)
import db from '@/lib/db';
import {
  getAllEntries,
  getActiveEntries,
  getStagingEntries,
  getDisabledEntries,
  getEntryById,
  getEntryByPath,
  createEntry,
  updateEntry,
  reorderEntries,
  deleteEntry,
  getNextPosition,
} from '../repository';

describe('entry repository', () => {
  beforeEach(() => {
    // Clear all entries before each test
    db.exec('DELETE FROM entries');
  });

  afterAll(() => {
    // Cleanup test database file
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('getAllEntries', () => {
    it('returns empty array when no entries exist', () => {
      const entries = getAllEntries();
      expect(entries).toEqual([]);
    });

    it('returns entries ordered by position first, then disabled entries last', () => {
      // Create entries with different states
      createEntry('/path/active1.jpg');
      createEntry('/path/active2.jpg');
      createEntry('/path/staging.jpg');
      createEntry('/path/disabled.jpg');

      // Set positions and states
      const active1 = getEntryByPath('/path/active1.jpg')!;
      const active2 = getEntryByPath('/path/active2.jpg')!;
      const disabled = getEntryByPath('/path/disabled.jpg')!;

      updateEntry(active1.id, { position: 1 });
      updateEntry(active2.id, { position: 0 });
      updateEntry(disabled.id, { disabled: true });

      const entries = getAllEntries();

      expect(entries.length).toBe(4);
      // Ordered entries first (position 0, then position 1)
      expect(entries[0].dropbox_path).toBe('/path/active2.jpg');
      expect(entries[1].dropbox_path).toBe('/path/active1.jpg');
      // Then staging entries (position null, not disabled)
      expect(entries[2].dropbox_path).toBe('/path/staging.jpg');
      // Then disabled entries last
      expect(entries[3].dropbox_path).toBe('/path/disabled.jpg');
    });
  });

  describe('getActiveEntries', () => {
    it('returns only entries with position not null and not disabled', () => {
      createEntry('/path/active1.jpg');
      createEntry('/path/active2.jpg');
      createEntry('/path/staging.jpg');
      createEntry('/path/disabled.jpg');

      const active1 = getEntryByPath('/path/active1.jpg')!;
      const active2 = getEntryByPath('/path/active2.jpg')!;
      const disabled = getEntryByPath('/path/disabled.jpg')!;

      updateEntry(active1.id, { position: 0 });
      updateEntry(active2.id, { position: 1 });
      updateEntry(disabled.id, { disabled: true, position: 2 });

      const entries = getActiveEntries();

      expect(entries.length).toBe(2);
      expect(entries[0].dropbox_path).toBe('/path/active1.jpg');
      expect(entries[1].dropbox_path).toBe('/path/active2.jpg');
    });

    it('returns entries ordered by position ASC', () => {
      createEntry('/path/a.jpg');
      createEntry('/path/b.jpg');
      createEntry('/path/c.jpg');

      const a = getEntryByPath('/path/a.jpg')!;
      const b = getEntryByPath('/path/b.jpg')!;
      const c = getEntryByPath('/path/c.jpg')!;

      updateEntry(a.id, { position: 2 });
      updateEntry(b.id, { position: 0 });
      updateEntry(c.id, { position: 1 });

      const entries = getActiveEntries();

      expect(entries.length).toBe(3);
      expect(entries[0].dropbox_path).toBe('/path/b.jpg');
      expect(entries[1].dropbox_path).toBe('/path/c.jpg');
      expect(entries[2].dropbox_path).toBe('/path/a.jpg');
    });
  });

  describe('getStagingEntries', () => {
    it('returns only entries with position null and not disabled', () => {
      createEntry('/path/active.jpg');
      createEntry('/path/staging1.jpg');
      createEntry('/path/staging2.jpg');
      createEntry('/path/disabled.jpg');

      const active = getEntryByPath('/path/active.jpg')!;
      const disabled = getEntryByPath('/path/disabled.jpg')!;

      updateEntry(active.id, { position: 0 });
      updateEntry(disabled.id, { disabled: true });

      const entries = getStagingEntries();

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.position === null)).toBe(true);
      expect(entries.every(e => e.disabled === 0)).toBe(true);
    });

    it('returns entries ordered by created_at DESC', () => {
      // Create entries with explicit timestamps to test ordering
      // Insert directly with different timestamps for reliable ordering
      db.exec(`
        INSERT INTO entries (id, dropbox_path, created_at, updated_at)
        VALUES
          ('id-first', '/path/first.jpg', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
          ('id-second', '/path/second.jpg', '2024-01-01 11:00:00', '2024-01-01 11:00:00'),
          ('id-third', '/path/third.jpg', '2024-01-01 12:00:00', '2024-01-01 12:00:00')
      `);

      const entries = getStagingEntries();

      expect(entries.length).toBe(3);
      // Most recently created should be first
      expect(entries[0].dropbox_path).toBe('/path/third.jpg');
      expect(entries[1].dropbox_path).toBe('/path/second.jpg');
      expect(entries[2].dropbox_path).toBe('/path/first.jpg');
    });
  });

  describe('getDisabledEntries', () => {
    it('returns only disabled entries', () => {
      createEntry('/path/active.jpg');
      createEntry('/path/disabled1.jpg');
      createEntry('/path/disabled2.jpg');

      const active = getEntryByPath('/path/active.jpg')!;
      const disabled1 = getEntryByPath('/path/disabled1.jpg')!;
      const disabled2 = getEntryByPath('/path/disabled2.jpg')!;

      updateEntry(active.id, { position: 0 });
      updateEntry(disabled1.id, { disabled: true });
      updateEntry(disabled2.id, { disabled: true });

      const entries = getDisabledEntries();

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.disabled === 1)).toBe(true);
    });
  });

  describe('getEntryById', () => {
    it('returns entry when it exists', () => {
      const created = createEntry('/path/test.jpg');
      const found = getEntryById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.dropbox_path).toBe('/path/test.jpg');
    });

    it('returns undefined when entry does not exist', () => {
      const found = getEntryById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getEntryByPath', () => {
    it('returns entry when path exists', () => {
      createEntry('/path/test.jpg');
      const found = getEntryByPath('/path/test.jpg');

      expect(found).toBeDefined();
      expect(found!.dropbox_path).toBe('/path/test.jpg');
    });

    it('returns undefined when path does not exist', () => {
      const found = getEntryByPath('/path/nonexistent.jpg');
      expect(found).toBeUndefined();
    });
  });

  describe('createEntry', () => {
    it('creates entry with UUID id', () => {
      const entry = createEntry('/path/new.jpg');

      expect(entry.id).toBeDefined();
      // UUID format check (8-4-4-4-12)
      expect(entry.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('creates entry with correct dropbox_path', () => {
      const entry = createEntry('/photos/vacation/beach.jpg');

      expect(entry.dropbox_path).toBe('/photos/vacation/beach.jpg');
    });

    it('creates entry with default values', () => {
      const entry = createEntry('/path/new.jpg');

      expect(entry.title).toBeNull();
      expect(entry.transcript).toBeNull();
      expect(entry.position).toBeNull();
      expect(entry.disabled).toBe(0);
      expect(entry.created_at).toBeDefined();
      expect(entry.updated_at).toBeDefined();
    });

    it('entry is retrievable after creation', () => {
      const created = createEntry('/path/retrieve.jpg');
      const found = getEntryById(created.id);

      expect(found).toEqual(created);
    });
  });

  describe('updateEntry', () => {
    it('updates title field', () => {
      const entry = createEntry('/path/test.jpg');
      const updated = updateEntry(entry.id, { title: 'My Photo' });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('My Photo');
    });

    it('updates transcript field', () => {
      const entry = createEntry('/path/test.jpg');
      const updated = updateEntry(entry.id, { transcript: 'This is a memory.' });

      expect(updated!.transcript).toBe('This is a memory.');
    });

    it('updates position field', () => {
      const entry = createEntry('/path/test.jpg');
      const updated = updateEntry(entry.id, { position: 5 });

      expect(updated!.position).toBe(5);
    });

    it('updates disabled field', () => {
      const entry = createEntry('/path/test.jpg');
      const updated = updateEntry(entry.id, { disabled: true });

      expect(updated!.disabled).toBe(1);
    });

    it('updates multiple fields at once', () => {
      const entry = createEntry('/path/test.jpg');
      const updated = updateEntry(entry.id, {
        title: 'Title',
        transcript: 'Text',
        position: 3,
        disabled: false,
      });

      expect(updated!.title).toBe('Title');
      expect(updated!.transcript).toBe('Text');
      expect(updated!.position).toBe(3);
      expect(updated!.disabled).toBe(0);
    });

    it('updates updated_at timestamp', () => {
      // Insert entry with an older timestamp
      db.exec(`
        INSERT INTO entries (id, dropbox_path, created_at, updated_at)
        VALUES ('test-id', '/path/test.jpg', '2024-01-01 10:00:00', '2024-01-01 10:00:00')
      `);
      const entry = getEntryById('test-id')!;
      const originalUpdatedAt = entry.updated_at;

      // Update will use datetime('now'), which will be newer
      const updated = updateEntry(entry.id, { title: 'Changed' });

      expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    });

    it('can set fields to null', () => {
      const entry = createEntry('/path/test.jpg');
      updateEntry(entry.id, { title: 'Title', position: 5 });

      const updated = updateEntry(entry.id, { title: null, position: null });

      expect(updated!.title).toBeNull();
      expect(updated!.position).toBeNull();
    });

    it('returns entry unchanged if no updates provided', () => {
      const entry = createEntry('/path/test.jpg');
      const result = updateEntry(entry.id, {});

      expect(result!.id).toBe(entry.id);
    });

    it('returns undefined for non-existent entry', () => {
      const result = updateEntry('non-existent-id', { title: 'Test' });
      expect(result).toBeUndefined();
    });
  });

  describe('reorderEntries', () => {
    it('sets positions in order of provided IDs', () => {
      const entry1 = createEntry('/path/1.jpg');
      const entry2 = createEntry('/path/2.jpg');
      const entry3 = createEntry('/path/3.jpg');

      reorderEntries([entry3.id, entry1.id, entry2.id]);

      const updated1 = getEntryById(entry1.id)!;
      const updated2 = getEntryById(entry2.id)!;
      const updated3 = getEntryById(entry3.id)!;

      expect(updated3.position).toBe(0);
      expect(updated1.position).toBe(1);
      expect(updated2.position).toBe(2);
    });

    it('handles empty array', () => {
      createEntry('/path/test.jpg');

      // Should not throw
      expect(() => reorderEntries([])).not.toThrow();
    });

    it('handles single entry', () => {
      const entry = createEntry('/path/test.jpg');

      reorderEntries([entry.id]);

      const updated = getEntryById(entry.id)!;
      expect(updated.position).toBe(0);
    });
  });

  describe('deleteEntry', () => {
    it('removes entry from database', () => {
      const entry = createEntry('/path/test.jpg');

      deleteEntry(entry.id);

      const found = getEntryById(entry.id);
      expect(found).toBeUndefined();
    });

    it('returns true when entry was deleted', () => {
      const entry = createEntry('/path/test.jpg');

      const result = deleteEntry(entry.id);

      expect(result).toBe(true);
    });

    it('returns false when entry does not exist', () => {
      const result = deleteEntry('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getNextPosition', () => {
    it('returns 0 when no entries have positions', () => {
      createEntry('/path/test.jpg');

      const next = getNextPosition();

      expect(next).toBe(0);
    });

    it('returns max position + 1', () => {
      const entry1 = createEntry('/path/1.jpg');
      const entry2 = createEntry('/path/2.jpg');
      const entry3 = createEntry('/path/3.jpg');

      updateEntry(entry1.id, { position: 0 });
      updateEntry(entry2.id, { position: 5 });
      updateEntry(entry3.id, { position: 2 });

      const next = getNextPosition();

      expect(next).toBe(6);
    });

    it('ignores null positions', () => {
      const entry1 = createEntry('/path/1.jpg');
      createEntry('/path/2.jpg'); // position is null

      updateEntry(entry1.id, { position: 3 });

      const next = getNextPosition();

      expect(next).toBe(4);
    });
  });
});
