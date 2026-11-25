import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  ConfigProvider, Layout, Menu, theme as antTheme, Typography, Button, Tooltip, Grid, Space,
} from 'antd'
import {
  AppstoreOutlined, TeamOutlined, HomeOutlined, SafetyCertificateOutlined,
  AuditOutlined, LineChartOutlined, ApiOutlined, NumberOutlined,
  BgColorsOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useThemeStore } from './stores/themeStore'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { DashboardPage } from './pages/DashboardPage'
import { PeoplePage } from './pages/PeoplePage'
import { RoomsPage } from './pages/RoomsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { RegistryPage } from './pages/RegistryPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { DoorSimulatorPage } from './pages/DoorSimulatorPage'
import { PinpadPage } from './pages/PinpadPage'
import { PinpadLauncherPage } from './pages/PinpadLauncherPage'

const { Header, Sider, Content } = Layout
const { Text } = Typography

function useNavItems() {
  const { t } = useTranslation()
  return [
    { key: '/dashboard', label: t('nav.dashboard'), icon: <AppstoreOutlined /> },
    { key: '/pinpad', label: t('nav.pinpad'), icon: <NumberOutlined /> },
    { type: 'divider' as const, key: 'd1' },
    { key: '/people', label: t('nav.people'), icon: <TeamOutlined /> },
    { key: '/rooms', label: t('nav.rooms'), icon: <HomeOutlined /> },
    { key: '/permissions', label: t('nav.permissions'), icon: <SafetyCertificateOutlined /> },
    { type: 'divider' as const, key: 'd2' },
    { key: '/registry', label: t('nav.registry'), icon: <AuditOutlined /> },
    { key: '/monitoring', label: t('nav.monitoring'), icon: <LineChartOutlined /> },
    { key: '/hardware', label: t('nav.hardware'), icon: <ApiOutlined /> },
  ]
}

/** Keeps the browser tab title in the current language. */
function useDocumentTitle() {
  const { t, i18n } = useTranslation()
  useEffect(() => { document.title = t('app.documentTitle') }, [t, i18n.language])
}

function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const NAV_ITEMS = useNavItems()
  const { token } = antTheme.useToken()
  const { mode, toggle } = useThemeStore()
  const [collapsed, setCollapsed] = useState(false)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const selectedKey =
    NAV_ITEMS.filter((i) => 'key' in i && i.key?.startsWith('/'))
      .map((i) => (i as { key: string }).key)
      .filter((k) => location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || '/dashboard'

  return (
    <Layout style={{ height: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={220}
          style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorder}` }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: 56, display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', borderBottom: `1px solid ${token.colorBorder}`,
            }}>
              <SafetyCertificateOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
              {!collapsed && <Text strong style={{ fontSize: 16 }}>{t('app.brand')}</Text>}
            </div>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={NAV_ITEMS}
              onClick={({ key }) => navigate(key)}
              style={{ borderRight: 0, flex: 1, overflowY: 'auto' }}
            />
            <div style={{
              borderTop: `1px solid ${token.colorBorder}`, padding: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <Tooltip title={t('theme.switchTo', { mode: t(mode === 'dark' ? 'theme.light' : 'theme.dark') })}>
                <Button type="text" icon={<BgColorsOutlined />} onClick={toggle} />
              </Tooltip>
              <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                      onClick={() => setCollapsed(!collapsed)} />
            </div>
          </div>
        </Sider>
      )}
      <Layout>
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: token.colorBgContainer, height: 56,
          borderBottom: `1px solid ${token.colorBorder}`,
        }}>
          <Text type="secondary">{t('app.subtitle')}</Text>
          <Space>
            <LanguageSwitcher size="small" />
            {isMobile && (
              <Button type="text" icon={<BgColorsOutlined />} onClick={toggle} />
            )}
          </Space>
        </Header>
        <Content style={{ overflow: 'auto', padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pinpad" element={<PinpadLauncherPage />} />
            <Route path="/pinpad/:roomCode" element={<PinpadPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/permissions" element={<PermissionsPage />} />
            <Route path="/registry" element={<RegistryPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/hardware" element={<DoorSimulatorPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export function App() {
  const { mode } = useThemeStore()
  useDocumentTitle()
  // Pinpad is a full-screen kiosk view — render it outside the admin shell.
  const isKiosk = useLocation().pathname.match(/^\/pinpad\/.+/)
  if (isKiosk) {
    return (
      <ConfigProvider theme={{ algorithm: mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm }}>
        <Routes>
          <Route path="/pinpad/:roomCode" element={<PinpadPage />} />
        </Routes>
      </ConfigProvider>
    )
  }
  return <Shell />
}
