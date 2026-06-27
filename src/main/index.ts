import { app, BrowserWindow, session, desktopCapturer, globalShortcut } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipc-handlers';
import { persistentStore } from './persistent-store';
import { getDefaultOutputDir } from './paths';
import { logFfmpegPath } from './ffmpeg-binary';
import { recordingStateManager } from './recording-state';
import { initializeAutoUpdater, checkForUpdates } from './auto-updater';
import { IpcEvents } from '../shared/ipc-contract';

// The main process is built as CommonJS, so __dirname is automatically injected by
// Node.js and can be used as-is (the ESM equivalent, fileURLToPath(import.meta.url),
// is not needed).
// This is fine even though package.json has "type": "module", because the build
// output is fixed to CJS regardless. Several dependencies (e.g. fluent-ffmpeg)
// internally rely on __dirname under a CJS assumption, so making the entire main
// process ESM would break (__dirname is not defined) -- that's why CJS is fixed here.

// URL of the Vite dev server (only used during development). Production builds load dist/index.html.
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
      // Security requirement: Node integration must be disabled, Context Isolation must be enabled
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.cjs'),
    },
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Grants permission for desktop/system audio capture.
 * Electron does not show a permission-request dialog for media access by default,
 * so a handler must be registered explicitly to grant the permission.
 */
function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed: string[] = ['media', 'display-capture'];
    callback(allowed.includes(permission));
  });
}

/**
 * The renderer side only needs to call `navigator.mediaDevices.getDisplayMedia()`;
 * this function resolves "which screen/window to record" and "whether to include
 * system audio" here, and returns the answer.
 *
 * This simultaneously fixes two issues:
 *  1. Fixes the recording screen showing up completely white/blank.
 *     The old implementation called "getUserMedia for video" and "getUserMedia for
 *     system audio" as two separate calls, both using the chromeMediaSource:'desktop'
 *     mandatory constraint. Chromium doesn't correctly handle parallel
 *     mandatory-constraint-based requests against the same desktop capture session;
 *     the second (audio) request would invalidate the first (video) capture session,
 *     leaving the video track disabled (blank/white). With the current implementation,
 *     which requests video + audio together in a single getDisplayMedia call, this
 *     race condition no longer occurs.
 *  2. Removes the need to install an extra app (e.g. BlackHole) to record audio.
 *     Specifying `audio: 'loopback'` makes Electron use the OS's built-in system
 *     audio loopback feature directly (Windows: WASAPI loopback / macOS 13+:
 *     ScreenCaptureKit), so no virtual audio device needs to be added.
 *
 * Because the already-selected source ID is looked up from desktopCapturer's results
 * by our own SourceSelector and returned as `video`, Chromium's standard "screen share
 * picker" is never shown (the handler itself resolves and returns the source).
 */
function setupDisplayMediaRequestHandler(): void {
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
          // Linux doesn't support loopback audio, so audio is omitted even if requested
          // (Chromium itself ultimately decides whether the platform is supported).
          ...(wantsSystemAudio ? { audio: 'loopback' } : {}),
        });
      })
      .catch((error) => {
        console.error('[main] setDisplayMediaRequestHandler failed', error);
        callback({});
      });
  });
}

/**
 * Global shortcut to start/stop recording from anywhere, even while the app
 * window doesn't have focus.
 *
 * The actual recording logic (MediaRecorder / getDisplayMedia) only exists in
 * the renderer, so this can't start/stop recording directly. Instead it just
 * notifies the renderer via IPC; the renderer decides whether to start or stop
 * based on its current status (see ControlsBar.tsx).
 *
 * Uses Ctrl+Shift+R on Windows/Linux and Cmd+Shift+R on macOS.
 */
function registerGlobalShortcuts(): void {
  const accelerator = process.platform === 'darwin' ? 'Command+Shift+R' : 'Control+Shift+R';

  const registered = globalShortcut.register(accelerator, () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send(IpcEvents.ToggleRecordingShortcut);
  });

  if (!registered) {
    // Most likely cause: another app already owns this key combination.
    console.error(`[main] failed to register global shortcut: ${accelerator}`);
  }
}

app.whenReady().then(() => {
  setupPermissions();
  setupDisplayMediaRequestHandler();
  initializeDefaultOutputDirIfNeeded();
  logFfmpegPath();
  registerIpcHandlers();
  createMainWindow();
  registerGlobalShortcuts();
  initializeAutoUpdater();
  // Check for an update shortly after launch. Delayed slightly so it doesn't
  // compete with the app's own startup work, and wrapped in catch since a
  // failed check (e.g. offline) shouldn't be treated as fatal.
  setTimeout(() => {
    void checkForUpdates().catch((error) => {
      console.error('[auto-updater] initial check failed', error);
    });
  }, 3000);

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

/**
 * On first launch (or whenever no output directory is set), automatically configure
 * the OS-appropriate default video folder (Windows: %USERPROFILE%/Videos, macOS: ~/Movies).
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
