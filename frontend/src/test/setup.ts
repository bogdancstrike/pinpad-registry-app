import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// antd's responsive Grid hook needs matchMedia; jsdom does not provide it.
// Default: wide viewport (matches md and up).
window.matchMedia = ((query: string) => ({
  matches: true, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
