/**
 * Basic type definitions shared across the whole app.
 * Importable from main / preload / renderer alike (has no dependency on Node APIs).
 */

/** Type of capturable recording source */
export type CaptureSourceType = 'screen' | 'window';

/**
 * Serializable form of the result of desktopCapturer.getSources(), for passing
 * to the renderer (NativeImage is converted to a dataURL string).
 */
export interface CaptureSource {
  /** Source ID used internally by Electron (passed to desktopCapturer chromeMediaSourceId) */
  id: string;
  /** Name shown to the user (monitor name / window title) */
  name: string;
  /** Entire screen vs. a single window */
  type: CaptureSourceType;
  /** Thumbnail image (PNG dataURL) */
  thumbnailDataUrl: string;
  /** Display ID for multi-monitor support (only valid when type is "screen") */
  displayId?: string;
}

/** Supported FPS (fixed to these two values by spec) */
export type RecordingFps = 30 | 60;

/** Supported resolution presets */
export type ResolutionPreset = '720p' | '1080p' | '1440p' | '4k';

export interface ResolutionDimensions {
  width: number;
  height: number;
}

/** Resolution preset -> actual pixel size lookup table (also used as a type) */
export const RESOLUTION_MAP: Record<ResolutionPreset, ResolutionDimensions> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
};

/** Output container format */
export type OutputFormat = 'webm' | 'mp4';

/** Video codec used when converting to MP4 */
export type VideoCodec = 'h264' | 'h265';

/** Recording quality settings (edited from the settings screen) */
export interface RecordingQualitySettings {
  fps: RecordingFps;
  resolution: ResolutionPreset;
  /** Bitrate in bps (e.g. 8,000,000 = 8 Mbps) */
  bitrate: number;
}

/** Audio input settings */
export interface AudioSettings {
  /** Microphone recording ON/OFF */
  microphoneEnabled: boolean;
  /** System audio recording ON/OFF */
  systemAudioEnabled: boolean;
  /** Selected microphone device ID (undefined when not selected = default device) */
  microphoneDeviceId?: string;
}

/** Recording progress state (a state machine that includes "paused") */
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopping';

/** Settings related to the output destination / file name */
export interface SaveSettings {
  /** Absolute path of the output folder */
  outputDirectory: string;
  /** File name without extension (auto-generated if not specified) */
  fileNameTemplate: string;
  /** Output format */
  format: OutputFormat;
  /** Codec used when the format is MP4 (ignored for WebM) */
  videoCodec: VideoCodec;
}

/** UI display language. Persisted as part of AppSettings so main and renderer agree on it. */
export type SupportedLanguage = 'en' | 'ja';

/** App-wide settings (the persisted object edited from the settings screen) */
export interface AppSettings {
  quality: RecordingQualitySettings;
  save: SaveSettings;
  /** UI display language. Also read by the main process to localize error messages. */
  language: SupportedLanguage;
}

/** Default settings values */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  quality: {
    fps: 30,
    resolution: '1080p',
    bitrate: 8_000_000,
  },
  save: {
    outputDirectory: '', // Initialized to the user's Videos folder etc. when the main process starts
    fileNameTemplate: 'recording',
    format: 'webm',
    videoCodec: 'h264',
  },
  language: 'en',
};

/**
 * Request type bundling all the parameters needed by the renderer
 * to start the MediaRecorder.
 */
export interface StartRecordingRequest {
  source: CaptureSource;
  quality: RecordingQualitySettings;
  audio: AudioSettings;
}

/** Result of stopRecording. Returns the path of the temporary (webm) file. */
export interface StopRecordingResult {
  /** Absolute path of the recorded temporary WebM file */
  tempFilePath: string;
  /** Recording duration (milliseconds) */
  durationMs: number;
}

/** Request for saveVideo (final save, with MP4 conversion if needed) */
export interface SaveVideoRequest {
  /** Temporary file path obtained from stopRecording */
  sourceFilePath: string;
  save: SaveSettings;
  /** Recording duration (milliseconds), used for the history entry */
  durationMs: number;
  /**
   * Unique ID used to associate progress events with the caller.
   * Not used when no MP4 conversion occurs (i.e. WebM-only save).
   */
  requestId: string;
}

export interface SaveVideoResult {
  success: boolean;
  /** Absolute path of the final saved file */
  filePath?: string;
  errorMessage?: string;
}

/**
 * MP4 conversion (FFmpeg) progress notification payload.
 * Sent as a one-way event from main to renderer (on('recorder:conversionProgress')).
 * Carries a requestId to identify which recording's conversion it belongs to.
 */
export interface ConversionProgress {
  requestId: string;
  /** Progress percentage (0-100). May be undefined if FFmpeg cannot determine exact progress. */
  percent?: number;
  /** Current processing phase */
  phase: 'starting' | 'converting' | 'completed' | 'failed';
}

/** Result of the folder selection dialog */
export interface SelectFolderResult {
  canceled: boolean;
  folderPath?: string;
}

/** Permission status, used on macOS etc. */
export type MediaPermissionStatus =
  | 'granted'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'unsupported';

/**
 * Information that lets the renderer decide on feature differences across OSes.
 * Rather than branching with "if" per feature, the UI is designed to switch
 * based on this type.
 */
export interface PlatformCapabilities {
  platform: 'win32' | 'darwin' | 'linux';
  /** Whether system audio loopback recording is available (supported on Windows/macOS 13+, generally false on Linux) */
  systemAudioLoopbackSupported: boolean;
  screenCapturePermission: MediaPermissionStatus;
  microphonePermission: MediaPermissionStatus;
}

/** Metadata for a single recording history entry */
export interface RecordingHistoryItem {
  id: string;
  filePath: string;
  fileName: string;
  format: OutputFormat;
  createdAt: number;
  durationMs: number;
  /** File size in bytes. Undefined if it could not be retrieved. */
  fileSizeBytes?: number;
}

/**
 * Codes used to categorize errors that can occur within the app.
 * Used by the UI to convert them into user-friendly messages.
 */
export type AppErrorCode =
  | 'SOURCE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RECORDING_ALREADY_ACTIVE'
  | 'RECORDING_NOT_ACTIVE'
  | 'FILE_WRITE_FAILED'
  | 'FFMPEG_CONVERSION_FAILED'
  | 'FFMPEG_NOT_AVAILABLE'
  | 'SYSTEM_AUDIO_UNSUPPORTED'
  | 'SCREEN_PERMISSION_REQUIRED'
  | 'MIC_PERMISSION_REQUIRED'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: AppErrorCode;
  message: string;
  /** Debug details (e.g. stack trace) */
  details?: string;
}

/**
 * State of the auto-update flow (electron-updater).
 * Mirrors electron-updater's own event names so the renderer can render a
 * single status string without needing to know electron-updater's API.
 */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

/** One-way notification payload sent from main to renderer as update status changes. */
export interface UpdateStatusPayload {
  status: UpdateStatus;
  /** Version string of the update found on the server (only set once an update is found) */
  version?: string;
  /** Download progress percentage (0-100), only present while status is 'downloading' */
  percent?: number;
  /** Error message, only present when status is 'error' */
  errorMessage?: string;
}
