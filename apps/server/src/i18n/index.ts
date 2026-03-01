import i18next, { type TFunction, type i18n as I18nInstance } from 'i18next';
import enEmails from './locales/en/emails.json' with { type: 'json' };
import trEmails from './locales/tr/emails.json' with { type: 'json' };
import enNotifications from './locales/en/notifications.json' with { type: 'json' };
import trNotifications from './locales/tr/notifications.json' with { type: 'json' };

const i18n: I18nInstance = i18next.createInstance();

i18n.init({
  resources: {
    en: {
      emails: enEmails,
      notifications: enNotifications,
    },
    tr: {
      emails: trEmails,
      notifications: trNotifications,
    },
  },
  fallbackLng: 'en',
  defaultNS: 'notifications',
  interpolation: {
    escapeValue: false,
  },
});

export function getT(locale: string): TFunction {
  return i18n.getFixedT(locale);
}

export { i18n };
