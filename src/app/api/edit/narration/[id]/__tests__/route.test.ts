import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
  updateEntry: vi.fn(),
}));

// Mock the dropbox module before importing the route handlers
vi.mock('@/lib/dropbox', () => ({
  uploadNarration: vi.fn(),
  deleteNarration: vi.fn(),
}));

// Import route handlers (they will use the mocked modules)
import { POST, DELETE } from '../route';

// Import the mocked functions
import { getEntryById, updateEntry } from '@/lib/entries';
import { uploadNarration, deleteNarration } from '@/lib/dropbox';

const mockGetEntryById = vi.mocked(getEntryById);
const mockUploadNarration = vi.mocked(uploadNarration);
const mockDeleteNarration = vi.mocked(deleteNarration);
const mockUpdateEntry = vi.mocked(updateEntry);

describe('POST /api/edit/narration/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockFormDataRequest(id: string, audioFile: File | null): NextRequest {
    const formData = new FormData();
    if (audioFile) {
      formData.append('audio', audioFile);
    }
    return new NextRequest(`http://localhost:3000/api/edit/narration/${id}`, {
      method: 'POST',
      body: formData,
    });
  }

  it('uploads narration for valid entry', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockUploadNarration.mockResolvedValue(undefined);

    const audioBlob = new Blob(['fake audio data'], { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'narration.webm', { type: 'audio/webm' });
    const request = createMockFormDataRequest('entry-1', audioFile);
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
    expect(mockUploadNarration).toHaveBeenCalledWith('/photos/test.jpg', expect.any(Buffer));
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const audioBlob = new Blob(['fake audio data'], { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'narration.webm', { type: 'audio/webm' });
    const request = createMockFormDataRequest('non-existent-id', audioFile);
    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 400 when no audio file provided', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);

    const request = createMockFormDataRequest('entry-1', null);
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('No audio file provided');
  });

  it('returns 500 on upload error', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockUploadNarration.mockRejectedValue(new Error('Dropbox API error'));

    const audioBlob = new Blob(['fake audio data'], { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'narration.webm', { type: 'audio/webm' });
    const request = createMockFormDataRequest('entry-1', audioFile);
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Upload failed');
  });
});

describe('DELETE /api/edit/narration/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/edit/narration/${id}`, {
      method: 'DELETE',
    });
  }

  it('deletes narration for valid entry', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockDeleteNarration.mockResolvedValue(undefined);

    const request = createMockRequest('entry-1');
    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
    expect(mockDeleteNarration).toHaveBeenCalledWith('/photos/test.jpg');
  });

  it('clears transcript in database when deleting narration', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: 'Some existing transcript',
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockDeleteNarration.mockResolvedValue(undefined);

    const request = createMockRequest('entry-1');
    await DELETE(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { transcript: null });
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id');
    const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 500 on delete error', async () => {
    const mockEntry = {
      id: 'entry-1',
      dropbox_path: '/photos/test.jpg',
      title: 'Test Photo',
      transcript: null,
      position: 0,
      disabled: 0,
      created_at: '2024-01-01 10:00:00',
      updated_at: '2024-01-01 10:00:00',
    };
    mockGetEntryById.mockReturnValue(mockEntry);
    mockDeleteNarration.mockRejectedValue(new Error('Dropbox API error'));

    const request = createMockRequest('entry-1');
    const response = await DELETE(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Delete failed');
  });
});
