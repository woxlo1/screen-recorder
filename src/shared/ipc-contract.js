/**
 * IPCチャンネル名を一箇所に集約する。
 * 文字列リテラルのタイプミスを防ぎ、main/preload/renderer 全体で同じ定数を使う。
 */
export const IpcChannels = {
    GetSources: 'recorder:getSources',
    StartRecording: 'recorder:startRecording',
    StopRecording: 'recorder:stopRecording',
    PauseRecording: 'recorder:pauseRecording',
    ResumeRecording: 'recorder:resumeRecording',
    SaveVideo: 'recorder:saveVideo',
    SelectFolder: 'settings:selectFolder',
    GetPlatformCapabilities: 'platform:getCapabilities',
    RequestMicrophonePermission: 'platform:requestMicrophonePermission',
    GetRecordingHistory: 'history:getRecordingHistory',
    DeleteRecordingHistoryItem: 'history:deleteRecordingHistoryItem',
    OpenFileLocation: 'history:openFileLocation',
    LoadSettings: 'settings:load',
    SaveSettings: 'settings:save',
};
/**
 * main → renderer への一方向通知チャンネル（ipcMain.handle ではなく webContents.send で送る）。
 * invoke系のIpcChannelsとは別管理にすることで、リクエスト/レスポンス型を持たないことを明示する。
 */
export const IpcEvents = {
    /** MP4変換(FFmpeg)の進捗通知。Phase3で追加 */
    ConversionProgress: 'recorder:conversionProgress',
};
