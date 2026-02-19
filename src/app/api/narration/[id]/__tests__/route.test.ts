import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handler
vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
}));

// Mock the dropbox module before importing the route handler
vi.mock('@/lib/dropbox', () => ({
  getTemporaryLink: vi.fn(),
  getNarrationPath: vi.fn(),
}));

// Import route handler (it will use the mocked modules)
import { GET } from '../route';

// Import the mocked functions
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';

const mockGetEntryById = vi.mocked(getEntryById);
const mockGetTemporaryLink = vi.mocked(getTemporaryLink);
const mockGetNarrationPath = vi.mocked(getNarrationPath);

describe('GET /api/narration/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/narration/${id}`, {
      method: 'GET',
    });
  }

  it('redirects to narration link for valid entry', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/narration-link-123');

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://dropbox.com/narration-link-123');
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
    expect(mockGetNarrationPath).toHaveBeenCalledWith('/photos/test.jpg');
    expect(mockGetTemporaryLink).toHaveBeenCalledWith('/photos/test.jpg.narration.webm');
  });

  it('sets Cache-Control no-store on redirect to prevent stale audio', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/narration-link-123');

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(mockGetTemporaryLink).not.toHaveBeenCalled();
  });

  it('returns 404 for disabled entry', async () => {
    const disabledEntry = {
      id: 'disabled-entry',
      dropbox_path: '/photos/disabled.jpg',
      title: 'Disabled Photo',
      transcript: null,
      position: null,
      disabled: 1,
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(disabledEntry);

    const request = createMockRequest('disabled-entry');
    const response = await GET(request, { params: Promise.resolve({ id: 'disabled-entry' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(mockGetTemporaryLink).not.toHaveBeenCalled();
  });

  it('returns 404 when narration does not exist', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockRejectedValue(new Error('File not found'));

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('No narration');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetEntryById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get narration');
  });
});
