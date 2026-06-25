import { useRecorderStore } from '../../store/recorderStore';

/** メイン画面右側に表示する音声設定パネル */
export function AudioPanel() {
  const audio = useRecorderStore((s) => s.audio);
  const setAudioSettings = useRecorderStore((s) => s.setAudioSettings);
  const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);

  const systemAudioSupported = platformCapabilities?.systemAudioLoopbackSupported ?? true;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-200">音声設定</h3>

      <ToggleRow
        label="マイク録音"
        checked={audio.microphoneEnabled}
        onChange={(checked) => setAudioSettings({ microphoneEnabled: checked })}
      />

      <ToggleRow
        label="システム音声録音"
        checked={audio.systemAudioEnabled}
        onChange={(checked) => setAudioSettings({ systemAudioEnabled: checked })}
        disabled={!systemAudioSupported}
      />
      {!systemAudioSupported && (
        <p className="text-xs leading-relaxed text-gray-500">
          このOSではシステム音声の録音に対応していません（macOSの場合はmacOS
          13(Ventura)以降が必要です。追加アプリのインストールは不要です）。
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
