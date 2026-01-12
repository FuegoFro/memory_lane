import { listMediaFiles } from '@/lib/dropbox';
import { createEntry, getAllEntries } from './repository';

export interface SyncResult {
  added: number;
  removed: number;
  unchanged: number;
}

export async function syncFromDropbox(): Promise<SyncResult> {
  const dropboxFiles = await listMediaFiles();
  const existingEntries = getAllEntries();

  const dropboxPaths = new Set(dropboxFiles.map((f) => f.path));
  const existingPaths = new Set(existingEntries.map((e) => e.dropbox_path));

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // Add new files
  for (const file of dropboxFiles) {
    if (!existingPaths.has(file.path)) {
      createEntry(file.path);
      added++;
    } else {
      unchanged++;
    }
  }

  // Note: We don't auto-delete entries when files are removed from Dropbox
  // Instead, mark them or let user handle it manually
  // For now, just count how many are missing
  for (const entry of existingEntries) {
    if (!dropboxPaths.has(entry.dropbox_path)) {
      removed++;
      // Could mark as missing or disabled here
    }
  }

  return { added, removed, unchanged };
}
