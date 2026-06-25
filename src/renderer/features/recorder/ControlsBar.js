import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { useRecorderController } from './useRecorderController';
/** ミリ秒を mm:ss 形式にフォーマットする */
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}
export function ControlsBar({ onRecordingStopped }) {
    const status = useRecorderStore((s) => s.status);
    const selectedSource = useRecorderStore((s) => s.selectedSource);
    const { start, pause, resume, stop } = useRecorderController();
    const [elapsedMs, setElapsedMs] = useState(0);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const baseElapsedRef = useRef(0);
    const segmentStartRef = useRef(0);
    // 録画中のタイマー更新（一時停止中は止まる）
    useEffect(() => {
        if (status === 'recording') {
            segmentStartRef.current = Date.now();
            intervalRef.current = window.setInterval(() => {
                setElapsedMs(baseElapsedRef.current + (Date.now() - segmentStartRef.current));
            }, 250);
        }
        else {
            if (status === 'paused') {
                baseElapsedRef.current += Date.now() - segmentStartRef.current;
            }
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, [status]);
    const handleStart = async () => {
        setError(null);
        try {
            baseElapsedRef.current = 0;
            setElapsedMs(0);
            await start();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '録画を開始できませんでした');
        }
    };
    const handleStop = async () => {
        setError(null);
        try {
            const result = await stop();
            onRecordingStopped(result.tempFilePath, result.durationMs);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '録画を停止できませんでした');
        }
    };
    const handlePauseResume = async () => {
        setError(null);
        try {
            if (status === 'recording') {
                await pause();
            }
            else if (status === 'paused') {
                await resume();
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '操作に失敗しました');
        }
    };
    const isIdle = status === 'idle';
    return (_jsxs("div", { className: "flex flex-col items-center gap-2 border-t border-gray-800 bg-gray-900 px-6 py-4", children: [error && _jsx("p", { className: "text-sm text-red-400", children: error }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "w-16 text-center font-mono text-lg text-gray-200", children: formatDuration(elapsedMs) }), _jsx("button", { type: "button", onClick: () => void handleStart(), disabled: !isIdle || !selectedSource, className: "rounded-full bg-red-600 px-6 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-700", children: "\u25CF \u9332\u753B\u958B\u59CB" }), _jsx("button", { type: "button", onClick: () => void handlePauseResume(), disabled: isIdle, className: "rounded-full bg-gray-700 px-6 py-2 font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500", children: status === 'paused' ? '▶ 再開' : '⏸ 一時停止' }), _jsx("button", { type: "button", onClick: () => void handleStop(), disabled: isIdle, className: "rounded-full bg-gray-700 px-6 py-2 font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500", children: "\u25A0 \u505C\u6B62" })] })] }));
}
