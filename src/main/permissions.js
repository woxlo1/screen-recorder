import { systemPreferences } from 'electron';
import os from 'node:os';
/**
 * macOSの systemPreferences.getMediaAccessStatus() の戻り値を
 * 共有の MediaPermissionStatus 型に正規化する。
 */
function normalizeStatus(status) {
    switch (status) {
        case 'granted':
            return 'granted';
        case 'denied':
            return 'denied';
        case 'restricted':
            return 'restricted';
        case 'not-determined':
            return 'not-determined';
        default:
            return 'not-determined';
    }
}
/**
 * macOSのDarwinカーネルバージョンから、ScreenCaptureKitベースの
 * システム音声ループバック(Electron `audio: 'loopback'`)が利用可能な
 * macOS 13(Ventura)以降かどうかを判定する。
 * macOS 13 = Darwin 22。 (例: macOS 14 Sonoma = Darwin 23)
 */
function isSystemAudioLoopbackCapableMac() {
    const darwinMajorVersion = Number.parseInt(os.release().split('.')[0] ?? '0', 10);
    return darwinMajorVersion >= 22;
}
/**
 * 現在のOSと権限状態をまとめて取得する。
 * Windowsには「画面録画の事前許可」という概念が無いため常に granted を返し、
 * システム音声ループバックも常にサポート対象として扱う。
 *
 * macOSでは:
 *  - 画面録画・マイクともにユーザーが手動で許可する必要がある
 *  - システム音声ループバック録音は、ElectronのネイティブAPI
 *    (`setDisplayMediaRequestHandler` の `audio: 'loopback'`)が
 *    macOS 13(Ventura)以降のScreenCaptureKitを利用して対応している。
 *    そのためBlackHole等の仮想オーディオデバイスは不要。
 *    macOS 12以前ではこのAPIが利用できないため非対応として扱う。
 */
export function getPlatformCapabilities() {
    if (process.platform === 'darwin') {
        return {
            platform: 'darwin',
            systemAudioLoopbackSupported: isSystemAudioLoopbackCapableMac(),
            screenCapturePermission: normalizeStatus(systemPreferences.getMediaAccessStatus('screen')),
            microphonePermission: normalizeStatus(systemPreferences.getMediaAccessStatus('microphone')),
        };
    }
    if (process.platform === 'win32') {
        return {
            platform: 'win32',
            systemAudioLoopbackSupported: true,
            screenCapturePermission: 'granted',
            microphonePermission: 'granted',
        };
    }
    // Linux等。基本機能は動作させつつ、システム音声は未保証として扱う。
    return {
        platform: 'linux',
        systemAudioLoopbackSupported: false,
        screenCapturePermission: 'granted',
        microphonePermission: 'granted',
    };
}
/**
 * macOSでマイク権限を明示的にリクエストする。
 * Windows/Linuxではリクエストの概念が無いため即座にtrueを返す。
 */
export async function requestMicrophonePermission() {
    if (process.platform !== 'darwin')
        return true;
    return systemPreferences.askForMediaAccess('microphone');
}
