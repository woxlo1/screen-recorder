import { useState } from 'react';
import { PreviewPanel } from './features/recorder/PreviewPanel';
import { SourceSelector } from './features/recorder/SourceSelector';
import { ControlsBar } from './features/recorder/ControlsBar';
import { ConversionProgressBar } from './features/recorder/ConversionProgressBar';
import { AudioPanel } from './features/audio/AudioPanel';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { HistoryPanel } from './features/history/HistoryPanel';
import { useRecorderStore } from './store/recorderStore';
import {
  useAppBootstrap,
  useSettingsAutoSave,
  useConversionProgress,
} from './hooks/useAppBootstrap';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const settings = useRecorderStore((s) => s.settings);
  const settingsLoaded = useRecorderStore((s) => s.settingsLoaded);
  const history = useRecorderStore((s) => s.history);
  const setHistory = useRecorderStore((s) => s.setHistory);
  const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);

  // 起動時に設定/履歴/プラットフォーム情報を読み込み、以後の設定変更を自動保存する
  useAppBootstrap();
  useSettingsAutoSave();
  // MP4変換(FFmpeg)の進捗イベントを購読する(Phase3)
  useConversionProgress();

  /** 録画停止後、一時WebMファイルを最終的な保存先に保存する(設定がmp4ならFFmpeg変換も行う) */
  const handleRecordingStopped = async (tempFilePath: string, durationMs: number) => {
    if (!settings.save.outputDirectory) {
      setSavingMessage('保存先が未設定です。設定画面から保存先を選択してください。');
      return;
    }

    const isMp4 = settings.save.format === 'mp4';
    setSavingMessage(isMp4 ? 'MP4へ変換しています…' : '保存しています…');

    const result = await window.electronAPI.saveVideo({
      sourceFilePath: tempFilePath,
      save: settings.save,
      durationMs,
      requestId: crypto.randomUUID(),
    });

    setSavingMessage(
      result.success
        ? `保存しました: ${result.filePath}`
        : `保存に失敗しました: ${result.errorMessage}`,
    );

    if (result.success) {
      // 履歴一覧を最新化(保存成功時のみmain側に追記されているため再取得する)
      const latestHistory = await window.electronAPI.getRecordingHistory();
      setHistory(latestHistory);
    }
  };

  const macScreenPermissionDenied =
    platformCapabilities?.platform === 'darwin' &&
    platformCapabilities.screenCapturePermission === 'denied';

  if (!settingsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      {/* 上部: アプリタイトル */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <h1 className="text-lg font-bold tracking-wide">Screen Recorder</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
          >
            🕘 履歴 ({history.length})
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
          >
            ⚙ 設定
          </button>
        </div>
      </header>

      {macScreenPermissionDenied && (
        <div className="border-b border-yellow-900 bg-yellow-950/50 px-6 py-2 text-sm text-yellow-200">
          画面録画の権限が許可されていません。「システム設定 ＞ プライバシーとセキュリティ ＞
          画面録画」でこのアプリを許可してから再起動してください。
        </div>
      )}

      {/* 中央: プレビュー + 右側: 音声設定 */}
      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        <section className="flex flex-1 flex-col gap-3">
          <PreviewPanel />
        </section>

        <aside className="flex w-72 flex-col gap-6 overflow-y-auto rounded-lg bg-gray-900 p-4">
          <SourceSelector />
          <AudioPanel />
        </aside>
      </main>

      {savingMessage && (
        <div className="px-6 py-2 text-center text-sm text-gray-300">{savingMessage}</div>
      )}

      <ConversionProgressBar />

      {/* 下部: 録画コントロール */}
      <ControlsBar
        onRecordingStopped={(path, durationMs) => void handleRecordingStopped(path, durationMs)}
      />

      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
