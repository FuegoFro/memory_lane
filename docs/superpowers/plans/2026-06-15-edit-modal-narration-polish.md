# Edit Modal Narration Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the single-item edit modal by removing noise copy, fixing recording overflow, eliminating the duplicate transcript display, and making the transcript textarea clearly editable.

**Architecture:** All changes are presentational — no new API routes, no new state, no new props. Three source files are modified (`NarrationStudio.tsx`, `EntryEditor.tsx`) and one new file is created (`EntryEditor.module.css`). The CSS module introduces scoped styles with `@supports` progressive enhancement for `field-sizing: content`.

**Tech Stack:** React (Next.js App Router), Vitest + Testing Library (jsdom), CSS Modules

---

### Task 1: Remove "speak as though telling" prompt copy

**Files:**
- Modify: `src/components/editor/__tests__/NarrationStudio.test.tsx` (line 41–45)
- Modify: `src/components/editor/NarrationStudio.tsx` (line 242–263)

- [ ] **Step 1: Write a failing test**

In `NarrationStudio.test.tsx`, replace the existing test at line 41:

```tsx
it('renders the Record helper copy in noNarration state', () => {
  renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
  expect(screen.getByText(/speak as though telling a grandchild/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
});
```

With these two tests:

```tsx
it('renders a Record button in noNarration state', () => {
  renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
});

it('does not render prompt copy in noNarration state', () => {
  renderWithToast(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
  expect(screen.queryByText(/speak as though telling/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm the new test fails**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: `does not render prompt copy in noNarration state` FAILS — "Expected element not to be in the document."

- [ ] **Step 3: Remove the prompt and simplify the noNarration block**

In `NarrationStudio.tsx`, replace the entire `noNarration` block (lines 242–263):

```tsx
{/* noNarration */}
{narrationState === 'noNarration' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 16,
        color: 'var(--color-ink2)',
        lineHeight: 1.45,
      }}
    >
      Speak as though telling a grandchild — who, when, where, why it mattered.
    </p>
    <div>
      <Btn kind="accent" onClick={startRecording}>
        <Icon name="mic" size={14} stroke="var(--color-paper)" />
        Record
      </Btn>
    </div>
  </div>
)}
```

With:

```tsx
{/* noNarration */}
{narrationState === 'noNarration' && (
  <div>
    <Btn kind="accent" onClick={startRecording}>
      <Icon name="mic" size={14} stroke="var(--color-paper)" />
      Record
    </Btn>
  </div>
)}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NarrationStudio.tsx src/components/editor/__tests__/NarrationStudio.test.tsx
git commit -m "feat(editor): remove 'speak as though telling' prompt from noNarration state"
```

---

### Task 2: Fix recording waveform overflow

**Files:**
- Modify: `src/components/editor/NarrationStudio.tsx` — `Waveform` function (line 65–96) and recording state block (line 266–289)

This is a visual layout fix. The waveform bars (48 × 2px each) overflow the panel when the container is ~316px wide (right column width minus padding) because the bars' natural total width (~190px) plus the dot, timer, and Stop button exceed the available space. No new test is needed — existing tests cover the recording flow. We verify by confirming the test suite stays green.

- [ ] **Step 1: Confirm existing tests pass (regression baseline)**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 2: Add `minWidth: 0` and `overflow: 'hidden'` to the `Waveform` div**

In `NarrationStudio.tsx`, replace the `Waveform` function entirely:

```tsx
function Waveform() {
  const bars = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 28,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {bars.map((i) => {
        const h = 6 + ((Math.sin(i * 0.7) + 1) / 2) * 20 + (i % 5) * 1.2;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 2,
              height: `${h}px`,
              background: 'var(--color-accent)',
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add `overflow: 'hidden'` to the recording row container**

In `NarrationStudio.tsx`, find the recording state block and add `overflow: 'hidden'` to the row div:

```tsx
{/* recording */}
{narrationState === 'recording' && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
    <span
      className="rec-pulse"
      aria-hidden
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#c04a3a',
        flexShrink: 0,
      }}
    />
    <span style={{ ...monoLabel, color: 'var(--color-ink2)', fontSize: 12 }}>
      {formatDuration(recordingSeconds)}
    </span>
    <Waveform />
    <Btn kind="danger" onClick={stopRecording}>
      <Icon name="stop" size={12} stroke="var(--color-paper)" />
      Stop
    </Btn>
  </div>
)}
```

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NarrationStudio.tsx
git commit -m "fix(editor): prevent recording waveform from overflowing narration panel"
```

---

### Task 3: Remove transcript quote from inside the narration panel

**Files:**
- Modify: `src/components/editor/__tests__/NarrationStudio.test.tsx` (line 47–58)
- Modify: `src/components/editor/NarrationStudio.tsx` (line 341–354)

The transcript appears twice: as an italic `<p>` quote inside the narration panel, and as an editable `<textarea>` below it (rendered by `EntryEditor`). Remove the `<p>` quote.

- [ ] **Step 1: Write a failing test**

In `NarrationStudio.test.tsx`, replace the test at line 47:

```tsx
it('renders a player and transcript in hasNarration state', () => {
  renderWithToast(
    <NarrationStudio
      entry={makeEntry({ has_narration: 1, transcript: 'Every Sunday.' })}
      hasNarration
      onChange={() => {}}
    />
  );
  expect(screen.getByText(/Every Sunday\./)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /re-record/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
});
```

With:

```tsx
it('renders a player and re-record/remove buttons in hasNarration state', () => {
  renderWithToast(
    <NarrationStudio
      entry={makeEntry({ has_narration: 1, transcript: 'Every Sunday.' })}
      hasNarration
      onChange={() => {}}
    />
  );
  expect(screen.queryByText(/Every Sunday\./)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /re-record/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: The renamed test fails — "Every Sunday." IS currently in the document.

- [ ] **Step 3: Remove the transcript `<p>` from the `hasNarration` block**

In `NarrationStudio.tsx`, find the `hasNarration` block (around line 325). Remove this fragment entirely:

```tsx
{entry.transcript ? (
  <p
    style={{
      margin: 0,
      fontFamily: 'var(--font-news)',
      fontStyle: 'italic',
      fontSize: 16,
      color: 'var(--color-ink2)',
      lineHeight: 1.5,
    }}
  >
    &ldquo;{entry.transcript}&rdquo;
  </p>
) : null}
```

The `hasNarration` block after removal:

```tsx
{/* hasNarration */}
{narrationState === 'hasNarration' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {playerVisible && (
      <audio
        key={narrationKey}
        src={audioSrc}
        controls
        style={{ width: '100%' }}
        onError={() => setAudioError(true)}
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLAudioElement).duration;
          if (!isNaN(d) && isFinite(d)) setAudioDuration(d);
        }}
      />
    )}

    <div style={{ display: 'flex', gap: 8 }}>
      <Btn kind="ghost" onClick={handleReRecord}>
        <Icon name="rotate" size={12} />
        Re-record
      </Btn>
      <Btn kind="clear" onClick={handleRemove}>
        <Icon name="trash" size={12} />
        Remove
      </Btn>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NarrationStudio.tsx src/components/editor/__tests__/NarrationStudio.test.tsx
git commit -m "feat(editor): remove duplicate transcript quote from narration panel"
```

---

### Task 4: Remove "auto-transcribed" label; keep duration

**Files:**
- Modify: `src/components/editor/__tests__/NarrationStudio.test.tsx`
- Modify: `src/components/editor/NarrationStudio.tsx` (line 225–229)

- [ ] **Step 1: Write a failing test**

Add this test to the main `describe('NarrationStudio')` block in `NarrationStudio.test.tsx`:

```tsx
it('does not show "auto-transcribed" label in hasNarration state', () => {
  renderWithToast(
    <NarrationStudio
      entry={makeEntry({ has_narration: 1, transcript: 'hi' })}
      hasNarration
      onChange={() => {}}
    />
  );
  expect(screen.queryByText(/auto-transcribed/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: New test fails — "auto-transcribed" IS currently rendered.

- [ ] **Step 3: Update `headerRight` in `NarrationStudio.tsx`**

Replace (line 225–229):

```tsx
const headerRight =
  narrationState === 'hasNarration' && audioDuration !== null
    ? `${formatDuration(audioDuration)} · auto-transcribed`
    : narrationState === 'hasNarration'
    ? 'auto-transcribed'
    : null;
```

With:

```tsx
const headerRight =
  narrationState === 'hasNarration' && audioDuration !== null
    ? formatDuration(audioDuration)
    : null;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NarrationStudio.tsx src/components/editor/__tests__/NarrationStudio.test.tsx
git commit -m "feat(editor): remove 'auto-transcribed' label from narration header, keep duration"
```

---

### Task 5: Transcript textarea — CSS Module + font + border + flex layout

**Files:**
- Create: `src/components/editor/EntryEditor.module.css`
- Modify: `src/components/editor/EntryEditor.tsx` (line 261–292)
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

This introduces the first CSS Module in the codebase. Vitest returns identity-proxied CSS module objects by default (no config needed), so `styles.transcriptTextarea === 'transcriptTextarea'` in the test environment.

- [ ] **Step 1: Write a failing test**

Add this test inside the `'Redesign specifics (Task 23)'` describe block in `EntryEditor.test.tsx`:

```tsx
it('transcript textarea uses the CSS module class for styling', () => {
  const entry = { ...createImageEntry(), has_narration: 1 };
  renderEditor({ entry, hasNarration: true });

  const textarea = screen.getByLabelText(/transcript/i);
  expect(textarea.className).toMatch(/transcriptTextarea/);
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx --reporter=verbose
```

Expected: New test fails — the textarea currently has no `transcriptTextarea` class.

- [ ] **Step 3: Create `EntryEditor.module.css`**

Create `src/components/editor/EntryEditor.module.css`:

```css
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

- [ ] **Step 4: Update `EntryEditor.tsx`**

Add the CSS module import at the top of `EntryEditor.tsx`, after the existing imports:

```tsx
import styles from './EntryEditor.module.css';
```

Replace the entire transcript section (the `{hasNarration && (...)}` block, around lines 261–292):

```tsx
{/* Transcript Textarea */}
{hasNarration && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      Transcript
    </span>
    <textarea
      id="transcript"
      aria-label="Transcript"
      className={styles.transcriptTextarea}
      value={transcript}
      onChange={(e) => setTranscript(e.target.value)}
      onBlur={(e) => {
        const payload = { title, transcript: e.target.value, status };
        pendingSaveRef.current = payload;
        saveNow(payload);
      }}
      placeholder="Audio transcription will appear here…"
      style={{
        width: '100%',
        background: 'var(--color-paper)',
        border: '1px solid var(--color-rule)',
        borderRadius: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        lineHeight: 1.6,
        color: 'var(--color-ink2)',
        outline: 'none',
        padding: '9px 12px',
      }}
    />
  </div>
)}
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass. The new test matches because Vitest's CSS module proxy resolves `styles.transcriptTextarea` to the string `"transcriptTextarea"`.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/EntryEditor.module.css src/components/editor/EntryEditor.tsx src/components/editor/__tests__/EntryEditor.test.tsx
git commit -m "feat(editor): style transcript textarea — Inter Tight, border box, flex-fill layout via CSS Module"
```
