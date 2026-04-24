# Viewer Play Button Visibility & Auto-Advance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the viewer play button when no narration is available and fix auto-advance pausing logic.

**Architecture:** Update the viewer components to respect the `has_narration` field from the database and ensure the `isNarrationPlaying` state is only active when media is actually present.

**Tech Stack:** Next.js (React), TypeScript, Vitest.

---

### Task 1: Update ViewerControls to support conditional Play button

**Files:**
- Modify: `src/components/viewer/ViewerControls.tsx`
- Test: `src/components/viewer/__tests__/ViewerControls.test.tsx` (create if missing)

- [ ] **Step 1: Create or update tests for ViewerControls**

```tsx
import { render, screen } from '@testing-library/react';
import { ViewerControls } from '../ViewerControls';
import { vi, describe, it, expect } from 'vitest';

describe('ViewerControls', () => {
  const defaultProps = {
    visible: true,
    currentIndex: 0,
    totalEntries: 10,
    autoAdvanceDelay: 5,
    showTitles: true,
    isNarrationPlaying: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToggleNarration: vi.fn(),
    onToggleAutoAdvance: vi.fn(),
    onToggleTitles: vi.fn(),
    canPlay: true,
  };

  it('renders play button when canPlay is true', () => {
    render(<ViewerControls {...defaultProps} />);
    expect(screen.getByLabelText(/Play narration/i)).toBeDefined();
  });

  it('hides play button when canPlay is false', () => {
    render(<ViewerControls {...defaultProps} canPlay={false} />);
    expect(screen.queryByLabelText(/Play narration/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/viewer/__tests__/ViewerControls.test.tsx`
Expected: FAIL (canPlay prop missing/not used)

- [ ] **Step 3: Update ViewerControls implementation**

```tsx
interface ViewerControlsProps {
  // ... existing props
  canPlay: boolean;
}

export function ViewerControls({
  // ... existing props
  canPlay,
}: ViewerControlsProps) {
  // ...
  {canPlay && (
    <button
      aria-label={isNarrationPlaying ? 'Pause narration' : 'Play narration'}
      onClick={onToggleNarration}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'var(--color-paper)',
        color: 'var(--color-ink)',
        display: 'grid',
        placeItems: 'center',
        border: 0,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(26,12,4,0.4)',
      }}
    >
      <Icon name={isNarrationPlaying ? 'pause' : 'play'} size={14} stroke="var(--color-ink)" />
    </button>
  )}
  // ...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/viewer/__tests__/ViewerControls.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/viewer/ViewerControls.tsx
git commit -m "feat: conditionally render play button in ViewerControls"
```

---

### Task 2: Update Slideshow to compute canPlay and guard shortcuts

**Files:**
- Modify: `src/components/viewer/Slideshow.tsx`
- Test: `src/components/viewer/__tests__/Slideshow.test.tsx`

- [ ] **Step 1: Write failing test in Slideshow.test.tsx**

```tsx
it('does not toggle narration when canPlay is false', () => {
  const entries = [{ id: '1', dropbox_path: 'test.jpg', has_narration: 0 }];
  // Mock components or test logic to verify toggleNarration isn't called or state doesn't change
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/viewer/__tests__/Slideshow.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update Slideshow implementation**

```tsx
// Inside Slideshow component
const isVideo = currentEntry ? isVideoFile(currentEntry.dropbox_path) : false;
const canPlay = currentEntry ? (!!currentEntry.has_narration || isVideo) : false;

const toggleNarration = useCallback(() => {
  if (!canPlay) return;
  setIsNarrationPlaying((p) => !p);
}, [canPlay]);

// Ensure isNarrationPlaying is reset when entry changes and cannot play
useEffect(() => {
  if (!canPlay && isNarrationPlaying) {
    setIsNarrationPlaying(false);
  }
}, [currentIndex, canPlay, isNarrationPlaying]);

// Pass canPlay to ViewerControls
<ViewerControls
  // ...
  canPlay={canPlay}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/viewer/__tests__/Slideshow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/viewer/Slideshow.tsx
git commit -m "feat: guard narration toggle and reset state in Slideshow"
```

---

### Task 3: Improve NarrationPlayer reset logic

**Files:**
- Modify: `src/components/viewer/NarrationPlayer.tsx`

- [ ] **Step 1: Update NarrationPlayer to accept hasNarration prop**

```tsx
interface NarrationPlayerProps {
  // ...
  initialHasNarration: boolean;
}

export function NarrationPlayer({
  // ...
  initialHasNarration,
}: NarrationPlayerProps) {
  const [hasNarration, setHasNarration] = useState(initialHasNarration);

  useEffect(() => {
    setHasNarration(initialHasNarration);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [entryId, initialHasNarration]);
  // ...
}
```

- [ ] **Step 2: Update Slideshow to pass has_narration to NarrationPlayer**

```tsx
<NarrationPlayer
  entryId={currentEntry.id}
  isPlaying={isNarrationPlaying}
  isVideo={isVideo}
  initialHasNarration={!!currentEntry.has_narration}
  onEnded={...}
/>
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/viewer/NarrationPlayer.tsx src/components/viewer/Slideshow.tsx
git commit -m "fix: improve NarrationPlayer reset logic with prop-based state"
```
