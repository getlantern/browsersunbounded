import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resources from './translations.json';

// don't want to use this?
// have a look at the Quick start guide
// for passing in lng and translations on init

const ACCEPTED_LOCALES = [
	'en',
	'en-US', // browser default
	'ar',
	'zh', // zh chinese fallback
	'zh-Hans', // default zh
	'zh-Hant-TW',
	'ru',
	'fa',
	'es-419'
];

const detectorOptions = {
	// order and from where user language should be detected
	order: ['htmlTag', 'navigator', 'localStorage'],

	// keys or params to lookup language from
	lookupLocalStorage: 'locale',
	lookupSessionStorage: 'i18nextLng',

	// optional htmlTag with lang attribute, the default is:
	// htmlTag: document.documentElement,

	// optional conversion function used to modify the detected language code
	// convertDetectedLanguage: 'Iso15897',
	// convertDetectedLanguage: (lng) => lng.replace('-', '_')
};

i18n
	// load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
	// learn more: https://github.com/i18next/i18next-http-backend
	// want your translations to be loaded from a professional CDN? => https://github.com/locize/react-tutorial#step-2---use-the-locize-cdn
	// .use(Backend)
	// detect user language
	// learn more: https://github.com/i18next/i18next-browser-languageDetector
	.use(LanguageDetector)
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		supportedLngs: ACCEPTED_LOCALES,
		detection: detectorOptions,
		resources,
		fallbackLng: 'en',
		debug: true,

		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		}
	});


export default i18n;