import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { createPerson, deletePerson, listPeople, updatePerson, type Person } from '@/api'

const { Title } = Typography

export function PeoplePage() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Partial<Person> | null>(null)
  const [form] = Form.useForm()

  const people = useQuery({ queryKey: ['people'], queryFn: listPeople })

  const save = useMutation({
    mutationFn: (values: Partial<Person>) =>
      editing?.id ? updatePerson(editing.id, values) : createPerson(values),
    onSuccess: () => {
      message.success('Saved')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['people'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => { message.success('Deleted'); qc.invalidateQueries({ queryKey: ['people'] }) },
    onError: (e) => message.error((e as Error).message),
  })

  const open = (p?: Person) => {
    setEditing(p || { active: true })
    form.setFieldsValue(p || { active: true })
  }

  const columns: ColumnsType<Person> = [
    { title: 'Code', dataIndex: 'personCode', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: 'Full Name', dataIndex: 'fullName' },
    { title: 'Department', dataIndex: 'department' },
    { title: 'Role', dataIndex: 'role' },
    { title: 'Active', dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? 'yes' : 'no'}</Tag> },
    {
      title: 'Actions', width: 160, render: (_, p) => (
        <Space>
          <Button size="small" onClick={() => open(p)}>Edit</Button>
          <Popconfirm title="Delete person?" onConfirm={() => remove.mutate(p.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>People</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>New person</Button>
      </Space>
      <Table rowKey="id" loading={people.isLoading} columns={columns} dataSource={people.data || []} />

      <Modal
        title={editing?.id ? 'Edit person' : 'New person'}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="personCode" label="Person code (e.g. 0023)" rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} maxLength={20} />
          </Form.Item>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="department" label="Department"><Input /></Form.Item>
          <Form.Item name="role" label="Role"><Input /></Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
