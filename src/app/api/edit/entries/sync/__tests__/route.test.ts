import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the entries module before importing the route handlers
vi.mock('@/lib/entries', () => ({
  syncFromDropbox: vi.fn(),
}));

// Import route handler (it will use the mocked entries module)
import { POST } from '../route';

// Import the mocked functions
import { syncFromDropbox } from '@/lib/entries';

const mockSyncFromDropbox = vi.mocked(syncFromDropbox);

describe('POST /api/edit/entries/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls syncFromDropbox and returns result', async () => {
    const mockResult = {
      added: 5,
      removed: 2,
      unchanged: 10,
    };
    mockSyncFromDropbox.mockResolvedValue(mockResult);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockResult);
    expect(mockSyncFromDropbox).toHaveBeenCalledOnce();
  });

  it('returns result with zeros when no changes', async () => {
    const mockResult = {
      added: 0,
      removed: 0,
      unchanged: 15,
    };
    mockSyncFromDropbox.mockResolvedValue(mockResult);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockResult);
  });

  it('returns 500 on error', async () => {
    mockSyncFromDropbox.mockRejectedValue(new Error('Dropbox connection failed'));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Sync failed');
  });
});
