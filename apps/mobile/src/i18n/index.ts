import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import de from './de.json';

export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
};

function getDeviceLocale(): SupportedLocale {
  const tag = Localization.getLocales()[0]?.languageTag ?? 'en';
  const lang = tag.split('-')[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    lng: getDeviceLocale(),
    fallbackLng: 'en',
    defaultNS: 'translation',
    ns: ['translation'],
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string;
}

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
}

export function currentLocale(): SupportedLocale {
  return (i18n.language ?? 'en') as SupportedLocale;
}
