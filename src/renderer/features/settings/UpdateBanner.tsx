import { useRecorderStore } from '../../store/recorderStore';
import { useTranslation } from '../../i18n';

/**
 * Banner shown at the top of the app reflecting the current auto-update
 * status (electron-updater). Renders nothing while idle/checking/
 * not-available/error, since those states aren't actionable for the user;
 * only 'downloading' and 'downloaded' need to be surfaced.
 */
export function UpdateBanner() {
  const { t } = useTranslation();
  const updateStatus = useRecorderStore((s) => s.updateStatus);
  const updateBannerDismissed = useRecorderStore((s) => s.updateBannerDismissed);
  const dismissUpdateBanner = useRecorderStore((s) => s.dismissUpdateBanner);

  if (!updateStatus || updateBannerDismissed) return null;

  if (updateStatus.status === 'downloading') {
    return (
      <div className="border-b border-blue-900 bg-blue-950/50 px-6 py-2 text-sm text-blue-200">
        {t('update.downloading', {
          version: updateStatus.version ?? '',
          percent: updateStatus.percent ?? 0,
        })}
      </div>
    );
  }

  if (updateStatus.status === 'downloaded') {
    return (
      <div className="flex items-center justify-between border-b border-green-900 bg-green-950/50 px-6 py-2 text-sm text-green-200">
        <span>{t('update.downloaded', { version: updateStatus.version ?? '' })}</span>
        <div className="ml-4 flex shrink-0 gap-2">
          <button
            onClick={dismissUpdateBanner}
            className="rounded px-2 py-1 text-green-300 hover:text-green-100"
          >
            {t('update.later')}
          </button>
          <button
            onClick={() => void window.electronAPI.quitAndInstallUpdate()}
            className="rounded bg-green-700 px-3 py-1 font-medium text-white hover:bg-green-600"
          >
            {t('update.restartNow')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
