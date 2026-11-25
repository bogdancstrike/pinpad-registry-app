import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { createRoom, deleteRoom, listRooms, updateRoom, type Room } from '@/api'
import { translateApiError } from '@/i18n/errors'

const { Title, Text } = Typography

export function RoomsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Partial<Room> | null>(null)
  const [form] = Form.useForm()

  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

  const save = useMutation({
    mutationFn: (values: Partial<Room> & { pin?: string }) =>
      editing?.id ? updateRoom(editing.id, values) : createRoom(values),
    onSuccess: () => {
      message.success(t('common.saved'))
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => { message.success(t('common.deleted')); qc.invalidateQueries({ queryKey: ['rooms'] }) },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const open = (r?: Room) => {
    setEditing(r || { active: true })
    form.resetFields()
    form.setFieldsValue(r || { active: true })
  }

  const columns: ColumnsType<Room> = [
    { title: t('common.code'), dataIndex: 'code', width: 150, render: (v) => <Tag>{v}</Tag> },
    { title: t('common.name'), dataIndex: 'name' },
    { title: t('common.description'), dataIndex: 'description', ellipsis: true },
    { title: t('common.active'), dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? t('common.yes') : t('common.no')}</Tag> },
    {
      title: t('common.actions'), width: 160, render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => open(r)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.deleteRoom')} onConfirm={() => remove.mutate(r.id)}>
            <Button size="small" danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{t('rooms.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>{t('rooms.new')}</Button>
      </Space>
      <Table rowKey="id" loading={rooms.isLoading} columns={columns} dataSource={rooms.data || []} />

      <Modal
        title={editing?.id ? t('rooms.edit') : t('rooms.new')}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="code" label={t('rooms.codeLabel')} rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} />
          </Form.Item>
          <Form.Item name="name" label={t('rooms.nameLabel')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label={t('rooms.descriptionLabel')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item
            name="pin"
            label={editing?.id ? t('rooms.pinNew') : t('rooms.pinCreate')}
            rules={editing?.id ? [] : [{ required: true, pattern: /^\d{4}$/, message: t('common.fourDigits') }]}
          >
            <Input maxLength={4} placeholder={t('rooms.pinPlaceholder')} />
          </Form.Item>
          <Form.Item name="active" label={t('rooms.activeLabel')} valuePropName="checked"><Switch /></Form.Item>
          <Text type="secondary">{t('common.pinHashed')}</Text>
        </Form>
      </Modal>
    </div>
  )
}
