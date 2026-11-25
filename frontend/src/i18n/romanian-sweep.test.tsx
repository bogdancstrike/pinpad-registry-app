import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderApp, setBrowserLanguages } from '@/test/renderApp'
import en from './locales/en.json'
import ro from './locales/ro.json'

// i18n-01: after switching to Română, no English UI text is visible on any page.
const SUMMARY = { totalRooms: 3, activePeople: 5, currentlyInside: 1, grantedToday: 1234, deniedToday: 2, doorsOffline: 0 }

vi.mock('@/api', async (orig) => {
  const actual = await orig<typeof import('@/api')>()
  const empty = async () => []
  return {
    ...actual,
    getSummary: async () => SUMMARY,
    listPeople: empty, listRooms: empty, listPermissions: empty, listEvents: empty,
    listDoors: empty, getMonitoringDoors: empty, getOccupancy: empty, getDeniedEvents: empty,
    getPinpadHints: async () => ({}),
  }
})

// English strings that differ from their Romanian translation: none may appear as visible text.
const englishOnly = Object.entries(en as Record<string, string>)
  .filter(([k, v]) => (ro as Record<string, string>)[k] !== v && v.trim().length > 1)
  .map(([, v]) => v.trim())

const NAV_ROUTES = [
  ['Dashboard', 'Panou'],
  ['Pinpad', 'Pinpad'],
  ['People', 'Persoane'],
  ['Rooms', 'Camere'],
  ['Permissions', 'Permisiuni'],
  ['Registry', 'Registru'],
  ['Monitoring', 'Monitorizare'],
  ['Door Simulator', 'Simulator ușă'],
] as const

function visibleTexts(): string[] {
  const out: string[] = []
  document.querySelectorAll('body *').forEach((el) => {
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent?.trim() ?? '').join(' ').trim()
    if (own) out.push(own)
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      const v = el.getAttribute(attr)
      if (v) out.push(v.trim())
    }
  })
  return out
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('full interface in Romanian', () => {
  it('i18n-01: after choosing Română, no English UI text is visible on any page', { timeout: 60000 }, async () => {
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    const switcher = (await screen.findAllByRole('combobox', { name: /language|limba/i }))[0]
    fireEvent.mouseDown(switcher)
    fireEvent.click(await screen.findByText('Română'))
    await screen.findByRole('heading', { name: 'Panou' })

    for (const [englishLabel, romanianLabel] of NAV_ROUTES) {
      const nav = screen.getByRole('navigation')
      const item = Array.from(nav.querySelectorAll('[role="menuitem"]'))
        .find((el) => el.textContent?.trim() === romanianLabel)
        ?? Array.from(nav.querySelectorAll('[role="menuitem"]')).find((el) => el.textContent?.trim() === englishLabel)
      expect(item, `nav item for ${englishLabel}`).toBeTruthy()
      fireEvent.click(item as Element)
      await waitFor(() => expect(visibleTexts().length).toBeGreaterThan(0))
      const texts = visibleTexts()
      const leaked = englishOnly.filter((s) => texts.includes(s))
      expect(leaked, `English text on ${englishLabel} page`).toEqual([])
    }
  })
})
