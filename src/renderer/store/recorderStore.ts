import { create } from 'zustand';
import type {
  AppSettings,
  AudioSettings,
  CaptureSource,
  ConversionProgress,
  PlatformCapabilities,
  RecordingHistoryItem,
  RecordingStatus,
} from '../../shared/types';
import { DEFAULT_APP_SETTINGS } from '../../shared/types';

interface RecorderState {
  /** 録画の進行状態 */
  status: RecordingStatus;
  /** 選択中のキャプチャソース */
  selectedSource: CaptureSource | null;
  /** 取得済みのキャプチャソース一覧 */
  availableSources: CaptureSource[];
  /** 録画経過時間(ミリ秒)。プレビューのタイマー表示に利用 */
  elapsedMs: number;
  /** 音声設定 */
  audio: AudioSettings;
  /** アプリ設定（品質・保存先） */
  settings: AppSettings;
  /** 設定の読み込みが完了したか(永続化データのロード待ち) */
  settingsLoaded: boolean;
  /** プレビュー用のMediaStream（recorder featureがセットする） */
  previewStream: MediaStream | null;
  /** OS判定・権限・機能制約の情報(macOSのシステム音声制約などに使う) */
  platformCapabilities: PlatformCapabilities | null;
  /** 録画履歴 */
  history: RecordingHistoryItem[];
  /** MP4変換(FFmpeg)の進捗。変換中でない場合はnull */
  conversionProgress: ConversionProgress | null;

  // --- actions ---
  setAvailableSources: (sources: CaptureSource[]) => void;
  setSelectedSource: (source: CaptureSource | null) => void;
  setStatus: (status: RecordingStatus) => void;
  setElapsedMs: (ms: number) => void;
  setAudioSettings: (audio: Partial<AudioSettings>) => void;
  setQualitySettings: (quality: Partial<AppSettings['quality']>) => void;
  setSaveSettings: (save: Partial<AppSettings['save']>) => void;
  setPreviewStream: (stream: MediaStream | null) => void;
  setSettings: (settings: AppSettings) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  setPlatformCapabilities: (info: PlatformCapabilities) => void;
  setHistory: (history: RecordingHistoryItem[]) => void;
  setConversionProgress: (progress: ConversionProgress | null) => void;
  reset: () => void;
}

export const useRecorderStore = create<RecorderState>((set) => ({
  status: 'idle',
  selectedSource: null,
  availableSources: [],
  elapsedMs: 0,
  audio: {
    microphoneEnabled: false,
    systemAudioEnabled: false,
  },
  settings: DEFAULT_APP_SETTINGS,
  settingsLoaded: false,
  previewStream: null,
  platformCapabilities: null,
  history: [],
  conversionProgress: null,

  setAvailableSources: (sources) => set({ availableSources: sources }),

  setSelectedSource: (source) => set({ selectedSource: source }),

  setStatus: (status) => set({ status }),

  setElapsedMs: (ms) => set({ elapsedMs: ms }),

  setAudioSettings: (audio) => set((state) => ({ audio: { ...state.audio, ...audio } })),

  setQualitySettings: (quality) =>
    set((state) => ({
      settings: { ...state.settings, quality: { ...state.settings.quality, ...quality } },
    })),

  setSaveSettings: (save) =>
    set((state) => ({
      settings: { ...state.settings, save: { ...state.settings.save, ...save } },
    })),

  setPreviewStream: (stream) => set({ previewStream: stream }),

  setSettings: (settings) => set({ settings }),

  setSettingsLoaded: (loaded) => set({ settingsLoaded: loaded }),

  setPlatformCapabilities: (info) =>
    set((state) => ({
      platformCapabilities: info,
      // macOS等でシステム音声がサポート外の場合、ONになっていたら強制的にOFFにする
      audio: info.systemAudioLoopbackSupported
        ? state.audio
        : { ...state.audio, systemAudioEnabled: false },
    })),

  setHistory: (history) => set({ history }),

  setConversionProgress: (progress) => set({ conversionProgress: progress }),

  reset: () =>
    set({
      status: 'idle',
      elapsedMs: 0,
      previewStream: null,
    }),
}));
