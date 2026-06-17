import { Entry, getEntryStatus, isVideoFile } from '@/types';
import { ThumbEntry } from '@/components/ui/Thumb';

export const SECTION_IDS = {
  active: 'sec-active',
  staging: 'sec-staging',
  disabled: 'sec-disabled',
} as const;

export function toThumbEntry(entry: Entry): ThumbEntry {
  const status = getEntryStatus(entry);
  const video = isVideoFile(entry.dropbox_path);
  return {
    id: entry.id,
    title: entry.title ?? 'Untitled',
    year: yearFromTakenAt(entry.taken_at),
    kind: video ? 'video' : 'photo',
    src: `/api/media/${entry.id}`,
    hasNarration: !!entry.has_narration,
    duration: null, // narration/video duration not on Entry; Thumb hides the tag when null
  };
  // note: status is intentionally not carried; section location encodes status
  void status;
}

export function yearFromTakenAt(takenAt: string | null): number | null {
  if (!takenAt) return null;
  const y = new Date(takenAt).getFullYear();
  return Number.isFinite(y) ? y : null;
}
