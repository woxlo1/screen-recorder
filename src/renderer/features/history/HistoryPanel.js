import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRecorderStore } from '../../store/recorderStore';
/** バイト数を読みやすい単位(MB/GB)に整形する */
function formatFileSize(bytes) {
    if (bytes === undefined)
        return '-';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024)
        return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
}
/** ミリ秒を mm:ss 形式にフォーマットする */
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}
/** 過去に保存した録画ファイルの一覧をモーダルで表示する */
export function HistoryPanel({ onClose }) {
    const history = useRecorderStore((s) => s.history);
    const setHistory = useRecorderStore((s) => s.setHistory);
    const handleOpenLocation = (filePath) => {
        void window.electronAPI.openFileLocation(filePath);
    };
    const handleDelete = async (id) => {
        await window.electronAPI.deleteRecordingHistoryItem(id);
        setHistory(history.filter((item) => item.id !== id));
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60", children: _jsxs("div", { className: "flex max-h-[80vh] w-[560px] flex-col rounded-lg bg-gray-900 p-6 shadow-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold text-white", children: "\u9332\u753B\u5C65\u6B74" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: "\u2715" })] }), history.length === 0 ? (_jsx("p", { className: "text-sm text-gray-400", children: "\u307E\u3060\u9332\u753B\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093\u3002" })) : (_jsx("div", { className: "flex flex-col gap-2 overflow-y-auto", children: history.map((item) => (_jsxs("div", { className: "flex items-center justify-between rounded-md bg-gray-800 px-3 py-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm text-gray-200", children: item.fileName }), _jsxs("p", { className: "text-xs text-gray-500", children: [new Date(item.createdAt).toLocaleString('ja-JP'), " \u30FB", ' ', formatDuration(item.durationMs), " \u30FB ", formatFileSize(item.fileSizeBytes), " \u30FB", ' ', item.format.toUpperCase()] })] }), _jsxs("div", { className: "ml-3 flex gap-2", children: [_jsx("button", { onClick: () => handleOpenLocation(item.filePath), className: "rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600", children: "\u958B\u304F" }), _jsx("button", { onClick: () => void handleDelete(item.id), className: "rounded bg-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-800", children: "\u524A\u9664" })] })] }, item.id))) }))] }) }));
}
