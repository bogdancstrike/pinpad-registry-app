import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Form, Modal, Popconfirm, Select, Space, Table, Tag, Typography, App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import {
  createPermission, deletePermission, listPeople, listPermissions, listRooms,
  type Permission,
} from '@/api'
import { fmtDateTime } from '@/components/common'

const { Title } = Typography

export function PermissionsPage() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const permissions = useQuery({ queryKey: ['permissions'], queryFn: listPermissions })
  const people = useQuery({ queryKey: ['people'], queryFn: listPeople })
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

  const save = useMutation({
    mutationFn: (v: { personId: string; roomId: string }) => createPermission(v),
    onSuccess: () => {
      message.success('Permission granted')
      setOpen(false)
      form.resetFields()
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePermission(id),
    onSuccess: () => { message.success('Revoked'); qc.invalidateQueries({ queryKey: ['permissions'] }) },
    onError: (e) => message.error((e as Error).message),
  })

  const columns: ColumnsType<Permission> = [
    { title: 'Person', render: (_, p) => <span>{p.personName} <Tag>{p.personCode}</Tag></span> },
    { title: 'Room', render: (_, p) => <span>{p.roomName} <Tag>{p.roomCode}</Tag></span> },
    { title: 'Valid From', dataIndex: 'validFrom', render: (v) => fmtDateTime(v) },
    { title: 'Valid Until', dataIndex: 'validUntil', render: (v) => fmtDateTime(v) },
    { title: 'Active', dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? 'yes' : 'no'}</Tag> },
    {
      title: 'Actions', width: 120, render: (_, p) => (
        <Popconfirm title="Revoke permission?" onConfirm={() => remove.mutate(p.id)}>
          <Button size="small" danger>Revoke</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Permissions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Grant access</Button>
      </Space>
      <Table rowKey="id" loading={permissions.isLoading} columns={columns} dataSource={permissions.data || []} />

      <Modal
        title="Grant access"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="personId" label="Person" rules={[{ required: true }]}>
            <Select
              showSearch optionFilterProp="label"
              options={(people.data || []).map((p) => ({ value: p.id, label: `${p.fullName} (${p.personCode})` }))}
            />
          </Form.Item>
          <Form.Item name="roomId" label="Room" rules={[{ required: true }]}>
            <Select
              showSearch optionFilterProp="label"
              options={(rooms.data || []).map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
