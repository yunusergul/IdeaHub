import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enIdeas from './locales/en/ideas.json';
import enKanban from './locales/en/kanban.json';
import enSettings from './locales/en/settings.json';
import enSurveys from './locales/en/surveys.json';
import enErrors from './locales/en/errors.json';

// TR
import trCommon from './locales/tr/common.json';
import trAuth from './locales/tr/auth.json';
import trDashboard from './locales/tr/dashboard.json';
import trIdeas from './locales/tr/ideas.json';
import trKanban from './locales/tr/kanban.json';
import trSettings from './locales/tr/settings.json';
import trSurveys from './locales/tr/surveys.json';
import trErrors from './locales/tr/errors.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        ideas: enIdeas,
        kanban: enKanban,
        settings: enSettings,
        surveys: enSurveys,
        errors: enErrors,
      },
      tr: {
        common: trCommon,
        auth: trAuth,
        dashboard: trDashboard,
        ideas: trIdeas,
        kanban: trKanban,
        settings: trSettings,
        surveys: trSurveys,
        errors: trErrors,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ideahub-locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
