'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Entry, getEntryStatus, EntryStatus } from '@/types';
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
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { StageSection } from './StageSection';

interface CardProps {
  entry: Entry;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelection: (id: string, shiftKey: boolean) => void;
}

function SortableCard({ entry, isSelected, hasSelection, onToggleSelection }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.3 : undefined,
      }}
      {...attributes}
      {...listeners}
      className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all cursor-grab active:cursor-grabbing"
    >
      <div
        className={`absolute top-2 left-2 z-10 ${
          hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(entry.id, e.shiftKey);
          }}
          className="w-5 h-5 rounded cursor-pointer accent-blue-500"
        />
      </div>
      <Link href={`/edit/${entry.id}`} className="block">
        <img
          src={`/api/media/${entry.id}`}
          alt={entry.title || 'Entry thumbnail'}
          className="w-full aspect-square object-cover"
        />
        <div
          data-testid="entry-overlay"
          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
        >
          <span className="text-white font-medium text-center line-clamp-2">
            {entry.title || 'Untitled'}
          </span>
        </div>
      </Link>
    </div>
  );
}

function StaticCard({ entry, isSelected, hasSelection, onToggleSelection }: CardProps) {
  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all">
      <div
        className={`absolute top-2 left-2 z-10 ${
          hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(entry.id, e.shiftKey);
          }}
          className="w-5 h-5 rounded cursor-pointer accent-blue-500"
        />
      </div>
      <Link href={`/edit/${entry.id}`} className="block">
        <img
          src={`/api/media/${entry.id}`}
          alt={entry.title || 'Entry thumbnail'}
          className="w-full aspect-square object-cover"
        />
        <div
          data-testid="entry-overlay"
          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
        >
          <span className="text-white font-medium text-center line-clamp-2">
            {entry.title || 'Untitled'}
          </span>
        </div>
      </Link>
    </div>
  );
}

interface EntryGridProps {
  initialEntries: Entry[];
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({ active: false, staging: false, disabled: false });
  const lastSelectedRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeEntries = entries.filter((e) => getEntryStatus(e) === 'active');
  const stagingEntries = entries.filter((e) => getEntryStatus(e) === 'staging');
  const disabledEntries = entries.filter((e) => getEntryStatus(e) === 'disabled');
  const activeEntryIds = activeEntries.map((e) => e.id);

  function toggleCollapse(status: EntryStatus) {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/edit/entries/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Added ${data.added} new entries`);
        const entriesRes = await fetch('/api/edit/entries');
        const entriesData = await entriesRes.json();
        setEntries(entriesData);
      } else {
        setSyncResult('Sync failed');
      }
    } catch {
      setSyncResult('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    const previousEntries = [...entries];
    const newEntries = arrayMove(entries, oldIndex, newIndex);
    setEntries(newEntries);

    const orderedIds = newEntries
      .filter((e) => getEntryStatus(e) === 'active')
      .map((e) => e.id);

    fetch('/api/edit/entries/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Reorder failed');
      })
      .catch(() => {
        setEntries(previousEntries);
        setSyncResult('Reorder failed');
      });
  }

  function toggleSelection(entryId: string, shiftKey: boolean, sectionEntries: Entry[]) {
    const lastSelected = lastSelectedRef.current;
    lastSelectedRef.current = entryId;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && lastSelected) {
        const ids = sectionEntries.map((e) => e.id);
        const lastIdx = ids.indexOf(lastSelected);
        const currentIdx = ids.indexOf(entryId);
        if (lastIdx !== -1 && currentIdx !== -1) {
          const [start, end] = [Math.min(lastIdx, currentIdx), Math.max(lastIdx, currentIdx)];
          for (let i = start; i <= end; i++) {
            next.add(ids[i]);
          }
        } else {
          if (next.has(entryId)) next.delete(entryId);
          else next.add(entryId);
        }
      } else if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(entries.map((e) => e.id)));
  }

  function selectAllInSection(sectionEntries: Entry[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sectionEntries.forEach((e) => next.add(e.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }

  async function handleBulkMove(targetStatus: EntryStatus) {
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/edit/entries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus }),
          })
        )
      );
      const res = await fetch('/api/edit/entries');
      const data = await res.json();
      setEntries(data);
      clearSelection();
    } catch (error) {
      console.error('Bulk move failed:', error);
      setSyncResult('Move failed');
    }
  }

  const moveButtons: Array<{ label: string; status: EntryStatus }> = [
    { label: 'Move to Active', status: 'active' },
    { label: 'Move to Staging', status: 'staging' },
    { label: 'Disable', status: 'disabled' },
  ];

  const activeEntry = activeId ? entries.find((e) => e.id === activeId) : null;

  const gridStyle = {
    display: 'grid' as const,
    gap: '1rem',
    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
  };

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {selectedIds.size > 0 && (
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Select all
          </button>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="size-slider" className="text-gray-300 text-sm">
            Size:
          </label>
          <input
            id="size-slider"
            type="range"
            min="100"
            max="400"
            value={thumbnailSize}
            onChange={(e) => setThumbnailSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-gray-400 text-sm w-12">{thumbnailSize}px</span>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            syncing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {syncing ? 'Syncing...' : 'Sync from Dropbox'}
        </button>

        {syncResult && (
          <span
            className={`text-sm ${
              syncResult.includes('failed') ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {syncResult}
          </span>
        )}
      </div>

      {/* Active section — wrapped in DndContext for drag-to-reorder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <StageSection
          status="active"
          count={activeEntries.length}
          collapsed={collapsed.active}
          onToggleCollapse={() => toggleCollapse('active')}
          onSelectAll={() => selectAllInSection(activeEntries)}
        >
          <SortableContext items={activeEntryIds} strategy={rectSortingStrategy}>
            <div data-testid="entry-grid" style={gridStyle}>
              {activeEntries.map((entry) => (
                <SortableCard
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedIds.has(entry.id)}
                  hasSelection={selectedIds.size > 0}
                  onToggleSelection={(id, shiftKey) =>
                    toggleSelection(id, shiftKey, activeEntries)
                  }
                />
              ))}
            </div>
          </SortableContext>
        </StageSection>

        <DragOverlay>
          {activeEntry ? (
            <div className="rounded-lg overflow-hidden bg-gray-800 ring-2 ring-blue-500 shadow-2xl rotate-1 opacity-95">
              <img
                src={`/api/media/${activeEntry.id}`}
                alt={activeEntry.title || 'Entry thumbnail'}
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Staging section */}
      <StageSection
        status="staging"
        count={stagingEntries.length}
        collapsed={collapsed.staging}
        onToggleCollapse={() => toggleCollapse('staging')}
        onSelectAll={() => selectAllInSection(stagingEntries)}
      >
        <div style={gridStyle}>
          {stagingEntries.map((entry) => (
            <StaticCard
              key={entry.id}
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              hasSelection={selectedIds.size > 0}
              onToggleSelection={(id, shiftKey) =>
                toggleSelection(id, shiftKey, stagingEntries)
              }
            />
          ))}
        </div>
      </StageSection>

      {/* Disabled section */}
      <StageSection
        status="disabled"
        count={disabledEntries.length}
        collapsed={collapsed.disabled}
        onToggleCollapse={() => toggleCollapse('disabled')}
        onSelectAll={() => selectAllInSection(disabledEntries)}
      >
        <div style={gridStyle}>
          {disabledEntries.map((entry) => (
            <StaticCard
              key={entry.id}
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              hasSelection={selectedIds.size > 0}
              onToggleSelection={(id, shiftKey) =>
                toggleSelection(id, shiftKey, disabledEntries)
              }
            />
          ))}
        </div>
      </StageSection>

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-white font-medium">{selectedIds.size} selected</span>

          {moveButtons.map((btn) => (
            <button
              key={btn.status}
              onClick={() => handleBulkMove(btn.status)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {btn.label}
            </button>
          ))}

          <button
            onClick={clearSelection}
            className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
