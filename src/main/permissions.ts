import { systemPreferences } from 'electron';
import type { MediaPermissionStatus, PlatformCapabilities } from '../shared/types';

/**
 * macOSの systemPreferences.getMediaAccessStatus() の戻り値を
 * 共有の MediaPermissionStatus 型に正規化する。
 */
function normalizeStatus(status: string): MediaPermissionStatus {
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
 * 現在のOSと権限状態をまとめて取得する。
 * Windowsには「画面録画の事前許可」という概念が無いため常に granted を返し、
 * システム音声ループバックも常にサポート対象として扱う。
 *
 * macOSでは:
 *  - システム音声ループバック録音はElectron/Chromiumの制約上サポート対象外
 *  - 画面録画・マイクともにユーザーが手動で許可する必要がある
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  if (process.platform === 'darwin') {
    return {
      platform: 'darwin',
      systemAudioLoopbackSupported: false,
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
export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.askForMediaAccess('microphone');
}
