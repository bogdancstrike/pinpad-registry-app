# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: language-switcher.spec.ts >> initial language (SC-05, SC-06, SC-07) >> SC-06: fr-FR browser with no saved choice opens in English
- Location: e2e/language-switcher.spec.ts:70:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('combobox', { name: /language|limba/i })
Expected substring: "English"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('combobox', { name: /language|limba/i }) with timeout 5000ms
  - waiting for getByRole('combobox', { name: /language|limba/i })

```

```yaml
- complementary:
  - img "safety-certificate"
  - strong: Pinpad
  - menu:
    - menuitem "appstore Dashboard":
      - img "appstore"
      - text: Dashboard
    - menuitem "number Pinpad":
      - img "number"
      - text: Pinpad
    - separator
    - menuitem "team People":
      - img "team"
      - text: People
    - menuitem "home Rooms":
      - img "home"
      - text: Rooms
    - menuitem "safety-certificate Permissions":
      - img "safety-certificate"
      - text: Permissions
    - separator
    - menuitem "audit Registry":
      - img "audit"
      - text: Registry
    - menuitem "line-chart Monitoring":
      - img "line-chart"
      - text: Monitoring
    - menuitem "api Door Simulator":
      - img "api"
      - text: Door Simulator
  - button "bg-colors":
    - img "bg-colors"
  - button "menu-fold":
    - img "menu-fold"
- banner: PIN-Based Room Access Registry Simulator
- main:
  - heading "Dashboard" [level=2]
  - text: Total rooms 0 Active people 0 Currently inside 0 Granted today 0 Denied today 0 Doors offline 0
  - heading "Currently inside" [level=4]
  - table:
    - rowgroup:
      - row "Person Room Since":
        - columnheader "Person"
        - columnheader "Room"
        - columnheader "Since"
    - rowgroup:
      - row "No data Nobody inside":
        - cell "No data Nobody inside":
          - img "No data"
          - text: Nobody inside
  - heading "Door states" [level=4]
  - table:
    - rowgroup:
      - row "Room State":
        - columnheader "Room"
        - columnheader "State"
    - rowgroup:
      - row "No data No data":
        - cell "No data No data":
          - img "No data"
          - text: No data
  - heading "Recent denied / error attempts" [level=4]
  - table:
    - rowgroup:
      - row "Time Room Decision Reason":
        - columnheader "Time"
        - columnheader "Room"
        - columnheader "Decision"
        - columnheader "Reason"
    - rowgroup:
      - row "No data No data":
        - cell "No data No data":
          - img "No data"
          - text: No data
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test'
  2  | 
  3  | // Mocked API responses so the admin shell can render without a backend.
  4  | async function mockApi(page: Page) {
  5  |   await page.route('**/pinpad/api/**', (route) => {
  6  |     const url = route.request().url()
  7  |     const body = url.includes('/summary')
  8  |       ? { totalRooms: 0, activePeople: 0, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 }
  9  |       : { items: [], total: 0, page: 1, size: 25 }
  10 |     return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  11 |   })
  12 | }
  13 | 
  14 | const NAV_EN = ['Dashboard', 'People', 'Rooms', 'Permissions', 'Registry', 'Monitoring', 'Door Simulator']
  15 | 
  16 | // Switcher is identified by its accessible label; the implementation must expose it.
  17 | const switcher = (page: Page) => page.getByRole('combobox', { name: /language|limba/i })
  18 | 
  19 | test.describe('language switcher (SC-01, SC-03, SC-04)', () => {
  20 |   test('SC-01: selecting Română translates the admin shell', async ({ page }) => {
  21 |     await mockApi(page)
  22 |     await page.goto('/dashboard')
  23 |     await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
  24 | 
  25 |     await switcher(page).click()
  26 |     await page.getByText('Română', { exact: true }).click()
  27 | 
  28 |     await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
  29 |     await expect(page.getByText('Persoane', { exact: true }).first()).toBeVisible()
  30 |     await expect(page.getByText('PIN-Based Room Access Registry Simulator')).toHaveCount(0)
  31 |     await expect(page.getByText('Sistem de registru de acces al camerelor bazat pe PIN')).toBeVisible()
  32 |     for (const label of NAV_EN) {
  33 |       await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveCount(0)
  34 |     }
  35 |   })
  36 | 
  37 |   test('SC-03: chosen language survives a reload and the switcher shows it selected', async ({ page }) => {
  38 |     await mockApi(page)
  39 |     await page.goto('/dashboard')
  40 |     await switcher(page).click()
  41 |     await page.getByText('Română', { exact: true }).click()
  42 | 
  43 |     await page.reload()
  44 |     await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
  45 |     await expect(switcher(page)).toContainText('Română')
  46 |   })
  47 | 
  48 |   test('SC-04: the choice is stored under pinpad-language as ro', async ({ page }) => {
  49 |     await mockApi(page)
  50 |     await page.goto('/dashboard')
  51 |     await switcher(page).click()
  52 |     await page.getByText('Română', { exact: true }).click()
  53 | 
  54 |     const stored = await page.evaluate(() => window.localStorage.getItem('pinpad-language'))
  55 |     expect(stored).toBe('ro')
  56 |   })
  57 | })
  58 | 
  59 | test.describe('initial language (SC-05, SC-06, SC-07)', () => {
  60 |   test('SC-05: ro-RO browser with no saved choice opens in Romanian', async ({ browser }) => {
  61 |     const context = await browser.newContext({ locale: 'ro-RO' })
  62 |     const page = await context.newPage()
  63 |     await mockApi(page)
  64 |     await page.goto('/dashboard')
  65 |     await expect(page.getByText('Panou de control', { exact: true }).first()).toBeVisible()
  66 |     await expect(switcher(page)).toContainText('Română')
  67 |     await context.close()
  68 |   })
  69 | 
  70 |   test('SC-06: fr-FR browser with no saved choice opens in English', async ({ browser }) => {
  71 |     const context = await browser.newContext({ locale: 'fr-FR' })
  72 |     const page = await context.newPage()
  73 |     await mockApi(page)
  74 |     await page.goto('/dashboard')
  75 |     await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
> 76 |     await expect(switcher(page)).toContainText('English')
     |                                  ^ Error: expect(locator).toContainText(expected) failed
  77 |     await context.close()
  78 |   })
  79 | 
  80 |   test('SC-07: saved en beats a ro-RO browser', async ({ browser }) => {
  81 |     const context = await browser.newContext({ locale: 'ro-RO' })
  82 |     await context.addInitScript(() => window.localStorage.setItem('pinpad-language', 'en'))
  83 |     const page = await context.newPage()
  84 |     await mockApi(page)
  85 |     await page.goto('/dashboard')
  86 |     await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
  87 |     await expect(switcher(page)).toContainText('English')
  88 |     await context.close()
  89 |   })
  90 | })
  91 | 
```