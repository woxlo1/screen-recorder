import { useEffect } from 'react';
import { useRecorderStore } from '../store/recorderStore';

/**
 * Runs once on app startup, applying the settings/history/OS platform info
 * persisted on the main process side into the renderer store.
 */
export function useAppBootstrap(): void {
  const setSettings = useRecorderStore((s) => s.setSettings);
  const setSettingsLoaded = useRecorderStore((s) => s.setSettingsLoaded);
  const setHistory = useRecorderStore((s) => s.setHistory);
  const setPlatformCapabilities = useRecorderStore((s) => s.setPlatformCapabilities);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [settings, history, platformCapabilities] = await Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getRecordingHistory(),
        window.electronAPI.getPlatformCapabilities(),
      ]);

      if (cancelled) return;

      setSettings(settings);
      setHistory(history);
      setPlatformCapabilities(platformCapabilities);
      setSettingsLoaded(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Hook that automatically persists settings to the persistent store whenever
 * they change.
 * Only saves changes that happen after settingsLoaded becomes true, to avoid
 * unintentionally overwriting the persisted data right after the initial load.
 */
export function useSettingsAutoSave(): void {
  const settings = useRecorderStore((s) => s.settings);
  const settingsLoaded = useRecorderStore((s) => s.settingsLoaded);

  useEffect(() => {
    if (!settingsLoaded) return;
    void window.electronAPI.saveSettings(settings);
  }, [settings, settingsLoaded]);
}

/**
 * Hook that reflects MP4 conversion (FFmpeg) progress events sent from the main
 * process into the store (Phase 3).
 * Should be subscribed exactly once for the whole app, so it's called from the
 * top level of App.tsx.
 */
export function useConversionProgress(): void {
  const setConversionProgress = useRecorderStore((s) => s.setConversionProgress);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onConversionProgress((progress) => {
      setConversionProgress(progress);
      // After completion/failure, keep it visible briefly before clearing (so the user can see the result)
      if (progress.phase === 'completed' || progress.phase === 'failed') {
        setTimeout(() => {
          setConversionProgress(null);
        }, 1500);
      }
    });
    return unsubscribe;
    // Subscribe/unsubscribe only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
