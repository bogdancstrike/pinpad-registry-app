import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveInitialLocale, saveLocale } from './config'

// Every locales/<code>.json is loaded; the config list decides which are offered.
const localeFiles = import.meta.glob<{ default: Record<string, string> }>('./locales/*.json', { eager: true })
const resources = Object.fromEntries(
  Object.entries(localeFiles).map(([path, mod]) => {
    const code = path.replace('./locales/', '').replace('.json', '')
    return [code, { translation: mod.default }]
  }),
)

export { SUPPORTED_LOCALES, findLocale, resolveInitialLocale, DEFAULT_LOCALE } from './config'
export type { LocaleConfig } from './config'

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
  // Keys are flat dotted strings such as "nav.dashboard"; do not split on dots.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
})

// Keep <html lang> in sync with the active language.
document.documentElement.lang = i18n.language
i18n.on('languageChanged', (code: string) => { document.documentElement.lang = code })

// Applies the resolved locale (saved choice, browser language, English).
// Called on app mount, so the choice is read when the app starts.
export function applyInitialLocale(): void {
  const code = resolveInitialLocale()
  if (i18n.language !== code) void i18n.changeLanguage(code)
}

// Explicit user choice: switch without reload and remember it.
export function setLocale(code: string) {
  saveLocale(code)
  return i18n.changeLanguage(code)
}

export { i18n }
export default i18n
