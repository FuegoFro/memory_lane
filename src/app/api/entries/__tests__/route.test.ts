import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  getActiveEntries: vi.fn(),
  getEntryById: vi.fn(),
}));

// Import route handlers (they will use the mocked entries module)
import { GET as getEntries } from '../route';
import { GET as getEntryById } from '../[id]/route';

// Import the mocked functions
import { getActiveEntries, getEntryById as getEntryByIdFn } from '@/lib/entries';

const mockGetActiveEntries = vi.mocked(getActiveEntries);
const mockGetEntryById = vi.mocked(getEntryByIdFn);

describe('GET /api/entries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns active entries as JSON', async () => {
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
        position: 1,
        disabled: 0,
        has_narration: 0,
        created_at: '2024-01-01 11:00:00',
        updated_at: '2024-01-01 11:00:00',
      },
    ];
    mockGetActiveEntries.mockReturnValue(mockEntries);

    const response = await getEntries();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockEntries);
    expect(mockGetActiveEntries).toHaveBeenCalledOnce();
  });

  it('returns empty array when no active entries exist', async () => {
    mockGetActiveEntries.mockReturnValue([]);

    const response = await getEntries();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    mockGetActiveEntries.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const response = await getEntries();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch entries');
  });
});

describe('GET /api/entries/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/entries/${id}`, {
      method: 'GET',
    });
  }

  it('returns entry by ID', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: 'A test transcript',
      position: 0,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);

    const request = createMockRequest('entry-1');
    const response = await getEntryById(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockEntry);
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id');
    const response = await getEntryById(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 404 for disabled entry', async () => {
    const disabledEntry = {
      id: 'disabled-entry',
      dropbox_path: '/photos/disabled.jpg',
      title: 'Disabled Photo',
      transcript: null,
      position: null,
      disabled: 1, // Entry is disabled
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(disabledEntry);

    const request = createMockRequest('disabled-entry');
    const response = await getEntryById(request, { params: Promise.resolve({ id: 'disabled-entry' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 500 on error', async () => {
    mockGetEntryById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest('entry-1');
    const response = await getEntryById(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch entry');
  });
});
