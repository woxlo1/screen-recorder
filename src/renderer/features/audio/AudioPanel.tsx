import { useRecorderStore } from '../../store/recorderStore';
import { useTranslation } from '../../i18n';

/** Audio settings panel shown on the right side of the main screen */
export function AudioPanel() {
  const { t } = useTranslation();
  const audio = useRecorderStore((s) => s.audio);
  const setAudioSettings = useRecorderStore((s) => s.setAudioSettings);
  const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);

  const systemAudioSupported = platformCapabilities?.systemAudioLoopbackSupported ?? true;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-200">{t('audioPanel.title')}</h3>

      <ToggleRow
        label={t('audioPanel.microphone')}
        checked={audio.microphoneEnabled}
        onChange={(checked) => setAudioSettings({ microphoneEnabled: checked })}
      />

      <ToggleRow
        label={t('audioPanel.systemAudio')}
        checked={audio.systemAudioEnabled}
        onChange={(checked) => setAudioSettings({ systemAudioEnabled: checked })}
        disabled={!systemAudioSupported}
      />
      {!systemAudioSupported && (
        <p className="text-xs leading-relaxed text-gray-500">
          {t('audioPanel.systemAudioUnsupportedNote')}
        </p>
      )}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <label
      className={`flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <span className="text-sm text-gray-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-blue-500"
      />
    </label>
  );
}
