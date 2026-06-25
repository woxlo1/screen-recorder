import type { RecordingStatus } from '../shared/types';

/**
 * main プロセス内で録画の進行状態を保持するクラス。
 *
 * 実際のメディアキャプチャ(MediaRecorder)はブラウザAPIのためrendererでしか
 * 動作しないが、「今録画中かどうか」を多重起動防止・トレイアイコン更新などの
 * 目的でmain側でも把握しておく必要があるため、ここで状態を一元管理する。
 *
 * また、Electronの session.setDisplayMediaRequestHandler は「今ユーザーが
 * 選択しているキャプチャソースID」と「システム音声(ループバック)を含めるか」を
 * main プロセス側で知っている必要があるため、それらもここで保持する。
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

  /** 現在録画対象として選択されているキャプチャソースID（displayMediaRequestHandlerが参照） */
  getSelectedSourceId(): string | null {
    return this.selectedSourceId;
  }

  /** システム音声(ループバック)を含めて録画するかどうか */
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

  /** 停止し、録画時間(ms)を返してidleに戻す */
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

/** main プロセス全体で共有するシングルトンインスタンス */
export const recordingStateManager = new RecordingStateManager();
