import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import ro from './locales/ro.json'
import { translateWithFallback } from './fallback'

// Every locale file must define every key English defines (no silent gaps).
describe('locale files', () => {
  it('ro.json has exactly the same keys as en.json', () => {
    const enKeys = Object.keys(en).sort()
    const roKeys = Object.keys(ro).sort()
    expect(roKeys.filter((k) => !enKeys.includes(k))).toEqual([])
    expect(enKeys.filter((k) => !roKeys.includes(k))).toEqual([])
  })

  it('no translation value is empty', () => {
    for (const [k, v] of Object.entries({ ...en, ...ro })) {
      expect(String(v).trim(), k).not.toBe('')
    }
  })

  it('fallback returns the English text for a key missing in the active locale', () => {
    const partial = { ...ro } as Record<string, string>
    delete partial['nav.dashboard']
    expect(translateWithFallback('nav.dashboard', partial, en as Record<string, string>)).toBe('Dashboard')
  })

  it('fallback returns the raw key only when English lacks it too', () => {
    expect(translateWithFallback('no.such.key', {}, {})).toBe('no.such.key')
  })
})
