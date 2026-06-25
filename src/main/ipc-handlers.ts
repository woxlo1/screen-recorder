import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
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
  StopRecordingResult,
} from '../shared/types';
import { listCaptureSources } from './capture-sources';
import { recordingStateManager } from './recording-state';
import { createTempFilePath, getFileSizeSafe } from './paths';
import { persistentStore } from './persistent-store';
import { getPlatformCapabilities, requestMicrophonePermission } from './permissions';
import { convertWebmToMp4, FfmpegConversionError } from './ffmpeg-converter';
import { isFfmpegAvailable } from './ffmpeg-binary';

/** AppError生成のヘルパー。catchしたunknownを安全にAppErrorへ変換する */
function toAppError(code: AppError['code'], error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof Error ? error.stack : undefined;
  // exactOptionalPropertyTypes対応: detailsが無い場合はプロパティ自体を省略する
  return { code, message, ...(details !== undefined ? { details } : {}) };
}

/**
 * すべてのIPCハンドラをここで一括登録する。
 * main/index.ts から一度だけ呼び出す。
 */
export function registerIpcHandlers(): void {
  // --- ソース一覧取得 -------------------------------------------------
  ipcMain.handle(IpcChannels.GetSources, async () => {
    try {
      return await listCaptureSources();
    } catch (error) {
      console.error('[ipc] getSources failed', error);
      throw toAppError('SOURCE_NOT_FOUND', error);
    }
  });

  // --- 録画開始(状態管理のみ。実キャプチャはrenderer側) -----------------
  ipcMain.handle(IpcChannels.StartRecording, async () => {
    if (recordingStateManager.isActive()) {
      return { success: false, errorMessage: '既に録画中です' };
    }
    recordingStateManager.start();
    return { success: true };
  });

  // --- 録画停止 → WebMファイルへの書き込み -----------------------------
  ipcMain.handle(
    IpcChannels.StopRecording,
    async (
      _event,
      payload: { buffer: ArrayBuffer; durationMs: number },
    ): Promise<StopRecordingResult> => {
      if (!recordingStateManager.isActive()) {
        throw toAppError('RECORDING_NOT_ACTIVE', new Error('録画が開始されていません'));
      }
      recordingStateManager.stop();

      // バッファが空の場合は「録画中に予期せず中断した際、mainプロセスの状態だけを
      // 同期するための呼び出し」とみなし、無意味な0バイトファイルの書き込みをスキップする。
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

  // --- 一時停止 / 再開 ---------------------------------------------------
  ipcMain.handle(IpcChannels.PauseRecording, async () => {
    recordingStateManager.pause();
    return { success: true };
  });

  ipcMain.handle(IpcChannels.ResumeRecording, async () => {
    recordingStateManager.resume();
    return { success: true };
  });

  // --- 動画の最終保存（webmはコピー、mp4はFFmpegで変換してから保存） -------
  ipcMain.handle(
    IpcChannels.SaveVideo,
    async (event, request: SaveVideoRequest): Promise<SaveVideoResult> => {
      const sendProgress = (progress: ConversionProgress): void => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IpcEvents.ConversionProgress, progress);
        }
      };

      try {
        const ext = request.save.format === 'mp4' ? 'mp4' : 'webm';
        const fileName = `${sanitizeFileName(request.save.fileNameTemplate)}.${ext}`;
        const destPath = path.join(request.save.outputDirectory, fileName);

        await fs.mkdir(request.save.outputDirectory, { recursive: true });

        if (request.save.format === 'mp4') {
          if (!isFfmpegAvailable()) {
            const appError = toAppError(
              'FFMPEG_NOT_AVAILABLE',
              new Error('FFmpegの実行ファイルが見つかりません'),
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
              // bitrateは指定しない: WebM録画時のビットレートをFFmpeg側のCRF相当に任せ、画質の再劣化を避ける
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

          // 変換が完了したら元のWebM一時ファイルは不要なので削除する(ベストエフォート)
          await fs.unlink(request.sourceFilePath).catch(() => undefined);
        } else {
          await fs.copyFile(request.sourceFilePath, destPath);
        }

        // 履歴に追記（保存失敗時は記録しない）
        const fileSizeBytes = getFileSizeSafe(destPath);
        persistentStore.addHistoryItem({
          id: crypto.randomUUID(),
          filePath: destPath,
          fileName,
          format: request.save.format,
          durationMs: request.durationMs,
          createdAt: Date.now(),
          // exactOptionalPropertyTypes対応: 取得できなかった場合はプロパティ自体を省略する
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

  // --- 保存先フォルダ選択 -------------------------------------------------
  ipcMain.handle(IpcChannels.SelectFolder, async (event): Promise<SelectFolderResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      title: '保存先フォルダを選択',
    };
    // showOpenDialogはBrowserWindowを渡す/渡さないでオーバーロードが分かれるため、
    // window が取れない(=undefined)場合は引数自体を渡さない形で呼び分ける。
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const folderPath = result.filePaths[0];
    // exactOptionalPropertyTypes対応: folderPathが無い場合はプロパティ自体を省略する
    return folderPath !== undefined ? { canceled: false, folderPath } : { canceled: true };
  });

  // --- 設定の読み込み/保存（userData配下のJSONに永続化） -----------------
  ipcMain.handle(IpcChannels.LoadSettings, async (): Promise<AppSettings> => {
    return persistentStore.getSettings();
  });

  ipcMain.handle(IpcChannels.SaveSettings, async (_event, settings: AppSettings) => {
    persistentStore.saveSettings(settings);
    return { success: true };
  });

  // --- 録画履歴 -----------------------------------------------------------
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
      // ファイルをOS標準のファイラーで選択状態にして開く(Windows: Explorer / mac: Finder)
      shell.showItemInFolder(payload.filePath);
      return { success: true };
    } catch (error) {
      console.error('[ipc] openFileLocation failed', error);
      return { success: false };
    }
  });

  // --- プラットフォーム情報・権限 -----------------------------------------
  ipcMain.handle(IpcChannels.GetPlatformCapabilities, async () => {
    return getPlatformCapabilities();
  });

  ipcMain.handle(IpcChannels.RequestMicrophonePermission, async () => {
    const granted = await requestMicrophonePermission();
    return { granted };
  });
}

/** ファイル名に使えない文字を除去する簡易サニタイズ */
function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || 'recording';
  return trimmed.replace(/[\\/:*?"<>|]/g, '_');
}
