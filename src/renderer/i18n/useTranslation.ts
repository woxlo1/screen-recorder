import { useRecorderStore } from '../store/recorderStore';
import { dictionaries, type Translations } from './translations';

/** Dot-separated leaf keys of `Translations`, e.g. "settings.title" */
type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? DotPath<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationKey = DotPath<Translations>;

function resolveKey(dict: Translations, key: string): string {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = dict;
  for (const part of parts) {
    current = current?.[part];
  }
  return typeof current === 'string' ? current : key;
}

/** Replaces `{placeholder}` tokens in a translated string with values from `params`. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Returns a `t(key, params?)` function bound to the currently selected language,
 * plus the language itself. The language lives in the recorder store's
 * `settings.language` field (so it's persisted alongside the rest of the app's
 * settings via the existing load/save flow); this hook just subscribes to it so
 * components re-render automatically when the language changes.
 */
export function useTranslation() {
  const language = useRecorderStore((s) => s.settings.language);
  const dict = dictionaries[language];

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    return interpolate(resolveKey(dict, key), params);
  }

  return { t, language };
}
