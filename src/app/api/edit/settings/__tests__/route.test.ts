import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the settings module before importing the route handlers
vi.mock('@/lib/settings', () => ({
  getViewerSettings: vi.fn(),
  updateViewerSettings: vi.fn(),
}));

// Import route handlers (they will use the mocked settings module)
import { GET, PUT } from '../route';

// Import the mocked functions
import { getViewerSettings, updateViewerSettings } from '@/lib/settings';

const mockGetViewerSettings = vi.mocked(getViewerSettings);
const mockUpdateViewerSettings = vi.mocked(updateViewerSettings);

describe('GET /api/edit/settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns viewer settings as JSON', async () => {
    const mockSettings = {
      autoAdvanceDelay: 10,
      showTitles: true,
    };
    mockGetViewerSettings.mockReturnValue(mockSettings);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockSettings);
    expect(mockGetViewerSettings).toHaveBeenCalledOnce();
  });

  it('returns 500 on error', async () => {
    mockGetViewerSettings.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch settings');
  });
});

describe('PUT /api/edit/settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/edit/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  it('updates settings and returns updated settings', async () => {
    const updatedSettings = {
      autoAdvanceDelay: 15,
      showTitles: false,
    };
    mockGetViewerSettings.mockReturnValue(updatedSettings);

    const request = createMockRequest({ autoAdvanceDelay: 15, showTitles: false });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updatedSettings);
    expect(mockUpdateViewerSettings).toHaveBeenCalledWith({ autoAdvanceDelay: 15, showTitles: false });
    expect(mockGetViewerSettings).toHaveBeenCalledOnce();
  });

  it('updates partial settings', async () => {
    const updatedSettings = {
      autoAdvanceDelay: 20,
      showTitles: true,
    };
    mockGetViewerSettings.mockReturnValue(updatedSettings);

    const request = createMockRequest({ autoAdvanceDelay: 20 });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updatedSettings);
    expect(mockUpdateViewerSettings).toHaveBeenCalledWith({ autoAdvanceDelay: 20 });
  });

  it('returns 500 on error', async () => {
    mockUpdateViewerSettings.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = createMockRequest({ autoAdvanceDelay: 10 });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to update settings');
  });
});
