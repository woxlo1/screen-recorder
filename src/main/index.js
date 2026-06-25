import { app, BrowserWindow, session, desktopCapturer } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipc-handlers';
import { persistentStore } from './persistent-store';
import { getDefaultOutputDir } from './paths';
import { logFfmpegPath } from './ffmpeg-binary';
import { recordingStateManager } from './recording-state';
// mainプロセスはCommonJSとしてビルドするため、__dirname はNode.jsが自動的に注入する
// 組み込み変数をそのまま利用できる（ESM用の fileURLToPath(import.meta.url) は不要）。
// ※ "type": "module" の package.json 配下でも、ビルド出力をCJS固定しているため問題ない。
//   依存パッケージ(fluent-ffmpeg等)がCJS前提で内部的に __dirname を参照しているため、
//   mainプロセス全体をESM化すると壊れる(__dirname is not defined)。これがCJS固定の理由。
// Vite開発サーバーのURL（開発時のみ使用）。本番ビルドではdist/index.htmlを読む。
const DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
let mainWindow = null;
function createMainWindow() {
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
            preload: path.join(__dirname, '../preload/index.cjs'),
        },
    });
    if (DEV_SERVER_URL) {
        void mainWindow.loadURL(DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
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
function setupPermissions() {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        const allowed = ['media', 'display-capture'];
        callback(allowed.includes(permission));
    });
}
/**
 * renderer側は `navigator.mediaDevices.getDisplayMedia()` を呼ぶだけで、
 * 「どの画面/ウィンドウを録画するか」と「システム音声を含めるか」をここで解決して返す。
 *
 * これにより以下2点を同時に解決する:
 *  1. 録画画面が真っ白になる問題の修正
 *     旧実装は「映像用 getUserMedia」と「システム音声用 getUserMedia」を
 *     chromeMediaSource:'desktop' の制約で2回に分けて呼び出していた。
 *     Chromiumは同じデスクトップキャプチャセッションに対する
 *     mandatory制約ベースの並列リクエストを正しく扱えず、
 *     2回目の音声リクエストが1回目の映像キャプチャセッションを不正化し、
 *     映像トラックが無効(真っ白)になることがあった。
 *     映像+音声を1回の getDisplayMedia で同時に要求する今の実装ではこの競合が起きない。
 *  2. 音声録音のために追加アプリ(BlackHole等)のインストールが不要になる
 *     `audio: 'loopback'` を指定すると、ElectronがOS標準のシステム音声
 *     ループバック機能(Windows: WASAPI loopback / macOS 13+: ScreenCaptureKit)を
 *     直接利用してシステム音声を取得する。仮想オーディオデバイスの追加は不要。
 *
 * 独自の SourceSelector で選択済みのソースIDを desktopCapturer の結果から
 * 突き止めて `video` として返すため、Chromium標準の「画面共有ピッカー」は
 * 表示されない(handler自身がソースを確定して返すため)。
 */
function setupDisplayMediaRequestHandler() {
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
        void desktopCapturer
            .getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
            .then((sources) => {
            const selectedId = recordingStateManager.getSelectedSourceId();
            const matched = sources.find((s) => s.id === selectedId) ?? sources[0];
            if (!matched) {
                callback({});
                return;
            }
            const wantsSystemAudio = recordingStateManager.isSystemAudioRequested();
            callback({
                video: matched,
                // Linuxはループバック音声に未対応のため、要求があってもaudioは付けない
                // (Chromium側が対応プラットフォームかどうかを最終的に判断する)。
                ...(wantsSystemAudio ? { audio: 'loopback' } : {}),
            });
        })
            .catch((error) => {
            console.error('[main] setDisplayMediaRequestHandler failed', error);
            callback({});
        });
    });
}
app.whenReady().then(() => {
    setupPermissions();
    setupDisplayMediaRequestHandler();
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
function initializeDefaultOutputDirIfNeeded() {
    const settings = persistentStore.getSettings();
    if (!settings.save.outputDirectory) {
        persistentStore.saveSettings({
            ...settings,
            save: { ...settings.save, outputDirectory: getDefaultOutputDir() },
        });
    }
}
