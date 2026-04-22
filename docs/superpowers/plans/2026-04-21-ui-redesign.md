# Memory Lane UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire UI with the warm paper-and-ink design from the Claude Design handoff bundle, preserving all backend behavior.

**Architecture:** Five ordered increments: (1) design tokens and fonts, (2) shared UI primitives, (3) viewer, (4) editor, (5) modal + login + cleanup. Each increment is a shippable PR. Tailwind v4 `@theme` carries design tokens in CSS — no config file change. Backend, API, DB schema, middleware, and auth are untouched.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript, Vitest + Testing Library (jsdom), `@dnd-kit`, better-sqlite3.

**Reference spec:** `docs/superpowers/specs/2026-04-21-ui-redesign-design.md`

**Reference design files:** `/tmp/design_extract/memory-lane/` (chat transcript, prototype HTML, refined.jsx). If that directory is no longer available, re-fetch from `https://api.anthropic.com/v1/design/h/797_DnD7uTmzNDV_404duA` (a .tar.gz) and extract to `/tmp/design_extract/`.

---

## File Structure

### Created

- `src/components/ui/Photo.tsx` — media frame with placeholder fallback
- `src/components/ui/Icon.tsx` — inline SVG icon set
- `src/components/ui/Pill.tsx` — rounded label with optional dot/count
- `src/components/ui/Btn.tsx` — button variants
- `src/components/ui/Toast.tsx` — toast primitive + `ToastProvider` + `useToast` hook
- `src/components/ui/Thumb.tsx` — grid card
- `src/components/ui/__tests__/Photo.test.tsx`
- `src/components/ui/__tests__/Icon.test.tsx`
- `src/components/ui/__tests__/Pill.test.tsx`
- `src/components/ui/__tests__/Btn.test.tsx`
- `src/components/ui/__tests__/Toast.test.tsx`
- `src/components/ui/__tests__/Thumb.test.tsx`
- `src/components/editor/EditorMasthead.tsx`
- `src/components/editor/EditorToolbar.tsx`
- `src/components/editor/SectionHeader.tsx`
- `src/components/editor/DisabledDrawer.tsx`
- `src/components/editor/SelectionBar.tsx`
- `src/components/editor/__tests__/EditorToolbar.test.tsx`
- `src/components/editor/__tests__/DisabledDrawer.test.tsx`
- `src/components/editor/__tests__/SelectionBar.test.tsx`
- `src/components/editor/NarrationStudio.tsx` (extracted from EntryEditor)
- `src/components/editor/__tests__/NarrationStudio.test.tsx`

### Modified

- `src/app/globals.css` — rewrite with design tokens and typography
- `src/app/layout.tsx` — load Google Fonts, body font class
- `src/app/page.tsx` — viewer page, unchanged wiring but may pass new props
- `src/app/login/page.tsx` — visual restyle, same logic
- `src/app/edit/page.tsx` — may need minor prop changes
- `src/components/viewer/MediaDisplay.tsx` — visual restyle
- `src/components/viewer/NarrationPlayer.tsx` — visual restyle
- `src/components/viewer/ViewerControls.tsx` — new layout, paper-cream buttons, toggle pills
- `src/components/viewer/Slideshow.tsx` — warm vignette stage, caption region, idle-hide 2.5s, titles-hides-caption
- `src/components/editor/EntryGrid.tsx` — new shell (or full rewrite) with search, density (4–8), staging-floats-up, drag-multi, disabled drawer, restyled sections
- `src/components/editor/StageSection.tsx` — new visual treatment (thin header, serif label, section id anchor)
- `src/components/editor/EntryEditor.tsx` — 2-column modal, serif title input, horizontal status pill, NarrationStudio extracted, no-toast no-close on status change
- `src/components/viewer/__tests__/Slideshow.test.tsx` — adapt to new DOM
- `src/components/editor/__tests__/EntryGrid.test.tsx` — add tests for new behaviors
- `src/components/editor/__tests__/EntryEditor.test.tsx` — adapt to new layout

### Deleted

- `src/components/ui/SegmentedControl.tsx` — unused after modal redesign
- `src/components/ui/__tests__/SegmentedControl.test.tsx`

---

## Conventions

- All React component test files begin with `/** @vitest-environment jsdom */` and import `'@testing-library/jest-dom/vitest'` (matches existing tests).
- Commit after every task. Commit messages use conventional commit prefixes: `feat:`, `refactor:`, `test:`, `chore:`, `style:`.
- After each task's implementation step, run `npm run test:run` to confirm the whole test suite passes (not just the new test). If unrelated tests break, investigate before committing.
- `npm run lint` should pass before each commit.
- Use `import { Btn } from '@/components/ui/Btn'` style imports (path alias `@` → `./src` is configured in `vitest.config.ts` and `tsconfig.json`).

---

## Increment 1 — Foundation

### Task 1: Design tokens and typography in `globals.css`

Tailwind v4 reads theme variables from `@theme` blocks inside CSS. We add our palette and font families there. Existing Tailwind default colors remain available so legacy components keep rendering until they're replaced.

**Files:**
- Modify: `src/app/globals.css` (rewrite body block, add `@theme`)

- [ ] **Step 1: Rewrite `globals.css`**

Replace the entire file contents with:

```css
@import "tailwindcss";

@theme {
  --color-paper: #f7f0e3;
  --color-paper2: #efe5cf;
  --color-paper3: #e5d7b8;
  --color-ink: #2b1e12;
  --color-ink2: #5a4431;
  --color-ink3: #8d755a;
  --color-ink4: #b8a78b;
  --color-rule: #d9c9a8;
  --color-rule2: #c8b58e;
  --color-accent: #b14a2a;
  --color-accent-hot: #c85a38;
  --color-accent-soft: rgba(177, 74, 42, 0.08);
  --color-staging: #4a5d3a;
  --color-disabled-ink: #8d755a;
  --color-viewer-bg: #120b06;

  --font-sans: "Inter Tight", -apple-system, system-ui, sans-serif;
  --font-serif: "Instrument Serif", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-news: "Newsreader", Georgia, serif;
}

:root {
  color-scheme: light;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

* {
  box-sizing: border-box;
}

/* Scrollbar — paper-toned */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-rule2) transparent;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--color-rule2);
  border-radius: 6px;
  border: 2px solid var(--color-paper);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* Range input — terracotta accent */
input[type='range'] {
  accent-color: var(--color-accent);
  height: 2px;
  cursor: pointer;
}

/* Photo placeholder grain (used by Photo primitive in placeholder mode) */
.photo-grain::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 14px);
  pointer-events: none;
}

/* Record-pulse animation (narration recording state) */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.rec-pulse {
  animation: pulse 1s ease-in-out infinite;
}

/* Viewer chrome fade-on-idle */
.viewer-chrome {
  transition: opacity 0.35s ease;
}
.viewer-chrome.idle {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: Run build to confirm Tailwind compiles the theme**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: all existing tests still pass (no tests reference color tokens by name).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add paper/ink design tokens and typography variables

Tailwind v4 @theme with paper/ink palette, terracotta accent, moss
staging, and font-family keys for Instrument Serif, Inter Tight,
JetBrains Mono, and Newsreader.

Existing Tailwind defaults remain; legacy components render unchanged
until their increment ships.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Google Fonts in `layout.tsx`

Load the four font families with `next/font/google`, wire them to CSS variables, and make Inter Tight the body default.

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite `layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const newsreader = Newsreader({
  variable: "--font-news",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Memory Lane",
  description: "A personal photo and video slideshow with narration",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run the dev server briefly to confirm no font errors**

Run: `npm run build`
Expected: build succeeds; no "Failed to download font" warnings.

If font download is blocked in the environment, skip the build check and move on — the `next/font/google` call will succeed at runtime.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: load Instrument Serif, Inter Tight, JetBrains Mono, Newsreader

Wires next/font/google to the --font-* CSS variables declared in
globals.css. Inter Tight becomes the body default.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Increment 2 — Primitives

All primitives live in `src/components/ui/` with tests in `src/components/ui/__tests__/`. Each test file starts with the jsdom directive.

### Task 3: `Photo` primitive

The reusable media frame. Accepts a real `src` → `<img>`; without `src` → HSL-gradient placeholder (dev only). Used by `Thumb`, modal preview, and viewer stage.

**Files:**
- Create: `src/components/ui/Photo.tsx`
- Create: `src/components/ui/__tests__/Photo.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Photo.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Photo } from '../Photo';

describe('Photo', () => {
  it('renders an <img> when src is provided', () => {
    render(<Photo src="/api/media/abc" alt="Grand Canyon" />);
    const img = screen.getByRole('img', { name: 'Grand Canyon' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/media/abc');
  });

  it('renders a placeholder (no img) when src is omitted', () => {
    const { container } = render(<Photo hue={180} tone="warm" alt="placeholder" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.photo-grain')).not.toBeNull();
  });

  it('applies rounded corners via style', () => {
    const { container } = render(<Photo src="/x" alt="x" rounded={8} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.borderRadius).toBe('8px');
  });

  it('forwards className and style to the root', () => {
    const { container } = render(
      <Photo src="/x" alt="x" className="my-photo" style={{ width: 200 }} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('my-photo');
    expect(root.style.width).toBe('200px');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/__tests__/Photo.test.tsx`
Expected: FAIL — `Cannot find module '../Photo'`.

- [ ] **Step 3: Implement `Photo`**

Create `src/components/ui/Photo.tsx`:

```tsx
import { CSSProperties, ReactNode } from 'react';

export type PhotoTone = 'warm' | 'cool' | 'dusk' | 'rose' | 'gray';

interface PhotoProps {
  src?: string;
  alt?: string;
  hue?: number;
  tone?: PhotoTone;
  rounded?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function placeholderBackground(hue: number, tone: PhotoTone): string {
  const sat =
    tone === 'gray' ? '4%' :
    tone === 'cool' ? '22%' :
    tone === 'rose' ? '32%' :
    '36%';
  return `radial-gradient(ellipse at 30% 25%, hsl(${hue} ${sat} 52%) 0%, hsl(${hue - 20} ${sat} 30%) 35%, hsl(${hue + 10} ${sat} 18%) 100%)`;
}

export function Photo({
  src,
  alt = '',
  hue = 30,
  tone = 'warm',
  rounded = 0,
  className = '',
  style = {},
  children,
}: PhotoProps) {
  const rootStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: rounded,
    background: src ? 'var(--color-paper2)' : placeholderBackground(hue, tone),
    ...style,
  };

  return (
    <div className={`photo-grain ${className}`} style={rootStyle}>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/__tests__/Photo.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run full suite and lint**

Run: `npm run test:run && npm run lint`
Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Photo.tsx src/components/ui/__tests__/Photo.test.tsx
git commit -m "feat: add Photo primitive

Renders <img> with src; falls back to HSL gradient placeholder when
src is omitted (for dev stubs). Forwards className/style and accepts
a rounded prop.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: `Icon` primitive

Inline SVG icon set. Names match the prototype; adding more later is a one-line change.

**Files:**
- Create: `src/components/ui/Icon.tsx`
- Create: `src/components/ui/__tests__/Icon.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Icon.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Icon } from '../Icon';

describe('Icon', () => {
  it('renders an svg with default size', () => {
    const { container } = render(<Icon name="play" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('14');
    expect(svg!.getAttribute('height')).toBe('14');
  });

  it('respects size prop', () => {
    const { container } = render(<Icon name="play" size={24} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('applies stroke prop', () => {
    const { container } = render(<Icon name="check" stroke="#ff0000" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('#ff0000');
  });

  it('renders a known icon name without warning', () => {
    const names = [
      'play', 'pause', 'prev', 'next', 'mic', 'stop', 'check', 'x',
      'chev', 'chevR', 'chevL', 'sync', 'search', 'grid', 'drag',
      'trash', 'sound', 'eye', 'rotate', 'arrow',
    ] as const;
    for (const name of names) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/__tests__/Icon.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Icon`**

Create `src/components/ui/Icon.tsx`:

```tsx
import { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'play' | 'pause' | 'prev' | 'next'
  | 'mic' | 'stop' | 'check' | 'x'
  | 'chev' | 'chevR' | 'chevL'
  | 'sync' | 'search' | 'grid' | 'drag' | 'trash'
  | 'sound' | 'eye' | 'rotate' | 'arrow';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  sw?: number;
  style?: CSSProperties;
  className?: string;
}

const PATHS: Record<IconName, (stroke: string) => ReactNode> = {
  play: (s) => <polygon points="5,4 19,12 5,20" fill={s} stroke="none" />,
  pause: (s) => (
    <g>
      <rect x="6" y="5" width="4" height="14" fill={s} />
      <rect x="14" y="5" width="4" height="14" fill={s} />
    </g>
  ),
  prev: () => <polyline points="15,6 9,12 15,18" fill="none" />,
  next: () => <polyline points="9,6 15,12 9,18" fill="none" />,
  mic: () => (
    <g>
      <rect x="9" y="3" width="6" height="12" rx="3" fill="none" />
      <path d="M5 11c0 4 3 7 7 7s7-3 7-7M12 18v3" fill="none" />
    </g>
  ),
  stop: (s) => <rect x="6" y="6" width="12" height="12" rx="1" fill={s} />,
  check: () => <polyline points="4,12 10,18 20,6" fill="none" />,
  x: () => (
    <g>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </g>
  ),
  chev: () => <polyline points="6,9 12,15 18,9" fill="none" />,
  chevR: () => <polyline points="9,6 15,12 9,18" fill="none" />,
  chevL: () => <polyline points="15,6 9,12 15,18" fill="none" />,
  sync: () => (
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" fill="none" />
  ),
  search: () => (
    <g>
      <circle cx="11" cy="11" r="6" fill="none" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </g>
  ),
  grid: () => (
    <g>
      <rect x="4" y="4" width="7" height="7" fill="none" />
      <rect x="13" y="4" width="7" height="7" fill="none" />
      <rect x="4" y="13" width="7" height="7" fill="none" />
      <rect x="13" y="13" width="7" height="7" fill="none" />
    </g>
  ),
  drag: (s) => (
    <g>
      <circle cx="9" cy="6" r="1.3" fill={s} />
      <circle cx="15" cy="6" r="1.3" fill={s} />
      <circle cx="9" cy="12" r="1.3" fill={s} />
      <circle cx="15" cy="12" r="1.3" fill={s} />
      <circle cx="9" cy="18" r="1.3" fill={s} />
      <circle cx="15" cy="18" r="1.3" fill={s} />
    </g>
  ),
  trash: () => (
    <g>
      <polyline points="4,7 20,7" fill="none" />
      <path d="M6 7l1 13h10l1-13M10 7V4h4v3" fill="none" />
    </g>
  ),
  sound: () => (
    <g>
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="none" />
      <path d="M16 9a4 4 0 0 1 0 6" fill="none" />
    </g>
  ),
  eye: () => (
    <g>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" />
      <circle cx="12" cy="12" r="3" fill="none" />
    </g>
  ),
  rotate: () => <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" fill="none" />,
  arrow: () => (
    <g>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13,6 19,12 13,18" fill="none" />
    </g>
  ),
};

export function Icon({
  name,
  size = 14,
  stroke = 'currentColor',
  sw = 1.5,
  style,
  className,
}: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {PATHS[name](stroke)}
    </svg>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/__tests__/Icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full suite and lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Icon.tsx src/components/ui/__tests__/Icon.test.tsx
git commit -m "feat: add Icon primitive with inline SVG icon set

20 named icons matching the prototype (play/pause/prev/next, mic/
stop/check/x, chev variants, sync/search/grid/drag/trash, sound/
eye/rotate/arrow). Stroke inherits currentColor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: `Pill` primitive

Rounded label with optional color dot and mono count. Used for section-jump tabs, status pills, and small counter badges.

**Files:**
- Create: `src/components/ui/Pill.tsx`
- Create: `src/components/ui/__tests__/Pill.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Pill.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Pill } from '../Pill';

describe('Pill', () => {
  it('renders children', () => {
    render(<Pill>In the slideshow</Pill>);
    expect(screen.getByText('In the slideshow')).toBeInTheDocument();
  });

  it('renders a dot when dot color is given', () => {
    const { container } = render(<Pill dot="#b14a2a">Active</Pill>);
    const dot = container.querySelector('[data-pill-dot]');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.background).toBe('rgb(177, 74, 42)');
  });

  it('renders a mono count when count is given', () => {
    render(<Pill count={7}>Staging</Pill>);
    expect(screen.getByText('07')).toBeInTheDocument();
  });

  it('does not render a count when count is undefined', () => {
    const { container } = render(<Pill>Just arrived</Pill>);
    expect(container.querySelector('[data-pill-count]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run src/components/ui/__tests__/Pill.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `Pill`**

Create `src/components/ui/Pill.tsx`:

```tsx
import { CSSProperties, ReactNode } from 'react';

interface PillProps {
  children?: ReactNode;
  dot?: string;
  count?: number;
  bg?: string;
  fg?: string;
  style?: CSSProperties;
  className?: string;
}

export function Pill({
  children,
  dot,
  count,
  bg,
  fg,
  style = {},
  className = '',
}: PillProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: bg ?? 'rgba(0,0,0,0.06)',
        color: fg ?? 'var(--color-ink2)',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        ...style,
      }}
    >
      {dot ? (
        <span
          data-pill-dot
          style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}
        />
      ) : null}
      {children}
      {typeof count === 'number' ? (
        <span
          data-pill-count
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: 0.1,
            opacity: 0.7,
          }}
        >
          {String(count).padStart(2, '0')}
        </span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/ui/__tests__/Pill.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Pill.tsx src/components/ui/__tests__/Pill.test.tsx
git commit -m "feat: add Pill primitive

Rounded-full label with optional color dot and zero-padded mono
count. Used for section-jump tabs and status badges.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: `Btn` primitive

Six button variants, all rounded-full, `12px / 500`, consistent padding.

**Files:**
- Create: `src/components/ui/Btn.tsx`
- Create: `src/components/ui/__tests__/Btn.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Btn.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Btn } from '../Btn';

describe('Btn', () => {
  it('renders children', () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Go</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick} disabled>Go</Btn>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant background', () => {
    render(<Btn kind="primary">Primary</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('var(--color-ink)');
    expect(btn.style.color).toBe('var(--color-paper)');
  });

  it('applies accent variant', () => {
    render(<Btn kind="accent">Accent</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('var(--color-accent)');
  });

  it('applies ghost variant with border', () => {
    render(<Btn kind="ghost">Ghost</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
    expect(btn.style.border).toContain('var(--color-rule)');
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run src/components/ui/__tests__/Btn.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `Btn`**

Create `src/components/ui/Btn.tsx`:

```tsx
import { CSSProperties, MouseEvent, ReactNode } from 'react';

export type BtnKind = 'primary' | 'accent' | 'danger' | 'ghost' | 'subtle' | 'clear';

interface BtnProps {
  kind?: BtnKind;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

function variantStyle(kind: BtnKind): CSSProperties {
  switch (kind) {
    case 'primary':
      return { background: 'var(--color-ink)', color: 'var(--color-paper)' };
    case 'accent':
      return { background: 'var(--color-accent)', color: 'var(--color-paper)' };
    case 'danger':
      return { background: '#c04a3a', color: 'var(--color-paper)' };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--color-ink2)',
        border: '1px solid var(--color-rule)',
      };
    case 'subtle':
      return { background: 'var(--color-paper2)', color: 'var(--color-ink2)' };
    case 'clear':
      return { background: 'transparent', color: 'var(--color-ink3)' };
  }
}

export function Btn({
  kind = 'ghost',
  children,
  onClick,
  style = {},
  className = '',
  disabled = false,
  title,
  type = 'button',
}: BtnProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 0,
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      style={{ ...base, ...variantStyle(kind), ...style }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/ui/__tests__/Btn.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Btn.tsx src/components/ui/__tests__/Btn.test.tsx
git commit -m "feat: add Btn primitive

Six variants (primary/accent/danger/ghost/subtle/clear), rounded-full,
Inter Tight 12px/500. Disabled state halves opacity and suppresses
clicks.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: `Toast` + `ToastProvider` + `useToast`

Toast state is hoisted to a provider so editor, modal, and viewer can all trigger toasts. Auto-dismiss at 2.6s.

**Files:**
- Create: `src/components/ui/Toast.tsx`
- Create: `src/components/ui/__tests__/Toast.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Toast.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ToastProvider, useToast } from '../Toast';

function Trigger({ msg, kind }: { msg: string; kind?: 'info' | 'ok' | 'error' }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(msg, kind)}>fire</button>;
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no toast has fired', () => {
    render(
      <ToastProvider>
        <div>content</div>
      </ToastProvider>
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a toast when showToast is called', () => {
    render(
      <ToastProvider>
        <Trigger msg="Synced" kind="ok" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Synced');
  });

  it('auto-dismisses after 2.6 seconds', () => {
    render(
      <ToastProvider>
        <Trigger msg="Gone" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('applies ok kind background', () => {
    render(
      <ToastProvider>
        <Trigger msg="ok" kind="ok" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('fire').click();
    });
    const toast = screen.getByRole('status') as HTMLElement;
    expect(toast.style.background).toBe('rgb(74, 93, 58)');
  });

  it('throws when useToast is called outside provider', () => {
    function Outside() {
      useToast();
      return null;
    }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Outside />)).toThrow(/ToastProvider/);
    err.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run src/components/ui/__tests__/Toast.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `Toast`, `ToastProvider`, `useToast`**

Create `src/components/ui/Toast.tsx`:

```tsx
'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

export type ToastKind = 'info' | 'ok' | 'error';

interface ToastState {
  msg: string;
  kind: ToastKind;
  id: number;
}

interface ToastContextValue {
  showToast: (msg: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx;
}

const BG: Record<ToastKind, string> = {
  info: 'var(--color-ink)',
  ok: '#4a5d3a',
  error: '#c04a3a',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((msg: string, kind: ToastKind = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++nextId.current;
    setToast({ msg, kind, id });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: BG[toast.kind],
            color: 'var(--color-paper)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 100,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {toast.msg}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/ui/__tests__/Toast.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Toast.tsx src/components/ui/__tests__/Toast.test.tsx
git commit -m "feat: add Toast primitive + ToastProvider + useToast

Top-center fixed pill, three kinds (info/ok/error), auto-dismiss at
2.6s. useToast throws outside ToastProvider.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: `Thumb` primitive

The reusable grid card. Composes `Photo` + tags + checkbox + drag-handle.

**Files:**
- Create: `src/components/ui/Thumb.tsx`
- Create: `src/components/ui/__tests__/Thumb.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/Thumb.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Thumb, ThumbEntry } from '../Thumb';

function makeEntry(overrides: Partial<ThumbEntry> = {}): ThumbEntry {
  return {
    id: 'e1',
    title: "Nonna's kitchen",
    year: 1989,
    kind: 'photo',
    src: '/api/media/e1',
    hasNarration: false,
    duration: null,
    ...overrides,
  };
}

describe('Thumb', () => {
  it('renders title and year', () => {
    render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText("Nonna's kitchen")).toBeInTheDocument();
    expect(screen.getByText('1989')).toBeInTheDocument();
  });

  it('shows position tag when showPosition is true', () => {
    render(
      <Thumb
        entry={makeEntry()}
        index={3}
        showPosition
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('does not show position tag when showPosition is false', () => {
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        index={3}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(container.textContent).not.toContain('03');
  });

  it('shows video duration tag for video kind', () => {
    render(
      <Thumb
        entry={makeEntry({ kind: 'video', duration: '1:42' })}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText(/1:42/)).toBeInTheDocument();
  });

  it('shows narration duration for photos with narration', () => {
    render(
      <Thumb
        entry={makeEntry({ hasNarration: true, duration: '0:58' })}
        selected={false}
        multiSelectActive={false}
      />
    );
    expect(screen.getByText(/0:58/)).toBeInTheDocument();
  });

  it('calls onOpen when the card body is clicked', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
        onOpen={onOpen}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('does not call onOpen when the checkbox is clicked', () => {
    const onOpen = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <Thumb
        entry={makeEntry()}
        selected
        multiSelectActive
        onOpen={onOpen}
        onToggleSelect={onToggleSelect}
      />
    );
    fireEvent.click(screen.getByTestId('thumb-check'));
    expect(onToggleSelect).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows the checkbox persistently when multiSelectActive', () => {
    render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive
      />
    );
    expect(screen.getByTestId('thumb-check')).toBeInTheDocument();
  });

  it('reduces opacity when dragging', () => {
    const { container } = render(
      <Thumb
        entry={makeEntry()}
        selected={false}
        multiSelectActive={false}
        dragging
      />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.opacity).toBe('0.3');
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run src/components/ui/__tests__/Thumb.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `Thumb`**

Create `src/components/ui/Thumb.tsx`:

```tsx
'use client';

import { CSSProperties, DragEvent, MouseEvent, useState } from 'react';
import { Photo } from './Photo';
import { Icon } from './Icon';

export interface ThumbEntry {
  id: string;
  title: string;
  year: number | null;
  kind: 'photo' | 'video';
  src: string;
  hasNarration: boolean;
  duration: string | null; // "m:ss" or null
}

interface ThumbProps {
  entry: ThumbEntry;
  index?: number;
  showPosition?: boolean;
  selected: boolean;
  multiSelectActive: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onOpen?: () => void;
  onToggleSelect?: (e: MouseEvent) => void;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
}

export function Thumb({
  entry,
  index,
  showPosition = false,
  selected,
  multiSelectActive,
  draggable = false,
  dragging = false,
  dragOver = false,
  onOpen,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ThumbProps) {
  const [hover, setHover] = useState(false);
  const showCheck = multiSelectActive || hover || selected;

  const outline =
    dragOver || selected
      ? '2px solid var(--color-accent)'
      : '1px solid var(--color-rule)';

  const monoTag: CSSProperties = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    color: 'var(--color-paper)',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-thumb-check]')) return;
        onOpen?.();
      }}
      style={{
        position: 'relative',
        cursor: draggable ? 'grab' : 'pointer',
        opacity: dragging ? 0.3 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 6,
          overflow: 'hidden',
          outline,
          outlineOffset: selected || dragOver ? 0 : -1,
        }}
      >
        <Photo
          src={entry.src}
          alt={entry.title}
          style={{ width: '100%', aspectRatio: '4 / 3' }}
        />

        {showPosition && typeof index === 'number' ? (
          <div style={{ ...monoTag, top: 6, left: 6, letterSpacing: 0.05 }}>
            {String(index).padStart(2, '0')}
          </div>
        ) : null}

        {entry.kind === 'video' && entry.duration ? (
          <div style={{ ...monoTag, bottom: 6, right: 6 }}>▶ {entry.duration}</div>
        ) : null}

        {entry.kind === 'photo' && entry.hasNarration && entry.duration ? (
          <div
            style={{
              ...monoTag,
              bottom: 6,
              right: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="sound" size={9} stroke="var(--color-paper)" sw={1.8} />
            {entry.duration}
          </div>
        ) : null}

        {showCheck ? (
          <div
            data-thumb-check
            data-testid="thumb-check"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(e);
            }}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `1.5px solid ${
                selected ? 'var(--color-accent)' : 'rgba(255,255,255,0.85)'
              }`,
              background: selected ? 'var(--color-accent)' : 'rgba(0,0,0,0.25)',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.12s',
              cursor: 'pointer',
            }}
          >
            {selected ? (
              <Icon name="check" size={13} stroke="var(--color-paper)" sw={2.5} />
            ) : null}
          </div>
        ) : null}

        {draggable && hover && !selected ? (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: showPosition ? 38 : 6,
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="drag" size={12} stroke="var(--color-paper)" sw={1.8} />
          </div>
        ) : null}
      </div>

      <div style={{ paddingTop: 7, paddingLeft: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entry.title}
        </div>
        {entry.year ? (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--color-ink3)',
              marginTop: 2,
              letterSpacing: 0.1,
            }}
          >
            {entry.year}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/ui/__tests__/Thumb.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Thumb.tsx src/components/ui/__tests__/Thumb.test.tsx
git commit -m "feat: add Thumb primitive

Grid card composing Photo + position/duration/narration tags +
hover-revealed checkbox and drag-handle. Click-through isolation for
the checkbox.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Increment 3 — Viewer

Before starting, re-read `src/components/viewer/Slideshow.tsx`, `MediaDisplay.tsx`, `NarrationPlayer.tsx`, `ViewerControls.tsx` to understand the current behavior. The only behavior change is idle-hide 3s → 2.5s; everything else is visual.

### Task 9: Mount `ToastProvider` at the root `/` layout

The viewer needs a toast provider in case future viewer events trigger toasts (e.g., "narration failed to load"). Safer to mount it now.

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wrap children with `ToastProvider`**

Replace the `RootLayout` body contents to wrap `{children}` with `<ToastProvider>`:

```tsx
import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-sans", subsets: ["latin"], weight: ["300","400","500","600","700"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal","italic"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400","500"] });
const newsreader = Newsreader({ variable: "--font-news", subsets: ["latin"], weight: ["400","500"], style: ["normal","italic"] });

export const metadata: Metadata = {
  title: "Memory Lane",
  description: "A personal photo and video slideshow with narration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:run`
Expected: PASS. Existing tests that render page-level components may now need `ToastProvider` around them; if any fail with `useToast must be used inside a ToastProvider`, wrap the render calls in the relevant test files. (None of the current tests consume `useToast`, so this step is likely a no-op.)

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: mount ToastProvider at root layout

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Rewrite `ViewerControls` with paper-cream palette and toggle pills

Preserves all existing props and callbacks; visual-only.

**Files:**
- Modify: `src/components/viewer/ViewerControls.tsx`

- [ ] **Step 1: Read the current file**

Open `src/components/viewer/ViewerControls.tsx` and review its exported prop shape. Mirror it exactly in the rewrite.

- [ ] **Step 2: Rewrite the component**

Replace the file contents with:

```tsx
'use client';

import { Icon } from '@/components/ui/Icon';

interface ViewerControlsProps {
  visible: boolean;
  currentIndex: number;
  totalEntries: number;
  autoAdvanceDelay: number;
  showTitles: boolean;
  isNarrationPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleNarration: () => void;
  onToggleAutoAdvance: () => void;
  onToggleTitles: () => void;
}

export function ViewerControls({
  visible,
  currentIndex,
  totalEntries,
  autoAdvanceDelay,
  showTitles,
  isNarrationPlaying,
  onPrev,
  onNext,
  onToggleNarration,
  onToggleAutoAdvance,
  onToggleTitles,
}: ViewerControlsProps) {
  const chromeClass = `viewer-chrome ${visible ? '' : 'idle'}`;
  const autoAdvanceOn = autoAdvanceDelay > 0;

  return (
    <>
      {/* Top chrome */}
      <div
        className={chromeClass}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '22px 28px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, letterSpacing: 0.3, color: 'var(--color-paper)' }}>
          memory lane
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 0.2, color: 'rgba(247,240,227,0.6)', textTransform: 'uppercase' }}>
          {String(currentIndex + 1).padStart(2, '0')} of {String(totalEntries).padStart(2, '0')}
        </div>
      </div>

      {/* Prev / next */}
      <button
        aria-label="Previous"
        onClick={onPrev}
        className={chromeClass}
        style={navBtn('left')}
      >
        <Icon name="chevL" size={20} stroke="var(--color-paper)" />
      </button>
      <button
        aria-label="Next"
        onClick={onNext}
        className={chromeClass}
        style={navBtn('right')}
      >
        <Icon name="chevR" size={20} stroke="var(--color-paper)" />
      </button>

      {/* Bottom chrome */}
      <div
        className={chromeClass}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '28px 28px 22px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 2,
        }}
      >
        <button
          aria-label={isNarrationPlaying ? 'Pause narration' : 'Play narration'}
          onClick={onToggleNarration}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-paper)',
            color: 'var(--color-ink)',
            display: 'grid',
            placeItems: 'center',
            border: 0,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,12,4,0.4)',
          }}
        >
          <Icon name={isNarrationPlaying ? 'pause' : 'play'} size={14} stroke="var(--color-ink)" />
        </button>

        <div style={{ flex: 1 }} />

        <TogglePill label="Titles" letter="T" active={showTitles} onClick={onToggleTitles} />
        <TogglePill label="Auto-advance" letter="A" active={autoAdvanceOn} onClick={onToggleAutoAdvance} />
      </div>
    </>
  );
}

function navBtn(side: 'left' | 'right') {
  return {
    position: 'absolute' as const,
    [side]: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: 'rgba(247,240,227,0.08)',
    backdropFilter: 'blur(8px)',
    border: 0,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-paper)',
    cursor: 'pointer',
    zIndex: 2,
  };
}

function TogglePill({ label, letter, active, onClick }: { label: string; letter: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.12)',
        color: active ? 'var(--color-paper)' : 'rgba(247,240,227,0.7)',
        padding: '7px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.6 }}>{letter}</span>
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: tests for `Slideshow` may fail on specific DOM queries (text "Prev"/"Next" etc.). Note failures.

- [ ] **Step 4: Update Slideshow tests if needed**

If `src/components/viewer/__tests__/Slideshow.test.tsx` queries buttons by visible text that changed (e.g. "Prev"), update those queries to use `aria-label` (e.g. `screen.getByLabelText('Previous')`). Re-run until green. Do not change what the tests *assert*, only the selectors.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/ViewerControls.tsx src/components/viewer/__tests__/Slideshow.test.tsx
git commit -m "refactor: redesign ViewerControls with paper-cream palette

Frosted prev/next circles, paper-cream play/pause, toggle pills for
Titles (T) and Auto-advance (A) with key-letter prefixes. Props and
callbacks unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: Rewrite `Slideshow` stage with warm vignette, caption region, idle-hide 2.5s

**Files:**
- Modify: `src/components/viewer/Slideshow.tsx`

- [ ] **Step 1: Add a failing test for the new idle timeout**

Add this test case to `src/components/viewer/__tests__/Slideshow.test.tsx` (adapt import if needed):

```tsx
  it('hides controls after 2.5 seconds of inactivity', () => {
    vi.useFakeTimers();
    // assume helper renderSlideshow already exists in this file; if not,
    // inline the render with a minimal entries prop.
    const { container } = render(
      <Slideshow
        entries={[{
          id: 'e1', dropbox_path: '/a.jpg', title: 'A',
          transcript: null, position: 1, disabled: 0, has_narration: 0,
          created_at: '', updated_at: '',
        }]}
        initialAutoAdvance={0}
        initialShowTitles
      />
    );
    // simulate activity, then wait
    fireEvent.mouseMove(window);
    act(() => { vi.advanceTimersByTime(2499); });
    // controls still visible
    expect(container.querySelector('.viewer-chrome.idle')).toBeNull();
    act(() => { vi.advanceTimersByTime(2); });
    expect(container.querySelector('.viewer-chrome.idle')).not.toBeNull();
    vi.useRealTimers();
  });
```

- [ ] **Step 2: Run the test — expect fail**

Run: `npx vitest run src/components/viewer/__tests__/Slideshow.test.tsx -t "2.5 seconds"`
Expected: FAIL (still 3000ms).

- [ ] **Step 3: Rewrite `Slideshow`**

Replace the file contents with:

```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Entry, isVideoFile } from '@/types';
import { MediaDisplay } from './MediaDisplay';
import { NarrationPlayer } from './NarrationPlayer';
import { ViewerControls } from './ViewerControls';

interface SlideshowProps {
  entries: Entry[];
  initialAutoAdvance: number;
  initialShowTitles: boolean;
}

export function Slideshow({ entries, initialAutoAdvance, initialShowTitles }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(initialAutoAdvance);
  const [showTitles, setShowTitles] = useState(initialShowTitles);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const autoAdvanceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const currentEntry = entries[currentIndex];
  const isVideo = currentEntry ? isVideoFile(currentEntry.dropbox_path) : false;

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + entries.length) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const toggleNarration = useCallback(() => setIsNarrationPlaying((p) => !p), []);

  // Auto-advance
  useEffect(() => {
    if (autoAdvanceTimeout.current) clearTimeout(autoAdvanceTimeout.current);
    if (autoAdvanceDelay > 0 && !isNarrationPlaying && !isVideo) {
      autoAdvanceTimeout.current = setTimeout(goToNext, autoAdvanceDelay * 1000);
    }
    return () => { if (autoAdvanceTimeout.current) clearTimeout(autoAdvanceTimeout.current); };
  }, [currentIndex, autoAdvanceDelay, isNarrationPlaying, isVideo, goToNext]);

  // Hide controls after 2.5s inactivity
  useEffect(() => {
    function show() {
      setControlsVisible(true);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => setControlsVisible(false), 2500);
    }
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('keydown', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('keydown', show);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          goToPrev();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          toggleNarration();
          break;
        case 'a':
        case 'A':
          setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0));
          break;
        case 't':
        case 'T':
          setShowTitles((s) => !s);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNext, goToPrev, toggleNarration]);

  if (!currentEntry) {
    return (
      <div className="h-screen grid place-items-center" style={{ background: 'var(--color-viewer-bg)', color: 'var(--color-paper)' }}>
        No entries to display
      </div>
    );
  }

  return (
    <div
      className="h-screen relative overflow-hidden"
      style={{ background: '#0d0805', color: 'var(--color-paper)' }}
    >
      {/* Warm vignette overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: `
            radial-gradient(ellipse at center, transparent 50%, rgba(26,12,4,0.5) 100%),
            radial-gradient(circle at 18% 8%, rgba(177,74,42,0.10) 0%, transparent 40%),
            radial-gradient(circle at 85% 92%, rgba(212,165,116,0.08) 0%, transparent 42%)
          `,
        }}
      />

      {/* Stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          padding: '0 80px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <MediaDisplay
            entry={currentEntry}
            isVideo={isVideo}
            isNarrationPlaying={isNarrationPlaying}
            onClick={toggleNarration}
          />
        </div>

        {/* Caption region */}
        {showTitles && currentEntry.title ? (
          <div style={{ padding: '20px 40px 120px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 38,
                letterSpacing: -0.3,
                lineHeight: 1.1,
                color: 'var(--color-paper)',
              }}
            >
              {currentEntry.title}
            </h2>
          </div>
        ) : (
          <div style={{ height: 120 }} />
        )}
      </div>

      <NarrationPlayer
        entryId={currentEntry.id}
        isPlaying={isNarrationPlaying}
        isVideo={isVideo}
        onEnded={() => {
          setIsNarrationPlaying(false);
          if (autoAdvanceDelay > 0) goToNext();
        }}
      />

      <ViewerControls
        visible={controlsVisible}
        currentIndex={currentIndex}
        totalEntries={entries.length}
        autoAdvanceDelay={autoAdvanceDelay}
        showTitles={showTitles}
        isNarrationPlaying={isNarrationPlaying}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleNarration={toggleNarration}
        onToggleAutoAdvance={() => setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0))}
        onToggleTitles={() => setShowTitles((s) => !s)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the new + existing Slideshow tests**

Run: `npx vitest run src/components/viewer/__tests__/Slideshow.test.tsx`
Expected: the 2.5-second test now PASSES. Existing tests may need selector updates (previously querying by visible text) — update them to `getByLabelText`/`getByRole` as needed. The **old titles overlay** test (checking the overlaid black label) should be rewritten to check that the caption `<h2>` is rendered when `showTitles` is true.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/Slideshow.tsx src/components/viewer/__tests__/Slideshow.test.tsx
git commit -m "refactor: rewrite Slideshow stage with warm vignette and caption region

- Warm paper-cream vignette replaces black void.
- Title renders as a caption below the stage (h2), not an overlay.
- Idle-hide timer 3s -> 2.5s to match the design spec.
- Behavior preserved: keyboard map, auto-advance, narration pipeline,
  /api/settings persistence.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: Touch up `MediaDisplay` and `NarrationPlayer` visuals

These components are internal; tweak the dark container and any scrubber styling to match the new palette, but keep their prop shapes unchanged.

**Files:**
- Modify: `src/components/viewer/MediaDisplay.tsx`
- Modify: `src/components/viewer/NarrationPlayer.tsx`

- [ ] **Step 1: Review both files and identify color classes**

Read the two files. Replace legacy Tailwind colors (e.g. `bg-gray-*`, `bg-black/*`, `text-white`) with tokens:
- Background chrome → `var(--color-viewer-bg)` or `rgba(0,0,0,0.5)` overlays (keep blacks where they make sense).
- Text → `var(--color-paper)` or `rgba(247,240,227,X)`.
- Scrubber fill → `var(--color-accent-hot)`.

Keep the `<video>` and audio-element logic intact. Don't introduce new props.

- [ ] **Step 2: Apply the edits**

For each file, use Edit/Write as needed. Constrain changes to styling only.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: green.

- [ ] **Step 4: Lint and commit**

```bash
git add src/components/viewer/MediaDisplay.tsx src/components/viewer/NarrationPlayer.tsx
git commit -m "style: align MediaDisplay and NarrationPlayer with paper-cream palette

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: Manual viewer verification in the browser

Per CLAUDE.md, UI changes require a live check.

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (leave running)

- [ ] **Step 2: Open `http://localhost:3000` and verify:**

Checklist (report which fail, if any):
- Warm vignette visible; background is not pure black.
- Play/pause button is paper-cream with dark ink icon.
- Prev/next circles are frosted, 46px, centered vertically.
- Caption title below stage is Instrument Serif italic, ~38px.
- Counter top-right is mono `01 of NN`.
- Pressing `T` toggles the caption on/off.
- Pressing `A` toggles auto-advance (visual pill state).
- Controls fade after ~2.5s of no mouse movement.
- Esc returns to `/edit` (when signed in).

- [ ] **Step 3: Stop the dev server. No commit needed.**

---

## Increment 4 — Editor

The editor is the biggest increment. It replaces the masthead, adds the sticky section-jump toolbar, introduces search/density, reorders staging-above-active when hot, swaps disabled for a collapsed drawer, keeps multi-select/shift-click/bulk-move (restyled), and adds drag-multi.

### Task 14: Extract reusable `sectionId` constants + a `toThumbEntry` adapter

Small preparatory refactor. Everything downstream imports these.

**Files:**
- Create: `src/components/editor/shared.ts`

- [ ] **Step 1: Create the helper file**

```ts
import { Entry, getEntryStatus, isVideoFile } from '@/types';
import { ThumbEntry } from '@/components/ui/Thumb';

export const SECTION_IDS = {
  active: 'sec-active',
  staging: 'sec-staging',
  disabled: 'sec-disabled',
} as const;

export function toThumbEntry(entry: Entry): ThumbEntry {
  const status = getEntryStatus(entry);
  const video = isVideoFile(entry.dropbox_path);
  return {
    id: entry.id,
    title: entry.title ?? 'Untitled',
    year: yearFromCreatedAt(entry.created_at),
    kind: video ? 'video' : 'photo',
    src: `/api/media/${entry.id}`,
    hasNarration: !!entry.has_narration,
    duration: null, // narration/video duration not on Entry; Thumb hides the tag when null
  };
  // note: status is intentionally not carried; section location encodes status
  void status;
}

function yearFromCreatedAt(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const y = new Date(createdAt).getFullYear();
  return Number.isFinite(y) ? y : null;
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:run`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/shared.ts
git commit -m "chore: add editor shared helpers (section ids, Entry->ThumbEntry adapter)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 15: `EditorMasthead` component

Top chrome: wordmark, tagline, Sync from Dropbox button, Play slideshow button.

**Files:**
- Create: `src/components/editor/EditorMasthead.tsx`

- [ ] **Step 1: Create the component**

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
}

export function EditorMasthead({ tagline, syncing, canPlay, onSync, onPlay }: EditorMastheadProps) {
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

- [ ] **Step 2: No new test yet (visual only) — run full suite**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorMasthead.tsx
git commit -m "feat: add EditorMasthead component

Wordmark, editing tagline, ghost Sync from Dropbox, primary Play
slideshow.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 16: `EditorToolbar` — section-jump pills, search, density

Accepts controlled state from the parent; emits callbacks.

**Files:**
- Create: `src/components/editor/EditorToolbar.tsx`
- Create: `src/components/editor/__tests__/EditorToolbar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/editor/__tests__/EditorToolbar.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EditorToolbar } from '../EditorToolbar';

describe('EditorToolbar', () => {
  const counts = { active: 42, staging: 4, disabled: 6 };

  it('renders the three section-jump pills with counts', () => {
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    expect(screen.getByText('In the slideshow')).toBeInTheDocument();
    expect(screen.getByText('Just arrived')).toBeInTheDocument();
    expect(screen.getByText('Set aside')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();
  });

  it('calls onJump with the section key when a pill is clicked', () => {
    const onJump = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={onJump}
      />
    );
    fireEvent.click(screen.getByText('Just arrived'));
    expect(onJump).toHaveBeenCalledWith('staging');
  });

  it('highlights Just arrived when staging count > 0', () => {
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    const pill = screen.getByText('Just arrived').closest('button') as HTMLElement;
    expect(pill.style.background).toBe('var(--color-accent-soft)');
  });

  it('emits onSearchChange as the user types', () => {
    const onSearchChange = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={onSearchChange}
        density={6}
        onDensityChange={() => {}}
        onJump={() => {}}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), {
      target: { value: 'beach' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('beach');
  });

  it('emits onDensityChange when the slider moves', () => {
    const onDensityChange = vi.fn();
    render(
      <EditorToolbar
        counts={counts}
        search=""
        onSearchChange={() => {}}
        density={6}
        onDensityChange={onDensityChange}
        onJump={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText(/grid density/i), {
      target: { value: '8' },
    });
    expect(onDensityChange).toHaveBeenCalledWith(8);
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

Run: `npx vitest run src/components/editor/__tests__/EditorToolbar.test.tsx`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `EditorToolbar`**

Create `src/components/editor/EditorToolbar.tsx`:

```tsx
'use client';

import { ChangeEvent } from 'react';
import { Icon } from '@/components/ui/Icon';

export type SectionKey = 'active' | 'staging' | 'disabled';

interface EditorToolbarProps {
  counts: Record<SectionKey, number>;
  search: string;
  onSearchChange: (q: string) => void;
  density: number; // 4..8
  onDensityChange: (d: number) => void;
  onJump: (key: SectionKey) => void;
}

const DEFS: { key: SectionKey; label: string; color: string }[] = [
  { key: 'active', label: 'In the slideshow', color: 'var(--color-accent)' },
  { key: 'staging', label: 'Just arrived', color: 'var(--color-staging)' },
  { key: 'disabled', label: 'Set aside', color: 'var(--color-disabled-ink)' },
];

export function EditorToolbar({
  counts,
  search,
  onSearchChange,
  density,
  onDensityChange,
  onJump,
}: EditorToolbarProps) {
  return (
    <div
      style={{
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {DEFS.map((d) => {
          const hot = d.key === 'staging' && counts.staging > 0;
          return (
            <button
              key={d.key}
              onClick={() => onJump(d.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 999,
                background: hot ? 'var(--color-accent-soft)' : 'transparent',
                border: hot ? '1px solid var(--color-accent)' : '1px solid transparent',
                fontSize: 12,
                color: 'var(--color-ink2)',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
              {d.label}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)' }}>
                {String(counts[d.key]).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-paper2)',
          padding: '6px 12px',
          borderRadius: 999,
          width: 260,
        }}
      >
        <Icon name="search" size={12} stroke="var(--color-ink3)" />
        <input
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder="Search titles, transcripts, years…"
          style={{
            border: 0,
            background: 'transparent',
            outline: 'none',
            fontSize: 12,
            flex: 1,
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        {search ? (
          <button aria-label="Clear search" onClick={() => onSearchChange('')} style={{ background: 'transparent', border: 0, color: 'var(--color-ink3)', cursor: 'pointer' }}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-rule)' }}>
        <Icon name="grid" size={12} stroke="var(--color-ink3)" />
        <input
          type="range"
          aria-label="Grid density"
          min={4}
          max={8}
          step={1}
          value={density}
          onChange={(e) => onDensityChange(Number(e.target.value))}
          style={{ width: 70 }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-ink3)', minWidth: 16 }}>{density}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/editor/__tests__/EditorToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/EditorToolbar.tsx src/components/editor/__tests__/EditorToolbar.test.tsx
git commit -m "feat: add EditorToolbar with section-jump pills, search, density

Section pills jump-scroll via onJump callback; Just arrived pill is
highlighted when staging count > 0. Search is a controlled input;
density is a 4-8 range slider.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 17: `SectionHeader` component

Thin header with color dot, serif-italic title, mono count, meta hint, optional right slot.

**Files:**
- Create: `src/components/editor/SectionHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { ReactNode } from 'react';

interface SectionHeaderProps {
  id: string;
  label: string;
  count: number;
  color: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export function SectionHeader({ id, label, count, color, hint, rightSlot }: SectionHeaderProps) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        padding: '24px 0 14px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: 18,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 26,
          letterSpacing: -0.3,
          color: 'var(--color-ink)',
        }}
      >
        {label}
      </h2>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-ink3)',
          letterSpacing: 0.15,
        }}
      >
        {String(count).padStart(2, '0')}
        {hint ? ` · ${hint}` : ''}
      </span>
      <div style={{ flex: 1 }} />
      {rightSlot}
    </div>
  );
}
```

- [ ] **Step 2: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/SectionHeader.tsx
git commit -m "feat: add SectionHeader component

Color dot + Instrument Serif italic label + mono count/hint + right
slot.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 18: `DisabledDrawer` component

Collapsed-by-default section for 'Set aside'. When collapsed: header row + peek strip of up to 8 small grayscale thumbnails. When open: full grid (rendered by the parent).

**Files:**
- Create: `src/components/editor/DisabledDrawer.tsx`
- Create: `src/components/editor/__tests__/DisabledDrawer.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/editor/__tests__/DisabledDrawer.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DisabledDrawer } from '../DisabledDrawer';
import { Entry } from '@/types';

function makeEntry(id: string): Entry {
  return {
    id,
    dropbox_path: `/p/${id}.jpg`,
    title: `Entry ${id}`,
    transcript: null,
    position: null,
    disabled: 1,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
  };
}

describe('DisabledDrawer', () => {
  it('renders the header with the count', () => {
    render(
      <DisabledDrawer
        entries={[makeEntry('1'), makeEntry('2')]}
        open={false}
        onToggle={() => {}}
      >
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.getByText('Set aside')).toBeInTheDocument();
    expect(screen.getByText(/02/)).toBeInTheDocument();
    expect(screen.getByText(/hidden from slideshow/i)).toBeInTheDocument();
  });

  it('shows peek thumbnails when closed', () => {
    render(
      <DisabledDrawer
        entries={[makeEntry('1'), makeEntry('2')]}
        open={false}
        onToggle={() => {}}
      >
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.queryByTestId('grid-slot')).toBeNull();
    expect(screen.getAllByTestId('drawer-peek-thumb')).toHaveLength(2);
  });

  it('renders children when open', () => {
    render(
      <DisabledDrawer entries={[makeEntry('1')]} open={true} onToggle={() => {}}>
        <div data-testid="grid-slot">grid</div>
      </DisabledDrawer>
    );
    expect(screen.getByTestId('grid-slot')).toBeInTheDocument();
  });

  it('calls onToggle when the header is clicked', () => {
    const onToggle = vi.fn();
    render(
      <DisabledDrawer entries={[]} open={false} onToggle={onToggle}>
        <div />
      </DisabledDrawer>
    );
    fireEvent.click(screen.getByText('Set aside'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

Run: `npx vitest run src/components/editor/__tests__/DisabledDrawer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `DisabledDrawer`**

Create `src/components/editor/DisabledDrawer.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import { Entry } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import { SECTION_IDS } from './shared';

interface DisabledDrawerProps {
  entries: Entry[];
  open: boolean;
  onToggle: () => void;
  children: ReactNode; // grid contents, rendered only when open
}

export function DisabledDrawer({ entries, open, onToggle, children }: DisabledDrawerProps) {
  return (
    <section id={SECTION_IDS.disabled} style={{ margin: '24px 0 0' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          padding: '24px 0 14px',
          borderBottom: '1px solid var(--color-rule)',
          marginBottom: 14,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-disabled-ink)' }} />
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 26,
            letterSpacing: -0.3,
          }}
        >
          Set aside
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink3)', letterSpacing: 0.15 }}>
          {String(entries.length).padStart(2, '0')} · hidden from slideshow
        </span>
        <div style={{ flex: 1 }} />
        <Icon
          name="chev"
          size={14}
          stroke="var(--color-ink3)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>
      {!open && entries.length > 0 ? (
        <div
          onClick={onToggle}
          style={{ display: 'flex', gap: 10, paddingBottom: 24, overflow: 'hidden', cursor: 'pointer' }}
        >
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} data-testid="drawer-peek-thumb" style={{ flexShrink: 0, width: 80 }}>
              <Photo
                src={`/api/media/${e.id}`}
                alt={e.title ?? ''}
                rounded={4}
                style={{ width: 80, height: 60, filter: 'grayscale(0.6) opacity(0.6)' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink3)' }}>Click to open</span>
          </div>
        </div>
      ) : null}
      {open ? children : null}
    </section>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/editor/__tests__/DisabledDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/DisabledDrawer.tsx src/components/editor/__tests__/DisabledDrawer.test.tsx
git commit -m "feat: add DisabledDrawer component

Collapsed-by-default 'Set aside' section with an 8-thumb peek strip.
Expanded state renders children (the full grid).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 19: Restyle floating `SelectionBar`

Ink-black rounded pill centered at bottom; destination buttons with color dots; disabled-when-common-status.

**Files:**
- Create: `src/components/editor/SelectionBar.tsx`
- Create: `src/components/editor/__tests__/SelectionBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/editor/__tests__/SelectionBar.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SelectionBar } from '../SelectionBar';

describe('SelectionBar', () => {
  it('renders the selection count', () => {
    render(
      <SelectionBar
        count={3}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('disables the button for the common status', () => {
    render(
      <SelectionBar
        count={2}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    const slideshowBtn = screen.getByRole('button', { name: /slideshow/i });
    expect(slideshowBtn).toBeDisabled();
  });

  it('enables all three when status is mixed', () => {
    render(
      <SelectionBar
        count={2}
        commonStatus="mixed"
        onMoveTo={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /slideshow/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /just arrived/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /set aside/i })).not.toBeDisabled();
  });

  it('calls onMoveTo with the right status', () => {
    const onMoveTo = vi.fn();
    render(
      <SelectionBar
        count={1}
        commonStatus="staging"
        onMoveTo={onMoveTo}
        onClear={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /set aside/i }));
    expect(onMoveTo).toHaveBeenCalledWith('disabled');
  });

  it('calls onClear when × is clicked', () => {
    const onClear = vi.fn();
    render(
      <SelectionBar
        count={1}
        commonStatus="active"
        onMoveTo={() => {}}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

Run: `npx vitest run src/components/editor/__tests__/SelectionBar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `SelectionBar`**

Create `src/components/editor/SelectionBar.tsx`:

```tsx
'use client';

import { Icon } from '@/components/ui/Icon';
import { EntryStatus } from '@/types';

interface SelectionBarProps {
  count: number;
  commonStatus: EntryStatus | 'mixed';
  onMoveTo: (status: EntryStatus) => void;
  onClear: () => void;
}

const DESTS: { label: string; status: EntryStatus; dot: string }[] = [
  { label: 'Slideshow', status: 'active', dot: 'var(--color-accent)' },
  { label: 'Just arrived', status: 'staging', dot: 'var(--color-staging)' },
  { label: 'Set aside', status: 'disabled', dot: 'var(--color-disabled-ink)' },
];

export function SelectionBar({ count, commonStatus, onMoveTo, onClear }: SelectionBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-ink)',
        color: 'var(--color-paper)',
        borderRadius: 999,
        padding: '8px 8px 8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
        zIndex: 40,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ fontSize: 12 }}>{count} selected</span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
      <span style={{ fontSize: 11, opacity: 0.7 }}>Move to:</span>
      {DESTS.map((d) => {
        const disabled = commonStatus === d.status;
        return (
          <button
            key={d.status}
            disabled={disabled}
            onClick={() => onMoveTo(d.status)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 999,
              background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: disabled ? 'rgba(255,255,255,0.35)' : 'var(--color-paper)',
              border: 0,
              cursor: disabled ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.dot }} />
            {d.label}
          </button>
        );
      })}
      <button
        aria-label="Clear selection"
        onClick={onClear}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--color-paper)',
          border: 0,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/components/editor/__tests__/SelectionBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/SelectionBar.tsx src/components/editor/__tests__/SelectionBar.test.tsx
git commit -m "feat: restyle floating SelectionBar with status-dotted destinations

Ink-black rounded pill; destination matching the selection's common
status is disabled.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 20: Rewrite `EntryGrid` shell with new layout, search, density, staging-floats-up

This is the biggest task in the plan. We rewrite the main editor shell to use the new primitives and components, and add client-side search/density/staging-floats-up. We still keep the existing modal-open behavior (the modal rewrite happens in increment 5).

The old `StageSection` wrapper is no longer used in this new layout — we render section headers + grids directly, via `SectionHeader`, `DisabledDrawer`, and `Thumb`. `StageSection.tsx` and its test can be deleted once the new shell is in place.

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`
- Modify: `src/components/editor/__tests__/EntryGrid.test.tsx`
- Delete: `src/components/editor/StageSection.tsx`
- Delete: `src/components/editor/__tests__/StageSection.test.tsx`

- [ ] **Step 1: Add new failing tests**

Add these `it(...)` blocks to `src/components/editor/__tests__/EntryGrid.test.tsx`. Leave the existing tests in place; they'll be adapted in step 3. Use `makeEntry` helpers already present in the file. Key additions:

```tsx
  it('renders Just arrived above In the slideshow when staging has items', () => {
    const entries = [
      makeEntry({ id: 'active1', position: 1, disabled: 0 }),
      makeEntry({ id: 'staging1', position: null, disabled: 0 }),
    ];
    render(<EntryGrid initialEntries={entries} />);
    const html = document.body.innerHTML;
    const idxStaging = html.indexOf('Just arrived');
    const idxActive = html.indexOf('In the slideshow');
    expect(idxStaging).toBeGreaterThan(-1);
    expect(idxActive).toBeGreaterThan(-1);
    expect(idxStaging).toBeLessThan(idxActive);
  });

  it('renders Just arrived below In the slideshow when staging is empty', () => {
    const entries = [makeEntry({ id: 'active1', position: 1, disabled: 0 })];
    render(<EntryGrid initialEntries={entries} />);
    const html = document.body.innerHTML;
    const idxStaging = html.indexOf('Just arrived');
    const idxActive = html.indexOf('In the slideshow');
    expect(idxActive).toBeGreaterThan(-1);
    expect(idxStaging).toBeGreaterThan(-1);
    expect(idxStaging).toBeGreaterThan(idxActive);
  });

  it('filters by title via the search input', () => {
    const entries = [
      makeEntry({ id: 'a', title: 'Beach at dawn', position: 1 }),
      makeEntry({ id: 'b', title: 'Kitchen sink', position: 2 }),
    ];
    render(<EntryGrid initialEntries={entries} />);
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), { target: { value: 'beach' } });
    expect(screen.getByText('Beach at dawn')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen sink')).toBeNull();
  });

  it('filters by transcript substring', () => {
    const entries = [
      makeEntry({ id: 'a', title: 'X', transcript: 'pad thai night', position: 1 }),
      makeEntry({ id: 'b', title: 'Y', transcript: 'lasagna sunday', position: 2 }),
    ];
    render(<EntryGrid initialEntries={entries} />);
    fireEvent.change(screen.getByPlaceholderText(/search titles/i), { target: { value: 'pad' } });
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.queryByText('Y')).toBeNull();
  });

  it('renders the disabled drawer collapsed by default with peek thumbs', () => {
    const entries = [
      makeEntry({ id: 'd1', position: null, disabled: 1 }),
      makeEntry({ id: 'd2', position: null, disabled: 1 }),
    ];
    render(<EntryGrid initialEntries={entries} />);
    expect(screen.getAllByTestId('drawer-peek-thumb')).toHaveLength(2);
  });

  it('density slider controls the active grid column count', () => {
    const entries = [makeEntry({ id: 'a', position: 1 })];
    const { container } = render(<EntryGrid initialEntries={entries} />);
    fireEvent.change(screen.getByLabelText(/grid density/i), { target: { value: '8' } });
    const grid = container.querySelector('[data-testid="entry-grid-active"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(8, 1fr)');
  });
```

Add `makeEntry` if it's not already in the file (if the existing suite uses a different constructor, adapt these tests to call it):

```tsx
function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'id',
    dropbox_path: '/a.jpg',
    title: 'Untitled',
    transcript: null,
    position: null,
    disabled: 0,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
    ...overrides,
  };
}
```

- [ ] **Step 2: Run new tests — expect fail**

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: all new tests FAIL.

- [ ] **Step 3: Rewrite `EntryGrid.tsx`**

Replace the file contents with the implementation below. Key elements:

- `useState` for `search`, `density` (default 6), `drawerOpen` (false).
- Compute `filteredActive`, `filteredStaging`, `filteredDisabled` from `entries` + `search`.
- Render: `<EditorMasthead>`, `<EditorToolbar>`, then a scroll container with: staging-first-if-hot → active → staging-if-empty → disabled drawer.
- Keep the existing drag-reorder behavior (still uses `@dnd-kit`). Adapt `SortableCard` and `StaticCard` to render a `<Thumb>` instead of the inline gray box.
- Add drag-multi: on `handleDragStart`, if the dragged id is in `selectedIds`, capture the full list into a ref; on drag-end, `arrayMove` all those ids to the drop target position in one go. (`@dnd-kit` itself doesn't bundle multi-item drag — we compute the new order ourselves and then POST the full list to `/api/edit/entries/reorder` as before.)
- For `Play slideshow`, open `/` in the current tab (`window.location.href = '/'` keeps it simple; or `router.push('/')` via `next/navigation` if preferred).

```tsx
'use client';

import { useMemo, useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { Entry, EntryStatus, getEntryStatus, isVideoFile } from '@/types';
import { EditorMasthead } from './EditorMasthead';
import { EditorToolbar, SectionKey } from './EditorToolbar';
import { SectionHeader } from './SectionHeader';
import { DisabledDrawer } from './DisabledDrawer';
import { SelectionBar } from './SelectionBar';
import { Thumb, ThumbEntry } from '@/components/ui/Thumb';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { EntryEditor } from './EntryEditor';
import { useToast } from '@/components/ui/Toast';
import { SECTION_IDS } from './shared';

interface EntryGridProps {
  initialEntries: Entry[];
}

function toThumbEntry(e: Entry): ThumbEntry {
  return {
    id: e.id,
    title: e.title ?? 'Untitled',
    year: e.created_at ? new Date(e.created_at).getFullYear() : null,
    kind: isVideoFile(e.dropbox_path) ? 'video' : 'photo',
    src: `/api/media/${e.id}`,
    hasNarration: !!e.has_narration,
    duration: null,
  };
}

function matchesSearch(e: Entry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if ((e.title ?? '').toLowerCase().includes(needle)) return true;
  if ((e.transcript ?? '').toLowerCase().includes(needle)) return true;
  if (e.created_at && new Date(e.created_at).getFullYear().toString().includes(needle)) return true;
  return false;
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState('');
  const [density, setDensity] = useState(6);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const movingIdsRef = useRef<string[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const active = useMemo(() => entries.filter((e) => getEntryStatus(e) === 'active'), [entries]);
  const staging = useMemo(() => entries.filter((e) => getEntryStatus(e) === 'staging'), [entries]);
  const disabled = useMemo(() => entries.filter((e) => getEntryStatus(e) === 'disabled'), [entries]);

  const fActive = useMemo(() => active.filter((e) => matchesSearch(e, search)), [active, search]);
  const fStaging = useMemo(() => staging.filter((e) => matchesSearch(e, search)), [staging, search]);
  const fDisabled = useMemo(() => disabled.filter((e) => matchesSearch(e, search)), [disabled, search]);

  const stagingHot = staging.length > 0;
  const openEntry = entries.find((e) => e.id === openEntryId) ?? null;

  function handleJump(key: SectionKey) {
    const id = SECTION_IDS[key];
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleSelection(entryId: string, shiftKey: boolean, sectionEntries: Entry[]) {
    const lastSelected = lastSelectedRef.current;
    lastSelectedRef.current = entryId;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelected) {
        const ids = sectionEntries.map((e) => e.id);
        const lastIdx = ids.indexOf(lastSelected);
        const currIdx = ids.indexOf(entryId);
        if (lastIdx !== -1 && currIdx !== -1) {
          const [a, b] = [Math.min(lastIdx, currIdx), Math.max(lastIdx, currIdx)];
          for (let i = a; i <= b; i++) next.add(ids[i]);
          return next;
        }
      }
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }

  function selectionCommonStatus(): EntryStatus | 'mixed' | null {
    const items = entries.filter((e) => selectedIds.has(e.id));
    if (items.length === 0) return null;
    const first = getEntryStatus(items[0]);
    return items.every((i) => getEntryStatus(i) === first) ? first : 'mixed';
  }

  async function handleBulkMove(target: EntryStatus) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/edit/entries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: target }),
          })
        )
      );
      const res = await fetch('/api/edit/entries');
      const data = await res.json();
      setEntries(data);
      clearSelection();
      const words: Record<EntryStatus, string> = {
        active: 'added to the slideshow',
        staging: 'moved to Just arrived',
        disabled: 'set aside',
      };
      showToast(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} ${words[target]}`, 'ok');
    } catch {
      showToast('Move failed', 'error');
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/edit/entries/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const entriesRes = await fetch('/api/edit/entries');
        setEntries(await entriesRes.json());
        showToast(`Synced — ${data.added ?? 0} new arrivals`, 'ok');
      } else {
        showToast('Sync failed', 'error');
      }
    } catch {
      showToast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveDragId(id);
    movingIdsRef.current = selectedIds.has(id) ? Array.from(selectedIds) : [id];
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    setActiveDragId(null);
    const moving = movingIdsRef.current ?? [dragged.id as string];
    movingIdsRef.current = null;
    if (!over || moving.length === 0) return;

    const overId = over.id as string;
    const previous = [...entries];
    // Reorder only the active list.
    const activeList = entries.filter((e) => getEntryStatus(e) === 'active');
    const rest = entries.filter((e) => getEntryStatus(e) !== 'active');
    const movingSet = new Set(moving);
    const stayActive = activeList.filter((e) => !movingSet.has(e.id));
    const movingActive = activeList.filter((e) => movingSet.has(e.id));
    const targetIdx = stayActive.findIndex((e) => e.id === overId);
    if (targetIdx === -1) return;
    const newActive = [
      ...stayActive.slice(0, targetIdx),
      ...movingActive,
      ...stayActive.slice(targetIdx),
    ];
    setEntries([...newActive, ...rest]);

    const orderedIds = newActive.map((e) => e.id);
    fetch('/api/edit/entries/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
      .then((r) => { if (!r.ok) throw new Error('Reorder failed'); })
      .catch(() => {
        setEntries(previous);
        showToast('Reorder failed', 'error');
      });
  }

  function handleEntryUpdated(updated: Entry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  const gridStyle = (cols: number) => ({
    display: 'grid' as const,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: cols >= 7 ? 14 : 20,
    marginBottom: 18,
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper)' }}>
      <EditorMasthead
        syncing={syncing}
        canPlay={active.length > 0}
        onSync={handleSync}
        onPlay={() => router.push('/')}
      />
      <EditorToolbar
        counts={{ active: active.length, staging: staging.length, disabled: disabled.length }}
        search={search}
        onSearchChange={setSearch}
        density={density}
        onDensityChange={setDensity}
        onJump={handleJump}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 100px' }}>
        {/* Staging — above Active when hot */}
        {stagingHot ? (
          <section id={SECTION_IDS.staging}>
            <SectionHeader
              id="sec-staging-header"
              label="Just arrived"
              count={staging.length}
              color="var(--color-staging)"
              hint={`${staging.length} waiting for review`}
              rightSlot={
                <Btn
                  kind="subtle"
                  onClick={async () => {
                    const ids = staging.map((e) => e.id);
                    await Promise.all(
                      ids.map((id) =>
                        fetch(`/api/edit/entries/${id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'active' }),
                        })
                      )
                    );
                    const res = await fetch('/api/edit/entries');
                    setEntries(await res.json());
                    showToast(`${ids.length} added to the slideshow`, 'ok');
                  }}
                >
                  Add all to slideshow
                </Btn>
              }
            />
            <div data-testid="entry-grid-staging" style={gridStyle(density)}>
              {fStaging.map((e) => (
                <Thumb
                  key={e.id}
                  entry={toThumbEntry(e)}
                  selected={selectedIds.has(e.id)}
                  multiSelectActive={selectedIds.size > 0}
                  onToggleSelect={(ev) => toggleSelection(e.id, (ev as unknown as { shiftKey: boolean }).shiftKey, staging)}
                  onOpen={() => setOpenEntryId(e.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Active */}
        <section id={SECTION_IDS.active}>
          <SectionHeader
            id="sec-active-header"
            label="In the slideshow"
            count={active.length}
            color="var(--color-accent)"
            hint="Drag to reorder"
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={active.map((e) => e.id)} strategy={rectSortingStrategy}>
              {fActive.length === 0 ? (
                <EmptyState
                  text={search ? 'Nothing matches your search.' : 'No photos in the slideshow yet.'}
                />
              ) : (
                <div data-testid="entry-grid-active" style={gridStyle(density)}>
                  {fActive.map((e, i) => (
                    <SortableThumb
                      key={e.id}
                      entry={e}
                      index={active.findIndex((a) => a.id === e.id) + 1}
                      selected={selectedIds.has(e.id)}
                      multiSelectActive={selectedIds.size > 0}
                      onOpen={() => setOpenEntryId(e.id)}
                      onToggleSelect={(ev) => toggleSelection(e.id, (ev as unknown as { shiftKey: boolean }).shiftKey, active)}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <Thumb
                  entry={toThumbEntry(entries.find((e) => e.id === activeDragId)!)}
                  selected
                  multiSelectActive
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        {/* Staging when empty — renders below Active */}
        {!stagingHot ? (
          <section id={SECTION_IDS.staging}>
            <SectionHeader
              id="sec-staging-empty"
              label="Just arrived"
              count={0}
              color="var(--color-staging)"
              hint="Nothing waiting"
            />
            <EmptyState text="New photos from family will show up here first, before they join the slideshow." />
          </section>
        ) : null}

        {/* Disabled drawer */}
        <DisabledDrawer
          entries={disabled}
          open={drawerOpen}
          onToggle={() => setDrawerOpen((o) => !o)}
        >
          <div style={gridStyle(density)}>
            {fDisabled.map((e) => (
              <Thumb
                key={e.id}
                entry={toThumbEntry(e)}
                selected={selectedIds.has(e.id)}
                multiSelectActive={selectedIds.size > 0}
                onToggleSelect={(ev) => toggleSelection(e.id, (ev as unknown as { shiftKey: boolean }).shiftKey, disabled)}
                onOpen={() => setOpenEntryId(e.id)}
              />
            ))}
          </div>
        </DisabledDrawer>
      </div>

      {selectedIds.size > 0 ? (
        <SelectionBar
          count={selectedIds.size}
          commonStatus={selectionCommonStatus() ?? 'mixed'}
          onMoveTo={handleBulkMove}
          onClear={clearSelection}
        />
      ) : null}

      {openEntry ? (
        <Modal onClose={() => setOpenEntryId(null)}>
          <EntryEditor
            entry={openEntry}
            hasNarration={!!openEntry.has_narration}
            onEntryUpdated={handleEntryUpdated}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function SortableThumb({ entry, index, selected, multiSelectActive, onOpen, onToggleSelect }: {
  entry: Entry;
  index: number;
  selected: boolean;
  multiSelectActive: boolean;
  onOpen: () => void;
  onToggleSelect: (ev: MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <Thumb
        entry={{
          id: entry.id,
          title: entry.title ?? 'Untitled',
          year: entry.created_at ? new Date(entry.created_at).getFullYear() : null,
          kind: isVideoFile(entry.dropbox_path) ? 'video' : 'photo',
          src: `/api/media/${entry.id}`,
          hasNarration: !!entry.has_narration,
          duration: null,
        }}
        index={index}
        showPosition
        draggable
        dragging={isDragging}
        selected={selected}
        multiSelectActive={multiSelectActive}
        onOpen={onOpen}
        onToggleSelect={onToggleSelect as unknown as (e: React.MouseEvent) => void}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        color: 'var(--color-ink3)',
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: 'var(--font-news)',
        marginBottom: 18,
      }}
    >
      {text}
    </div>
  );
}
```

- [ ] **Step 4: Delete the old StageSection files**

```bash
rm src/components/editor/StageSection.tsx src/components/editor/__tests__/StageSection.test.tsx
```

- [ ] **Step 5: Adapt or remove the obsolete existing EntryGrid tests**

Open `src/components/editor/__tests__/EntryGrid.test.tsx`. Any tests that assert on text like "Select all" (old toolbar), "Sync from Dropbox" (still works — same text), "Active"/"Staging"/"Disabled" (now "In the slideshow" / "Just arrived" / "Set aside") need to be updated. Tests that reference `StageSection` internals can be deleted. Leave the shift-click-range-select, drag-reorder-POST, and bulk-move tests but update selectors.

Run: `npx vitest run src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: the new tests PASS. Adapt selectors until all tests green.

- [ ] **Step 6: Ensure EntryGrid tests wrap renders in a `ToastProvider`**

Since `EntryGrid` now calls `useToast()`, every `render(<EntryGrid ... />)` in the test file must be wrapped:

```tsx
import { ToastProvider } from '@/components/ui/Toast';

function renderGrid(entries: Entry[]) {
  return render(<ToastProvider><EntryGrid initialEntries={entries} /></ToastProvider>);
}
```

Replace direct `render(<EntryGrid .../>)` calls with `renderGrid(...)`.

- [ ] **Step 7: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rewrite editor shell with new layout, search, density, drag-multi

- New EntryGrid composes EditorMasthead, EditorToolbar, SectionHeader,
  DisabledDrawer, SelectionBar, and Thumb.
- Client-side search filters title, transcript, and year.
- Density slider (4-8 cols) replaces the pixel slider.
- Just arrived section floats above In the slideshow when hot.
- Set aside is a collapsed-by-default drawer with a peek strip.
- Dragging a selected card moves the whole selection (drag-multi).
- Toasts fire on sync, bulk-move, and reorder failures.
- StageSection removed — headers rendered directly.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 21: Manual editor verification in the browser

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in (use dev-login) and open `/edit`. Verify:**

- Masthead: wordmark, tagline, `Sync from Dropbox` ghost button, `Play slideshow` primary button (disabled with zero active).
- Toolbar: three section-jump pills with mono counts. Just arrived pill is highlighted when you have staging items.
- Search pill: typing "beach" filters live across sections.
- Density slider 4–8 changes column count.
- Clicking "Just arrived" pill smooth-scrolls to that section.
- With zero staging: staging section renders below active, with the "New photos from family…" empty copy.
- With staging items: staging section floats above active with "Add all to slideshow" on the right.
- Disabled is a collapsed drawer with up to 8 grayscale peek thumbs; clicking expands.
- Drag a single active card: it reorders. Drag multiple after selecting: they move together.
- Shift-click ranges within a section still work.
- Bulk-move bar appears at bottom with status dots; destination matching selection's common status is disabled.
- Toasts appear top-center for sync and bulk moves.

- [ ] **Step 3: Stop dev server. No commit.**

---

## Increment 5 — Modal, Login, Cleanup

### Task 22: Extract `NarrationStudio` from `EntryEditor`

Pulls the narration state machine into its own component. Also its own tests.

**Files:**
- Create: `src/components/editor/NarrationStudio.tsx`
- Create: `src/components/editor/__tests__/NarrationStudio.test.tsx`
- Modify: `src/components/editor/EntryEditor.tsx` (use the new component)

- [ ] **Step 1: Read the current EntryEditor to understand the state machine**

Open `src/components/editor/EntryEditor.tsx` and study the narration state flow. Note:
- States: `noNarration | recording | uploading | transcribing | reviewing | hasNarration` (or whatever is currently used; use the exact set from the code).
- Which props and callbacks surface each state.
- How upload and transcription events transition state.

- [ ] **Step 2: Write failing tests for the extracted component**

Create `src/components/editor/__tests__/NarrationStudio.test.tsx`:

```tsx
/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NarrationStudio } from '../NarrationStudio';
import { Entry } from '@/types';

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    dropbox_path: '/x.jpg',
    title: 'X',
    transcript: null,
    position: 1,
    disabled: 0,
    has_narration: 0,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
    ...overrides,
  };
}

describe('NarrationStudio', () => {
  it('renders the Record helper copy in noNarration state', () => {
    render(<NarrationStudio entry={makeEntry()} hasNarration={false} onChange={() => {}} />);
    expect(screen.getByText(/speak as though telling a grandchild/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
  });

  it('renders a player and transcript in hasNarration state', () => {
    render(
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
});
```

- [ ] **Step 3: Run tests — verify fail**

Run: `npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Extract the component**

Create `src/components/editor/NarrationStudio.tsx`. Copy the narration-section JSX from `EntryEditor.tsx` verbatim and adapt:

- Component signature: `NarrationStudio({ entry, hasNarration, onChange })`. `onChange` reports updates back to the parent so it can merge into its Entry state. Preserve all fetch/upload calls (keep existing URLs like `/api/narration/...`, `/api/edit/narration/...`).
- Visual shell matches the design (boxed: `paper2` bg, `border-radius: 10px`, `1px` rule border, `padding: 18px`).
- Header row: mono `NARRATION` left; mono `{duration} · auto-transcribed` right when `hasNarration`.
- Copy the exact state-to-UI mapping from the spec:
  - `noNarration`: helper copy, accent Record button with mic icon.
  - `recording`: pulsing red dot + mono timer + fake waveform (48 accent bars) + danger Stop.
  - `uploading`: spinner + disabled "Uploading…" label.
  - `transcribing`: player with disabled scrubber + "Transcribing…" label.
  - `reviewing`: player + primary Keep + ghost Re-record.
  - `hasNarration`: player + Newsreader italic transcript in `"…"` + ghost Re-record + clear Remove.

Replace the old visual with `Btn`/`Icon`/palette tokens. Keep every fetch/upload/polling call as-is — moving code, not rewriting behavior.

- [ ] **Step 5: Use `NarrationStudio` inside `EntryEditor`**

In `EntryEditor.tsx`, delete the extracted narration JSX and its local state. Import and render `<NarrationStudio entry={...} hasNarration={...} onChange={(patch) => ...} />` in its place. Route any callbacks the old inline code used into `onChange`.

- [ ] **Step 6: Run tests — verify pass**

Run: `npx vitest run src/components/editor/__tests__/NarrationStudio.test.tsx`
Expected: PASS.
Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx`
Expected: PASS (existing tests should still cover narration flow; if a test directly asserted on the inline DOM structure, update it to use `NarrationStudio` output selectors).

- [ ] **Step 7: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: extract NarrationStudio from EntryEditor

State machine and fetch calls preserved; new visual shell matches the
design (paper2 panel, accent Record, danger Stop, Newsreader italic
transcript).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 23: Redesign `EntryEditor` modal body — two columns, serif-italic title, horizontal status pill, editable transcript

Replaces the modal body with the 2-column layout. Status pill does not close the modal and does not emit a toast.

**Files:**
- Modify: `src/components/editor/EntryEditor.tsx`
- Modify: `src/components/editor/__tests__/EntryEditor.test.tsx`

- [ ] **Step 1: Add failing tests**

Add these `it(...)` blocks to `EntryEditor.test.tsx` (wrap renders in `ToastProvider` if needed):

```tsx
  it('changing status does not close the modal or show a toast', async () => {
    const onEntryUpdated = vi.fn();
    // render EntryEditor inside a Modal wrapper if your existing test pattern does so.
    render(
      <ToastProvider>
        <EntryEditor
          entry={makeEntry({ position: 1, disabled: 0 })}
          hasNarration={false}
          onEntryUpdated={onEntryUpdated}
        />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /set aside/i }));
    // no toast
    expect(screen.queryByRole('status')).toBeNull();
    // onEntryUpdated is called (update still happens)
    await waitFor(() => expect(onEntryUpdated).toHaveBeenCalled());
  });

  it('renders the title input in serif-italic', () => {
    render(
      <ToastProvider>
        <EntryEditor
          entry={makeEntry({ title: "Nonna's kitchen" })}
          hasNarration={false}
          onEntryUpdated={() => {}}
        />
      </ToastProvider>
    );
    const input = screen.getByDisplayValue("Nonna's kitchen") as HTMLInputElement;
    const fontFamily = getComputedStyle(input).fontFamily;
    // the style prop sets var(--font-serif); getComputedStyle may return the raw var in jsdom.
    expect(input.style.fontFamily).toContain('var(--font-serif)');
    expect(input.style.fontStyle).toBe('italic');
  });

  it('editable transcript PUTs transcript to the entry API on blur', async () => {
    // mock fetch to capture the PUT.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'e1', transcript: 'new transcript' }), { status: 200 })
    );
    render(
      <ToastProvider>
        <EntryEditor
          entry={makeEntry({ has_narration: 1, transcript: 'old' })}
          hasNarration
          onEntryUpdated={() => {}}
        />
      </ToastProvider>
    );
    const textarea = screen.getByDisplayValue('old');
    fireEvent.change(textarea, { target: { value: 'new transcript' } });
    fireEvent.blur(textarea);
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map((c) => ({ url: c[0], init: c[1] as RequestInit | undefined }));
      const put = calls.find((c) => c.init?.method === 'PUT' && String(c.url).includes('/api/edit/entries/'));
      expect(put).toBeTruthy();
      expect(JSON.parse((put!.init!.body as string))).toEqual({ transcript: 'new transcript' });
    });
    fetchSpy.mockRestore();
  });
```

(Use `makeEntry` defined earlier, or define it again at the top of the file. Ensure `waitFor` is imported from `@testing-library/react`.)

- [ ] **Step 2: Run tests — verify fail**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx`
Expected: new tests FAIL.

- [ ] **Step 3: Rewrite the `EntryEditor` body**

Replace `src/components/editor/EntryEditor.tsx` with the new layout. Key details:

- Preserve the component signature `({ entry, hasNarration, onEntryUpdated })` — the parent still drives the modal.
- Two-column grid inside the `Modal` body (`1fr 380px` on widths ≥ 720px; fall back to single column below).
- Left column: dark ink bg; if `isVideoFile(dropbox_path)` render `<video controls src="/api/media/<id>" />` with `width: 100%`; otherwise render `<Photo src="/api/media/<id>" alt={title}>`. Show the `POSITION NN of MM` mono pill when the entry is active — take the active total from a new optional prop `activeCount?: number` and position from a new optional prop `activeIndex?: number`. Leave them as optional; `EntryGrid` will pass them in the next step.
- Right column, in order: meta row (mono year · kind + close button that calls `onClose` — accept `onClose?: () => void` and ignore if not provided, since the Modal wrapper handles Esc/backdrop), title input (Instrument Serif italic, 24px, rule bottom border, commits on blur or Enter via existing debounced autosave), horizontal status pill (Just arrived · In the slideshow · Set aside) using the same `PUT /api/edit/entries/:id { status }` call but **not emitting a toast and not closing the modal**, `NarrationStudio`, and (only when `entry.disabled === 0 && entry.position !== null`) a full-width primary `Open in slideshow` button that calls `router.push('/')`.
- **Transcript editing** in `hasNarration`: replace the static `<div>"...":</div>` with a `<textarea>` (Newsreader italic styling). On blur, if value changed, `PUT /api/edit/entries/:id { transcript }` and update local state via `onEntryUpdated`.

- [ ] **Step 4: Update `EntryGrid` to pass `activeCount` and `activeIndex`**

In `src/components/editor/EntryGrid.tsx`, when rendering the modal:

```tsx
{openEntry ? (
  <Modal onClose={() => setOpenEntryId(null)}>
    <EntryEditor
      entry={openEntry}
      hasNarration={!!openEntry.has_narration}
      activeCount={active.length}
      activeIndex={
        getEntryStatus(openEntry) === 'active'
          ? active.findIndex((e) => e.id === openEntry.id) + 1
          : undefined
      }
      onEntryUpdated={handleEntryUpdated}
      onClose={() => setOpenEntryId(null)}
    />
  </Modal>
) : null}
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npx vitest run src/components/editor/__tests__/EntryEditor.test.tsx src/components/editor/__tests__/EntryGrid.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: redesign entry modal with 2-column layout and editable transcript

- Serif-italic title input with rule underline.
- Horizontal status pill; changing status does not close the modal and
  does not emit a toast.
- POSITION NN of MM pill on active entries (passed from EntryGrid).
- Transcript becomes an editable textarea in hasNarration; blurs fire
  PUT /api/edit/entries/:id { transcript }.
- Open in slideshow button visible only for active entries.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 24: Restyle `/login` page

Visual only. Replace the form's wrapper, labels, inputs, and button with the new palette + typography. Keep logic, form names, and POST target untouched.

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Read the current login page**

Open `src/app/login/page.tsx` and identify: the form element, the password and TOTP inputs (field names), and the submit handler.

- [ ] **Step 2: Rewrite the UI only**

Keep all logic (state, submit handler, error handling). Wrap the form body in:

- Full-viewport paper background with a centered card (`max-width: 360px`, `padding: 32px`).
- Instrument Serif italic wordmark above the form (28px).
- Inter Tight labels (10px mono uppercase, letter-spacing 0.2, ink3) above each input.
- Inputs: transparent background, 1px rule bottom border, terracotta focus border, Inter Tight 14px.
- Submit: primary Btn (ink bg), full-width.
- Error message below the submit: terracotta text (13px).

Use `Btn` from `@/components/ui/Btn`. Do not introduce new libraries.

- [ ] **Step 3: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green. (If there's a login test, make sure the submit button is still locatable by `name`/`aria-label`.)

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "style: restyle /login with paper/ink palette

Visual-only restyle; logic, field names, and POST target unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 25: Cleanup — delete `SegmentedControl`

**Files:**
- Delete: `src/components/ui/SegmentedControl.tsx`
- Delete: `src/components/ui/__tests__/SegmentedControl.test.tsx`

- [ ] **Step 1: Check for remaining imports**

Run: `npx grep -rn "SegmentedControl" src` (or use the Grep tool)
Expected: no results after the modal redesign. If there are, update those imports to remove usage before deleting.

- [ ] **Step 2: Delete**

```bash
rm src/components/ui/SegmentedControl.tsx src/components/ui/__tests__/SegmentedControl.test.tsx
```

- [ ] **Step 3: Full suite + lint**

Run: `npm run test:run && npm run lint`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused SegmentedControl primitive

Replaced by the horizontal status pill inside EntryEditor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 26: Manual end-to-end verification

Final pass before declaring the redesign done.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: End-to-end checklist**

Sign in, then walk through:

- `/login`: paper bg, serif wordmark, form fields styled, submit primary, error in terracotta.
- `/` (viewer, signed in): warm vignette, serif caption, paper-cream play, idle-hide at 2.5s, `T`/`A` toggles.
- `/edit`: masthead, sticky toolbar with section pills, search filters live across title/transcript/year, density slider, Just arrived floats up when populated, drawer for Set aside with peek.
- Drag single: reorders. Drag multiple after selecting: moves together.
- Shift-click: extends selection within a section.
- Bulk-move bar: destination matching selection's common status disabled; toast on success.
- Click a card: modal opens with 2-column layout. Title is serif-italic. Status pill changes status without closing or toasting. Narration studio matches state-machine visuals. Transcript editable.
- Viewer toggle buttons `T` and `A` change state and persist across page reloads (existing `/api/settings`).

- [ ] **Step 3: Fix any issues discovered**

If something doesn't work, create a follow-up task in the task list and fix inline (iterate via subagent if you're in the subagent loop). Don't declare done until the list above passes.

- [ ] **Step 4: Stop dev server. No commit needed if nothing changed.**

---

## Self-Review

Spec-to-plan coverage:

- Foundation (tokens + typography + fonts): Tasks 1–2.
- Primitives (Photo, Icon, Pill, Btn, Toast, Thumb): Tasks 3–8.
- Viewer (warm vignette, caption, idle-hide 2.5s, toggles): Tasks 9–13.
- Editor (masthead, toolbar, section-jump, search, density, sections, drawer, drag-multi, bulk bar): Tasks 14–21.
- Modal (2-column, serif-italic title, horizontal status pill, NarrationStudio extraction, no-toast-no-close status change, editable transcript): Tasks 22–23.
- Login restyle: Task 24.
- Cleanup (SegmentedControl): Task 25.
- Manual verification: Tasks 13, 21, 26.

No placeholders. Type names consistent across tasks (`ThumbEntry`, `EntryStatus`, `SectionKey`). Fetch URLs match the existing route structure. `ToastProvider` is introduced before any consumer (Task 9, before Task 20).

Known risks captured in the spec's Risks section remain applicable. If during implementation you discover that `EntryEditor`'s narration flow uses different state names than assumed, preserve the code behavior verbatim and adapt the visual scaffolding only — the test for the extracted `NarrationStudio` only asserts on the visible UI in `noNarration` and `hasNarration` states, so internal naming is flexible.
