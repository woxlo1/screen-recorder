import { useState } from 'react';
import { PreviewPanel } from './features/recorder/PreviewPanel';
import { SourceSelector } from './features/recorder/SourceSelector';
import { ControlsBar } from './features/recorder/ControlsBar';
import { ConversionProgressBar } from './features/recorder/ConversionProgressBar';
import { AudioPanel } from './features/audio/AudioPanel';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { HistoryPanel } from './features/history/HistoryPanel';
import { LanguageSwitcher } from './features/settings/LanguageSwitcher';
import { useRecorderStore } from './store/recorderStore';
import { useTranslation } from './i18n';
import {
  useAppBootstrap,
  useSettingsAutoSave,
  useConversionProgress,
} from './hooks/useAppBootstrap';

export function App() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const settings = useRecorderStore((s) => s.settings);
  const settingsLoaded = useRecorderStore((s) => s.settingsLoaded);
  const history = useRecorderStore((s) => s.history);
  const setHistory = useRecorderStore((s) => s.setHistory);
  const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);
  const recordingError = useRecorderStore((s) => s.recordingError);
  const setRecordingError = useRecorderStore((s) => s.setRecordingError);

  // On startup, load settings/history/platform info and auto-save settings changes afterwards
  useAppBootstrap();
  useSettingsAutoSave();
  // Subscribe to MP4 conversion (FFmpeg) progress events (Phase 3)
  useConversionProgress();

  /** After recording stops, saves the temporary WebM file to its final destination (also runs FFmpeg conversion if the format is mp4) */
  const handleRecordingStopped = async (tempFilePath: string, durationMs: number) => {
    if (!settings.save.outputDirectory) {
      setSavingMessage(t('saving.noOutputDirectory'));
      return;
    }

    const isMp4 = settings.save.format === 'mp4';
    setSavingMessage(isMp4 ? t('saving.converting') : t('saving.saving'));

    const result = await window.electronAPI.saveVideo({
      sourceFilePath: tempFilePath,
      save: settings.save,
      durationMs,
      requestId: crypto.randomUUID(),
    });

    setSavingMessage(
      result.success
        ? t('saving.success', { path: result.filePath ?? '' })
        : t('saving.failure', { message: result.errorMessage ?? '' }),
    );

    if (result.success) {
      // Refresh the history list (only main appends on successful save, so re-fetch it)
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
        {t('app.loading')}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      {/* Top: app title */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <h1 className="text-lg font-bold tracking-wide">{t('app.title')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setHistoryOpen(true)}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
          >
            {t('header.history', { count: history.length })}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
          >
            {t('header.settings')}
          </button>
        </div>
      </header>

      {macScreenPermissionDenied && (
        <div className="border-b border-yellow-900 bg-yellow-950/50 px-6 py-2 text-sm text-yellow-200">
          {t('permissions.macScreenDenied')}
        </div>
      )}

      {recordingError && (
        <div className="flex items-center justify-between border-b border-red-900 bg-red-950/50 px-6 py-2 text-sm text-red-200">
          <span>
            {t('recordingError.interrupted', { message: recordingError })}
            {t('recordingError.windowsHint')}
          </span>
          <button
            onClick={() => setRecordingError(null)}
            className="ml-4 shrink-0 text-red-300 hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Center: preview + right side: audio settings */}
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

      {/* Bottom: recording controls */}
      <ControlsBar
        onRecordingStopped={(path, durationMs) => void handleRecordingStopped(path, durationMs)}
      />

      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
