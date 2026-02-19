export interface Entry {
  id: string;
  dropbox_path: string;
  title: string | null;
  transcript: string | null;
  position: number | null;
  disabled: number;
  has_narration: number;
  created_at: string;
  updated_at: string;
}

export interface ViewerSettings {
  autoAdvanceDelay: number;
  showTitles: boolean;
}

export type EntryStatus = 'active' | 'staging' | 'disabled';

export function getEntryStatus(entry: Entry): EntryStatus {
  if (entry.disabled) return 'disabled';
  if (entry.position === null) return 'staging';
  return 'active';
}

export function isVideoFile(path: string): boolean {
  const lower = path.toLowerCase();
  return ['.mp4', '.mov', '.webm', '.avi'].some((ext) => lower.endsWith(ext));
}
