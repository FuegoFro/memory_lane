# Fix shift-click bulk select issue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent default browser text/image selection when shift-clicking items in the EntryGrid.

**Architecture:** Add `user-select: none` to the EntryGrid container and ensure `onMouseDown` prevents default for shift-clicks in both `EntryGrid.tsx` and `Thumb.tsx`.

**Tech Stack:** React (Next.js), CSS

---

### Task 1: Update Thumb component to prevent selection

**Files:**
- Modify: `src/components/ui/Thumb.tsx`

- [ ] **Step 1: Add onMouseDown to the checkbox to prevent selection on shift-click**
- [ ] **Step 2: Add `userSelect: 'none'` to the outer container of the Thumb**

### Task 2: Update SortableThumb in EntryGrid

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

- [ ] **Step 1: Add `userSelect: 'none'` to the SortableThumb wrapper**
- [ ] **Step 2: Add `onMouseDown` to the SortableThumb wrapper to prevent selection on shift-click**

### Task 3: Add user-select: none to the grid sections

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

- [ ] **Step 1: Add `userSelect: 'none'` to the main grid container that holds all sections**

### Task 4: Verification

- [ ] **Step 1: Verify that single clicks still open the editor**
- [ ] **Step 2: Verify that shift-clicking selects multiple items without triggering browser selection**
- [ ] **Step 3: Verify that drag-and-drop still works for active entries**
