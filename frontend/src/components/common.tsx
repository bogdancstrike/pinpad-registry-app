import { Tag } from 'antd'
import dayjs from 'dayjs'

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—'
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

const DECISION_COLOR: Record<string, string> = {
  GRANTED: 'green',
  DENIED: 'red',
  ERROR: 'volcano',
}

export function DecisionTag({ decision }: { decision: string }) {
  return <Tag color={DECISION_COLOR[decision] || 'default'}>{decision}</Tag>
}

const EVENT_COLOR: Record<string, string> = {
  ENTER: 'blue',
  EXIT: 'geekblue',
  DENIED: 'red',
  SYSTEM_ERROR: 'volcano',
  HARDWARE_EVENT: 'orange',
}

export function EventTypeTag({ type }: { type: string }) {
  return <Tag color={EVENT_COLOR[type] || 'default'}>{type}</Tag>
}

const DOOR_COLOR: Record<string, string> = {
  LOCKED: 'default',
  UNLOCKED: 'green',
  FORCED_OPEN: 'red',
  SENSOR_ERROR: 'volcano',
  OFFLINE: 'magenta',
}

export function DoorStateTag({ state, online }: { state: string; online?: boolean }) {
  if (online === false) return <Tag color="magenta">OFFLINE</Tag>
  return <Tag color={DOOR_COLOR[state] || 'default'}>{state}</Tag>
}
