import type { CaptureSource, RecordingQualitySettings } from '../../../shared/types';
import { RESOLUTION_MAP } from '../../../shared/types';

/**
 * 画面/ウィンドウの映像ストリームと、必要であればシステム音声(ループバック)を
 * 1回の getDisplayMedia 呼び出しでまとめて取得する。
 *
 * どのソースを録画するか・システム音声を含めるかは、事前に
 * window.electronAPI.startRecording() で main プロセスに伝えてあり、
 * main側の session.setDisplayMediaRequestHandler (src/main/index.ts) が
 * それを見て自動的に応答するため、ここではOSのピッカーは表示されない。
 *
 * 旧実装は映像用と音声用で getUserMedia を2回(chromeMediaSource:'desktop' の
 * mandatory制約)に分けて呼んでおり、これが録画画面が真っ白になる不具合の原因
 * だった。映像+音声を1回のリクエストにまとめることでこの不具合を回避する。
 *
 * 解像度・FPSは「希望値」として渡す。実際のキャプチャ解像度は元のディスプレイ
 * 解像度に依存するため、ここで指定した値が必ず適用される保証はない
 * （ブラウザ/OSの実装依存）。
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
    // includeSystemAudioがfalseの場合、main側のハンドラはaudioトラックを
    // 含めずに応答するため、audio: true を渡してもマイク音声が紛れ込むことはない。
    audio: includeSystemAudio,
  });
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
  video.getAudioTracks().forEach((track) => combined.addTrack(track));
  audioStreams.forEach((stream) => {
    stream.getAudioTracks().forEach((track) => combined.addTrack(track));
  });
  return combined;
}

/** ストリーム内のすべてのトラックを停止する（メモリリーク防止） */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** 型エクスポート用(他モジュールがCaptureSourceを参照する際に再利用しやすくする) */
export type { CaptureSource };
