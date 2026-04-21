---
title: Memory Lane — UI Redesign
date: 2026-04-21
purpose: Design spec for the full UI-layer redesign of Memory Lane, replacing the current visual language with the "refined" synthesis from the Claude Design handoff bundle.
source: /tmp/design_extract/memory-lane/ (chat transcript + Memory Lane - Prototype.html + refined.jsx + current-ux-design.md)
---

## Goals

- Replace the entire UI with a warm, paper-and-ink visual language that gives the app its own identity.
- Keep the underlying product: narrated photo/video slideshow with a public Viewer at `/` and a password-protected Editor at `/edit`.
- Preserve all current functionality (auth, Dropbox sync, narration pipeline, status model, drag-reorder, multi-select, bulk moves, settings persistence).
- Introduce a small number of new UX behaviors that the design implies: section-jump pills, client-side search, column-count density slider, "Just arrived" floats to the top when hot, "Set aside" demoted to a drawer, drag-multi for selected cards, and a new NarrationStudio visual treatment.
- No backend, API, DB schema, or middleware changes in this scope. Anything that would benefit from a backend change is captured in the Follow-ups section.

## Non-goals

- No redesign of the `/login` functional flow (restyle only).
- No mobile/touch-specific work. Desktop-first, as today.
- No Storybook, design-system package, or CSS-in-JS migration. Tailwind + CSS variables + inline styles for truly dynamic values only.
- No new icon library; reuse the prototype's inline SVG icon set.
- No backend changes. Viewer settings already persist server-side; editor-local state stays session-only.

## Architecture & increments

Work proceeds in five ordered increments. Each lands as its own PR in a shippable state.

1. **Foundation.** Tailwind theme overhaul, Google Fonts in `layout.tsx`, CSS variables in `globals.css`. Adds `font-news` family key for Newsreader. No visible change on its own — existing components still render with their old classes.
2. **Primitives.** `src/components/ui/`: `Photo`, `Icon`, `Pill`, `Btn`, `Toast`/`ToastProvider`, `Thumb`. Unit-tested in isolation. Not yet consumed.
3. **Viewer** (`/`). `Slideshow`, `MediaDisplay`, `NarrationPlayer`, `ViewerControls` rebuilt against the new design. Behavior preserved (keyboard map, settings API, idle-hide), visuals match the refined synthesis.
4. **Editor** (`/edit`). `EntryGrid` rebuilt into the new shell: masthead + sticky toolbar (section-jump pills, search, density slider) + three sections with new ordering/drawer behavior + restyled bulk action bar + drag-multi.
5. **Modal + Login.** `EntryEditor` rebuilt as the two-column modal with the NarrationStudio state machine and horizontal status pill. `/login` restyled only.

Legacy components may be deleted once the matching increment lands. The unused `src/components/ui/SegmentedControl.tsx` is removed in increment 5 (or earlier if convenient).

## Design tokens

CSS variables in `src/app/globals.css`:

```
--paper:#f7f0e3        --paper2:#efe5cf       --paper3:#e5d7b8
--ink:#2b1e12          --ink2:#5a4431         --ink3:#8d755a        --ink4:#b8a78b
--rule:#d9c9a8         --rule2:#c8b58e
--accent:#b14a2a       --accent-hot:#c85a38   --accent-soft:rgba(177,74,42,0.08)
--staging-color:#4a5d3a
--disabled-color:#8d755a
--viewer-bg:#120b06
```

### Typography

Fonts loaded once via Google Fonts link in `layout.tsx`:
- **Instrument Serif** (italic) — display titles, section headers, wordmark, modal title input
- **Inter Tight** (300–700) — buttons, inputs, labels, card titles, body default
- **JetBrains Mono** (400/500) — counters, timestamps, position tags, metadata pills (10–11px, letter-spacing 0.15–0.2, often uppercase)
- **Newsreader** (400/500 + italics) — transcripts, long reading

Tailwind `fontFamily` mapping:
- `font-serif` → Instrument Serif
- `font-sans` → Inter Tight (body default)
- `font-mono` → JetBrains Mono
- `font-news` → Newsreader (new custom key)

No `f-*` utility aliases; use native Tailwind classes throughout.

### Spacing / rhythm

- Masthead padding: `16px 32px`.
- Section header: `padding: 24px 0 14px`, `border-bottom: 1px solid var(--rule)`, `margin-bottom: 18px`.
- Grid gap: `20px` for densities 4–6, `14px` for 7–8.
- Modal content: `padding: 20px 22px`, vertical `gap: 16px`.
- Card title region padding-top: `7px`.

## Shared primitives (`src/components/ui/`)

All primitives are thin React components with no data-fetching or store awareness. Behavior is passed via props. Each has its own Vitest unit test.

### `Photo`

Reusable media frame. Accepts a real image URL; falls back to the prototype's HSL gradient placeholder when no `src`.

```
Props: {
  src?: string;
  alt?: string;
  hue?: number;             // for placeholder mode
  tone?: 'warm' | 'cool' | 'dusk' | 'rose' | 'gray';
  rounded?: number;         // px
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
```

- With `src`: renders an `<img>` with `object-fit: cover` inside a positioned container.
- Without `src` (dev placeholders only): renders the radial HSL gradient from `proto/ui.jsx`.
- Thin repeating-diagonal grain overlay via `::before` (subtle film-grain feel; `rgba(255,255,255,0.04)` stripes at 135°).

### `Icon`

Stroke-based inline SVG. Icon set mirrors the prototype's: `play`, `pause`, `prev`, `next`, `mic`, `stop`, `check`, `x`, `chev`, `chevR`, `chevL`, `sync`, `search`, `grid`, `drag`, `trash`, `sound`, `eye`, `rotate`, `arrow`.

```
Props: { name, size?: number, stroke?: string, sw?: number, style?: CSSProperties, className?: string }
```

Default `size = 14`, `sw = 1.5`, `stroke = 'currentColor'`. `strokeLinecap` and `strokeLinejoin` are `round`.

### `Pill`

Rounded label with optional dot + count.

```
Props: { children, bg?, fg?, dot?, count?, style?, className? }
```

Used for section-jump tabs (in the editor toolbar), status badges, and small counter labels.

### `Btn`

Six variants, all rounded-full, `12px / 500`, `padding: 8px 14px`:

- `primary` — ink bg, paper text
- `accent` — terracotta bg, paper text
- `danger` — red-brown bg, paper text
- `ghost` — transparent, paper2 border (rule)
- `subtle` — paper2 bg, ink2 text
- `clear` — transparent, muted ink text, no border

Accepts `children`, `onClick`, `disabled`, `title`, `style`, `className`.

### `Toast` + `ToastProvider`

- `ToastProvider` hoisted to `layout.tsx` (for editor + modal) and to the viewer root (for standalone viewer use). Exposes `showToast(msg, kind)` via a `useToast` hook.
- Three kinds: `info` (ink), `ok` (moss), `error` (terracotta-red).
- Auto-dismiss after 2.6s.
- Fixed top-center position, rounded-full pill, `box-shadow: 0 10px 30px rgba(0,0,0,0.2)`, `z-index: 100`.

### `Thumb`

The reusable grid card.

```
Props: {
  entry: Entry;
  index?: number;                    // 1-based for position tag
  showPosition?: boolean;
  selected: boolean;
  multiSelectActive: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onOpen?: () => void;
  onToggleSelect?: (e: MouseEvent) => void;
  onDragStart?, onDragOver?, onDrop?, onDragEnd?
}
```

- `4/3` aspect ratio photo, rounded-md, `1px` rule outline (terracotta when `selected` or `dragOver`).
- Position tag in top-left when `showPosition`: mono `01`, dark translucent backdrop, `backdrop-blur-sm`.
- Bottom-right tag: `▶ m:ss` for video, `🔊 m:ss` for photo-with-narration.
- Checkbox in top-right appears on hover or when `multiSelectActive`. Persists visibly once anything is selected anywhere on the page.
- Drag-handle in top-left appears on hover when `draggable && !selected`.
- Below the image: title in Inter Tight 12/500 with ellipsis, year in mono 9px ink3.
- Opacity drops to 0.3 when `dragging`.

## Viewer (`/`)

### Behavior preserved

- Keyboard: `←/↑` prev, `→/↓` next, Space/Enter toggle narration, `A` toggle auto-advance, `T` toggle titles, Esc exits to `/edit`.
- Auto-advance pauses during narration, resumes on narration-end; for videos, waits for video to finish.
- Settings persisted via existing `/api/settings` endpoint; `useViewerSettings` hook unchanged.
- Narration audio: existing pipeline. Video entries: narration on left channel, video audio on right.
- Idle-hide timer: **2.5s** (was 3s). Changed to match design spec.

### Layout

- Full-bleed dark stage (`#0d0805`) with a **warm vignette**:
  - Base: `radial-gradient(ellipse at center, transparent 50%, rgba(26,12,4,0.5) 100%)`
  - Warm wash 1 (terracotta): `radial-gradient(circle at 18% 8%, rgba(177,74,42,0.10) 0%, transparent 40%)`
  - Warm wash 2 (paper3): `radial-gradient(circle at 85% 92%, rgba(212,165,116,0.08) 0%, transparent 42%)`
- Top chrome (fades on idle): left "← Back to editor" link in `rgba(247,240,227,0.6)`, right mono counter `06 of 08`. Gradient dim from top via `linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)`.
- Stage: media `max-width: 1100px`, `aspect-ratio: 4/3`, `max-height: 78vh`, `border-radius: 4px`, `box-shadow: 0 40px 100px rgba(0,0,0,0.55)`.
- Prev/next: 46px circular frosted buttons (`rgba(247,240,227,0.08)`, `backdrop-filter: blur(8px)`) at vertical midpoint.
- Caption region (below stage, centered, `max-width: 900px`):
  - Instrument Serif italic title, 38px, `letter-spacing: -0.3`, paper cream.
  - Mono meta line below: `2014 · photograph · narration 1:58` (narration duration only when present).
- Bottom chrome (fades on idle):
  - Play/pause: 44px circle, paper-cream bg, ink icon.
  - Scrubber: 2–3px track in `rgba(247,240,227,0.1)`, filled in `--accent-hot`, draggable handle with a terracotta-soft halo.
  - Right: Titles (T) and Auto-advance (A) toggle pills. Each shows the key letter in mono. Active pill: `rgba(255,255,255,0.15)` bg.
  - Mono time display, muted paper.

### Titles toggle

The prototype renders a separate mid-screen black title label when `showTitles && isNarrationPlaying`. The redesign drops that overlay — the title is already in the caption region below the stage. When `showTitles` is true, the caption shows; when false, it hides.

### Transcript in viewer

Not rendered in viewer chrome. (Prototype shows a truncated transcript bottom-right; skipped here to keep media-forward.)

## Editor (`/edit`)

### Layout

Flex column filling the viewport:

1. **Masthead** (`~64px`, `padding: 16px 32px`, `border-bottom: 1px solid var(--rule)`).
   - Left: "Memory Lane" wordmark in Instrument Serif italic (22–28px). Then a divider rule. Then a small mono tagline "Editing · <session user name>" (uppercase, letter-spacing 0.2, ink3). If no user-name surface is wired, render "Editing".
   - Right: `Sync from Dropbox` (ghost button, sync icon). Then `Play slideshow` (primary, play icon). Disabled when `active.length === 0`. Clicking opens `/` at the first active entry.
2. **Secondary toolbar** (`~48px`, sticky, `padding: 10px 32px`, `border-bottom: 1px solid var(--rule)`).
   - Left: three section-jump pills.
     - "In the slideshow" (terracotta dot) · "Just arrived" (moss dot, highlighted when staging is non-empty — terracotta-soft bg + 1px accent border) · "Set aside" (disabled-ink dot).
     - Each renders label + mono count (`00`-padded).
     - Click → smooth-scroll to that section's header.
   - Right: search pill (paper2 bg, 260px wide, search icon, placeholder "Search titles, transcripts, years…", × clears when non-empty). Divider rule. Density slider (`<input type="range" min=4 max=8 step=1>`, accent-color terracotta), grid icon, mono value readout.
3. **Scroll area** (fills remaining height, `padding: 0 32px 100px`).

### Sections (inside scroll area)

**Just arrived** (staging):
- When **non-empty**: renders **above** Active. Subheader note shows count + `"N waiting for review"`. Right-slot: "Add all to slideshow" (subtle button) that bulk-promotes all staging items to active.
- When **empty**: renders **below** Active with a quiet empty-state: *"New photos from family will show up here first, before they join the slideshow."*
- Always expanded; no chevron.

**In the slideshow** (active):
- Always expanded; no chevron.
- Subheader note: "Drag to reorder".
- Empty-unfiltered: *"No photos in the slideshow yet."*
- Empty-filtered: *"Nothing matches your search."*

**Set aside** (disabled):
- Drawer pattern. Collapsed by default.
- Collapsed: a peek row showing up to 8 grayscale thumbnails at 80×60, plus a muted "Click to open" hint. Click row or header to open.
- Expanded: full grid. Chevron rotates.
- Subheader note: `{count} · hidden from slideshow`.

Section headers: 10px color dot + Instrument Serif italic label (26px) + mono count + optional meta + flex spacer + optional right-slot button.

### Grid cells

`Thumb` primitive, column count from density. Active cards set `draggable`, `showPosition`, and the drag handlers. Staging and Disabled cards are selectable and clickable but not draggable.

### New UX behaviors

- **Client-side search** (session-only state). Matches `title`, `year` (as string substring), and `transcript` (case-insensitive). Filters per-section. Empty-filtered sections show the filter-aware empty copy.
- **Density** (4–8 cols, default 6, session-only). Replaces the pixel slider.
- **Section-jump**: `document.getElementById(id).scrollIntoView({behavior:'smooth', block:'start'})`.
- **Drag-multi** (Active only):
  - On drag-start: if the dragged card's id is in `selectedIds`, all selected entries come along. Else only the dragged card moves.
  - On drop: the reorder API receives the full list of moving ids in the desired order. The existing `PUT /api/edit/entries/reorder` accepts the whole new active-ordered list, so we continue to send the full ordered list; the difference is purely client-side rearrangement before posting.
- **Staging floats up when hot**: implemented by swapping section render order based on `staging.length > 0`.
- **Bulk action bar** (existing, restyled): ink-black pill, centered, `bottom: 24px`. "N selected", divider, "Move to:" label, three destination buttons (color-dot + label), ✕ clear. Destination matching selection's common status is disabled; mixed-status → all enabled. Toast on move: `"N entries added to the slideshow"` / `moved to Just arrived` / `set aside`.

### Behaviors retained from current code

- Shift-click range-select within a section.
- 8px drag threshold differentiates tap-to-open from drag-to-reorder.
- Optimistic drag-reorder with server rollback on error.
- Click a card body → open modal (local state; no URL change).

### Behaviors dropped from current code

- Collapse chevrons on Active and Staging (they are always expanded; only Set-aside collapses).
- The "Select all" button that currently appears only when selection is non-empty. Replace with per-section "select all" in the section header right-slot.
- Pixel-based thumbnail slider. Replace with column-count density (4–8).
- All blue/gray color treatment.

## Entry modal

Opens when a thumbnail is clicked, via local state (no URL change; already current behavior). Escape, backdrop click, and the × close it. Clicking another thumbnail while open replaces its content with that entry.

### Layout

- Backdrop: `rgba(43,30,18,0.55)` + `backdrop-filter: blur(4px)`, fixed inset 0, z-index 50.
- Modal: paper bg, `border-radius: 12px`, `max-width: 900px`, `max-height: calc(100vh - 48px)`, `grid-template-columns: 1fr 380px`, `box-shadow: 0 30px 80px rgba(0,0,0,0.4)`.

### Left column — preview

Dark ink background. For photos: media fills the column, min-height 480px. For videos: `<video controls>` with `src="/api/media/:id"`. When the entry is Active, a small mono pill `POSITION 07 of 42` at top-left of the preview.

### Right column — editor panel

`padding: 20px 22px`, scrollable, `gap: 16px`:

1. **Meta row** — mono uppercase `<year> · <kind>` left; close × right.
2. **Title** — Instrument Serif italic input, 24px, transparent bg, 1px rule bottom border that turns terracotta on focus. Commits on blur or Enter. Uses existing debounced autosave.
3. **Status (horizontal segmented pill)** — 3 segments with color dots: Just arrived · In the slideshow · Set aside. Selected segment fills with its dot color + paper-cream text; unselected segments are neutral over a `paper2` track. Clicking a segment calls existing `PUT /api/edit/entries/:id { status }`. **Does not close the modal, does not emit a toast.**
4. **Narration studio** — see state machine below.
5. **"Open in slideshow"** — primary ink button, full-width; visible only when `status === 'active'`. Closes modal and navigates to `/` at the current entry.

### Narration state machine

Six states (existing); visual treatment is boxed: `paper2` bg, `border-radius: 10px`, `1px` rule border, `padding: 18px`.

Header: mono `NARRATION` label left. Mono `{duration} · auto-transcribed` right (only in `hasNarration`).

| State | Body |
|---|---|
| `noNarration` | Helper copy (*"Record a short story to play alongside this photo. Tip: speak as though telling a grandchild what was happening that day."*) + accent `Record` button with mic icon. |
| `recording` | Pulsing red dot + big mono timer + fake waveform (48 accent-color bars, height sinusoidal with elapsed time) + danger `Stop` button. |
| `uploading` | Spinner + muted "Uploading…" disabled state. Preserves existing behavior. |
| `transcribing` | Player visible but audio scrubber disabled; "Transcribing…" label. |
| `reviewing` | Player (play/pause circle + scrubber) + primary `Keep` + ghost `Re-record`. |
| `hasNarration` | Player + transcript in Newsreader italic below, wrapped in `"…"` + ghost `Re-record` + clear `Remove`. |

### Transcript editability

The design spec synthesis calls transcripts "auto-generated, editable text". The implementation:
- If the existing `PUT /api/edit/entries/:id` already accepts a `transcript` field: make the transcript an in-place click-to-edit with debounced save.
- If not: render read-only for now and capture the API change as a follow-up. Verify during implementation of increment 5.

### What is removed

- `src/components/ui/SegmentedControl.tsx` (unused after the modal redesign; delete in increment 5).
- The `/edit/[id]` route (already removed — confirming).

## Login (`/login`)

Functional flow unchanged. Visual restyle only:
- Paper bg, Instrument Serif italic wordmark centered above the form.
- Inter Tight labels, ghost-bordered inputs with terracotta focus state.
- Ink-black primary submit button.
- Error messages: terracotta text below the field.
- Password + TOTP fields retain their current names/validation.

## Testing strategy

TDD (red/green) for behavior; pure-visual refactors get one smoke test per surface + a manual browser check.

### Primitives (increment 2)

Vitest + Testing Library:
- `Photo`: renders `<img>` with `src`; renders placeholder gradient without `src`; applies `rounded`.
- `Icon`: renders the requested symbol; respects `size` and `stroke`.
- `Pill`: renders children + optional dot + optional count.
- `Btn`: each variant applies expected classes; `disabled` prevents clicks.
- `Toast`/`ToastProvider`: `showToast` renders a toast; auto-dismisses at 2.6s (fake timers); kind maps to background.
- `Thumb`: position tag visible only with `showPosition`; selection outline; checkbox visibility rules (hover, multiSelectActive, selected); drag-handle visibility (hover + draggable + !selected); dragging/dragOver visual states.

### Viewer (increment 3)

Adapt existing keyboard/idle-hide/auto-advance tests to the new DOM. Add:
- Idle-hide timer fires at 2.5s (changed from 3s).
- Title toggle hides/shows the caption title (not an overlay).

### Editor (increment 4)

TDD for new behaviors. Adapt existing shift-click/bulk-move tests.
- Search filters across title, year, and transcript.
- Density slider maps 4–8 → column count in the grid template.
- Section-jump scroll: clicking pill triggers `scrollIntoView` on the right section id.
- Staging-floats-up: with `staging.length > 0`, staging section DOM order precedes active.
- Disabled drawer: collapsed by default; clicking toggles; chevron rotates; peek row shows up to 8 thumbs.
- Drag-multi: dragging a selected card moves all selected; dragging an unselected card moves just that card (selection unchanged).
- Bulk action bar: destination matching selection's common status is disabled; mixed-status → all enabled; toast on success.

### Modal (increment 5)

Adapt existing narration-state and status-change tests.
- Status change does **not** close the modal and does **not** emit a toast.
- Transcript edit (only if backend supports — otherwise skip and note follow-up).

### Login (increment 5)

Smoke test: submit posts to the auth endpoint. Visual-only otherwise.

### Out of scope for tests

- No e2e / Playwright. Vitest + RTL only.
- No visual regression tool. Manual browser check required per increment (golden path + edge cases) per CLAUDE.md.

## Follow-ups (not in this scope)

- **Persist editor-local state** (density, section-jump last target, disabled-drawer open/close) across sessions — small `localStorage` change or, if preferred, a new user-preferences endpoint. Session-only today.
- **Transcript editing API** — if `PUT /api/edit/entries/:id` doesn't accept a `transcript` field, add it. Discovered during increment 5 implementation.
- **"Sync from Dropbox" progress indicator** — design suggests a toast/pill treatment; current inline text is retained. A real progress bar (WebSocket or polling) is a separate effort.
- **Mobile / touch layout** — not addressed. Current app is desktop-only.
- **Server-side viewer settings** — auto-advance and titles already persist server-side; editor-local state may want to follow the same pattern if usage suggests it.

## Risks and notes

- **First increment produces no visible change.** Accepted trade-off (per brainstorming discussion). Foundation layer is low-risk; primitives layer is tested in isolation.
- **Tailwind theme change affects every existing page simultaneously.** If a legacy component relies on an old color name, it may render wrong until its increment ships. Mitigation: keep the legacy Tailwind colors available under their current names in `tailwind.config` during the transition; remove them in increment 5 cleanup.
- **Drag-multi semantics** depend on selection state at drag-start only. If the user selects more items mid-drag, they are not pulled in. Consistent with the prototype.
- **The `useViewerSettings` hook + `/api/settings` pipeline is preserved**; no schema change.
