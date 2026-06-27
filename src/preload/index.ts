import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, IpcEvents } from '../shared/ipc-contract';
import type { IpcRequest, IpcResponse } from '../shared/ipc-contract';
import type {
  AppSettings,
  ConversionProgress,
  SaveVideoRequest,
  UpdateStatusPayload,
} from '../shared/types';

/**
 * Helper that wraps invoke calls in a type-safe way.
 * The channel name, argument, and return-value types defined in IpcContract
 * are carried through automatically.
 */
function invoke<C extends (typeof IpcChannels)[keyof typeof IpcChannels]>(
  channel: C,
  request?: IpcRequest<C>,
): Promise<IpcResponse<C>> {
  return ipcRenderer.invoke(channel, request);
}

/**
 * API exposed to the renderer.
 * Even with nodeIntegration: false, only the functions defined here become
 * safely available as window.electronAPI.
 */
const electronAPI = {
  getSources: () => invoke(IpcChannels.GetSources),

  startRecording: (request: IpcRequest<typeof IpcChannels.StartRecording>) =>
    invoke(IpcChannels.StartRecording, request),

  stopRecording: (request: { buffer: ArrayBuffer; durationMs: number }) =>
    invoke(IpcChannels.StopRecording, request),

  pauseRecording: () => invoke(IpcChannels.PauseRecording),

  resumeRecording: () => invoke(IpcChannels.ResumeRecording),

  saveVideo: (request: SaveVideoRequest) => invoke(IpcChannels.SaveVideo, request),

  selectFolder: () => invoke(IpcChannels.SelectFolder),

  // --- Phase 2: settings persistence ----------------------------------
  loadSettings: () => invoke(IpcChannels.LoadSettings),
  saveSettings: (settings: AppSettings) => invoke(IpcChannels.SaveSettings, settings),

  // --- Phase 2: recording history ---------------------------------------
  getRecordingHistory: () => invoke(IpcChannels.GetRecordingHistory),
  deleteRecordingHistoryItem: (id: string) =>
    invoke(IpcChannels.DeleteRecordingHistoryItem, { id }),
  openFileLocation: (filePath: string) => invoke(IpcChannels.OpenFileLocation, { filePath }),

  // --- Phase 2: platform info / permissions ------------------------------
  getPlatformCapabilities: () => invoke(IpcChannels.GetPlatformCapabilities),
  requestMicrophonePermission: () => invoke(IpcChannels.RequestMicrophonePermission),

  // --- Phase 3: MP4 conversion (FFmpeg) progress notifications -----------------------
  /**
   * Subscribes to the conversion-progress event sent from the main process.
   * Rather than passing `ipcRenderer` through directly, only this wrapped callback
   * is exposed, so the renderer can't peek at arbitrary IPC channels (preserving
   * the intent of contextIsolation). Call the returned function to unsubscribe.
   */
  onConversionProgress: (callback: (progress: ConversionProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ConversionProgress): void => {
      callback(progress);
    };
    ipcRenderer.on(IpcEvents.ConversionProgress, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.ConversionProgress, listener);
    };
  },

  // --- Auto-update (electron-updater) -----------------------------------
  checkForUpdates: () => invoke(IpcChannels.CheckForUpdates),
  quitAndInstallUpdate: () => invoke(IpcChannels.QuitAndInstallUpdate),
  getAppVersion: () => invoke(IpcChannels.GetAppVersion),
  /** Subscribes to update-status changes (checking/available/downloading/downloaded/error). */
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: UpdateStatusPayload): void => {
      callback(payload);
    };
    ipcRenderer.on(IpcEvents.UpdateStatus, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.UpdateStatus, listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

/** Type export used by the renderer to type window.electronAPI */
export type ElectronAPI = typeof electronAPI;
