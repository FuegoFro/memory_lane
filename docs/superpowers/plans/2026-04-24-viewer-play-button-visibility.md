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

- [x] **Step 1: Create or update tests for ViewerControls**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Update ViewerControls implementation**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit**

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
