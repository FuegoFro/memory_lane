# Spec: Viewer Image Transition — Eliminate Black-Screen Flash

## Background

Navigation between entries in the viewer (`Slideshow.tsx`) produced a brief black-screen flash. The root cause was `key={currentEntry.id}` on `<MediaDisplay>`, which was added in commit `fc430c7` to synchronize the caption with image load: when the entry changed, the old `<img>` was unmounted immediately and the dark background (`#0d0805`) showed through until the new image loaded.

## Success Criteria

- No visible black flash when advancing by one entry (the common case: manual or auto-advance).
- Large jumps (skip N entries) remain instantaneous — no added delay.
- Large jumps may still flash briefly; that is acceptable.
- Caption synchronization with image load is preserved.

## Approach Considered

**Option A — Preload only (keep `key`):** Preload adjacent images so the browser serves from cache near-instantly after remount. Rejected: there is still a technical flash window between unmount and cache-served load.

**Option B — Drop `key`, preload neighbors (chosen):** Remove `key={currentEntry.id}` from `<MediaDisplay>`. React reuses the same `<img>` DOM node and updates `src` in place. The browser keeps the old image painted until the new `src` fires `onLoad`. For sequential advance, the next image is already in the browser cache (preloaded), so the swap is near-instantaneous. For large jumps the old image stays briefly visible — better than a black flash and adds no delay.

**Option C — Dual-layer crossfade:** Maintain two image slots; load incoming invisibly and swap when ready. Rejected: more complex state management than Option B, with no benefit for the stated use cases.

## Design

### Remove `key` from `<MediaDisplay>`

`Slideshow.tsx` renders `<MediaDisplay entry={currentEntry} ...>` without a `key` prop. React reuses the same component instance when `currentEntry` changes; the `<img>` DOM node stays in place with its old pixel content until the new `src` loads.

Caption synchronization is unaffected: `isImageLoaded` is still reset to `false` in `goToNext`/`goToPrev` and set to `true` when `onLoad` fires on the updated `src`.

### Preload Adjacent Images

A `useEffect` keyed on `[currentIndex, entries]` creates `new Image()` for the next and previous entries (skipping videos) and sets `src`. This primes the browser cache so that sequential advances load from cache — making the `src` swap effectively instantaneous.

```
useEffect(() => {
  const indices = [
    (currentIndex + 1) % entries.length,
    (currentIndex - 1 + entries.length) % entries.length,
  ];
  for (const i of indices) {
    const entry = entries[i];
    if (entry && !isVideoFile(entry.dropbox_path)) {
      const img = new Image();
      img.src = `/api/media/${entry.id}`;
    }
  }
}, [currentIndex, entries]);
```

### `NarrationPlayer` key unchanged

`<NarrationPlayer key={currentEntry.id} ...>` retains its key — it needs a full reset (audio teardown) on every entry change.
