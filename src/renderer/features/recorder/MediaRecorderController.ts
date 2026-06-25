/**
 * ブラウザ標準のMediaRecorder APIをラップし、
 * 録画機能(feature)からはシンプルなメソッド呼び出しだけで使えるようにする。
 */
export class MediaRecorderController {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTimestamp = 0;

  /**
   * 指定のストリームを使って録画を開始する。
   * onUnexpectedStop は、停止操作をしていないのにMediaRecorderが録画を止めてしまった場合
   * (OS側のキャプチャ異常などでトラックが`ended`になった場合等)に呼ばれる。
   */
  start(stream: MediaStream, bitrate: number, onUnexpectedStop?: (reason: string) => void): void {
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

    // MediaRecorder自体がエラーで停止した場合(エンコード失敗等)を検知する。
    // ハンドリングしないと、エラーが握り潰されたままUIが固まって見える原因になる。
    this.recorder.onerror = (event: Event) => {
      const message = 'error' in event ? String((event as ErrorEvent).error) : '不明なエラー';
      console.error('[MediaRecorder] error', message);
      onUnexpectedStop?.(`録画エンジンでエラーが発生しました: ${message}`);
    };

    // 映像トラックがOS側のキャプチャ異常(例: Windows Graphics Captureのフレーム取得失敗が
    // 続いた場合)で途中終了した場合に検知する。これを監視しないと、録画は内部的に
    // 止まっているのにUIだけが「録画中」のまま固まって見える(画面が白くなる現象の一因)。
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (this.recorder?.state === 'recording' || this.recorder?.state === 'paused') {
          onUnexpectedStop?.(
            '画面キャプチャが予期せず終了しました(OS側のキャプチャ機能の不調が考えられます)。',
          );
        }
      });
    });

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
