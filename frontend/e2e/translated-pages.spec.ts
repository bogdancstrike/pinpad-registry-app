import { test, expect, type Page, type Route } from '@playwright/test'

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const EVENT_AT_1403 = {
  id: 'e1',
  createdAt: '2025-11-25T14:03:00',
  eventType: 'ENTER',
  decision: 'GRANTED',
  reason: null,
  rawCodeMasked: '****0023',
  personCode: '0023',
  personName: 'Ana Pop',
  roomCode: 'LAB',
  roomName: 'Lab',
}

async function mockApi(page: Page, overrides: Record<string, (r: Route) => unknown> = {}) {
  await page.route('**/pinpad/api/**', (route) => {
    const url = route.request().url()
    for (const key of Object.keys(overrides)) {
      if (url.includes(key)) return overrides[key](route)
    }
    if (url.includes('/summary')) {
      return json(route, { totalRooms: 2, activePeople: 3, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 })
    }
    if (url.includes('/registry/events')) return json(route, { items: [EVENT_AT_1403], total: 1, page: 1, size: 25 })
    if (url.includes('/monitoring/summary')) return json(route, { totalRooms: 0, activePeople: 0, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 })
    return json(route, { items: [], total: 0, page: 1, size: 25 })
  })
}

const switcher = (page: Page) => page.getByRole('combobox', { name: /language|limba/i })

async function setRomanian(page: Page) {
  await switcher(page).click()
  await page.getByText('Română', { exact: true }).click()
}

test.describe('translated pages', () => {
  test('SC-02: every admin page is shown in Romanian', async ({ page }) => {
    await mockApi(page)
    await page.goto('/dashboard')
    await setRomanian(page)
    const pages: [string, string][] = [
      ['/dashboard', 'Panou de control'],
      ['/people', 'Persoane'],
      ['/rooms', 'Camere'],
      ['/permissions', 'Permisiuni'],
      ['/registry', 'Registru'],
      ['/monitoring', 'Monitorizare'],
      ['/hardware', 'Simulator uşă'],
    ]
    for (const [path, heading] of pages) {
      await page.getByRole('menuitem', { name: new RegExp(heading.split(' ')[0], 'i') }).first().click()
      await expect(page).toHaveURL(new RegExp(path))
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      await expect(page.getByText('Dashboard', { exact: true })).toHaveCount(0)
    }
  })

  test('SC-08: Registry timestamp is formatted per language', async ({ page }) => {
    await mockApi(page)
    await page.goto('/registry')
    await expect(page.getByText('2025-11-25 14:03:00')).toBeVisible()

    await setRomanian(page)
    await expect(page.getByText('25.11.2025 14:03:00')).toBeVisible()
    await expect(page.getByText('2025-11-25 14:03:00')).toHaveCount(0)
  })

  test('SC-09: Monitoring count uses the Romanian thousands separator', async ({ page }) => {
    await mockApi(page, {
      '/monitoring/summary': (r) => json(r, { totalRooms: 1234, activePeople: 0, currentlyInside: 0, grantedToday: 1234, deniedToday: 0, doorsOffline: 0 }),
    })
    await page.goto('/monitoring')
    await setRomanian(page)
    await expect(page.getByText('1.234', { exact: true }).first()).toBeVisible()
  })
})

test.describe('kiosk (SC-10, SC-11, SC-12)', () => {
  const roomHints = {
    roomCode: 'LAB', roomName: 'Lab', active: true, pin: '1234',
    people: [{ personCode: '0023', fullName: 'Ana Pop', active: true }],
    inside: [],
  }

  test('SC-10: known API error code shows the Romanian text, not the API message', async ({ page }) => {
    await mockApi(page, {
      '/api/access/attempt': (r) => json(r, {
        error: 'validation_error',
        message: 'Code must be 8 digits',
        details: { reason: 'INVALID_CODE_LENGTH' },
      }, 422),
      '/hints': (r) => json(r, roomHints),
    })
    await page.goto('/pinpad/LAB')
    await setRomanian(page)
    for (const d of ['1', '2', '3']) await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button').filter({ has: page.locator('.anticon-check') }).click()

    await expect(page.getByText('Code must be 8 digits')).toHaveCount(0)
    await expect(page.getByText('Lungimea codului este greșită')).toBeVisible()
  })

  test('SC-11: unknown API error code falls back to the API message', async ({ page }) => {
    await mockApi(page, {
      '/api/access/attempt': (r) => json(r, { error: 'weird_error', message: 'Something odd' }, 500),
      '/hints': (r) => json(r, roomHints),
    })
    await page.goto('/pinpad/LAB')
    await setRomanian(page)
    for (const d of ['1', '2', '3', '4']) await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button').filter({ has: page.locator('.anticon-check') }).click()

    await expect(page.getByText('Something odd')).toBeVisible()
  })

  test('SC-12: kiosk keypad and prompts are Romanian and the switcher works without reload', async ({ page }) => {
    await mockApi(page, { '/hints': (r) => json(r, roomHints) })
    await page.goto('/pinpad/LAB')
    await expect(page.getByText('enter code')).toBeVisible()

    await setRomanian(page)
    await expect(page.getByText('introduceți codul')).toBeVisible()
    await expect(page.getByText('Ieșire', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('enter code')).toHaveCount(0)
  })
})
