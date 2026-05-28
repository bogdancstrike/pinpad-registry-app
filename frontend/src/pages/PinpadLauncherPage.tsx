import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Typography, Empty, Spin, Tag } from 'antd'
import { NumberOutlined } from '@ant-design/icons'
import { listRooms } from '@/api'

const { Title, Text } = Typography

export function PinpadLauncherPage() {
  const navigate = useNavigate()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

  if (rooms.isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <Title level={2}>Pinpad terminals</Title>
      <Text type="secondary">Pick a room to open its door terminal.</Text>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {(rooms.data || []).map((room) => (
          <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
            <Card hoverable onClick={() => navigate(`/pinpad/${room.code}`)}>
              <NumberOutlined style={{ fontSize: 28 }} />
              <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>{room.name}</Title>
              <Text type="secondary">{room.code}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={room.active ? 'green' : 'default'}>{room.active ? 'active' : 'inactive'}</Tag>
              </div>
            </Card>
          </Col>
        ))}
        {(rooms.data || []).length === 0 && <Empty description="No rooms yet" style={{ margin: '40px auto' }} />}
      </Row>
    </div>
  )
}
