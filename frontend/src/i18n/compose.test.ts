import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// i18n-18: the compose stack still defines postgres, jaeger, backend and frontend,
// with the frontend served on port 3000. Full `docker compose up --build` is run outside this suite.
const compose = readFileSync(resolve(__dirname, '../../../docker-compose.yml'), 'utf8')

describe('docker compose stack', () => {
  it('i18n-18: defines postgres, jaeger, backend and frontend services', () => {
    for (const service of ['postgres', 'jaeger', 'backend', 'frontend']) {
      expect(compose).toMatch(new RegExp(`^  ${service}:`, 'm'))
    }
  })

  it('i18n-18: frontend is published on port 3000 by default', () => {
    expect(compose).toMatch(/\$\{FRONTEND_PORT:-3000\}:80/)
  })
})
