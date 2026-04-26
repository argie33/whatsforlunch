import i18n from 'i18next';
import en from './en.json';

i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  ns: ['translation'],
  resources: {
    en: {
      translation: en,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

export function t(key: string, defaultValue?: string): string {
  return i18n.t(key, defaultValue || key);
}
