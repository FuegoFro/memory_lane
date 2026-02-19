import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  getEntryById: vi.fn(),
  updateEntry: vi.fn(),
}));

// Mock the dropbox module before importing the route handlers
vi.mock('@/lib/dropbox', () => ({
  getTemporaryLink: vi.fn(),
  getNarrationPath: vi.fn(),
}));

// Mock the transcription module before importing the route handlers
vi.mock('@/lib/transcription', () => ({
  transcribeAudio: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import route handlers (they will use the mocked modules)
import { POST } from '../route';

// Import the mocked functions
import { getEntryById, updateEntry } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';
import { transcribeAudio } from '@/lib/transcription';

const mockGetEntryById = vi.mocked(getEntryById);
const mockUpdateEntry = vi.mocked(updateEntry);
const mockGetTemporaryLink = vi.mocked(getTemporaryLink);
const mockGetNarrationPath = vi.mocked(getNarrationPath);
const mockTranscribeAudio = vi.mocked(transcribeAudio);

describe('POST /api/edit/transcribe/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/edit/transcribe/${id}`, {
      method: 'POST',
    });
  }

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

  it('transcribes narration and returns transcript', async () => {
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-link');
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    mockTranscribeAudio.mockResolvedValue('This is the transcript');
    mockUpdateEntry.mockReturnValue({ ...mockEntry, transcript: 'This is the transcript' });

    const request = createMockRequest('entry-1');
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transcript).toBe('This is the transcript');
    expect(mockGetEntryById).toHaveBeenCalledWith('entry-1');
    expect(mockGetNarrationPath).toHaveBeenCalledWith('/photos/test.jpg');
    expect(mockGetTemporaryLink).toHaveBeenCalledWith('/photos/test.jpg.narration.webm');
    expect(mockTranscribeAudio).toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { transcript: 'This is the transcript' });
  });

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockReturnValue(undefined);

    const request = createMockRequest('non-existent-id');
    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Entry not found');
  });

  it('returns 404 when no narration exists', async () => {
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockRejectedValue(new Error('File not found'));

    const request = createMockRequest('entry-1');
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('No narration found for this entry');
  });

  it('returns 500 on error', async () => {
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-link');
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    mockTranscribeAudio.mockRejectedValue(new Error('Gemini API error'));

    const request = createMockRequest('entry-1');
    const response = await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Transcription failed');
  });

  it('saves transcript to database', async () => {
    mockGetEntryById.mockReturnValue(mockEntry);
    mockGetNarrationPath.mockReturnValue('/photos/test.jpg.narration.webm');
    mockGetTemporaryLink.mockResolvedValue('https://dropbox.com/temp-link');
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    mockTranscribeAudio.mockResolvedValue('Saved transcript');
    mockUpdateEntry.mockReturnValue({ ...mockEntry, transcript: 'Saved transcript' });

    const request = createMockRequest('entry-1');
    await POST(request, { params: Promise.resolve({ id: 'entry-1' }) });

    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', { transcript: 'Saved transcript' });
  });
});
