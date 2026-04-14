# Edit Grid: Default to "All" Filter

**Date:** 2026-04-14

## Overview

Change the edit grid's default filter from `active` to `all`, and move the "All" button to the first position in the filter toolbar.

## Changes

**File:** `src/components/editor/EntryGrid.tsx`

1. **Default filter fallback** — When no `?stage=` query param is present (i.e., navigating to `/edit`), the filter currently falls back to `'active'`. Change it to `'all'` so all entries are shown by default.

2. **Filter button order** — Move `{ value: 'all', label: 'All' }` to the first position in `filterOptions`. Button order becomes: All, Active, Staging, Disabled.

## Behavior Unchanged

- `?stage=all` URL continues to work.
- Switching between filter tabs continues to update the URL via `router.replace`.
- The bulk move action bar shows all three move targets when `filter === 'all'` (existing behavior, no change needed).
- Selection is cleared when switching filters (existing behavior, no change needed).
