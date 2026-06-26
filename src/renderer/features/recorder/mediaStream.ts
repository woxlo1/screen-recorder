import type { CaptureSource, RecordingQualitySettings } from '../../../shared/types';
import { RESOLUTION_MAP } from '../../../shared/types';

/**
 * Acquires the screen/window video stream and, if needed, system audio (loopback)
 * together in a single getDisplayMedia call.
 *
 * Which source to record and whether to include system audio is decided ahead of
 * time via window.electronAPI.startRecording(), and main's
 * session.setDisplayMediaRequestHandler (src/main/index.ts) reads that and
 * responds automatically, so the OS picker is never shown here.
 *
 * The old implementation called getUserMedia twice -- once for video and once for
 * audio (both using the chromeMediaSource:'desktop' mandatory constraint) -- and
 * that was the cause of the bug where the recording screen turned completely
 * white. Combining video + audio into a single request avoids that bug.
 *
 * Resolution/FPS are passed as "desired" values. Since the actual capture
 * resolution depends on the underlying display resolution, there's no guarantee
 * the values specified here are always honored exactly (it's browser/OS dependent).
 */
export async function getDisplayCaptureStream(
  quality: RecordingQualitySettings,
  includeSystemAudio: boolean,
): Promise<MediaStream> {
  const { width, height } = RESOLUTION_MAP[quality.resolution];

  return navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: quality.fps, max: quality.fps },
    },
    // When includeSystemAudio is false, main's handler responds without including
    // an audio track, so passing audio: true here can't accidentally pick up
    // microphone audio.
    audio: includeSystemAudio,
  });
}

/** Acquires the microphone audio stream */
export async function getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false,
  });
}

/**
 * Combines a video stream and a (possibly empty) set of audio streams into a
 * single MediaStream. MediaRecorder can record video and audio simultaneously
 * by being given a single MediaStream that contains multiple tracks.
 */
export function combineStreams(video: MediaStream, audioStreams: MediaStream[]): MediaStream {
  const combined = new MediaStream();
  video.getVideoTracks().forEach((track) => combined.addTrack(track));
  video.getAudioTracks().forEach((track) => combined.addTrack(track));
  audioStreams.forEach((stream) => {
    stream.getAudioTracks().forEach((track) => combined.addTrack(track));
  });
  return combined;
}

/** Stops every track in a stream (prevents memory leaks) */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Type export for convenience (so other modules referencing CaptureSource can reuse this one) */
export type { CaptureSource };
