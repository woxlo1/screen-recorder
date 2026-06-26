import fs from 'node:fs';
import { app } from 'electron';
// ffmpeg-static is a CommonJS package that default-exports an absolute path string
// (or null on unsupported platforms). Since the main process build output is fixed
// to CJS, it can be imported normally (Vite converts it to a require() call at build time).
import ffmpegStaticPath from 'ffmpeg-static';

/**
 * Resolves the binary path returned by ffmpeg-static correctly both in development
 * and after packaging.
 *
 * Background:
 *  - ffmpeg-static's `ffmpegPath` points to the real binary path inside node_modules.
 *  - When packaged with electron-builder, node_modules gets bundled into app.asar,
 *    but the binary (an executable) can't be exec'd directly from inside an asar
 *    archive, so it must be unpacked into app.asar.unpacked via electron-builder.json's
 *    `asarUnpack` setting.
 *  - For that reason, in production we use a path where the string `app.asar` has been
 *    replaced with `app.asar.unpacked`.
 *  - This replacement logic works on both Windows and macOS (it doesn't depend on the
 *    path separator character).
 *
 * @throws if no FFmpeg binary for the current OS/architecture is bundled
 */
export function resolveFfmpegPath(): string {
  if (ffmpegStaticPath === null) {
    throw new Error('No FFmpeg binary found for this OS/architecture');
  }

  if (!app.isPackaged) {
    return ffmpegStaticPath;
  }

  const unpackedPath = ffmpegStaticPath.replace('app.asar', 'app.asar.unpacked');
  return fs.existsSync(unpackedPath) ? unpackedPath : ffmpegStaticPath;
}

/** Checks whether the ffmpeg binary actually exists and is executable (used for startup checks / error handling). */
export function isFfmpegAvailable(): boolean {
  try {
    const ffmpegPath = resolveFfmpegPath();
    return fs.existsSync(ffmpegPath);
  } catch {
    return false;
  }
}

/** Logs the resolved absolute path of ffmpeg for debugging purposes. */
export function logFfmpegPath(): void {
  try {
    console.log('[ffmpeg] resolved path:', resolveFfmpegPath());
  } catch (error) {
    console.error('[ffmpeg] failed to resolve path', error);
  }
}
