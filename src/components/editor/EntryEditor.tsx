'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Entry, getEntryStatus, EntryStatus, isVideoFile } from '@/types';
import { NarrationStudio, NarrationStudioChange } from './NarrationStudio';
import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import { Pill } from '@/components/ui/Pill';

interface EntryEditorProps {
  entry: Entry;
  hasNarration?: boolean;
  activeCount?: number;
  activeIndex?: number;
  onEntryUpdated?: (entry: Entry) => void;
  onClose?: () => void;
}

export function EntryEditor({
  entry,
  hasNarration: initialHasNarration = false,
  activeCount,
  activeIndex,
  onEntryUpdated,
  onClose,
}: EntryEditorProps) {
  const router = useRouter();
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
    // setState inside an effect is intentional here: we want the 'saving' indicator
    // to appear immediately when state changes are detected, not after the debounce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const year = entry.created_at ? new Date(entry.created_at).getFullYear() : null;
  const kindLabel = isVideo ? 'Video' : 'Photo';

  return (
    <div className="entry-editor-grid">
      {/* Left Column: Media Preview */}
      <div
        style={{
          background: 'var(--color-viewer-bg)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          padding: 40,
        }}
      >
        {isVideo ? (
          <video
            src={`/api/media/${entry.id}`}
            controls
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }}
          />
        ) : (
          <Photo
            src={`/api/media/${entry.id}`}
            alt={title}
            rounded={8}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        )}

        {status === 'active' && activeIndex !== undefined && activeCount !== undefined && (
          <div style={{ position: 'absolute', top: 24, left: 24 }}>
            <Pill bg="rgba(255,255,255,0.1)" fg="var(--color-paper)">
              POSITION {activeIndex} of {activeCount}
            </Pill>
          </div>
        )}
      </div>

      {/* Right Column: Form */}
      <div
        style={{
          padding: '32px 32px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          overflowY: 'auto',
          borderLeft: 'var(--editor-border-left)',
          borderTop: 'var(--editor-border-top)',
        }}
      >
        {/* Meta Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {year && <Pill bg="var(--color-paper2)" fg="var(--color-ink3)">{year}</Pill>}
            <Pill bg="var(--color-paper2)" fg="var(--color-ink3)">{kindLabel}</Pill>
            {saveStatus === 'saving' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-ink3)', textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#4a5d3a', textTransform: 'uppercase' }}>
                ✓ Saved
              </span>
            )}
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              padding: 4,
              cursor: 'pointer',
              color: 'var(--color-ink3)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Title Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="title" style={{ display: 'none' }}>Title</label>
          <input
            id="title"
            type="text"
            value={title}
            placeholder="Give it a title…"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => {
              const payload = { title: e.target.value, transcript, status };
              pendingSaveRef.current = payload;
              saveNow(payload);
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 0,
              borderBottom: '1px solid var(--color-rule)',
              padding: '4px 0 12px',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* Status Pill Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Status
          </span>
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-paper2)', padding: 4, borderRadius: 999 }}>
            <StatusBtn
              label="Just arrived"
              active={status === 'staging'}
              dot="var(--color-staging)"
              onClick={() => setStatus('staging')}
            />
            <StatusBtn
              label="In the slideshow"
              active={status === 'active'}
              dot="var(--color-accent)"
              onClick={() => setStatus('active')}
            />
            <StatusBtn
              label="Set aside"
              active={status === 'disabled'}
              dot="var(--color-disabled-ink)"
              onClick={() => setStatus('disabled')}
            />
          </div>
        </div>

        {/* Narration Studio */}
        <NarrationStudio
          entry={narrationEntry}
          hasNarration={hasNarration}
          onChange={handleNarrationChange}
        />

        {/* Transcript Textarea */}
        {hasNarration && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Transcript
            </span>
            <textarea
              id="transcript"
              aria-label="Transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onBlur={(e) => {
                const payload = { title, transcript: e.target.value, status };
                pendingSaveRef.current = payload;
                saveNow(payload);
              }}
              placeholder="Audio transcription will appear here…"
              style={{
                width: '100%',
                minHeight: 120,
                background: 'transparent',
                border: 0,
                fontFamily: 'var(--font-news)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.6,
                color: 'var(--color-ink2)',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Navigation / Action */}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          {status === 'active' && entry.position !== null && (
            <Btn kind="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/')}>
              <Icon name="play" size={12} stroke="var(--color-paper)" />
              Open in slideshow
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBtn({ label, active, dot, onClick }: { label: string; active: boolean; dot: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: active ? 'var(--color-paper)' : 'transparent',
        border: 0,
        color: active ? 'var(--color-ink)' : 'var(--color-ink3)',
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      {label}
    </button>
  );
}
