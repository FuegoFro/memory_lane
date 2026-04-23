'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Entry } from '@/types';
import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

type NarrationState =
  | 'noNarration'
  | 'hasNarration'
  | 'recording'
  | 'uploading'
  | 'transcribing';

export interface NarrationStudioChange {
  transcript?: string;
  has_narration?: number;
}

interface NarrationStudioProps {
  entry: Entry;
  hasNarration: boolean;
  onChange: (patch: NarrationStudioChange) => void;
}

const panelStyle: CSSProperties = {
  background: 'var(--color-paper2)',
  border: '1px solid var(--color-rule)',
  borderRadius: 10,
  padding: 18,
};

const monoLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: 0.15,
  color: 'var(--color-ink3)',
  textTransform: 'uppercase',
};

function formatDuration(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = Math.floor(totalSeconds % 60);
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: '2px solid var(--color-ink3)',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

function Waveform() {
  const bars = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 28,
        flex: 1,
      }}
    >
      {bars.map((i) => {
        // pseudo-random bar heights that look wave-like
        const h = 6 + ((Math.sin(i * 0.7) + 1) / 2) * 20 + (i % 5) * 1.2;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 2,
              height: `${h}px`,
              background: 'var(--color-accent)',
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}

export function NarrationStudio({ entry, hasNarration, onChange }: NarrationStudioProps) {
  const { showToast } = useToast();
  const [narrationState, setNarrationState] = useState<NarrationState>(
    hasNarration ? 'hasNarration' : 'noNarration'
  );
  const [narrationKey, setNarrationKey] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioError, setAudioError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Sync state with prop
  useEffect(() => {
    if (narrationState === 'recording' || narrationState === 'uploading' || narrationState === 'transcribing') return;
    setNarrationState(hasNarration ? 'hasNarration' : 'noNarration');
    setAudioError(false);
  }, [hasNarration, narrationState]);

  // Tick the recording timer
  useEffect(() => {
    if (narrationState !== 'recording') {
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [narrationState]);

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
        try {
          await uploadNarration(blob);
          setNarrationState('transcribing');
          await triggerTranscription();
          setNarrationState('hasNarration');
        } catch (err) {
          console.error('Narration processing failed:', err);
          showToast('Failed to process narration', 'error');
          setNarrationState(hasNarration ? 'hasNarration' : 'noNarration');
        }
      };

      mediaRecorder.start();
      setRecordingSeconds(0);
      setNarrationState('recording');
      setAudioError(false);
    } catch (err) {
      console.error('Failed to start recording:', err);
      showToast('Could not access microphone', 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  async function uploadNarration(blob: Blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'narration.webm');
    const res = await fetch(`/api/edit/narration/${entry.id}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    setNarrationKey(Date.now().toString());
  }

  async function triggerTranscription() {
    const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Transcription failed');
    const data = await res.json();
    onChange({ has_narration: 1, transcript: data.transcript || undefined });
  }

  async function handleRemove() {
    if (!confirm('Are you sure you want to delete the narration?')) {
      return;
    }
    try {
      const res = await fetch(`/api/edit/narration/${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Delete failed');
      }
      onChange({ transcript: '', has_narration: 0 });
      setNarrationState('noNarration');
    } catch (err) {
      console.error('Failed to remove narration:', err);
      showToast('Failed to delete narration', 'error');
    }
  }

  // Re-record starts a fresh recording, which will overwrite the existing narration
  // after upload. Same flow as startRecording.
  async function handleReRecord() {
    await startRecording();
  }

  const playerVisible =
    (narrationState === 'hasNarration' || narrationState === 'transcribing') && !audioError;
  const audioSrc = `/api/narration/${entry.id}${narrationKey ? `?t=${narrationKey}` : ''}`;

  const headerRight =
    narrationState === 'hasNarration' && audioDuration !== null
      ? `${formatDuration(audioDuration)} · auto-transcribed`
      : narrationState === 'hasNarration'
      ? 'auto-transcribed'
      : null;

  return (
    <div style={panelStyle}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={monoLabel}>Narration</span>
        {headerRight ? <span style={monoLabel}>{headerRight}</span> : null}
      </div>

      {/* noNarration */}
      {narrationState === 'noNarration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--color-ink2)',
              lineHeight: 1.45,
            }}
          >
            Speak as though telling a grandchild — who, when, where, why it mattered.
          </p>
          <div>
            <Btn kind="accent" onClick={startRecording}>
              <Icon name="mic" size={14} stroke="var(--color-paper)" />
              Record
            </Btn>
          </div>
        </div>
      )}

      {/* recording */}
      {narrationState === 'recording' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            className="rec-pulse"
            aria-hidden
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#c04a3a',
              flexShrink: 0,
            }}
          />
          <span style={{ ...monoLabel, color: 'var(--color-ink2)', fontSize: 12 }}>
            {formatDuration(recordingSeconds)}
          </span>
          <Waveform />
          <Btn kind="danger" onClick={stopRecording}>
            <Icon name="stop" size={12} stroke="var(--color-paper)" />
            Stop
          </Btn>
        </div>
      )}

      {/* uploading */}
      {narrationState === 'uploading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <Btn kind="subtle" disabled>
            Uploading…
          </Btn>
        </div>
      )}

      {/* transcribing (player visible + label) */}
      {narrationState === 'transcribing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {playerVisible && (
            <audio
              key={narrationKey}
              src={audioSrc}
              controls
              style={{ width: '100%', opacity: 0.5, pointerEvents: 'none' }}
              onError={() => setAudioError(true)}
              onLoadedMetadata={(e) => {
                const d = (e.target as HTMLAudioElement).duration;
                if (!isNaN(d) && isFinite(d)) setAudioDuration(d);
              }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spinner />
            <span style={{ ...monoLabel, color: 'var(--color-ink2)', fontSize: 12 }}>Transcribing…</span>
          </div>
        </div>
      )}

      {/* hasNarration */}
      {narrationState === 'hasNarration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {playerVisible && (
            <audio
              key={narrationKey}
              src={audioSrc}
              controls
              style={{ width: '100%' }}
              onError={() => setAudioError(true)}
              onLoadedMetadata={(e) => {
                const d = (e.target as HTMLAudioElement).duration;
                if (!isNaN(d) && isFinite(d)) setAudioDuration(d);
              }}
            />
          )}

          {entry.transcript ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-news)',
                fontStyle: 'italic',
                fontSize: 16,
                color: 'var(--color-ink2)',
                lineHeight: 1.5,
              }}
            >
              &ldquo;{entry.transcript}&rdquo;
            </p>
          ) : null}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="ghost" onClick={handleReRecord}>
              <Icon name="rotate" size={12} />
              Re-record
            </Btn>
            <Btn kind="clear" onClick={handleRemove}>
              <Icon name="trash" size={12} />
              Remove
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
