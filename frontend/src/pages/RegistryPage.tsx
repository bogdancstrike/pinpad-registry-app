import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Select, Space, Table, Tag, Typography, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { listEvents, type AccessEvent } from '@/api'
import { DecisionTag, EventTypeTag, fmtDateTime } from '@/components/common'
import { useTranslation } from 'react-i18next'

const { Title } = Typography

export function RegistryPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<{ decision?: string; eventType?: string; roomCode?: string }>({})
  const [page, setPage] = useState(1)
  const size = 25

  const events = useQuery({
    queryKey: ['events', filters, page],
    queryFn: () => listEvents({ ...filters, page, size }),
  })

  const columns: ColumnsType<AccessEvent> = [
    { title: t('common.time'), dataIndex: 'createdAt', width: 180, render: (v) => fmtDateTime(v) },
    { title: t('common.person'), render: (_, e) => e.personName ? <span>{e.personName} <Tag>{e.personCode}</Tag></span> : '—' },
    { title: t('common.room'), dataIndex: 'roomName', render: (v, e) => v ? <span>{v} <Tag>{e.roomCode}</Tag></span> : '—' },
    { title: t('registry.event'), dataIndex: 'eventType', width: 130, render: (v) => <EventTypeTag type={v} /> },
    { title: t('common.decision'), dataIndex: 'decision', width: 110, render: (v) => <DecisionTag decision={v} /> },
    { title: t('common.reason'), dataIndex: 'reason', render: (v) => v || '—' },
    { title: t('registry.codeColumn'), dataIndex: 'rawCodeMasked', width: 110, render: (v) => <Typography.Text code>{v}</Typography.Text> },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{t('registry.title')}</Title>
        <Button icon={<ReloadOutlined />} onClick={() => events.refetch()} />
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('registry.roomCode')}
          allowClear
          style={{ width: 180 }}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, roomCode: e.target.value || undefined })) }}
        />
        <Select
          placeholder={t('common.decision')} allowClear style={{ width: 160 }}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, decision: v })) }}
          options={['GRANTED', 'DENIED', 'ERROR'].map((v) => ({ value: v, label: t(`decision.${v}`) }))}
        />
        <Select
          placeholder={t('registry.eventType')} allowClear style={{ width: 180 }}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, eventType: v })) }}
          options={['ENTER', 'EXIT', 'DENIED', 'SYSTEM_ERROR'].map((v) => ({ value: v, label: t(`eventType.${v}`) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={events.isLoading}
        columns={columns}
        dataSource={events.data?.items || []}
        pagination={{
          current: page,
          pageSize: size,
          total: events.data?.total || 0,
          onChange: setPage,
          showTotal: (count: number) => t('registry.total', { count }),
        }}
      />
    </div>
  )
}
