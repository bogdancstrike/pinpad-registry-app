import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antTheme, App as AntApp } from 'antd'
import { useTranslation } from 'react-i18next'
import { App } from './App'
import { useThemeStore } from './stores/themeStore'
import { LANGUAGES } from './i18n/languages'
import './i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function Root() {
  const { mode } = useThemeStore()
  const { i18n } = useTranslation()
  const antLocale = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage)?.antd
  return (
    <ConfigProvider
      locale={antLocale}
      theme={{
        algorithm: mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: { borderRadius: 6 },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
