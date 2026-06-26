import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import type { SupportedLanguage, VideoCodec } from '../shared/types';
import { resolveFfmpegPath, isFfmpegAvailable } from './ffmpeg-binary';
import { mt } from './messages';

/**
 * Configures fluent-ffmpeg with the bundled binary path exactly once.
 * Running this at module load time means subsequent convert calls don't
 * need to configure it again.
 */
let ffmpegConfigured = false;
function ensureFfmpegConfigured(): void {
  if (ffmpegConfigured) return;
  if (isFfmpegAvailable()) {
    ffmpeg.setFfmpegPath(resolveFfmpegPath());
  }
  ffmpegConfigured = true;
}

/** Mapping of FFmpeg encoder name / recommended options per codec */
const CODEC_PRESETS: Record<VideoCodec, { videoCodec: string; outputOptions: string[] }> = {
  h264: {
    videoCodec: 'libx264',
    outputOptions: ['-preset', 'fast', '-pix_fmt', 'yuv420p'],
  },
  h265: {
    videoCodec: 'libx265',
    // libx265 encodes more slowly than libx264, so we mostly leave preset/CRF at their
    // defaults, but add -tag:v hvc1 to ensure thumbnail/playback compatibility with
    // QuickTime/Finder on macOS.
    outputOptions: ['-preset', 'fast', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1'],
  },
};

export interface ConvertOptions {
  inputPath: string;
  outputPath: string;
  videoCodec: VideoCodec;
  /** Video bitrate (bps). If not specified, FFmpeg's default CRT-equivalent quality is used. */
  bitrate?: number;
  /** Callback invoked with progress (0-100) as it updates. May not be called if FFmpeg can't compute it. */
  onProgress?: (percent: number) => void;
  /** UI language, used to localize any error message produced during conversion. */
  language: SupportedLanguage;
}

export class FfmpegConversionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FfmpegConversionError';
  }
}

/**
 * Converts WebM (VP8/VP9 + Opus) to MP4 (H264/H265 + AAC).
 *
 * Design notes:
 *  - The input is the WebM file produced by MediaRecorder (already saved temporarily
 *    by renderer -> stopRecording).
 *  - Audio is fixed to AAC (the standard audio codec for MP4 containers, with the
 *    widest player support).
 *  - Progress is reported using FFmpeg's `progress` event's `percent` field.
 *    For WebM input, duration detection accuracy is low and `percent` can be undefined,
 *    in which case onProgress is intentionally not called so the caller can tell that
 *    progress is "unknown but still in progress".
 */
export function convertWebmToMp4(options: ConvertOptions): Promise<void> {
  ensureFfmpegConfigured();

  return new Promise((resolve, reject) => {
    if (!isFfmpegAvailable()) {
      reject(new FfmpegConversionError(mt(options.language, 'ffmpegMissingReinstallHint')));
      return;
    }

    if (!fs.existsSync(options.inputPath)) {
      reject(new FfmpegConversionError(mt(options.language, 'sourceFileNotFound')));
      return;
    }

    const preset = CODEC_PRESETS[options.videoCodec];

    const command = ffmpeg(options.inputPath)
      .videoCodec(preset.videoCodec)
      .audioCodec('aac')
      .audioBitrate('192k')
      .outputOptions(preset.outputOptions)
      .format('mp4');

    if (options.bitrate) {
      // Bitrate is specified in bps; convert to kbps for fluent-ffmpeg.
      command.videoBitrate(Math.round(options.bitrate / 1000));
    }

    command
      .on('progress', (progress) => {
        if (typeof progress.percent === 'number' && Number.isFinite(progress.percent)) {
          const clamped = Math.min(100, Math.max(0, progress.percent));
          options.onProgress?.(clamped);
        }
      })
      .on('error', (error) => {
        console.error('[ffmpeg] conversion failed', error);
        reject(new FfmpegConversionError(toFriendlyFfmpegError(error, options.language), error));
      })
      .on('end', () => {
        resolve();
      })
      .save(options.outputPath);
  });
}

/** Localizes FFmpeg's raw English error messages for a handful of common cases. */
function toFriendlyFfmpegError(error: Error, language: SupportedLanguage): string {
  const msg = error.message.toLowerCase();
  if (msg.includes('enoent')) {
    return mt(language, 'ffmpegEnoent');
  }
  if (msg.includes('invalid data') || msg.includes('moov atom not found')) {
    return mt(language, 'ffmpegInvalidData');
  }
  if (msg.includes('no space left')) {
    return mt(language, 'ffmpegNoSpace');
  }
  if (msg.includes('permission denied') || msg.includes('eacces')) {
    return mt(language, 'ffmpegPermissionDenied');
  }
  return mt(language, 'ffmpegGenericFailure', { message: error.message });
}
