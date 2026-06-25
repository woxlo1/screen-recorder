import { useCallback, useRef } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import {
  combineStreams,
  getDisplayMediaStream,
  getMicrophoneStream,
  getSystemAudioStream,
  stopStream,
} from './mediaStream';
import { MediaRecorderController } from './MediaRecorderController';
import { RESOLUTION_MAP } from '../../../shared/types';

/**
 * 録画フロー全体を制御するフック。
 * UIコンポーネントはこのフックが返すアクションを呼ぶだけでよく、
 * Electron IPCやMediaRecorderの詳細を知らなくて済む。
 */
export function useRecorderController() {
  const controllerRef = useRef<MediaRecorderController | null>(null);
  const rawVideoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamsRef = useRef<MediaStream[]>([]);

  const selectedSource = useRecorderStore((s) => s.selectedSource);
  const audioSettings = useRecorderStore((s) => s.audio);
  const quality = useRecorderStore((s) => s.settings.quality);
  const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);
  const setStatus = useRecorderStore((s) => s.setStatus);
  const setPreviewStream = useRecorderStore((s) => s.setPreviewStream);
  const setRecordingError = useRecorderStore((s) => s.setRecordingError);

  /**
   * 録画中に予期せぬエラー(OS側キャプチャ異常等)が起きた際の後始末。
   * ストリームを止め、main側にも停止を伝え、UIへエラーを表示する。
   * 「録画開始」ボタンに戻れる状態まで確実に復帰させることを優先する。
   */
  const handleUnexpectedStop = useCallback(
    (reason: string) => {
      console.error('[recorder] unexpected stop:', reason);
      stopStream(rawVideoStreamRef.current);
      audioStreamsRef.current.forEach(stopStream);
      rawVideoStreamRef.current = null;
      audioStreamsRef.current = [];
      controllerRef.current = null;
      setPreviewStream(null);
      setStatus('idle');
      setRecordingError(reason);
      // main側の状態(recording-state.ts)も録画中のままになってしまうため、
      // stopRecordingを呼んで同期させておく(IPC失敗は握り潰してよい: UI復帰が優先)。
      void window.electronAPI
        .stopRecording({ buffer: new ArrayBuffer(0), durationMs: 0 })
        .catch(() => undefined);
    },
    [setStatus, setPreviewStream, setRecordingError],
  );

  /** 録画開始: ソース・音声ストリームを取得し、main側にも開始を通知する */
  const start = useCallback(async () => {
    if (!selectedSource) {
      throw new Error('録画ソースが選択されていません');
    }

    setRecordingError(null);

    const startResult = await window.electronAPI.startRecording({
      source: selectedSource,
      quality,
      audio: audioSettings,
    });
    if (!startResult.success) {
      throw new Error(startResult.errorMessage ?? '録画を開始できませんでした');
    }

    let videoStream: MediaStream;
    try {
      videoStream = await getDisplayMediaStream(selectedSource, quality);
    } catch (error) {
      // macOSでは「システム環境設定 > 画面録画」の許可が無いとここで失敗する
      throw new Error(
        toFriendlyMediaError(error, '画面録画の権限が許可されていない可能性があります。'),
      );
    }
    rawVideoStreamRef.current = videoStream;

    const audioStreams: MediaStream[] = [];
    try {
      if (audioSettings.microphoneEnabled) {
        audioStreams.push(await getMicrophoneStream(audioSettings.microphoneDeviceId));
      }
      // システム音声はWindowsのみサポート対象(macOSはChromium側の制約で取得不可)。
      // platformCapabilitiesがまだ読み込めていない場合は安全側に倒してスキップする。
      if (audioSettings.systemAudioEnabled && platformCapabilities?.systemAudioLoopbackSupported) {
        audioStreams.push(await getSystemAudioStream());
      }
    } catch (error) {
      stopStream(videoStream);
      throw new Error(
        toFriendlyMediaError(error, 'マイクの権限が許可されていない可能性があります。'),
      );
    }
    audioStreamsRef.current = audioStreams;

    const combined = combineStreams(videoStream, audioStreams);
    setPreviewStream(combined);

    const controller = new MediaRecorderController();
    controller.start(combined, quality.bitrate, handleUnexpectedStop);
    controllerRef.current = controller;

    setStatus('recording');
  }, [
    selectedSource,
    audioSettings,
    quality,
    platformCapabilities,
    setStatus,
    setPreviewStream,
    setRecordingError,
    handleUnexpectedStop,
  ]);

  /** 一時停止 */
  const pause = useCallback(async () => {
    controllerRef.current?.pause();
    await window.electronAPI.pauseRecording();
    setStatus('paused');
  }, [setStatus]);

  /** 再開 */
  const resume = useCallback(async () => {
    controllerRef.current?.resume();
    await window.electronAPI.resumeRecording();
    setStatus('recording');
  }, [setStatus]);

  /**
   * 停止: MediaRecorderを止めてBlobを取得し、mainプロセスへ転送して
   * 一時WebMファイルとして書き出してもらう。戻り値の一時ファイルパスは
   * 保存(saveVideo)ステップで利用する。
   */
  const stop = useCallback(async (): Promise<{ tempFilePath: string; durationMs: number }> => {
    if (!controllerRef.current) {
      throw new Error('録画中ではありません');
    }

    const { blob, durationMs } = await controllerRef.current.stop();
    const buffer = await blob.arrayBuffer();

    const result = await window.electronAPI.stopRecording({ buffer, durationMs });

    // ストリームの後始末
    stopStream(rawVideoStreamRef.current);
    audioStreamsRef.current.forEach(stopStream);
    rawVideoStreamRef.current = null;
    audioStreamsRef.current = [];
    controllerRef.current = null;
    setPreviewStream(null);
    setStatus('idle');

    return result;
  }, [setStatus, setPreviewStream]);

  return { start, pause, resume, stop };
}

/** 解像度プリセットから { width, height } を取得するヘルパー（UI表示などに利用） */
export function getResolutionDimensions(preset: keyof typeof RESOLUTION_MAP) {
  return RESOLUTION_MAP[preset];
}

/**
 * getUserMedia系のDOMExceptionを、ユーザーが対処しやすい日本語メッセージに変換する。
 * NotAllowedError(権限拒否) かどうかを判定し、それ以外は元のエラー内容を表示する。
 */
function toFriendlyMediaError(error: unknown, permissionHint: string): string {
  if (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  ) {
    return permissionHint;
  }
  return error instanceof Error ? error.message : '不明なエラーが発生しました';
}
