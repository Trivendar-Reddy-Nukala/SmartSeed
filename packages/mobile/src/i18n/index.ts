import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en.json';
import hi from './hi.json';
import te from './te.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
};

/**
 * Detect the device locale and map it to a supported language code.
 * Falls back to 'en' if the device locale is not supported.
 */
function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const languageCode = locales[0].languageCode ?? 'en';
      if (languageCode in resources) {
        return languageCode;
      }
    }
  } catch {
    // Silently fall back to English
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
