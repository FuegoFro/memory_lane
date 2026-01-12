import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
  updateEntry: vi.fn(),
  getNextPosition: vi.fn(),
}));

// Import route handlers (they will use the mocked entries module)
import { GET, PUT } from '../route';

// Import the mocked functions
import { getEntryById, updateEntry, getNextPosition } from '@/lib/entries';

const mockGetEntryById = vi.mocked(getEntryById);
const mockUpdateEntry = vi.mocked(updateEntry);
const mockGetNextPosition = vi.mocked(getNextPosition);

describe('GET /api/edit/entries/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/edit/entries/${id}`, {
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
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockEntry);
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 500 on error', async () => {
    mockGetEntryById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch entry');
  });
});

describe('PUT /api/edit/entries/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string, body: object): NextRequest {
    return new NextRequest(`http://localhost:3000/api/edit/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  it('updates entry title', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Old Title',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, title: 'New Title' };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { title: 'New Title' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe('New Title');
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { title: 'New Title' });
  });

  it('updates entry transcript', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, transcript: 'New transcript' };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { transcript: 'New transcript' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transcript).toBe('New transcript');
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { transcript: 'New transcript' });
  });

  it('changes status to active and assigns position', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test',
      transcript: null,
      position: null, // staging entry
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, position: 5, disabled: 0 };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockGetNextPosition.mockReturnValue(5);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { status: 'active' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockGetNextPosition).toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { disabled: false, position: 5 });
  });

  it('changes status to active but keeps existing position', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test',
      transcript: null,
      position: 2, // already has position
      disabled: 1, // but was disabled
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, disabled: 0 };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { status: 'active' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockGetNextPosition).not.toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { disabled: false });
  });

  it('changes status to staging', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test',
      transcript: null,
      position: 2, // active entry
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, position: null };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { status: 'staging' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { disabled: false, position: null });
  });

  it('changes status to disabled', async () => {
    const existingEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test',
      transcript: null,
      position: 2,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    const updatedEntry = { ...existingEntry, disabled: 1 };

    mockGetEntryById.mockReturnValue(existingEntry);
    mockUpdateEntry.mockReturnValue(updatedEntry);

    const request = createMockRequest('entry-1', { status: 'disabled' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { disabled: true });
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id', { title: 'New Title' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 500 on error', async () => {
    mockGetEntryById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest('entry-1', { title: 'New Title' });
    const response = await PUT(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to update entry');
  });
});
