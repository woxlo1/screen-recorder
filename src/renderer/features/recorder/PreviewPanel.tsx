import { useEffect, useRef } from 'react';
import { useRecorderStore } from '../../store/recorderStore';

/**
 * 現在のキャプチャ内容（または録画中の映像）を表示するプレビュー領域。
 * previewStreamがnullの場合は「未選択」のプレースホルダーを表示する。
 */
export function PreviewPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStream = useRecorderStore((s) => s.previewStream);
  const selectedSource = useRecorderStore((s) => s.selectedSource);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-black/80">
      {previewStream ? (
        <video ref={videoRef} autoPlay muted className="h-full w-full rounded-lg object-contain" />
      ) : (
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">
            {selectedSource
              ? `${selectedSource.name} を選択中`
              : 'キャプチャソースを選択してください'}
          </p>
          <p className="mt-1 text-sm">録画を開始するとここにプレビューが表示されます</p>
        </div>
      )}
    </div>
  );
}
