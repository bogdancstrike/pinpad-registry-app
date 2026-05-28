import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  ConfigProvider, Layout, Menu, theme as antTheme, Typography, Button, Tooltip, Grid,
} from 'antd'
import {
  AppstoreOutlined, TeamOutlined, HomeOutlined, SafetyCertificateOutlined,
  AuditOutlined, LineChartOutlined, ApiOutlined, NumberOutlined,
  BgColorsOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useThemeStore } from './stores/themeStore'
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

const NAV_ITEMS = [
  { key: '/dashboard', label: 'Dashboard', icon: <AppstoreOutlined /> },
  { key: '/pinpad', label: 'Pinpad', icon: <NumberOutlined /> },
  { type: 'divider' as const, key: 'd1' },
  { key: '/people', label: 'People', icon: <TeamOutlined /> },
  { key: '/rooms', label: 'Rooms', icon: <HomeOutlined /> },
  { key: '/permissions', label: 'Permissions', icon: <SafetyCertificateOutlined /> },
  { type: 'divider' as const, key: 'd2' },
  { key: '/registry', label: 'Registry', icon: <AuditOutlined /> },
  { key: '/monitoring', label: 'Monitoring', icon: <LineChartOutlined /> },
  { key: '/hardware', label: 'Door Simulator', icon: <ApiOutlined /> },
]

function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
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
              {!collapsed && <Text strong style={{ fontSize: 16 }}>Pinpad</Text>}
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
              <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
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
          <Text type="secondary">PIN-Based Room Access Registry Simulator</Text>
          {isMobile && (
            <Button type="text" icon={<BgColorsOutlined />} onClick={toggle} />
          )}
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
