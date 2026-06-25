import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, IpcEvents } from '../shared/ipc-contract';
import type { IpcRequest, IpcResponse } from '../shared/ipc-contract';
import type { AppSettings, ConversionProgress, SaveVideoRequest } from '../shared/types';

/**
 * invoke呼び出しを型安全にラップするヘルパー。
 * IpcContractに定義されたチャンネル名・引数・戻り値の型がそのまま反映される。
 */
function invoke<C extends (typeof IpcChannels)[keyof typeof IpcChannels]>(
  channel: C,
  request?: IpcRequest<C>,
): Promise<IpcResponse<C>> {
  return ipcRenderer.invoke(channel, request);
}

/**
 * renderer に公開するAPI。
 * nodeIntegration: false の環境でも、ここで定義した関数のみが
 * window.electronAPI として安全に利用可能になる。
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

  // --- Phase2: 設定永続化 ---------------------------------------------
  loadSettings: () => invoke(IpcChannels.LoadSettings),
  saveSettings: (settings: AppSettings) => invoke(IpcChannels.SaveSettings, settings),

  // --- Phase2: 録画履歴 ---------------------------------------------------
  getRecordingHistory: () => invoke(IpcChannels.GetRecordingHistory),
  deleteRecordingHistoryItem: (id: string) =>
    invoke(IpcChannels.DeleteRecordingHistoryItem, { id }),
  openFileLocation: (filePath: string) => invoke(IpcChannels.OpenFileLocation, { filePath }),

  // --- Phase2: プラットフォーム情報・権限 ---------------------------------
  getPlatformCapabilities: () => invoke(IpcChannels.GetPlatformCapabilities),
  requestMicrophonePermission: () => invoke(IpcChannels.RequestMicrophonePermission),

  // --- Phase3: MP4変換(FFmpeg)の進捗通知 -----------------------------------
  /**
   * mainプロセスから送られる変換進捗イベントを購読する。
   * `ipcRenderer` をそのまま渡さず、ここでラップしたコールバックだけを公開することで
   * renderer側が任意のIPCチャンネルを覗けないようにする(contextIsolationの意図を守る)。
   * 戻り値の関数を呼ぶことでリスナーを解除できる。
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

/** renderer側で `window.electronAPI` の型を補完するための型エクスポート */
export type ElectronAPI = typeof electronAPI;
