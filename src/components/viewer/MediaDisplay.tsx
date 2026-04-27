'use client';

import { useRef, useEffect } from 'react';
import { Entry } from '@/types';

interface MediaDisplayProps {
  entry: Entry;
  isVideo: boolean;
  isNarrationPlaying: boolean;
  onClick: () => void;
  onLoad?: () => void;
}

export function MediaDisplay({
  entry,
  isVideo,
  isNarrationPlaying,
  onClick,
  onLoad,
}: MediaDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isNarrationPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isNarrationPlaying]);

  const mediaUrl = `/api/media/${entry.id}`;

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={mediaUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={onClick}
        onLoadedData={onLoad}
        muted // Audio handled separately by NarrationPlayer
        playsInline
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl}
      alt={entry.title || 'Slideshow image'}
      className="w-full h-full object-contain cursor-pointer"
      onClick={onClick}
      onLoad={onLoad}
    />
  );
}
