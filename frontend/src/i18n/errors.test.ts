import { describe, it, expect } from 'vitest'

// i18n-11, i18n-12, i18n-13, i18n-15
// Helper contract: src/i18n/errors.ts exports translateApiError(err, t).
describe('API error translation', () => {
  it('i18n-11: known code "conflict" maps to the Romanian conflict text, not the API message', async () => {
    const { translateApiError } = await import('@/i18n/errors')
    const ro = (await import('@/i18n/locales/ro.json')).default
    const err = Object.assign(new Error('Person code already exists'), { code: 'conflict' })
    const msg = translateApiError(err, (k: string) => (ro as Record<string, unknown>)[k] as string)
    expect(msg).toBe(ro['errors.conflict'])
    expect(msg).not.toContain('already exists')
  })

  it('i18n-12: unknown code falls back to the generic translated message', async () => {
    const { translateApiError } = await import('@/i18n/errors')
    const ro = (await import('@/i18n/locales/ro.json')).default
    const err = Object.assign(new Error('Something odd in English'), { code: 'zzz_unknown' })
    const msg = translateApiError(err, (k: string) => (ro as Record<string, unknown>)[k] as string)
    expect(msg).toBe(ro['errors.unknown'])
    expect(msg).not.toContain('English')
  })

  it('i18n-13: DENIED reason INVALID_CODE_FORMAT maps to a Romanian reason label', async () => {
    const { translateApiError } = await import('@/i18n/errors')
    const ro = (await import('@/i18n/locales/ro.json')).default
    const err = Object.assign(new Error('x'), { reason: 'INVALID_CODE_FORMAT' })
    const msg = translateApiError(err, (k: string) => (ro as Record<string, unknown>)[k] as string)
    expect(msg).toBe(ro['reason.INVALID_CODE_FORMAT'])
    expect(msg).not.toBe('INVALID_CODE_FORMAT')
  })

  it('i18n-15: a key missing from ro.json falls back to the English text, not the raw key', async () => {
    const en = (await import('@/i18n/locales/en.json')).default
    const ro = (await import('@/i18n/locales/ro.json')).default
    const { translateWithFallback } = await import('@/i18n/fallback')
    const partial = { ...ro } as Record<string, string>
    delete partial['nav.dashboard']
    expect(translateWithFallback('nav.dashboard', partial, en as Record<string, string>)).toBe(en['nav.dashboard'])
  })
})
