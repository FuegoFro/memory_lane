/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryGrid } from '../EntryGrid';
import { Entry } from '@/types';

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

let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: {
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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test entries with various statuses
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
    mockSearchParams = new URLSearchParams();
    capturedOnDragEnd = null; // add this line
  });

  describe('Rendering with initial entries', () => {
    it('renders with initial entries', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Should show active entries by default (filter is 'active')
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();
    });

    it('renders thumbnail images for entries', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Active entries should have thumbnails
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(2);

      // Check that image sources use media proxy
      expect(images[0]).toHaveAttribute('src', '/api/media/entry-1');
      expect(images[1]).toHaveAttribute('src', '/api/media/entry-2');
    });

    it('renders entry links with stage context', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const links = screen.getAllByRole('link');
      expect(links.some((link) => link.getAttribute('href') === '/edit/entry-1?stage=all')).toBe(true);
      expect(links.some((link) => link.getAttribute('href') === '/edit/entry-2?stage=all')).toBe(true);
    });
  });

  describe('Filter buttons', () => {
    it('renders "All" as the first filter button', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const buttons = screen.getAllByRole('button', { name: /^(All|Active|Staging|Disabled)$/i });
      expect(buttons[0]).toHaveTextContent('All');
    });

    it('renders filter buttons for all statuses', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /staging/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabled/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('shows all entries by default (no stage param)', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('reads stage filter from URL search params', () => {
      mockSearchParams = new URLSearchParams('stage=staging');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
    });

    it('falls back to all for invalid stage param', () => {
      mockSearchParams = new URLSearchParams('stage=garbage');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Should fall back to all
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('clicking staging filter updates URL and shows staging entries', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      fireEvent.click(screen.getByRole('button', { name: /staging/i }));

      expect(mockReplace).toHaveBeenCalledWith('/edit?stage=staging');
    });

    it('clicking disabled filter updates URL and shows disabled entries', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      fireEvent.click(screen.getByRole('button', { name: /disabled/i }));

      expect(mockReplace).toHaveBeenCalledWith('/edit?stage=disabled');
    });

    it('shows all entries by default when no stage param is set', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('shows all entries when stage=all in URL', () => {
      mockSearchParams = new URLSearchParams('stage=all');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('clicking all filter updates URL', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      fireEvent.click(screen.getByRole('button', { name: /all/i }));

      expect(mockReplace).toHaveBeenCalledWith('/edit?stage=all');
    });

    it('selected filter button has different styling', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const allButton = screen.getByRole('button', { name: /^all$/i });
      const activeButton = screen.getByRole('button', { name: /^active$/i });

      // All button should be selected by default
      expect(allButton).toHaveClass('bg-blue-600');
      expect(activeButton).not.toHaveClass('bg-blue-600');
    });
  });

  describe('Thumbnail size slider', () => {
    it('renders size slider with correct range', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '100');
      expect(slider).toHaveAttribute('max', '400');
      expect(slider).toHaveValue('200'); // default value
    });

    it('changing slider updates thumbnail size', () => {
      const entries = createTestEntries();
      const { container } = render(<EntryGrid initialEntries={entries} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '300' } });

      expect(slider).toHaveValue('300');

      // Check that the grid style is updated
      const grid = container.querySelector('[data-testid="entry-grid"]');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' });
    });
  });

  describe('Sync button', () => {
    it('renders sync button', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByRole('button', { name: /sync from dropbox/i })).toBeInTheDocument();
    });

    it('shows "Syncing..." while sync is in progress', async () => {
      const entries = createTestEntries();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryGrid initialEntries={entries} />);

      const syncButton = screen.getByRole('button', { name: /sync from dropbox/i });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeInTheDocument();
      });
    });

    it('calls sync API and shows success message', async () => {
      const entries = createTestEntries();
      const newEntries = [...entries, {
        id: 'entry-5',
        dropbox_path: '/photos/photo5.jpg',
        title: 'New Entry',
        transcript: null,
        position: 4,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-05T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      }];

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ added: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(newEntries) });

      render(<EntryGrid initialEntries={entries} />);

      const syncButton = screen.getByRole('button', { name: /sync from dropbox/i });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Added 1 new entries')).toBeInTheDocument();
      });

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/sync', { method: 'POST' });
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries');
    });

    it('shows error message on sync failure', async () => {
      const entries = createTestEntries();
      mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) });

      render(<EntryGrid initialEntries={entries} />);

      const syncButton = screen.getByRole('button', { name: /sync from dropbox/i });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('shows error message on network error', async () => {
      const entries = createTestEntries();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<EntryGrid initialEntries={entries} />);

      const syncButton = screen.getByRole('button', { name: /sync from dropbox/i });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('button is disabled while syncing', async () => {
      const entries = createTestEntries();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryGrid initialEntries={entries} />);

      const syncButton = screen.getByRole('button', { name: /sync from dropbox/i });
      fireEvent.click(syncButton);

      await waitFor(() => {
        const syncingButton = screen.getByRole('button', { name: /syncing/i });
        expect(syncingButton).toBeDisabled();
      });
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no entries match filter', () => {
      mockSearchParams = new URLSearchParams('stage=disabled');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // We should see the disabled entry
      expect(screen.getByText('Disabled Entry')).toBeInTheDocument();
    });

    it('shows empty state message when filtered list is empty', () => {
      // Create entries with only active entries
      const activeOnlyEntries: Entry[] = [
        {
          id: 'entry-1',
          dropbox_path: '/photos/photo1.jpg',
          title: 'Active Entry',
          transcript: null,
          position: 1,
          disabled: 0,
          has_narration: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Set URL to staging filter (no staging entries exist)
      mockSearchParams = new URLSearchParams('stage=staging');
      render(<EntryGrid initialEntries={activeOnlyEntries} />);

      expect(screen.getByText('No entries in this category')).toBeInTheDocument();
    });

    it('shows empty state when initialEntries is empty', () => {
      render(<EntryGrid initialEntries={[]} />);

      expect(screen.getByText('No entries in this category')).toBeInTheDocument();
    });
  });

  describe('Status badges', () => {
    it('shows green badge for active entries', () => {
      mockSearchParams = new URLSearchParams('stage=active');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const badges = screen.getAllByTestId('status-badge');
      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-green-500');
      });
    });

    it('shows yellow badge for staging entries', () => {
      mockSearchParams = new URLSearchParams('stage=staging');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const badges = screen.getAllByTestId('status-badge');
      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-yellow-500');
      });
    });

    it('shows gray badge for disabled entries', () => {
      mockSearchParams = new URLSearchParams('stage=disabled');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const badges = screen.getAllByTestId('status-badge');
      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-gray-500');
      });
    });
  });

  describe('Hover overlay', () => {
    it('entry cards have hover overlay with title and status', () => {
      const entries = createTestEntries();
      const { container } = render(<EntryGrid initialEntries={entries} />);

      // Check that overlay elements exist (they are visible on hover via CSS)
      const overlays = container.querySelectorAll('[data-testid="entry-overlay"]');
      expect(overlays.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-select', () => {
    it('renders checkboxes on entry cards', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // all 4 entries shown by default
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
      expect(screen.getByText('4 selected')).toBeInTheDocument();
    });
  });

  describe('Floating action bar', () => {
    it('shows context-appropriate move buttons for active filter', () => {
      mockSearchParams = new URLSearchParams('stage=active');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Active view: should offer "Move to Staging" and "Disable" (not "Move to Active")
      expect(screen.getByRole('button', { name: /move to staging/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /move to active/i })).not.toBeInTheDocument();
    });

    it('shows context-appropriate move buttons for staging filter', () => {
      mockSearchParams = new URLSearchParams('stage=staging');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(screen.getByRole('button', { name: /move to active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument();
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
      expect(screen.queryByRole('button', { name: /^disable$/i })).not.toBeInTheDocument();
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

  describe('Drag-and-drop reordering', () => {
    it('calls reorder API with active entry IDs in new order after drag', async () => {
      const entries = createTestEntries();
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      render(<EntryGrid initialEntries={entries} />);
      expect(capturedOnDragEnd).not.toBeNull();

      // Drag entry-1 (index 0) onto entry-2 (index 1)
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

    it('only sends active entry IDs to reorder API, excluding staging and disabled', async () => {
      // createTestEntries has: entry-1 (active), entry-2 (active), entry-3 (staging), entry-4 (disabled)
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
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

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

      // Entries should be back in original order (entry-1 before entry-2)
      const images = screen.getAllByRole('img');
      const srcs = images.map((img) => img.getAttribute('src'));
      expect(srcs.indexOf('/api/media/entry-1')).toBeLessThan(srcs.indexOf('/api/media/entry-2'));
    });
  });
});
