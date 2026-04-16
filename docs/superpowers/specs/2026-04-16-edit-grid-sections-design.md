---
title: Edit Grid — Collapsible Stage Sections
date: 2026-04-16
status: approved
---

## Overview

Replace the single filtered grid on `/edit` with three always-visible, collapsible sections — one per entry status (Active, Staging, Disabled). The stage filter buttons are removed entirely.

## UI Structure

### Toolbar

- Remove: stage filter buttons (All / Active / Staging / Disabled)
- Keep: thumbnail size slider, Sync from Dropbox button, sync result message
- Keep: "Select all" button in toolbar (appears when any items are selected)

### Section Headers

Each section has a header row styled as a minimal divider:

```
▼  Active  [8]  (drag to reorder)                    [Select all]
▼  Staging [3]                                        [Select all]
▶  Disabled [14]                                      [Select all]
```

- Chevron (▼/▶) + section name are clickable to toggle collapse
- Pill badge shows entry count for that section (always visible, even when collapsed)
- "Select all" button is right-aligned and always visible (works even when section is collapsed)
- Active section shows the hint "(drag to reorder)" in muted text
- Status color dots are removed from individual cards (section header communicates status)

### Section Grids

- Each section renders its own grid below the header when expanded
- Grid uses the same `auto-fill` column sizing driven by the thumbnail size slider
- Collapsed sections show only the header row, no grid

### Drag and Drop

- Drag-to-reorder is scoped to the Active section only (existing behavior preserved)
- `DndContext` + `SortableContext` wrap only the Active grid
- Staging and Disabled grids are static (no drag handles)

### Selection

- Checkboxes on cards work across all sections
- Shift-click range selection works within each section independently (range bounded by section)
- "Select all" on a section header selects all entries in that section (whether expanded or not)
- Floating action bar shows all three move targets regardless of which sections are selected from

## State

- `collapsed`: `{ active: boolean, staging: boolean, disabled: boolean }` — React state, resets on page load (all expanded by default)
- All other state (entries, selectedIds, thumbnailSize, syncing, activeId) unchanged

## Component Structure

Extract a `StageSection` component (new file: `src/components/editor/StageSection.tsx`) responsible for rendering one section's header + grid. It receives:

- `status`: `EntryStatus`
- `entries`: `Entry[]` (pre-filtered to this section)
- `collapsed`: `boolean`
- `onToggleCollapse`: `() => void`
- `onSelectAll`: `() => void`
- `selectedIds`: `Set<string>`
- `hasSelection`: `boolean`
- `onToggleSelection`: `(id: string, shiftKey: boolean) => void`
- `thumbnailSize`: `number`
- Children slot (or render prop) for the DnD-wrapped active grid

`EntryGrid.tsx` manages all state and passes the appropriate props to each `StageSection`.

The existing `SortableCard` component stays in `EntryGrid.tsx` (or moves to `StageSection.tsx` — co-location is fine).

## Changes to Existing Code

- `EntryGrid.tsx`: remove `filter` state, `filteredEntries`, `filterOptions`, and the filter button group from the toolbar. Add `collapsed` state. Render three `StageSection` instances instead of one unified grid.
- `SortableCard`: remove `filter` prop. Remove `?stage=` query param from card edit links entirely — it was only used to restore the active filter on modal close, which is no longer needed. Card `href` becomes simply `/edit/${entry.id}`.
- `src/app/edit/@modal/(.)[ id]/page.tsx`: remove `stage` from `searchParams`, simplify `backHref` to always be `/edit`.
- Status dot (`data-testid="status-badge"`) removed from both `SortableCard` and the static card render.

## Out of Scope

- Drag-to-reorder within Staging or Disabled sections
- Cross-section drag (status change via drag)
- Persisting collapsed state across page loads
