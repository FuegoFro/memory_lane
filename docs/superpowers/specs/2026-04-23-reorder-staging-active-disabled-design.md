# Spec: Reorder Staging, Active, and Disabled Sections

Establish a consistent global order across the application: **Just arrived (Staging) → In the slideshow (Active) → Set aside (Disabled)**.

## 1. Data Layer

Update the repository to reflect the new global order in all-entry queries.

### `src/lib/entries/repository.ts`
- Update `getAllEntries` to use a new `CASE` order in SQL:
  - `0`: Staging (`disabled = 0` AND `position IS NULL`)
  - `1`: Active (`disabled = 0` AND `position IS NOT NULL`)
  - `2`: Disabled (`disabled = 1`)

## 2. Editor Grid Layout

The editor grid will be updated to always show sections in the new order, with a compact empty state for "Just arrived".

### `src/components/editor/EntryGrid.tsx`
- **Section Order**: "Just arrived" section is always rendered first, followed by "In the slideshow", then "Set aside" (inside the drawer).
- **Just Arrived Empty State**:
  - Remove the separate empty state section that appeared below Active.
  - When empty (`staging.length === 0`):
    - Pass `hint="Nothing waiting for review"` to the `SectionHeader`.
    - Do not render the `EmptyState` component or the "Add all" button.
- **Disabled Drawer**: Always stays at the bottom.

## 3. Navigation & Action Bars

Align all UI controls with the new sequence.

### `src/components/editor/EditorToolbar.tsx`
- Reorder `DEFS` array: `staging` → `active` → `disabled`.

### `src/components/editor/SelectionBar.tsx`
- Reorder `DESTS` array: `staging` → `active` → `disabled`.

## 4. Verification Plan

### Automated Tests
- Update `src/lib/entries/__tests__/repository.test.ts` to verify the new `getAllEntries` order.
- Update `src/components/editor/__tests__/EntryGrid.test.tsx` (if it exists) to verify section rendering order and the new compact empty state.

### Manual Verification
1. Open the editor with no staging entries: Confirm "Just arrived" is at the top with the "Nothing waiting" hint and no large empty block.
2. Add entries to staging: Confirm they appear at the top.
3. Check the "Jump to" menu: Confirm the order is "Just arrived", "In the slideshow", "Set aside".
4. Select entries: Confirm the Selection Bar order is "Just arrived", "Slideshow", "Set aside".
