import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRecorderStore } from '../../store/recorderStore';
/** メイン画面右側に表示する音声設定パネル */
export function AudioPanel() {
    const audio = useRecorderStore((s) => s.audio);
    const setAudioSettings = useRecorderStore((s) => s.setAudioSettings);
    const platformCapabilities = useRecorderStore((s) => s.platformCapabilities);
    const systemAudioSupported = platformCapabilities?.systemAudioLoopbackSupported ?? true;
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "\u97F3\u58F0\u8A2D\u5B9A" }), _jsx(ToggleRow, { label: "\u30DE\u30A4\u30AF\u9332\u97F3", checked: audio.microphoneEnabled, onChange: (checked) => setAudioSettings({ microphoneEnabled: checked }) }), _jsx(ToggleRow, { label: "\u30B7\u30B9\u30C6\u30E0\u97F3\u58F0\u9332\u97F3", checked: audio.systemAudioEnabled, onChange: (checked) => setAudioSettings({ systemAudioEnabled: checked }), disabled: !systemAudioSupported }), !systemAudioSupported && (_jsx("p", { className: "text-xs leading-relaxed text-gray-500", children: "\u3053\u306EOS\u3067\u306F\u30B7\u30B9\u30C6\u30E0\u97F3\u58F0\u306E\u9332\u97F3\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\uFF08macOS\u306E\u5834\u5408\u306FmacOS 13(Ventura)\u4EE5\u964D\u304C\u5FC5\u8981\u3067\u3059\u3002\u8FFD\u52A0\u30A2\u30D7\u30EA\u306E\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u306F\u4E0D\u8981\u3067\u3059\uFF09\u3002" }))] }));
}
function ToggleRow({ label, checked, onChange, disabled }) {
    return (_jsxs("label", { className: `flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`, children: [_jsx("span", { className: "text-sm text-gray-300", children: label }), _jsx("input", { type: "checkbox", checked: checked, disabled: disabled, onChange: (e) => onChange(e.target.checked), className: "h-4 w-4 accent-blue-500" })] }));
}
