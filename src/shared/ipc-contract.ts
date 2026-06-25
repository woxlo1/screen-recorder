import type {
  AppSettings,
  CaptureSource,
  PlatformCapabilities,
  RecordingHistoryItem,
  SaveVideoRequest,
  SaveVideoResult,
  SelectFolderResult,
  StartRecordingRequest,
  StopRecordingResult,
} from './types';

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
} as const;

/**
 * main → renderer への一方向通知チャンネル（ipcMain.handle ではなく webContents.send で送る）。
 * invoke系のIpcChannelsとは別管理にすることで、リクエスト/レスポンス型を持たないことを明示する。
 */
export const IpcEvents = {
  /** MP4変換(FFmpeg)の進捗通知。Phase3で追加 */
  ConversionProgress: 'recorder:conversionProgress',
} as const;

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents];

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

/**
 * 各チャンネルの「リクエスト引数」と「戻り値」の型を定義するマップ。
 * preload の invoke ラッパーと main の handle 実装の両方がこの型に従うことで、
 * シグネチャのズレをコンパイル時に検出できる。
 */
export interface IpcContract {
  [IpcChannels.GetSources]: {
    request: void;
    response: CaptureSource[];
  };
  [IpcChannels.StartRecording]: {
    request: StartRecordingRequest;
    response: { success: boolean; errorMessage?: string };
  };
  [IpcChannels.StopRecording]: {
    /**
     * renderer 側の MediaRecorder で生成された WebM データ本体と録画時間。
     * MediaRecorder自体はブラウザAPIのためrendererでしか動かせないが、
     * ファイルI/Oはmainプロセスに集約する設計。
     */
    request: { buffer: ArrayBuffer; durationMs: number };
    response: StopRecordingResult;
  };
  [IpcChannels.PauseRecording]: {
    request: void;
    response: { success: boolean };
  };
  [IpcChannels.ResumeRecording]: {
    request: void;
    response: { success: boolean };
  };
  [IpcChannels.SaveVideo]: {
    request: SaveVideoRequest;
    response: SaveVideoResult;
  };
  [IpcChannels.SelectFolder]: {
    request: void;
    response: SelectFolderResult;
  };
  [IpcChannels.GetPlatformCapabilities]: {
    request: void;
    response: PlatformCapabilities;
  };
  [IpcChannels.RequestMicrophonePermission]: {
    request: void;
    response: { granted: boolean };
  };
  [IpcChannels.GetRecordingHistory]: {
    request: void;
    response: RecordingHistoryItem[];
  };
  [IpcChannels.DeleteRecordingHistoryItem]: {
    request: { id: string };
    response: { success: boolean };
  };
  [IpcChannels.OpenFileLocation]: {
    request: { filePath: string };
    response: { success: boolean };
  };
  [IpcChannels.LoadSettings]: {
    request: void;
    response: AppSettings;
  };
  [IpcChannels.SaveSettings]: {
    request: AppSettings;
    response: { success: boolean };
  };
}

/** 指定チャンネルのリクエスト型を取り出すユーティリティ型 */
export type IpcRequest<C extends IpcChannel> = IpcContract[C]['request'];
/** 指定チャンネルのレスポンス型を取り出すユーティリティ型 */
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['response'];
