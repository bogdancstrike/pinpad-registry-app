import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { createRoom, deleteRoom, listRooms, updateRoom, type Room } from '@/api'

const { Title, Text } = Typography

export function RoomsPage() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Partial<Room> | null>(null)
  const [form] = Form.useForm()

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

  const save = useMutation({
    mutationFn: (values: Partial<Room> & { pin?: string }) =>
      editing?.id ? updateRoom(editing.id, values) : createRoom(values),
    onSuccess: () => {
      message.success('Saved')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => { message.success('Deleted'); qc.invalidateQueries({ queryKey: ['rooms'] }) },
    onError: (e) => message.error((e as Error).message),
  })

  const open = (r?: Room) => {
    setEditing(r || { active: true })
    form.resetFields()
    form.setFieldsValue(r || { active: true })
  }

  const columns: ColumnsType<Room> = [
    { title: 'Code', dataIndex: 'code', width: 150, render: (v) => <Tag>{v}</Tag> },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Active', dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? 'yes' : 'no'}</Tag> },
    {
      title: 'Actions', width: 160, render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => open(r)}>Edit</Button>
          <Popconfirm title="Delete room?" onConfirm={() => remove.mutate(r.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Rooms</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>New room</Button>
      </Space>
      <Table rowKey="id" loading={rooms.isLoading} columns={columns} dataSource={rooms.data || []} />

      <Modal
        title={editing?.id ? 'Edit room' : 'New room'}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="code" label="Code (e.g. SERVER_ROOM)" rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item
            name="pin"
            label={editing?.id ? 'New PIN (leave blank to keep)' : 'Room PIN (4 digits)'}
            rules={editing?.id ? [] : [{ required: true, pattern: /^\d{4}$/, message: '4 digits' }]}
          >
            <Input maxLength={4} placeholder="1234" />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Text type="secondary">The PIN is hashed (bcrypt) before storage.</Text>
        </Form>
      </Modal>
    </div>
  )
}
