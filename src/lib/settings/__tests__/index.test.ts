import { describe, it, expect, beforeEach } from 'vitest';
import db from '@/lib/db';
import {
  getSetting,
  setSetting,
  getViewerSettings,
  updateViewerSettings,
} from '../index';

describe('settings module', () => {
  beforeEach(() => {
    db.exec('DELETE FROM settings');
  });

  describe('getSetting', () => {
    it('returns undefined when setting does not exist', () => {
      const result = getSetting('nonExistentKey');
      expect(result).toBeUndefined();
    });

    it('returns stored value when setting exists', () => {
      // Insert a setting directly
      db.exec("INSERT INTO settings (key, value) VALUES ('testKey', 'testValue')");

      const result = getSetting('testKey');
      expect(result).toBe('testValue');
    });
  });

  describe('setSetting', () => {
    it('stores a new setting', () => {
      setSetting('newKey', 'newValue');

      const result = getSetting('newKey');
      expect(result).toBe('newValue');
    });

    it('updates existing setting (upsert)', () => {
      setSetting('updateKey', 'originalValue');
      setSetting('updateKey', 'updatedValue');

      const result = getSetting('updateKey');
      expect(result).toBe('updatedValue');
    });

    it('handles empty string values', () => {
      setSetting('emptyKey', '');

      const result = getSetting('emptyKey');
      expect(result).toBe('');
    });
  });

  describe('getViewerSettings', () => {
    it('returns default values when no settings are stored', () => {
      const settings = getViewerSettings();

      expect(settings).toEqual({
        autoAdvanceDelay: 5,
        showTitles: true,
      });
    });

    it('returns stored autoAdvanceDelay value', () => {
      setSetting('autoAdvanceDelay', '10');

      const settings = getViewerSettings();

      expect(settings.autoAdvanceDelay).toBe(10);
    });

    it('returns stored showTitles value as boolean', () => {
      setSetting('showTitles', 'false');

      const settings = getViewerSettings();

      expect(settings.showTitles).toBe(false);
    });

    it('returns all stored values', () => {
      setSetting('autoAdvanceDelay', '15');
      setSetting('showTitles', 'false');

      const settings = getViewerSettings();

      expect(settings).toEqual({
        autoAdvanceDelay: 15,
        showTitles: false,
      });
    });

    it('handles autoAdvanceDelay of 0 (disabled)', () => {
      setSetting('autoAdvanceDelay', '0');

      const settings = getViewerSettings();

      expect(settings.autoAdvanceDelay).toBe(0);
    });
  });

  describe('updateViewerSettings', () => {
    it('updates autoAdvanceDelay', () => {
      updateViewerSettings({ autoAdvanceDelay: 20 });

      const settings = getViewerSettings();
      expect(settings.autoAdvanceDelay).toBe(20);
    });

    it('updates showTitles', () => {
      updateViewerSettings({ showTitles: false });

      const settings = getViewerSettings();
      expect(settings.showTitles).toBe(false);
    });

    it('updates multiple settings at once', () => {
      updateViewerSettings({
        autoAdvanceDelay: 30,
        showTitles: false,
      });

      const settings = getViewerSettings();
      expect(settings).toEqual({
        autoAdvanceDelay: 30,
        showTitles: false,
      });
    });

    it('only updates provided settings', () => {
      // Set initial values
      updateViewerSettings({
        autoAdvanceDelay: 10,
        showTitles: false,
      });

      // Update only one setting
      updateViewerSettings({ autoAdvanceDelay: 25 });

      const settings = getViewerSettings();
      expect(settings.autoAdvanceDelay).toBe(25);
      expect(settings.showTitles).toBe(false); // unchanged
    });

    it('handles empty updates object', () => {
      updateViewerSettings({});

      // Should not throw and should return defaults
      const settings = getViewerSettings();
      expect(settings).toEqual({
        autoAdvanceDelay: 5,
        showTitles: true,
      });
    });
  });
});
