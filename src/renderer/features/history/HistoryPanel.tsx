import { useRecorderStore } from '../../store/recorderStore';

/** バイト数を読みやすい単位(MB/GB)に整形する */
function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return '-';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** ミリ秒を mm:ss 形式にフォーマットする */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

interface HistoryPanelProps {
  onClose: () => void;
}

/** 過去に保存した録画ファイルの一覧をモーダルで表示する */
export function HistoryPanel({ onClose }: HistoryPanelProps) {
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
          <h2 className="text-lg font-bold text-white">録画履歴</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400">まだ録画履歴がありません。</p>
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
                    {new Date(item.createdAt).toLocaleString('ja-JP')} ・{' '}
                    {formatDuration(item.durationMs)} ・ {formatFileSize(item.fileSizeBytes)} ・{' '}
                    {item.format.toUpperCase()}
                  </p>
                </div>
                <div className="ml-3 flex gap-2">
                  <button
                    onClick={() => handleOpenLocation(item.filePath)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
                  >
                    開く
                  </button>
                  <button
                    onClick={() => void handleDelete(item.id)}
                    className="rounded bg-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-800"
                  >
                    削除
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
