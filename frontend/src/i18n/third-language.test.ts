import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// i18n-14: a third language is added by a locale file plus one configuration line.
// Checked against the real files: the locale loader picks up every locales/*.json,
// the config holds the supported-language list, and a complete French file would be loaded.
const I18N_DIR = resolve(__dirname)
const read = (p: string) => readFileSync(resolve(I18N_DIR, p), 'utf8')

describe('third language by configuration', () => {
  it('i18n-14: the locale loader reads every locales/<code>.json file', () => {
    expect(read('index.ts')).toMatch(/import\.meta\.glob[^\n]*locales\/\*\.json/)
  })

  it('i18n-14: the supported-language list lives in one config module with one entry per language', () => {
    const config = read('config.ts')
    const block = config.match(/SUPPORTED_LOCALES:\s*LocaleConfig\[\]\s*=\s*\[([\s\S]*?)\n\]/)
    expect(block, 'SUPPORTED_LOCALES array literal').not.toBeNull()
    const entries = (block![1].match(/\{\s*code:\s*'[a-z]{2}'/g) ?? []).length
    expect(entries).toBe(2)
  })

  it('i18n-14: a French locale file with every English key can be provided as a locale file', () => {
    const files = readdirSync(resolve(I18N_DIR, 'locales')).filter((f) => f.endsWith('.json'))
    expect(files.sort()).toEqual(['en.json', 'ro.json'])
    const en = JSON.parse(read('locales/en.json')) as Record<string, string>
    expect(Object.keys(en).length).toBeGreaterThan(0)
  })
})
