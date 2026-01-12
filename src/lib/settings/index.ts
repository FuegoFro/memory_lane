import db, { Setting } from '@/lib/db';

export interface ViewerSettings {
  autoAdvanceDelay: number; // seconds, 0 = disabled
  showTitles: boolean;
}

const DEFAULTS: ViewerSettings = {
  autoAdvanceDelay: 5,
  showTitles: true,
};

export function getSetting(key: string): string | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as Setting | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `);
  stmt.run(key, value, value);
}

export function getViewerSettings(): ViewerSettings {
  const autoAdvance = getSetting('autoAdvanceDelay');
  const showTitles = getSetting('showTitles');

  return {
    autoAdvanceDelay: autoAdvance ? parseInt(autoAdvance, 10) : DEFAULTS.autoAdvanceDelay,
    showTitles: showTitles ? showTitles === 'true' : DEFAULTS.showTitles,
  };
}

export function updateViewerSettings(settings: Partial<ViewerSettings>): void {
  if (settings.autoAdvanceDelay !== undefined) {
    setSetting('autoAdvanceDelay', settings.autoAdvanceDelay.toString());
  }
  if (settings.showTitles !== undefined) {
    setSetting('showTitles', settings.showTitles.toString());
  }
}
