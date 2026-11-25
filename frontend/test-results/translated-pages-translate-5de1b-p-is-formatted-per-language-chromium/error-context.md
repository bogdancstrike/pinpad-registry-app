# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: translated-pages.spec.ts >> translated pages >> SC-08: Registry timestamp is formatted per language
- Location: e2e/translated-pages.spec.ts:63:3

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
        - generic [ref=e73]:
          - heading "Registry" [level=2] [ref=e75]
          - button [ref=e77] [cursor=pointer]:
            - img "reload" [ref=e79]
        - generic [ref=e82]:
          - textbox "Room code" [ref=e85]
          - generic [ref=e90] [cursor=pointer]:
            - combobox [ref=e92]
            - generic: Decision
          - generic [ref=e96] [cursor=pointer]:
            - combobox [ref=e98]
            - generic: Event type
        - generic [ref=e101]:
          - table [ref=e105]:
            - rowgroup [ref=e114]:
              - row [ref=e115]:
                - columnheader "Time" [ref=e116]
                - columnheader "Person" [ref=e117]
                - columnheader "Room" [ref=e118]
                - columnheader "Event" [ref=e119]
                - columnheader "Decision" [ref=e120]
                - columnheader "Reason" [ref=e121]
                - columnheader "Code" [ref=e122]
            - rowgroup [ref=e123]:
              - row [ref=e124]:
                - cell "2025-11-25 14:03:00" [ref=e125]
                - cell "Ana Pop 0023" [ref=e126]:
                  - generic [ref=e127]:
                    - text: Ana Pop
                    - generic [ref=e128]: "0023"
                - cell "Lab LAB" [ref=e129]:
                  - generic [ref=e130]:
                    - text: Lab
                    - generic [ref=e131]: LAB
                - cell "ENTER" [ref=e132]
                - cell "GRANTED" [ref=e134]
                - cell "—" [ref=e136]
                - cell [ref=e137]:
                  - code [ref=e139]: "****0023"
          - list [ref=e140]:
            - listitem [ref=e141]: Total 1 events
            - listitem "Previous Page" [ref=e142]:
              - button [disabled] [ref=e143]:
                - img "left" [ref=e144]
            - listitem "1" [ref=e147] [cursor=pointer]
            - listitem "Next Page" [ref=e149]:
              - button [disabled] [ref=e150]:
                - img "right" [ref=e151]
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