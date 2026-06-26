import { useRecorderStore } from '../../store/recorderStore';
import { useTranslation } from '../../i18n';

/**
 * Overlay bar showing MP4 conversion (FFmpeg) progress (Phase 3).
 * Renders nothing while conversionProgress is null.
 */
export function ConversionProgressBar() {
  const { t } = useTranslation();
  const progress = useRecorderStore((s) => s.conversionProgress);

  if (!progress) return null;

  const isFailed = progress.phase === 'failed';
  const isCompleted = progress.phase === 'completed';
  const percent = progress.percent ?? (progress.phase === 'starting' ? 0 : undefined);

  const label = (() => {
    if (isFailed) return t('conversion.failed');
    if (isCompleted) return t('conversion.completed');
    if (progress.phase === 'starting') return t('conversion.preparing');
    return percent !== undefined
      ? t('conversion.inProgress', { percent: Math.round(percent) })
      : t('conversion.inProgressUnknown');
  })();

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-6">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className={isFailed ? 'text-red-400' : 'text-gray-200'}>{label}</span>
          {percent !== undefined && !isFailed && (
            <span className="text-gray-400">{Math.round(percent)}%</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{
              width: `${percent ?? (isFailed ? 100 : 0)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
