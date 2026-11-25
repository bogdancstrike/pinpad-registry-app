// Single source of truth for the supported UI languages.
// To add a language: add locales/<code>.json with every key from en.json,
// then add one entry to SUPPORTED_LOCALES below.
import type { Locale as AntLocale } from 'antd/es/locale'
import enUS from 'antd/es/locale/en_US'
import roRO from 'antd/es/locale/ro_RO'

export interface LocaleConfig {
  code: string
  label: string
  antd: AntLocale
  // dayjs pattern for date-times (explicit, so no locale comma is added)
  dateTimeFormat: string
  // BCP 47 tag used for Intl number formatting
  numberLocale: string
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', label: 'English', antd: enUS, dateTimeFormat: 'YYYY-MM-DD HH:mm:ss', numberLocale: 'en-US' },
  { code: 'ro', label: 'Română', antd: roRO, dateTimeFormat: 'DD.MM.YYYY HH:mm:ss', numberLocale: 'ro-RO' },
]

export const DEFAULT_LOCALE = 'en'
export const LOCALE_STORAGE_KEY = 'pinpad-locale'

export function findLocale(code: string | null | undefined): LocaleConfig | undefined {
  return SUPPORTED_LOCALES.find((l) => l.code === code)
}

// Resolution order: saved choice, then browser languages (primary subtag), then English.
export function resolveInitialLocale(): string {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (findLocale(saved)) return saved as string
  } catch {
    // storage unavailable (private mode): fall through to browser language
  }
  const browser = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language]
  for (const tag of browser) {
    const primary = (tag || '').split('-')[0].toLowerCase()
    if (findLocale(primary)) return primary
  }
  return DEFAULT_LOCALE
}

export function saveLocale(code: string): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
  } catch {
    // ignore: the choice is then only kept for this page session
  }
}
