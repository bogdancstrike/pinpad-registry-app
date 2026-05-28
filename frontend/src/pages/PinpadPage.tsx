import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, theme as antTheme, Result, Space } from 'antd'
import { DeleteOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { submitAccessAttempt, type AccessResult } from '@/api'

const { Text, Title } = Typography

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinpadPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { token } = antTheme.useToken()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<AccessResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const maxLen = 8

  const append = (d: string) => {
    setResult(null)
    setCode((prev) => (prev.length < maxLen ? prev + d : prev))
  }
  const clear = () => { setCode(''); setResult(null) }

  const submit = async () => {
    if (!roomCode || submitting) return
    setSubmitting(true)
    try {
      const res = await submitAccessAttempt(roomCode, code)
      setResult(res)
    } catch (e) {
      setResult({ decision: 'ERROR', eventType: 'SYSTEM_ERROR', message: (e as Error).message })
    } finally {
      setSubmitting(false)
      setCode('')
    }
  }

  const tone =
    result?.decision === 'GRANTED' ? token.colorSuccess
    : result?.decision === 'DENIED' ? token.colorError
    : result?.decision === 'ERROR' ? token.colorWarning
    : token.colorBorder

  const keyBtn = (label: React.ReactNode, onClick: () => void, danger?: boolean, primary?: boolean) => (
    <Button
      size="large"
      danger={danger}
      type={primary ? 'primary' : 'default'}
      onClick={onClick}
      style={{ height: 64, fontSize: 24 }}
    >
      {label}
    </Button>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: token.colorBgLayout,
    }}>
      <div style={{
        width: 360, background: token.colorBgContainer, borderRadius: 16,
        border: `1px solid ${token.colorBorder}`, padding: 24,
        boxShadow: token.boxShadow,
      }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/pinpad')}>
            Exit
          </Button>
          <Text type="secondary">DOOR TERMINAL</Text>
        </Space>
        <Title level={3} style={{ textAlign: 'center', margin: '4px 0 16px' }}>{roomCode}</Title>

        <div style={{
          height: 56, border: `2px solid ${tone}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, letterSpacing: 8, marginBottom: 16, fontFamily: 'monospace',
        }}>
          {code ? '•'.repeat(code.length) : <Text type="secondary" style={{ fontSize: 16, letterSpacing: 0 }}>enter code</Text>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {KEYS.map((d) => keyBtn(d, () => append(d)))}
          {keyBtn(<DeleteOutlined />, clear, true)}
          {keyBtn('0', () => append('0'))}
          {keyBtn(<CheckOutlined />, submit, false, true)}
        </div>

        {result && (
          <div style={{ marginTop: 20 }}>
            <Result
              status={result.decision === 'GRANTED' ? 'success' : result.decision === 'DENIED' ? 'error' : 'warning'}
              title={result.decision === 'GRANTED' ? `Access granted · ${result.eventType}` : result.decision}
              subTitle={
                <>
                  <div>{result.message}</div>
                  {result.person && <div>{result.person.fullName}</div>}
                  {result.reason && <Text type="secondary">Reason: {result.reason}</Text>}
                </>
              }
              style={{ padding: 0 }}
            />
          </div>
        )}
      </div>
      <Text type="secondary" style={{ marginTop: 16 }}>
        Composed code = room PIN + person code (e.g. 1234 + 0023)
      </Text>
    </div>
  )
}
