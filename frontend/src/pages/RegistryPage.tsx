import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Select, Space, Table, Tag, Typography, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { listEvents, type AccessEvent } from '@/api'
import { DecisionTag, EventTypeTag, fmtDateTime } from '@/components/common'

const { Title } = Typography

export function RegistryPage() {
  const [filters, setFilters] = useState<{ decision?: string; eventType?: string; roomCode?: string }>({})
  const [page, setPage] = useState(1)
  const size = 25

  const events = useQuery({
    queryKey: ['events', filters, page],
    queryFn: () => listEvents({ ...filters, page, size }),
  })

  const columns: ColumnsType<AccessEvent> = [
    { title: 'Time', dataIndex: 'createdAt', width: 180, render: (v) => fmtDateTime(v) },
    { title: 'Person', render: (_, e) => e.personName ? <span>{e.personName} <Tag>{e.personCode}</Tag></span> : '—' },
    { title: 'Room', dataIndex: 'roomName', render: (v, e) => v ? <span>{v} <Tag>{e.roomCode}</Tag></span> : '—' },
    { title: 'Event', dataIndex: 'eventType', width: 130, render: (v) => <EventTypeTag type={v} /> },
    { title: 'Decision', dataIndex: 'decision', width: 110, render: (v) => <DecisionTag decision={v} /> },
    { title: 'Reason', dataIndex: 'reason', render: (v) => v || '—' },
    { title: 'Code', dataIndex: 'rawCodeMasked', width: 110, render: (v) => <Typography.Text code>{v}</Typography.Text> },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Registry</Title>
        <Button icon={<ReloadOutlined />} onClick={() => events.refetch()} />
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Room code"
          allowClear
          style={{ width: 180 }}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, roomCode: e.target.value || undefined })) }}
        />
        <Select
          placeholder="Decision" allowClear style={{ width: 160 }}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, decision: v })) }}
          options={[{ value: 'GRANTED' }, { value: 'DENIED' }, { value: 'ERROR' }].map((o) => ({ ...o, label: o.value }))}
        />
        <Select
          placeholder="Event type" allowClear style={{ width: 180 }}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, eventType: v })) }}
          options={['ENTER', 'EXIT', 'DENIED', 'SYSTEM_ERROR'].map((v) => ({ value: v, label: v }))}
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
          showTotal: (t) => `Total ${t} events`,
        }}
      />
    </div>
  )
}
