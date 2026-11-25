# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: language-switcher.spec.ts >> language switcher (SC-01, SC-03, SC-04) >> SC-01: selecting Română translates the admin shell
- Location: e2e/language-switcher.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('combobox', { name: /language|limba/i })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - img "safety-certificate" [ref=e9]
        - strong [ref=e13]: Pinpad
      - menu [ref=e14]:
        - menuitem "appstore Dashboard" [ref=e15] [cursor=pointer]:
          - img "appstore" [ref=e16]
          - generic [ref=e19]: Dashboard
        - menuitem "number Pinpad" [ref=e20] [cursor=pointer]:
          - img "number" [ref=e21]
          - generic [ref=e24]: Pinpad
        - separator [ref=e25]
        - menuitem "team People" [ref=e26] [cursor=pointer]:
          - img "team" [ref=e27]
          - generic [ref=e30]: People
        - menuitem "home Rooms" [ref=e31] [cursor=pointer]:
          - img "home" [ref=e32]
          - generic [ref=e35]: Rooms
        - menuitem "safety-certificate Permissions" [ref=e36] [cursor=pointer]:
          - img "safety-certificate" [ref=e37]
          - generic [ref=e40]: Permissions
        - separator [ref=e41]
        - menuitem "audit Registry" [ref=e42] [cursor=pointer]:
          - img "audit" [ref=e43]
          - generic [ref=e46]: Registry
        - menuitem "line-chart Monitoring" [ref=e47] [cursor=pointer]:
          - img "line-chart" [ref=e48]
          - generic [ref=e51]: Monitoring
        - menuitem "api Door Simulator" [ref=e52] [cursor=pointer]:
          - img "api" [ref=e53]
          - generic [ref=e56]: Door Simulator
      - generic [ref=e57]:
        - button [ref=e58] [cursor=pointer]:
          - img "bg-colors" [ref=e60]
        - button [ref=e63] [cursor=pointer]:
          - img "menu-fold" [ref=e65]
  - generic [ref=e68]:
    - banner [ref=e69]:
      - generic [ref=e70]: PIN-Based Room Access Registry Simulator
    - main [ref=e71]:
      - generic [ref=e72]:
        - heading "Dashboard" [level=2] [ref=e73]
        - generic [ref=e74]:
          - generic [ref=e77]:
            - generic [ref=e78]: Total rooms
            - generic [ref=e79]: "0"
          - generic [ref=e83]:
            - generic [ref=e84]: Active people
            - generic [ref=e85]: "0"
          - generic [ref=e89]:
            - generic [ref=e90]: Currently inside
            - generic [ref=e91]: "0"
          - generic [ref=e95]:
            - generic [ref=e96]: Granted today
            - generic [ref=e97]: "0"
          - generic [ref=e101]:
            - generic [ref=e102]: Denied today
            - generic [ref=e103]: "0"
          - generic [ref=e107]:
            - generic [ref=e108]: Doors offline
            - generic [ref=e109]: "0"
        - generic [ref=e111]:
          - generic [ref=e112]:
            - heading "Currently inside" [level=4] [ref=e113]
            - table [ref=e120]:
              - rowgroup [ref=e121]:
                - row [ref=e122]:
                  - columnheader "Person" [ref=e123]
                  - columnheader "Room" [ref=e124]
                  - columnheader "Since" [ref=e125]
              - rowgroup [ref=e126]:
                - row [ref=e127]:
                  - cell "No data Nobody inside" [ref=e128]:
                    - generic [ref=e129]:
                      - img "No data" [ref=e131]
                      - generic [ref=e143]: Nobody inside
          - generic [ref=e144]:
            - heading "Door states" [level=4] [ref=e145]
            - table [ref=e152]:
              - rowgroup [ref=e153]:
                - row [ref=e154]:
                  - columnheader "Room" [ref=e155]
                  - columnheader "State" [ref=e156]
              - rowgroup [ref=e157]:
                - row [ref=e158]:
                  - cell "No data No data" [ref=e159]:
                    - generic [ref=e160]:
                      - img "No data" [ref=e162]
                      - generic [ref=e168]: No data
        - heading "Recent denied / error attempts" [level=4] [ref=e169]
        - table [ref=e176]:
          - rowgroup [ref=e179]:
            - row [ref=e180]:
              - columnheader "Time" [ref=e181]
              - columnheader "Room" [ref=e182]
              - columnheader "Decision" [ref=e183]
              - columnheader "Reason" [ref=e184]
          - rowgroup [ref=e185]:
            - row [ref=e186]:
              - cell "No data No data" [ref=e187]:
                - generic [ref=e188]:
                  - img "No data" [ref=e190]
                  - generic [ref=e196]: No data
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
> 25 |     await switcher(page).click()
     |                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  76 |     await expect(switcher(page)).toContainText('English')
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