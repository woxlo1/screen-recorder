import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS } from '../../shared/types';
export const useRecorderStore = create((set) => ({
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
    setAvailableSources: (sources) => set({ availableSources: sources }),
    setSelectedSource: (source) => set({ selectedSource: source }),
    setStatus: (status) => set({ status }),
    setElapsedMs: (ms) => set({ elapsedMs: ms }),
    setAudioSettings: (audio) => set((state) => ({ audio: { ...state.audio, ...audio } })),
    setQualitySettings: (quality) => set((state) => ({
        settings: { ...state.settings, quality: { ...state.settings.quality, ...quality } },
    })),
    setSaveSettings: (save) => set((state) => ({
        settings: { ...state.settings, save: { ...state.settings.save, ...save } },
    })),
    setPreviewStream: (stream) => set({ previewStream: stream }),
    setSettings: (settings) => set({ settings }),
    setSettingsLoaded: (loaded) => set({ settingsLoaded: loaded }),
    setPlatformCapabilities: (info) => set((state) => ({
        platformCapabilities: info,
        // macOS等でシステム音声がサポート外の場合、ONになっていたら強制的にOFFにする
        audio: info.systemAudioLoopbackSupported
            ? state.audio
            : { ...state.audio, systemAudioEnabled: false },
    })),
    setHistory: (history) => set({ history }),
    setConversionProgress: (progress) => set({ conversionProgress: progress }),
    setRecordingError: (message) => set({ recordingError: message }),
    reset: () => set({
        status: 'idle',
        elapsedMs: 0,
        previewStream: null,
    }),
}));
