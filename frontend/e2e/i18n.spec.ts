import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'

test.describe('language switcher', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
  })

  test('defaults to English for an English browser with no saved choice', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('switching to Romanian translates the page and persists across reload', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByTestId('language-switcher').click()
    await page.locator('.ant-select-item-option', { hasText: 'Română' }).click()

    await expect(page.getByRole('heading', { name: 'Panou de bord' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
    await expect(page.getByText('Persoane active')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('pinpad-language'))).toBe('ro')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Panou de bord' })).toBeVisible()
    await expect(page.getByText('Persoane active')).toBeVisible()
  })

  test('uses the browser language on first visit when it is supported', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ro-RO' })
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Panou de bord' })).toBeVisible()
    await context.close()
  })

  test('a saved choice wins over the browser language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ro-RO' })
    await context.addInitScript(() => localStorage.setItem('pinpad-language', 'en'))
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await context.close()
  })

  test('falls back to English for an unsupported browser language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' })
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await context.close()
  })
})

test.describe('translated pages (Romanian)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.addInitScript(() => localStorage.setItem('pinpad-language', 'ro'))
  })

  test('dashboard shows no English labels in the main content', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Panou de bord' })).toBeVisible()
    await expect(page.getByText('Total camere')).toBeVisible()
    await expect(page.getByText('Încercări recente refuzate / cu eroare')).toBeVisible()
    await expect(page.getByText('Total rooms')).toHaveCount(0)
    await expect(page.getByText('Recent denied')).toHaveCount(0)
    await expect(page.getByText('Nobody inside')).toHaveCount(0)
  })

  test('numbers use Romanian formatting', async ({ page }) => {
    await page.goto('/dashboard')
    // 1234 is grouped with a dot in Romanian ("1.234"); a non-breaking space or dot separator is accepted.
    await expect(page.getByText(/^1[.\s\u00a0]?234$/)).toBeVisible()
  })

  test('navigation menu is translated', async ({ page }) => {
    await page.goto('/rooms')
    const nav = page.getByRole('menu')
    await expect(nav.getByText('Camere', { exact: true })).toBeVisible()
    await expect(nav.getByText('Persoane', { exact: true })).toBeVisible()
    await expect(nav.getByText('Simulator uşă', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Camere', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cameră nouă' })).toBeVisible()
  })
})

test.describe('no English left on any page (Romanian)', () => {
  // English UI words that must not appear in the Romanian interface.
  // Matched case-sensitively. "Pinpad" is the product name and is the same in both
  // languages, so it is not listed. "active" is also a valid Romanian adjective, so the
  // lowercase form is not listed either.
  const ENGLISH = [
    'Dashboard', 'People', 'Rooms', 'Room', 'Permissions', 'Registry', 'Monitoring',
    'Door Simulator', 'Person', 'Active', 'Inactive', 'Edit', 'Delete', 'Actions', 'Reason',
    'Decision', 'Description', 'Granted', 'Denied', 'Locked', 'Unlocked', 'Online', 'Offline',
    'Currently inside', 'Nobody inside', 'Door states', 'Stay', 'Exit', 'Saved', 'Deleted',
    'Grant access', 'Revoke', 'New person', 'New room', 'Total rooms', 'Total events', 'Time', 'Event', 'Language',
    'Door Terminal', 'DOOR TERMINAL', 'enter code', 'Back to keypad', 'Yes, exit', 'Demo codes',
  ]
  // /pinpad (launcher) and /pinpad/:room (kiosk) share the /pinpad prefix with the
  // API proxy (nginx in production, Vite in dev), so a page load there is intercepted by
  // the proxy and cannot be scanned in this suite. They are excluded from the scan.
  const PAGES = ['/dashboard', '/people', '/rooms', '/permissions', '/registry', '/monitoring', '/hardware']

  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.addInitScript(() => localStorage.setItem('pinpad-language', 'ro'))
  })

  for (const path of PAGES) {
    test(`${path} has no English UI text`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByTestId('language-switcher')).toBeVisible()
      await page.waitForLoadState('networkidle')
      const text = await page.locator('body').innerText()
      const found = ENGLISH.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
      expect(found, `English text on ${path}`).toEqual([])
    })
  }
})

test.describe('kiosk terminal', () => {
  test('keypad is translated and the switcher works on the kiosk', async ({ page }) => {
    await mockApi(page)
    await page.route('**/pinpad/api/pinpad/**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ roomCode: 'SERVER', roomName: 'Sala Serverelor', active: true, pin: '1234', people: [], inside: [] }),
      }))
    await page.addInitScript(() => localStorage.setItem('pinpad-language', 'ro'))
    // Reach the kiosk through in-app navigation; a direct page load of /pinpad/* is
    // intercepted by the API proxy (see the note above).
    await page.goto('/rooms')
    await page.evaluate(() => {
      window.history.pushState({}, '', '/pinpad/SERVER')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByText('TERMINAL UŞĂ')).toBeVisible()
    await page.getByTestId('language-switcher').click()
    await page.locator('.ant-select-item-option', { hasText: 'English' }).click()
    await expect(page.getByText('DOOR TERMINAL')).toBeVisible()
    await expect(page.getByText('enter code')).toBeVisible()
  })
})
