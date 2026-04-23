/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NarrationStudio } from '../NarrationStudio';
import { Entry } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockConfirm = vi.fn();
global.confirm = mockConfirm;

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    dropbox_path: '/x.jpg',
    title: 'X',
    transcript: null,
    position: 1,
    disabled: 0,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
    ...overrides,
  };
}

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('NarrationStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it('renders the Record helper copy in noNarration state', () => {
    renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
    expect(screen.getByText(/speak as though telling a grandchild/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
  });

  it('renders a player and transcript in hasNarration state', () => {
    renderWithToast(
      <NarrationStudio
        entry={makeEntry({ has_narration: 1, transcript: 'Every Sunday.' })}
        hasNarration
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/Every Sunday\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-record/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('renders audio player with correct src when hasNarration', () => {
    renderWithToast(
      <NarrationStudio
        entry={makeEntry({ has_narration: 1, transcript: 'test' })}
        hasNarration
        onChange={() => {}}
      />
    );
    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', '/api/narration/e1');
    expect(audio).toHaveAttribute('controls');
  });

  it('does not render audio player when hasNarration is false', () => {
    renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
    expect(document.querySelector('audio')).not.toBeInTheDocument();
  });

  it('hides audio player when audio fails to load', async () => {
    renderWithToast(
      <NarrationStudio
        entry={makeEntry({ has_narration: 1, transcript: 'test' })}
        hasNarration
        onChange={() => {}}
      />
    );
    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
    fireEvent.error(audio!);
    await waitFor(() => {
      expect(document.querySelector('audio')).not.toBeInTheDocument();
    });
  });

  describe('Remove narration', () => {
    it('shows confirm dialog when clicking Remove', () => {
      mockConfirm.mockReturnValue(false);
      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
          hasNarration
          onChange={() => {}}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(mockConfirm).toHaveBeenCalledWith(expect.stringMatching(/delete.*narration/i));
    });

    it('does not call API if user cancels confirmation', () => {
      mockConfirm.mockReturnValue(false);
      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
          hasNarration
          onChange={() => {}}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls DELETE API when user confirms', async () => {
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
          hasNarration
          onChange={() => {}}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/narration/e1', { method: 'DELETE' });
      });
    });

    it('calls onChange with cleared transcript when delete succeeds', async () => {
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      const onChange = vi.fn();
      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
          hasNarration
          onChange={onChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transcript: '' }));
      });
    });

    it('does not call onChange when delete fails', async () => {
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
      const onChange = vi.fn();
      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
          hasNarration
          onChange={onChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/narration/e1', { method: 'DELETE' });
      });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Re-record', () => {
    it('starts a new recording when re-record is clicked in hasNarration state', async () => {
      const mockMediaRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        state: 'inactive' as string,
        ondataavailable: null as ((e: { data: Blob }) => void) | null,
        onstop: null as (() => void) | null,
      };
      mockMediaRecorder.start.mockImplementation(() => {
        mockMediaRecorder.state = 'recording';
      });
      const getUserMedia = vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      });
      // @ts-expect-error - mocking browser API
      global.MediaRecorder = function () { return mockMediaRecorder; };
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia },
        writable: true,
        configurable: true,
      });

      renderWithToast(
        <NarrationStudio
          entry={makeEntry({ has_narration: 1, transcript: 'old' })}
          hasNarration
          onChange={() => {}}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /re-record/i }));
        await Promise.resolve();
      });

      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockMediaRecorder.start).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  describe('Recording flow', () => {
    let mockMediaRecorder: {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      state: string;
      ondataavailable: ((e: { data: Blob }) => void) | null;
      onstop: (() => void) | null;
    };
    let mockStream: { getTracks: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockMediaRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        state: 'inactive',
        ondataavailable: null,
        onstop: null,
      };
      mockMediaRecorder.start.mockImplementation(() => {
        mockMediaRecorder.state = 'recording';
      });
      mockMediaRecorder.stop.mockImplementation(() => {
        mockMediaRecorder.state = 'inactive';
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) });
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      });
      mockStream = { getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]) };
      // @ts-expect-error - mocking browser API
      global.MediaRecorder = function () { return mockMediaRecorder; };
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        writable: true,
        configurable: true,
      });
    });

    it('shows Stop button in recording state', async () => {
      renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
        await Promise.resolve();
      });
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('uploads and triggers transcription after stop', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // upload
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ transcript: 'hi' }) }); // transcribe

      const onChange = vi.fn();
      renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={onChange} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
        await Promise.resolve();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /stop/i }));
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/edit/narration/e1',
          expect.objectContaining({ method: 'POST' })
        );
      });
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/transcribe/e1', { method: 'POST' });
      });
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transcript: 'hi' }));
      });
    });

    it('uses timestamp for cache busting after recording upload', async () => {
      const fakeNow = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(fakeNow);
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ transcript: 'hello' }) });
const onChange = vi.fn();
const { rerender } = renderWithToast(
  <NarrationStudio entry={makeEntry()} hasNarration={false} onChange={onChange} />
);

await act(async () => {
  fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
  await Promise.resolve();
});
await act(async () => {
  fireEvent.click(screen.getByRole('button', { name: /stop/i }));
  await Promise.resolve();
  await Promise.resolve();
});

// Simulating the parent component updating the prop after onChange
rerender(
  <ToastProvider>
    <NarrationStudio entry={makeEntry()} hasNarration={true} onChange={onChange} />
  </ToastProvider>
);

await waitFor(() => {
  const src = document.querySelector('audio')?.getAttribute('src');
  expect(src).toBe(`/api/narration/e1?t=${fakeNow}`);
});

      vi.restoreAllMocks();
    });
  });
});
