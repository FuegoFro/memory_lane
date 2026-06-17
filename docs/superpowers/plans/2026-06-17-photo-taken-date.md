# Photo Taken-Date from Dropbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate each entry with the real date its photo/video was taken (sourced from Dropbox), and display that as the entry's year in the editor.

**Architecture:** During Dropbox sync we fetch per-file metadata (`filesGetMetadata` with `include_media_info: true`) in parallel with a bounded concurrency limit, resolve a capture date via the chain `media_info.time_taken` → `client_modified` → sync-now, store it in a new `taken_at` column on `entries`, and repoint the editor's year display from `created_at` to `taken_at`. No backfill — existing dev DBs are recreated.

**Tech Stack:** Next.js 16, TypeScript, better-sqlite3, Dropbox SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-photo-taken-date-design.md`

---

## Implementation Notes (read before starting)

- `createEntry` currently takes only `(dropboxPath)` and is called with a single argument in ~20 places across `repository.test.ts` and `sync.test.ts`. To avoid churning every call site, the new `takenAt` parameter is **optional** and defaults to the current time in app code (`takenAt ?? new Date().toISOString()`). This still satisfies the spec's "value computed in app code, no SQL default."
- The Dropbox SDK's `MediaInfo` is a discriminated union: `{ '.tag': 'pending' }` or `{ '.tag': 'metadata', metadata: PhotoMetadataReference | VideoMetadataReference }`. The capture time lives at `media_info.metadata.time_taken` (optional) when `.tag === 'metadata'`.
- `client_modified` is a **required** field on `FileMetadata`, so the fallback after `time_taken` is always available for real files. The sync-now fallback only triggers if the `filesGetMetadata` call itself throws.
- Tests run serially (SQLite singleton). Use `npm test -- <path>` to run a single file.

---

## Task 1: Bounded-concurrency helper

**Files:**
- Create: `src/lib/dropbox/concurrency.ts`
- Test: `src/lib/dropbox/__tests__/concurrency.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mapWithConcurrency } from '../concurrency'

describe('mapWithConcurrency', () => {
  it('maps every item and preserves input order', async () => {
    const items = [1, 2, 3, 4, 5]
    const result = await mapWithConcurrency(items, 2, async (n) => n * 10)
    expect(result).toEqual([10, 20, 30, 40, 50])
  })

  it('never runs more than `limit` tasks at once', async () => {
    let active = 0
    let maxActive = 0
    const fn = async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return null
    }
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, fn)
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it('returns an empty array for empty input without calling fn', async () => {
    const fn = vi.fn()
    const result = await mapWithConcurrency([], 4, fn)
    expect(result).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/dropbox/__tests__/concurrency.test.ts`
Expected: FAIL — cannot find module `../concurrency`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/dropbox/concurrency.ts

/**
 * Map over `items` running `fn` with at most `limit` calls in flight at once.
 * Results are returned in the same order as the input.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/dropbox/__tests__/concurrency.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dropbox/concurrency.ts src/lib/dropbox/__tests__/concurrency.test.ts
git commit -m "feat(dropbox): add bounded-concurrency map helper"
```

---

## Task 2: Resolve `takenAt` in the Dropbox layer

**Files:**
- Modify: `src/lib/dropbox/files.ts` (DropboxFile interface ~4-9, listMediaFiles ~32-64)
- Modify: `src/lib/dropbox/__tests__/files.test.ts` (add `filesGetMetadata` mock; update existing assertions)

This task adds a `takenAt: string` field (ISO timestamp) to each `DropboxFile`, resolved per file from Dropbox metadata.

- [ ] **Step 1: Update the existing test mock and add failing tests**

In `src/lib/dropbox/__tests__/files.test.ts`, add a `filesGetMetadata` mock to the client. Near the other mock fns add:

```typescript
const mockFilesGetMetadata = vi.fn()
```

Add it to `mockDropboxClient`:

```typescript
const mockDropboxClient = {
  filesListFolder: mockFilesListFolder,
  filesGetTemporaryLink: mockFilesGetTemporaryLink,
  filesUpload: mockFilesUpload,
  filesDeleteV2: mockFilesDeleteV2,
  filesGetThumbnail: mockFilesGetThumbnail,
  filesGetMetadata: mockFilesGetMetadata,
}
```

In the `listMediaFiles` describe block, add a default `beforeEach` resolution so existing tests don't crash, and update the first test's exact-equality assertion. At the top of the `describe('listMediaFiles', ...)` block add:

```typescript
beforeEach(() => {
  // Default: metadata call returns client_modified, no media_info
  mockFilesGetMetadata.mockResolvedValue({
    result: { client_modified: '2021-07-04T10:00:00Z' },
  })
})
```

Update the first test ("should return an array of media files...") assertion to include `takenAt`:

```typescript
expect(files[0]).toEqual({
  path: '/vacation.jpg',
  name: 'vacation.jpg',
  isVideo: false,
  hasNarration: false,
  takenAt: '2021-07-04T10:00:00Z',
})
```

Then add new tests covering the resolution chain:

```typescript
describe('takenAt resolution', () => {
  beforeEach(() => {
    mockFilesListFolder.mockResolvedValue({
      result: {
        entries: [
          { '.tag': 'file', name: 'a.jpg', path_display: '/a.jpg', path_lower: '/a.jpg' },
        ],
      },
    })
  })

  it('uses media_info.time_taken when present', async () => {
    mockFilesGetMetadata.mockResolvedValue({
      result: {
        client_modified: '2021-07-04T10:00:00Z',
        media_info: {
          '.tag': 'metadata',
          metadata: { time_taken: '2019-12-25T08:30:00Z' },
        },
      },
    })

    const { listMediaFiles } = await import('../files')
    const files = await listMediaFiles()

    expect(files[0].takenAt).toBe('2019-12-25T08:30:00Z')
    expect(mockFilesGetMetadata).toHaveBeenCalledWith({
      path: '/a.jpg',
      include_media_info: true,
    })
  })

  it('falls back to client_modified when time_taken is absent', async () => {
    mockFilesGetMetadata.mockResolvedValue({
      result: { client_modified: '2021-07-04T10:00:00Z' },
    })

    const { listMediaFiles } = await import('../files')
    const files = await listMediaFiles()

    expect(files[0].takenAt).toBe('2021-07-04T10:00:00Z')
  })

  it('falls back to client_modified when media_info is still pending', async () => {
    mockFilesGetMetadata.mockResolvedValue({
      result: {
        client_modified: '2021-07-04T10:00:00Z',
        media_info: { '.tag': 'pending' },
      },
    })

    const { listMediaFiles } = await import('../files')
    const files = await listMediaFiles()

    expect(files[0].takenAt).toBe('2021-07-04T10:00:00Z')
  })

  it('falls back to a timestamp when the metadata call throws', async () => {
    mockFilesGetMetadata.mockRejectedValue(new Error('rate limited'))

    const { listMediaFiles } = await import('../files')
    const files = await listMediaFiles()

    // Should be a valid ISO timestamp, not undefined
    expect(typeof files[0].takenAt).toBe('string')
    expect(Number.isNaN(Date.parse(files[0].takenAt))).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/dropbox/__tests__/files.test.ts`
Expected: FAIL — `takenAt` is `undefined` (new assertions fail; the updated `toEqual` fails).

- [ ] **Step 3: Implement `takenAt` resolution in `files.ts`**

Add the import at the top (the file already imports `type { files } from 'dropbox'`):

```typescript
import { getDropboxClient, getDropboxFolder } from './client';
import { mapWithConcurrency } from './concurrency';
import type { files } from 'dropbox';
```

Add `takenAt` to the interface:

```typescript
export interface DropboxFile {
  path: string;
  name: string;
  isVideo: boolean;
  hasNarration: boolean;
  takenAt: string;
}
```

Add a constant near the other module constants and a resolver function:

```typescript
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
    const meta = response.result as files.FileMetadata;
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
```

Rewrite the `.map(...)` tail of `listMediaFiles` so it resolves `takenAt` in parallel. Replace the existing `const mediaFiles: DropboxFile[] = allEntries.filter(...).map(...)` block and the `return mediaFiles;` with:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/dropbox/__tests__/files.test.ts`
Expected: PASS (all existing tests plus the 4 new `takenAt` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dropbox/files.ts src/lib/dropbox/__tests__/files.test.ts
git commit -m "feat(dropbox): resolve photo takenAt from time_taken with fallbacks"
```

---

## Task 3: Schema column, migration, and Entry type

**Files:**
- Modify: `src/lib/db/schema.sql` (entries table)
- Modify: `src/lib/db/index.ts` (migration ~22-25, Entry interface ~29-39)
- Modify: `src/types/index.ts` (Entry interface)

- [ ] **Step 1: Add the column to the schema**

In `src/lib/db/schema.sql`, add `taken_at` to the `entries` table (after `updated_at`):

```sql
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  dropbox_path TEXT NOT NULL UNIQUE,
  title TEXT,
  transcript TEXT,
  position INTEGER,
  disabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  has_narration INTEGER DEFAULT 0,
  taken_at TEXT
);
```

- [ ] **Step 2: Add the migration for existing DBs**

In `src/lib/db/index.ts`, after the `has_narration` migration block, add:

```typescript
if (!columns.some(c => c.name === 'taken_at')) {
  db.exec('ALTER TABLE entries ADD COLUMN taken_at TEXT');
}
```

- [ ] **Step 3: Add `taken_at` to both Entry interfaces**

In `src/lib/db/index.ts`, add to the `Entry` interface (after `updated_at`):

```typescript
  updated_at: string;
  taken_at: string | null;
```

In `src/types/index.ts`, add the same field to its `Entry` interface (after `updated_at`):

```typescript
  updated_at: string;
  taken_at: string | null;
```

- [ ] **Step 4: Verify the project still type-checks and tests load**

Run: `npm test -- src/lib/entries/__tests__/repository.test.ts`
Expected: PASS (existing tests unaffected; `taken_at` is nullable and unused so far).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.sql src/lib/db/index.ts src/types/index.ts
git commit -m "feat(db): add taken_at column, migration, and Entry type field"
```

---

## Task 4: Persist and sort by `taken_at` in the repository

**Files:**
- Modify: `src/lib/entries/repository.ts` (createEntry ~55-63, getAllEntries ~4-16, getStagingEntries ~27-34)
- Modify: `src/lib/entries/__tests__/repository.test.ts` (add tests)

- [ ] **Step 1: Write failing tests**

Add to `src/lib/entries/__tests__/repository.test.ts`:

```typescript
describe('createEntry with takenAt', () => {
  it('persists the provided takenAt value', () => {
    createEntry('/path/photo.jpg', '2019-12-25T08:30:00Z');
    const entry = getEntryByPath('/path/photo.jpg')!;
    expect(entry.taken_at).toBe('2019-12-25T08:30:00Z');
  });

  it('defaults taken_at to a valid timestamp when omitted', () => {
    createEntry('/path/no-date.jpg');
    const entry = getEntryByPath('/path/no-date.jpg')!;
    expect(typeof entry.taken_at).toBe('string');
    expect(Number.isNaN(Date.parse(entry.taken_at as string))).toBe(false);
  });
});

describe('ordering by taken_at', () => {
  it('orders staging entries by taken_at descending (newest photo first)', () => {
    createEntry('/path/older.jpg', '2018-01-01T00:00:00Z');
    createEntry('/path/newer.jpg', '2022-01-01T00:00:00Z');

    const staging = getStagingEntries();
    expect(staging[0].dropbox_path).toBe('/path/newer.jpg');
    expect(staging[1].dropbox_path).toBe('/path/older.jpg');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/entries/__tests__/repository.test.ts`
Expected: FAIL — `createEntry` accepts only one arg (TS error on second arg) / `taken_at` is null / staging order is by `created_at`.

- [ ] **Step 3: Update `createEntry` and sort order**

In `src/lib/entries/repository.ts`, change `createEntry`:

```typescript
export function createEntry(dropboxPath: string, takenAt?: string): Entry {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO entries (id, dropbox_path, taken_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, dropboxPath, takenAt ?? new Date().toISOString());
  return getEntryById(id)!;
}
```

In `getAllEntries`, change the final tiebreaker from `created_at DESC` to `taken_at DESC`:

```typescript
      position ASC,
      taken_at DESC
```

In `getStagingEntries`, change `ORDER BY created_at DESC` to:

```typescript
    ORDER BY taken_at DESC
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/entries/__tests__/repository.test.ts`
Expected: PASS (existing tests plus the new ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/repository.ts src/lib/entries/__tests__/repository.test.ts
git commit -m "feat(entries): persist taken_at and sort staging/listing by it"
```

---

## Task 5: Pass `takenAt` through sync

**Files:**
- Modify: `src/lib/entries/sync.ts` (createEntry call ~24)
- Modify: `src/lib/entries/__tests__/sync.test.ts` (add test; ensure mock files carry `takenAt`)

- [ ] **Step 1: Inspect the sync test's Dropbox mock**

Open `src/lib/entries/__tests__/sync.test.ts` and find where `listMediaFiles` is mocked. The mock returns `DropboxFile[]`; each object now needs a `takenAt` field. Add `takenAt: '2020-01-01T00:00:00Z'` (or a per-file value) to each mocked file object so they satisfy the `DropboxFile` type.

- [ ] **Step 2: Write a failing test**

Add a test asserting the synced entry carries the file's `takenAt`. Adapt to the file's existing mock helper; the shape below assumes `listMediaFiles` is mocked to return a chosen array:

```typescript
it('stores the takenAt from the Dropbox file on new entries', async () => {
  mockListMediaFiles.mockResolvedValue([
    {
      path: '/trip.jpg',
      name: 'trip.jpg',
      isVideo: false,
      hasNarration: false,
      takenAt: '2017-06-01T12:00:00Z',
    },
  ]);

  await syncFromDropbox();

  const entry = getEntryByPath('/trip.jpg')!;
  expect(entry.taken_at).toBe('2017-06-01T12:00:00Z');
});
```

(If the existing test file uses a differently named mock than `mockListMediaFiles`, match the existing name. Import `getEntryByPath` from `../repository` if not already imported.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/entries/__tests__/sync.test.ts`
Expected: FAIL — `entry.taken_at` does not equal the file's `takenAt` (sync still calls `createEntry(file.path)` only).

- [ ] **Step 4: Pass `takenAt` in sync**

In `src/lib/entries/sync.ts`, change the create call:

```typescript
      const entry = createEntry(file.path, file.takenAt);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/entries/__tests__/sync.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/entries/sync.ts src/lib/entries/__tests__/sync.test.ts
git commit -m "feat(sync): persist takenAt from Dropbox onto new entries"
```

---

## Task 6: Repoint the editor year display to `taken_at`

**Files:**
- Modify: `src/components/editor/shared.ts` (~16, ~26-29)
- Modify: `src/components/editor/EntryEditor.tsx` (~118)
- Modify: `src/components/editor/EntryGrid.tsx` (~44, ~58)
- Test: existing editor tests in `src/components/editor/__tests__/` (if a `shared` test exists, extend it; otherwise add `shared.test.ts`)

- [ ] **Step 1: Write a failing test for the year helper**

Check for an existing test of `shared.ts`. If none, create `src/components/editor/__tests__/shared.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { yearFromTakenAt } from '../shared'

describe('yearFromTakenAt', () => {
  it('returns the year from an ISO timestamp', () => {
    expect(yearFromTakenAt('2019-12-25T08:30:00Z')).toBe(2019)
  })

  it('returns null when the date is null', () => {
    expect(yearFromTakenAt(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/editor/__tests__/shared.test.ts`
Expected: FAIL — `yearFromTakenAt` is not exported (only `yearFromCreatedAt` exists).

- [ ] **Step 3: Update `shared.ts`**

In `src/components/editor/shared.ts`, rename `yearFromCreatedAt` to `yearFromTakenAt`, source it from `taken_at`, and update its call site:

```typescript
    year: yearFromTakenAt(entry.taken_at),
```

```typescript
function yearFromTakenAt(takenAt: string | null): number | null {
  if (!takenAt) return null;
  const y = new Date(takenAt).getFullYear();
  // keep whatever existing validity guard exists here (e.g. Number.isNaN check)
  return Number.isNaN(y) ? null : y;
}
```

Export it if the test imports it (add `export` before `function`).

- [ ] **Step 4: Update `EntryEditor.tsx` and `EntryGrid.tsx`**

In `src/components/editor/EntryEditor.tsx:118`, change:

```typescript
  const year = entry.taken_at ? new Date(entry.taken_at).getFullYear() : null;
```

In `src/components/editor/EntryGrid.tsx`, change line ~44:

```typescript
    year: e.taken_at ? new Date(e.taken_at).getFullYear() : null,
```

and the search-match on line ~58:

```typescript
  if (e.taken_at && new Date(e.taken_at).getFullYear().toString().includes(needle)) return true;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/components/editor/__tests__/shared.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/shared.ts src/components/editor/EntryEditor.tsx src/components/editor/EntryGrid.tsx src/components/editor/__tests__/shared.test.ts
git commit -m "feat(editor): display entry year from taken_at instead of created_at"
```

---

## Task 7: Full verification

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Production build succeeds (catches any remaining type errors, e.g. a missed `created_at` reference).

- [ ] **Step 4: Manual sanity check (optional, requires Dropbox creds + dev server)**

Delete the local dev DB (`rm -f data/memory-lane.db data/memory-lane.db-*`), start `npm run dev`, trigger a sync, and confirm new entries show a sensible year derived from the photo's capture date in the editor grid.

- [ ] **Step 5: Final commit (if anything was touched during verification)**

```bash
git add -A
git commit -m "chore: verification fixes for taken_at feature"
```

---

## Self-Review Notes

- **Spec coverage:** new `taken_at` column (Task 3) ✓; `time_taken → client_modified → now` chain (Task 2) ✓; parallel metadata fetch with concurrency limit (Tasks 1–2) ✓; no backfill / migration-only column add (Task 3) ✓; UI repoint of all three `created_at` sites (Task 6) ✓; sort tiebreakers moved to `taken_at` (Task 4) ✓; both `Entry` types updated (Task 3) ✓.
- **Type consistency:** `DropboxFile.takenAt: string` (always set) vs `Entry.taken_at: string | null` (nullable for pre-change rows) is intentional and consistent across tasks. `createEntry(dropboxPath, takenAt?)` signature matches its call in Task 5.
- **Out of scope (not implemented, per spec):** backfilling existing rows, direct EXIF reads, re-syncing `taken_at` for existing entries, month/day display.
