import { describe, it, expect, beforeEach } from 'vitest'
import i18n from './index'
import { formatDateTime, formatNumber } from './format'

describe('formatters', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('i18n-09: Romanian date-time uses dd.MM.yyyy HH:mm:ss', async () => {
    await i18n.changeLanguage('ro')
    expect(formatDateTime('2025-03-04T09:05:07')).toBe('04.03.2025 09:05:07')
  })

  it('English date-time keeps the ISO-like pattern', async () => {
    await i18n.changeLanguage('en')
    expect(formatDateTime('2025-03-04T09:05:07')).toBe('2025-03-04 09:05:07')
  })

  it('i18n-10: Romanian numbers use a dot as thousands separator', async () => {
    await i18n.changeLanguage('ro')
    expect(formatNumber(1234)).toBe('1.234')
  })

  it('empty date shows a dash', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})
