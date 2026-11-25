import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import { App } from '@/App'

export function setBrowserLanguages(langs: string[]) {
  Object.defineProperty(window.navigator, 'languages', { value: langs, configurable: true })
  Object.defineProperty(window.navigator, 'language', { value: langs[0], configurable: true })
}

function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="location-probe">{pathname}</div>
}

export function renderApp(path = '/dashboard') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={[path]}>
            <App />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  )
}
