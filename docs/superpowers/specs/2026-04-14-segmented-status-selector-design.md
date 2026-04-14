# Segmented Status Selector

**Date:** 2026-04-14
**Status:** Approved

## Overview

Replace the `<select>` dropdown for entry status in the edit modal with a segmented pill control. The three options — Staging, Active, Disabled — are displayed as a connected horizontal button group with a filled highlight on the selected value.

## Component

A new `SegmentedControl` component is extracted to `src/components/ui/SegmentedControl.tsx`.

### Props

```ts
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}
```

### Appearance

- Renders as a single connected pill: `border border-gray-700 rounded-lg overflow-hidden flex`
- Selected segment: `bg-blue-600 text-white`
- Unselected segments: `bg-gray-800 text-gray-400 hover:text-gray-200`
- Segments separated by `border-l border-gray-700` dividers
- Each segment is a `<button type="button">` with `px-4 py-2` padding

### Behavior

Each button calls `onChange` with its value on click. No internal state — fully controlled. No debounce needed; the existing autosave `useEffect` in `EntryEditor` handles persistence.

## Integration in EntryEditor

The `<select>` block at lines 204–219 of `src/components/editor/EntryEditor.tsx` is replaced with `<SegmentedControl>`.

Option order: **Staging → Active → Disabled**

```tsx
<SegmentedControl
  options={[
    { value: 'staging', label: 'Staging' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
  ]}
  value={status}
  onChange={(val) => setStatus(val)}
/>
```

The `<label>` element above the control is retained as-is.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/SegmentedControl.tsx` | New component |
| `src/components/editor/EntryEditor.tsx` | Replace `<select>` with `<SegmentedControl>` |
