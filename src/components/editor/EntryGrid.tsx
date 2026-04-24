'use client';

import React, { useMemo, useState, useRef } from 'react';
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
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
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

function getDropboxSize(density: number): string {
  if (density >= 7) return 'w480h320';
  if (density >= 5) return 'w640h480';
  return 'w960h640';
}

function toThumbEntry(e: Entry, density?: number): ThumbEntry {
  const dbSize = density ? getDropboxSize(density) : null;
  return {
    id: e.id,
    title: e.title ?? 'Untitled',
    year: e.created_at ? new Date(e.created_at).getFullYear() : null,
    kind: isVideoFile(e.dropbox_path) ? 'video' : 'photo',
    src: `/api/media/${e.id}`,
    thumbSrc: dbSize ? `/api/media/${e.id}?size=${dbSize}` : undefined,
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

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
    // Prevent default browser selection when shift-clicking
    if (shiftKey) {
      window.getSelection()?.removeAllRanges();
    }
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
      .then((r) => {
        if (!r.ok) throw new Error('Reorder failed');
      })
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
        onLogout={handleLogout}
      />
      <EditorToolbar
        counts={{ active: active.length, staging: staging.length, disabled: disabled.length }}
        search={search}
        onSearchChange={setSearch}
        density={density}
        onDensityChange={setDensity}
        onJump={handleJump}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 100px', userSelect: 'none' }}>
        {/* Staging — Always at top */}
        <section id={SECTION_IDS.staging}>
          <SectionHeader
            id="sec-staging-header"
            label="Just arrived"
            count={staging.length}
            color="var(--color-staging)"
            hint={staging.length === 0 ? 'Nothing waiting for review' : `${staging.length} waiting for review`}
            rightSlot={
              staging.length > 0 ? (
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
              ) : null
            }
          />
          {staging.length > 0 && (
            <div data-testid="entry-grid-staging" style={gridStyle(density)}>
              {fStaging.map((e) => (
                <Thumb
                  key={e.id}
                  entry={toThumbEntry(e, density)}
                  selected={selectedIds.has(e.id)}
                  multiSelectActive={selectedIds.size > 0}
                  onToggleSelect={(ev) => toggleSelection(e.id, ev.shiftKey, staging)}
                  onOpen={() => setOpenEntryId(e.id)}
                />
              ))}
            </div>
          )}
        </section>

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
                  {fActive.map((e) => (
                    // use full active[], not fActive, so index reflects real slideshow position
                    <SortableThumb
                      key={e.id}
                      entry={e}
                      density={density}
                      index={active.findIndex((a) => a.id === e.id) + 1}
                      selected={selectedIds.has(e.id)}
                      multiSelectActive={selectedIds.size > 0}
                      onOpen={() => setOpenEntryId(e.id)}
                      onToggleSelect={(ev) => toggleSelection(e.id, ev.shiftKey, active)}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <Thumb
                  entry={toThumbEntry(entries.find((e) => e.id === activeDragId)!, density)}
                  selected
                  multiSelectActive
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

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
                entry={toThumbEntry(e, density)}
                selected={selectedIds.has(e.id)}
                multiSelectActive={selectedIds.size > 0}
                onToggleSelect={(ev) => toggleSelection(e.id, ev.shiftKey, disabled)}
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
          {/* activeIndex uses full active[], not fActive: real slideshow position, not filtered position */}
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
    </div>
  );
}

function SortableThumb({ entry, index, selected, multiSelectActive, onOpen, onToggleSelect, density }: {
  entry: Entry;
  index: number;
  selected: boolean;
  multiSelectActive: boolean;
  onOpen: () => void;
  onToggleSelect: (ev: React.MouseEvent) => void;
  density: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onMouseDown={(e) => {
        if (e.shiftKey) {
          e.preventDefault();
        }
        // dnd-kit listeners might also have onMouseDown
        if (listeners && listeners.onMouseDown) {
          listeners.onMouseDown(e);
        }
      }}
    >
      <Thumb
        entry={toThumbEntry(entry, density)}
        index={index}
        showPosition
        draggable
        dragging={isDragging}
        selected={selected}
        multiSelectActive={multiSelectActive}
        onOpen={onOpen}
        onToggleSelect={onToggleSelect}
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
