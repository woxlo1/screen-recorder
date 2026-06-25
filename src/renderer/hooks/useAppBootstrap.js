import { useEffect } from 'react';
import { useRecorderStore } from '../store/recorderStore';
/**
 * アプリ起動時に一度だけ実行され、main プロセス側に保存されている
 * 設定・履歴・OSのプラットフォーム情報をrendererのstoreへ反映する。
 */
export function useAppBootstrap() {
    const setSettings = useRecorderStore((s) => s.setSettings);
    const setSettingsLoaded = useRecorderStore((s) => s.setSettingsLoaded);
    const setHistory = useRecorderStore((s) => s.setHistory);
    const setPlatformCapabilities = useRecorderStore((s) => s.setPlatformCapabilities);
    useEffect(() => {
        let cancelled = false;
        async function bootstrap() {
            const [settings, history, platformCapabilities] = await Promise.all([
                window.electronAPI.loadSettings(),
                window.electronAPI.getRecordingHistory(),
                window.electronAPI.getPlatformCapabilities(),
            ]);
            if (cancelled)
                return;
            setSettings(settings);
            setHistory(history);
            setPlatformCapabilities(platformCapabilities);
            setSettingsLoaded(true);
        }
        void bootstrap();
        return () => {
            cancelled = true;
        };
        // マウント時のみ実行
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
/**
 * 設定が変更された際、永続化ストアに自動保存するフック。
 * settingsLoaded が true になった後の変更のみを保存対象にすることで、
 * 初期ロード直後に意図せず上書き保存してしまうのを防ぐ。
 */
export function useSettingsAutoSave() {
    const settings = useRecorderStore((s) => s.settings);
    const settingsLoaded = useRecorderStore((s) => s.settingsLoaded);
    useEffect(() => {
        if (!settingsLoaded)
            return;
        void window.electronAPI.saveSettings(settings);
    }, [settings, settingsLoaded]);
}
/**
 * mainプロセスから送られるMP4変換(FFmpeg)の進捗イベントをstoreに反映するフック(Phase3)。
 * アプリ全体で一度だけ購読すればよいため、App.tsxのトップレベルで呼び出す想定。
 */
export function useConversionProgress() {
    const setConversionProgress = useRecorderStore((s) => s.setConversionProgress);
    useEffect(() => {
        const unsubscribe = window.electronAPI.onConversionProgress((progress) => {
            setConversionProgress(progress);
            // 完了・失敗したら少し見せてからクリアする(ユーザーが結果を確認できるように)
            if (progress.phase === 'completed' || progress.phase === 'failed') {
                setTimeout(() => {
                    setConversionProgress(null);
                }, 1500);
            }
        });
        return unsubscribe;
        // マウント時のみ購読/解除
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
