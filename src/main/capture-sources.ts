import { desktopCapturer } from 'electron';
import type { CaptureSource } from '../shared/types';

/**
 * デスクトップ全体 / 個別ウィンドウのキャプチャ可能ソース一覧を取得する。
 * 複数モニターの場合、screenタイプのソースがモニターごとに複数返ってくる
 * （desktopCapturerの仕様）。
 */
export async function listCaptureSources(): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: false,
  });

  return sources.map((source) => {
    const isScreen = source.id.startsWith('screen:');
    // screen:<displayId>:<index> 形式からdisplayIdを抜き出す
    const displayId = isScreen ? source.id.split(':')[1] : undefined;

    return {
      id: source.id,
      name: source.name || (isScreen ? 'ディスプレイ' : 'ウィンドウ'),
      type: isScreen ? 'screen' : 'window',
      thumbnailDataUrl: source.thumbnail.toDataURL(),
      // exactOptionalPropertyTypes対応: displayIdが無い場合はプロパティ自体を省略する
      ...(displayId !== undefined ? { displayId } : {}),
    };
  });
}
