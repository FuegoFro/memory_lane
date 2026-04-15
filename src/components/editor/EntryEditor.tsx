'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface EntryEditorProps {
  entry: Entry;
  backHref?: string;
  hasNarration?: boolean;
}

export function EntryEditor({ entry, backHref, hasNarration: initialHasNarration = false }: EntryEditorProps) {
  const router = useRouter();
  const backUrl = backHref || '/edit';

  const [title, setTitle] = useState(entry.title || '');
  const [transcript, setTranscript] = useState(entry.transcript || '');
  const [status, setStatus] = useState<EntryStatus>(getEntryStatus(entry));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasNarration, setHasNarration] = useState(initialHasNarration);
  const [narrationKey, setNarrationKey] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isVideo = isVideoFile(entry.dropbox_path);

  const pendingSaveRef = useRef<{ title: string, transcript: string, status: EntryStatus } | null>(null);

  const saveNow = useCallback(async (payload: { title: string, transcript: string, status: EntryStatus } | null) => {
    if (!payload) return;
    try {
      await fetch(`/api/edit/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (pendingSaveRef.current === payload) {
        pendingSaveRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus((current) => current === 'saved' ? 'idle' : current);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [entry.id]);

  useEffect(() => {
    const isChanged = title !== (entry.title || '') ||
      transcript !== (entry.transcript || '') ||
      status !== getEntryStatus(entry);

    if (!isChanged && pendingSaveRef.current === null) return;

    pendingSaveRef.current = { title, transcript, status };
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      saveNow(pendingSaveRef.current);
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, transcript, status, entry, saveNow]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        saveNow(pendingSaveRef.current);
      }
    };
  }, [saveNow]);

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Media Preview */}
      <div className="mb-6">
        {isVideo ? (
          <video
            src={`/api/media/${entry.id}`}
            controls
            className="w-full max-h-96 object-contain bg-black rounded-lg"
          />
        ) : (
          <img
            src={`/api/media/${entry.id}`}
            alt={title || 'Entry preview'}
            className="w-full max-h-96 object-contain bg-black rounded-lg"
          />
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label id="status-label" className="block text-sm font-medium text-gray-300 mb-1">
            Status
          </label>
          <SegmentedControl<EntryStatus>
            options={[
              { value: 'staging', label: 'Staging' },
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            value={status}
            onChange={setStatus}
            aria-labelledby="status-label"
          />
        </div>

        {/* Narration Section */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-200 mb-3">Narration</h3>

          {/* Audio Player */}
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
        </div>

        {/* Transcript */}
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-300 mb-1">
            Transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      {/* Save Status Indicator */}
      <div className="flex justify-end mt-4 h-8 items-center">
        {saveStatus === 'saving' && <span className="text-gray-400 text-sm font-medium animate-pulse">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-green-500 text-sm font-medium">✓ Saved</span>}
      </div>
    </div>
  );
}
