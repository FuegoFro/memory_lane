import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  reorderEntries: vi.fn(),
  getActiveEntries: vi.fn(),
}));

// Import route handler (it will use the mocked entries module)
import { PUT } from '../route';

// Import the mocked functions
import { reorderEntries, getActiveEntries } from '@/lib/entries';

const mockReorderEntries = vi.mocked(reorderEntries);
const mockGetActiveEntries = vi.mocked(getActiveEntries);

describe('PUT /api/edit/entries/reorder', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/edit/entries/reorder', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  it('reorders entries and returns active entries', async () => {
    const orderedIds = ['entry-3', 'entry-1', 'entry-2'];
    const reorderedEntries = [
      {
        id: 'entry-3',
        dropbox_path: '/photos/3.jpg',
        title: 'Photo 3',
        transcript: null,
        position: 0,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-01 12:00:00',
        updated_at: '2024-01-01 12:00:00',
      },
      {
        id: 'entry-1',
        dropbox_path: '/photos/1.jpg',
        title: 'Photo 1',
        transcript: null,
        position: 1,
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
        position: 2,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-01 11:00:00',
        updated_at: '2024-01-01 11:00:00',
      },
    ];

    mockReorderEntries.mockReturnValue(undefined);
    mockGetActiveEntries.mockReturnValue(reorderedEntries);

    const request = createMockRequest({ orderedIds });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(reorderedEntries);
    expect(mockReorderEntries).toHaveBeenCalledWith(orderedIds);
    expect(mockGetActiveEntries).toHaveBeenCalledOnce();
  });

  it('handles empty orderedIds array', async () => {
    mockReorderEntries.mockReturnValue(undefined);
    mockGetActiveEntries.mockReturnValue([]);

    const request = createMockRequest({ orderedIds: [] });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(mockReorderEntries).toHaveBeenCalledWith([]);
  });

  it('returns 400 if orderedIds is not an array', async () => {
    const request = createMockRequest({ orderedIds: 'not-an-array' });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('orderedIds must be an array');
    expect(mockReorderEntries).not.toHaveBeenCalled();
  });

  it('returns 400 if orderedIds is missing', async () => {
    const request = createMockRequest({});
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('orderedIds must be an array');
    expect(mockReorderEntries).not.toHaveBeenCalled();
  });

  it('returns 400 if orderedIds is null', async () => {
    const request = createMockRequest({ orderedIds: null });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('orderedIds must be an array');
    expect(mockReorderEntries).not.toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    mockReorderEntries.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest({ orderedIds: ['entry-1'] });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Reorder failed');
  });
});
