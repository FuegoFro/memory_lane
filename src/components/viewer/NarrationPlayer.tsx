'use client';

import { useRef, useEffect, useState } from 'react';

interface NarrationPlayerProps {
  entryId: string;
  isPlaying: boolean;
  isVideo: boolean;
  initialHasNarration: boolean;
  onEnded: () => void;
  visible: boolean;
}

export function NarrationPlayer({
  entryId,
  isPlaying,
  isVideo,
  initialHasNarration,
  onEnded,
  visible,
}: NarrationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasNarration, setHasNarration] = useState(initialHasNarration);
  const [lastEntryId, setLastEntryId] = useState(entryId);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  if (entryId !== lastEntryId) {
    setLastEntryId(entryId);
    setHasNarration(initialHasNarration);
    setCurrentTime(0);
  }

  const narrationUrl = `/api/narration/${entryId}`;

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasNarration) return;

    if (isPlaying) {
      audio.play().catch(() => setHasNarration(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, hasNarration]);

  // Set up audio routing for video (narration left, video right)
  useEffect(() => {
    if (!isVideo || !isPlaying) return;

    // This is a simplified version - full implementation would require
    // connecting both audio sources through Web Audio API
    // For now, just play narration normally

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isVideo, isPlaying]);

  function handleTimeUpdate() {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }

  function handleError() {
    setHasNarration(false);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (!hasNarration) return null;

  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-md viewer-chrome ${visible ? '' : 'idle'}`}
    style={{ background: 'rgba(247,240,227,0.12)', border: '1px solid rgba(247,240,227,0.18)', zIndex: 10 }}>
      <audio
        ref={audioRef}
        src={narrationUrl}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />

      <span className="text-sm min-w-[40px] font-mono"
      style={{ color: 'rgba(247,240,227,0.85)' }}>
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        className="w-48 h-1 rounded appearance-none cursor-pointer narration-scrubber"
        style={{ background: 'rgba(247,240,227,0.18)', accentColor: 'var(--color-accent-hot)' }}
      />

      <span className="text-sm min-w-[40px] font-mono"
      style={{ color: 'rgba(247,240,227,0.85)' }}>
        {formatTime(duration)}
      </span>
    </div>
  );
}
