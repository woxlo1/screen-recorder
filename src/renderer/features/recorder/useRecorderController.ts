import { useCallback, useRef } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import {
  combineStreams,
  getDisplayCaptureStream,
  getMicrophoneStream,
  stopStream,
} from './mediaStream';
import { MediaRecorderController } from './MediaRecorderController';
import { RESOLUTION_MAP } from '../../../shared/types';
import { translate } from '../../i18n';

/**
 * Hook that controls the entire recording flow.
 * UI components only need to call the actions this hook returns; they don't
 * need to know the details of Electron IPC or MediaRecorder.
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
   * Cleanup performed when an unexpected error occurs mid-recording (e.g. an
   * OS-level capture failure). Stops the streams, tells main to stop as well,
   * and shows the error in the UI. Prioritizes reliably returning to a state
   * where the "Start Recording" button works again.
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
      // Main's state (recording-state.ts) would otherwise stay stuck as "recording",
      // so call stopRecording to resync it (an IPC failure here can be safely swallowed:
      // restoring the UI takes priority).
      void window.electronAPI
        .stopRecording({ buffer: new ArrayBuffer(0), durationMs: 0 })
        .catch(() => undefined);
    },
    [setStatus, setPreviewStream, setRecordingError],
  );

  /** Start recording: acquire the source/audio streams and notify main that recording has started */
  const start = useCallback(async () => {
    if (!selectedSource) {
      throw new Error(translate('errors.sourceNotSelected'));
    }

    setRecordingError(null);

    const startResult = await window.electronAPI.startRecording({
      source: selectedSource,
      quality,
      audio: audioSettings,
    });
    if (!startResult.success) {
      throw new Error(startResult.errorMessage ?? translate('errors.startFailed'));
    }

    let videoStream: MediaStream;
    try {
      // Acquire the video stream and (if enabled) system audio together in a single
      // getDisplayMedia call. Main's setDisplayMediaRequestHandler sees the already
      // selected source and whether system audio is requested and responds
      // automatically, so the OS picker is never shown here.
      // If platformCapabilities hasn't loaded yet, or the OS doesn't support it,
      // fail safe by skipping system audio.
      const wantsSystemAudio =
        audioSettings.systemAudioEnabled &&
        Boolean(platformCapabilities?.systemAudioLoopbackSupported);
      videoStream = await getDisplayCaptureStream(quality, wantsSystemAudio);
    } catch (error) {
      // On macOS, this fails here if "System Settings > Screen Recording" permission hasn't been granted
      throw new Error(toFriendlyMediaError(error, translate('errors.screenPermissionHint')));
    }
    rawVideoStreamRef.current = videoStream;

    const audioStreams: MediaStream[] = [];
    try {
      if (audioSettings.microphoneEnabled) {
        audioStreams.push(await getMicrophoneStream(audioSettings.microphoneDeviceId));
      }
    } catch (error) {
      stopStream(videoStream);
      throw new Error(toFriendlyMediaError(error, translate('errors.microphonePermissionHint')));
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

  /** Pause */
  const pause = useCallback(async () => {
    controllerRef.current?.pause();
    await window.electronAPI.pauseRecording();
    setStatus('paused');
  }, [setStatus]);

  /** Resume */
  const resume = useCallback(async () => {
    controllerRef.current?.resume();
    await window.electronAPI.resumeRecording();
    setStatus('recording');
  }, [setStatus]);

  /**
   * Stop: stops the MediaRecorder, gets the resulting Blob, and transfers it to
   * the main process to be written out as a temporary WebM file. The returned
   * temporary file path is used in the following save (saveVideo) step.
   */
  const stop = useCallback(async (): Promise<{ tempFilePath: string; durationMs: number }> => {
    if (!controllerRef.current) {
      throw new Error(translate('errors.notRecording'));
    }

    const { blob, durationMs } = await controllerRef.current.stop();
    const buffer = await blob.arrayBuffer();

    const result = await window.electronAPI.stopRecording({ buffer, durationMs });

    // Clean up the streams
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

/** Helper that gets { width, height } from a resolution preset (used e.g. for UI display) */
export function getResolutionDimensions(preset: keyof typeof RESOLUTION_MAP) {
  return RESOLUTION_MAP[preset];
}

/**
 * Converts a getUserMedia-family DOMException into a message the user can act on.
 * Checks whether it's a NotAllowedError (permission denied); otherwise shows the
 * original error content.
 */
function toFriendlyMediaError(error: unknown, permissionHint: string): string {
  if (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  ) {
    return permissionHint;
  }
  return error instanceof Error ? error.message : translate('errors.unknown');
}
