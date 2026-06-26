import { useRecorderStore } from '../../store/recorderStore';
import { useTranslation } from '../../i18n';

/** Formats a byte count into a human-readable unit (MB/GB) */
function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return '-';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** Formats milliseconds as mm:ss */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Maps our SupportedLanguage to a BCP 47 locale tag for Date#toLocaleString */
function toLocaleTag(language: 'en' | 'ja'): string {
  return language === 'ja' ? 'ja-JP' : 'en-US';
}

interface HistoryPanelProps {
  onClose: () => void;
}

/** Shows the list of previously saved recordings in a modal */
export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const { t, language } = useTranslation();
  const history = useRecorderStore((s) => s.history);
  const setHistory = useRecorderStore((s) => s.setHistory);

  const handleOpenLocation = (filePath: string) => {
    void window.electronAPI.openFileLocation(filePath);
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteRecordingHistoryItem(id);
    setHistory(history.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[80vh] w-[560px] flex-col rounded-lg bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{t('history.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400">{t('history.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md bg-gray-800 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-200">{item.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString(toLocaleTag(language))} •{' '}
                    {formatDuration(item.durationMs)} • {formatFileSize(item.fileSizeBytes)} •{' '}
                    {item.format.toUpperCase()}
                  </p>
                </div>
                <div className="ml-3 flex gap-2">
                  <button
                    onClick={() => handleOpenLocation(item.filePath)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
                  >
                    {t('history.open')}
                  </button>
                  <button
                    onClick={() => void handleDelete(item.id)}
                    className="rounded bg-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-800"
                  >
                    {t('history.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
