# Narration Loading States Design

## Overview

Replace the separate `recording` and `transcribing` boolean state variables (and the `hasNarration` boolean) in `EntryEditor` with a single unified enum that encodes all mutually-exclusive narration states. This makes invalid state combinations impossible and drives button disabled/label logic directly from a single source of truth.

## State Model

Replace:
```ts
const [recording, setRecording] = useState(false);
const [transcribing, setTranscribing] = useState(false);
const [hasNarration, setHasNarration] = useState(initialHasNarration);
```

With:
```ts
type NarrationState = 'noNarration' | 'hasNarration' | 'recording' | 'uploading' | 'transcribing';
const [narrationState, setNarrationState] = useState<NarrationState>(
  initialHasNarration ? 'hasNarration' : 'noNarration'
);
```

## State Transitions

| Trigger | From | To |
|---|---|---|
| `startRecording()` | any | `'recording'` |
| `stopRecording()` | `'recording'` | `'uploading'` |
| upload completes | `'uploading'` | `'transcribing'` |
| transcription completes | `'transcribing'` | `'hasNarration'` |
| `handleDeleteNarration()` completes | `'hasNarration'` | `'noNarration'` |
| `handleRetryTranscription()` called | `'hasNarration'` | `'transcribing'` |
| retry transcription completes | `'transcribing'` | `'hasNarration'` |

## Button Behavior

| State | Record button | Delete button | Retry button |
|---|---|---|---|
| `noNarration` | "Record" — enabled | disabled | disabled |
| `hasNarration` | "Record" — enabled | enabled | enabled |
| `recording` | "Stop Recording" — enabled | disabled | disabled |
| `uploading` | "Uploading…" — disabled | disabled | disabled |
| `transcribing` | disabled | disabled | "Transcribing…" — disabled |

- The Record button is styled red when in `'recording'` state, blue otherwise.
- Disabled buttons use the existing `bg-gray-600 text-gray-400 cursor-not-allowed` style.

## Audio Player Visibility

The `<audio>` player is shown when `narrationState === 'hasNarration' || narrationState === 'transcribing'`. Narration exists on the server in both of these states.

## Affected File

- `src/components/editor/EntryEditor.tsx` — only file changed

## Testing

Update `src/components/editor/__tests__/EntryEditor.test.tsx` to cover:
- Delete and Retry buttons are disabled when no narration exists
- All buttons disabled during uploading state
- Record button disabled during transcribing state
- Correct label shown during each busy state
