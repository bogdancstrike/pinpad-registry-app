import type { Page } from '@playwright/test'

// Minimal API responses so the pages render with data.
const rooms = [{ id: 'r1', code: 'SERVER', name: 'Sala Serverelor', description: null, active: true }]
const doors = [{
  roomId: 'r1', roomCode: 'SERVER', roomName: 'Sala Serverelor', state: 'LOCKED',
  locked: true, doorOpen: false, controllerOnline: true, lastUnlockAt: null, lastLockAt: null,
}]
const summary = {
  totalRooms: 1234, activePeople: 2, currentlyInside: 0, grantedToday: 5, deniedToday: 1, doorsOffline: 0,
}

/** Mocks the backend API for a page. Anything not listed returns an empty list. */
export async function mockApi(page: Page) {
  await page.route('**/pinpad/api/**', (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path.endsWith('/monitoring/summary')) return json(summary)
    if (path.endsWith('/rooms')) return json({ items: rooms })
    if (path.includes('/mock-hardware/doors') || path.endsWith('/monitoring/doors')) return json({ items: doors })
    if (path.endsWith('/registry/events')) return json({ items: [], total: 0, page: 1, size: 25 })
    if (path.endsWith('/people')) return json({ items: [] })
    if (path.endsWith('/permissions')) return json({ items: [] })
    if (path.endsWith('/occupancy') || path.endsWith('/denied-events')) return json({ items: [] })
    return json({ items: [] })
  })
}
