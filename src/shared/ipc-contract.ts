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
 * Centralizes IPC channel names in one place.
 * Prevents string-literal typos and lets main/preload/renderer all share the
 * same constants.
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
 * One-way notification channels from main to renderer (sent via webContents.send
 * rather than handled with ipcMain.handle).
 * Kept separate from the invoke-style IpcChannels to make explicit that these
 * channels have no request/response type.
 */
export const IpcEvents = {
  /** MP4 conversion (FFmpeg) progress notification. Added in Phase 3 */
  ConversionProgress: 'recorder:conversionProgress',
} as const;

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents];

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

/**
 * Map defining the "request argument" and "return value" types for each channel.
 * Having both the preload invoke wrapper and the main handle implementation follow
 * this type lets signature mismatches be caught at compile time.
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
     * The WebM data and recording duration produced by the renderer-side
     * MediaRecorder. MediaRecorder itself is a browser API and can only run in
     * the renderer, but the design centralizes file I/O in the main process.
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

/** Utility type that extracts the request type for a given channel */
export type IpcRequest<C extends IpcChannel> = IpcContract[C]['request'];
/** Utility type that extracts the response type for a given channel */
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['response'];
