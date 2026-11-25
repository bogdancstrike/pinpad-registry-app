import { test, expect, type Page } from '@playwright/test'

// Mocked API responses so the admin shell can render without a backend.
async function mockApi(page: Page) {
  await page.route('**/pinpad/api/**', (route) => {
    const url = route.request().url()
    const body = url.includes('/summary')
      ? { totalRooms: 0, activePeople: 0, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 }
      : { items: [], total: 0, page: 1, size: 25 }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

const NAV_EN = ['Dashboard', 'People', 'Rooms', 'Permissions', 'Registry', 'Monitoring', 'Door Simulator']

// Switcher is identified by its accessible label; the implementation must expose it.
const switcher = (page: Page) => page.getByRole('combobox', { name: /language|limba/i })

test.describe('language switcher (SC-01, SC-03, SC-04)', () => {
  test('SC-01: selecting Română translates the admin shell', async ({ page }) => {
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()

    await switcher(page).click()
    await page.getByText('Română', { exact: true }).click()

    await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Persoane', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('PIN-Based Room Access Registry Simulator')).toHaveCount(0)
    await expect(page.getByText('Sistem de registru de acces al camerelor bazat pe PIN')).toBeVisible()
    for (const label of NAV_EN) {
      await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveCount(0)
    }
  })

  test('SC-03: chosen language survives a reload and the switcher shows it selected', async ({ page }) => {
    await mockApi(page)
    await page.goto('/dashboard')
    await switcher(page).click()
    await page.getByText('Română', { exact: true }).click()

    await page.reload()
    await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
    await expect(switcher(page)).toContainText('Română')
  })

  test('SC-04: the choice is stored under pinpad-language as ro', async ({ page }) => {
    await mockApi(page)
    await page.goto('/dashboard')
    await switcher(page).click()
    await page.getByText('Română', { exact: true }).click()

    const stored = await page.evaluate(() => window.localStorage.getItem('pinpad-language'))
    expect(stored).toBe('ro')
  })
})

test.describe('initial language (SC-05, SC-06, SC-07)', () => {
  test('SC-05: ro-RO browser with no saved choice opens in Romanian', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ro-RO' })
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
    await expect(switcher(page)).toContainText('Română')
    await context.close()
  })

  test('SC-06: fr-FR browser with no saved choice opens in English', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR' })
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
    await expect(switcher(page)).toContainText('English')
    await context.close()
  })

  test('SC-07: saved en beats a ro-RO browser', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ro-RO' })
    await context.addInitScript(() => window.localStorage.setItem('pinpad-language', 'en'))
    const page = await context.newPage()
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
    await expect(switcher(page)).toContainText('English')
    await context.close()
  })
})
