import { systemPreferences } from 'electron';
import os from 'node:os';
import type { MediaPermissionStatus, PlatformCapabilities } from '../shared/types';

/**
 * Normalizes the return value of macOS's systemPreferences.getMediaAccessStatus()
 * into the shared MediaPermissionStatus type.
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
 * Determines, from the macOS Darwin kernel version, whether this is macOS 13
 * (Ventura) or later, where ScreenCaptureKit-based system audio loopback
 * (Electron's `audio: 'loopback'`) is available.
 * macOS 13 = Darwin 22. (e.g. macOS 14 Sonoma = Darwin 23)
 */
function isSystemAudioLoopbackCapableMac(): boolean {
  const darwinMajorVersion = Number.parseInt(os.release().split('.')[0] ?? '0', 10);
  return darwinMajorVersion >= 22;
}

/**
 * Gets the current OS and permission status together.
 * Windows has no concept of "pre-approving screen recording", so it always returns
 * granted, and system audio loopback is also always treated as supported.
 *
 * On macOS:
 *  - Both screen recording and microphone access require the user to grant
 *    permission manually.
 *  - System audio loopback recording is supported via Electron's native API
 *    (`setDisplayMediaRequestHandler`'s `audio: 'loopback'`), which uses
 *    ScreenCaptureKit on macOS 13 (Ventura) and later.
 *    Because of this, a virtual audio device such as BlackHole is not required.
 *    This API is unavailable on macOS 12 and earlier, so those versions are
 *    treated as unsupported.
 */
export function getPlatformCapabilities(): PlatformCapabilities {
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

  // Linux, etc. Core functionality is allowed to run, but system audio is treated as unguaranteed.
  return {
    platform: 'linux',
    systemAudioLoopbackSupported: false,
    screenCapturePermission: 'granted',
    microphonePermission: 'granted',
  };
}

/**
 * Explicitly requests microphone permission on macOS.
 * On Windows/Linux there is no concept of requesting permission, so this
 * immediately returns true.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.askForMediaAccess('microphone');
}
