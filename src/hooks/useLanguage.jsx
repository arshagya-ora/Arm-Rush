import { translations } from '../translations';

// English only: keep the lookup stable without locale detection or network calls.
const t = key => translations.en[key] || key;

export default function useLanguage() {
  return { lang: 'en', t };
}
