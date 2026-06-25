import type { CaptureSource, RecordingQualitySettings } from '../../../shared/types';
import { RESOLUTION_MAP } from '../../../shared/types';

/**
 * Electronの desktopCapturer ソースIDを使って、画面/ウィンドウの映像ストリームを取得する。
 * `chromeMediaSourceId` を指定したmandatory制約は非標準APIのためTypeScriptの
 * 標準DOM型に存在しない。そのためここでだけ型アサーションを許容する。
 *
 * 解像度・FPSは「希望値」として渡す。実際のキャプチャ解像度は元のディスプレイ
 * 解像度に依存するため、ここで指定した値が必ず適用される保証はない
 * （ブラウザ/OSの実装依存）。Windows/macOSどちらでも同じmandatory形式で動作する。
 */
export async function getDisplayMediaStream(
  source: CaptureSource,
  quality: RecordingQualitySettings,
): Promise<MediaStream> {
  const { width, height } = RESOLUTION_MAP[quality.resolution];

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        minWidth: width,
        maxWidth: width,
        minHeight: height,
        maxHeight: height,
        minFrameRate: quality.fps,
        maxFrameRate: quality.fps,
      },
    },
  } as unknown as MediaStreamConstraints;

  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * システム音声(ループバック)を取得する。
 * Windows + Electronでは chromeMediaSource: 'desktop' を audio制約にも
 * 指定することで、現在再生中のシステム音声を取得できる。
 */
export async function getSystemAudioStream(): Promise<MediaStream> {
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
      },
    },
    video: false,
  } as unknown as MediaStreamConstraints;

  return navigator.mediaDevices.getUserMedia(constraints);
}

/** マイク音声ストリームを取得する */
export async function getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false,
  });
}

/**
 * 映像ストリームと（任意の）音声ストリーム群を1つのMediaStreamに合成する。
 * MediaRecorderは複数トラックを含む単一のMediaStreamを渡すことで
 * 映像・音声を同時に録画できる。
 */
export function combineStreams(video: MediaStream, audioStreams: MediaStream[]): MediaStream {
  const combined = new MediaStream();
  video.getVideoTracks().forEach((track) => combined.addTrack(track));
  audioStreams.forEach((stream) => {
    stream.getAudioTracks().forEach((track) => combined.addTrack(track));
  });
  return combined;
}

/** ストリーム内のすべてのトラックを停止する（メモリリーク防止） */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
