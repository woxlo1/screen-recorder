import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings, RecordingHistoryItem } from '../shared/types';
import { DEFAULT_APP_SETTINGS } from '../shared/types';
import { getDefaultOutputDir } from './paths';

interface PersistedData {
  settings: AppSettings;
  history: RecordingHistoryItem[];
}

/**
 * Persists settings and history as a JSON file under the userData directory.
 * A simple store implemented using only Node's standard fs module, without adding
 * an external dependency like electron-store. Falls back to default values if
 * loading fails.
 */
class PersistentStore {
  private filePath: string;
  private cache: PersistedData | null = null;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'store.json');
  }

  private load(): PersistedData {
    if (this.cache) return this.cache;

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedData>;
      this.cache = {
        settings: { ...DEFAULT_APP_SETTINGS, ...parsed.settings },
        history: parsed.history ?? [],
      };
    } catch {
      // Use initial values if the file doesn't exist or is corrupted
      this.cache = {
        settings: {
          ...DEFAULT_APP_SETTINGS,
          save: { ...DEFAULT_APP_SETTINGS.save, outputDirectory: getDefaultOutputDir() },
        },
        history: [],
      };
    }
    return this.cache;
  }

  private persist(): void {
    if (!this.cache) return;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      console.error('[store] failed to persist data', error);
    }
  }

  getSettings(): AppSettings {
    return this.load().settings;
  }

  saveSettings(settings: AppSettings): void {
    const data = this.load();
    data.settings = settings;
    this.persist();
  }

  getHistory(): RecordingHistoryItem[] {
    // Return in descending order so the newest recording appears first
    return [...this.load().history].sort((a, b) => b.createdAt - a.createdAt);
  }

  addHistoryItem(item: RecordingHistoryItem): void {
    const data = this.load();
    data.history.push(item);
    // Keep only the most recent 100 entries (to prevent unbounded growth)
    if (data.history.length > 100) {
      data.history = data.history.slice(data.history.length - 100);
    }
    this.persist();
  }

  deleteHistoryItem(id: string): void {
    const data = this.load();
    data.history = data.history.filter((item) => item.id !== id);
    this.persist();
  }

  clearHistory(): void {
    const data = this.load();
    data.history = [];
    this.persist();
  }
}

/** Singleton instance shared across the entire main process */
export const persistentStore = new PersistentStore();
