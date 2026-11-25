import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Typography, Empty, Descriptions, App } from 'antd'
import {
  LockOutlined, UnlockOutlined, WarningOutlined, ApiOutlined,
  DisconnectOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { doorAction, listDoors, type Door } from '@/api'
import { useTranslation } from 'react-i18next'
import { DoorStateTag } from '@/components/common'
import { formatDateTime } from '@/i18n/format'
import { translateApiError } from '@/i18n/errors'

const { Title, Text } = Typography

export function DoorSimulatorPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const doors = useQuery({ queryKey: ['doors'], queryFn: listDoors, refetchInterval: 5_000 })

  const act = useMutation({
    mutationFn: ({ code, action }: { code: string; action: string }) => doorAction(code, action),
    onSuccess: (_d, vars) => {
      message.success(t('hardware.actionDone', { action: vars.action, code: vars.code }))
      qc.invalidateQueries({ queryKey: ['doors'] })
      qc.invalidateQueries({ queryKey: ['mon-doors'] })
    },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const run = (code: string, action: string) => act.mutate({ code, action })

  return (
    <div>
      <Title level={2}>{t('hardware.title')}</Title>
      <Text type="secondary">{t('hardware.subtitle')}</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {(doors.data || []).map((d: Door) => (
          <Col key={d.roomId} xs={24} md={12} lg={8}>
            <Card
              title={<Space>{d.roomName} <DoorStateTag state={d.state} online={d.controllerOnline} /></Space>}
            >
              <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                <Descriptions.Item label={t('common.code')}>{d.roomCode}</Descriptions.Item>
                <Descriptions.Item label={t('hardware.locked')}>{d.locked ? t('common.yes') : t('common.no')}</Descriptions.Item>
                <Descriptions.Item label={t('hardware.controller')}>{d.controllerOnline ? t('common.controllerOnline') : t('common.controllerOffline')}</Descriptions.Item>
                <Descriptions.Item label={t('hardware.lastUnlock')}>{formatDateTime(d.lastUnlockAt)}</Descriptions.Item>
              </Descriptions>
              <Space wrap>
                <Button size="small" icon={<UnlockOutlined />} onClick={() => run(d.roomCode!, 'unlock')}>{t('hardware.action.unlock')}</Button>
                <Button size="small" icon={<LockOutlined />} onClick={() => run(d.roomCode!, 'lock')}>{t('hardware.action.lock')}</Button>
                <Button size="small" danger icon={<ThunderboltOutlined />} onClick={() => run(d.roomCode!, 'force-open')}>{t('hardware.action.forceOpen')}</Button>
                <Button size="small" danger icon={<WarningOutlined />} onClick={() => run(d.roomCode!, 'sensor-error')}>{t('hardware.action.sensorError')}</Button>
                <Button size="small" icon={<DisconnectOutlined />} onClick={() => run(d.roomCode!, 'offline')}>{t('hardware.action.offline')}</Button>
                <Button size="small" icon={<ApiOutlined />} onClick={() => run(d.roomCode!, 'online')}>{t('hardware.action.online')}</Button>
              </Space>
            </Card>
          </Col>
        ))}
        {(doors.data || []).length === 0 && <Col span={24}><Empty description={t('common.noDoors')} /></Col>}
      </Row>
    </div>
  )
}
