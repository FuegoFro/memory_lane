import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
}));

vi.mock('@/lib/dropbox', () => ({
  getTemporaryLink: vi.fn(),
  getThumbnail: vi.fn(),
}));

import { GET } from '../route';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getThumbnail } from '@/lib/dropbox';

const mockGetEntryById = vi.mocked(getEntryById);
const mockGetTemporaryLink = vi.mocked(getTemporaryLink);
const mockGetThumbnail = vi.mocked(getThumbnail);

describe('GET /api/edit/media/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function makeRequest(id: string, size?: string): NextRequest {
    const url = new URL(`http://localhost:3000/api/edit/media/${id}`);
    if (size) url.searchParams.set('size', size);
    return new NextRequest(url.toString(), { method: 'GET' });
  }

  it('serves media for a disabled entry', async () => {
    const disabledEntry = {
      id: 'disabled-1',
      dropbox_path: '/photos/hidden.jpg',
      title: 'Hidden Photo',
      transcript: null,
      position: null,
      disabled: 1,
      has_narration: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    mockGetEntryById.mockReturnValue(disabledEntry);
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-disabled');

    const response = await GET(makeRequest('disabled-1'), {
      params: Promise.resolve({ id: 'disabled-1' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://dropbox.com/temp-disabled');
  });

  it('serves media for an active entry', async () => {
    const activeEntry = {
      id: 'active-1',
      dropbox_path: '/photos/active.jpg',
      title: 'Active Photo',
      transcript: null,
      position: 1,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    mockGetEntryById.mockReturnValue(activeEntry);
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-active');

    const response = await GET(makeRequest('active-1'), {
      params: Promise.resolve({ id: 'active-1' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://dropbox.com/temp-active');
  });

  it('serves a thumbnail for a disabled entry when a valid size is given', async () => {
    const disabledEntry = {
      id: 'disabled-1',
      dropbox_path: '/photos/hidden.jpg',
      title: 'Hidden Photo',
      transcript: null,
      position: null,
      disabled: 1,
      has_narration: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    mockGetEntryById.mockReturnValue(disabledEntry);
    const imgData = Buffer.from('fake-thumb');
    mockGetThumbnail.mockResolvedValue({ data: imgData, metadata: {} });

    const response = await GET(makeRequest('disabled-1', 'w128h128'), {
      params: Promise.resolve({ id: 'disabled-1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(mockGetThumbnail).toHaveBeenCalledWith('/photos/hidden.jpg', 'w128h128');
  });

  it('returns 404 for a non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const response = await GET(makeRequest('missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(mockGetTemporaryLink).not.toHaveBeenCalled();
  });

  it('returns 500 when Dropbox throws', async () => {
    mockGetEntryById.mockReturnValue({
      id: 'e1',
      dropbox_path: '/p.jpg',
      title: 'T',
      transcript: null,
      position: 0,
      disabled: 0,
      has_narration: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });
    mockGetTemporaryLink.mockRejectedValue(new Error('Dropbox down'));

    const response = await GET(makeRequest('e1'), {
      params: Promise.resolve({ id: 'e1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get media');
  });
});
