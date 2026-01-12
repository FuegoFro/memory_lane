'use client';

interface ViewerControlsProps {
  visible: boolean;
  currentIndex: number;
  totalEntries: number;
  autoAdvanceDelay: number;
  showTitles: boolean;
  isNarrationPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleNarration: () => void;
  onToggleAutoAdvance: () => void;
  onToggleTitles: () => void;
}

export function ViewerControls({
  visible,
  currentIndex,
  totalEntries,
  autoAdvanceDelay,
  showTitles,
  isNarrationPlaying,
  onPrev,
  onNext,
  onToggleNarration,
  onToggleAutoAdvance,
  onToggleTitles,
}: ViewerControlsProps) {
  return (
    <div
      className={`absolute inset-x-0 top-0 p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex justify-between items-center">
        {/* Left: Position indicator */}
        <div className="text-white bg-black/50 px-3 py-1 rounded">
          {currentIndex + 1} / {totalEntries}
        </div>

        {/* Right: Control buttons */}
        <div className="flex gap-2">
          <button
            onClick={onToggleNarration}
            className={`px-3 py-1 rounded text-white ${
              isNarrationPlaying ? 'bg-blue-600' : 'bg-black/50'
            }`}
            title="Space/Enter: Play/pause narration"
          >
            {isNarrationPlaying ? 'Pause' : 'Play'} Narration
          </button>

          <button
            onClick={onToggleAutoAdvance}
            className={`px-3 py-1 rounded text-white ${
              autoAdvanceDelay > 0 ? 'bg-green-600' : 'bg-black/50'
            }`}
            title="A: Toggle auto-advance"
          >
            Auto: {autoAdvanceDelay > 0 ? `${autoAdvanceDelay}s` : 'Off'}
          </button>

          <button
            onClick={onToggleTitles}
            className={`px-3 py-1 rounded text-white ${
              showTitles ? 'bg-purple-600' : 'bg-black/50'
            }`}
            title="T: Toggle titles"
          >
            Titles: {showTitles ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70"
        title="← Previous"
      >
        &#9664;
      </button>

      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70"
        title="→ Next"
      >
        &#9654;
      </button>
    </div>
  );
}
