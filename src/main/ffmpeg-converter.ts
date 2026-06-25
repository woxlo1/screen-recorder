import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import type { VideoCodec } from '../shared/types';
import { resolveFfmpegPath, isFfmpegAvailable } from './ffmpeg-binary';

/**
 * fluent-ffmpeg に同梱バイナリのパスを一度だけ設定する。
 * モジュール読み込み時に実行することで、以後のconvert呼び出しで毎回設定する必要がなくなる。
 */
let ffmpegConfigured = false;
function ensureFfmpegConfigured(): void {
  if (ffmpegConfigured) return;
  if (isFfmpegAvailable()) {
    ffmpeg.setFfmpegPath(resolveFfmpegPath());
  }
  ffmpegConfigured = true;
}

/** コーデックごとのFFmpegエンコーダ名・推奨オプションのマッピング */
const CODEC_PRESETS: Record<VideoCodec, { videoCodec: string; outputOptions: string[] }> = {
  h264: {
    videoCodec: 'libx264',
    outputOptions: ['-preset', 'fast', '-pix_fmt', 'yuv420p'],
  },
  h265: {
    videoCodec: 'libx265',
    // libx265はlibx264よりエンコードが遅いため、preset/CRTなどデフォルトに任せつつ
    // -tag:v hvc1 を付けることでmacOSのQuickTime/Finderでもサムネイル・再生互換性を確保する。
    outputOptions: ['-preset', 'fast', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1'],
  },
};

export interface ConvertOptions {
  inputPath: string;
  outputPath: string;
  videoCodec: VideoCodec;
  /** 映像ビットレート(bps)。指定が無い場合はFFmpegのCRT既定品質に任せる */
  bitrate?: number;
  /** 進捗(0-100)を都度通知するコールバック。FFmpegが算出できない場合は呼ばれないことがある */
  onProgress?: (percent: number) => void;
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
 * WebM(VP8/VP9 + Opus) を MP4(H264/H265 + AAC) へ変換する。
 *
 * 設計メモ:
 *  - 入力は MediaRecorder が生成した WebM ファイル（renderer→stopRecordingで一時保存済み）。
 *  - 音声はAAC固定（MP4コンテナの標準的な音声コーデックであり、対応プレイヤーが最も広い）。
 *  - 進捗はFFmpegの `progress` イベントの `percent` を利用する。
 *    WebM入力では総時間(duration)の取得精度が低く percent が undefined になることがあるため、
 *    その場合は呼び出し元に「不明だが進行中」であることが伝わるよう onProgress を呼ばない設計にしている。
 */
export function convertWebmToMp4(options: ConvertOptions): Promise<void> {
  ensureFfmpegConfigured();

  return new Promise((resolve, reject) => {
    if (!isFfmpegAvailable()) {
      reject(
        new FfmpegConversionError(
          'FFmpegの実行ファイルが見つかりません。アプリの再インストールをお試しください。',
        ),
      );
      return;
    }

    if (!fs.existsSync(options.inputPath)) {
      reject(new FfmpegConversionError('変換元の録画ファイルが見つかりません。'));
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
      // ビットレート指定。bps → kbpsへ変換してfluent-ffmpegに渡す。
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
        reject(new FfmpegConversionError(toFriendlyFfmpegError(error), error));
      })
      .on('end', () => {
        resolve();
      })
      .save(options.outputPath);
  });
}

/** FFmpegが返す英語の生エラーメッセージを、よくあるケースだけ日本語化する */
function toFriendlyFfmpegError(error: Error): string {
  const msg = error.message.toLowerCase();
  if (msg.includes('enoent')) {
    return 'FFmpegの実行ファイルが見つかりませんでした。';
  }
  if (msg.includes('invalid data') || msg.includes('moov atom not found')) {
    return '録画データの読み込みに失敗しました（ファイルが破損している可能性があります）。';
  }
  if (msg.includes('no space left')) {
    return '保存先ディスクの空き容量が不足しています。';
  }
  if (msg.includes('permission denied') || msg.includes('eacces')) {
    return '保存先フォルダへの書き込み権限がありません。';
  }
  return `MP4変換に失敗しました: ${error.message}`;
}
