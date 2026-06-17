import { getDropboxClient, getDropboxFolder } from './client';
import type { files } from 'dropbox';
import { mapWithConcurrency } from './concurrency';

export interface DropboxFile {
  path: string;
  name: string;
  isVideo: boolean;
  hasNarration: boolean;
  takenAt: string;
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

// Bounds parallel Dropbox metadata requests to avoid hitting rate limits while keeping sync fast.
const METADATA_CONCURRENCY = 8;

async function resolveTakenAt(
  client: Awaited<ReturnType<typeof getDropboxClient>>,
  path: string
): Promise<string> {
  try {
    const response = await client.filesGetMetadata({
      path,
      include_media_info: true,
    });
    // Path always comes from a listFolder file entry, so result is always a FileMetadataReference.
    const meta = response.result as files.FileMetadataReference;
    const mediaInfo = meta.media_info;
    const timeTaken =
      mediaInfo && mediaInfo['.tag'] === 'metadata'
        ? mediaInfo.metadata.time_taken
        : undefined;
    return timeTaken ?? meta.client_modified ?? new Date().toISOString();
  } catch {
    // A single failed metadata lookup must not fail the whole sync.
    return new Date().toISOString();
  }
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
  const mediaEntries = allEntries.filter(
    (e): e is files.FileMetadataReference =>
      e['.tag'] === 'file' && isMediaFile(e.name)
  );

  const mediaFiles = await mapWithConcurrency(
    mediaEntries,
    METADATA_CONCURRENCY,
    async (entry): Promise<DropboxFile> => {
      const path = entry.path_display || entry.path_lower || '';
      const narrationPath = (entry.path_lower + NARRATION_SUFFIX).toLowerCase();
      const takenAt = await resolveTakenAt(client, path);
      return {
        path,
        name: entry.name,
        isVideo: isVideoFile(entry.name),
        hasNarration: narrationPaths.has(narrationPath),
        takenAt,
      };
    }
  );

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
    // Only ignore path_not_found errors; re-throw everything else
    const isNotFound =
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 409 &&
      'error' in error &&
      typeof (error as { error: unknown }).error === 'object' &&
      (error as { error: { error_summary?: string } }).error?.error_summary?.includes('not_found');
    if (!isNotFound) {
      throw error;
    }
  }

  linkCache.delete(narrationPath);
}

export function getNarrationPath(mediaPath: string): string {
  return mediaPath + NARRATION_SUFFIX;
}

export async function getThumbnail(
  path: string,
  size: string
): Promise<{ data: Buffer; metadata: any }> {
  const client = await getDropboxClient();
  const response = await client.filesGetThumbnail({
    path,
    format: { '.tag': 'jpeg' },
    size: { '.tag': size as any },
    mode: { '.tag': 'bestfit' },
  });

  let data: Buffer;
  if ((response.result as any).fileBinary) {
    data = (response.result as any).fileBinary;
  } else if ((response.result as any).fileBlob) {
    const arrayBuffer = await (response.result as any).fileBlob.arrayBuffer();
    data = Buffer.from(arrayBuffer);
  } else {
    throw new Error('No binary data in Dropbox response');
  }

  return {
    data,
    metadata: response.result,
  };
}
