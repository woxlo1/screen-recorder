import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_APP_SETTINGS } from '../shared/types';
import { getDefaultOutputDir } from './paths';
/**
 * 設定と履歴をJSONファイルとして userData ディレクトリに永続化する。
 * electron-store 等の外部依存を増やさず、Node標準の fs だけで実装した
 * シンプルなストア。読み込み失敗時はデフォルト値にフォールバックする。
 */
class PersistentStore {
    filePath;
    cache = null;
    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'store.json');
    }
    load() {
        if (this.cache)
            return this.cache;
        try {
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            this.cache = {
                settings: { ...DEFAULT_APP_SETTINGS, ...parsed.settings },
                history: parsed.history ?? [],
            };
        }
        catch {
            // ファイルが無い、もしくは壊れている場合は初期値を使う
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
    persist() {
        if (!this.cache)
            return;
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('[store] failed to persist data', error);
        }
    }
    getSettings() {
        return this.load().settings;
    }
    saveSettings(settings) {
        const data = this.load();
        data.settings = settings;
        this.persist();
    }
    getHistory() {
        // 新しい録画が先頭に来るよう降順で返す
        return [...this.load().history].sort((a, b) => b.createdAt - a.createdAt);
    }
    addHistoryItem(item) {
        const data = this.load();
        data.history.push(item);
        // 履歴は直近100件のみ保持（無限に肥大化しないように）
        if (data.history.length > 100) {
            data.history = data.history.slice(data.history.length - 100);
        }
        this.persist();
    }
    deleteHistoryItem(id) {
        const data = this.load();
        data.history = data.history.filter((item) => item.id !== id);
        this.persist();
    }
    clearHistory() {
        const data = this.load();
        data.history = [];
        this.persist();
    }
}
/** main プロセス全体で共有するシングルトンインスタンス */
export const persistentStore = new PersistentStore();
