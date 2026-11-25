# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: translated-pages.spec.ts >> kiosk (SC-10, SC-11, SC-12) >> SC-11: unknown API error code falls back to the API message
- Location: e2e/translated-pages.spec.ts:108:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('combobox', { name: /language|limba/i })

```

# Test source

```ts
  1   | import { test, expect, type Page, type Route } from '@playwright/test'
  2   | 
  3   | const json = (route: Route, body: unknown, status = 200) =>
  4   |   route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  5   | 
  6   | const EVENT_AT_1403 = {
  7   |   id: 'e1',
  8   |   createdAt: '2025-11-25T14:03:00',
  9   |   eventType: 'ENTER',
  10  |   decision: 'GRANTED',
  11  |   reason: null,
  12  |   rawCodeMasked: '****0023',
  13  |   personCode: '0023',
  14  |   personName: 'Ana Pop',
  15  |   roomCode: 'LAB',
  16  |   roomName: 'Lab',
  17  | }
  18  | 
  19  | async function mockApi(page: Page, overrides: Record<string, (r: Route) => unknown> = {}) {
  20  |   await page.route('**/pinpad/api/**', (route) => {
  21  |     const url = route.request().url()
  22  |     for (const key of Object.keys(overrides)) {
  23  |       if (url.includes(key)) return overrides[key](route)
  24  |     }
  25  |     if (url.includes('/summary')) {
  26  |       return json(route, { totalRooms: 2, activePeople: 3, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 })
  27  |     }
  28  |     if (url.includes('/registry/events')) return json(route, { items: [EVENT_AT_1403], total: 1, page: 1, size: 25 })
  29  |     if (url.includes('/monitoring/summary')) return json(route, { totalRooms: 0, activePeople: 0, currentlyInside: 0, grantedToday: 0, deniedToday: 0, doorsOffline: 0 })
  30  |     return json(route, { items: [], total: 0, page: 1, size: 25 })
  31  |   })
  32  | }
  33  | 
  34  | const switcher = (page: Page) => page.getByRole('combobox', { name: /language|limba/i })
  35  | 
  36  | async function setRomanian(page: Page) {
> 37  |   await switcher(page).click()
      |                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  38  |   await page.getByText('Română', { exact: true }).click()
  39  | }
  40  | 
  41  | test.describe('translated pages', () => {
  42  |   test('SC-02: every admin page is shown in Romanian', async ({ page }) => {
  43  |     await mockApi(page)
  44  |     await page.goto('/dashboard')
  45  |     await setRomanian(page)
  46  |     const pages: [string, string][] = [
  47  |       ['/dashboard', 'Panou de control'],
  48  |       ['/people', 'Persoane'],
  49  |       ['/rooms', 'Camere'],
  50  |       ['/permissions', 'Permisiuni'],
  51  |       ['/registry', 'Registru'],
  52  |       ['/monitoring', 'Monitorizare'],
  53  |       ['/hardware', 'Simulator uşă'],
  54  |     ]
  55  |     for (const [path, heading] of pages) {
  56  |       await page.getByRole('menuitem', { name: new RegExp(heading.split(' ')[0], 'i') }).first().click()
  57  |       await expect(page).toHaveURL(new RegExp(path))
  58  |       await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  59  |       await expect(page.getByText('Dashboard', { exact: true })).toHaveCount(0)
  60  |     }
  61  |   })
  62  | 
  63  |   test('SC-08: Registry timestamp is formatted per language', async ({ page }) => {
  64  |     await mockApi(page)
  65  |     await page.goto('/registry')
  66  |     await expect(page.getByText('2025-11-25 14:03:00')).toBeVisible()
  67  | 
  68  |     await setRomanian(page)
  69  |     await expect(page.getByText('25.11.2025 14:03:00')).toBeVisible()
  70  |     await expect(page.getByText('2025-11-25 14:03:00')).toHaveCount(0)
  71  |   })
  72  | 
  73  |   test('SC-09: Monitoring count uses the Romanian thousands separator', async ({ page }) => {
  74  |     await mockApi(page, {
  75  |       '/monitoring/summary': (r) => json(r, { totalRooms: 1234, activePeople: 0, currentlyInside: 0, grantedToday: 1234, deniedToday: 0, doorsOffline: 0 }),
  76  |     })
  77  |     await page.goto('/monitoring')
  78  |     await setRomanian(page)
  79  |     await expect(page.getByText('1.234', { exact: true }).first()).toBeVisible()
  80  |   })
  81  | })
  82  | 
  83  | test.describe('kiosk (SC-10, SC-11, SC-12)', () => {
  84  |   const roomHints = {
  85  |     roomCode: 'LAB', roomName: 'Lab', active: true, pin: '1234',
  86  |     people: [{ personCode: '0023', fullName: 'Ana Pop', active: true }],
  87  |     inside: [],
  88  |   }
  89  | 
  90  |   test('SC-10: known API error code shows the Romanian text, not the API message', async ({ page }) => {
  91  |     await mockApi(page, {
  92  |       '/api/access/attempt': (r) => json(r, {
  93  |         error: 'validation_error',
  94  |         message: 'Code must be 8 digits',
  95  |         details: { reason: 'INVALID_CODE_LENGTH' },
  96  |       }, 422),
  97  |       '/hints': (r) => json(r, roomHints),
  98  |     })
  99  |     await page.goto('/pinpad/LAB')
  100 |     await setRomanian(page)
  101 |     for (const d of ['1', '2', '3']) await page.getByRole('button', { name: d, exact: true }).click()
  102 |     await page.getByRole('button').filter({ has: page.locator('.anticon-check') }).click()
  103 | 
  104 |     await expect(page.getByText('Code must be 8 digits')).toHaveCount(0)
  105 |     await expect(page.getByText('Lungimea codului este greșită')).toBeVisible()
  106 |   })
  107 | 
  108 |   test('SC-11: unknown API error code falls back to the API message', async ({ page }) => {
  109 |     await mockApi(page, {
  110 |       '/api/access/attempt': (r) => json(r, { error: 'weird_error', message: 'Something odd' }, 500),
  111 |       '/hints': (r) => json(r, roomHints),
  112 |     })
  113 |     await page.goto('/pinpad/LAB')
  114 |     await setRomanian(page)
  115 |     for (const d of ['1', '2', '3', '4']) await page.getByRole('button', { name: d, exact: true }).click()
  116 |     await page.getByRole('button').filter({ has: page.locator('.anticon-check') }).click()
  117 | 
  118 |     await expect(page.getByText('Something odd')).toBeVisible()
  119 |   })
  120 | 
  121 |   test('SC-12: kiosk keypad and prompts are Romanian and the switcher works without reload', async ({ page }) => {
  122 |     await mockApi(page, { '/hints': (r) => json(r, roomHints) })
  123 |     await page.goto('/pinpad/LAB')
  124 |     await expect(page.getByText('enter code')).toBeVisible()
  125 | 
  126 |     await setRomanian(page)
  127 |     await expect(page.getByText('introduceți codul')).toBeVisible()
  128 |     await expect(page.getByText('Ieșire', { exact: true }).first()).toBeVisible()
  129 |     await expect(page.getByText('enter code')).toHaveCount(0)
  130 |   })
  131 | })
  132 | 
```