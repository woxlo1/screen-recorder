import { useRecorderStore } from '../store/recorderStore';
import { dictionaries } from './translations';
import type { TranslationKey } from './useTranslation';

/**
 * Translation helper for plain TypeScript modules (controllers, media helpers)
 * that are not React components and therefore cannot call `useTranslation()`.
 *
 * It reads the current language directly from the Zustand store outside of
 * React's render cycle, which Zustand supports via `getState()`. This keeps
 * a single source of truth for the language (the store) without requiring
 * these modules to be refactored into hooks.
 */
export function translate(key: TranslationKey, params?: Record<string, string | number>): string {
  const language = useRecorderStore.getState().settings.language;
  const dict = dictionaries[language];
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = dict;
  for (const part of parts) {
    current = current?.[part];
  }
  const template = typeof current === 'string' ? current : key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    return value !== undefined ? String(value) : match;
  });
}
