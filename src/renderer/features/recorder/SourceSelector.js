import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
/**
 * desktopCapturerから取得したソース一覧をサムネイル付きで表示し、
 * ユーザーが録画対象（デスクトップ全体 or 特定ウィンドウ）を選べるようにする。
 */
export function SourceSelector() {
    const availableSources = useRecorderStore((s) => s.availableSources);
    const selectedSource = useRecorderStore((s) => s.selectedSource);
    const setAvailableSources = useRecorderStore((s) => s.setAvailableSources);
    const setSelectedSource = useRecorderStore((s) => s.setSelectedSource);
    const [loading, setLoading] = useState(false);
    const refreshSources = async () => {
        setLoading(true);
        try {
            const sources = await window.electronAPI.getSources();
            setAvailableSources(sources);
            // 初回ロード時、まだ何も選択されていなければ最初の画面を自動選択
            if (!selectedSource && sources.length > 0) {
                setSelectedSource(sources[0] ?? null);
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void refreshSources();
        // マウント時のみ実行
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const screens = availableSources.filter((s) => s.type === 'screen');
    const windows = availableSources.filter((s) => s.type === 'window');
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "\u9332\u753B\u5BFE\u8C61" }), _jsx("button", { type: "button", onClick: () => void refreshSources(), className: "text-xs text-blue-400 hover:text-blue-300", disabled: loading, children: loading ? '更新中…' : '再読み込み' })] }), _jsx(SourceGroup, { title: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7", sources: screens, selectedId: selectedSource?.id, onSelect: setSelectedSource }), _jsx(SourceGroup, { title: "\u30A6\u30A3\u30F3\u30C9\u30A6", sources: windows, selectedId: selectedSource?.id, onSelect: setSelectedSource })] }));
}
function SourceGroup({ title, sources, selectedId, onSelect }) {
    if (sources.length === 0)
        return null;
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-gray-400", children: title }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: sources.map((source) => (_jsxs("button", { type: "button", onClick: () => onSelect(source), className: `rounded-md border p-1 text-left transition ${selectedId === source.id
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-700 hover:border-gray-500'}`, children: [_jsx("img", { src: source.thumbnailDataUrl, alt: source.name, className: "h-16 w-full rounded object-cover" }), _jsx("p", { className: "mt-1 truncate text-xs text-gray-300", children: source.name })] }, source.id))) })] }));
}
