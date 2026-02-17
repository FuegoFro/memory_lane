'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';

interface EntryEditorProps {
  entry: Entry;
  backHref?: string;
  hasNarration?: boolean;
}

export function EntryEditor({ entry, backHref, hasNarration: initialHasNarration = true }: EntryEditorProps) {
  const router = useRouter();
  const backUrl = backHref || '/edit';

  const [title, setTitle] = useState(entry.title || '');
  const [transcript, setTranscript] = useState(entry.transcript || '');
  const [status, setStatus] = useState<EntryStatus>(getEntryStatus(entry));
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasNarration, setHasNarration] = useState(initialHasNarration);
  const [narrationKey, setNarrationKey] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isVideo = isVideoFile(entry.dropbox_path);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/edit/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, transcript, status }),
      });
      router.push(backUrl);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(backUrl);
  }

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
      <Link
        href={backUrl}
        className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
      >
        ← Back to grid
      </Link>

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
          <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EntryStatus)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="staging">Staging</option>
            <option value="disabled">Disabled</option>
          </select>
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                recording
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                transcribing
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

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            saving
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
