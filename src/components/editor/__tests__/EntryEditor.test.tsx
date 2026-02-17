/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryEditor } from '../EntryEditor';
import { Entry } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

// Create test entries
const createImageEntry = (): Entry => ({
  id: 'entry-1',
  dropbox_path: '/photos/photo1.jpg',
  title: 'Test Photo',
  transcript: 'This is a test transcript',
  position: 1,
  disabled: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const createVideoEntry = (): Entry => ({
  id: 'entry-2',
  dropbox_path: '/videos/video1.mp4',
  title: 'Test Video',
  transcript: null,
  position: null,
  disabled: 0,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
});

const createDisabledEntry = (): Entry => ({
  id: 'entry-3',
  dropbox_path: '/photos/disabled.jpg',
  title: 'Disabled Entry',
  transcript: null,
  position: 2,
  disabled: 1,
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
});

describe('EntryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  describe('Media preview', () => {
    it('renders image preview for image entries', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/api/media/entry-1');
    });

    it('renders video preview for video entries', () => {
      const entry = createVideoEntry();
      render(<EntryEditor entry={entry} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', '/api/media/entry-2');
      expect(video).toHaveAttribute('controls');
    });

    it('renders video for .mov files', () => {
      const entry = { ...createImageEntry(), dropbox_path: '/videos/video.mov' };
      render(<EntryEditor entry={entry} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('renders video for .webm files', () => {
      const entry = { ...createImageEntry(), dropbox_path: '/videos/video.webm' };
      render(<EntryEditor entry={entry} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });
  });

  describe('Form fields', () => {
    it('renders title input with entry title', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveValue('Test Photo');
    });

    it('renders title input with empty string when title is null', () => {
      const entry = { ...createImageEntry(), title: null };
      render(<EntryEditor entry={entry} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('');
    });

    it('renders status dropdown with correct value for active entry', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toBeInTheDocument();
      expect(statusSelect).toHaveValue('active');
    });

    it('renders status dropdown with staging for entry without position', () => {
      const entry = createVideoEntry();
      render(<EntryEditor entry={entry} />);

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toHaveValue('staging');
    });

    it('renders status dropdown with disabled for disabled entry', () => {
      const entry = createDisabledEntry();
      render(<EntryEditor entry={entry} />);

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toHaveValue('disabled');
    });

    it('renders all status options in dropdown', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /staging/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /disabled/i })).toBeInTheDocument();
    });

    it('renders transcript textarea with entry transcript', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const transcriptTextarea = screen.getByLabelText(/transcript/i);
      expect(transcriptTextarea).toBeInTheDocument();
      expect(transcriptTextarea).toHaveValue('This is a test transcript');
    });

    it('renders transcript textarea with empty string when transcript is null', () => {
      const entry = createVideoEntry();
      render(<EntryEditor entry={entry} />);

      const transcriptTextarea = screen.getByLabelText(/transcript/i);
      expect(transcriptTextarea).toHaveValue('');
    });

    it('allows editing the title', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(titleInput).toHaveValue('New Title');
    });

    it('allows editing the transcript', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const transcriptTextarea = screen.getByLabelText(/transcript/i);
      fireEvent.change(transcriptTextarea, { target: { value: 'New transcript' } });

      expect(transcriptTextarea).toHaveValue('New transcript');
    });

    it('allows changing the status', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const statusSelect = screen.getByLabelText(/status/i);
      fireEvent.change(statusSelect, { target: { value: 'disabled' } });

      expect(statusSelect).toHaveValue('disabled');
    });
  });

  describe('Narration section', () => {
    it('renders audio player when hasNarration is true', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} hasNarration={true} />);

      const audio = document.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', '/api/narration/entry-1');
      expect(audio).toHaveAttribute('controls');
    });

    it('does not render audio player when hasNarration is false', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} hasNarration={false} />);

      expect(document.querySelector('audio')).not.toBeInTheDocument();
    });

    it('hides audio player when audio fails to load', async () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} hasNarration={true} />);

      const audio = document.querySelector('audio');
      expect(audio).toBeInTheDocument();

      // Simulate audio load error (e.g. 404 from server)
      fireEvent.error(audio!);

      await waitFor(() => {
        expect(document.querySelector('audio')).not.toBeInTheDocument();
      });
    });

    it('renders record button', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const recordButton = screen.getByRole('button', { name: /record/i });
      expect(recordButton).toBeInTheDocument();
    });

    it('renders delete narration button', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('renders retry transcription button', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const retryButton = screen.getByRole('button', { name: /retry transcription/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Save action', () => {
    it('renders save button', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('calls API and navigates on save', async () => {
      const entry = createImageEntry();
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<EntryEditor entry={entry} backHref="/edit?stage=active" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/entry-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Photo',
            transcript: 'This is a test transcript',
            status: 'active',
          }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/edit?stage=active');
      });
    });

    it('saves updated values when fields are changed', async () => {
      const entry = createImageEntry();
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<EntryEditor entry={entry} />);

      // Change values
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Updated Title' } });
      fireEvent.change(screen.getByLabelText(/transcript/i), { target: { value: 'Updated transcript' } });
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'disabled' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/entries/entry-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Updated Title',
            transcript: 'Updated transcript',
            status: 'disabled',
          }),
        });
      });
    });

    it('disables save button while saving', async () => {
      const entry = createImageEntry();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryEditor entry={entry} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });

    it('shows saving state on button', async () => {
      const entry = createImageEntry();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryEditor entry={entry} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      });
    });
  });

  describe('Cancel action', () => {
    it('renders cancel button', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('navigates back on cancel', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} backHref="/edit?stage=staging" />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/edit?stage=staging');
    });
  });

  describe('Back button', () => {
    it('renders a back link', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} backHref="/edit?stage=active" />);

      const backLink = screen.getByRole('link', { name: /back to grid/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/edit?stage=active');
    });

    it('defaults back link to /edit when no backHref provided', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      const backLink = screen.getByRole('link', { name: /back to grid/i });
      expect(backLink).toHaveAttribute('href', '/edit');
    });
  });

  describe('Delete narration', () => {
    it('shows confirm dialog when clicking delete narration', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(false);

      render(<EntryEditor entry={entry} />);

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(expect.stringMatching(/delete.*narration/i));
    });

    it('does not call API if user cancels confirmation', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(false);

      render(<EntryEditor entry={entry} />);

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls delete API when user confirms', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<EntryEditor entry={entry} />);

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/narration/entry-1', {
          method: 'DELETE',
        });
      });
    });

    it('does not clear transcript or hide player when delete fails', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Delete failed' }) });

      render(<EntryEditor entry={entry} />);

      const transcriptTextarea = screen.getByLabelText(/transcript/i);
      expect(transcriptTextarea).toHaveValue('This is a test transcript');
      expect(document.querySelector('audio')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/narration/entry-1', { method: 'DELETE' });
      });

      // UI should NOT have updated since delete failed
      expect(transcriptTextarea).toHaveValue('This is a test transcript');
      expect(document.querySelector('audio')).toBeInTheDocument();
    });

    it('clears transcript after deleting narration', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<EntryEditor entry={entry} />);

      // Verify transcript has initial value
      const transcriptTextarea = screen.getByLabelText(/transcript/i);
      expect(transcriptTextarea).toHaveValue('This is a test transcript');

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(transcriptTextarea).toHaveValue('');
      });
    });

    it('hides audio player after deleting narration', async () => {
      const entry = createImageEntry();
      mockConfirm.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<EntryEditor entry={entry} />);

      // Audio player is initially visible
      expect(document.querySelector('audio')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /delete narration/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(document.querySelector('audio')).not.toBeInTheDocument();
      });
    });
  });

  describe('Retry transcription', () => {
    it('calls transcription API and updates transcript', async () => {
      const entry = createImageEntry();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transcript: 'New transcribed text' }),
      });

      render(<EntryEditor entry={entry} />);

      const retryButton = screen.getByRole('button', { name: /retry transcription/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/edit/transcribe/entry-1', {
          method: 'POST',
        });
      });

      await waitFor(() => {
        const transcriptTextarea = screen.getByLabelText(/transcript/i);
        expect(transcriptTextarea).toHaveValue('New transcribed text');
      });
    });

    it('disables retry button while transcribing', async () => {
      const entry = createImageEntry();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryEditor entry={entry} />);

      const retryButton = screen.getByRole('button', { name: /retry transcription/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(retryButton).toBeDisabled();
      });
    });

    it('shows transcribing state on button', async () => {
      const entry = createImageEntry();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EntryEditor entry={entry} />);

      const retryButton = screen.getByRole('button', { name: /retry transcription/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /transcribing/i })).toBeInTheDocument();
      });
    });
  });

  describe('Recording UI state', () => {
    it('shows "Record" text initially', () => {
      const entry = createImageEntry();
      render(<EntryEditor entry={entry} />);

      expect(screen.getByRole('button', { name: /^record$/i })).toBeInTheDocument();
    });
  });

  describe('Narration cache busting after recording', () => {
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
        // Simulate data available then stop
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) });
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      });

      mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      };

      // @ts-expect-error - mocking browser API
      global.MediaRecorder = function () { return mockMediaRecorder; };

      const mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      };
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: mediaDevices,
        writable: true,
        configurable: true,
      });
    });

    it('uses timestamp for cache busting after recording upload', async () => {
      const entry = createImageEntry();
      const fakeNow = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

      // Upload succeeds, then transcription succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // upload narration
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ transcript: 'hello' }) }); // transcription

      render(<EntryEditor entry={entry} />);

      // Start recording
      const recordButton = screen.getByRole('button', { name: /^record$/i });
      await act(async () => {
        fireEvent.click(recordButton);
        await Promise.resolve();
      });

      // Stop recording (triggers upload + transcription)
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await act(async () => {
        fireEvent.click(stopButton);
        await Promise.resolve();
        await Promise.resolve();
      });

      // After upload, audio src should use timestamp for cache busting
      await waitFor(() => {
        const updatedSrc = document.querySelector('audio')?.getAttribute('src');
        expect(updatedSrc).toBe(`/api/narration/entry-1?t=${fakeNow}`);
      });

      vi.restoreAllMocks();
    });

    it('recreates audio element after recording to force browser reload', async () => {
      const entry = createImageEntry();
      // Upload succeeds, then transcription succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // upload narration
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ transcript: 'hello' }) }); // transcription

      render(<EntryEditor entry={entry} />);

      // Grab a reference to the original audio element
      const originalAudio = document.querySelector('audio');
      expect(originalAudio).toBeInTheDocument();

      // Start recording
      const recordButton = screen.getByRole('button', { name: /^record$/i });
      await act(async () => {
        fireEvent.click(recordButton);
        await Promise.resolve();
      });

      // Stop recording (triggers upload + transcription)
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await act(async () => {
        fireEvent.click(stopButton);
        await Promise.resolve();
        await Promise.resolve();
      });

      // The audio element should be a NEW DOM node (not the same reference)
      // This proves React destroyed and recreated it, forcing the browser to load fresh audio
      await waitFor(() => {
        const newAudio = document.querySelector('audio');
        expect(newAudio).toBeInTheDocument();
        expect(newAudio).not.toBe(originalAudio);
      });
    });

    it('shows audio player after recording even if previously hidden', async () => {
      const entry = createImageEntry();
      // Upload succeeds, then transcription succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // upload narration
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ transcript: 'hello' }) }); // transcription

      render(<EntryEditor entry={entry} />);

      // Simulate audio error to hide the player
      const audio = document.querySelector('audio');
      fireEvent.error(audio!);
      await waitFor(() => {
        expect(document.querySelector('audio')).not.toBeInTheDocument();
      });

      // Start recording
      const recordButton = screen.getByRole('button', { name: /^record$/i });
      await act(async () => {
        fireEvent.click(recordButton);
        await Promise.resolve();
      });

      // Stop recording (triggers upload + transcription)
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await act(async () => {
        fireEvent.click(stopButton);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Audio player should be visible again after upload
      await waitFor(() => {
        expect(document.querySelector('audio')).toBeInTheDocument();
      });
    });
  });
});
