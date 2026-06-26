/**
 * Translation dictionaries for the renderer UI.
 *
 * Design notes:
 *  - Keys are grouped by feature (header, sourceSelector, audioPanel, settings,
 *    history, controls, errors, etc.) to keep this file navigable as it grows.
 *  - `t(key, params?)` (see `useTranslation.ts`) does simple `{placeholder}`
 *    interpolation, so format strings use that syntax instead of positional args.
 *  - Both dictionaries MUST have exactly the same set of keys; the `Translations`
 *    type (derived from the English dictionary) enforces this at compile time.
 */
import type { SupportedLanguage } from '../../shared/types';

export type { SupportedLanguage };

export const en = {
  app: {
    title: 'Screen Recorder',
    loading: 'Loading…',
  },
  header: {
    history: 'History ({count})',
    settings: 'Settings',
  },
  permissions: {
    macScreenDenied:
      'Screen recording permission has not been granted. Please allow this app under ' +
      '"System Settings > Privacy & Security > Screen Recording" and then restart it.',
  },
  recordingError: {
    interrupted: 'Recording was interrupted: {message}',
    windowsHint:
      ' (Windows screen capture can occasionally become temporarily unstable. Please try again.)',
  },
  sourceSelector: {
    title: 'Recording Source',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    desktopGroup: 'Desktop',
    windowGroup: 'Window',
    fallbackDisplayName: 'Display',
    fallbackWindowName: 'Window',
  },
  audioPanel: {
    title: 'Audio Settings',
    microphone: 'Microphone',
    systemAudio: 'System Audio',
    systemAudioUnsupportedNote:
      'System audio recording is not supported on this OS (on macOS, version 13 (Ventura) ' +
      'or later is required). No additional app needs to be installed.',
  },
  previewPanel: {
    sourceSelected: '{name} selected',
    noSourceSelected: 'Please select a capture source',
    startHint: 'The preview will appear here once you start recording',
  },
  controls: {
    start: '● Start Recording',
    pause: '⏸ Pause',
    resume: '▶ Resume',
    stop: '■ Stop',
  },
  conversion: {
    failed: 'MP4 conversion failed',
    completed: 'MP4 conversion completed',
    preparing: 'Preparing MP4 conversion…',
    inProgress: 'Converting to MP4… {percent}%',
    inProgressUnknown: 'Converting to MP4…',
  },
  saving: {
    converting: 'Converting to MP4…',
    saving: 'Saving…',
    success: 'Saved: {path}',
    failure: 'Failed to save: {message}',
    noOutputDirectory: 'No output folder is set. Please choose one from the settings screen.',
  },
  settings: {
    title: 'Settings',
    outputFolder: 'Output Folder',
    notSet: 'Not set',
    select: 'Select',
    fileName: 'File Name',
    saveFormat: 'Save Format',
    videoCodec: 'Video Codec (MP4)',
    codecHint: 'If unsure, choose H.264. H.265 is recommended if you want to reduce the file size.',
    fps: 'FPS',
    resolution: 'Resolution',
    bitrate: 'Bitrate: {value} Mbps',
    formatWebmLabel: 'WebM',
    formatWebmDescription: 'No conversion needed, saves instantly. Larger file size.',
    formatMp4Label: 'MP4',
    formatMp4Description: 'Converted with FFmpeg (takes time). Wide compatibility.',
    codecH264Label: 'H.264',
    codecH264Description:
      'Prioritizes compatibility. Widely supported for playback/editing (recommended).',
    codecH265Label: 'H.265 (HEVC)',
    codecH265Description: 'High compression, high quality. May not play back in some environments.',
    language: 'Language',
    languageJapanese: '日本語',
    languageEnglish: 'English',
  },
  history: {
    title: 'Recording History',
    empty: 'No recordings yet.',
    open: 'Open',
    delete: 'Delete',
  },
  errors: {
    sourceNotSelected: 'No recording source is selected',
    startFailed: 'Failed to start recording',
    stopFailed: 'Failed to stop recording',
    operationFailed: 'Operation failed',
    notRecording: 'Recording has not been started',
    unknown: 'An unknown error occurred',
    screenPermissionHint: 'Screen recording permission may not have been granted.',
    microphonePermissionHint: 'Microphone permission may not have been granted.',
    captureEndedUnexpectedly:
      'Screen capture ended unexpectedly (this may be caused by an OS-level capture issue).',
    recorderEngineError: 'An error occurred in the recording engine: {message}',
  },
};

export const ja: Translations = {
  app: {
    title: 'Screen Recorder',
    loading: '読み込み中…',
  },
  header: {
    history: '🕘 履歴 ({count})',
    settings: '⚙ 設定',
  },
  permissions: {
    macScreenDenied:
      '画面録画の権限が許可されていません。「システム設定 ＞ プライバシーとセキュリティ ＞ ' +
      '画面録画」でこのアプリを許可してから再起動してください。',
  },
  recordingError: {
    interrupted: '録画が中断されました: {message}',
    windowsHint:
      '（Windowsの画面キャプチャ機能が一時的に不安定になることがあります。再度お試しください）',
  },
  sourceSelector: {
    title: '録画対象',
    refresh: '再読み込み',
    refreshing: '更新中…',
    desktopGroup: 'デスクトップ',
    windowGroup: 'ウィンドウ',
    fallbackDisplayName: 'ディスプレイ',
    fallbackWindowName: 'ウィンドウ',
  },
  audioPanel: {
    title: '音声設定',
    microphone: 'マイク録音',
    systemAudio: 'システム音声録音',
    systemAudioUnsupportedNote:
      'このOSではシステム音声の録音に対応していません（macOSの場合はmacOS 13(Ventura)以降が' +
      '必要です。追加アプリのインストールは不要です）。',
  },
  previewPanel: {
    sourceSelected: '{name} を選択中',
    noSourceSelected: 'キャプチャソースを選択してください',
    startHint: '録画を開始するとここにプレビューが表示されます',
  },
  controls: {
    start: '● 録画開始',
    pause: '⏸ 一時停止',
    resume: '▶ 再開',
    stop: '■ 停止',
  },
  conversion: {
    failed: 'MP4変換に失敗しました',
    completed: 'MP4変換が完了しました',
    preparing: 'MP4変換を準備中…',
    inProgress: 'MP4変換中… {percent}%',
    inProgressUnknown: 'MP4変換中…',
  },
  saving: {
    converting: 'MP4へ変換しています…',
    saving: '保存しています…',
    success: '保存しました: {path}',
    failure: '保存に失敗しました: {message}',
    noOutputDirectory: '保存先が未設定です。設定画面から保存先を選択してください。',
  },
  settings: {
    title: '設定',
    outputFolder: '保存先フォルダ',
    notSet: '未設定',
    select: '選択',
    fileName: 'ファイル名',
    saveFormat: '保存形式',
    videoCodec: '映像コーデック (MP4)',
    codecHint: '迷ったらH.264を選んでください。H.265はファイルサイズを抑えたい場合におすすめです。',
    fps: 'FPS',
    resolution: '解像度',
    bitrate: 'ビットレート: {value} Mbps',
    formatWebmLabel: 'WebM',
    formatWebmDescription: '変換不要・即時保存。ファイルサイズは大きめ',
    formatMp4Label: 'MP4',
    formatMp4Description: 'FFmpegで変換(時間がかかります)。互換性が高い',
    codecH264Label: 'H.264',
    codecH264Description: '互換性重視。再生・編集に広く対応(推奨)',
    codecH265Label: 'H.265 (HEVC)',
    codecH265Description: '高圧縮・高画質。一部の環境で再生非対応な場合あり',
    language: '言語',
    languageJapanese: '日本語',
    languageEnglish: 'English',
  },
  history: {
    title: '録画履歴',
    empty: 'まだ録画履歴がありません。',
    open: '開く',
    delete: '削除',
  },
  errors: {
    sourceNotSelected: '録画ソースが選択されていません',
    startFailed: '録画を開始できませんでした',
    stopFailed: '録画を停止できませんでした',
    operationFailed: '操作に失敗しました',
    notRecording: '録画中ではありません',
    unknown: '不明なエラーが発生しました',
    screenPermissionHint: '画面録画の権限が許可されていない可能性があります。',
    microphonePermissionHint: 'マイクの権限が許可されていない可能性があります。',
    captureEndedUnexpectedly:
      '画面キャプチャが予期せず終了しました(OS側のキャプチャ機能の不調が考えられます)。',
    recorderEngineError: '録画エンジンでエラーが発生しました: {message}',
  },
};

/** Shape derived from the English dictionary; both languages must satisfy it. */
export type Translations = typeof en;

export const dictionaries: Record<SupportedLanguage, Translations> = { en, ja };
