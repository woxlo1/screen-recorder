import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import { IpcEvents } from '../shared/ipc-contract';
import type { UpdateStatusPayload } from '../shared/types';

/**
 * Thin wrapper around electron-updater.
 *
 * Design notes:
 *  - electron-updater checks the "publish" target configured in
 *    electron-builder.json (GitHub Releases here) for a newer version than
 *    the currently running app, based on the `version` field in package.json.
 *  - Auto-download is left at its default (true): once an update is found it
 *    starts downloading immediately in the background. The user is only
 *    asked to act once the download finishes (quitAndInstall), via the
 *    banner rendered from `UpdateStatusPayload` in the renderer.
 *  - This module deliberately knows nothing about React/IPC wiring details
 *    beyond broadcasting a single `UpdateStatusPayload` shape; main/index.ts
 *    just calls `initializeAutoUpdater()` once at startup and
 *    `ipc-handlers.ts` calls `checkForUpdates()` / `quitAndInstall()` on
 *    request from the renderer.
 *  - Does nothing in development (no packaged app to update) or when running
 *    unpackaged, since electron-updater requires a packaged build to have
 *    anything meaningful to compare against.
 */

let initialized = false;

function broadcast(payload: UpdateStatusPayload): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) {
      window.webContents.send(IpcEvents.UpdateStatus, payload);
    }
  }
}

/**
 * Wires up electron-updater's event listeners exactly once. Safe to call
 * multiple times; subsequent calls are no-ops.
 */
export function initializeAutoUpdater(): void {
  if (initialized) return;
  initialized = true;

  // electron-updater logs to console by default; this is intentionally kept
  // as plain English console output (developer/log-facing, not user-facing).
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcast({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcast({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    broadcast({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcast({ status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ status: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    console.error('[auto-updater] error', error);
    broadcast({ status: 'error', errorMessage: error.message });
  });
}

/**
 * Triggers an update check. Called once shortly after startup, and again
 * whenever the renderer explicitly requests a check (e.g. a "Check for
 * updates" button).
 *
 * No-op when running from source (`npm run dev`), since electron-updater
 * has nothing meaningful to compare against until the app is packaged
 * (`app.isPackaged` is false in that case).
 */
export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) {
    console.log('[auto-updater] skipped: not running as a packaged app');
    return;
  }
  await autoUpdater.checkForUpdates();
}

/**
 * Quits the app and installs the already-downloaded update. Only meaningful
 * to call after a 'downloaded' status has been broadcast; calling it earlier
 * is a no-op inside electron-updater itself.
 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
