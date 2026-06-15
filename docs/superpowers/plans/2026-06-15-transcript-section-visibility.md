# Transcript Section Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the transcript textarea in `EntryEditor` whenever `NarrationStudio` is in any active state (`recording`, `uploading`, `transcribing`) or when there is no transcript text — only show it when narration is fully settled with a completed transcript.

**Architecture:** Export `NarrationState` from `NarrationStudio` and add an `onNarrationStateChange` prop (separate from `onChange`, which stays data-only). `NarrationStudio` fires it via `useEffect` on every state transition. `EntryEditor` tracks the phase in local state and gates the transcript section on `narrationPhase === 'hasNarration' && transcript`.

**Tech Stack:** React (useState, useEffect), TypeScript, Vitest + @testing-library/react

---

### Task 1: Export `NarrationState` and add `onNarrationStateChange` prop to `NarrationStudio`

**Files:**
- Modify: `src/components/editor/NarrationStudio.tsx`
- Test: `src/components/editor/__tests__/NarrationStudio.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these two tests inside the top-level `describe('NarrationStudio', ...)` block in `NarrationStudio.test.tsx`, before the `describe('Remove narration', ...)` block:

```tsx
it('calls onNarrationStateChange with hasNarration on mount when hasNarration=true', () => {
  const onStateChange = vi.fn();
  renderWithToast(
    <NarrationStudio
      entry={makeEntry({ has_narration: 1 })}
      hasNarration
      onChange={() => {}}
      onNarrationStateChange={onStateChange}
    />
  );
  expect(onStateChange).toHaveBeenCalledWith('hasNarration');
});

it('calls onNarrationStateChange with noNarration on mount when hasNarration=false', () => {
  const onStateChange = vi.fn();
  renderWithToast(
    <NarrationStudio
      entry={makeEntry()}
      hasNarration={false}
      onChange={() => {}}
      onNarrationStateChange={onStateChange}
    />
  );
  expect(onStateChange).toHaveBeenCalledWith('noNarration');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- NarrationStudio
```

Expected: Both new tests FAIL with something like "onNarrationStateChange is not a function" or "Expected mock to have been called".

- [ ] **Step 3: Implement the changes**

In `src/components/editor/NarrationStudio.tsx`:

**3a.** Change the `NarrationState` type declaration from `type` to `export type`:

```ts
// Before:
type NarrationState =
  | 'noNarration'
  | 'hasNarration'
  | 'recording'
  | 'uploading'
  | 'transcribing';

// After:
export type NarrationState =
  | 'noNarration'
  | 'hasNarration'
  | 'recording'
  | 'uploading'
  | 'transcribing';
```

**3b.** Add `onNarrationStateChange` to the props interface:

```ts
// Before:
interface NarrationStudioProps {
  entry: Entry;
  hasNarration: boolean;
  onChange: (patch: NarrationStudioChange) => void;
}

// After:
interface NarrationStudioProps {
  entry: Entry;
  hasNarration: boolean;
  onChange: (patch: NarrationStudioChange) => void;
  onNarrationStateChange?: (state: NarrationState) => void;
}
```

**3c.** Destructure the new prop in the component signature:

```ts
// Before:
export function NarrationStudio({ entry, hasNarration, onChange }: NarrationStudioProps) {

// After:
export function NarrationStudio({ entry, hasNarration, onChange, onNarrationStateChange }: NarrationStudioProps) {
```

**3d.** Add a `useEffect` after the existing effects (after the recording timer effect, around line 131) to fire `onNarrationStateChange` whenever `narrationState` changes:

```ts
useEffect(() => {
  onNarrationStateChange?.(narrationState);
}, [narrationState, onNarrationStateChange]);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- NarrationStudio
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NarrationStudio.tsx src/components/editor/__tests__/NarrationStudio.test.tsx
git commit -m "feat(narration): export NarrationState, add onNarrationStateChange prop"
```

---

### Task 2: Update `EntryEditor` to track narration phase and gate transcript section

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx`
- Test: `src/components/editor/__tests__/EntryEditor.test.tsx`

- [ ] **Step 1: Write new failing tests and update the one that changes behavior**

**1a.** Add this new `describe` block to `EntryEditor.test.tsx`, after the existing `describe('Narration section', ...)` block:

```tsx
describe('Transcript section visibility', () => {
  it('shows transcript section when narration is settled and transcript is non-empty', () => {
    const entry = { ...createImageEntry(), has_narration: 1 };
    renderEditor({ entry, hasNarration: true });
    expect(screen.getByLabelText(/transcript/i)).toBeInTheDocument();
  });

  it('hides transcript section when hasNarration is false', () => {
    renderEditor({ entry: createImageEntry(), hasNarration: false });
    expect(screen.queryByLabelText(/transcript/i)).not.toBeInTheDocument();
  });

  it('hides transcript section when narration exists but transcript text is empty', () => {
    const entry = { ...createVideoEntry(), has_narration: 1 }; // transcript: null
    renderEditor({ entry, hasNarration: true });
    expect(screen.queryByLabelText(/transcript/i)).not.toBeInTheDocument();
  });
});
```

**1b.** Update the existing test `renders transcript textarea with empty string when transcript is null` (in the `describe('Form fields', ...)` block, around line 254) to match the new behavior. Replace it:

```tsx
// Before:
it('renders transcript textarea with empty string when transcript is null', () => {
  const entry = createVideoEntry();
  renderEditor({ entry, hasNarration: true });

  const transcriptTextarea = screen.getByLabelText(/transcript/i);
  expect(transcriptTextarea).toHaveValue('');
});

// After:
it('hides transcript section when transcript is null even if hasNarration is true', () => {
  const entry = createVideoEntry(); // transcript: null
  renderEditor({ entry, hasNarration: true });

  expect(screen.queryByLabelText(/transcript/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- EntryEditor
```

Expected: The three new tests in `Transcript section visibility` and the updated test in `Form fields` FAIL (textarea is currently shown when it should be hidden, and vice versa).

- [ ] **Step 3: Implement the changes in `EntryEditor.tsx`**

**3a.** Update the import of `NarrationStudio` to also import `NarrationState`:

```ts
// Before:
import { NarrationStudio, NarrationStudioChange } from './NarrationStudio';

// After:
import { NarrationStudio, NarrationStudioChange, NarrationState } from './NarrationStudio';
```

**3b.** Add `narrationPhase` state after the existing `useState` declarations (around line 35, after `const [hasNarration, setHasNarration] = useState...`):

```ts
const [narrationPhase, setNarrationPhase] = useState<NarrationState>(
  initialHasNarration ? 'hasNarration' : 'noNarration'
);
```

**3c.** Add `onNarrationStateChange={setNarrationPhase}` to the `<NarrationStudio>` JSX (around line 254):

```tsx
// Before:
<NarrationStudio
  key={entry.id}
  entry={narrationEntry}
  hasNarration={hasNarration}
  onChange={handleNarrationChange}
/>

// After:
<NarrationStudio
  key={entry.id}
  entry={narrationEntry}
  hasNarration={hasNarration}
  onChange={handleNarrationChange}
  onNarrationStateChange={setNarrationPhase}
/>
```

**3d.** Update the transcript section gate condition (around line 262):

```tsx
// Before:
{hasNarration && (

// After:
{narrationPhase === 'hasNarration' && transcript && (
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS. Pay attention to any test in `EntryEditor.test.tsx` or `NarrationStudio.test.tsx` that touches the transcript textarea — they should all pass with the updated logic.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EntryEditor.tsx src/components/editor/__tests__/EntryEditor.test.tsx
git commit -m "feat(editor): hide transcript section during recording/transcribing and when empty"
```
