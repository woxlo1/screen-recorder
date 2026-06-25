import { useEffect, useRef, useState } from 'react';
import { useRecorderStore } from '../../store/recorderStore';
import { useRecorderController } from './useRecorderController';

/** ミリ秒を mm:ss 形式にフォーマットする */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

interface ControlsBarProps {
  /** 録画停止後、保存処理を呼び出すための一時ファイルパスと録画時間を親に渡す */
  onRecordingStopped: (tempFilePath: string, durationMs: number) => void;
}

export function ControlsBar({ onRecordingStopped }: ControlsBarProps) {
  const status = useRecorderStore((s) => s.status);
  const selectedSource = useRecorderStore((s) => s.selectedSource);
  const { start, pause, resume, stop } = useRecorderController();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(0);
  const segmentStartRef = useRef(0);

  // 録画中のタイマー更新（一時停止中は止まる）
  useEffect(() => {
    if (status === 'recording') {
      segmentStartRef.current = Date.now();
      intervalRef.current = window.setInterval(() => {
        setElapsedMs(baseElapsedRef.current + (Date.now() - segmentStartRef.current));
      }, 250);
    } else {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '録画を開始できませんでした');
    }
  };

  const handleStop = async () => {
    setError(null);
    try {
      const result = await stop();
      onRecordingStopped(result.tempFilePath, result.durationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '録画を停止できませんでした');
    }
  };

  const handlePauseResume = async () => {
    setError(null);
    try {
      if (status === 'recording') {
        await pause();
      } else if (status === 'paused') {
        await resume();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作に失敗しました');
    }
  };

  const isIdle = status === 'idle';

  return (
    <div className="flex flex-col items-center gap-2 border-t border-gray-800 bg-gray-900 px-6 py-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-4">
        <span className="w-16 text-center font-mono text-lg text-gray-200">
          {formatDuration(elapsedMs)}
        </span>

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={!isIdle || !selectedSource}
          className="rounded-full bg-red-600 px-6 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          ● 録画開始
        </button>

        <button
          type="button"
          onClick={() => void handlePauseResume()}
          disabled={isIdle}
          className="rounded-full bg-gray-700 px-6 py-2 font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
        >
          {status === 'paused' ? '▶ 再開' : '⏸ 一時停止'}
        </button>

        <button
          type="button"
          onClick={() => void handleStop()}
          disabled={isIdle}
          className="rounded-full bg-gray-700 px-6 py-2 font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
        >
          ■ 停止
        </button>
      </div>
    </div>
  );
}
