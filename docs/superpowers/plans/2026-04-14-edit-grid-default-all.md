# Edit Grid: Default to "All" Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the edit grid so it defaults to showing all entries and lists "All" first in the filter toolbar.

**Architecture:** Two one-line edits in `EntryGrid.tsx` — the fallback filter value and the order of `filterOptions`.

**Tech Stack:** Next.js App Router, React, TypeScript

---

### Task 1: Change default filter and reorder filter options

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx:17-19` (default filter)
- Modify: `src/components/editor/EntryGrid.tsx:130-135` (filterOptions order)
- Test: `src/components/editor/__tests__/EntryGrid.test.tsx`

- [ ] **Step 1: Read existing tests**

Read `src/components/editor/__tests__/EntryGrid.test.tsx` to understand the current test structure before writing new tests.

- [ ] **Step 2: Write the failing test for default filter**

In `src/components/editor/__tests__/EntryGrid.test.tsx`, add a test that verifies the grid shows all entries when no `stage` query param is present. Find any existing test that checks the default filter and update it, or add:

```typescript
it('shows all entries by default when no stage param is set', () => {
  // mock useSearchParams to return null for 'stage'
  mockUseSearchParams({ stage: null });
  render(<EntryGrid initialEntries={mockEntries} />);
  // all entries from all statuses should appear
  expect(screen.getAllByTestId('status-badge')).toHaveLength(mockEntries.length);
});
```

Note: check how `useSearchParams` is mocked in the existing test file and follow the same pattern.

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx
```

Expected: the new test fails (currently defaults to `'active'`, so only active entries show).

- [ ] **Step 4: Write the failing test for filter button order**

Add a test that verifies "All" is the first filter button:

```typescript
it('renders "All" as the first filter button', () => {
  render(<EntryGrid initialEntries={mockEntries} />);
  const buttons = screen.getAllByRole('button', { name: /^(All|Active|Staging|Disabled)$/i });
  expect(buttons[0]).toHaveTextContent('All');
});
```

- [ ] **Step 5: Run to verify the order test also fails**

```bash
npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx
```

Expected: the order test fails (currently `'Active'` is first).

- [ ] **Step 6: Implement the changes**

In `src/components/editor/EntryGrid.tsx`, make two edits:

**Change 1 — default filter (line ~18):**
```typescript
// Before:
  const filter: EntryStatus | 'all' = stageParam && validStages.has(stageParam)
    ? (stageParam as EntryStatus | 'all')
    : 'active';

// After:
  const filter: EntryStatus | 'all' = stageParam && validStages.has(stageParam)
    ? (stageParam as EntryStatus | 'all')
    : 'all';
```

**Change 2 — filterOptions order (line ~130):**
```typescript
// Before:
  const filterOptions: Array<{ value: EntryStatus | 'all'; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'staging', label: 'Staging' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'all', label: 'All' },
  ];

// After:
  const filterOptions: Array<{ value: EntryStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'staging', label: 'Staging' },
    { value: 'disabled', label: 'Disabled' },
  ];
```

- [ ] **Step 7: Run all tests and verify they pass**

```bash
npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx
```

Expected: all tests pass.

- [ ] **Step 8: Run full test suite to check for regressions**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/editor/EntryGrid.tsx src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "feat: default edit grid to all entries, show All filter first"
```
