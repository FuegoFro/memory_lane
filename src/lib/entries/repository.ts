import db, { Entry } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function getAllEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    ORDER BY
      CASE WHEN disabled = 1 THEN 2
           WHEN position IS NULL THEN 1
           ELSE 0
      END,
      position ASC,
      created_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getActiveEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 0 AND position IS NOT NULL
    ORDER BY position ASC
  `);
  return stmt.all() as Entry[];
}

export function getStagingEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 0 AND position IS NULL
    ORDER BY created_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getDisabledEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 1
    ORDER BY updated_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getEntryById(id: string): Entry | undefined {
  const stmt = db.prepare('SELECT * FROM entries WHERE id = ?');
  return stmt.get(id) as Entry | undefined;
}

export function getEntryByPath(dropboxPath: string): Entry | undefined {
  const stmt = db.prepare('SELECT * FROM entries WHERE dropbox_path = ?');
  return stmt.get(dropboxPath) as Entry | undefined;
}

export function createEntry(dropboxPath: string): Entry {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO entries (id, dropbox_path)
    VALUES (?, ?)
  `);
  stmt.run(id, dropboxPath);
  return getEntryById(id)!;
}

export function updateEntry(
  id: string,
  updates: {
    title?: string | null;
    transcript?: string | null;
    position?: number | null;
    disabled?: boolean;
    has_narration?: boolean;
  }
): Entry | undefined {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if ('title' in updates) {
    fields.push('title = ?');
    values.push(updates.title ?? null);
  }
  if ('transcript' in updates) {
    fields.push('transcript = ?');
    values.push(updates.transcript ?? null);
  }
  if ('position' in updates) {
    fields.push('position = ?');
    values.push(updates.position ?? null);
  }
  if ('disabled' in updates) {
    fields.push('disabled = ?');
    values.push(updates.disabled ? 1 : 0);
  }
  if ('has_narration' in updates) {
    fields.push('has_narration = ?');
    values.push(updates.has_narration ? 1 : 0);
  }

  if (fields.length === 0) return getEntryById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`
    UPDATE entries SET ${fields.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getEntryById(id);
}

export function reorderEntries(orderedIds: string[]): void {
  const updateStmt = db.prepare('UPDATE entries SET position = ? WHERE id = ?');

  const reorder = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      updateStmt.run(index, id);
    });
  });

  reorder(orderedIds);
}

export function deleteEntry(id: string): boolean {
  const stmt = db.prepare('DELETE FROM entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getNextPosition(): number {
  const stmt = db.prepare('SELECT MAX(position) as max FROM entries WHERE position IS NOT NULL');
  const result = stmt.get() as { max: number | null };
  return (result.max ?? -1) + 1;
}
