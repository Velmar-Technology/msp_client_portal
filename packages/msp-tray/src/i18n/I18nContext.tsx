import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SupportedLocale, TranslationDictionary } from './types';
import { en_US } from './locales/en_US';
import { es_DO } from './locales/es_DO';

const STORAGE_KEY = 'msp_tray_locale';

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  en_US,
  es_DO,
};

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  toggleLocale: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveInitialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en_US' || saved === 'es_DO') {
      return saved;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('es')) {
        return 'es_DO';
      }
    }
  } catch {
    // Ignore navigator errors
  }

  return 'en_US';
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale, onLocaleChange }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale || resolveInitialLocale);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Ignore storage write errors
    }
    if (onLocaleChange) {
      onLocaleChange(newLocale);
    }
  }, [onLocaleChange]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en_US' ? 'es_DO' : 'en_US');
  }, [locale, setLocale]);

  // Notify listener on initial mount
  useEffect(() => {
    if (onLocaleChange) {
      onLocaleChange(locale);
    }
  }, [locale, onLocaleChange]);

  const dictionary = useMemo(() => dictionaries[locale] || en_US, [locale]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      
      // Resolve against current locale dictionary
      let current: any = dictionaries[locale];
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      // Fallback to English dictionary if key missing in current locale
      if (typeof current !== 'string') {
        let fallback: any = en_US;
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = typeof fallback === 'string' ? fallback : path;
      }

      // Variable interpolation: replaces {varName} with params[varName]
      if (params && typeof current === 'string') {
        let result = current;
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replaceAll(`{${pKey}}`, String(pVal));
        }
        return result;
      }

      return typeof current === 'string' ? current : path;
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dictionary,
    }),
    [locale, setLocale, toggleLocale, t, dictionary]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
