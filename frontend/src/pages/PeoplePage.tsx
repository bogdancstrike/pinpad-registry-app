import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, App,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { createPerson, deletePerson, listPeople, updatePerson, type Person } from '@/api'
import { translateApiError } from '@/i18n/errors'

const { Title } = Typography

export function PeoplePage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState<Partial<Person> | null>(null)
  const [form] = Form.useForm()

  const people = useQuery({ queryKey: ['people'], queryFn: listPeople })

  const save = useMutation({
    mutationFn: (values: Partial<Person>) =>
      editing?.id ? updatePerson(editing.id, values) : createPerson(values),
    onSuccess: () => {
      message.success(t('common.saved'))
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['people'] })
    },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => { message.success(t('common.deleted')); qc.invalidateQueries({ queryKey: ['people'] }) },
    onError: (e) => message.error(translateApiError(e, t)),
  })

  const open = (p?: Person) => {
    setEditing(p || { active: true })
    form.setFieldsValue(p || { active: true })
  }

  const columns: ColumnsType<Person> = [
    { title: t('common.code'), dataIndex: 'personCode', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: t('common.name'), dataIndex: 'fullName' },
    { title: t('people.department'), dataIndex: 'department' },
    { title: t('people.role'), dataIndex: 'role' },
    { title: t('common.active'), dataIndex: 'active', width: 90, render: (a) => <Tag color={a ? 'green' : 'default'}>{a ? t('common.yes') : t('common.no')}</Tag> },
    {
      title: t('common.actions'), width: 160, render: (_, p) => (
        <Space>
          <Button size="small" onClick={() => open(p)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.deletePerson')} onConfirm={() => remove.mutate(p.id)}>
            <Button size="small" danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{t('people.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>{t('people.new')}</Button>
      </Space>
      <Table rowKey="id" loading={people.isLoading} columns={columns} dataSource={people.data || []} />

      <Modal
        title={editing?.id ? t('people.edit') : t('people.new')}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="personCode" label={t('people.codeLabel')} rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} maxLength={20} />
          </Form.Item>
          <Form.Item name="fullName" label={t('people.fullName')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="department" label={t('people.department')}><Input /></Form.Item>
          <Form.Item name="role" label={t('people.role')}><Input /></Form.Item>
          <Form.Item name="active" label={t('people.activeLabel')} valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
