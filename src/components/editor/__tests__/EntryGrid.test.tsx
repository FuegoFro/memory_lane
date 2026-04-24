/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryGrid } from '../EntryGrid';
import { ToastProvider } from '@/components/ui/Toast';
import { Entry } from '@/types';

// EntryEditor (rendered inside the modal) calls useRouter from next/navigation.
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;
let capturedOnDragStart: ((event: { active: { id: string } }) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
    onDragStart,
  }: {
    children: React.ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    onDragStart?: (event: { active: { id: string } }) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    capturedOnDragStart = onDragStart ?? null;
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

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id',
    dropbox_path: '/a.jpg',
    title: 'Untitled',
    transcript: null,
    position: null,
    disabled: 0,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
    ...overrides,
  };
}

function renderGrid(entries: Entry[]) {
  return render(
    <ToastProvider>
      <EntryGrid initialEntries={entries} />
    </ToastProvider>
  );
}

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
    capturedOnDragStart = null;
  });

  describe('Sections', () => {
    it('renders all three section headers', () => {
      renderGrid(createTestEntries());
      expect(screen.getAllByText('In the slideshow').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Just arrived').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Set aside').length).toBeGreaterThan(0);
    });

    it('shows active, staging, and disabled entry titles by default (disabled visible via drawer peek alt text)', () => {
      renderGrid(createTestEntries());
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      // Disabled entries render inside the collapsed drawer's peek strip (as images with alt text)
      const peekThumbs = screen.getAllByTestId('drawer-peek-thumb');
      expect(peekThumbs.length).toBe(1);
    });

    it('calls logout API and navigates to login when Logout is clicked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderGrid(createTestEntries());
      const logoutBtn = screen.getByText('Logout');
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      });
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('does not render status badge dots on cards', () => {
      renderGrid(createTestEntries());
      expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('does not render filter buttons', () => {
      renderGrid(createTestEntries());
      expect(screen.queryByRole('button', { name: /^all$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^active$/i })).not.toBeInTheDocument();
    });
  });

  describe('Sync button', () => {
    it('renders sync button', () => {
      renderGrid(createTestEntries());
      expect(screen.getByRole('button', { name: /sync from dropbox/i })).toBeInTheDocument();
    });

    it('shows "Syncing..." while sync is in progress', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderGrid(createTestEntries());
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeInTheDocument();
      });
    });

    it('calls sync API and shows success toast', async () => {
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

      renderGrid(entries);
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));

      await waitFor(() => {
        expect(screen.getByText(/Synced/)).toBeInTheDocument();
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/sync', { method: 'POST' });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries');
    });

    it('shows error toast on sync failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) });
      renderGrid(createTestEntries());
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('button is disabled while syncing', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderGrid(createTestEntries());
      fireEvent.click(screen.getByRole('button', { name: /sync from dropbox/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();
      });
    });
  });

  describe('Multi-select', () => {
    it('shows selection checkboxes on hover/selection (thumb-check testid)', () => {
      renderGrid(createTestEntries());
      // Before selecting, thumb-check doesn't render (it appears on hover/selection).
      // Once we select via simulated hover + click, checkboxes show for all visible entries.
      // Easiest: click first thumb's title to open (no), instead use simulated flow below.
      // For this sanity test: no checks visible initially.
      expect(screen.queryAllByTestId('thumb-check').length).toBe(0);
    });

    it('shows floating selection bar when an entry is selected via thumb-check', () => {
      renderGrid(createTestEntries());
      // Trigger hover so the check appears on the first active entry
      const thumb = screen.getByText('Active Entry 1').closest('div[style*="position"]')!;
      fireEvent.mouseEnter(thumb);
      const check = screen.getAllByTestId('thumb-check')[0];
      fireEvent.click(check);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('selecting two entries shows "2 selected"', () => {
      renderGrid(createTestEntries());
      const thumb1 = screen.getByText('Active Entry 1').closest('div[style*="position"]')!;
      fireEvent.mouseEnter(thumb1);
      fireEvent.click(screen.getAllByTestId('thumb-check')[0]);
      // After first selection, multiSelectActive is true, so checks are visible on all thumbs.
      // Click a second, different thumb-check (entry-2).
      const thumb2 = screen.getByText('Active Entry 2').closest('div[style*="position"]')!;
      const check2 = thumb2.querySelector('[data-testid="thumb-check"]')!;
      fireEvent.click(check2);
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('clear button in SelectionBar deselects all entries', () => {
      renderGrid(createTestEntries());
      const thumb1 = screen.getByText('Active Entry 1').closest('div[style*="position"]')!;
      fireEvent.mouseEnter(thumb1);
      fireEvent.click(screen.getAllByTestId('thumb-check')[0]);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  describe('SelectionBar', () => {
    it('shows three move targets: Slideshow, Just arrived, Set aside', () => {
      renderGrid(createTestEntries());
      const thumb = screen.getByText('Active Entry 1').closest('div[style*="position"]')!;
      fireEvent.mouseEnter(thumb);
      fireEvent.click(screen.getAllByTestId('thumb-check')[0]);
      // SelectionBar is visible now — the buttons are inside it.
      // "Slideshow" appears in the SelectionBar. (Also "Just arrived" appears as a heading; button disabled state differs.)
      // Use role=button filter.
      expect(screen.getByRole('button', { name: /^Slideshow$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Just arrived$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Set aside$/ })).toBeInTheDocument();
    });

    it('bulk move calls API for each selected entry and refreshes', async () => {
      const entries = createTestEntries();
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(entries) });

      renderGrid(entries);
      const thumb1 = screen.getByText('Active Entry 1').closest('div[style*="position"]')!;
      fireEvent.mouseEnter(thumb1);
      const check1 = thumb1.querySelector('[data-testid="thumb-check"]')!;
      fireEvent.click(check1);
      const thumb2 = screen.getByText('Active Entry 2').closest('div[style*="position"]')!;
      const check2 = thumb2.querySelector('[data-testid="thumb-check"]')!;
      fireEvent.click(check2);

      fireEvent.click(screen.getByRole('button', { name: /^Just arrived$/ }));

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

      renderGrid(entries);
      expect(capturedOnDragEnd).not.toBeNull();

      // Drag entry-2 onto entry-1 → entry-2 is inserted before entry-1 in the reorder
      act(() => {
        capturedOnDragStart?.({ active: { id: 'entry-2' } });
        capturedOnDragEnd!({ active: { id: 'entry-2' }, over: { id: 'entry-1' } });
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

      renderGrid(entries);

      act(() => {
        capturedOnDragStart?.({ active: { id: 'entry-2' } });
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
      renderGrid(createTestEntries());
      act(() => {
        capturedOnDragStart?.({ active: { id: 'entry-1' } });
        capturedOnDragEnd!({ active: { id: 'entry-1' }, over: { id: 'entry-1' } });
      });
      expect(mockFetch).not.toHaveBeenCalledWith('/api/edit/entries/reorder', expect.anything());
    });

    it('reverts entry order and shows error toast when reorder API fails', async () => {
      const entries = createTestEntries();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderGrid(entries);

      act(() => {
        capturedOnDragStart?.({ active: { id: 'entry-1' } });
        capturedOnDragEnd!({ active: { id: 'entry-1' }, over: { id: 'entry-2' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Reorder failed')).toBeInTheDocument();
      });

      const images = screen.getAllByRole('img');
      const srcs = images.map((img) => img.getAttribute('src'));
      expect(srcs.findIndex(s => s?.includes('/api/media/entry-1'))).toBeLessThan(srcs.findIndex(s => s?.includes('/api/media/entry-2')));
    });
  });

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

    it('opens the entry editor when a card title is clicked', () => {
      renderGrid(createTestEntries());
      // Editor not rendered initially
      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Active Entry 1'));

      // Editor now rendered, with the clicked entry's title in the title field
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.value).toBe('Active Entry 1');
    });

    it('closes the editor when the close button is clicked', () => {
      renderGrid(createTestEntries());
      fireEvent.click(screen.getByText('Active Entry 1'));
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    });

    it('updates the grid card when the editor reports an entry update', async () => {
      const entries = createTestEntries();
      const renamed = { ...entries[0], title: 'Renamed Entry' };
      // EntryEditor reads the PUT response as the authoritative updated entry.
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(renamed) });
      vi.useFakeTimers();
      try {
        renderGrid(entries);
        fireEvent.click(screen.getByText('Active Entry 1'));

        const titleInput = screen.getByLabelText(/title/i);
        fireEvent.change(titleInput, { target: { value: 'Renamed Entry' } });

        await act(async () => {
          vi.advanceTimersByTime(1000);
        });

        // Close the modal and verify the card in the grid shows the new title
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.getByText('Renamed Entry')).toBeInTheDocument();
        expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('renders Just arrived above In the slideshow when staging has items', () => {
    const entries = [
      makeEntry({ id: 'active1', position: 1, disabled: 0 }),
      makeEntry({ id: 'staging1', position: null, disabled: 0 }),
    ];
    renderGrid(entries);
    const html = document.body.innerHTML;
    // Use lastIndexOf to find the section-header occurrences (toolbar pills also mention these labels)
    const idxStaging = html.lastIndexOf('Just arrived');
    const idxActive = html.lastIndexOf('In the slideshow');
    expect(idxStaging).toBeGreaterThan(-1);
    expect(idxActive).toBeGreaterThan(-1);
    expect(idxStaging).toBeLessThan(idxActive);
  });

  it('renders Just arrived above In the slideshow even when staging is empty', () => {
    const entries = [makeEntry({ id: 'active1', position: 1, disabled: 0 })];
    renderGrid(entries);
    const html = document.body.innerHTML;
    const idxStaging = html.lastIndexOf('Just arrived');
    const idxActive = html.lastIndexOf('In the slideshow');
    expect(idxActive).toBeGreaterThan(-1);
    expect(idxStaging).toBeGreaterThan(-1);
    expect(idxStaging).toBeLessThan(idxActive);

    // Assertions for empty staging state
    expect(screen.getByText(/Nothing waiting for review/)).toBeInTheDocument();
    expect(screen.queryByText(/Add all to slideshow/)).not.toBeInTheDocument();
  });

  it('filters by title via the search input', () => {
    const entries = [
      makeEntry({ id: 'a', title: 'Beach at dawn', position: 1 }),
      makeEntry({ id: 'b', title: 'Kitchen sink', position: 2 }),
    ];
    renderGrid(entries);
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), { target: { value: 'beach' } });
    expect(screen.getByText('Beach at dawn')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen sink')).toBeNull();
  });

  it('filters by transcript substring', () => {
    const entries = [
      makeEntry({ id: 'a', title: 'X', transcript: 'pad thai night', position: 1 }),
      makeEntry({ id: 'b', title: 'Y', transcript: 'lasagna sunday', position: 2 }),
    ];
    renderGrid(entries);
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), { target: { value: 'pad' } });
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.queryByText('Y')).toBeNull();
  });

  it('renders the disabled drawer collapsed by default with peek thumbs', () => {
    const entries = [
      makeEntry({ id: 'd1', position: null, disabled: 1 }),
      makeEntry({ id: 'd2', position: null, disabled: 1 }),
    ];
    renderGrid(entries);
    expect(screen.getAllByTestId('drawer-peek-thumb')).toHaveLength(2);
  });

  it('density slider controls the active grid column count', () => {
    const entries = [makeEntry({ id: 'a', position: 1 })];
    const { container } = renderGrid(entries);
    fireEvent.change(screen.getByLabelText(/grid density/i), { target: { value: '8' } });
    const grid = container.querySelector('[data-testid="entry-grid-active"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(8, 1fr)');
  });
});
