import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Directory for the temporary WebM file produced right after a recording finishes.
 * Placing it under the app's userData directory makes it less likely to be affected
 * by OS temp-folder cleanup.
 */
export function getTempRecordingDir(): string {
  const dir = path.join(app.getPath('userData'), 'temp-recordings');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Default output destination (creates a dedicated folder under Windows' "Videos" folder) */
export function getDefaultOutputDir(): string {
  const dir = path.join(app.getPath('videos'), 'ScreenRecorder');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Generates a unique file path for a temporary file */
export function createTempFilePath(extension: 'webm'): string {
  const fileName = `rec-${Date.now()}.${extension}`;
  return path.join(getTempRecordingDir(), fileName);
}

/** Gets the file size (bytes). Returns undefined on failure (history display is best-effort) */
export function getFileSizeSafe(filePath: string): number | undefined {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return undefined;
  }
}
