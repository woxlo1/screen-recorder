import fs from 'node:fs';
import { createRequire } from 'node:module';
import { app } from 'electron';

// このプロジェクトは "type": "module" (ESM) だが、ffmpeg-static は CommonJS パッケージで
// 文字列パスを default export するだけのモジュールのため、createRequire 経由で読み込む。
const require = createRequire(import.meta.url);

/**
 * ffmpeg-static が返すバイナリパスを、開発時 / パッケージ後の両方で正しく解決する。
 *
 * 背景:
 *  - ffmpeg-static の `ffmpegPath` は node_modules 内の実バイナリパスを指す。
 *  - electron-builder で packaging すると node_modules は app.asar に固められるが、
 *    バイナリ(実行ファイル)は asar 内から直接 exec できないため、
 *    electron-builder.json の `asarUnpack` で app.asar.unpacked 配下に展開しておく必要がある。
 *  - そのため本番環境では `app.asar` という文字列を `app.asar.unpacked` に置き換えたパスを使う。
 *  - Windows / macOS いずれもこの置換ロジックで対応可能（パス区切り文字に依存しないため）。
 */
export function resolveFfmpegPath(): string {
  const ffmpegStaticPath = require('ffmpeg-static') as string;

  if (!app.isPackaged) {
    return ffmpegStaticPath;
  }

  const unpackedPath = ffmpegStaticPath.replace('app.asar', 'app.asar.unpacked');
  return fs.existsSync(unpackedPath) ? unpackedPath : ffmpegStaticPath;
}

/** ffmpegバイナリが実際に存在し実行可能か確認する（起動時の事前チェック・エラーハンドリング用） */
export function isFfmpegAvailable(): boolean {
  try {
    const ffmpegPath = resolveFfmpegPath();
    return fs.existsSync(ffmpegPath);
  } catch {
    return false;
  }
}

/** デバッグ用にffmpegの解決済み絶対パスをログ出力する */
export function logFfmpegPath(): void {
  try {
    console.log('[ffmpeg] resolved path:', resolveFfmpegPath());
  } catch (error) {
    console.error('[ffmpeg] failed to resolve path', error);
  }
}
