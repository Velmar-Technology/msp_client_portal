import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from "@/locales/en_US.json";
import esDO from "@/locales/es_DO.json";
import { APP_METADATA } from "@/config/metadata";
import { getAuthItem } from "@/lib/authStorage";

export type SupportedLanguage = 'en_US' | 'es_DO';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en_US', 'es_DO'];

type TranslationDict = Record<string, unknown>;

const featureLocaleModules = import.meta.glob<TranslationDict>(
  '@/features/**/locales/*.json',
  { eager: true, import: 'default' }
);

/**
 * Recursively merges source translation keys into target dictionary without mutating inputs.
 *
 * @param target - Base translation dictionary
 * @param source - Feature-scoped translation dictionary to merge
 * @returns Deep-merged translation dictionary
 */
function deepMergeTranslations(target: TranslationDict, source: TranslationDict): TranslationDict {
  const output: TranslationDict = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = output[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      output[key] = deepMergeTranslations(
        existing as TranslationDict,
        value as TranslationDict
      );
    } else {
      output[key] = value;
    }
  }
  return output;
}

/**
 * Builds the complete translation dictionary for a locale by merging base `src/locales/<lang>.json`
 * with all colocated `src/features/<domain>/locales/<lang>.json` files.
 *
 * @param lang - Target supported language code
 * @param baseDict - Root locale JSON object
 * @returns Merged translation dictionary
 */
function buildLocaleResources(lang: SupportedLanguage, baseDict: TranslationDict): TranslationDict {
  let merged: TranslationDict = { ...baseDict };
  const suffix = `/locales/${lang}.json`;

  for (const [filePath, mod] of Object.entries(featureLocaleModules)) {
    if (filePath.endsWith(suffix) && mod && typeof mod === 'object') {
      merged = deepMergeTranslations(merged, mod);
    }
  }

  return merged;
}

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
        translation: buildLocaleResources('en_US', enUS as TranslationDict),
      },
      es_DO: {
        translation: buildLocaleResources('es_DO', esDO as TranslationDict),
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
