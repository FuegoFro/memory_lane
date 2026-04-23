# Refactor Editor Layout and Masthead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Editor layout to remove legacy navigation, consolidate the UI into the Masthead, and update the home page empty state.

**Architecture:** Move logout logic from the layout to the `EntryGrid` and `EditorMasthead`. Simplify `EditLayout`. Redesign `HomePage` empty state using project design tokens.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Project UI components (`Btn`, `Icon`).

---

### Task 1: Refactor Editor Layout

**Files:**
- Modify: `src/app/edit/layout.tsx`

- [ ] **Step 1: Simplify layout and update background**
    - Remove `<nav>` and its contents.
    - Change `bg-gray-900` to `bg-[var(--color-paper)]`.
    - Remove unused imports (`Link`, `useRouter`).

```tsx
'use client';

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/edit/layout.tsx
git commit -m "refactor: simplify editor layout and update background"
```

### Task 2: Update Editor Masthead

**Files:**
- Modify: `src/components/editor/EditorMasthead.tsx`

- [ ] **Step 1: Add onLogout prop and Logout button**
    - Update `EditorMastheadProps` interface.
    - Add Logout button with `kind="clear"`.

```tsx
'use client';

import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';

interface EditorMastheadProps {
  tagline?: string;
  syncing: boolean;
  canPlay: boolean;
  onSync: () => void;
  onPlay: () => void;
  onLogout: () => void;
}

export function EditorMasthead({ tagline, syncing, canPlay, onSync, onPlay, onLogout }: EditorMastheadProps) {
  return (
    <header
      style={{
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'baseline',
        gap: 20,
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          Memory Lane
        </h1>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink3)',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {tagline ?? 'Editing'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <Btn kind="clear" onClick={onLogout} style={{ color: 'var(--color-ink3)' }}>
        Logout
      </Btn>
      <Btn kind="ghost" onClick={onSync} disabled={syncing}>
        <Icon name="sync" size={12} /> {syncing ? 'Syncing…' : 'Sync from Dropbox'}
      </Btn>
      <Btn kind="primary" onClick={onPlay} disabled={!canPlay}>
        <Icon name="play" size={11} stroke="var(--color-paper)" /> Play slideshow
      </Btn>
    </header>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/editor/EditorMasthead.tsx
git commit -m "feat: add logout button to EditorMasthead"
```

### Task 3: Update EntryGrid to handle Logout

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

- [ ] **Step 1: Implement handleLogout and pass to Masthead**
    - Add `handleLogout` function.
    - Update `EditorMasthead` invocation.

```tsx
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // ... inside return
      <EditorMasthead
        syncing={syncing}
        canPlay={active.length > 0}
        onSync={handleSync}
        onPlay={() => router.push('/')}
        onLogout={handleLogout}
      />
```

- [ ] **Step 2: Commit**
```bash
git add src/components/editor/EntryGrid.tsx
git commit -m "feat: implement logout in EntryGrid"
```

### Task 4: Redesign HomePage Empty State

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Redesign empty state**
    - Use `var(--color-paper)` background.
    - Use `font-serif` for title.
    - Use `Btn` for "Go to Editor" link.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Slideshow } from '@/components/viewer';
import { getActiveEntries } from '@/lib/entries';
import { getViewerSettings } from '@/lib/settings';
import { Btn } from '@/components/ui/Btn';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const entries = getActiveEntries();
  const settings = getViewerSettings();

  if (entries.length === 0) {
    return (
      <div 
        className="h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}
      >
        <h1 
          className="text-4xl mb-4"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
        >
          Memory Lane
        </h1>
        <p 
          className="mb-8"
          style={{ color: 'var(--color-ink3)', fontFamily: 'var(--font-news)', fontStyle: 'italic' }}
        >
          No memories yet. Add some photos to get started!
        </p>
        <Btn
          kind="primary"
          onClick={() => router.push('/edit')}
        >
          Go to Editor
        </Btn>
      </div>
    );
  }

  return (
    <Slideshow
      entries={entries}
      initialAutoAdvance={settings.autoAdvanceDelay}
      initialShowTitles={settings.showTitles}
    />
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/page.tsx
git commit -m "style: redesign home page empty state"
```

### Task 5: Verification

- [ ] **Step 1: Verify Editor UI**
    - Use `agent-browser` to check `/edit` page.
    - Verify legacy nav is gone.
    - Verify Logout button is in the masthead.

- [ ] **Step 2: Verify Home Page Empty State**
    - (Optional) Use `agent-browser` if we can mock zero entries.
    - Check visually or via tests.
