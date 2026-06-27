import { create } from 'zustand';
import type {
  AppSettings,
  AudioSettings,
  CaptureSource,
  ConversionProgress,
  PlatformCapabilities,
  RecordingHistoryItem,
  RecordingStatus,
  SupportedLanguage,
  UpdateStatusPayload,
} from '../../shared/types';
import { DEFAULT_APP_SETTINGS } from '../../shared/types';

interface RecorderState {
  /** Recording progress state */
  status: RecordingStatus;
  /** Currently selected capture source */
  selectedSource: CaptureSource | null;
  /** List of capture sources that have been fetched */
  availableSources: CaptureSource[];
  /** Elapsed recording time (ms). Used for the preview's timer display */
  elapsedMs: number;
  /** Audio settings */
  audio: AudioSettings;
  /** App settings (quality, output destination, language) */
  settings: AppSettings;
  /** Whether settings have finished loading (waiting on persisted data) */
  settingsLoaded: boolean;
  /** MediaStream used for the preview (set by the recorder feature) */
  previewStream: MediaStream | null;
  /** OS detection / permissions / feature constraints (e.g. used for macOS system audio constraints) */
  platformCapabilities: PlatformCapabilities | null;
  /** Recording history */
  history: RecordingHistoryItem[];
  /** MP4 conversion (FFmpeg) progress. null when no conversion is in progress */
  conversionProgress: ConversionProgress | null;
  /**
   * An error that occurred unexpectedly during recording (e.g. an OS-level capture
   * failure). A separate channel from start/stop throwing on direct operation
   * failure, used to surface async errors that happen mid-recording to the UI.
   * null means there is no error.
   */
  recordingError: string | null;
  /**
   * Latest auto-update status reported by the main process (electron-updater).
   * null until the first status event arrives (i.e. before any update check
   * has run).
   */
  updateStatus: UpdateStatusPayload | null;
  /** Whether the user dismissed the "update downloaded" banner with "Later" (re-shown on next launch, not re-shown again this session) */
  updateBannerDismissed: boolean;

  // --- actions ---
  setAvailableSources: (sources: CaptureSource[]) => void;
  setSelectedSource: (source: CaptureSource | null) => void;
  setStatus: (status: RecordingStatus) => void;
  setElapsedMs: (ms: number) => void;
  setAudioSettings: (audio: Partial<AudioSettings>) => void;
  setQualitySettings: (quality: Partial<AppSettings['quality']>) => void;
  setSaveSettings: (save: Partial<AppSettings['save']>) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setPreviewStream: (stream: MediaStream | null) => void;
  setSettings: (settings: AppSettings) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  setPlatformCapabilities: (info: PlatformCapabilities) => void;
  setHistory: (history: RecordingHistoryItem[]) => void;
  setConversionProgress: (progress: ConversionProgress | null) => void;
  setRecordingError: (message: string | null) => void;
  setUpdateStatus: (status: UpdateStatusPayload) => void;
  dismissUpdateBanner: () => void;
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
  recordingError: null,
  updateStatus: null,
  updateBannerDismissed: false,

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

  setLanguage: (language) =>
    set((state) => ({
      settings: { ...state.settings, language },
    })),

  setPreviewStream: (stream) => set({ previewStream: stream }),

  setSettings: (settings) => set({ settings }),

  setSettingsLoaded: (loaded) => set({ settingsLoaded: loaded }),

  setPlatformCapabilities: (info) =>
    set((state) => ({
      platformCapabilities: info,
      // Force system audio OFF if it was on but this OS doesn't support it
      audio: info.systemAudioLoopbackSupported
        ? state.audio
        : { ...state.audio, systemAudioEnabled: false },
    })),

  setHistory: (history) => set({ history }),

  setConversionProgress: (progress) => set({ conversionProgress: progress }),

  setRecordingError: (message) => set({ recordingError: message }),

  setUpdateStatus: (status) =>
    set((state) => ({
      updateStatus: status,
      // A fresh 'downloading'/'available' cycle should be able to show the
      // banner again even if a previous "downloaded" banner was dismissed.
      updateBannerDismissed: status.status === 'downloaded' ? state.updateBannerDismissed : false,
    })),

  dismissUpdateBanner: () => set({ updateBannerDismissed: true }),

  reset: () =>
    set({
      status: 'idle',
      elapsedMs: 0,
      previewStream: null,
    }),
}));
