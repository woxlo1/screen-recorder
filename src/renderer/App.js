import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PreviewPanel } from './features/recorder/PreviewPanel';
import { SourceSelector } from './features/recorder/SourceSelector';
import { ControlsBar } from './features/recorder/ControlsBar';
import { ConversionProgressBar } from './features/recorder/ConversionProgressBar';
import { AudioPanel } from './features/audio/AudioPanel';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { HistoryPanel } from './features/history/HistoryPanel';
import { useRecorderStore } from './store/recorderStore';
import { useAppBootstrap, useSettingsAutoSave, useConversionProgress, } from './hooks/useAppBootstrap';
export function App() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [savingMessage, setSavingMessage] = useState(null);
    const settings = useRecorderStore((s) => s.settings);
    const settingsLoaded = useRecorderStore((s) => s.settingsLoaded);
    const history = useRecorderStore((s) => s.history);
    const setHistory = useRecorderStore((s) => s.setHistory);
    const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);
    const recordingError = useRecorderStore((s) => s.recordingError);
    const setRecordingError = useRecorderStore((s) => s.setRecordingError);
    // 起動時に設定/履歴/プラットフォーム情報を読み込み、以後の設定変更を自動保存する
    useAppBootstrap();
    useSettingsAutoSave();
    // MP4変換(FFmpeg)の進捗イベントを購読する(Phase3)
    useConversionProgress();
    /** 録画停止後、一時WebMファイルを最終的な保存先に保存する(設定がmp4ならFFmpeg変換も行う) */
    const handleRecordingStopped = async (tempFilePath, durationMs) => {
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
        setSavingMessage(result.success
            ? `保存しました: ${result.filePath}`
            : `保存に失敗しました: ${result.errorMessage}`);
        if (result.success) {
            // 履歴一覧を最新化(保存成功時のみmain側に追記されているため再取得する)
            const latestHistory = await window.electronAPI.getRecordingHistory();
            setHistory(latestHistory);
        }
    };
    const macScreenPermissionDenied = platformCapabilities?.platform === 'darwin' &&
        platformCapabilities.screenCapturePermission === 'denied';
    if (!settingsLoaded) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-gray-950 text-gray-400", children: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" }));
    }
    return (_jsxs("div", { className: "flex h-screen flex-col bg-gray-950 text-gray-100", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-gray-800 px-6 py-3", children: [_jsx("h1", { className: "text-lg font-bold tracking-wide", children: "Screen Recorder" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => setHistoryOpen(true), className: "rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700", children: ["\uD83D\uDD58 \u5C65\u6B74 (", history.length, ")"] }), _jsx("button", { onClick: () => setSettingsOpen(true), className: "rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700", children: "\u2699 \u8A2D\u5B9A" })] })] }), macScreenPermissionDenied && (_jsx("div", { className: "border-b border-yellow-900 bg-yellow-950/50 px-6 py-2 text-sm text-yellow-200", children: "\u753B\u9762\u9332\u753B\u306E\u6A29\u9650\u304C\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u300C\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A \uFF1E \u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u3068\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 \uFF1E \u753B\u9762\u9332\u753B\u300D\u3067\u3053\u306E\u30A2\u30D7\u30EA\u3092\u8A31\u53EF\u3057\u3066\u304B\u3089\u518D\u8D77\u52D5\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })), recordingError && (_jsxs("div", { className: "flex items-center justify-between border-b border-red-900 bg-red-950/50 px-6 py-2 text-sm text-red-200", children: [_jsxs("span", { children: ["\u9332\u753B\u304C\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F: ", recordingError, "\uFF08Windows\u306E\u753B\u9762\u30AD\u30E3\u30D7\u30C1\u30E3\u6A5F\u80FD\u304C\u4E00\u6642\u7684\u306B\u4E0D\u5B89\u5B9A\u306B\u306A\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\uFF09"] }), _jsx("button", { onClick: () => setRecordingError(null), className: "ml-4 shrink-0 text-red-300 hover:text-red-100", children: "\u2715" })] })), _jsxs("main", { className: "flex flex-1 gap-4 overflow-hidden p-4", children: [_jsx("section", { className: "flex flex-1 flex-col gap-3", children: _jsx(PreviewPanel, {}) }), _jsxs("aside", { className: "flex w-72 flex-col gap-6 overflow-y-auto rounded-lg bg-gray-900 p-4", children: [_jsx(SourceSelector, {}), _jsx(AudioPanel, {})] })] }), savingMessage && (_jsx("div", { className: "px-6 py-2 text-center text-sm text-gray-300", children: savingMessage })), _jsx(ConversionProgressBar, {}), _jsx(ControlsBar, { onRecordingStopped: (path, durationMs) => void handleRecordingStopped(path, durationMs) }), settingsOpen && _jsx(SettingsScreen, { onClose: () => setSettingsOpen(false) }), historyOpen && _jsx(HistoryPanel, { onClose: () => setHistoryOpen(false) })] }));
}
