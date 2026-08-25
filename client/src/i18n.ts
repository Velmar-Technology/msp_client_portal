import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from "@/locales/en_US.json";
import esDO from "@/locales/es_DO.json";
import { APP_METADATA } from "@/config/metadata";
import { getAuthItem } from "@/lib/authStorage";

export type SupportedLanguage = 'en_US' | 'es_DO';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en_US', 'es_DO'];

/**
 * Normalizes any language tag or code into a supported application language key ('en_US' | 'es_DO').
 */
export const normalizeLanguage = (lang?: string | null): SupportedLanguage => {
  if (!lang) return 'en_US';
  const clean = lang.trim().toLowerCase().replace('-', '_');
  if (clean.startsWith('es')) {
    return 'es_DO';
  }
  if (clean.startsWith('en')) {
    return 'en_US';
  }
  return 'en_US';
};

/**
 * Detects the user's preferred language from the browser's navigator settings.
 */
export const detectBrowserLanguage = (): SupportedLanguage | null => {
  if (typeof navigator === 'undefined') return null;

  const languages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  for (const raw of languages) {
    if (!raw) continue;
    const lower = raw.trim().toLowerCase();
    if (lower.startsWith('es')) {
      return 'es_DO';
    }
    if (lower.startsWith('en')) {
      return 'en_US';
    }
  }

  return null;
};

/**
 * Resolves the initial language with strict precedence:
 * 1. Logged-in user preference (from cached auth user profile)
 * 2. Explicit manual user selection (from localStorage 'language')
 * 3. Browser language detection (from navigator.languages / navigator.language)
 * 4. Default application fallback ('en_US')
 */
export const getInitialLanguage = (): SupportedLanguage => {
  // 1. Authenticated user preference
  const cachedUser = getAuthItem('user');
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      if (parsed.language) {
        return normalizeLanguage(parsed.language);
      }
    } catch {
      // Ignored
    }
  }

  // 2. Explicit manual user selection from localStorage
  try {
    const manualLang = localStorage.getItem('language');
    if (manualLang) {
      return normalizeLanguage(manualLang);
    }
  } catch {
    // Ignored in restricted environments
  }

  // 3. Automatic browser language detection
  const browserLang = detectBrowserLanguage();
  if (browserLang) {
    return browserLang;
  }

  // 4. Default fallback
  return 'en_US';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en_US: {
        translation: enUS,
      },
      es_DO: {
        translation: esDO,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en_US',
    interpolation: {
      escapeValue: false, // React already handles escaping
      defaultVariables: APP_METADATA,
    },
  });

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('language', normalizeLanguage(lng));
  } catch {
    // Ignored
  }
});

export default i18n;
