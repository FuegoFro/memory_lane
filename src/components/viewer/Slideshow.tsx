'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Entry, isVideoFile } from '@/types';
import { MediaDisplay } from './MediaDisplay';
import { NarrationPlayer } from './NarrationPlayer';
import { ViewerControls } from './ViewerControls';

interface SlideshowProps {
  entries: Entry[];
  initialAutoAdvance: number;
  initialShowTitles: boolean;
}

export function Slideshow({ entries, initialAutoAdvance, initialShowTitles }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(initialAutoAdvance);
  const [showTitles, setShowTitles] = useState(initialShowTitles);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const autoAdvanceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFirstSettingsSync = useRef(true);

  const currentEntry = entries[currentIndex];
  const isVideo = currentEntry ? isVideoFile(currentEntry.dropbox_path) : false;

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + entries.length) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const toggleNarration = useCallback(() => setIsNarrationPlaying((p) => !p), []);

  // Auto-advance
  useEffect(() => {
    if (autoAdvanceTimeout.current) clearTimeout(autoAdvanceTimeout.current);
    if (autoAdvanceDelay > 0 && !isNarrationPlaying && !isVideo) {
      autoAdvanceTimeout.current = setTimeout(goToNext, autoAdvanceDelay * 1000);
    }
    return () => { if (autoAdvanceTimeout.current) clearTimeout(autoAdvanceTimeout.current); };
  }, [currentIndex, autoAdvanceDelay, isNarrationPlaying, isVideo, goToNext]);

  // Hide controls after 2.5s inactivity
  useEffect(() => {
    function show() {
      setControlsVisible(true);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => setControlsVisible(false), 2500);
    }
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('keydown', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('keydown', show);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          goToPrev();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          toggleNarration();
          break;
        case 'a':
        case 'A':
          setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0));
          break;
        case 't':
        case 'T':
          setShowTitles((s) => !s);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNext, goToPrev, toggleNarration]);

  // Persist toggle preferences; silently no-ops if unauthenticated
  useEffect(() => {
    if (isFirstSettingsSync.current) {
      isFirstSettingsSync.current = false;
      return;
    }
    fetch('/api/edit/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoAdvanceDelay, showTitles }),
    }).catch(() => {});
  }, [showTitles, autoAdvanceDelay]);

  if (!currentEntry) {
    return (
      <div className="h-screen grid place-items-center" style={{ background: 'var(--color-viewer-bg)', color: 'var(--color-paper)' }}>
        No entries to display
      </div>
    );
  }

  return (
    <div
      className="h-screen relative overflow-hidden"
      style={{ background: '#0d0805', color: 'var(--color-paper)' }}
    >
      {/* Warm vignette overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: `
            radial-gradient(ellipse at center, transparent 50%, rgba(26,12,4,0.5) 100%),
            radial-gradient(circle at 18% 8%, rgba(177,74,42,0.10) 0%, transparent 40%),
            radial-gradient(circle at 85% 92%, rgba(212,165,116,0.08) 0%, transparent 42%)
          `,
        }}
      />

      {/* Stage: media centered in full viewport */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '0 80px',
          zIndex: 1,
        }}
      >
        <MediaDisplay
          entry={currentEntry}
          isVideo={isVideo}
          isNarrationPlaying={isNarrationPlaying}
          onClick={toggleNarration}
        />
      </div>

      {/* Caption: absolute overlay at bottom, always in-viewport */}
      {showTitles && currentEntry.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '60px 80px 140px',
            textAlign: 'center',
            zIndex: 2,
            background: 'linear-gradient(transparent, rgba(13,8,5,0.65))',
            pointerEvents: 'none',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 38,
              letterSpacing: -0.3,
              lineHeight: 1.1,
              color: 'var(--color-paper)',
            }}
          >
            {currentEntry.title}
          </h2>
        </div>
      )}

      <NarrationPlayer
        entryId={currentEntry.id}
        isPlaying={isNarrationPlaying}
        isVideo={isVideo}
        onEnded={() => {
          setIsNarrationPlaying(false);
          if (autoAdvanceDelay > 0) goToNext();
        }}
      />

      <ViewerControls
        visible={controlsVisible}
        currentIndex={currentIndex}
        totalEntries={entries.length}
        autoAdvanceDelay={autoAdvanceDelay}
        showTitles={showTitles}
        isNarrationPlaying={isNarrationPlaying}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleNarration={toggleNarration}
        onToggleAutoAdvance={() => setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0))}
        onToggleTitles={() => setShowTitles((s) => !s)}
      />
    </div>
  );
}
