/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryGrid } from '../EntryGrid';
import { Entry } from '@/types';

// EntryEditor (rendered inside the modal) calls useRouter from next/navigation.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
});
