# Segmented Status Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the status `<select>` dropdown in the entry editor modal with a connected segmented pill control showing Staging → Active → Disabled.

**Architecture:** A new generic `SegmentedControl` component in `src/components/ui/` renders a horizontal button group with a filled highlight on the selected option. `EntryEditor` swaps its `<select>` for `<SegmentedControl>` — no change to autosave logic, API shape, or state management.

**Tech Stack:** React (client component), Tailwind CSS, Vitest + @testing-library/react

**Worktree:** `~/.config/superpowers/worktrees/memory-lane/segmented-status` (branch `feature/segmented-status-selector`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/SegmentedControl.tsx` | **Create** | Generic segmented control component |
| `src/components/ui/__tests__/SegmentedControl.test.tsx` | **Create** | Unit tests for the new component |
| `src/components/editor/EntryEditor.tsx` | **Modify** | Swap `<select>` → `<SegmentedControl>` |
| `src/components/editor/__tests__/EntryEditor.test.tsx` | **Modify** | Update 6 status-related tests |

---

## Task 1: SegmentedControl component

**Files:**
- Create: `src/components/ui/__tests__/SegmentedControl.test.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/SegmentedControl.test.tsx`:

```tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SegmentedControl } from '../SegmentedControl';

const options = [
  { value: 'staging', label: 'Staging' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
] as const;

type Status = 'staging' | 'active' | 'disabled';

describe('SegmentedControl', () => {
  it('renders all options as buttons', () => {
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Staging' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeInTheDocument();
  });

  it('marks the current value as pressed and others as not pressed', () => {
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Staging' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Disabled' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked option value', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl<Status> options={[...options]} value="active" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onChange).toHaveBeenCalledWith('disabled');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders as a labeled group when aria-labelledby is provided', () => {
    render(
      <div>
        <span id="my-label">Status</span>
        <SegmentedControl<Status>
          options={[...options]}
          value="staging"
          onChange={vi.fn()}
          aria-labelledby="my-label"
        />
      </div>
    );
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run from the worktree: `cd ~/.config/superpowers/worktrees/memory-lane/segmented-status && npx vitest run src/components/ui`

Expected: FAIL — `Cannot find module '../SegmentedControl'`

- [ ] **Step 3: Implement SegmentedControl**

Create `src/components/ui/SegmentedControl.tsx`:

```tsx
interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-labelledby'?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-labelledby': ariaLabelledBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      className="flex border border-gray-700 rounded-lg overflow-hidden"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={[
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            index > 0 ? 'border-l border-gray-700' : '',
            option.value === value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd ~/.config/superpowers/worktrees/memory-lane/segmented-status && npx vitest run src/components/ui`

Expected: 4 tests passing, 0 failing

- [ ] **Step 5: Commit**

```bash
cd ~/.config/superpowers/worktrees/memory-lane/segmented-status
git add src/components/ui/SegmentedControl.tsx src/components/ui/__tests__/SegmentedControl.test.tsx
git commit -m "feat: add SegmentedControl component"
```

---

## Task 2: Wire SegmentedControl into EntryEditor

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx` (lines 204–219, plus import)
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx` (6 tests in `Form fields` and 1 in `Autosave behavior`)

- [ ] **Step 1: Update the 7 affected tests in EntryEditor.test.tsx**

In `src/components/editor/__tests__/EntryEditor.test.tsx`, replace the following tests. All other tests remain unchanged.

**In the `Form fields` describe block**, replace these 6 tests:

```tsx
// REMOVE this test:
it('renders status dropdown with correct value for active entry', () => { ... });

// REPLACE WITH:
it('renders status control with active selected for active entry', () => {
  const entry = createImageEntry();
  render(<EntryEditor entry={entry} />);
  expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
});
```

```tsx
// REMOVE this test:
it('renders status dropdown with staging for entry without position', () => { ... });

// REPLACE WITH:
it('renders status control with staging selected for entry without position', () => {
  const entry = createVideoEntry();
  render(<EntryEditor entry={entry} />);
  expect(screen.getByRole('button', { name: 'Staging' })).toHaveAttribute('aria-pressed', 'true');
});
```

```tsx
// REMOVE this test:
it('renders status dropdown with disabled for disabled entry', () => { ... });

// REPLACE WITH:
it('renders status control with disabled selected for disabled entry', () => {
  const entry = createDisabledEntry();
  render(<EntryEditor entry={entry} />);
  expect(screen.getByRole('button', { name: 'Disabled' })).toHaveAttribute('aria-pressed', 'true');
});
```

```tsx
// REMOVE this test:
it('renders all status options in dropdown', () => { ... });

// REPLACE WITH:
it('renders all status options', () => {
  const entry = createImageEntry();
  render(<EntryEditor entry={entry} />);
  expect(screen.getByRole('button', { name: 'Staging' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Disabled' })).toBeInTheDocument();
});
```

```tsx
// REMOVE this test:
it('allows changing the status', () => { ... });

// REPLACE WITH:
it('allows changing the status', () => {
  const entry = createImageEntry();
  render(<EntryEditor entry={entry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
  expect(screen.getByRole('button', { name: 'Disabled' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'false');
});
```

**In the `Autosave behavior` describe block**, replace this test:

```tsx
// REMOVE this test:
it('saves all changed fields together', async () => {
  ...
  fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'disabled' } });
  ...
});

// REPLACE WITH:
it('saves all changed fields together', async () => {
  const entry = createImageEntry();
  render(<EntryEditor entry={entry} />);

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Updated Title' } });
  fireEvent.change(screen.getByLabelText(/transcript/i), { target: { value: 'Updated transcript' } });
  fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));

  await act(async () => {
    vi.advanceTimersByTime(1000);
  });

  expect(mockFetch).toHaveBeenCalledWith(`/api/edit/entries/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated Title', transcript: 'Updated transcript', status: 'disabled' }),
    keepalive: true,
  });
});
```

- [ ] **Step 2: Run updated tests to confirm they fail**

Run: `cd ~/.config/superpowers/worktrees/memory-lane/segmented-status && npx vitest run src/components/editor`

Expected: The 7 updated tests fail (control still renders a `<select>`), all other tests still pass.

- [ ] **Step 3: Update EntryEditor.tsx**

In `src/components/editor/EntryEditor.tsx`:

Add the import at the top (after existing imports):
```tsx
import { SegmentedControl } from '@/components/ui/SegmentedControl';
```

Replace the Status block (lines 204–219):

```tsx
{/* Status */}
<div>
  <label id="status-label" className="block text-sm font-medium text-gray-300 mb-1">
    Status
  </label>
  <SegmentedControl<EntryStatus>
    options={[
      { value: 'staging', label: 'Staging' },
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ]}
    value={status}
    onChange={setStatus}
    aria-labelledby="status-label"
  />
</div>
```

- [ ] **Step 4: Run all tests to confirm they pass**

Run: `cd ~/.config/superpowers/worktrees/memory-lane/segmented-status && npm run test:run`

Expected: All 308 tests passing (304 existing + 4 new SegmentedControl tests), 0 failing.

- [ ] **Step 5: Commit**

```bash
cd ~/.config/superpowers/worktrees/memory-lane/segmented-status
git add src/components/editor/EntryEditor.tsx src/components/editor/__tests__/EntryEditor.test.tsx
git commit -m "feat: replace status dropdown with segmented pill control"
```
