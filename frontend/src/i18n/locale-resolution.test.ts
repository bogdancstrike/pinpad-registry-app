import { describe, it, expect, beforeEach } from 'vitest'
import { setBrowserLanguages } from '@/test/renderApp'

// i18n-02, i18n-06, i18n-07, i18n-08
describe('initial locale resolution', () => {
  beforeEach(() => window.localStorage.clear())

  it('i18n-02: defaults to English on first visit for an unsupported browser (fr-FR)', async () => {
    setBrowserLanguages(['fr-FR'])
    const { resolveInitialLocale } = await import('@/i18n/config')
    expect(resolveInitialLocale()).toBe('en')
  })

  it('i18n-06: a saved choice overrides the browser language', async () => {
    window.localStorage.setItem('pinpad-locale', 'en')
    setBrowserLanguages(['ro-RO'])
    const { resolveInitialLocale } = await import('@/i18n/config')
    expect(resolveInitialLocale()).toBe('en')
  })

  it('i18n-07: a Romanian browser opens in Romanian on first visit', async () => {
    setBrowserLanguages(['ro-RO'])
    const { resolveInitialLocale } = await import('@/i18n/config')
    expect(resolveInitialLocale()).toBe('ro')
  })

  it('i18n-08: an unsupported browser language (de-DE) falls back to English', async () => {
    setBrowserLanguages(['de-DE'])
    const { resolveInitialLocale } = await import('@/i18n/config')
    expect(resolveInitialLocale()).toBe('en')
  })
})
