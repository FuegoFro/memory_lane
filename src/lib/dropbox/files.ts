import { getDropboxClient, getDropboxFolder } from './client';
import type { files } from 'dropbox';

type FileEntry = files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference;

export interface DropboxFile {
  path: string;
  name: string;
  isVideo: boolean;
  hasNarration: boolean;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi'];
const NARRATION_SUFFIX = '.narration.webm';

function isMediaFile(name: string): boolean {
  const lower = name.toLowerCase();
  // Exclude narration files
  if (lower.endsWith(NARRATION_SUFFIX)) {
    return false;
  }
  return (
    IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function listMediaFiles(): Promise<DropboxFile[]> {
  const client = await getDropboxClient();
  const folder = getDropboxFolder();

  const response = await client.filesListFolder({ path: folder });
  const allEntries = response.result.entries;

  // Get all narration files for quick lookup
  const narrationPaths = new Set(
    allEntries
      .filter((e): e is files.FileMetadataReference =>
        e['.tag'] === 'file' && e.name.endsWith(NARRATION_SUFFIX)
      )
      .map((e) => e.path_lower)
  );

  // Filter to media files and check for narrations
  const mediaFiles: DropboxFile[] = allEntries
    .filter((e): e is files.FileMetadataReference =>
      e['.tag'] === 'file' && isMediaFile(e.name)
    )
    .map((entry) => {
      const narrationPath = (entry.path_lower + NARRATION_SUFFIX).toLowerCase();
      return {
        path: entry.path_display || entry.path_lower || '',
        name: entry.name,
        isVideo: isVideoFile(entry.name),
        hasNarration: narrationPaths.has(narrationPath),
      };
    });

  return mediaFiles;
}

// Cache for temporary links (valid 4 hours, we cache for 3)
const linkCache = new Map<string, { link: string; expiry: number }>();

export async function getTemporaryLink(path: string): Promise<string> {
  const now = Date.now();
  const cached = linkCache.get(path);

  if (cached && cached.expiry > now) {
    return cached.link;
  }

  const client = await getDropboxClient();
  const response = await client.filesGetTemporaryLink({ path });
  const link = response.result.link;

  // Cache for 3 hours (links valid for 4)
  linkCache.set(path, { link, expiry: now + 3 * 60 * 60 * 1000 });

  return link;
}

export async function uploadNarration(
  mediaPath: string,
  audioData: Buffer
): Promise<void> {
  const client = await getDropboxClient();
  const narrationPath = mediaPath + NARRATION_SUFFIX;

  await client.filesUpload({
    path: narrationPath,
    contents: audioData,
    mode: { '.tag': 'overwrite' },
  });

  // Invalidate cache for this narration
  linkCache.delete(narrationPath);
}

export async function deleteNarration(mediaPath: string): Promise<void> {
  const client = await getDropboxClient();
  const narrationPath = mediaPath + NARRATION_SUFFIX;

  try {
    await client.filesDeleteV2({ path: narrationPath });
  } catch (error: unknown) {
    // Ignore if file doesn't exist
    if (error && typeof error === 'object' && 'status' in error && error.status !== 409) {
      throw error;
    }
  }

  linkCache.delete(narrationPath);
}

export function getNarrationPath(mediaPath: string): string {
  return mediaPath + NARRATION_SUFFIX;
}
