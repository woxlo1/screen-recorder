import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, IpcEvents } from '../shared/ipc-contract';
/**
 * invoke呼び出しを型安全にラップするヘルパー。
 * IpcContractに定義されたチャンネル名・引数・戻り値の型がそのまま反映される。
 */
function invoke(channel, request) {
    return ipcRenderer.invoke(channel, request);
}
/**
 * renderer に公開するAPI。
 * nodeIntegration: false の環境でも、ここで定義した関数のみが
 * window.electronAPI として安全に利用可能になる。
 */
const electronAPI = {
    getSources: () => invoke(IpcChannels.GetSources),
    startRecording: (request) => invoke(IpcChannels.StartRecording, request),
    stopRecording: (request) => invoke(IpcChannels.StopRecording, request),
    pauseRecording: () => invoke(IpcChannels.PauseRecording),
    resumeRecording: () => invoke(IpcChannels.ResumeRecording),
    saveVideo: (request) => invoke(IpcChannels.SaveVideo, request),
    selectFolder: () => invoke(IpcChannels.SelectFolder),
    // --- Phase2: 設定永続化 ---------------------------------------------
    loadSettings: () => invoke(IpcChannels.LoadSettings),
    saveSettings: (settings) => invoke(IpcChannels.SaveSettings, settings),
    // --- Phase2: 録画履歴 ---------------------------------------------------
    getRecordingHistory: () => invoke(IpcChannels.GetRecordingHistory),
    deleteRecordingHistoryItem: (id) => invoke(IpcChannels.DeleteRecordingHistoryItem, { id }),
    openFileLocation: (filePath) => invoke(IpcChannels.OpenFileLocation, { filePath }),
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
    onConversionProgress: (callback) => {
        const listener = (_event, progress) => {
            callback(progress);
        };
        ipcRenderer.on(IpcEvents.ConversionProgress, listener);
        return () => {
            ipcRenderer.removeListener(IpcEvents.ConversionProgress, listener);
        };
    },
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
