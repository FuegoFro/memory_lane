import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handler
vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
}));

// Mock the dropbox module before importing the route handler
vi.mock('@/lib/dropbox', () => ({
  getTemporaryLink: vi.fn(),
  getThumbnail: vi.fn(),
}));

// Import route handler (it will use the mocked modules)
import { GET } from '../route';

// Import the mocked functions
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getThumbnail } from '@/lib/dropbox';

const mockGetEntryById = vi.mocked(getEntryById);
const mockGetTemporaryLink = vi.mocked(getTemporaryLink);
const mockGetThumbnail = vi.mocked(getThumbnail);

describe('GET /api/media/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string, size?: string): NextRequest {
    const url = new URL(`http://localhost:3000/api/media/${id}`);
    if (size) {
      url.searchParams.set('size', size);
    }
    return new NextRequest(url.toString(), {
      method: 'GET',
    });
  }

  it('redirects to Dropbox temporary link for valid entry without size', async () => {
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
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-link-123');

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://dropbox.com/temp-link-123');
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
    expect(mockGetTemporaryLink).toHaveBeenCalledWith('/photos/test.jpg');
  });

  it('serves thumbnail for valid entry with valid size', async () => {
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
    const mockImageData = Buffer.from('fake-image-data');
    mockGetThumbnail.mockResolvedValue({ data: mockImageData, metadata: {} });

    const request = createMockRequest('entry-1', 'w128h128');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400, stale-while-revalidate=3600');
    const body = await response.arrayBuffer();
    expect(Buffer.from(body)).toEqual(mockImageData);
    expect(mockGetThumbnail).toHaveBeenCalledWith('/photos/test.jpg', 'w128h128');
    expect(mockGetTemporaryLink).not.toHaveBeenCalled();
  });

  it('redirects to temporary link if size is invalid', async () => {
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
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-link-123');

    const request = createMockRequest('entry-1', 'invalid-size');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://dropbox.com/temp-link-123');
    expect(mockGetThumbnail).not.toHaveBeenCalled();
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

  it('returns 500 on error', async () => {
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
    mockGetTemporaryLink.mockRejectedValue(new Error('Dropbox API error'));

    const request = createMockRequest('entry-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get media');
  });
});
