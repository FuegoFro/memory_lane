'use client';

import type { ReactNode } from 'react';
import { EntryStatus } from '@/types';

const BADGE_COLORS: Record<EntryStatus, string> = {
  active: 'bg-green-500',
  staging: 'bg-yellow-500',
  disabled: 'bg-gray-500',
};

const LABELS: Record<EntryStatus, string> = {
  active: 'Active',
  staging: 'Staging',
  disabled: 'Disabled',
};

interface StageSectionProps {
  status: EntryStatus;
  count: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectAll: () => void;
  children?: ReactNode;
}

export function StageSection({
  status,
  count,
  collapsed,
  onToggleCollapse,
  onSelectAll,
  children,
}: StageSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 py-2 border-b border-gray-800 mb-4">
        <button
          onClick={onToggleCollapse}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${LABELS[status]} section`}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="text-gray-400 text-xs w-3">{collapsed ? '▶' : '▼'}</span>
          <span className="text-gray-100 font-semibold text-base">{LABELS[status]}</span>
          <span
            className={`${BADGE_COLORS[status]} text-white text-xs font-semibold rounded-full px-2 py-0.5`}
          >
            {count}
          </span>
          {status === 'active' && (
            <span className="text-gray-500 text-xs ml-1">(drag to reorder)</span>
          )}
        </button>
        <button
          onClick={onSelectAll}
          className="text-xs text-gray-400 border border-gray-700 rounded-md px-2.5 py-1 hover:text-white hover:border-gray-500 transition-colors"
        >
          Select all
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}
