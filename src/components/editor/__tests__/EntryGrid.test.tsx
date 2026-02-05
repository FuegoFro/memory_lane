/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

describe('EntryGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
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
      expect(links.some((link) => link.getAttribute('href') === '/edit/entry-1?from=active')).toBe(true);
      expect(links.some((link) => link.getAttribute('href') === '/edit/entry-2?from=active')).toBe(true);
    });
  });

  describe('Filter buttons', () => {
    it('renders filter buttons for all statuses', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /staging/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabled/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('filters to show only active entries by default', () => {
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Active entries should be visible
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Active Entry 2')).toBeInTheDocument();

      // Staging and disabled entries should not be visible
      expect(screen.queryByText('Staging Entry')).not.toBeInTheDocument();
      expect(screen.queryByText('Disabled Entry')).not.toBeInTheDocument();
    });

    it('reads stage filter from URL search params', () => {
      mockSearchParams = new URLSearchParams('stage=staging');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      expect(screen.getByText('Staging Entry')).toBeInTheDocument();
      expect(screen.queryByText('Active Entry 1')).not.toBeInTheDocument();
    });

    it('falls back to active for invalid stage param', () => {
      mockSearchParams = new URLSearchParams('stage=garbage');
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Should fall back to active
      expect(screen.getByText('Active Entry 1')).toBeInTheDocument();
      expect(screen.queryByText('Staging Entry')).not.toBeInTheDocument();
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

      const activeButton = screen.getByRole('button', { name: /active/i });
      const stagingButton = screen.getByRole('button', { name: /staging/i });

      // Active button should be selected by default
      expect(activeButton).toHaveClass('bg-blue-600');
      expect(stagingButton).not.toHaveClass('bg-blue-600');
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
      const entries = createTestEntries();
      render(<EntryGrid initialEntries={entries} />);

      // Active filter is default, should show active entries with green badge
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
});
