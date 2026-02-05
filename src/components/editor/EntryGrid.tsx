'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Entry, getEntryStatus, EntryStatus } from '@/types';

interface EntryGridProps {
  initialEntries: Entry[];
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validStages = new Set<string>(['active', 'staging', 'disabled', 'all']);
  const stageParam = searchParams.get('stage');
  const filter: EntryStatus | 'all' = stageParam && validStages.has(stageParam)
    ? (stageParam as EntryStatus | 'all')
    : 'active';

  const [entries, setEntries] = useState(initialEntries);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (filter === 'all') return true;
    return getEntryStatus(entry) === filter;
  });

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

  function toggleSelection(entryId: string, shiftKey: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && lastSelectedRef.current) {
        const ids = filteredEntries.map((e) => e.id);
        const lastIdx = ids.indexOf(lastSelectedRef.current);
        const currentIdx = ids.indexOf(entryId);
        if (lastIdx !== -1 && currentIdx !== -1) {
          const [start, end] = [Math.min(lastIdx, currentIdx), Math.max(lastIdx, currentIdx)];
          for (let i = start; i <= end; i++) {
            next.add(ids[i]);
          }
        }
      } else if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      lastSelectedRef.current = entryId;
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }

  const prevFilterRef = useRef(filter);
  if (prevFilterRef.current !== filter) {
    prevFilterRef.current = filter;
    if (selectedIds.size > 0) {
      clearSelection();
    }
  }

  function getStatusBadgeColor(status: EntryStatus): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'staging':
        return 'bg-yellow-500';
      case 'disabled':
        return 'bg-gray-500';
    }
  }

  const filterOptions: Array<{ value: EntryStatus | 'all'; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'staging', label: 'Staging' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Filter buttons */}
        <div className="flex gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => router.replace(`/edit?stage=${option.value}`)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Select all / Clear selection */}
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Select all
            </button>
          </div>
        )}

        {/* Size slider */}
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

        {/* Sync button */}
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

        {/* Sync result message */}
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

      {/* Grid or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No entries in this category
        </div>
      ) : (
        <div
          data-testid="entry-grid"
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
          }}
        >
          {filteredEntries.map((entry) => {
            const status = getEntryStatus(entry);
            const isSelected = selectedIds.has(entry.id);
            const hasSelection = selectedIds.size > 0;
            return (
              <div
                key={entry.id}
                className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
              >
                {/* Checkbox */}
                <div
                  className={`absolute top-2 left-2 z-10 ${
                    hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } transition-opacity`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(entry.id, (e.nativeEvent as MouseEvent).shiftKey ?? false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded cursor-pointer accent-blue-500"
                  />
                </div>

                <Link
                  href={`/edit/${entry.id}?from=${filter}`}
                  className="block"
                >
                  {/* Thumbnail */}
                  <img
                    src={`/api/media/${entry.id}`}
                    alt={entry.title || 'Entry thumbnail'}
                    className="w-full aspect-square object-cover"
                  />

                  {/* Status badge */}
                  <div
                    data-testid="status-badge"
                    className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusBadgeColor(status)}`}
                  />

                  {/* Hover overlay */}
                  <div
                    data-testid="entry-overlay"
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4"
                  >
                    <span className="text-white font-medium text-center line-clamp-2">
                      {entry.title || 'Untitled'}
                    </span>
                    <span className="text-gray-300 text-sm capitalize mt-1">
                      {status}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-white font-medium">
            {selectedIds.size} selected
          </span>

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
