import { useRecorderStore } from '../../store/recorderStore';

/**
 * Small toggle button in the header that switches the UI language between
 * Japanese and English. The chosen language is stored in settings.language,
 * which is persisted via the same save/load flow as the rest of the app's
 * settings (see useSettingsAutoSave in hooks/useAppBootstrap.ts).
 */
export function LanguageSwitcher() {
  const language = useRecorderStore((s) => s.settings.language);
  const setLanguage = useRecorderStore((s) => s.setLanguage);

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
      className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
      title={language === 'ja' ? 'Switch to English' : '日本語に切り替え'}
    >
      {language === 'ja' ? 'EN' : '日本語'}
    </button>
  );
}
