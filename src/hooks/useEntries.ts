'use client';

import { useState, useEffect } from 'react';
import { Entry } from '@/types';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch('/api/entries');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEntries(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  return { entries, loading, error };
}
