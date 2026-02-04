# Editor: Multi-Select, URL Stage Filter & Back Button

## Overview

Three related improvements to the editor grid and details views:

1. URL-based stage filter so the current view persists across navigation
2. Back button from the details view to return to the grid
3. Multi-select with bulk stage moves via a floating action bar

## 1. URL-Based Stage Filter

- `EntryGrid` reads the `stage` query param via `useSearchParams()`
- Valid values: `active`, `staging`, `disabled`, `all` — defaults to `active` if absent
- Clicking a filter button calls `router.replace(/edit?stage=<value>)` instead of updating local state
- The URL becomes the source of truth, replacing the `filter` state variable
- Entry links in the grid include the current stage context: `/edit/<id>?from=<stage>`

## 2. Back Button in Details View

- `EntryEditor` reads the `from` query param to know which stage the user came from
- A `← Back to grid` link at the top of the editor navigates to `/edit?stage=<from>` (or `/edit` if absent)
- Save and Cancel buttons also navigate to `/edit?stage=<from>` instead of bare `/edit`
- Always an explicit link, not browser-back, for predictable behavior

## 3. Multi-Select & Floating Action Bar

### Selection Mechanics

- Each grid card gets a checkbox on hover (top-left corner, opposite the status badge)
- Once any item is selected, all checkboxes become persistently visible
- Click checkbox to toggle selection; clicking the card body still navigates to details
- Shift+click a checkbox to select the range between it and the last-selected checkbox
- A "Select all" / "Clear selection" button appears in the toolbar when selection is active

### Floating Action Bar

- Fixed at bottom-center of the screen when 1+ items are selected
- Shows: `"N selected"` label + stage move buttons + "× Clear" to deselect
- Buttons depend on the current stage filter to avoid no-op moves:
  - **Active**: "Move to Staging", "Disable"
  - **Staging**: "Move to Active", "Disable"
  - **Disabled**: "Move to Active", "Move to Staging"
  - **All**: all three buttons
- After a bulk move, selection is cleared and the entry list refreshes

### API Approach

- Reuse existing `PUT /api/edit/entries/[id]` called in parallel for each selected entry
- No new bulk endpoint — entry counts are small enough that parallel fetches are fine

## Files to Modify

- `src/components/editor/EntryGrid.tsx` — URL-based filter, checkboxes, selection state, floating action bar
- `src/components/editor/EntryEditor.tsx` — back button, `from` param for save/cancel navigation
- `src/app/edit/[id]/page.tsx` — pass `from` search param to EntryEditor
