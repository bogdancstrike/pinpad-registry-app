import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, setBrowserLanguages } from '@/test/renderApp'

// i18n-17: Dashboard rendered in Romanian with mocked API responses
const SUMMARY = { totalRooms: 3, activePeople: 5, currentlyInside: 1, grantedToday: 1234, deniedToday: 2, doorsOffline: 0 }

vi.mock('@/api', async (orig) => ({
  ...(await orig<typeof import('@/api')>()),
  getSummary: async () => SUMMARY,
  getMonitoringDoors: async () => [],
  getOccupancy: async () => [],
  getDeniedEvents: async () => [],
}))

beforeEach(() => {
  window.localStorage.setItem('pinpad-locale', 'ro')
})

describe('Dashboard in Romanian', () => {
  it('i18n-17: shows the Romanian title and KPI labels and no English KPI label', async () => {
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Panou' })).toBeInTheDocument()
    expect(screen.getByText('Camere totale')).toBeInTheDocument()
    expect(screen.getByText('Acordat azi')).toBeInTheDocument()
    expect(screen.queryByText('Total rooms')).not.toBeInTheDocument()
    expect(screen.queryByText('Granted today')).not.toBeInTheDocument()
  })

  it('i18n-10: the granted KPI value uses Romanian thousands separator (1.234)', async () => {
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    const label = await screen.findByText('Acordat azi')
    const statistic = label.closest('.ant-statistic') as HTMLElement
    // antd splits the value at the decimal dot into separate spans, so match the value text.
    await waitFor(() => expect(statistic.querySelector('.ant-statistic-content')?.textContent).toBe('1.234'))
  })
})
