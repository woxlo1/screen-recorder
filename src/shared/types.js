/**
 * アプリ全体で共有する基礎的な型定義。
 * main / preload / renderer のどこからでも import 可能（Node API 依存を持たない）。
 */
/** 解像度プリセット → 実際のピクセルサイズ の対応表（型としても利用） */
export const RESOLUTION_MAP = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
    '4k': { width: 3840, height: 2160 },
};
/** デフォルト設定値 */
export const DEFAULT_APP_SETTINGS = {
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
