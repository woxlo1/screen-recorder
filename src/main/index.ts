import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipc-handlers';
import { persistentStore } from './persistent-store';
import { getDefaultOutputDir } from './paths';
import { logFfmpegPath } from './ffmpeg-binary';

// mainプロセスはCommonJSとしてビルドするため、__dirname はNode.jsが自動的に注入する
// 組み込み変数をそのまま利用できる（ESM用の fileURLToPath(import.meta.url) は不要）。
// ※ "type": "module" の package.json 配下でも、ビルド出力をCJS固定しているため問題ない。
//   依存パッケージ(fluent-ffmpeg等)がCJS前提で内部的に __dirname を参照しているため、
//   mainプロセス全体をESM化すると壊れる(__dirname is not defined)。これがCJS固定の理由。

// Vite開発サーバーのURL（開発時のみ使用）。本番ビルドではdist/index.htmlを読む。
const DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Screen Recorder',
    webPreferences: {
      // セキュリティ要件: Node統合は禁止、Context Isolationは必須
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * デスクトップ/システム音声キャプチャの権限を許可する。
 * Electronはデフォルトでメディア権限を要求するダイアログを出さないため、
 * 明示的にハンドラを登録してパーミッションを許可する必要がある。
 */
function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed: string[] = ['media', 'display-capture'];
    callback(allowed.includes(permission));
  });
}

app.whenReady().then(() => {
  setupPermissions();
  initializeDefaultOutputDirIfNeeded();
  logFfmpegPath();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 初回起動時など保存先が未設定の場合、OSごとのデフォルト動画フォルダを
 * 自動的に設定しておく(Windows: %USERPROFILE%/Videos, macOS: ~/Movies)。
 */
function initializeDefaultOutputDirIfNeeded(): void {
  const settings = persistentStore.getSettings();
  if (!settings.save.outputDirectory) {
    persistentStore.saveSettings({
      ...settings,
      save: { ...settings.save, outputDirectory: getDefaultOutputDir() },
    });
  }
}
