/**
 * アプリ全体で共有する基礎的な型定義。
 * main / preload / renderer のどこからでも import 可能（Node API 依存を持たない）。
 */

/** 録画可能なキャプチャソースの種類 */
export type CaptureSourceType = 'screen' | 'window';

/**
 * desktopCapturer.getSources() の結果をレンダラーに渡すための
 * シリアライズ可能な形式（NativeImage は dataURL 文字列に変換する）
 */
export interface CaptureSource {
  /** Electron 内部で使われるソースID（desktopCapturer chromeMediaSourceId に渡す） */
  id: string;
  /** ユーザーに表示する名前（モニター名・ウィンドウタイトル） */
  name: string;
  /** スクリーン全体 or 個別ウィンドウ */
  type: CaptureSourceType;
  /** サムネイル画像（PNG dataURL） */
  thumbnailDataUrl: string;
  /** 複数モニター対応のための表示ID（screen の場合のみ有効） */
  displayId?: string;
}

/** 対応FPS（仕様で固定の2値） */
export type RecordingFps = 30 | 60;

/** 対応解像度プリセット */
export type ResolutionPreset = '720p' | '1080p' | '1440p' | '4k';

export interface ResolutionDimensions {
  width: number;
  height: number;
}

/** 解像度プリセット → 実際のピクセルサイズ の対応表（型としても利用） */
export const RESOLUTION_MAP: Record<ResolutionPreset, ResolutionDimensions> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
};

/** 出力コンテナ形式 */
export type OutputFormat = 'webm' | 'mp4';

/** MP4変換時の映像コーデック */
export type VideoCodec = 'h264' | 'h265';

/** 録画品質設定（設定画面で変更する項目） */
export interface RecordingQualitySettings {
  fps: RecordingFps;
  resolution: ResolutionPreset;
  /** ビットレート (bps 単位。例: 8,000,000 = 8Mbps) */
  bitrate: number;
}

/** 音声入力設定 */
export interface AudioSettings {
  /** マイク録音 ON/OFF */
  microphoneEnabled: boolean;
  /** システム音声録音 ON/OFF */
  systemAudioEnabled: boolean;
  /** 選択中のマイクデバイスID（未選択時は undefined = デフォルトデバイス） */
  microphoneDeviceId?: string;
}

/** 録画の進行状態（一時停止を含む状態機械） */
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopping';

/** 保存先・ファイル名に関する設定 */
export interface SaveSettings {
  /** 保存先フォルダの絶対パス */
  outputDirectory: string;
  /** 拡張子を含まないファイル名（指定が無ければ自動生成） */
  fileNameTemplate: string;
  /** 出力フォーマット */
  format: OutputFormat;
  /** MP4の場合のコーデック（webm時は無視） */
  videoCodec: VideoCodec;
}

/** アプリ全体の設定（設定画面で編集される永続化対象） */
export interface AppSettings {
  quality: RecordingQualitySettings;
  save: SaveSettings;
}

/** デフォルト設定値 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  quality: {
    fps: 30,
    resolution: '1080p',
    bitrate: 8_000_000,
  },
  save: {
    outputDirectory: '', // main プロセス起動時にユーザーのVideosフォルダ等で初期化
    fileNameTemplate: 'recording',
    format: 'webm',
    videoCodec: 'h264',
  },
};

/**
 * レンダラー側で MediaRecorder を起動する際に必要な
 * すべてのパラメータをまとめたリクエスト型
 */
export interface StartRecordingRequest {
  source: CaptureSource;
  quality: RecordingQualitySettings;
  audio: AudioSettings;
}

/** stopRecording の結果。一時ファイル(webm)のパスを返す */
export interface StopRecordingResult {
  /** 録画された一時 WebM ファイルの絶対パス */
  tempFilePath: string;
  /** 録画時間(ミリ秒) */
  durationMs: number;
}

/** saveVideo（最終保存・必要ならMP4変換）のリクエスト */
export interface SaveVideoRequest {
  /** stopRecording で得られた一時ファイルパス */
  sourceFilePath: string;
  save: SaveSettings;
  /** 履歴記録用の録画時間(ミリ秒) */
  durationMs: number;
  /**
   * 進捗イベントを呼び出し元に紐付けるための一意なID。
   * MP4変換が発生しない(WebM保存のみの)場合は使われない。
   */
  requestId: string;
}

export interface SaveVideoResult {
  success: boolean;
  /** 保存された最終ファイルの絶対パス */
  filePath?: string;
  errorMessage?: string;
}

/**
 * MP4変換（FFmpeg）の進捗通知ペイロード。
 * main → renderer へ一方向イベント (on('recorder:conversionProgress')) で送られる。
 * 同一録画の処理であることを識別するため requestId を持たせる。
 */
export interface ConversionProgress {
  requestId: string;
  /** 0-100 の進捗率。FFmpegが正確な進捗を算出できない場合はundefinedになることがある */
  percent?: number;
  /** 現在の処理状況 */
  phase: 'starting' | 'converting' | 'completed' | 'failed';
}

/** フォルダ選択ダイアログの結果 */
export interface SelectFolderResult {
  canceled: boolean;
  folderPath?: string;
}

/** macOS等での権限状態 */
export type MediaPermissionStatus =
  | 'granted'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'unsupported';

/**
 * 実行中のOSによって異なる機能差を、renderer側が判断するための情報。
 * 「機能ごとにif分岐する」のではなく、この型を見てUIを切り替える設計にする。
 */
export interface PlatformCapabilities {
  platform: 'win32' | 'darwin' | 'linux';
  /** システム音声のループバック録音が可能か（Windows/macOS13+で対応、Linuxは原則false） */
  systemAudioLoopbackSupported: boolean;
  screenCapturePermission: MediaPermissionStatus;
  microphonePermission: MediaPermissionStatus;
}

/** 録画履歴の1件分のメタデータ */
export interface RecordingHistoryItem {
  id: string;
  filePath: string;
  fileName: string;
  format: OutputFormat;
  createdAt: number;
  durationMs: number;
  /** ファイルサイズ(バイト)。取得できなければundefined */
  fileSizeBytes?: number;
}

/**
 * アプリ内で発生し得るエラーを種別化するためのコード。
 * UI側でユーザーフレンドリーなメッセージに変換するために使う。
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
  /** デバッグ用の詳細情報（スタックトレース等） */
  details?: string;
}
