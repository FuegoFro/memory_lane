'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { NarrationStudio, NarrationStudioChange } from './NarrationStudio';

interface EntryEditorProps {
  entry: Entry;
  hasNarration?: boolean;
  onEntryUpdated?: (entry: Entry) => void;
}

export function EntryEditor({ entry, hasNarration: initialHasNarration = false, onEntryUpdated }: EntryEditorProps) {
  const [title, setTitle] = useState(entry.title || '');
  const [transcript, setTranscript] = useState(entry.transcript || '');
  const [status, setStatus] = useState<EntryStatus>(getEntryStatus(entry));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasNarration, setHasNarration] = useState<boolean>(initialHasNarration);

  const isVideo = isVideoFile(entry.dropbox_path);

  // NarrationStudio needs a live entry (with current transcript) so the italic
  // quote in hasNarration state reflects any edits from the transcript field.
  const narrationEntry: Entry = { ...entry, transcript, has_narration: hasNarration ? 1 : 0 };

  function handleNarrationChange(patch: NarrationStudioChange) {
    if (patch.transcript !== undefined) {
      setTranscript(patch.transcript);
    }
    if (patch.has_narration !== undefined) {
      setHasNarration(patch.has_narration === 1);
    }
  }

  const pendingSaveRef = useRef<{ title: string, transcript: string, status: EntryStatus } | null>(null);
  const lastSavedRef = useRef({ title: entry.title || '', transcript: entry.transcript || '', status: getEntryStatus(entry) });

  const saveNow = useCallback(async (payload: { title: string, transcript: string, status: EntryStatus } | null) => {
    if (!payload) return;
    try {
      const res = await fetch(`/api/edit/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (pendingSaveRef.current === payload) {
        lastSavedRef.current = payload;
        pendingSaveRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus((current) => current === 'saved' ? 'idle' : current);
        }, 2000);
        if (res.ok && onEntryUpdated) {
          try {
            const updated = (await res.json()) as Entry;
            onEntryUpdated(updated);
          } catch {
            // Response wasn't JSON — ignore, UI already showed "saved".
          }
        }
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [entry.id, onEntryUpdated]);

  useEffect(() => {
    const saved = lastSavedRef.current;
    const isChanged = title !== saved.title ||
      transcript !== saved.transcript ||
      status !== saved.status;

    if (!isChanged && pendingSaveRef.current === null) return;

    pendingSaveRef.current = { title, transcript, status };
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      saveNow(pendingSaveRef.current);
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, transcript, status, saveNow]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        saveNow(pendingSaveRef.current);
      }
    };
  }, [saveNow]);

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
        <NarrationStudio
          entry={narrationEntry}
          hasNarration={hasNarration}
          onChange={handleNarrationChange}
        />

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
