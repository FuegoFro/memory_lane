import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  getAllEntries: vi.fn(),
}));

// Import route handler (it will use the mocked entries module)
import { GET } from '../route';

// Import the mocked functions
import { getAllEntries } from '@/lib/entries';

const mockGetAllEntries = vi.mocked(getAllEntries);

describe('GET /api/edit/entries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns all entries as JSON', async () => {
    const mockEntries = [
      {
        id: 'entry-1',
        dropbox_path: '/photos/1.jpg',
        title: 'Photo 1',
        transcript: null,
        position: 0,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-01 10:00:00',
        updated_at: '2024-01-01 10:00:00',
      },
      {
        id: 'entry-2',
        dropbox_path: '/photos/2.jpg',
        title: 'Photo 2',
        transcript: 'A memory',
        position: null,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-01 11:00:00',
        updated_at: '2024-01-01 11:00:00',
      },
      {
        id: 'entry-3',
        dropbox_path: '/photos/3.jpg',
        title: 'Disabled Photo',
        transcript: null,
        position: null,
        disabled: 1,
        has_narration: 0,
        created_at: '2024-01-01 12:00:00',
        updated_at: '2024-01-01 12:00:00',
      },
    ];
    mockGetAllEntries.mockReturnValue(mockEntries);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockEntries);
    expect(mockGetAllEntries).toHaveBeenCalledOnce();
  });

  it('returns empty array when no entries exist', async () => {
    mockGetAllEntries.mockReturnValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    mockGetAllEntries.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch entries');
  });
});
