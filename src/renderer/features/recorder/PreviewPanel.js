import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
/**
 * 現在のキャプチャ内容（または録画中の映像）を表示するプレビュー領域。
 * previewStreamがnullの場合は「未選択」のプレースホルダーを表示する。
 */
export function PreviewPanel() {
    const videoRef = useRef(null);
    const previewStream = useRecorderStore((s) => s.previewStream);
    const selectedSource = useRecorderStore((s) => s.selectedSource);
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = previewStream;
        }
    }, [previewStream]);
    return (_jsx("div", { className: "flex h-full w-full items-center justify-center rounded-lg bg-black/80", children: previewStream ? (_jsx("video", { ref: videoRef, autoPlay: true, muted: true, className: "h-full w-full rounded-lg object-contain" })) : (_jsxs("div", { className: "text-center text-gray-400", children: [_jsx("p", { className: "text-lg font-medium", children: selectedSource
                        ? `${selectedSource.name} を選択中`
                        : 'キャプチャソースを選択してください' }), _jsx("p", { className: "mt-1 text-sm", children: "\u9332\u753B\u3092\u958B\u59CB\u3059\u308B\u3068\u3053\u3053\u306B\u30D7\u30EC\u30D3\u30E5\u30FC\u304C\u8868\u793A\u3055\u308C\u307E\u3059" })] })) }));
}
