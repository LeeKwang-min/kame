import { ko, Locale } from './locales/ko';
import { en } from './locales/en';

export type LocaleKey = 'ko' | 'en';

export const locales: Record<LocaleKey, Locale> = {
  ko,
  en,
};

export const defaultLocale: LocaleKey = 'ko';

export const localeNames: Record<LocaleKey, string> = {
  ko: '한국어',
  en: 'English',
};

export function getLocale(locale: LocaleKey): Locale {
  return locales[locale] || locales[defaultLocale];
}

export type { Locale };
