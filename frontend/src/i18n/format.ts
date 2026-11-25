import i18n from './index'

/** Current UI language, used for Intl formatting. */
const locale = () => i18n.language || 'en'

/** Date and time in the chosen language, e.g. "25 nov. 2025, 14:05:09" (ro) or "Nov 25, 2025, 02:05:09 PM" (en). */
export function fmtDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(locale(), {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(d)
}

/** Integer or decimal number in the chosen language, e.g. "1,234" (en) or "1.234" (ro). */
export function fmtNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value !== 'number') return String(value)
  return new Intl.NumberFormat(locale()).format(value)
}
