import { desktopCapturer } from 'electron';
import type { CaptureSource } from '../shared/types';
import { persistentStore } from './persistent-store';
import { mt } from './messages';

/**
 * Gets the list of capturable sources: the entire desktop and/or individual windows.
 * With multiple monitors, desktopCapturer returns one "screen"-type source per monitor
 * (this is how desktopCapturer's API behaves).
 */
export async function listCaptureSources(): Promise<CaptureSource[]> {
  const language = persistentStore.getSettings().language;
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: false,
  });

  return sources.map((source) => {
    const isScreen = source.id.startsWith('screen:');
    // Extract displayId from the "screen:<displayId>:<index>" format
    const displayId = isScreen ? source.id.split(':')[1] : undefined;

    return {
      id: source.id,
      name:
        source.name ||
        (isScreen ? mt(language, 'fallbackDisplayName') : mt(language, 'fallbackWindowName')),
      type: isScreen ? 'screen' : 'window',
      thumbnailDataUrl: source.thumbnail.toDataURL(),
      // exactOptionalPropertyTypes: omit the property entirely if displayId is missing
      ...(displayId !== undefined ? { displayId } : {}),
    };
  });
}
