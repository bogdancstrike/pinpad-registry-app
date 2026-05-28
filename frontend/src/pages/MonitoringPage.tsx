import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Table, Tag, Typography, Empty, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getMonitoringDoors, getOccupancy, type Door, type Occupant } from '@/api'
import { DoorStateTag, fmtDateTime } from '@/components/common'

const { Title, Text } = Typography

export function MonitoringPage() {
  const doors = useQuery({ queryKey: ['mon-doors'], queryFn: getMonitoringDoors, refetchInterval: 5_000 })
  const occupancy = useQuery({ queryKey: ['occupancy'], queryFn: getOccupancy, refetchInterval: 5_000 })

  const occCols: ColumnsType<Occupant> = [
    { title: 'Person', render: (_, o) => <span>{o.personName} <Tag>{o.personCode}</Tag></span> },
    { title: 'Room', dataIndex: 'roomName' },
    { title: 'Entered', dataIndex: 'enteredAt', render: (v) => fmtDateTime(v) },
  ]

  return (
    <div>
      <Title level={2}>Monitoring</Title>
      <Text type="secondary">Live door state and room occupancy (auto-refreshes every 5s).</Text>

      <Title level={4} style={{ marginTop: 16 }}>Doors</Title>
      <Row gutter={[16, 16]}>
        {(doors.data || []).map((d: Door) => (
          <Col key={d.roomId} xs={24} sm={12} md={8} lg={6}>
            <Card size="small" title={d.roomName}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">{d.roomCode}</Text>
                <DoorStateTag state={d.state} online={d.controllerOnline} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge status={d.locked ? 'default' : 'success'} text={d.locked ? 'Locked' : 'Unlocked'} />
                <Badge status={d.controllerOnline ? 'success' : 'error'} text={d.controllerOnline ? 'Online' : 'Offline'} />
              </div>
            </Card>
          </Col>
        ))}
        {(doors.data || []).length === 0 && <Col span={24}><Empty description="No doors" /></Col>}
      </Row>

      <Title level={4} style={{ marginTop: 24 }}>Currently inside</Title>
      <Table rowKey={(o) => o.personCode + o.roomCode} columns={occCols}
             dataSource={occupancy.data || []} pagination={false}
             locale={{ emptyText: <Empty description="Nobody inside" /> }} />
    </div>
  )
}
