import fs from 'node:fs';
import { app } from 'electron';
// ffmpeg-static は文字列の絶対パス(または非対応プラットフォームではnull)を default export する
// CommonJSパッケージ。mainプロセスのビルド出力はCJS固定にしているため、通常のimportで
// 問題なく読み込める(Viteがビルド時にrequire()相当へ変換する)。
import ffmpegStaticPath from 'ffmpeg-static';

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
 *
 * @throws 現在のOS/アーキテクチャ向けのffmpegバイナリが同梱されていない場合
 */
export function resolveFfmpegPath(): string {
  if (ffmpegStaticPath === null) {
    throw new Error('このOS/アーキテクチャ向けのFFmpegバイナリが見つかりません');
  }

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
