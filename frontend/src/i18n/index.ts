import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, LANGUAGES } from './languages'

export const LANGUAGE_STORAGE_KEY = 'pinpad-language'
const SUPPORTED = LANGUAGES.map((l) => l.code)

/** Returns the supported language code for a BCP 47 tag ("ro-RO" -> "ro"), or undefined. */
function match(tag: string | undefined | null): string | undefined {
  if (!tag) return undefined
  const base = tag.toLowerCase().split('-')[0]
  return SUPPORTED.includes(base) ? base : undefined
}

/**
 * Initial language: the saved choice, else the first supported browser language,
 * else the default (English).
 */
export function detectLanguage(): string {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    // storage unavailable (private mode, etc.) — fall through to the browser language
  }
  const fromSaved = match(saved)
  if (fromSaved) return fromSaved

  const browser = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const tag of browser) {
    const m = match(tag)
    if (m) return m
  }
  return DEFAULT_LANGUAGE
}

export function saveLanguage(code: string) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch {
    // ignore: the choice then lasts for this page session only
  }
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(LANGUAGES.map((l) => [l.code, { translation: l.resources }])),
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes output
  returnNull: false,
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

/** Switches the UI language and remembers the explicit choice for later visits. */
export function setLanguage(code: string) {
  saveLanguage(code)
  return i18n.changeLanguage(code)
}

export default i18n
