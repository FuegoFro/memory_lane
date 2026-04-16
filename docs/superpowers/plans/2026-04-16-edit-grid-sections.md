# Edit Grid — Collapsible Stage Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single filtered grid on `/edit` with three always-visible, collapsible sections (Active, Staging, Disabled), removing the stage filter entirely.

**Architecture:** Extract a `StageSection` component for the collapsible header + content wrapper, add a `StaticCard` component for non-draggable cards, and refactor `EntryGrid` to manage three sections with a `collapsed` state object. The modal route drops the `?stage=` query param since it was only used to restore the filter on close.

**Tech Stack:** Next.js 16 App Router, React, dnd-kit, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/editor/StageSection.tsx` | **Create** | Collapsible section header + content wrapper |
| `src/components/editor/__tests__/StageSection.test.tsx` | **Create** | Tests for StageSection |
| `src/components/editor/EntryGrid.tsx` | **Modify** | Remove filter, add sections, add StaticCard |
| `src/components/editor/__tests__/EntryGrid.test.tsx` | **Modify** | Rewrite tests to match new behavior |
| `src/app/edit/@modal/(.)[ id]/page.tsx` | **Modify** | Remove stage param, simplify backHref to `/edit` |

---

## Task 1: StageSection component

**Files:**
- Create: `src/components/editor/StageSection.tsx`
- Create: `src/components/editor/__tests__/StageSection.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/editor/__tests__/StageSection.test.tsx`:

```tsx
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StageSection } from '../StageSection';

describe('StageSection', () => {
  const defaultProps = {
    status: 'active' as const,
    count: 5,
    collapsed: false,
    onToggleCollapse: vi.fn(),
    onSelectAll: vi.fn(),
  };

  it('renders section label for active status', () => {
    render(<StageSection {...defaultProps} status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders section label for staging status', () => {
    render(<StageSection {...defaultProps} status="staging" />);
    expect(screen.getByText('Staging')).toBeInTheDocument();
  });

  it('renders section label for disabled status', () => {
    render(<StageSection {...defaultProps} status="disabled" />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders count badge', () => {
    render(<StageSection {...defaultProps} count={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows children when expanded', () => {
    render(
      <StageSection {...defaultProps} collapsed={false}>
        <div>grid content</div>
      </StageSection>
    );
    expect(screen.getByText('grid content')).toBeInTheDocument();
  });

  it('hides children when collapsed', () => {
    render(
      <StageSection {...defaultProps} collapsed={true}>
        <div>grid content</div>
      </StageSection>
    );
    expect(screen.queryByText('grid content')).not.toBeInTheDocument();
  });

  it('calls onToggleCollapse when toggle button is clicked', () => {
    const onToggleCollapse = vi.fn();
    render(<StageSection {...defaultProps} onToggleCollapse={onToggleCollapse} />);
    fireEvent.click(screen.getByRole('button', { name: /collapse active section/i }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it('calls onSelectAll when Select all is clicked', () => {
    const onSelectAll = vi.fn();
    render(<StageSection {...defaultProps} onSelectAll={onSelectAll} />);
    fireEvent.click(screen.getByRole('button', { name: /select all/i }));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it('shows drag hint for active section only', () => {
    const { rerender } = render(<StageSection {...defaultProps} status="active" />);
    expect(screen.getByText('(drag to reorder)')).toBeInTheDocument();

    rerender(<StageSection {...defaultProps} status="staging" />);
    expect(screen.queryByText('(drag to reorder)')).not.toBeInTheDocument();

    rerender(<StageSection {...defaultProps} status="disabled" />);
    expect(screen.queryByText('(drag to reorder)')).not.toBeInTheDocument();
  });

  it('shows ▼ chevron when expanded', () => {
    render(<StageSection {...defaultProps} collapsed={false} />);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('shows ▶ chevron when collapsed', () => {
    render(<StageSection {...defaultProps} collapsed={true} />);
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('Select all button is visible even when collapsed', () => {
    render(<StageSection {...defaultProps} collapsed={true} />);
    expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/editor/__tests__/StageSection.test.tsx
```

Expected: FAIL — `Cannot find module '../StageSection'`

- [ ] **Step 3: Implement StageSection**

Create `src/components/editor/StageSection.tsx`:

```tsx
'use client';

import { EntryStatus } from '@/types';

const BADGE_COLORS: Record<EntryStatus, string> = {
  active: 'bg-green-500',
  staging: 'bg-yellow-500',
  disabled: 'bg-gray-500',
};

const LABELS: Record<EntryStatus, string> = {
  active: 'Active',
  staging: 'Staging',
  disabled: 'Disabled',
};

interface StageSectionProps {
  status: EntryStatus;
  count: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectAll: () => void;
  children?: React.ReactNode;
}

export function StageSection({
  status,
  count,
  collapsed,
  onToggleCollapse,
  onSelectAll,
  children,
}: StageSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 py-2 border-b border-gray-800 mb-4">
        <button
          onClick={onToggleCollapse}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${LABELS[status]} section`}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="text-gray-400 text-xs w-3">{collapsed ? '▶' : '▼'}</span>
          <span className="text-gray-100 font-semibold text-base">{LABELS[status]}</span>
          <span
            className={`${BADGE_COLORS[status]} text-white text-xs font-semibold rounded-full px-2 py-0.5`}
          >
            {count}
          </span>
          {status === 'active' && (
            <span className="text-gray-500 text-xs ml-1">(drag to reorder)</span>
          )}
        </button>
        <button
          onClick={onSelectAll}
          className="text-xs text-gray-400 border border-gray-700 rounded-md px-2.5 py-1 hover:text-white hover:border-gray-500 transition-colors"
        >
          Select all
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/editor/__tests__/StageSection.test.tsx
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/StageSection.tsx src/components/editor/__tests__/StageSection.test.tsx
git commit -m "feat: add StageSection collapsible header component"
```

---

## Task 2: Refactor EntryGrid to use sections

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`

- [ ] **Step 1: Replace the EntryGrid test file**

Overwrite `src/components/editor/__tests__/EntryGrid.test.tsx` with:

```tsx
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryGrid } from '../EntryGrid';
import { Entry } from '@/types';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    return <>{children}</>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children || null}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  rectSortingStrategy: {},
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createTestEntries = (): Entry[] => [
  {
    id: 'entry-1',
    dropbox_path: '/photos/photo1.jpg',
    title: 'Active Entry 1',
    transcript: null,
    position: 1,
    disabled: 0,
    has_narration: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'entry-2',
    dropbox_path: '/photos/photo2.jpg',
    title: 'Active Entry 2',
    transcript: null,
    position: 2,
    disabled: 0,
    has_narration: 0,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'entry-3',
    dropbox_path: '/photos/photo3.jpg',
    title: 'Staging Entry',
    transcript: null,
    position: null,
    disabled: 0,
    has_narration: 0,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 'entry-4',
    dropbox_path: '/photos/photo4.jpg',
    title: 'Disabled Entry',
    transcript: null,
    position: 3,
    disabled: 1,
    has_narration: 0,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

describe('EntryGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragEnd = null;
  });

  describe('Sections', () => {
    it('renders all three section headers', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('shows all entries across sections by default', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('all sections are expanded by default', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.getAllByText('▼')).toHaveLength(3);
    });

    it('collapses a section when its header is clicked', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /collapse active section/i }));
      expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
    });

    it('re-expands a collapsed section when its header is clicked again', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const toggleBtn = screen.getByRole('button', { name: /collapse active section/i });
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /expand active section/i }));
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
    });

    it('renders entry links without stage query param', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const links = screen.getAllByRole('link');
      expect(links.some((l) => l.getAttribute('href') === '/edit/entry-1')).toBe(true);
      expect(links.some((l) => l.getAttribute('href') === '/edit/entry-3')).toBe(true);
      links.forEach((l) => {
        expect(l.getAttribute('href')).not.toContain('stage=');
      });
    });

    it('does not render status badge dots on cards', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('does not render filter buttons', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.queryByRole('button', { name: /^all$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^active$/i })).not.toBeInTheDocument();
    });
  });

  describe('Thumbnail size slider', () => {
    it('renders size slider with correct range', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '100');
      expect(slider).toHaveAttribute('max', '400');
      expect(slider).toHaveValue('200');
    });

    it('changing slider updates active grid column sizing', () => {
      const { container } = render(<EntryGrid initialEntries={createTestEntries()} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '300' } });
      const grid = container.querySelector('[data-testid="entry-grid"]');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' });
    });
  });

  describe('Sync button', () => {
    it('renders sync button', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      expect(screen.getByRole('button', { name: /sync from dropbox/i })).toBeInTheDocument();
    });

    it('shows "Syncing..." while sync is in progress', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeInTheDocument();
      });
    });

    it('calls sync API and shows success message', async () => {
      const entries = createTestEntries();
      const newEntries = [
        ...entries,
        {
          id: 'entry-5',
          dropbox_path: '/photos/photo5.jpg',
          title: 'New Entry',
          transcript: null,
          position: 4,
          disabled: 0,
          has_narration: 0,
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z',
        },
      ];
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ added: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(newEntries) });

      render(<EntryGrid initialEntries={entries} />);
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));

      await waitFor(() => {
        expect(screen.getByText('Added 1 new entries')).toBeInTheDocument();
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/sync', { method: 'POST' });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries');
    });

    it('shows error message on sync failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) });
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('button is disabled while syncing', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();
      });
    });
  });

  describe('Hover overlay', () => {
    it('entry cards have hover overlay elements', () => {
      const { container } = render(<EntryGrid initialEntries={createTestEntries()} />);
      const overlays = container.querySelectorAll('[data-testid="entry-overlay"]');
      expect(overlays.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-select', () => {
    it('renders checkboxes for all entries across sections', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });

    it('clicking checkbox selects an entry', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it('shows floating action bar when entries are selected', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('shows correct count when multiple entries selected', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('hides floating action bar when selection is cleared', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[0]);
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });

    it('clear button deselects all entries', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });

    it('toolbar "Select all" appears when any entry is selected', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      // Toolbar select all (not section-level) — matches the one in the toolbar
      const selectAllButtons = screen.getAllByRole('button', { name: /select all/i });
      expect(selectAllButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('section "Select all" selects all entries in that section', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      // Active section has entry-1, entry-2
      const activeSectionSelectAll = screen.getAllByRole('button', { name: /select all/i })[0];
      fireEvent.click(activeSectionSelectAll);
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('section "Select all" works even when section is collapsed', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getByRole('button', { name: /collapse staging section/i }));
      // Staging section select all button should still be visible
      const stagingSelectAll = screen.getAllByRole('button', { name: /select all/i })[1];
      fireEvent.click(stagingSelectAll);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  describe('Floating action bar', () => {
    it('always shows all three move targets', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(screen.getByRole('button', { name: /move to active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /move to staging/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument();
    });

    it('bulk move calls API for each selected entry and refreshes', async () => {
      const entries = createTestEntries();
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

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries');
      });

      await waitFor(() => {
        expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Drag-and-drop reordering', () => {
    it('calls reorder API with active entry IDs in new order after drag', async () => {
      const entries = createTestEntries();
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      render(<EntryGrid initialEntries={entries} />);
      expect(capturedOnDragEnd).not.toBeNull();

      act(() => {
        capturedOnDragEnd!({ active: { id: 'entry-1' }, over: { id: 'entry-2' } });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: ['entry-2', 'entry-1'] }),
        });
      });
    });

    it('only sends active entry IDs to reorder API', async () => {
      const entries = createTestEntries();
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      render(<EntryGrid initialEntries={entries} />);

      act(() => {
        capturedOnDragEnd!({ active: { id: 'entry-2' }, over: { id: 'entry-1' } });
      });

      await waitFor(() => {
        const call = mockFetch.mock.calls.find((c) => c[0] === '/api/edit/entries/reorder');
        const body = JSON.parse(call![1].body);
        expect(body.orderedIds).toEqual(['entry-2', 'entry-1']);
        expect(body.orderedIds).not.toContain('entry-3');
        expect(body.orderedIds).not.toContain('entry-4');
      });
    });

    it('does not call reorder API when dropped on the same card', () => {
      render(<EntryGrid initialEntries={createTestEntries()} />);
      act(() => {
        capturedOnDragEnd!({ active: { id: 'entry-1' }, over: { id: 'entry-1' } });
      });
      expect(mockFetch).not.toHaveBeenCalledWith('/api/edit/entries/reorder', expect.anything());
    });

    it('reverts entry order and shows error message when reorder API fails', async () => {
      const entries = createTestEntries();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<EntryGrid initialEntries={entries} />);

      act(() => {
        capturedOnDragEnd!({ active: { id: 'entry-1' }, over: { id: 'entry-2' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Reorder failed')).toBeInTheDocument();
      });

      const images = screen.getAllByRole('img');
      const srcs = images.map((img) => img.getAttribute('src'));
      expect(srcs.indexOf('/api/media/entry-1')).toBeLessThan(srcs.indexOf('/api/media/entry-2'));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify the new/changed tests fail**

```bash
npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx
```

Expected: Multiple FAIL — filter button tests removed pass vacuously, but new section tests fail (component still has old filter behavior)

- [ ] **Step 3: Implement the updated EntryGrid**

Overwrite `src/components/editor/EntryGrid.tsx` with:

```tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
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

interface CardProps {
  entry: Entry;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelection: (id: string, shiftKey: boolean) => void;
}

function SortableCard({ entry, isSelected, hasSelection, onToggleSelection }: CardProps) {
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
      <Link href={`/edit/${entry.id}`} className="block">
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
      </Link>
    </div>
  );
}

function StaticCard({ entry, isSelected, hasSelection, onToggleSelection }: CardProps) {
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
      <Link href={`/edit/${entry.id}`} className="block">
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
      </Link>
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
    } catch (error) {
      console.error('Bulk move failed:', error);
    } finally {
      clearSelection();
    }
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
    </div>
  );
}
```

- [ ] **Step 4: Run all editor tests to verify they pass**

```bash
npx vitest run src/components/editor/
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EntryGrid.tsx src/components/editor/__tests__/EntryGrid.test.tsx
git commit -m "feat: replace filter with collapsible stage sections in edit grid"
```

---

## Task 3: Remove stage param from modal route

**Files:**
- Modify: `src/app/edit/@modal/(.)[ id]/page.tsx`

- [ ] **Step 1: Update the modal page**

Replace the contents of `src/app/edit/@modal/(.)[ id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/entries';
import { EntryEditor } from '@/components/editor';
import { Modal } from '@/components/ui/Modal';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEntryModal({ params }: PageProps) {
  const { id } = await params;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <Modal closeHref="/edit">
      <EntryEditor entry={entry} backHref="/edit" hasNarration={!!entry.has_narration} />
    </Modal>
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing is broken**

```bash
npm run test:run
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add "src/app/edit/@modal/(.)[ id]/page.tsx"
git commit -m "feat: remove stage query param from edit modal route"
```
