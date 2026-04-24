# Spec: Viewer Play Button Visibility & Auto-Advance Logic

## Background
The Play button in the viewer currently shows up for all entries regardless of whether they have narration. Additionally, clicking the media or pressing Space/Enter toggles a state that pauses auto-advance, even if no narration exists, leading to user confusion about why the slideshow stopped.

## Success Criteria
- The Play/Pause button in `ViewerControls` is hidden for photos without narration.
- The Play/Pause button is always visible for videos (since it controls video playback).
- Space/Enter/Click shortcuts are disabled for photos without narration.
- Auto-advance only pauses when narration or video is actually playing.
- Narration state is correctly reset when navigating between entries.

## Design

### 1. Visibility Logic
In `Slideshow.tsx`, we will determine if the current entry can play media.
- `canPlay = entry.has_narration || isVideoFile(entry.dropbox_path)`
- This `canPlay` flag will be passed to `ViewerControls`.

### 2. UI Changes (`ViewerControls.tsx`)
- Wrap the Play/Pause button in a conditional: `{canPlay && (...) }`.
- Ensure the layout remains balanced when the button is hidden (the button is currently on the left of a flexible spacer).

### 3. Shortcut Handling (`Slideshow.tsx`)
- In the `keydown` and `MediaDisplay.onClick` handlers, only call `toggleNarration()` if `canPlay` is true.

### 4. Auto-Advance Logic
- Currently, auto-advance is disabled if `isNarrationPlaying` is true.
- We should ensure `isNarrationPlaying` is always forced to `false` when moving to an entry that cannot play.

### 5. Narration Player Reset (`NarrationPlayer.tsx`)
- Ensure that `hasNarration` state is properly reset when `entryId` changes. Currently it defaults to `true` and only flips to `false` on error. We should ideally use the `has_narration` prop from the entry to initialize or reset this state more reliably.

## Technical Tasks
1. Update `Entry` type usage to leverage `has_narration` field.
2. Modify `Slideshow.tsx` to compute `canPlay`.
3. Update `ViewerControls.tsx` to accept `canPlay` and conditionally render the play button.
4. Update `Slideshow.tsx` to guard `toggleNarration` calls.
5. Verify auto-advance behavior across different entry types.
