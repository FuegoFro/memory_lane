# Edit Modal — Local State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace URL-based edit-modal routing with local component state in `EntryGrid`, deleting the broken intercepting route (`/edit/@modal/(.)[ id]`) and the dead direct route (`/edit/[id]`).

**Architecture:** `EntryGrid` owns `selectedEntry: Entry | null` state. Cards become `<button>` elements that call an `onOpen(entry)` prop. The modal renders inline when `selectedEntry` is non-null. `Modal` takes an `onClose` callback instead of a `closeHref`. `EntryEditor` gains an `onEntryUpdated` callback so the grid stays in sync with edits.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, Vitest + Testing Library, dnd-kit

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/edit/@modal/` (dir) | **Delete** | Broken intercepting route |
| `src/app/edit/[id]/` (dir) | **Delete** | Dead direct route |
| `src/app/edit/layout.tsx` | **Modify** | Drop `modal` slot prop + render |
| `src/components/ui/Modal.tsx` | **Modify** | `closeHref` → `onClose` callback |
| `src/components/ui/__tests__/Modal.test.tsx` | **Create** | Tests for new Modal API |
| `src/components/editor/EntryEditor.tsx` | **Modify** | Add `onEntryUpdated`, drop unused `backHref` |
| `src/components/editor/__tests__/EntryEditor.test.tsx` | **Modify** | Add `onEntryUpdated` test |
| `src/components/editor/EntryGrid.tsx` | **Modify** | Cards as buttons, local modal state, render Modal inline |
| `src/components/editor/__tests__/EntryGrid.test.tsx` | **Modify** | Replace link-href assertions with click-to-open / close / update |

---

## Ordering rationale

Tasks run in an order that keeps the app buildable and tests green at every commit:

1. Delete the broken `@modal` directory first — it's pure dead code. Direct `/edit/[id]` stays for now so card `<Link>`s still resolve.
2. Change `Modal`'s API (no consumers left after step 1, so nothing else to fix).
3. Add `onEntryUpdated` to `EntryEditor`.
4. Rewire `EntryGrid` — cards now open the modal via local state, never navigate.
5. Delete `/edit/[id]` and clean up unused `EntryEditor` props.

---

## Task 1: Delete broken intercepting route and modal layout slot

**Files:**
- Delete: `src/app/edit/@modal/` (entire directory, including the misnamed `(.)[ id]` subdir)
- Modify: `src/app/edit/layout.tsx`

No TDD on this task — it's deletion of dead code. The intercept never matched at runtime (directory name has a literal space), so deletion changes no observable behavior.

- [ ] **Step 1: Delete the `@modal` directory**

Run:
```bash
rm -rf "src/app/edit/@modal"
```

- [ ] **Step 2: Remove `modal` slot from layout**

In `src/app/edit/layout.tsx`, replace the entire file with:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/edit" className="text-xl font-bold text-white">
            Memory Lane Editor
          </Link>

          <div className="flex gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white"
              target="_blank"
            >
              View Slideshow
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
```

- [ ] **Step 3: Run full test suite and build**

Run: `npm run test:run && npm run build`
Expected: tests pass, build succeeds. The existing `src/app/edit/__tests__/layout.test.tsx` does not pass a `modal` slot, so it continues to pass unchanged. The build succeeds because `/edit/[id]/page.tsx` still exists and renders `<EntryGrid />` — cards still navigate successfully.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete broken @modal intercepting route"
```

---

## Task 2: Refactor Modal to use onClose callback (TDD)

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/__tests__/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/Modal.test.tsx`:

```tsx
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Modal } from '../Modal';

// jsdom doesn't implement HTMLDialogElement.showModal/close — stub them.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

describe('Modal', () => {
  it('renders children', () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>Hello modal</p>
      </Modal>
    );
    expect(screen.getByText('Hello modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when dialog fires its close event', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/components/ui/__tests__/Modal.test.tsx`
Expected: FAIL — TypeScript / prop error because `Modal` still takes `closeHref`, not `onClose`.

- [ ] **Step 3: Update Modal to use onClose**

Replace the full contents of `src/components/ui/Modal.tsx` with:

```tsx
'use client';

import { useEffect, useRef } from 'react';

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4 sm:p-6 w-full h-full max-w-none max-h-none m-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 4: Run the Modal tests and verify they pass**

Run: `npx vitest run src/components/ui/__tests__/Modal.test.tsx`
Expected: PASS — all three tests green.

- [ ] **Step 5: Run full test suite to confirm nothing else broke**

Run: `npm run test:run`
Expected: PASS. `EntryGrid.test.tsx` still passes because it never renders the `Modal` directly (grid currently uses `<Link>`s, not `<Modal>`). Task 1 already removed the only other consumer.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/__tests__/Modal.test.tsx
git commit -m "refactor: convert Modal to onClose callback"
```

---

## Task 3: Add onEntryUpdated callback to EntryEditor (TDD)

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx`
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

The callback fires after a successful save inside `saveNow`, with the full merged `Entry` object so the grid can patch its local state.

- [ ] **Step 1: Write the failing test**

In `src/components/editor/__tests__/EntryEditor.test.tsx`, locate the `describe('Autosave behavior', () => { … })` block (starts near line 275). It already sets up `vi.useFakeTimers()` in its `beforeEach`. Append the following two tests at the **end of that describe block** (after the last `it(...)` inside `Autosave behavior`, before its closing `});`):

```tsx
    it('calls onEntryUpdated with the entry returned from the server', async () => {
      const entry = createImageEntry();
      const serverResponse: Entry = { ...entry, title: 'Renamed' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(serverResponse) });

      const onEntryUpdated = vi.fn();
      render(<EntryEditor entry={entry} onEntryUpdated={onEntryUpdated} />);

      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Renamed' } });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(onEntryUpdated).toHaveBeenCalledWith(serverResponse);
    });

    it('does not call onEntryUpdated if the save fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const entry = createImageEntry();
      const onEntryUpdated = vi.fn();
      render(<EntryEditor entry={entry} onEntryUpdated={onEntryUpdated} />);

      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Fail' } });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(onEntryUpdated).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx -t "onEntryUpdated"`
Expected: FAIL — `onEntryUpdated` prop doesn't exist on `EntryEditor`, so TypeScript rejects the render (or the prop is silently ignored and `toHaveBeenCalledWith` fails).

- [ ] **Step 3: Implement onEntryUpdated in EntryEditor**

In `src/components/editor/EntryEditor.tsx`:

a) Update the props interface (around line 11–15):

```tsx
interface EntryEditorProps {
  entry: Entry;
  backHref?: string;
  hasNarration?: boolean;
  onEntryUpdated?: (entry: Entry) => void;
}
```

b) Destructure the new prop in the component signature (around line 17):

```tsx
export function EntryEditor({ entry, backHref, hasNarration: initialHasNarration = false, onEntryUpdated }: EntryEditorProps) {
```

c) Update the `saveNow` callback (around lines 38–58) to fire `onEntryUpdated` with the server's response after a successful PUT. Replace the entire function body with:

```tsx
  const saveNow = useCallback(async (payload: { title: string, transcript: string, status: EntryStatus } | null) => {
    if (!payload) return;
    try {
      const res = await fetch(`/api/edit/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (pendingSaveRef.current === payload) {
        lastSavedRef.current = payload;
        pendingSaveRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus((current) => current === 'saved' ? 'idle' : current);
        }, 2000);
        if (res.ok && onEntryUpdated) {
          try {
            const updated = (await res.json()) as Entry;
            onEntryUpdated(updated);
          } catch {
            // Response wasn't JSON — ignore, UI already showed "saved".
          }
        }
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [entry.id, onEntryUpdated]);
```

Why read the response body: the server has authoritative logic for status → position mapping (e.g., `getNextPosition()` when promoting staging → active — see `src/app/api/edit/entries/[id]/route.ts:56-58`). Using the response avoids duplicating that logic client-side.

The `onEntryUpdated` call is inside the `if (pendingSaveRef.current === payload)` block so a superseded (stale) save can't overwrite the grid with outdated data — only the save whose payload is still the most recent fires the callback.

- [ ] **Step 4: Run the new tests and verify they pass**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx -t "onEntryUpdated"`
Expected: PASS — both new cases green.

- [ ] **Step 5: Run the full EntryEditor test file to confirm no regressions**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx`
Expected: PASS — all existing tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/EntryEditor.tsx src/components/editor/__tests__/EntryEditor.test.tsx
git commit -m "feat: add onEntryUpdated callback to EntryEditor"
```

---

## Task 4: Rewire EntryGrid with local modal state (TDD)

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`

This is the main refactor. Cards become `<button>`s that set `selectedEntry` state. The `Modal` renders inline when `selectedEntry` is non-null.

- [ ] **Step 1: Update tests — remove link-href assertions, add open/close/update cases**

In `src/components/editor/__tests__/EntryGrid.test.tsx`:

**a) Delete** the test at approximately lines 153–161:

```tsx
// DELETE THIS TEST:
it('renders entry links without stage query param', () => {
  render(<EntryGrid initialEntries={createTestEntries()} />);
  const links = screen.getAllByRole('link');
  expect(links.some((l) => l.getAttribute('href') === '/edit/entry-1')).toBe(true);
  expect(links.some((l) => l.getAttribute('href') === '/edit/entry-3')).toBe(true);
  links.forEach((l) => {
    expect(l.getAttribute('href')).not.toContain('stage=');
  });
});
```

**b) Delete** the `vi.mock('next/link', …)` block at the top of the file (approximately lines 11–19) — nothing in the grid uses `<Link>` anymore after this refactor.

**c) Add** the following `describe` block at the end of `describe('EntryGrid', …)` (before the final closing `});`):

```tsx
  describe('Entry modal', () => {
    beforeEach(() => {
      HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      });
      HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      });
    });

    it('opens the entry editor when a card is clicked', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      // Editor not rendered initially
      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /open entry active entry 1/i }));

      // Editor now rendered, with the clicked entry's title in the title field
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.value).toBe('Active Entry 1');
    });

    it('closes the editor when the close button is clicked', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /open entry active entry 1/i }));
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    });

    it('updates the grid card when the editor reports an entry update', async () => {
      const entries = createTestEntries();
      const renamed = { ...entries[0], title: 'Renamed Entry' };
      // EntryEditor reads the PUT response as the authoritative updated entry.
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(renamed) });
      vi.useFakeTimers();
      try {
        render(<EntryGrid initialEntries={entries} />);
        fireEvent.click(screen.getByRole('button', { name: /open entry active entry 1/i }));

        const titleInput = screen.getByLabelText(/title/i);
        fireEvent.change(titleInput, { target: { value: 'Renamed Entry' } });

        await act(async () => {
          vi.advanceTimersByTime(1000);
        });

        // Close the modal and verify the card in the grid shows the new title
        fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
        expect(screen.getByText('Renamed Entry')).toBeInTheDocument();
        expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });
```

- [ ] **Step 2: Run the tests and verify the new ones fail**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: the three new tests under "Entry modal" FAIL. Reason: clicking a card today triggers a `<Link>` navigation, not a modal open. `getByRole('button', { name: /open entry .../i })` won't find anything.

- [ ] **Step 3: Rewire EntryGrid — cards become buttons, add modal state, render Modal inline**

Replace the full contents of `src/components/editor/EntryGrid.tsx` with:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Entry, getEntryStatus, EntryStatus } from '@/types';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { StageSection } from './StageSection';
import { EntryEditor } from './EntryEditor';
import { Modal } from '@/components/ui/Modal';

interface CardProps {
  entry: Entry;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelection: (id: string, shiftKey: boolean) => void;
  onOpen: (entry: Entry) => void;
}

function SortableCard({ entry, isSelected, hasSelection, onToggleSelection, onOpen }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.3 : undefined,
      }}
      {...attributes}
      {...listeners}
      className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all cursor-grab active:cursor-grabbing"
    >
      <div
        className={`absolute top-2 left-2 z-10 ${
          hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(entry.id, e.shiftKey);
          }}
          className="w-5 h-5 rounded cursor-pointer accent-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={`Open entry ${entry.title || 'Untitled'}`}
        className="block w-full text-left p-0 bg-transparent border-0"
      >
        <img
          src={`/api/media/${entry.id}`}
          alt={entry.title || 'Entry thumbnail'}
          className="w-full aspect-square object-cover"
        />
        <div
          data-testid="entry-overlay"
          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
        >
          <span className="text-white font-medium text-center line-clamp-2">
            {entry.title || 'Untitled'}
          </span>
        </div>
      </button>
    </div>
  );
}

function StaticCard({ entry, isSelected, hasSelection, onToggleSelection, onOpen }: CardProps) {
  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all">
      <div
        className={`absolute top-2 left-2 z-10 ${
          hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(entry.id, e.shiftKey);
          }}
          className="w-5 h-5 rounded cursor-pointer accent-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={`Open entry ${entry.title || 'Untitled'}`}
        className="block w-full text-left p-0 bg-transparent border-0"
      >
        <img
          src={`/api/media/${entry.id}`}
          alt={entry.title || 'Entry thumbnail'}
          className="w-full aspect-square object-cover"
        />
        <div
          data-testid="entry-overlay"
          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
        >
          <span className="text-white font-medium text-center line-clamp-2">
            {entry.title || 'Untitled'}
          </span>
        </div>
      </button>
    </div>
  );
}

interface EntryGridProps {
  initialEntries: Entry[];
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({ active: false, staging: false, disabled: false });
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeEntries = entries.filter((e) => getEntryStatus(e) === 'active');
  const stagingEntries = entries.filter((e) => getEntryStatus(e) === 'staging');
  const disabledEntries = entries.filter((e) => getEntryStatus(e) === 'disabled');
  const activeEntryIds = activeEntries.map((e) => e.id);

  function toggleCollapse(status: EntryStatus) {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/edit/entries/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Added ${data.added} new entries`);
        const entriesRes = await fetch('/api/edit/entries');
        const entriesData = await entriesRes.json();
        setEntries(entriesData);
      } else {
        setSyncResult('Sync failed');
      }
    } catch {
      setSyncResult('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    const previousEntries = [...entries];
    const newEntries = arrayMove(entries, oldIndex, newIndex);
    setEntries(newEntries);

    const orderedIds = newEntries
      .filter((e) => getEntryStatus(e) === 'active')
      .map((e) => e.id);

    fetch('/api/edit/entries/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Reorder failed');
      })
      .catch(() => {
        setEntries(previousEntries);
        setSyncResult('Reorder failed');
      });
  }

  function toggleSelection(entryId: string, shiftKey: boolean, sectionEntries: Entry[]) {
    const lastSelected = lastSelectedRef.current;
    lastSelectedRef.current = entryId;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && lastSelected) {
        const ids = sectionEntries.map((e) => e.id);
        const lastIdx = ids.indexOf(lastSelected);
        const currentIdx = ids.indexOf(entryId);
        if (lastIdx !== -1 && currentIdx !== -1) {
          const [start, end] = [Math.min(lastIdx, currentIdx), Math.max(lastIdx, currentIdx)];
          for (let i = start; i <= end; i++) {
            next.add(ids[i]);
          }
        } else {
          if (next.has(entryId)) next.delete(entryId);
          else next.add(entryId);
        }
      } else if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(entries.map((e) => e.id)));
  }

  function selectAllInSection(sectionEntries: Entry[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sectionEntries.forEach((e) => next.add(e.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }

  async function handleBulkMove(targetStatus: EntryStatus) {
    try {
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
      const res = await fetch('/api/edit/entries');
      const data = await res.json();
      setEntries(data);
      clearSelection();
    } catch (error) {
      console.error('Bulk move failed:', error);
      setSyncResult('Move failed');
    }
  }

  function handleEntryUpdated(updated: Entry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelectedEntry(updated);
  }

  const moveButtons: Array<{ label: string; status: EntryStatus }> = [
    { label: 'Move to Active', status: 'active' },
    { label: 'Move to Staging', status: 'staging' },
    { label: 'Disable', status: 'disabled' },
  ];

  const activeEntry = activeId ? entries.find((e) => e.id === activeId) : null;

  const gridStyle = {
    display: 'grid' as const,
    gap: '1rem',
    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
  };

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {selectedIds.size > 0 && (
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Select all
          </button>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="size-slider" className="text-gray-300 text-sm">
            Size:
          </label>
          <input
            id="size-slider"
            type="range"
            min="100"
            max="400"
            value={thumbnailSize}
            onChange={(e) => setThumbnailSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-gray-400 text-sm w-12">{thumbnailSize}px</span>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            syncing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {syncing ? 'Syncing...' : 'Sync from Dropbox'}
        </button>

        {syncResult && (
          <span
            className={`text-sm ${
              syncResult.includes('failed') ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {syncResult}
          </span>
        )}
      </div>

      {/* Active section — wrapped in DndContext for drag-to-reorder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <StageSection
          status="active"
          count={activeEntries.length}
          collapsed={collapsed.active}
          onToggleCollapse={() => toggleCollapse('active')}
          onSelectAll={() => selectAllInSection(activeEntries)}
        >
          <SortableContext items={activeEntryIds} strategy={rectSortingStrategy}>
            <div data-testid="entry-grid" style={gridStyle}>
              {activeEntries.map((entry) => (
                <SortableCard
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedIds.has(entry.id)}
                  hasSelection={selectedIds.size > 0}
                  onToggleSelection={(id, shiftKey) =>
                    toggleSelection(id, shiftKey, activeEntries)
                  }
                  onOpen={setSelectedEntry}
                />
              ))}
            </div>
          </SortableContext>
        </StageSection>

        <DragOverlay>
          {activeEntry ? (
            <div className="rounded-lg overflow-hidden bg-gray-800 ring-2 ring-blue-500 shadow-2xl rotate-1 opacity-95">
              <img
                src={`/api/media/${activeEntry.id}`}
                alt={activeEntry.title || 'Entry thumbnail'}
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Staging section */}
      <StageSection
        status="staging"
        count={stagingEntries.length}
        collapsed={collapsed.staging}
        onToggleCollapse={() => toggleCollapse('staging')}
        onSelectAll={() => selectAllInSection(stagingEntries)}
      >
        <div style={gridStyle}>
          {stagingEntries.map((entry) => (
            <StaticCard
              key={entry.id}
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              hasSelection={selectedIds.size > 0}
              onToggleSelection={(id, shiftKey) =>
                toggleSelection(id, shiftKey, stagingEntries)
              }
              onOpen={setSelectedEntry}
            />
          ))}
        </div>
      </StageSection>

      {/* Disabled section */}
      <StageSection
        status="disabled"
        count={disabledEntries.length}
        collapsed={collapsed.disabled}
        onToggleCollapse={() => toggleCollapse('disabled')}
        onSelectAll={() => selectAllInSection(disabledEntries)}
      >
        <div style={gridStyle}>
          {disabledEntries.map((entry) => (
            <StaticCard
              key={entry.id}
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              hasSelection={selectedIds.size > 0}
              onToggleSelection={(id, shiftKey) =>
                toggleSelection(id, shiftKey, disabledEntries)
              }
              onOpen={setSelectedEntry}
            />
          ))}
        </div>
      </StageSection>

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-white font-medium">{selectedIds.size} selected</span>

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

      {/* Entry editor modal */}
      {selectedEntry && (
        <Modal onClose={() => setSelectedEntry(null)}>
          <EntryEditor
            entry={selectedEntry}
            hasNarration={!!selectedEntry.has_narration}
            onEntryUpdated={handleEntryUpdated}
          />
        </Modal>
      )}
    </div>
  );
}
```

Key changes vs. the previous file:
- Removed `import Link from 'next/link'`.
- Added `import { EntryEditor } from './EntryEditor'` and `import { Modal } from '@/components/ui/Modal'`.
- Both card components replace `<Link>` with `<button type="button" onClick={() => onOpen(entry)} aria-label="Open entry ...">`.
- `CardProps` gains `onOpen: (entry: Entry) => void`.
- `EntryGrid` gains `selectedEntry` state, `handleEntryUpdated` function, and a final `<Modal>` render.
- All `<SortableCard>` / `<StaticCard>` call sites receive `onOpen={setSelectedEntry}`.

- [ ] **Step 4: Run the EntryGrid test file and verify everything is green**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: PASS — all existing tests + the three new modal tests.

- [ ] **Step 5: Run full test suite and build**

Run: `npm run test:run && npm run build`
Expected: PASS. The production build now compiles without the `@modal` slot and without any reference to `/edit/[id]` from the grid.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/EntryGrid.tsx src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "feat: open entry editor via local state instead of URL"
```

---

## Task 5: Delete `/edit/[id]` route and remove unused EntryEditor props

**Files:**
- Delete: `src/app/edit/[id]/` (entire directory)
- Modify: `src/components/editor/EntryEditor.tsx`

Cards no longer navigate to `/edit/[id]`, so the direct route is now pure dead code. The `backHref` / `backUrl` fields on `EntryEditor` are also unused (assigned but never read anywhere in the component body).

- [ ] **Step 1: Delete the `[id]` directory**

Run:
```bash
rm -rf "src/app/edit/[id]"
```

- [ ] **Step 2: Remove dead code from EntryEditor**

In `src/components/editor/EntryEditor.tsx`:

a) Remove the unused `next/link` import (at the top of the file):

```tsx
// DELETE THIS LINE:
import Link from 'next/link';
```

b) Remove `backHref?: string;` from the props interface. It should now look like:

```tsx
interface EntryEditorProps {
  entry: Entry;
  hasNarration?: boolean;
  onEntryUpdated?: (entry: Entry) => void;
}
```

c) Update the function signature (drop `backHref` from destructuring):

```tsx
export function EntryEditor({ entry, hasNarration: initialHasNarration = false, onEntryUpdated }: EntryEditorProps) {
```

d) Delete the now-orphaned line (originally line 19):

```tsx
  const backUrl = backHref || '/edit';
```

- [ ] **Step 3: Run full test suite and build**

Run: `npm run test:run && npm run build`
Expected: PASS. Nothing imports from `/edit/[id]` or uses `backHref`. The TypeScript compiler would catch any stragglers.

- [ ] **Step 4: Manual smoke test in dev**

Run: `npm run dev`

Browser checks at `http://localhost:3000/edit` (after logging in):
1. Grid renders all three sections. Cards are clickable.
2. Clicking a card opens the editor as a modal overlay. URL bar stays at `/edit`.
3. Edit the title field; the "Saving..." → "✓ Saved" indicator appears.
4. Close the modal (X button, click backdrop, or press Escape). The card in the grid shows the updated title immediately.
5. Drag a card in the Active section — drag still works; click doesn't fire mid-drag (the 8px threshold handles this).
6. Navigating directly to `http://localhost:3000/edit/some-id` 404s. This is expected and intended — deep-linking is gone.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead /edit/[id] route and unused backHref prop"
```

---

## Self-Review Notes

- Spec coverage: every section of the spec maps to a task — `Modal` change (Task 2), `EntryEditor.onEntryUpdated` (Task 3), `EntryGrid` rewire (Task 4), file deletes + layout update (Tasks 1 & 5), dead prop removal (Task 5).
- No placeholders, no "TODO", no "similar to above" — each step includes full code.
- Type consistency: `onOpen: (entry: Entry) => void` and `onEntryUpdated: (entry: Entry) => void` are used consistently across tasks.
- TDD discipline: each behavior-changing task has a red/green cycle. Tasks 1 and 5 are pure deletions of already-dead code; verification is "existing tests still pass."
