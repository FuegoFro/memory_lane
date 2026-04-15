# Drag-and-Drop Reorder Design

**Date:** 2026-04-15
**Status:** Approved

## Overview

Add drag-and-drop reordering to the edit grid so editors can rearrange Active entries by dragging cards directly. Only Active entries (those with a non-null `position`) are draggable. The reorder persists immediately on drop via the existing `PUT /api/edit/entries/reorder` API.

## Scope

- Drag-to-reorder is available in both the **Active** filter view and the **All** filter view
- In the All view, only Active entries are draggable; Staging and Disabled cards are stationary
- Dragging a Staging or Disabled entry does not promote it to Active (out of scope)
- No changes to the backend — the reorder API endpoint already exists

## Library

Install `@dnd-kit/core` and `@dnd-kit/sortable`. This is the current React ecosystem standard for sortable UIs. It handles CSS grid layouts correctly via `rectSortingStrategy`, works with React 19, and is actively maintained.

## Component Architecture

`EntryGrid` gains a `DndContext` wrapping the grid, with a `SortableContext` whose `items` array contains only the IDs of Active entries.

A new `SortableCard` component is extracted from the existing inline card JSX. It calls `useSortable(id)` to get drag props and applies them to the card's root element. Active entries render as `SortableCard`; Staging and Disabled entries render using the same card markup directly (no drag behavior).

```
DndContext (onDragEnd)
└─ SortableContext (activeEntryIds, rectSortingStrategy)
   ├─ SortableCard   ← Active entries
   ├─ SortableCard
   ├─ <div> plain card  ← Staging/Disabled, unchanged
   └─ <div> plain card
```

A `DragOverlay` renders the floating ghost card that follows the cursor during a drag. This is a standard @dnd-kit pattern that avoids CSS transform issues with the grid.

## Drag Interaction States

- **Idle / hover:** Active cards show `cursor: grab`. Staging/Disabled cards show the default cursor.
- **Dragging:** The source slot becomes an empty placeholder (dashed border). A ghost card follows the cursor via `DragOverlay`. Other cards slide to make room using @dnd-kit's built-in animations.
- **Drop:** The card snaps into its new position. Local state updates immediately (optimistic). The reorder API fires in the background.
- **Error:** If the API call fails, local state reverts to the pre-drag snapshot and a brief error message appears in the toolbar (same pattern as the existing sync error message).

## Data Flow

`onDragEnd` on `DndContext`:

1. If `active.id === over.id`, bail — no movement.
2. Snapshot `previousEntries` for rollback.
3. Call `arrayMove(entries, oldIndex, newIndex)` and update local state immediately (optimistic).
4. Extract only Active entry IDs in their new order and call `PUT /api/edit/entries/reorder`.
5. On success: no-op (UI already correct).
6. On error: `setEntries(previousEntries)` and display error in toolbar.

**All view semantics:** Only Active entry IDs are sent to the reorder API. Staging/Disabled entries are excluded from the `orderedIds` payload — their positions are unaffected. On reload, the server returns Active entries first (ordered by position), then Staging, then Disabled, which matches the optimistic update.

## Error Handling

Reorder failures surface via the existing `syncResult` display pattern in the toolbar. The error message is cleared on the next successful action (sync or reorder).

## Testing

All tests in `EntryGrid.test.tsx`. No repository or API test changes needed.

- **Happy path:** Mock @dnd-kit, simulate a drag-end event, assert the reorder API is called with correct Active IDs and local state reflects the new order.
- **Error revert:** API returns 500; assert entries revert to their previous order and an error message is shown.
- **No-op drag:** Drop on the same position; assert API is not called.
- **All view:** Drag an Active card while Staging/Disabled entries are present; assert only Active IDs are sent to the reorder API.
