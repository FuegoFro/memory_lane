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

export function Slideshow({
  entries,
  initialAutoAdvance,
  initialShowTitles,
}: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(initialAutoAdvance);
  const [showTitles, setShowTitles] = useState(initialShowTitles);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout>(undefined);
  const autoAdvanceTimeout = useRef<NodeJS.Timeout>(undefined);

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

  const toggleNarration = useCallback(() => {
    setIsNarrationPlaying((p) => !p);
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (autoAdvanceTimeout.current) {
      clearTimeout(autoAdvanceTimeout.current);
    }

    if (autoAdvanceDelay > 0 && !isNarrationPlaying && !isVideo) {
      autoAdvanceTimeout.current = setTimeout(goToNext, autoAdvanceDelay * 1000);
    }

    return () => {
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current);
      }
    };
  }, [currentIndex, autoAdvanceDelay, isNarrationPlaying, isVideo, goToNext]);

  // Hide controls after inactivity
  useEffect(() => {
    function showControls() {
      setControlsVisible(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }

    window.addEventListener('mousemove', showControls);
    window.addEventListener('keydown', showControls);

    return () => {
      window.removeEventListener('mousemove', showControls);
      window.removeEventListener('keydown', showControls);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, toggleNarration]);

  if (!currentEntry) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No entries to display
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      <MediaDisplay
        entry={currentEntry}
        isVideo={isVideo}
        isNarrationPlaying={isNarrationPlaying}
        onClick={toggleNarration}
      />

      {showTitles && isNarrationPlaying && currentEntry.title && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="bg-black/70 text-white px-6 py-3 text-2xl rounded">
            {currentEntry.title}
          </span>
        </div>
      )}

      <NarrationPlayer
        entryId={currentEntry.id}
        isPlaying={isNarrationPlaying}
        isVideo={isVideo}
        onEnded={() => {
          setIsNarrationPlaying(false);
          if (autoAdvanceDelay > 0) {
            goToNext();
          }
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
