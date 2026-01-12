'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Entry, getEntryStatus, EntryStatus } from '@/types';

interface EntryGridProps {
  initialEntries: Entry[];
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<EntryStatus | 'all'>('active');
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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
              onClick={() => setFilter(option.value)}
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
            return (
              <Link
                key={entry.id}
                href={`/edit/${entry.id}`}
                className="relative group rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
