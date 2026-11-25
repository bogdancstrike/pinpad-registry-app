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
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/i18n/format'
import { translateApiError } from '@/i18n/errors'

const { Title } = Typography

export function PermissionsPage() {
  const { t } = useTranslation()
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
      message.success(t('common.permissionGranted'))
      setOpen(false)
      form.resetFields()
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePermission(id),
    onSuccess: () => { message.success(t('common.revoked')); qc.invalidateQueries({ queryKey: ['permissions'] }) },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const columns: ColumnsType<Permission> = [
    { title: t('common.person'), render: (_, p) => <span>{p.personName} <Tag>{p.personCode}</Tag></span> },
    { title: t('common.room'), render: (_, p) => <span>{p.roomName} <Tag>{p.roomCode}</Tag></span> },
    { title: t('permissions.validFrom'), dataIndex: 'validFrom', render: (v) => formatDateTime(v) },
    { title: t('permissions.validUntil'), dataIndex: 'validUntil', render: (v) => formatDateTime(v) },
    { title: t('common.active'), dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? t('common.yes') : t('common.no')}</Tag> },
    {
      title: t('common.actions'), width: 120, render: (_, p) => (
        <Popconfirm title={t('common.revokePermission')} onConfirm={() => remove.mutate(p.id)}>
          <Button size="small" danger>{t('common.revoke')}</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{t('permissions.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('permissions.grant')}</Button>
      </Space>
      <Table rowKey="id" loading={permissions.isLoading} columns={columns} dataSource={permissions.data || []} />

      <Modal
        title={t('permissions.grantTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="personId" label={t('permissions.personLabel')} rules={[{ required: true }]}>
            <Select
              showSearch optionFilterProp="label"
              options={(people.data || []).map((p) => ({ value: p.id, label: `${p.fullName} (${p.personCode})` }))}
            />
          </Form.Item>
          <Form.Item name="roomId" label={t('permissions.roomLabel')} rules={[{ required: true }]}>
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
