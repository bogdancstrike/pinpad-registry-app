import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Typography, Empty, Descriptions, App } from 'antd'
import {
  LockOutlined, UnlockOutlined, WarningOutlined, ApiOutlined,
  DisconnectOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { doorAction, listDoors, type Door } from '@/api'
import { DoorStateTag, fmtDateTime } from '@/components/common'

const { Title, Text } = Typography

export function DoorSimulatorPage() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const doors = useQuery({ queryKey: ['doors'], queryFn: listDoors, refetchInterval: 5_000 })

  const act = useMutation({
    mutationFn: ({ code, action }: { code: string; action: string }) => doorAction(code, action),
    onSuccess: (_d, vars) => {
      message.success(`${vars.action} → ${vars.code}`)
      qc.invalidateQueries({ queryKey: ['doors'] })
      qc.invalidateQueries({ queryKey: ['mon-doors'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  const run = (code: string, action: string) => act.mutate({ code, action })

  return (
    <div>
      <Title level={2}>Door Simulator</Title>
      <Text type="secondary">Manually drive mocked door hardware to demo abnormal scenarios.</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {(doors.data || []).map((d: Door) => (
          <Col key={d.roomId} xs={24} md={12} lg={8}>
            <Card
              title={<Space>{d.roomName} <DoorStateTag state={d.state} online={d.controllerOnline} /></Space>}
            >
              <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                <Descriptions.Item label="Code">{d.roomCode}</Descriptions.Item>
                <Descriptions.Item label="Locked">{d.locked ? 'yes' : 'no'}</Descriptions.Item>
                <Descriptions.Item label="Controller">{d.controllerOnline ? 'online' : 'offline'}</Descriptions.Item>
                <Descriptions.Item label="Last unlock">{fmtDateTime(d.lastUnlockAt)}</Descriptions.Item>
              </Descriptions>
              <Space wrap>
                <Button size="small" icon={<UnlockOutlined />} onClick={() => run(d.roomCode!, 'unlock')}>Unlock</Button>
                <Button size="small" icon={<LockOutlined />} onClick={() => run(d.roomCode!, 'lock')}>Lock</Button>
                <Button size="small" danger icon={<ThunderboltOutlined />} onClick={() => run(d.roomCode!, 'force-open')}>Force open</Button>
                <Button size="small" danger icon={<WarningOutlined />} onClick={() => run(d.roomCode!, 'sensor-error')}>Sensor error</Button>
                <Button size="small" icon={<DisconnectOutlined />} onClick={() => run(d.roomCode!, 'offline')}>Offline</Button>
                <Button size="small" icon={<ApiOutlined />} onClick={() => run(d.roomCode!, 'online')}>Online</Button>
              </Space>
            </Card>
          </Col>
        ))}
        {(doors.data || []).length === 0 && <Col span={24}><Empty description="No doors" /></Col>}
      </Row>
    </div>
  )
}
