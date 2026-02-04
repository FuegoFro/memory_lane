# Editor Multi-Select & Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add URL-based stage filtering, a back button from detail view, and multi-select with bulk stage moves to the editor.

**Architecture:** Three incremental changes to the two main editor components (`EntryGrid` and `EntryEditor`). The URL query param `?stage=` becomes the source of truth for filtering. Multi-select state is local to `EntryGrid`. Bulk moves reuse the existing single-entry PUT endpoint in parallel.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Vitest, React Testing Library

**Design doc:** `docs/plans/2026-02-04-editor-multi-select-and-navigation.md`

---

### Task 1: URL-Based Stage Filter — Tests

**Files:**
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`

The `EntryGrid` currently uses local `useState` for the filter. We're replacing that with `useSearchParams()` and `useRouter()`. Tests need to mock `next/navigation` and verify that:

1. The component reads `?stage=` from the URL
2. Filter button clicks call `router.replace()` with the correct query param
3. Default is `active` when no param is present

**Step 1: Update mocks and filter tests**

Add router/searchParams mocks at the top of the test file. Replace the existing `next/link` mock with a combined `next/navigation` + `next/link` mock:

```tsx
// Replace the existing next/link mock with:
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
```

Update `beforeEach` to reset `mockReplace` and `mockSearchParams`:

```tsx
beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockReplace.mockClear();
});
```

Update the test `'filters to show only active entries by default'` — it should still pass with no changes since the default is `active` and `mockSearchParams` starts empty.

Add a new test:

```tsx
it('reads stage filter from URL search params', () => {
  mockSearchParams = new URLSearchParams('stage=staging');
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  expect(screen.getByText('Staging Entry')).toBeInTheDocument();
  expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
});
```

Update test `'clicking staging filter shows staging entries'` to verify `router.replace` is called:

```tsx
it('clicking staging filter updates URL and shows staging entries', () => {
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  fireEvent.click(screen.getByRole('button', { name: /staging/i }));

  expect(mockReplace).toHaveBeenCalledWith('/edit?stage=staging');
});
```

Similarly update `'clicking disabled filter shows disabled entries'`:

```tsx
it('clicking disabled filter updates URL and shows disabled entries', () => {
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  fireEvent.click(screen.getByRole('button', { name: /disabled/i }));

  expect(mockReplace).toHaveBeenCalledWith('/edit?stage=disabled');
});
```

Update `'clicking all filter shows all entries'`:

```tsx
it('clicking all filter updates URL and shows all entries', () => {
  mockSearchParams = new URLSearchParams('stage=all');
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
  expect(screen.getByText('Staging Entry')).toBeInTheDocument();
  expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
});
```

Update `'selected filter button has different styling'` to use searchParams:

```tsx
it('selected filter button has different styling', () => {
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  const activeButton = screen.getByRole('button', { name: /active/i });
  const stagingButton = screen.getByRole('button', { name: /staging/i });

  // Active button should be selected by default
  expect(activeButton).toHaveClass('bg-blue-600');
  expect(stagingButton).not.toHaveClass('bg-blue-600');
});
```

Update `'renders entry links to /edit/[id]'` to include `?from=active`:

```tsx
it('renders entry links with stage context', () => {
  const entries = createTestEntries();
  render(<EntryGrid initialEntries={entries} />);

  const links = screen.getAllByRole('link');
  expect(links.some((link) => link.getAttribute('href') === '/edit/entry-1?from=active')).toBe(true);
  expect(links.some((link) => link.getAttribute('href') === '/edit/entry-2?from=active')).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: Several failures (component still uses local state, links don't have `?from=`)

**Step 3: Commit failing tests**

```bash
git add src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "test: add failing tests for URL-based stage filter in EntryGrid"
```

---

### Task 2: URL-Based Stage Filter — Implementation

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

**Step 1: Implement URL-based filter**

Replace the `filter` state with `useSearchParams` and `useRouter`. In `EntryGrid.tsx`:

Add imports:

```tsx
import { useRouter, useSearchParams } from 'next/navigation';
```

Replace the `filter` state line with:

```tsx
const router = useRouter();
const searchParams = useSearchParams();
const filter = (searchParams.get('stage') as EntryStatus | 'all') || 'active';
```

Remove the line: `const [filter, setFilter] = useState<EntryStatus | 'all'>('active');`

Replace the filter button `onClick`:

```tsx
onClick={() => router.replace(`/edit?stage=${option.value}`)}
```

Update the Link href to include `from` context:

```tsx
href={`/edit/${entry.id}?from=${filter}`}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/editor/EntryGrid.tsx
git commit -m "feat: use URL query param for stage filter in EntryGrid"
```

---

### Task 3: Back Button — Tests

**Files:**
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

**Step 1: Add `backHref` prop mock and back button tests**

The `EntryEditor` will receive a `backHref` prop (the URL to navigate back to). Update the mock and add tests.

Add a new describe block:

```tsx
describe('Back button', () => {
  it('renders a back link', () => {
    const entry = createImageEntry();
    render(<EntryEditor entry={entry} backHref="/edit?stage=active" />);

    const backLink = screen.getByRole('link', { name: /back to grid/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/edit?stage=active');
  });

  it('defaults back link to /edit when no backHref provided', () => {
    const entry = createImageEntry();
    render(<EntryEditor entry={entry} />);

    const backLink = screen.getByRole('link', { name: /back to grid/i });
    expect(backLink).toHaveAttribute('href', '/edit');
  });
});
```

Update Save test `'calls API and navigates on save'` to verify it navigates to `backHref`:

```tsx
it('calls API and navigates on save', async () => {
  const entry = createImageEntry();
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

  render(<EntryEditor entry={entry} backHref="/edit?stage=active" />);

  const saveButton = screen.getByRole('button', { name: /save/i });
  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/entry-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Photo',
        transcript: 'This is a test transcript',
        status: 'active',
      }),
    });
  });

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/edit?stage=active');
  });
});
```

Update Cancel test `'navigates to /edit on cancel'`:

```tsx
it('navigates back on cancel', () => {
  const entry = createImageEntry();
  render(<EntryEditor entry={entry} backHref="/edit?stage=staging" />);

  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  fireEvent.click(cancelButton);

  expect(mockPush).toHaveBeenCalledWith('/edit?stage=staging');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx`
Expected: Failures — no back link rendered, navigation still goes to `/edit`

**Step 3: Commit**

```bash
git add src/components/editor/__tests__/EntryEditor.test.tsx
git commit -m "test: add failing tests for back button and stage-aware navigation"
```

---

### Task 4: Back Button — Implementation

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx`
- Modify: `src/app/edit/[id]/page.tsx`

**Step 1: Add `backHref` prop to EntryEditor**

In `EntryEditor.tsx`, update the interface and add `Link` import:

```tsx
import Link from 'next/link';

interface EntryEditorProps {
  entry: Entry;
  backHref?: string;
}

export function EntryEditor({ entry, backHref }: EntryEditorProps) {
```

Compute the back URL:

```tsx
const backUrl = backHref || '/edit';
```

Add the back link at the top of the return JSX (before the media preview `div`):

```tsx
<Link
  href={backUrl}
  className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
>
  ← Back to grid
</Link>
```

Update `handleSave` to navigate to `backUrl`:

```tsx
router.push(backUrl);
```

Update `handleCancel` to navigate to `backUrl`:

```tsx
router.push(backUrl);
```

**Step 2: Pass `backHref` from the page component**

In `src/app/edit/[id]/page.tsx`, read the `from` search param and pass it:

```tsx
import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/entries';
import { EntryEditor } from '@/components/editor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function EditEntryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  const backHref = from ? `/edit?stage=${from}` : '/edit';

  return <EntryEditor entry={entry} backHref={backHref} />;
}
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/components/editor/EntryEditor.tsx src/app/edit/[id]/page.tsx
git commit -m "feat: add back button and stage-aware navigation to EntryEditor"
```

---

### Task 5: Multi-Select — Tests

**Files:**
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`

**Step 1: Add multi-select tests**

Add a new `describe('Multi-select')` block:

```tsx
describe('Multi-select', () => {
  it('renders checkboxes on entry cards', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2); // 2 active entries shown by default
  });

  it('clicking checkbox selects an entry without navigating', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows floating action bar when entries are selected', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('shows correct count when multiple entries selected', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('hides floating action bar when selection is cleared', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    // Uncheck
    fireEvent.click(checkboxes[0]);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('clear button deselects all entries', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });

  it('shows select all button when any entry is selected', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
  });

  it('select all selects all visible entries', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select one to reveal "Select all"

    fireEvent.click(screen.getByRole('button', { name: /select all/i }));

    checkboxes.forEach((cb) => expect(cb).toBeChecked());
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: Failures — no checkboxes rendered, no action bar

**Step 3: Commit**

```bash
git add src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "test: add failing tests for multi-select in EntryGrid"
```

---

### Task 6: Multi-Select — Implementation (Selection State & Checkboxes)

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

**Step 1: Add selection state and checkbox UI**

Add state for selection tracking:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const lastSelectedRef = useRef<string | null>(null);
```

Add `useRef` to the React import.

Add helper functions:

```tsx
function toggleSelection(entryId: string, shiftKey: boolean) {
  setSelectedIds((prev) => {
    const next = new Set(prev);

    if (shiftKey && lastSelectedRef.current) {
      // Range select: select everything between last selected and this one
      const ids = filteredEntries.map((e) => e.id);
      const lastIdx = ids.indexOf(lastSelectedRef.current);
      const currentIdx = ids.indexOf(entryId);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const [start, end] = [Math.min(lastIdx, currentIdx), Math.max(lastIdx, currentIdx)];
        for (let i = start; i <= end; i++) {
          next.add(ids[i]);
        }
      }
    } else if (next.has(entryId)) {
      next.delete(entryId);
    } else {
      next.add(entryId);
    }

    lastSelectedRef.current = entryId;
    return next;
  });
}

function selectAll() {
  setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
}

function clearSelection() {
  setSelectedIds(new Set());
  lastSelectedRef.current = null;
}
```

Clear selection when filter changes — add after the `filter` const:

```tsx
const prevFilterRef = useRef(filter);
if (prevFilterRef.current !== filter) {
  prevFilterRef.current = filter;
  if (selectedIds.size > 0) {
    clearSelection();
  }
}
```

Note: this is a pattern for clearing side state on prop change without useEffect. The refs and set calls happen during render but only when filter actually changes.

In the toolbar (after the filter buttons div, before the size slider div), add the select all / clear selection button that only shows when there's a selection:

```tsx
{selectedIds.size > 0 && (
  <div className="flex gap-2">
    <button
      onClick={selectAll}
      className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
    >
      Select all
    </button>
    <button
      onClick={clearSelection}
      className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
    >
      Clear selection
    </button>
  </div>
)}
```

In the entry card, change the `<Link>` wrapper to a `<div>` containing both a checkbox and the link. Replace the entire `filteredEntries.map(...)` block:

```tsx
{filteredEntries.map((entry) => {
  const status = getEntryStatus(entry);
  const isSelected = selectedIds.has(entry.id);
  const hasSelection = selectedIds.size > 0;
  return (
    <div
      key={entry.id}
      className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
    >
      {/* Checkbox */}
      <div
        className={`absolute top-2 left-2 z-10 ${
          hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelection(entry.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded cursor-pointer accent-blue-500"
        />
      </div>

      <Link
        href={`/edit/${entry.id}?from=${filter}`}
        className="block"
      >
        {/* Thumbnail */}
        <img
          src={`/api/media/${entry.id}`}
          alt={entry.title || 'Entry thumbnail'}
          className="w-full aspect-square object-cover"
        />

        {/* Status badge */}
        <div
          data-testid="status-badge"
          className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusBadgeColor(status)}`}
        />

        {/* Hover overlay */}
        <div
          data-testid="entry-overlay"
          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
        >
          <span className="text-white font-medium text-center line-clamp-2">
            {entry.title || 'Untitled'}
          </span>
          <span className="text-gray-300 text-sm capitalize mt-1">
            {status}
          </span>
        </div>
      </Link>
    </div>
  );
})}
```

**Step 2: Run tests to verify selection tests pass**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: All multi-select tests pass. Existing tests should also pass (links moved inside div but still render).

**Step 3: Commit**

```bash
git add src/components/editor/EntryGrid.tsx
git commit -m "feat: add multi-select checkboxes and selection state to EntryGrid"
```

---

### Task 7: Floating Action Bar — Tests

**Files:**
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`

**Step 1: Add floating action bar tests**

Add a new `describe('Floating action bar')` block:

```tsx
describe('Floating action bar', () => {
  it('shows context-appropriate move buttons for active filter', () => {
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // Active view: should offer "Move to Staging" and "Disable" (not "Move to Active")
    expect(screen.getByRole('button', { name: /move to staging/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move to active/i })).not.toBeInTheDocument();
  });

  it('shows context-appropriate move buttons for staging filter', () => {
    mockSearchParams = new URLSearchParams('stage=staging');
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /move to active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move to staging/i })).not.toBeInTheDocument();
  });

  it('shows context-appropriate move buttons for disabled filter', () => {
    mockSearchParams = new URLSearchParams('stage=disabled');
    const entries = createTestEntries();
    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /move to active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move to staging/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disable/i })).not.toBeInTheDocument();
  });

  it('bulk move calls API for each selected entry and refreshes', async () => {
    const entries = createTestEntries();
    // Mock: all PUT calls succeed, then GET entries returns updated list
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(entries) });

    render(<EntryGrid initialEntries={entries} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: /move to staging/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/entry-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'staging' }),
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/entry-2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'staging' }),
      });
    });

    // Should refresh entries list after bulk move
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries');
    });

    // Selection should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: Failures — no move buttons rendered, no bulk API calls

**Step 3: Commit**

```bash
git add src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "test: add failing tests for floating action bar"
```

---

### Task 8: Floating Action Bar — Implementation

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

**Step 1: Add bulk move handler and floating bar UI**

Add the bulk move handler function inside `EntryGrid`:

```tsx
async function handleBulkMove(targetStatus: EntryStatus) {
  const ids = Array.from(selectedIds);
  await Promise.all(
    ids.map((id) =>
      fetch(`/api/edit/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
    )
  );

  // Refresh entries
  const res = await fetch('/api/edit/entries');
  const data = await res.json();
  setEntries(data);
  clearSelection();
}
```

Compute which move buttons to show based on current filter:

```tsx
const moveButtons: Array<{ label: string; status: EntryStatus }> = [];
if (filter !== 'active') moveButtons.push({ label: 'Move to Active', status: 'active' });
if (filter !== 'staging') moveButtons.push({ label: 'Move to Staging', status: 'staging' });
if (filter !== 'disabled') moveButtons.push({ label: 'Disable', status: 'disabled' });
```

Add the floating action bar at the end of the component's return JSX, just before the closing `</div>`:

```tsx
{/* Floating action bar */}
{selectedIds.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-50">
    <span className="text-white font-medium">
      {selectedIds.size} selected
    </span>

    {moveButtons.map((btn) => (
      <button
        key={btn.status}
        onClick={() => handleBulkMove(btn.status)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        {btn.label}
      </button>
    ))}

    <button
      onClick={clearSelection}
      className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
    >
      Clear
    </button>
  </div>
)}
```

**Step 2: Run all tests to verify they pass**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/editor/EntryGrid.tsx
git commit -m "feat: add floating action bar for bulk stage moves"
```

---

### Task 9: Run Full Test Suite & Final Commit

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Fix any regressions**

If any tests fail, fix them. The most likely issues:
- EntryEditor tests that still expect `mockPush` to be called with `/edit` (without stage param) — these should have been updated in Task 3
- EntryGrid tests where link assertions changed from `/edit/entry-1` to `/edit/entry-1?from=active`

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test regressions from editor navigation changes"
```
