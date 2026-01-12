'use client';

import { useState, useEffect } from 'react';
import { ViewerSettings } from '@/types';

const DEFAULTS: ViewerSettings = {
  autoAdvanceDelay: 5,
  showTitles: true,
};

export function useViewerSettings() {
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/viewer');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, setSettings, loading };
}
