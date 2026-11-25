import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/i18n/format'

// Kept for existing callers; the implementation lives in i18n/format.
export const fmtDateTime = formatDateTime

const DECISION_COLOR: Record<string, string> = {
  GRANTED: 'green',
  DENIED: 'red',
  ERROR: 'volcano',
}

const DECISION_LABEL_KEY: Record<string, string> = {
  GRANTED: 'decision.GRANTED',
  DENIED: 'decision.DENIED',
  ERROR: 'decision.ERROR',
}

// Protocol values (GRANTED, DENIED, ...) stay as-is; only their labels are translated.
export function DecisionTag({ decision }: { decision: string }) {
  const { t } = useTranslation()
  const label = DECISION_LABEL_KEY[decision] ? t(DECISION_LABEL_KEY[decision]) : decision
  return <Tag color={DECISION_COLOR[decision] || 'default'}>{label}</Tag>
}

const EVENT_LABEL_KEY: Record<string, string> = {
  ENTER: 'event.ENTER',
  EXIT: 'event.EXIT',
  DENIED: 'event.DENIED',
  SYSTEM_ERROR: 'event.SYSTEM_ERROR',
  HARDWARE_EVENT: 'event.HARDWARE_EVENT',
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
  const label = EVENT_LABEL_KEY[type] ? t(EVENT_LABEL_KEY[type]) : type
  return <Tag color={EVENT_COLOR[type] || 'default'}>{label}</Tag>
}

const DOOR_LABEL_KEY: Record<string, string> = {
  LOCKED: 'door.LOCKED',
  UNLOCKED: 'door.UNLOCKED',
  FORCED_OPEN: 'door.FORCED_OPEN',
  SENSOR_ERROR: 'door.SENSOR_ERROR',
  OFFLINE: 'door.OFFLINE',
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
  if (online === false) return <Tag color="magenta">{t('common.offline')}</Tag>
  const label = DOOR_LABEL_KEY[state] ? t(DOOR_LABEL_KEY[state]) : state
  return <Tag color={DOOR_COLOR[state] || 'default'}>{label}</Tag>
}
