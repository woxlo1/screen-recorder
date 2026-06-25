import type { RecordingStatus } from '../shared/types';

/**
 * main プロセス内で録画の進行状態を保持するクラス。
 *
 * 実際のメディアキャプチャ(MediaRecorder)はブラウザAPIのためrendererでしか
 * 動作しないが、「今録画中かどうか」を多重起動防止・トレイアイコン更新などの
 * 目的でmain側でも把握しておく必要があるため、ここで状態を一元管理する。
 */
export class RecordingStateManager {
  private status: RecordingStatus = 'idle';
  private startedAt: number | null = null;

  getStatus(): RecordingStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === 'recording' || this.status === 'paused';
  }

  start(): void {
    this.status = 'recording';
    this.startedAt = Date.now();
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

  /** 停止し、録画時間(ms)を返してidleに戻す */
  stop(): number {
    const duration = this.startedAt !== null ? Date.now() - this.startedAt : 0;
    this.status = 'idle';
    this.startedAt = null;
    return duration;
  }

  reset(): void {
    this.status = 'idle';
    this.startedAt = null;
  }
}

/** main プロセス全体で共有するシングルトンインスタンス */
export const recordingStateManager = new RecordingStateManager();
