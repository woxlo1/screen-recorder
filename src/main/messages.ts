import type { SupportedLanguage } from '../shared/types';

/**
 * User-facing message strings produced by the main process (IPC error messages,
 * native dialog titles, FFmpeg error translations).
 *
 * These are kept separate from the renderer's `src/renderer/i18n/translations.ts`
 * because the main process cannot use React context; it instead reads the
 * current language directly from `persistentStore.getSettings().language`
 * and looks messages up here.
 */
export const mainMessages = {
  en: {
    alreadyRecording: 'Recording is already in progress',
    recordingNotStarted: 'Recording has not been started',
    ffmpegNotFound: 'The FFmpeg executable could not be found',
    selectFolderDialogTitle: 'Select an output folder',
    ffmpegMissingReinstallHint:
      'The FFmpeg executable could not be found. Please try reinstalling the app.',
    sourceFileNotFound: 'The recording file to convert could not be found.',
    ffmpegEnoent: 'The FFmpeg executable could not be found.',
    ffmpegInvalidData: 'Failed to read the recording data (the file may be corrupted).',
    ffmpegNoSpace: 'There is not enough free disk space at the output location.',
    ffmpegPermissionDenied: 'You do not have write permission for the output folder.',
    ffmpegGenericFailure: 'MP4 conversion failed: {message}',
    fallbackDisplayName: 'Display',
    fallbackWindowName: 'Window',
  },
  ja: {
    alreadyRecording: '既に録画中です',
    recordingNotStarted: '録画が開始されていません',
    ffmpegNotFound: 'FFmpegの実行ファイルが見つかりません',
    selectFolderDialogTitle: '保存先フォルダを選択',
    ffmpegMissingReinstallHint:
      'FFmpegの実行ファイルが見つかりません。アプリの再インストールをお試しください。',
    sourceFileNotFound: '変換元の録画ファイルが見つかりません。',
    ffmpegEnoent: 'FFmpegの実行ファイルが見つかりませんでした。',
    ffmpegInvalidData:
      '録画データの読み込みに失敗しました（ファイルが破損している可能性があります）。',
    ffmpegNoSpace: '保存先ディスクの空き容量が不足しています。',
    ffmpegPermissionDenied: '保存先フォルダへの書き込み権限がありません。',
    ffmpegGenericFailure: 'MP4変換に失敗しました: {message}',
    fallbackDisplayName: 'ディスプレイ',
    fallbackWindowName: 'ウィンドウ',
  },
} as const satisfies Record<SupportedLanguage, Record<string, string>>;

export type MainMessageKey = keyof (typeof mainMessages)['en'];

/** Looks up a localized main-process message and interpolates `{placeholder}` tokens. */
export function mt(
  language: SupportedLanguage,
  key: MainMessageKey,
  params?: Record<string, string>,
): string {
  const template = mainMessages[language][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in params ? params[token]! : match,
  );
}
