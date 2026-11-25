import dayjs from 'dayjs'
import i18n from './index'
import { findLocale, DEFAULT_LOCALE } from './config'

// Active language code (falls back to English if unset).
function activeCode(): string {
  return i18n.language || DEFAULT_LOCALE
}

// Date-time in the active language's explicit pattern (e.g. ro: 04.03.2025 09:05:07).
export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const cfg = findLocale(activeCode()) ?? findLocale(DEFAULT_LOCALE)!
  return dayjs(value).format(cfg.dateTimeFormat)
}

// Number in the active language's grouping convention (ro: 1.234).
export function formatNumber(value: number | string): string {
  if (typeof value === 'string') return value
  const cfg = findLocale(activeCode()) ?? findLocale(DEFAULT_LOCALE)!
  return new Intl.NumberFormat(cfg.numberLocale).format(value)
}
