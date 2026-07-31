import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from "@/locales/en_US.json";
import esDO from "@/locales/es_DO.json";
import { APP_METADATA } from "@/config/metadata";
import { getAuthItem } from "@/lib/authStorage";

// Retrieve initial language setting from cached user preference or browser setting
const getInitialLanguage = (): string => {
  const cachedUser = getAuthItem('user');
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      if (parsed.language) {
        return parsed.language;
      }
    } catch {
      // Ignored
    }
  }
  return localStorage.getItem('language') || 'en_US';
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
  localStorage.setItem('language', lng);
});

export default i18n;
