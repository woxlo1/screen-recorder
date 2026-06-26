import { useEffect, useRef } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { useTranslation } from '../../i18n';

/**
 * Preview area that shows the current capture content (or the in-progress recording).
 * Shows an "unselected" placeholder when previewStream is null.
 */
export function PreviewPanel() {
  const { t } = useTranslation();
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
              ? t('previewPanel.sourceSelected', { name: selectedSource.name })
              : t('previewPanel.noSourceSelected')}
          </p>
          <p className="mt-1 text-sm">{t('previewPanel.startHint')}</p>
        </div>
      )}
    </div>
  );
}
