# Edit Modal Narration Polish — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

## Overview

Four targeted polish changes to the single-item edit modal (`EntryEditor` + `NarrationStudio`), covering copy, layout overflow, duplicate content, and transcript field clarity.

---

## 1. Remove prompt copy from unrecorded state

**File:** `src/components/editor/NarrationStudio.tsx`

In the `noNarration` state, remove the `<p>` element containing "Speak as though telling a grandchild — who, when, where, why it mattered." The Record button is sufficient; the instructional copy is unnecessary noise.

**Before:**
```jsx
{narrationState === 'noNarration' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <p style={{ ... }}>Speak as though telling a grandchild…</p>
    <div><Btn kind="accent" onClick={startRecording}>…</Btn></div>
  </div>
)}
```

**After:** Remove the `<p>` block. The outer `<div>` and `<Btn>` remain.

---

## 2. Fix recording-state overflow

**File:** `src/components/editor/NarrationStudio.tsx`

The recording row (`red dot + timer + Waveform + Stop button`) overflows the narration panel and modal edge. The root cause: the Waveform flex container doesn't shrink below its natural content width (48 bars × 4px each ≈ 190px), and the row container doesn't clip overflow.

**Fix:**
- Add `overflow: 'hidden'` to the recording row `<div>`.
- Add `minWidth: 0` to the `<div>` inside `Waveform` (the flex container holding the bars) so flex can shrink it.

---

## 3. Remove transcript quote from narration panel

**File:** `src/components/editor/NarrationStudio.tsx`

In the `hasNarration` state, the transcript appears twice: once as a styled italic quote inside the narration panel, and once as an editable textarea below it (rendered by `EntryEditor`). Remove the `<p>` quote from inside the panel.

**Remove:**
```jsx
{entry.transcript ? (
  <p style={{ fontFamily: 'var(--font-news)', fontStyle: 'italic', … }}>
    &ldquo;{entry.transcript}&rdquo;
  </p>
) : null}
```

---

## 4. Remove "auto-transcribed" label; keep duration

**File:** `src/components/editor/NarrationStudio.tsx`

The narration panel header currently shows `"1:23 · auto-transcribed"`. Remove the "auto-transcribed" text; keep the duration.

**Before:**
```js
const headerRight =
  narrationState === 'hasNarration' && audioDuration !== null
    ? `${formatDuration(audioDuration)} · auto-transcribed`
    : narrationState === 'hasNarration'
    ? 'auto-transcribed'
    : null;
```

**After:**
```js
const headerRight =
  narrationState === 'hasNarration' && audioDuration !== null
    ? formatDuration(audioDuration)
    : null;
```

---

## 5. Transcript textarea — font, border, and layout

### 5a. Styling

**File:** `src/components/editor/EntryEditor.tsx`

Replace the current transcript textarea styles:

| Property | Before | After |
|---|---|---|
| `fontFamily` | `var(--font-news)` | `var(--font-sans)` |
| `fontStyle` | `italic` | *(remove)* |
| `background` | `transparent` | `var(--color-paper)` |
| `border` | `0` | `1px solid var(--color-rule)` |
| `borderRadius` | *(none)* | `6px` |
| `padding` | *(none)* | `9px 12px` |
| `minHeight` | `120px` | *(removed — handled by CSS class)* |
| `resize` | *(unset)* | *(handled by CSS class)* |
| `outline` | `none` | `none` |

Add `className={styles.transcriptTextarea}` to the `<textarea>` element, importing the module at the top of the file:

```ts
import styles from './EntryEditor.module.css';
```

### 5b. Layout

**File:** `src/components/editor/EntryEditor.tsx`

Make the transcript section fill remaining modal height:

```jsx
{/* Transcript section container */}
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: 1,
  minHeight: 0,
}}>
  <span style={…}>Transcript</span>
  <textarea className={styles.transcriptTextarea} … />
</div>
```

### 5c. CSS Module

**File:** `src/components/editor/EntryEditor.module.css` *(new file)*

```css
/* Transcript textarea — auto-grow with modal-height cap */
.transcriptTextarea {
  flex: 1;
  min-height: 52px;
  resize: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-rule2) transparent;
}

.transcriptTextarea::-webkit-scrollbar { width: 6px; }
.transcriptTextarea::-webkit-scrollbar-track { background: transparent; }
.transcriptTextarea::-webkit-scrollbar-thumb {
  background: var(--color-rule2);
  border-radius: 3px;
}

@supports (field-sizing: content) {
  .transcriptTextarea {
    flex: none;
    field-sizing: content;
    max-height: 100%;
  }
}
```

This is the first CSS Module in the codebase, introduced here because the styles are specific to `EntryEditor` and carry no semantic value at global scope.

**Behavior:**
- Browsers without `field-sizing` support: textarea fills all remaining modal height; scrolls if content overflows.
- Browsers with `field-sizing` support (Chrome 123+, Safari 17.5+): textarea grows with content; caps at the modal column's remaining height; scrolls beyond that.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/editor/NarrationStudio.tsx` | Items 1, 2, 3, 4 |
| `src/components/editor/EntryEditor.tsx` | Item 5a, 5b |
| `src/components/editor/EntryEditor.module.css` | Item 5c (new file) |

## Tests

Existing tests in `src/components/editor/__tests__/NarrationStudio.test.tsx` and `EntryEditor.test.tsx` cover the component logic. No new behaviour is introduced — these are presentational changes. Verify tests still pass after each file change.
