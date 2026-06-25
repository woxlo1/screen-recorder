import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
const FPS_OPTIONS = [30, 60];
const RESOLUTION_OPTIONS = [
    { value: '720p', label: '720p (1280x720)' },
    { value: '1080p', label: '1080p (1920x1080)' },
    { value: '1440p', label: '1440p (2560x1440)' },
    { value: '4k', label: '4K (3840x2160)' },
];
const FORMAT_OPTIONS = [
    { value: 'webm', label: 'WebM', description: '変換不要・即時保存。ファイルサイズは大きめ' },
    { value: 'mp4', label: 'MP4', description: 'FFmpegで変換(時間がかかります)。互換性が高い' },
];
const CODEC_OPTIONS = [
    { value: 'h264', label: 'H.264', description: '互換性重視。再生・編集に広く対応(推奨)' },
    {
        value: 'h265',
        label: 'H.265 (HEVC)',
        description: '高圧縮・高画質。一部の環境で再生非対応な場合あり',
    },
];
/** 録画品質・保存先を設定するモーダル画面 */
export function SettingsScreen({ onClose }) {
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
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60", children: _jsxs("div", { className: "max-h-[85vh] w-[480px] overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold text-white", children: "\u8A2D\u5B9A" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: "\u2715" })] }), _jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", readOnly: true, value: settings.save.outputDirectory, placeholder: "\u672A\u8A2D\u5B9A", className: "flex-1 rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200" }), _jsx("button", { onClick: () => void handleSelectFolder(), className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500", children: "\u9078\u629E" })] })] }), _jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "\u30D5\u30A1\u30A4\u30EB\u540D" }), _jsx("input", { type: "text", value: fileName, onChange: (e) => {
                                        setFileName(e.target.value);
                                        setSaveSettings({ fileNameTemplate: e.target.value });
                                    }, className: "w-full rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200" })] }), _jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "\u4FDD\u5B58\u5F62\u5F0F" }), _jsx("div", { className: "flex gap-2", children: FORMAT_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => setSaveSettings({ format: opt.value }), className: `flex-1 rounded px-3 py-2 text-left text-sm transition ${settings.save.format === opt.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`, children: [_jsx("span", { className: "block font-semibold", children: opt.label }), _jsx("span", { className: "block text-xs opacity-80", children: opt.description })] }, opt.value))) })] }), settings.save.format === 'mp4' && (_jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "\u6620\u50CF\u30B3\u30FC\u30C7\u30C3\u30AF (MP4)" }), _jsx("div", { className: "flex gap-2", children: CODEC_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => setSaveSettings({ videoCodec: opt.value }), className: `flex-1 rounded px-3 py-2 text-left text-sm transition ${settings.save.videoCodec === opt.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`, children: [_jsx("span", { className: "block font-semibold", children: opt.label }), _jsx("span", { className: "block text-xs opacity-80", children: opt.description })] }, opt.value))) }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "\u8FF7\u3063\u305F\u3089H.264\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002H.265\u306F\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\u3092\u6291\u3048\u305F\u3044\u5834\u5408\u306B\u304A\u3059\u3059\u3081\u3067\u3059\u3002" })] })), _jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "FPS" }), _jsx("div", { className: "flex gap-2", children: FPS_OPTIONS.map((fps) => (_jsxs("button", { onClick: () => setQualitySettings({ fps }), className: `rounded px-3 py-1.5 text-sm ${settings.quality.fps === fps
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`, children: [fps, " fps"] }, fps))) })] }), _jsxs("section", { children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: "\u89E3\u50CF\u5EA6" }), _jsx("select", { value: settings.quality.resolution, onChange: (e) => setQualitySettings({ resolution: e.target.value }), className: "w-full rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200", children: RESOLUTION_OPTIONS.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs("section", { children: [_jsxs("label", { className: "mb-1 block text-sm font-medium text-gray-300", children: ["\u30D3\u30C3\u30C8\u30EC\u30FC\u30C8: ", (settings.quality.bitrate / 1_000_000).toFixed(1), " Mbps"] }), _jsx("input", { type: "range", min: 2_000_000, max: 50_000_000, step: 500_000, value: settings.quality.bitrate, onChange: (e) => setQualitySettings({ bitrate: Number(e.target.value) }), className: "w-full" })] })] })] }) }));
}
