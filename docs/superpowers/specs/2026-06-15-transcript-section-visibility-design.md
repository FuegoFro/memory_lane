# Transcript Section Visibility Design

**Date:** 2026-06-15  
**Status:** Approved

## Problem

The transcript textarea in `EntryEditor` is gated on `{hasNarration && ...}`. This correctly hides it when no narration exists, but during a **re-record** flow the old transcript remains visible while the narration state machine is in `'recording'`, `'uploading'`, or `'transcribing'` — because `hasNarration` stays `true` and the old transcript text is still in state.

The transcript section should only appear when narration is fully settled with a completed transcript.

## Design

**Separate state callback from data callback.**

`NarrationStudio` already has an internal `narrationState` enum:
```
'noNarration' | 'hasNarration' | 'recording' | 'uploading' | 'transcribing'
```

Add an `onNarrationStateChange?: (state: NarrationState) => void` prop alongside the existing `onChange` (which remains data-only: `transcript`, `has_narration`). A `useEffect` inside `NarrationStudio` fires `onNarrationStateChange` whenever `narrationState` changes.

Export `NarrationState` type from `NarrationStudio` so `EntryEditor` can import it.

In `EntryEditor`, store the received state in local state (defaulting to the correct initial value derived from `initialHasNarration`). Update the gate:

```tsx
{localNarrationState === 'hasNarration' && transcript && (
  /* transcript textarea */
)}
```

This reads clearly and covers all cases:
- No narration → `localNarrationState === 'noNarration'` → hidden ✓
- Recording / uploading / transcribing → state is not `'hasNarration'` → hidden ✓
- Re-record transcribing → same, old transcript hidden ✓
- Completed narration with text → `'hasNarration'` + `transcript` truthy → shown ✓
- Completed narration with empty transcript → hidden (no section to show) ✓

## Files Changed

- `src/components/editor/NarrationStudio.tsx` — export `NarrationState`, add `onNarrationStateChange` prop, add `useEffect` to emit on state changes
- `src/components/editor/EntryEditor.tsx` — import `NarrationState`, add `onNarrationStateChange` handler, track state in `useState`, update gate condition
- `src/components/editor/__tests__/EntryEditor.test.tsx` — update/add tests for visibility conditions
- `src/components/editor/__tests__/NarrationStudio.test.tsx` — add test that `onNarrationStateChange` fires on transitions
