import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Typography, Empty, Descriptions, App } from 'antd'
import {
  LockOutlined, UnlockOutlined, WarningOutlined, ApiOutlined,
  DisconnectOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { doorAction, listDoors, type Door } from '@/api'
import { DoorStateTag, fmtDateTime } from '@/components/common'
import { useTranslation } from 'react-i18next'
import { translateError } from '@/i18n/errors'

const { Title, Text } = Typography

export function DoorSimulatorPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const doors = useQuery({ queryKey: ['doors'], queryFn: listDoors, refetchInterval: 5_000 })

  const act = useMutation({
    mutationFn: ({ code, action }: { code: string; action: string }) => doorAction(code, action),
    onSuccess: (_d, vars) => {
      message.success(t('door.actionDone', { action: t(`door.actions.${vars.action}`), code: vars.code }))
      qc.invalidateQueries({ queryKey: ['doors'] })
      qc.invalidateQueries({ queryKey: ['mon-doors'] })
    },
    onError: (e) => message.error(translateError(e)),
  })

  const run = (code: string, action: string) => act.mutate({ code, action })

  return (
    <div>
      <Title level={2}>{t('door.title')}</Title>
      <Text type="secondary">{t('door.subtitle')}</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {(doors.data || []).map((d: Door) => (
          <Col key={d.roomId} xs={24} md={12} lg={8}>
            <Card
              title={<Space>{d.roomName} <DoorStateTag state={d.state} online={d.controllerOnline} /></Space>}
            >
              <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                <Descriptions.Item label={t('common.code')}>{d.roomCode}</Descriptions.Item>
                <Descriptions.Item label={t('door.locked')}>{d.locked ? t('door.yes') : t('door.no')}</Descriptions.Item>
                <Descriptions.Item label={t('door.controller')}>{d.controllerOnline ? t('door.online') : t('door.offline')}</Descriptions.Item>
                <Descriptions.Item label={t('door.lastUnlock')}>{fmtDateTime(d.lastUnlockAt)}</Descriptions.Item>
              </Descriptions>
              <Space wrap>
                <Button size="small" icon={<UnlockOutlined />} onClick={() => run(d.roomCode!, 'unlock')}>{t('door.buttons.unlock')}</Button>
                <Button size="small" icon={<LockOutlined />} onClick={() => run(d.roomCode!, 'lock')}>{t('door.buttons.lock')}</Button>
                <Button size="small" danger icon={<ThunderboltOutlined />} onClick={() => run(d.roomCode!, 'force-open')}>{t('door.buttons.force-open')}</Button>
                <Button size="small" danger icon={<WarningOutlined />} onClick={() => run(d.roomCode!, 'sensor-error')}>{t('door.buttons.sensor-error')}</Button>
                <Button size="small" icon={<DisconnectOutlined />} onClick={() => run(d.roomCode!, 'offline')}>{t('door.buttons.offline')}</Button>
                <Button size="small" icon={<ApiOutlined />} onClick={() => run(d.roomCode!, 'online')}>{t('door.buttons.online')}</Button>
              </Space>
            </Card>
          </Col>
        ))}
        {(doors.data || []).length === 0 && <Col span={24}><Empty description={t('dashboard.noDoors')} /></Col>}
      </Row>
    </div>
  )
}
