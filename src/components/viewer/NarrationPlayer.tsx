'use client';

import { useRef, useEffect, useState } from 'react';

interface NarrationPlayerProps {
  entryId: string;
  isPlaying: boolean;
  isVideo: boolean;
  onEnded: () => void;
}

export function NarrationPlayer({
  entryId,
  isPlaying,
  isVideo,
  onEnded,
}: NarrationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasNarration, setHasNarration] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const narrationUrl = `/api/narration/${entryId}`;

  // Reset state when entryId changes
  // Note: We initialize with hasNarration=true, and the audio element's
  // onError handler will set it to false if the narration doesn't exist.
  // This is intentionally using refs to avoid the setState-in-effect pattern.
  useEffect(() => {
    // Reset audio element directly instead of using setState
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [entryId]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasNarration) return;

    if (isPlaying) {
      audio.play().catch(() => setHasNarration(false));
    } else {
      audio.pause();
      audio.currentTime = 0;
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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg px-4 py-2 flex items-center gap-3">
      <audio
        ref={audioRef}
        src={narrationUrl}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />

      <span className="text-white text-sm min-w-[40px]">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        className="w-48 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
      />

      <span className="text-white text-sm min-w-[40px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
