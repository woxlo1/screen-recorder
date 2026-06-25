/**
 * ブラウザ標準のMediaRecorder APIをラップし、
 * 録画機能(feature)からはシンプルなメソッド呼び出しだけで使えるようにする。
 */
export class MediaRecorderController {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTimestamp = 0;

  /** 指定のストリームを使って録画を開始する */
  start(stream: MediaStream, bitrate: number): void {
    this.chunks = [];

    // VP9はWebMコンテナで高画質・高圧縮率のため既定コーデックとして採用。
    // ブラウザがサポートしていない場合は自動でデフォルトにフォールバックする。
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    this.recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.startTimestamp = Date.now();
    // 1秒ごとにチャンクを切り出す。長時間録画でもメモリに優しい。
    this.recorder.start(1000);
  }

  pause(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause();
    }
  }

  resume(): void {
    if (this.recorder?.state === 'paused') {
      this.recorder.resume();
    }
  }

  /**
   * 録画を停止し、結合済みのBlobと録画時間(ms)を返す。
   * MediaRecorder.stop()は非同期にdataavailable/stopイベントを発火するため、
   * Promiseでラップして完了を待つ。
   */
  stop(): Promise<{ blob: Blob; durationMs: number }> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('録画が開始されていません'));
        return;
      }

      const durationMs = Date.now() - this.startTimestamp;

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        resolve({ blob, durationMs });
      };

      this.recorder.stop();
    });
  }

  get state(): RecordingState | 'inactive' {
    return this.recorder?.state ?? 'inactive';
  }
}
