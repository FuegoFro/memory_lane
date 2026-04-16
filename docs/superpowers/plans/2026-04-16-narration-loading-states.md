# Narration Loading States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `recording`, `transcribing`, and `hasNarration` boolean state in `EntryEditor` with a single `NarrationState` enum, and use it to drive correct disabled/label logic on all narration buttons.

**Architecture:** A `NarrationState` string union type encodes all mutually-exclusive narration states. All button `disabled` props and labels are derived from this single value. The `hasNarration` prop still initialises the state; it is no longer stored as a separate boolean.

**Tech Stack:** React, TypeScript, Vitest, Testing Library

---

### Task 1: Write failing tests for the new disabled-state behavior

**Files:**
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

- [ ] **Step 1: Add tests to the "Narration section" describe block** (around line 197)

  Add these four tests after the existing `renders retry transcription button` test:

  ```tsx
  it('disables Delete Narration button when there is no narration', () => {
    render(<EntryEditor entry={createImageEntry()} />);
    expect(screen.getByRole('button', { name: /delete narration/i })).toBeDisabled();
  });

  it('disables Retry Transcription button when there is no narration', () => {
    render(<EntryEditor entry={createImageEntry()} />);
    expect(screen.getByRole('button', { name: /retry transcription/i })).toBeDisabled();
  });

  it('enables Delete Narration button when narration exists', () => {
    render(<EntryEditor entry={createImageEntry()} hasNarration={true} />);
    expect(screen.getByRole('button', { name: /delete narration/i })).not.toBeDisabled();
  });

  it('enables Retry Transcription button when narration exists', () => {
    render(<EntryEditor entry={createImageEntry()} hasNarration={true} />);
    expect(screen.getByRole('button', { name: /retry transcription/i })).not.toBeDisabled();
  });
  ```

- [ ] **Step 2: Add a new describe block for uploading/transcribing button states**

  Add this describe block after the `Retry transcription` describe block (after line 555). It reuses the same MediaRecorder mock pattern from the existing "Narration cache busting" block:

  ```tsx
  describe('Narration button states during async operations', () => {
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

      mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      };

      // @ts-expect-error - mocking browser API
      global.MediaRecorder = function () { return mockMediaRecorder; };

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        writable: true,
        configurable: true,
      });
    });

    it('disables all buttons and shows Uploading… on Record button during upload', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // upload never resolves

      render(<EntryEditor entry={createImageEntry()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
        await Promise.resolve();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete narration/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /retry transcription/i })).toBeDisabled();
    });

    it('disables Record button during transcription after upload', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // upload succeeds
        .mockImplementation(() => new Promise(() => {})); // transcription never resolves

      render(<EntryEditor entry={createImageEntry()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
        await Promise.resolve();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^record$/i })).toBeDisabled();
      });
    });
  });
  ```

- [ ] **Step 3: Run the new tests to confirm they fail**

  ```bash
  npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx
  ```

  Expected: the four new "Narration section" tests and the two "async operations" tests fail. All other existing tests pass.

---

### Task 2: Implement the NarrationState enum refactor

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx`

- [ ] **Step 1: Replace the three boolean state declarations and the type import at the top**

  Replace lines 3-7:
  ```tsx
  import { useState, useRef, useEffect, useCallback } from 'react';
  import { useRouter } from 'next/navigation';
  import Link from 'next/link';
  import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';
  import { SegmentedControl } from '@/components/ui/SegmentedControl';
  ```

  With:
  ```tsx
  import { useState, useRef, useEffect, useCallback } from 'react';
  import { useRouter } from 'next/navigation';
  import Link from 'next/link';
  import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';
  import { SegmentedControl } from '@/components/ui/SegmentedControl';

  type NarrationState = 'noNarration' | 'hasNarration' | 'recording' | 'uploading' | 'transcribing';
  ```

- [ ] **Step 2: Replace the three state variables inside the component**

  Replace:
  ```tsx
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasNarration, setHasNarration] = useState(initialHasNarration);
  const [narrationKey, setNarrationKey] = useState('');
  ```

  With:
  ```tsx
  const [narrationState, setNarrationState] = useState<NarrationState>(
    initialHasNarration ? 'hasNarration' : 'noNarration'
  );
  const [narrationKey, setNarrationKey] = useState('');
  ```

- [ ] **Step 3: Replace handleDeleteNarration**

  Replace:
  ```tsx
  async function handleDeleteNarration() {
    if (!confirm('Are you sure you want to delete the narration?')) {
      return;
    }
    const res = await fetch(`/api/edit/narration/${entry.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      return;
    }
    setTranscript('');
    setHasNarration(false);
  }
  ```

  With:
  ```tsx
  async function handleDeleteNarration() {
    if (!confirm('Are you sure you want to delete the narration?')) {
      return;
    }
    const res = await fetch(`/api/edit/narration/${entry.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      return;
    }
    setTranscript('');
    setNarrationState('noNarration');
  }
  ```

- [ ] **Step 4: Replace handleRetryTranscription**

  Replace:
  ```tsx
  async function handleRetryTranscription() {
    setTranscribing(true);
    try {
      const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } finally {
      setTranscribing(false);
    }
  }
  ```

  With:
  ```tsx
  async function handleRetryTranscription() {
    setNarrationState('transcribing');
    try {
      const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } finally {
      setNarrationState('hasNarration');
    }
  }
  ```

- [ ] **Step 5: Replace startRecording and stopRecording**

  Replace:
  ```tsx
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await uploadNarration(blob);
        await triggerTranscription();
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }
  ```

  With:
  ```tsx
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setNarrationState('uploading');
        await uploadNarration(blob);
        setNarrationState('transcribing');
        await triggerTranscription();
        setNarrationState('hasNarration');
      };

      mediaRecorder.start();
      setNarrationState('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }
  ```

- [ ] **Step 6: Replace uploadNarration — remove the setHasNarration call**

  Replace:
  ```tsx
  async function uploadNarration(blob: Blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'narration.webm');
    await fetch(`/api/edit/narration/${entry.id}`, {
      method: 'POST',
      body: formData,
    });
    setHasNarration(true);
    setNarrationKey(Date.now().toString());
  }
  ```

  With:
  ```tsx
  async function uploadNarration(blob: Blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'narration.webm');
    await fetch(`/api/edit/narration/${entry.id}`, {
      method: 'POST',
      body: formData,
    });
    setNarrationKey(Date.now().toString());
  }
  ```

- [ ] **Step 7: Replace triggerTranscription — remove state management**

  Replace:
  ```tsx
  async function triggerTranscription() {
    setTranscribing(true);
    try {
      const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } finally {
      setTranscribing(false);
    }
  }
  ```

  With:
  ```tsx
  async function triggerTranscription() {
    const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.transcript) {
      setTranscript(data.transcript);
    }
  }
  ```

- [ ] **Step 8: Replace the audio player visibility condition in JSX**

  Replace:
  ```tsx
  {hasNarration && (
    <div className="mb-3">
      <audio
        key={narrationKey}
        src={`/api/narration/${entry.id}${narrationKey ? `?t=${narrationKey}` : ''}`}
        controls
        className="w-full"
        onError={() => setHasNarration(false)}
      />
    </div>
  )}
  ```

  With:
  ```tsx
  {(narrationState === 'hasNarration' || narrationState === 'transcribing') && (
    <div className="mb-3">
      <audio
        key={narrationKey}
        src={`/api/narration/${entry.id}${narrationKey ? `?t=${narrationKey}` : ''}`}
        controls
        className="w-full"
        onError={() => setNarrationState('noNarration')}
      />
    </div>
  )}
  ```

- [ ] **Step 9: Replace the Recording Controls buttons in JSX**

  Replace:
  ```tsx
  {/* Recording Controls */}
  <div className="flex flex-wrap gap-2 mb-3">
    <button
      onClick={recording ? stopRecording : startRecording}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${recording
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
    >
      {recording ? 'Stop Recording' : 'Record'}
    </button>

    <button
      onClick={handleDeleteNarration}
      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
    >
      Delete Narration
    </button>

    <button
      onClick={handleRetryTranscription}
      disabled={transcribing}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${transcribing
        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
      {transcribing ? 'Transcribing...' : 'Retry Transcription'}
    </button>
  </div>
  ```

  With:
  ```tsx
  {/* Recording Controls */}
  <div className="flex flex-wrap gap-2 mb-3">
    <button
      onClick={narrationState === 'recording' ? stopRecording : startRecording}
      disabled={narrationState === 'uploading' || narrationState === 'transcribing'}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        narrationState === 'recording'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : narrationState === 'uploading' || narrationState === 'transcribing'
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {narrationState === 'recording'
        ? 'Stop Recording'
        : narrationState === 'uploading'
        ? 'Uploading…'
        : 'Record'}
    </button>

    <button
      onClick={handleDeleteNarration}
      disabled={narrationState !== 'hasNarration'}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        narrationState !== 'hasNarration'
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      Delete Narration
    </button>

    <button
      onClick={handleRetryTranscription}
      disabled={narrationState !== 'hasNarration'}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        narrationState !== 'hasNarration'
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {narrationState === 'transcribing' ? 'Transcribing...' : 'Retry Transcription'}
    </button>
  </div>
  ```

- [ ] **Step 10: Run the tests**

  ```bash
  npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx
  ```

  Expected: the six new tests now pass. Some existing tests in "Delete narration" and "Retry transcription" describe blocks will fail because they render without `hasNarration={true}` and try to click disabled buttons. Move on to Task 3.

---

### Task 3: Fix existing tests broken by the refactor

**Files:**
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

The tests below all interact with buttons that are now correctly disabled when `hasNarration` is not passed. Add `hasNarration={true}` to each render call.

- [ ] **Step 1: Fix the three "Delete narration" tests that render without hasNarration**

  In the "Delete narration" describe block, three tests render `<EntryEditor entry={entry} />` without `hasNarration`. Replace:

  ```tsx
  it('shows confirm dialog when clicking delete narration', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(false);

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('shows confirm dialog when clicking delete narration', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(false);

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

  Replace:
  ```tsx
  it('does not call API if user cancels confirmation', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(false);

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('does not call API if user cancels confirmation', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(false);

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

  Replace:
  ```tsx
  it('calls delete API when user confirms', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('calls delete API when user confirms', async () => {
    const entry = createImageEntry();
    mockConfirm.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

- [ ] **Step 2: Fix the three "Retry transcription" tests**

  Replace:
  ```tsx
  it('calls transcription API and updates transcript', async () => {
    const entry = createImageEntry();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ transcript: 'New transcribed text' }),
    });

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('calls transcription API and updates transcript', async () => {
    const entry = createImageEntry();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ transcript: 'New transcribed text' }),
    });

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

  Replace:
  ```tsx
  it('disables retry button while transcribing', async () => {
    const entry = createImageEntry();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('disables retry button while transcribing', async () => {
    const entry = createImageEntry();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

  Replace:
  ```tsx
  it('shows transcribing state on button', async () => {
    const entry = createImageEntry();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EntryEditor entry={entry} />);
  ```
  With:
  ```tsx
  it('shows transcribing state on button', async () => {
    const entry = createImageEntry();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EntryEditor entry={entry} hasNarration={true} />);
  ```

- [ ] **Step 3: Run all tests and confirm they pass**

  ```bash
  npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/editor/EntryEditor.tsx src/components/editor/__tests__/EntryEditor.test.tsx
  git commit -m "feat: replace narration boolean state with NarrationState enum"
  ```

---

### Task 4: Final verification

- [ ] **Step 1: Run full test suite**

  ```bash
  npm run test:run
  ```

  Expected: all tests pass.

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint
  ```

  Expected: no errors.
