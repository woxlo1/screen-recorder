import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { IpcChannels, IpcEvents } from '../shared/ipc-contract';
import type {
  AppError,
  AppSettings,
  ConversionProgress,
  SaveVideoRequest,
  SaveVideoResult,
  SelectFolderResult,
  StartRecordingRequest,
  StopRecordingResult,
} from '../shared/types';
import { listCaptureSources } from './capture-sources';
import { recordingStateManager } from './recording-state';
import { createTempFilePath, getFileSizeSafe } from './paths';
import { persistentStore } from './persistent-store';
import { getPlatformCapabilities, requestMicrophonePermission } from './permissions';
import { convertWebmToMp4, FfmpegConversionError } from './ffmpeg-converter';
import { isFfmpegAvailable } from './ffmpeg-binary';
import { mt } from './messages';
import { checkForUpdates, quitAndInstall } from './auto-updater';

/** Helper for building an AppError. Safely converts a caught `unknown` into an AppError. */
function toAppError(code: AppError['code'], error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof Error ? error.stack : undefined;
  // exactOptionalPropertyTypes: omit the property entirely when there are no details
  return { code, message, ...(details !== undefined ? { details } : {}) };
}

/**
 * Registers every IPC handler in one place.
 * Called exactly once from main/index.ts.
 */
export function registerIpcHandlers(): void {
  // --- Get the list of sources ----------------------------------------
  ipcMain.handle(IpcChannels.GetSources, async () => {
    try {
      return await listCaptureSources();
    } catch (error) {
      console.error('[ipc] getSources failed', error);
      throw toAppError('SOURCE_NOT_FOUND', error);
    }
  });

  // --- Start recording (state tracking only; actual capture happens in renderer) ---
  ipcMain.handle(IpcChannels.StartRecording, async (_event, payload: StartRecordingRequest) => {
    const language = persistentStore.getSettings().language;
    if (recordingStateManager.isActive()) {
      return { success: false, errorMessage: mt(language, 'alreadyRecording') };
    }
    // selectedSourceId / systemAudioRequested are read by
    // session.setDisplayMediaRequestHandler (main/index.ts).
    // The displayMediaRequestHandler bypasses the OS picker and automatically responds
    // based on the source ID and loopback-audio flag recorded here.
    recordingStateManager.start(payload.source.id, payload.audio.systemAudioEnabled);
    return { success: true };
  });

  // --- Stop recording -> write the WebM file ----------------------------
  ipcMain.handle(
    IpcChannels.StopRecording,
    async (
      _event,
      payload: { buffer: ArrayBuffer; durationMs: number },
    ): Promise<StopRecordingResult> => {
      const language = persistentStore.getSettings().language;
      if (!recordingStateManager.isActive()) {
        throw toAppError('RECORDING_NOT_ACTIVE', new Error(mt(language, 'recordingNotStarted')));
      }
      recordingStateManager.stop();

      // If the buffer is empty, treat this as "a call made purely to resync the main
      // process's state after an unexpected mid-recording interruption" and skip
      // writing a meaningless 0-byte file.
      if (payload.buffer.byteLength === 0) {
        return { tempFilePath: '', durationMs: payload.durationMs };
      }

      try {
        const tempFilePath = createTempFilePath('webm');
        await fs.writeFile(tempFilePath, Buffer.from(payload.buffer));
        return { tempFilePath, durationMs: payload.durationMs };
      } catch (error) {
        console.error('[ipc] stopRecording write failed', error);
        throw toAppError('FILE_WRITE_FAILED', error);
      }
    },
  );

  // --- Pause / resume -----------------------------------------------------
  ipcMain.handle(IpcChannels.PauseRecording, async () => {
    recordingStateManager.pause();
    return { success: true };
  });

  ipcMain.handle(IpcChannels.ResumeRecording, async () => {
    recordingStateManager.resume();
    return { success: true };
  });

  // --- Final save of the video (webm is copied as-is; mp4 is converted via FFmpeg first) ---
  ipcMain.handle(
    IpcChannels.SaveVideo,
    async (event, request: SaveVideoRequest): Promise<SaveVideoResult> => {
      const language = persistentStore.getSettings().language;

      const sendProgress = (progress: ConversionProgress): void => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IpcEvents.ConversionProgress, progress);
        }
      };

      try {
        const ext = request.save.format === 'mp4' ? 'mp4' : 'webm';

        await fs.mkdir(request.save.outputDirectory, { recursive: true });

        // Append a timestamp to the file name so a previous recording is never overwritten.
        const destPath = await buildUniqueOutputPath(
          request.save.outputDirectory,
          request.save.fileNameTemplate,
          ext,
        );

        if (request.save.format === 'mp4') {
          if (!isFfmpegAvailable()) {
            const appError = toAppError(
              'FFMPEG_NOT_AVAILABLE',
              new Error(mt(language, 'ffmpegNotFound')),
            );
            sendProgress({ requestId: request.requestId, phase: 'failed' });
            return { success: false, errorMessage: appError.message };
          }

          sendProgress({ requestId: request.requestId, phase: 'starting' });

          try {
            await convertWebmToMp4({
              inputPath: request.sourceFilePath,
              outputPath: destPath,
              videoCodec: request.save.videoCodec,
              language,
              // bitrate intentionally left unspecified: let FFmpeg's CRF-equivalent quality
              // follow the WebM recording's own bitrate, avoiding re-degradation of quality.
              onProgress: (percent) => {
                sendProgress({ requestId: request.requestId, phase: 'converting', percent });
              },
            });
          } catch (error) {
            console.error('[ipc] saveVideo mp4 conversion failed', error);
            sendProgress({ requestId: request.requestId, phase: 'failed' });
            const message =
              error instanceof FfmpegConversionError
                ? error.message
                : toAppError('FFMPEG_CONVERSION_FAILED', error).message;
            return { success: false, errorMessage: message };
          }

          sendProgress({ requestId: request.requestId, phase: 'completed', percent: 100 });

          // The original temporary WebM file is no longer needed once conversion succeeds;
          // delete it on a best-effort basis.
          await fs.unlink(request.sourceFilePath).catch(() => undefined);
        } else {
          await fs.copyFile(request.sourceFilePath, destPath);
        }

        // Append to history (not recorded if the save failed)
        const fileSizeBytes = getFileSizeSafe(destPath);
        persistentStore.addHistoryItem({
          id: crypto.randomUUID(),
          filePath: destPath,
          fileName: path.basename(destPath),
          format: request.save.format,
          durationMs: request.durationMs,
          createdAt: Date.now(),
          // exactOptionalPropertyTypes: omit the property entirely if it couldn't be retrieved
          ...(fileSizeBytes !== undefined ? { fileSizeBytes } : {}),
        });

        return { success: true, filePath: destPath };
      } catch (error) {
        console.error('[ipc] saveVideo failed', error);
        const appError = toAppError('FILE_WRITE_FAILED', error);
        sendProgress({ requestId: request.requestId, phase: 'failed' });
        return { success: false, errorMessage: appError.message };
      }
    },
  );

  // --- Output folder selection -------------------------------------------
  ipcMain.handle(IpcChannels.SelectFolder, async (event): Promise<SelectFolderResult> => {
    const language = persistentStore.getSettings().language;
    const window = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      title: mt(language, 'selectFolderDialogTitle'),
    };
    // showOpenDialog has separate overloads depending on whether a BrowserWindow is passed,
    // so when we can't obtain one (undefined), we call without passing that argument at all.
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const folderPath = result.filePaths[0];
    // exactOptionalPropertyTypes: omit the property entirely if folderPath is missing
    return folderPath !== undefined ? { canceled: false, folderPath } : { canceled: true };
  });

  // --- Load/save settings (persisted as JSON under userData) -------------
  ipcMain.handle(IpcChannels.LoadSettings, async (): Promise<AppSettings> => {
    return persistentStore.getSettings();
  });

  ipcMain.handle(IpcChannels.SaveSettings, async (_event, settings: AppSettings) => {
    persistentStore.saveSettings(settings);
    return { success: true };
  });

  // --- Recording history ----------------------------------------------------
  ipcMain.handle(IpcChannels.GetRecordingHistory, async () => {
    return persistentStore.getHistory();
  });

  ipcMain.handle(
    IpcChannels.DeleteRecordingHistoryItem,
    async (_event, payload: { id: string }) => {
      persistentStore.deleteHistoryItem(payload.id);
      return { success: true };
    },
  );

  ipcMain.handle(IpcChannels.OpenFileLocation, async (_event, payload: { filePath: string }) => {
    try {
      // Open the OS's standard file manager with the file pre-selected (Explorer on Windows / Finder on macOS)
      shell.showItemInFolder(payload.filePath);
      return { success: true };
    } catch (error) {
      console.error('[ipc] openFileLocation failed', error);
      return { success: false };
    }
  });

  // --- Platform info / permissions ----------------------------------------
  ipcMain.handle(IpcChannels.GetPlatformCapabilities, async () => {
    return getPlatformCapabilities();
  });

  ipcMain.handle(IpcChannels.RequestMicrophonePermission, async () => {
    const granted = await requestMicrophonePermission();
    return { granted };
  });

  // --- Auto-update (electron-updater) -----------------------------------
  ipcMain.handle(IpcChannels.CheckForUpdates, async () => {
    try {
      await checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('[ipc] checkForUpdates failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle(IpcChannels.QuitAndInstallUpdate, () => {
    quitAndInstall();
  });

  ipcMain.handle(IpcChannels.GetAppVersion, () => {
    return { version: app.getVersion() };
  });
}

/** Simple sanitizer that strips characters not allowed in file names */
function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || 'recording';
  return trimmed.replace(/[\\/:*?"<>|]/g, '_');
}

/** Generates a timestamp string usable in a file name (e.g. 2024-06-01_21-30-15) */
function formatTimestampForFileName(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours(),
  )}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * Generates a file path that doesn't collide with anything in the output directory.
 * Appending a timestamp to the template name means every save with the same template
 * name becomes a distinct file, preventing past recordings from being overwritten or
 * lost. If a collision still occurs, a numeric suffix is appended as well.
 */
async function buildUniqueOutputPath(
  outputDirectory: string,
  fileNameTemplate: string,
  extension: string,
): Promise<string> {
  const base = sanitizeFileName(fileNameTemplate);
  const timestamp = formatTimestampForFileName(new Date());
  let candidate = path.join(outputDirectory, `${base}_${timestamp}.${extension}`);
  let suffix = 1;

  while (await fileExists(candidate)) {
    candidate = path.join(outputDirectory, `${base}_${timestamp}_${suffix}.${extension}`);
    suffix += 1;
  }

  return candidate;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
