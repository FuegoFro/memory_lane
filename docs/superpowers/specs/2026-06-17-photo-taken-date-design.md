# Photo "Taken" Date from Dropbox

**Date:** 2026-06-17
**Status:** Approved

## Problem

Entries display a "year" in the editor UI, but that year is derived from `created_at`,
which currently holds **sync-discovery time** (when the row was first inserted into the
DB), not anything about the photo itself. The displayed year is therefore meaningless.

We want each entry to carry the date the photo/video was actually taken, sourced from
Dropbox.

## Goal

Populate a real capture date for each media entry from Dropbox, and point the editor's
year display at it.

## Source of Truth

Dropbox `FileMetadata` exposes capture information in two relevant places:

- `media_info.metadata.time_taken` — the EXIF capture timestamp, extracted by Dropbox.
  This is exactly the "when was the photo taken" value we want. It is **optional**
  (absent for screenshots, non-EXIF files, some videos) and is **not** returned by
  `filesListFolder()` — it requires a per-file `filesGetMetadata({ include_media_info: true })`
  call.
- `client_modified` — the modification time set by the desktop/mobile client when the
  file was added to Dropbox. Always present on files. A good proxy when `time_taken` is
  missing.

### Fallback chain

For each file, the capture date is resolved as:

1. `media_info.metadata.time_taken` (when present)
2. `client_modified` (always present on files)
3. current time at sync (defensive only — used if the `getMetadata` call itself fails)

## Design Decisions

- **Dedicated column, not `created_at`.** We add a new `taken_at` column rather than
  overloading `created_at`. `created_at` stays a true audit field; `taken_at` is
  self-documenting and avoids conflating "when we first saw this file" with "when the
  photo was taken." The editor UI moves from `created_at` to `taken_at`.
- **No backfill.** The app is not in production anywhere yet; existing dev DBs can be
  deleted and recreated. We deliberately avoid shipping backfill/migration code so there
  is no long-term maintenance burden. New `taken_at` column is added via the existing
  lightweight migration pattern in `db/index.ts` (so an existing DB won't crash), but
  rows synced before this change simply won't have a `taken_at` until re-synced.
- **Parallel metadata fetches.** `getMetadata` is called per file. These run concurrently
  with a bounded concurrency limit (to avoid Dropbox rate limits) rather than strictly
  serially.

## Changes

### Schema (`src/lib/db/schema.sql`)

Add column to `entries`:

```sql
taken_at TEXT
```

No default — the value is always computed in app code via the fallback chain and passed
explicitly at insert. (`client_modified` guarantees a value for any real file.)

### Migration (`src/lib/db/index.ts`)

Follow the existing `has_narration` pattern: if the `taken_at` column is absent, run
`ALTER TABLE entries ADD COLUMN taken_at TEXT`. Add `taken_at: string | null` to the
`Entry` interface.

### Dropbox layer (`src/lib/dropbox/files.ts`)

- Extend `DropboxFile` with `takenAt: string` (ISO timestamp).
- `listMediaFiles()` still does the single `filesListFolder` to enumerate media + narration
  files, then for each media file resolves `takenAt`:
  - Issue `filesGetMetadata({ path, include_media_info: true })` per media file.
  - Run these with bounded concurrency (helper, e.g. a small `mapWithConcurrency`
    utility or batched `Promise.all`; limit ~8–10 in flight).
  - Resolve `takenAt = time_taken ?? client_modified`. If the call throws, fall back to
    `new Date().toISOString()` and continue (one failed file must not fail the whole sync).

### Repository (`src/lib/entries/repository.ts`)

- `createEntry(dropboxPath: string, takenAt: string)` — insert `taken_at` alongside
  `id` and `dropbox_path`.
- Sort tiebreakers that currently use `created_at` (`getAllEntries`, `getStagingEntries`)
  switch to `taken_at` so staging/listing order reflects photo date. (`created_at DESC`
  → `taken_at DESC`.)

### Sync (`src/lib/entries/sync.ts`)

`createEntry(file.path)` → `createEntry(file.path, file.takenAt)`. No other change; sync
only sets `taken_at` on first insert (no re-fetch for existing entries).

### Types (`src/types/index.ts`)

Add `taken_at` to the shared `Entry` type used by the client.

### UI (year display)

Repoint the three existing `created_at` year sites at `taken_at`:

- `src/components/editor/shared.ts` — `yearFromCreatedAt(entry.created_at)` →
  derive year from `taken_at` (rename to `yearFromTakenAt`).
- `src/components/editor/EntryEditor.tsx:118` — `entry.created_at` → `entry.taken_at`.
- `src/components/editor/EntryGrid.tsx:44,58` — year display + search match use
  `taken_at`.

The existing null-guard (`entry.taken_at ? new Date(...).getFullYear() : null`) is kept,
so entries from a pre-change DB row (no `taken_at`) degrade gracefully to no year.

## Testing (TDD)

- **Dropbox `files.ts`**: mock the Dropbox client. Verify `listMediaFiles` resolves
  `takenAt` from `time_taken` when present; falls back to `client_modified` when
  `time_taken` is absent; falls back to a current timestamp when `getMetadata` throws.
  Verify concurrency helper issues calls in parallel (not strictly serial) and respects
  the limit.
- **Repository**: `createEntry` persists `taken_at`; `getAllEntries` / `getStagingEntries`
  order by `taken_at`.
- **Sync**: new files are created with `file.takenAt`; existing files are not re-fetched.
- **UI year helper**: `yearFromTakenAt` returns correct year and null on missing date.

## Out of Scope

- Backfilling existing rows.
- Reading EXIF directly (we rely on Dropbox's extracted `time_taken`).
- Re-syncing `taken_at` for files already in the DB.
- Surfacing full date (month/day) in the UI — year display only, as today.
