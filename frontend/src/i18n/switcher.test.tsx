import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderApp, setBrowserLanguages } from '@/test/renderApp'

// i18n-16 (switcher test), i18n-03 (no reload), i18n-05 (reload keeps choice)
describe('language switcher', () => {
  it('i18n-16: selecting Română in the admin shell switches sidebar labels and stores ro', async () => {
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    const nav = await screen.findByRole('navigation')
    expect(within(nav).getByText('Dashboard')).toBeInTheDocument()

    const switcher = screen.getAllByRole('combobox', { name: /language|limba/i })[0]
    fireEvent.mouseDown(switcher)
    fireEvent.click(await screen.findByText('Română'))

    await waitFor(() => {
      const romanianNav = within(screen.getByRole('navigation'))
      expect(romanianNav.getByText('Panou')).toBeInTheDocument()
      expect(romanianNav.getByText('Persoane')).toBeInTheDocument()
    })
    expect(window.localStorage.getItem('pinpad-locale')).toBe('ro')
  })

  it('i18n-03: switching on the Dashboard keeps the URL and updates the title without reload', async () => {
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    const switcher = (await screen.findAllByRole('combobox', { name: /language|limba/i }))[0]
    fireEvent.mouseDown(switcher)
    fireEvent.click(await screen.findByText('Română'))
    expect(await screen.findByRole('heading', { name: 'Panou' })).toBeInTheDocument()
    expect(screen.getByTestId('location-probe').textContent).toBe('/dashboard')
  })

  it('i18n-04: switcher is present in the header on a narrow viewport', async () => {
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    setBrowserLanguages(['en-US'])
    renderApp('/dashboard')
    const header = await screen.findByRole('banner')
    expect(within(header).getByRole('combobox', { name: /language|limba/i })).toBeInTheDocument()
  })
})
