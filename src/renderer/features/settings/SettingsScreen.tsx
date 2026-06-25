import { useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import type {
  OutputFormat,
  RecordingFps,
  ResolutionPreset,
  VideoCodec,
} from '../../../shared/types';

const FPS_OPTIONS: RecordingFps[] = [30, 60];
const RESOLUTION_OPTIONS: { value: ResolutionPreset; label: string }[] = [
  { value: '720p', label: '720p (1280x720)' },
  { value: '1080p', label: '1080p (1920x1080)' },
  { value: '1440p', label: '1440p (2560x1440)' },
  { value: '4k', label: '4K (3840x2160)' },
];
const FORMAT_OPTIONS: { value: OutputFormat; label: string; description: string }[] = [
  { value: 'webm', label: 'WebM', description: '変換不要・即時保存。ファイルサイズは大きめ' },
  { value: 'mp4', label: 'MP4', description: 'FFmpegで変換(時間がかかります)。互換性が高い' },
];
const CODEC_OPTIONS: { value: VideoCodec; label: string; description: string }[] = [
  { value: 'h264', label: 'H.264', description: '互換性重視。再生・編集に広く対応(推奨)' },
  {
    value: 'h265',
    label: 'H.265 (HEVC)',
    description: '高圧縮・高画質。一部の環境で再生非対応な場合あり',
  },
];

interface SettingsScreenProps {
  onClose: () => void;
}

/** 録画品質・保存先を設定するモーダル画面 */
export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const settings = useRecorderStore((s) => s.settings);
  const setQualitySettings = useRecorderStore((s) => s.setQualitySettings);
  const setSaveSettings = useRecorderStore((s) => s.setSaveSettings);
  const [fileName, setFileName] = useState(settings.save.fileNameTemplate);

  const handleSelectFolder = async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled && result.folderPath) {
      setSaveSettings({ outputDirectory: result.folderPath });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[85vh] w-[480px] overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* 保存先 */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">保存先フォルダ</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings.save.outputDirectory}
                placeholder="未設定"
                className="flex-1 rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
              />
              <button
                onClick={() => void handleSelectFolder()}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
              >
                選択
              </button>
            </div>
          </section>

          {/* ファイル名 */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">ファイル名</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                setSaveSettings({ fileNameTemplate: e.target.value });
              }}
              className="w-full rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
            />
          </section>

          {/* 保存形式 */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">保存形式</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSaveSettings({ format: opt.value })}
                  className={`flex-1 rounded px-3 py-2 text-left text-sm transition ${
                    settings.save.format === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="block font-semibold">{opt.label}</span>
                  <span className="block text-xs opacity-80">{opt.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* コーデック(MP4選択時のみ表示) */}
          {settings.save.format === 'mp4' && (
            <section>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                映像コーデック (MP4)
              </label>
              <div className="flex gap-2">
                {CODEC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSaveSettings({ videoCodec: opt.value })}
                    className={`flex-1 rounded px-3 py-2 text-left text-sm transition ${
                      settings.save.videoCodec === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-xs opacity-80">{opt.description}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                迷ったらH.264を選んでください。H.265はファイルサイズを抑えたい場合におすすめです。
              </p>
            </section>
          )}

          {/* FPS */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">FPS</label>
            <div className="flex gap-2">
              {FPS_OPTIONS.map((fps) => (
                <button
                  key={fps}
                  onClick={() => setQualitySettings({ fps })}
                  className={`rounded px-3 py-1.5 text-sm ${
                    settings.quality.fps === fps
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {fps} fps
                </button>
              ))}
            </div>
          </section>

          {/* 解像度 */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">解像度</label>
            <select
              value={settings.quality.resolution}
              onChange={(e) =>
                setQualitySettings({ resolution: e.target.value as ResolutionPreset })
              }
              className="w-full rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
            >
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </section>

          {/* ビットレート */}
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              ビットレート: {(settings.quality.bitrate / 1_000_000).toFixed(1)} Mbps
            </label>
            <input
              type="range"
              min={2_000_000}
              max={50_000_000}
              step={500_000}
              value={settings.quality.bitrate}
              onChange={(e) => setQualitySettings({ bitrate: Number(e.target.value) })}
              className="w-full"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
