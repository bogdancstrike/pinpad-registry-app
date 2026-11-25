// Registry of supported UI languages.
//
// To add a language:
//   1. Create src/i18n/locales/<code>.json (copy en.json and translate every key).
//   2. Add one entry to LANGUAGES below.
// Nothing else needs to change.

import type { Locale as AntLocale } from 'antd/es/locale'
import enUS from 'antd/locale/en_US'
import roRO from 'antd/locale/ro_RO'
import en from './locales/en.json'
import ro from './locales/ro.json'

export interface LanguageConfig {
  code: string          // BCP 47 tag, also used for Intl formatting
  label: string         // native name shown in the switcher
  resources: Record<string, unknown>
  antd: AntLocale       // Ant Design component locale
}

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES: LanguageConfig[] = [
  { code: 'en', label: 'English', resources: en, antd: enUS },
  { code: 'ro', label: 'Română', resources: ro, antd: roRO },
]
