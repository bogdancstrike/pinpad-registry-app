import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Table, Tag, Typography, Empty, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getMonitoringDoors, getOccupancy, type Door, type Occupant } from '@/api'
import { DoorStateTag, fmtDateTime } from '@/components/common'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

export function MonitoringPage() {
  const { t } = useTranslation()
  const doors = useQuery({ queryKey: ['mon-doors'], queryFn: getMonitoringDoors, refetchInterval: 5_000 })
  const occupancy = useQuery({ queryKey: ['occupancy'], queryFn: getOccupancy, refetchInterval: 5_000 })

  const occCols: ColumnsType<Occupant> = [
    { title: t('common.person'), render: (_, o) => <span>{o.personName} <Tag>{o.personCode}</Tag></span> },
    { title: t('common.room'), dataIndex: 'roomName' },
    { title: t('monitoring.entered'), dataIndex: 'enteredAt', render: (v) => fmtDateTime(v) },
  ]

  return (
    <div>
      <Title level={2}>{t('monitoring.title')}</Title>
      <Text type="secondary">{t('monitoring.subtitle')}</Text>

      <Title level={4} style={{ marginTop: 16 }}>{t('monitoring.doors')}</Title>
      <Row gutter={[16, 16]}>
        {(doors.data || []).map((d: Door) => (
          <Col key={d.roomId} xs={24} sm={12} md={8} lg={6}>
            <Card size="small" title={d.roomName}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">{d.roomCode}</Text>
                <DoorStateTag state={d.state} online={d.controllerOnline} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge status={d.locked ? 'default' : 'success'} text={d.locked ? t('monitoring.locked') : t('monitoring.unlocked')} />
                <Badge status={d.controllerOnline ? 'success' : 'error'} text={d.controllerOnline ? t('monitoring.online') : t('monitoring.offline')} />
              </div>
            </Card>
          </Col>
        ))}
        {(doors.data || []).length === 0 && <Col span={24}><Empty description={t('monitoring.noDoors')} /></Col>}
      </Row>

      <Title level={4} style={{ marginTop: 24 }}>{t('monitoring.currentlyInside')}</Title>
      <Table rowKey={(o) => o.personCode + o.roomCode} columns={occCols}
             dataSource={occupancy.data || []} pagination={false}
             locale={{ emptyText: <Empty description={t('monitoring.nobodyInside')} /> }} />
    </div>
  )
}
