import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the settings module before importing the route handlers
vi.mock('@/lib/settings', () => ({
  getViewerSettings: vi.fn(),
}));

// Import route handler (it will use the mocked settings module)
import { GET as getViewerSettings } from '../viewer/route';

// Import the mocked function
import { getViewerSettings as getViewerSettingsFn } from '@/lib/settings';

const mockGetViewerSettings = vi.mocked(getViewerSettingsFn);

describe('GET /api/settings/viewer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns viewer settings as JSON', async () => {
    const mockSettings = {
      autoAdvanceDelay: 10,
      showTitles: true,
    };
    mockGetViewerSettings.mockReturnValue(mockSettings);

    const response = await getViewerSettings();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockSettings);
    expect(mockGetViewerSettings).toHaveBeenCalledOnce();
  });

  it('returns default settings when none are configured', async () => {
    const defaultSettings = {
      autoAdvanceDelay: 5,
      showTitles: true,
    };
    mockGetViewerSettings.mockReturnValue(defaultSettings);

    const response = await getViewerSettings();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(defaultSettings);
  });

  it('returns 500 on error', async () => {
    mockGetViewerSettings.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const response = await getViewerSettings();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch settings');
  });
});
