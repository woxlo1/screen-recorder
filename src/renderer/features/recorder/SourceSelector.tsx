import { useEffect, useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';

/**
 * desktopCapturerから取得したソース一覧をサムネイル付きで表示し、
 * ユーザーが録画対象（デスクトップ全体 or 特定ウィンドウ）を選べるようにする。
 */
export function SourceSelector() {
  const availableSources = useRecorderStore((s) => s.availableSources);
  const selectedSource = useRecorderStore((s) => s.selectedSource);
  const setAvailableSources = useRecorderStore((s) => s.setAvailableSources);
  const setSelectedSource = useRecorderStore((s) => s.setSelectedSource);
  const [loading, setLoading] = useState(false);

  const refreshSources = async () => {
    setLoading(true);
    try {
      const sources = await window.electronAPI.getSources();
      setAvailableSources(sources);
      // 初回ロード時、まだ何も選択されていなければ最初の画面を自動選択
      if (!selectedSource && sources.length > 0) {
        setSelectedSource(sources[0] ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSources();
    // マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screens = availableSources.filter((s) => s.type === 'screen');
  const windows = availableSources.filter((s) => s.type === 'window');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">録画対象</h3>
        <button
          type="button"
          onClick={() => void refreshSources()}
          className="text-xs text-blue-400 hover:text-blue-300"
          disabled={loading}
        >
          {loading ? '更新中…' : '再読み込み'}
        </button>
      </div>

      <SourceGroup
        title="デスクトップ"
        sources={screens}
        selectedId={selectedSource?.id}
        onSelect={setSelectedSource}
      />
      <SourceGroup
        title="ウィンドウ"
        sources={windows}
        selectedId={selectedSource?.id}
        onSelect={setSelectedSource}
      />
    </div>
  );
}

interface SourceGroupProps {
  title: string;
  sources: ReturnType<typeof useRecorderStore.getState>['availableSources'];
  selectedId: string | undefined;
  onSelect: (source: SourceGroupProps['sources'][number]) => void;
}

function SourceGroup({ title, sources, selectedId, onSelect }: SourceGroupProps) {
  if (sources.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-xs text-gray-400">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            onClick={() => onSelect(source)}
            className={`rounded-md border p-1 text-left transition ${
              selectedId === source.id
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <img
              src={source.thumbnailDataUrl}
              alt={source.name}
              className="h-16 w-full rounded object-cover"
            />
            <p className="mt-1 truncate text-xs text-gray-300">{source.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
