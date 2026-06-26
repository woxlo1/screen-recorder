import { translate } from '../../i18n';

/**
 * Wraps the browser's standard MediaRecorder API so the recorder feature can use
 * it via simple method calls.
 */
export class MediaRecorderController {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTimestamp = 0;

  /**
   * Starts recording using the given stream.
   * onUnexpectedStop is called when MediaRecorder stops recording on its own
   * without a stop operation being requested (e.g. when a track becomes `ended`
   * due to an OS-level capture failure).
   */
  start(stream: MediaStream, bitrate: number, onUnexpectedStop?: (reason: string) => void): void {
    this.chunks = [];

    // VP9 is adopted as the default codec for its high quality and compression ratio
    // within a WebM container. Falls back to the default automatically if the
    // browser doesn't support it.
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

    // Detects MediaRecorder itself stopping due to an error (e.g. an encoding failure).
    // Without handling this, the error would be silently swallowed while the UI appears
    // frozen.
    this.recorder.onerror = (event: Event) => {
      const message =
        'error' in event ? String((event as ErrorEvent).error) : translate('errors.unknown');
      console.error('[MediaRecorder] error', message);
      onUnexpectedStop?.(translate('errors.recorderEngineError', { message }));
    };

    // Detects when the video track ends prematurely due to an OS-level capture failure
    // (e.g. repeated frame-acquisition failures in Windows Graphics Capture). Without
    // monitoring this, the recording would have internally stopped while the UI still
    // shows "recording" (one cause of the screen turning white).
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (this.recorder?.state === 'recording' || this.recorder?.state === 'paused') {
          onUnexpectedStop?.(translate('errors.captureEndedUnexpectedly'));
        }
      });
    });

    this.startTimestamp = Date.now();
    // Emit a chunk every second. Keeps memory usage manageable even for long recordings.
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
   * Stops the recording and returns the combined Blob and recording duration (ms).
   * Since MediaRecorder.stop() fires the dataavailable/stop events asynchronously,
   * this wraps it in a Promise to await completion.
   */
  stop(): Promise<{ blob: Blob; durationMs: number }> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error(translate('errors.notRecording')));
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
