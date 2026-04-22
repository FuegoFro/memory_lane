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

      {/* Stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          padding: '0 80px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <MediaDisplay
            entry={currentEntry}
            isVideo={isVideo}
            isNarrationPlaying={isNarrationPlaying}
            onClick={toggleNarration}
          />
        </div>

        {/* Caption region */}
        {showTitles && currentEntry.title ? (
          <div style={{ padding: '20px 40px 120px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
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
        ) : (
          <div style={{ height: 120 }} />
        )}
      </div>

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
