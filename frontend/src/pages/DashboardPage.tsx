import { useQuery } from '@tanstack/react-query'
import { Col, Row, Statistic, Table, Tag, Typography, theme as antTheme, Empty } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  getSummary, getOccupancy, getDeniedEvents, getMonitoringDoors,
  type Occupant, type AccessEvent, type Door,
} from '@/api'
import { useTranslation } from 'react-i18next'
import { DoorStateTag, DecisionTag } from '@/components/common'
import { formatDateTime, formatNumber } from '@/i18n/format'

const { Title } = Typography

function Kpi({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const { token } = antTheme.useToken()
  const shown = typeof value === 'number' ? formatNumber(value) : value
  return (
    <div style={{
      background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: 8, padding: 16, minHeight: 88,
    }}>
      <Statistic title={label} value={shown} valueStyle={color ? { color } : undefined} />
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { token } = antTheme.useToken()
  const summary = useQuery({ queryKey: ['summary'], queryFn: getSummary, refetchInterval: 10_000 })
  const doors = useQuery({ queryKey: ['mon-doors'], queryFn: getMonitoringDoors, refetchInterval: 10_000 })
  const occupancy = useQuery({ queryKey: ['occupancy'], queryFn: getOccupancy, refetchInterval: 10_000 })
  const denied = useQuery({ queryKey: ['denied'], queryFn: getDeniedEvents, refetchInterval: 10_000 })

  const s = summary.data

  const occCols: ColumnsType<Occupant> = [
    { title: t('common.person'), render: (_, o) => <span>{o.personName} <Tag>{o.personCode}</Tag></span> },
    { title: t('common.room'), dataIndex: 'roomName' },
    { title: t('dashboard.since'), dataIndex: 'enteredAt', render: (v) => formatDateTime(v) },
  ]
  const doorCols: ColumnsType<Door> = [
    { title: t('common.room'), dataIndex: 'roomName' },
    { title: t('dashboard.state'), render: (_, d) => <DoorStateTag state={d.state} online={d.controllerOnline} /> },
  ]
  const deniedCols: ColumnsType<AccessEvent> = [
    { title: t('common.time'), dataIndex: 'createdAt', width: 170, render: (v) => formatDateTime(v) },
    { title: t('common.room'), dataIndex: 'roomName', render: (v) => v || '—' },
    { title: t('common.decision'), dataIndex: 'decision', render: (v) => <DecisionTag decision={v} /> },
    { title: t('common.reasonHeader'), dataIndex: 'reason', render: (v) => v || '—' },
  ]

  return (
    <div>
      <Title level={2}>{t('dashboard.title')}</Title>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.totalRooms')} value={s?.totalRooms ?? '—'} /></Col>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.activePeople')} value={s?.activePeople ?? '—'} /></Col>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.currentlyInside')} value={s?.currentlyInside ?? '—'} color={token.colorPrimary} /></Col>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.grantedToday')} value={s?.grantedToday ?? '—'} color={token.colorSuccess} /></Col>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.deniedToday')} value={s?.deniedToday ?? '—'} color={token.colorError} /></Col>
        <Col xs={12} md={4}><Kpi label={t('dashboard.kpi.doorsOffline')} value={s?.doorsOffline ?? '—'} color={token.colorWarning} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Title level={4}>{t('dashboard.kpi.currentlyInside')}</Title>
          <Table rowKey={(o) => o.personCode + o.roomCode} size="small" columns={occCols}
                 dataSource={occupancy.data || []} pagination={false}
                 locale={{ emptyText: <Empty description={t('common.nobodyInside')} /> }} />
        </Col>
        <Col xs={24} lg={12}>
          <Title level={4}>{t('dashboard.doorStates')}</Title>
          <Table rowKey="roomId" size="small" columns={doorCols}
                 dataSource={doors.data || []} pagination={false} />
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 16 }}>{t('dashboard.recentDenied')}</Title>
      <Table rowKey="id" size="small" columns={deniedCols} dataSource={denied.data || []} pagination={false} />
    </div>
  )
}
