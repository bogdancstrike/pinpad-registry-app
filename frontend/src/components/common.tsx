import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'

export { fmtDateTime } from '@/i18n/format'

const DECISION_COLOR: Record<string, string> = {
  GRANTED: 'green',
  DENIED: 'red',
  ERROR: 'volcano',
}

export function DecisionTag({ decision }: { decision: string }) {
  const { t } = useTranslation()
  return <Tag color={DECISION_COLOR[decision] || 'default'}>{t(`decision.${decision}`, { defaultValue: decision })}</Tag>
}

const EVENT_COLOR: Record<string, string> = {
  ENTER: 'blue',
  EXIT: 'geekblue',
  DENIED: 'red',
  SYSTEM_ERROR: 'volcano',
  HARDWARE_EVENT: 'orange',
}

export function EventTypeTag({ type }: { type: string }) {
  const { t } = useTranslation()
  return <Tag color={EVENT_COLOR[type] || 'default'}>{t(`eventType.${type}`, { defaultValue: type })}</Tag>
}

const DOOR_COLOR: Record<string, string> = {
  LOCKED: 'default',
  UNLOCKED: 'green',
  FORCED_OPEN: 'red',
  SENSOR_ERROR: 'volcano',
  OFFLINE: 'magenta',
}

export function DoorStateTag({ state, online }: { state: string; online?: boolean }) {
  const { t } = useTranslation()
  if (online === false) return <Tag color="magenta">{t('doorState.OFFLINE')}</Tag>
  return <Tag color={DOOR_COLOR[state] || 'default'}>{t(`doorState.${state}`, { defaultValue: state })}</Tag>
}
