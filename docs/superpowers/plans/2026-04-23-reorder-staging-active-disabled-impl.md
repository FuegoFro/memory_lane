# Reorder Staging, Active, and Disabled Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a consistent global order across the application: Just arrived (Staging) → In the slideshow (Active) → Set aside (Disabled).

**Architecture:** Update the data layer (SQL) for base ordering, then align all UI components (Grid, Toolbar, Selection Bar) to follow this sequence. Implement a compact "Inline Hint" for the Staging empty state.

**Tech Stack:** Next.js (App Router), SQLite (better-sqlite3), Vitest, React.

---

### Task 1: Repository Order

**Files:**
- Modify: `src/lib/entries/repository.ts`
- Test: `src/lib/entries/__tests__/repository.test.ts`

- [ ] **Step 1: Write the failing test**

Modify `src/lib/entries/__tests__/repository.test.ts` to expect Staging entries before Active entries in `getAllEntries`.

```typescript
// src/lib/entries/__tests__/repository.test.ts
// ... inside describe('getAllEntries')
it('returns staging entries first, then active entries, then disabled entries last', () => {
  createEntry('/path/active.jpg');
  createEntry('/path/staging.jpg');
  createEntry('/path/disabled.jpg');

  const active = getEntryByPath('/path/active.jpg')!;
  const disabled = getEntryByPath('/path/disabled.jpg')!;

  updateEntry(active.id, { position: 0 });
  updateEntry(disabled.id, { disabled: true });

  const entries = getAllEntries();
  expect(entries.length).toBe(3);
  // Staging (position null, not disabled) should be first
  expect(entries[0].dropbox_path).toBe('/path/staging.jpg');
  // Active should be second
  expect(entries[1].dropbox_path).toBe('/path/active.jpg');
  // Disabled should be last
  expect(entries[2].dropbox_path).toBe('/path/disabled.jpg');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/entries/__tests__/repository.test.ts`
Expected: FAIL (Staging is currently 2nd or 3rd)

- [ ] **Step 3: Update SQL sort order**

Modify `src/lib/entries/repository.ts`:

```typescript
// src/lib/entries/repository.ts
export function getAllEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    ORDER BY
      CASE WHEN disabled = 1 THEN 2
           WHEN position IS NULL THEN 0 -- Staging is 0
           ELSE 1                       -- Active is 1
      END,
      position ASC,
      created_at DESC
  `);
  return stmt.all() as Entry[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/entries/__tests__/repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/repository.ts src/lib/entries/__tests__/repository.test.ts
git commit -m "refactor: update global entry sort order (staging -> active -> disabled)"
```

---

### Task 2: Editor Toolbar & Selection Bar Reordering

**Files:**
- Modify: `src/components/editor/EditorToolbar.tsx`
- Modify: `src/components/editor/SelectionBar.tsx`

- [ ] **Step 1: Reorder EditorToolbar DEFS**

Modify `src/components/editor/EditorToolbar.tsx`:

```typescript
const DEFS: { key: SectionKey; label: string; color: string }[] = [
  { key: 'staging', label: 'Just arrived', color: 'var(--color-staging)' },
  { key: 'active', label: 'In the slideshow', color: 'var(--color-accent)' },
  { key: 'disabled', label: 'Set aside', color: 'var(--color-disabled-ink)' },
];
```

- [ ] **Step 2: Reorder SelectionBar DESTS**

Modify `src/components/editor/SelectionBar.tsx`:

```typescript
const DESTS: { label: string; status: EntryStatus; dot: string }[] = [
  { label: 'Just arrived', status: 'staging', dot: 'var(--color-staging)' },
  { label: 'Slideshow', status: 'active', dot: 'var(--color-accent)' },
  { label: 'Set aside', status: 'disabled', dot: 'var(--color-disabled-ink)' },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorToolbar.tsx src/components/editor/SelectionBar.tsx
git commit -m "ui: reorder toolbar and selection bar actions to staging -> active -> disabled"
```

---

### Task 3: EntryGrid Section Order & Compact Empty State

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`
- Test: `src/components/editor/__tests__/EntryGrid.test.tsx`

- [ ] **Step 1: Write/Update Grid order test**

Ensure "Just arrived" section header is always first.

```typescript
// src/components/editor/__tests__/EntryGrid.test.tsx
it('always renders Staging section first, even if empty', () => {
  // Render with no staging entries
  render(<EntryGrid initialEntries={[]} />);
  const headers = screen.getAllByRole('heading', { level: 2 });
  expect(headers[0]).toHaveTextContent('Just arrived');
  expect(headers[1]).toHaveTextContent('In the slideshow');
});

it('shows inline hint when Staging is empty', () => {
  render(<EntryGrid initialEntries={[]} />);
  expect(screen.getByText(/Nothing waiting for review/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: FAIL

- [ ] **Step 3: Reorder sections and implement inline hint**

Modify `src/components/editor/EntryGrid.tsx`:
1. Move Staging section above Active section.
2. Remove conditional rendering of Staging section.
3. Add `hint` to `SectionHeader` when staging is empty.
4. Hide `EmptyState` and "Add all" button for Staging when empty.

```typescript
// src/components/editor/EntryGrid.tsx

// ... inside EntryGrid component
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper)' }}>
      {/* ... Masthead and Toolbar ... */}

      <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 100px', userSelect: 'none' }}>
        {/* Staging — Always at top */}
        <section id={SECTION_IDS.staging}>
          <SectionHeader
            id="sec-staging-header"
            label="Just arrived"
            count={staging.length}
            color="var(--color-staging)"
            hint={staging.length === 0 ? "Nothing waiting for review" : `${staging.length} waiting for review`}
            rightSlot={staging.length > 0 ? (
              <Btn
                kind="subtle"
                onClick={async () => {
                  const ids = staging.map((e) => e.id);
                  // ... existing bulk move logic ...
                }}
              >
                Add all to slideshow
              </Btn>
            ) : null}
          />
          {staging.length > 0 && (
            <div data-testid="entry-grid-staging" style={gridStyle(density)}>
              {fStaging.map((e) => (
                <Thumb
                  key={e.id}
                  entry={toThumbEntry(e, density)}
                  selected={selectedIds.has(e.id)}
                  multiSelectActive={selectedIds.size > 0}
                  onToggleSelect={(ev) => toggleSelection(e.id, ev.shiftKey, staging)}
                  onOpen={() => setOpenEntryId(e.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Active */}
        <section id={SECTION_IDS.active}>
          <SectionHeader
            id="sec-active-header"
            label="In the slideshow"
            count={active.length}
            color="var(--color-accent)"
            hint="Drag to reorder"
          />
          {/* ... existing Active DndContext and grid logic ... */}
        </section>

        {/* Removed: Staging when empty block section */}

        {/* Disabled drawer */}
        {/* ... existing DisabledDrawer logic ... */}
      </div>
      {/* ... SelectionBar and Modal ... */}
    </div>
  );
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EntryGrid.tsx src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "ui: make Staging always top and use inline hint for empty state"
```
