---
title: Edit Modal — Local State (Remove URL-Based Modal Routing)
date: 2026-04-19
status: approved
---

## Overview

Replace the URL-based edit entry modal with pure local component state inside `EntryGrid`. The `/edit/[id]` route and the `@modal` parallel-route slot are deleted entirely. Clicking an entry card opens the editor as an in-grid modal; closing it clears local state. No URL changes when opening or closing the modal.

## Motivation

The current modal uses a Next.js intercepting route at `src/app/edit/@modal/(.)[ id]/page.tsx`. The directory name has a literal space (`(.)[ id]` instead of `(.)[id]`) which makes it an invalid dynamic segment — Next.js never matches it, so the intercept never fires. In production this manifests as a 404; in dev it falls through to the direct `/edit/[id]` route, which itself just renders `<EntryGrid />`, producing a page-refresh feel.

Rather than fix the directory name, we're removing URL-based modal routing entirely:

- The direct `/edit/[id]` route was already a dead-end — it renders the grid, not the modal. There is no meaningful deep-link today.
- Local state eliminates the intercept/refresh/404 class of bugs and removes the `@modal` parallel-route machinery.
- Browser back-button semantics (A in the brainstorming discussion): back navigates away from `/edit`, as expected for an in-page dialog.

## Architecture

`EntryGrid` owns `selectedEntry: Entry | null`. Clicking a card sets it; dismissing clears it. The modal renders as a conditional child of the grid.

```
EntryGrid
├── selectedEntry: Entry | null   ← local state
├── Sections (Active / Staging / Disabled)
│   └── Card[] — onClick sets selectedEntry
└── {selectedEntry && <Modal onClose={…}><EntryEditor entry={selectedEntry} … /></Modal>}
```

## File Changes

### Delete

- `src/app/edit/[id]/` — entire directory (the route that rendered `<EntryGrid />`).
- `src/app/edit/@modal/` — entire directory, including `default.tsx`, `page.tsx`, and the misnamed `(.)[ id]/page.tsx`.

### Modify

**`src/app/edit/layout.tsx`**
- Remove the `modal: React.ReactNode` prop from the layout signature.
- Remove `{modal}` from the rendered JSX.

**`src/components/ui/Modal.tsx`**
- Replace `closeHref?: string` prop with `onClose: () => void`.
- `onDismiss` calls `onClose()` instead of `router.push(closeHref)`.
- Drop the `useRouter` import.

**`src/components/editor/EntryGrid.tsx`**
- Add `const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)`.
- In both `SortableCard` and `StaticCard`, replace the `<Link href={\`/edit/${entry.id}\`}>` wrapper with a `<button type="button">` that calls an `onOpen(entry)` prop. The button keeps the existing card classes (`block` + image + hover overlay children) so visuals are unchanged.
- Add an `onOpen` prop to both card components; `EntryGrid` passes a function that sets `selectedEntry`.
- After the three section renders, render:
  ```tsx
  {selectedEntry && (
    <Modal onClose={() => setSelectedEntry(null)}>
      <EntryEditor
        entry={selectedEntry}
        hasNarration={!!selectedEntry.has_narration}
        onEntryUpdated={(updated) => {
          setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          setSelectedEntry(updated);
        }}
      />
    </Modal>
  )}
  ```

**`src/components/editor/EntryEditor.tsx`**
- Remove the unused `backHref` prop and the `backUrl` local (it's assigned but never read).
- Add `onEntryUpdated?: (entry: Entry) => void`. After a successful save in `saveNow`, call it with the merged entry so the grid can patch its state without a refetch.

## Interaction Details

**Drag vs click.** `SortableCard` must still be draggable. The existing `PointerSensor` with `activationConstraint: { distance: 8 }` separates drag from click — an 8px movement threshold means short taps fire `onClick` and longer drags don't. We keep that configuration.

**Closing.** The `Modal`'s existing close mechanisms (close-button click, backdrop click, Escape via `<dialog onClose>`) all route through `onDismiss` → `onClose()`. Nothing else changes.

**Data freshness.** When `EntryEditor` successfully saves, it calls `onEntryUpdated(updatedEntry)`. The grid patches that entry in its `entries` state and updates `selectedEntry` so the modal stays in sync. This avoids a full refetch on close and keeps the grid immediately consistent with any edits.

**Multiple opens.** Clicking a second card while the modal is open simply replaces `selectedEntry`. The dialog element re-renders with the new entry; `EntryEditor` re-mounts due to key-less replacement — acceptable since the dialog stays open and any unsaved input in the previous entry is debounce-saved by `EntryEditor`'s existing autosave.

## Testing

Work proceeds red/green TDD throughout.

**`src/components/editor/__tests__/EntryGrid.test.tsx`**
- Remove assertions checking `href="/edit/entry-1"` / `href="/edit/entry-3"`.
- Add: clicking an entry card renders the `EntryEditor` (find by a stable piece of editor UI).
- Add: clicking the modal's close button removes the editor from the DOM.
- Add: successful save from within the modal updates the corresponding card's rendered title in the grid (verifies the `onEntryUpdated` wiring).

**`src/components/editor/__tests__/EntryEditor.test.tsx`**
- No existing assertions reference `backHref` (verified via grep); no removals needed.
- Add: `onEntryUpdated` is called with the saved entry after a successful PUT to `/api/edit/entries/:id`.

**`src/app/edit/__tests__/layout.test.tsx`**
- No change required — it doesn't currently render with a `modal` slot. The layout's new signature (only `children`) is already what the tests pass.

**`src/components/ui/`** — if a `Modal` test exists, update it for the `onClose` prop. If not, skip.

## Out of Scope

- No changes to `EntryEditor`'s save logic beyond wiring the new callback.
- No changes to API routes.
- No visual redesign of the modal or grid.
