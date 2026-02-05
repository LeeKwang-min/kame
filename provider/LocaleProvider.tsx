'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  LocaleKey,
  Locale,
  defaultLocale,
  getLocale,
  localeNames,
} from '@/lib/i18n';

interface LocaleContextType {
  locale: LocaleKey;
  t: Locale;
  setLocale: (locale: LocaleKey) => void;
  localeNames: Record<LocaleKey, string>;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const LOCALE_STORAGE_KEY = 'kame-locale';

interface IProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: IProps) {
  const [locale, setLocaleState] = useState<LocaleKey>(defaultLocale);
  const [t, setT] = useState<Locale>(getLocale(defaultLocale));

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleKey | null;
    if (stored && (stored === 'ko' || stored === 'en')) {
      setLocaleState(stored);
      setT(getLocale(stored));
    }
  }, []);

  const setLocale = useCallback((newLocale: LocaleKey) => {
    setLocaleState(newLocale);
    setT(getLocale(newLocale));
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale, localeNames }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
