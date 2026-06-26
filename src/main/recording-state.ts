import type { RecordingStatus } from '../shared/types';

/**
 * Class that holds the in-progress state of a recording within the main process.
 *
 * Actual media capture (MediaRecorder) is a browser API and can therefore only run
 * in the renderer, but the main process still needs to know "whether a recording
 * is currently active" for purposes like preventing duplicate starts or updating a
 * tray icon, so that state is centrally managed here.
 *
 * Additionally, Electron's session.setDisplayMediaRequestHandler needs to know
 * "which capture source the user currently has selected" and "whether to include
 * system audio (loopback)" from the main process side, so those are also held here.
 */
export class RecordingStateManager {
  private status: RecordingStatus = 'idle';
  private startedAt: number | null = null;
  private selectedSourceId: string | null = null;
  private systemAudioRequested = false;

  getStatus(): RecordingStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === 'recording' || this.status === 'paused';
  }

  /** ID of the capture source currently selected for recording (read by displayMediaRequestHandler) */
  getSelectedSourceId(): string | null {
    return this.selectedSourceId;
  }

  /** Whether to record including system audio (loopback) */
  isSystemAudioRequested(): boolean {
    return this.systemAudioRequested;
  }

  start(selectedSourceId: string, systemAudioRequested: boolean): void {
    this.status = 'recording';
    this.startedAt = Date.now();
    this.selectedSourceId = selectedSourceId;
    this.systemAudioRequested = systemAudioRequested;
  }

  pause(): void {
    if (this.status === 'recording') {
      this.status = 'paused';
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'recording';
    }
  }

  /** Stops, returns the recording duration (ms), and returns to idle */
  stop(): number {
    const duration = this.startedAt !== null ? Date.now() - this.startedAt : 0;
    this.status = 'idle';
    this.startedAt = null;
    this.selectedSourceId = null;
    this.systemAudioRequested = false;
    return duration;
  }

  reset(): void {
    this.status = 'idle';
    this.startedAt = null;
    this.selectedSourceId = null;
    this.systemAudioRequested = false;
  }
}

/** Singleton instance shared across the entire main process */
export const recordingStateManager = new RecordingStateManager();
