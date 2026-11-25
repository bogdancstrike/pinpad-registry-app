import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Typography, theme as antTheme, Result, Space, Card, Tag, Divider, Spin } from 'antd'
import {
  DeleteOutlined, CheckOutlined, ArrowLeftOutlined, LogoutOutlined, HomeOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { submitAccessAttempt, getPinpadHints, type AccessResult } from '@/api'
import { translateApiError, translateReason } from '@/i18n/errors'

const { Text, Title, Paragraph } = Typography

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

type Screen = 'input' | 'inside' | 'result'

export function PinpadPage() {
  const { t } = useTranslation()
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { token } = antTheme.useToken()
  const qc = useQueryClient()

  const [code, setCode] = useState('')
  const [screen, setScreen] = useState<Screen>('input')
  const [result, setResult] = useState<AccessResult | null>(null)
  const [lastCode, setLastCode] = useState('')      // remembered so "exit" can re-submit
  const [submitting, setSubmitting] = useState(false)

  const hints = useQuery({
    queryKey: ['pinpad-hints', roomCode],
    queryFn: () => getPinpadHints(roomCode!),
    enabled: !!roomCode,
    refetchInterval: 5_000,      // keep the "currently inside" list fresh
  })

  const maxLen = 8
  const append = (d: string) => setCode((p) => (p.length < maxLen ? p + d : p))
  const clear = () => setCode('')

  const send = async (value: string) => {
    if (!roomCode || submitting || !value) return
    setSubmitting(true)
    try {
      const res = await submitAccessAttempt(roomCode, value)
      setResult(res)
      setLastCode(value)
      if (res.decision === 'GRANTED' && res.eventType === 'ENTER') setScreen('inside')
      else setScreen('result')
    } catch (e) {
      setResult({ decision: 'ERROR', eventType: 'SYSTEM_ERROR', message: translateApiError(e, t) })
      setScreen('result')
    } finally {
      setSubmitting(false)
      setCode('')
      // Presence may have changed → refresh the "currently inside" list.
      qc.invalidateQueries({ queryKey: ['pinpad-hints', roomCode] })
    }
  }

  const reset = () => { setScreen('input'); setResult(null); setCode('') }

  const tone =
    result?.decision === 'GRANTED' ? token.colorSuccess
    : result?.decision === 'DENIED' ? token.colorError
    : result?.decision === 'ERROR' ? token.colorWarning
    : token.colorBorder

  const keyBtn = (label: React.ReactNode, onClick: () => void, danger?: boolean, primary?: boolean) => (
    <Button size="large" danger={danger} type={primary ? 'primary' : 'default'}
            onClick={onClick} loading={primary && submitting} style={{ height: 64, fontSize: 24 }}>
      {label}
    </Button>
  )

  const frame = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16,
      background: token.colorBgLayout,
    }}>
      {children}
    </div>
  )

  // Decision labels: protocol value is kept in data; only the label is translated.
  const decisionLabel = (d?: string) =>
    d === 'GRANTED' ? t('pinpad.kiosk.decisionGranted')
    : d === 'DENIED' ? t('pinpad.kiosk.decisionDenied')
    : d === 'ERROR' ? t('pinpad.kiosk.decisionError')
    : d ?? ''

  // ── In-room screen: offer to exit ────────────────────────────────────────
  if (screen === 'inside') {
    return frame(
      <Card style={{ width: 380, textAlign: 'center' }}>
        <HomeOutlined style={{ fontSize: 48, color: token.colorSuccess }} />
        <Title level={3} style={{ marginTop: 12 }}>
          {t('pinpad.kiosk.inside', { room: result?.room?.name || roomCode })}
        </Title>
        <Paragraph type="secondary">
          {t('pinpad.kiosk.enteredRoom', { name: result?.person?.fullName })}
        </Paragraph>
        <Space style={{ marginTop: 8 }}>
          <Button size="large" type="primary" danger icon={<LogoutOutlined />}
                  loading={submitting} onClick={() => send(lastCode)}>
            {t('pinpad.kiosk.exitNow')}
          </Button>
          <Button size="large" onClick={reset}>{t('pinpad.kiosk.stay')}</Button>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
          {t('pinpad.kiosk.stayHint')}
        </Paragraph>
      </Card>,
    )
  }

  // ── Result screen (EXIT / DENIED / ERROR) ────────────────────────────────
  if (screen === 'result') {
    const left = result?.decision === 'GRANTED' && result?.eventType === 'EXIT'
    return frame(
      <Card style={{ width: 380 }}>
        <Result
          status={result?.decision === 'GRANTED' ? 'success' : result?.decision === 'DENIED' ? 'error' : 'warning'}
          title={left ? t('pinpad.kiosk.left', { room: result?.room?.name || roomCode })
                : result?.decision === 'GRANTED' ? t('pinpad.kiosk.granted', { event: result?.eventType })
                : decisionLabel(result?.decision)}
          subTitle={
            <>
              <div>{result?.message}</div>
              {result?.reason && <Text type="secondary">{t('common.reason', { reason: translateReason(result.reason, t) })}</Text>}
            </>
          }
          extra={<Button type="primary" onClick={reset}>{t('pinpad.kiosk.backToKeypad')}</Button>}
        />
      </Card>,
    )
  }

  // ── Input screen (keypad + demo cheat-sheet) ─────────────────────────────
  return frame(
    <>
      <div style={{
        width: 360, background: token.colorBgContainer, borderRadius: 16,
        border: `1px solid ${token.colorBorder}`, padding: 24, boxShadow: token.boxShadow,
      }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/pinpad')}>{t('common.exit')}</Button>
          <Text type="secondary">{t('app.doorTerminal')}</Text>
        </Space>
        <Title level={3} style={{ textAlign: 'center', margin: '4px 0 16px' }}>
          {hints.data?.roomName || roomCode}
        </Title>

        <div style={{
          height: 56, border: `2px solid ${tone}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, letterSpacing: 8, marginBottom: 16, fontFamily: 'monospace',
        }}>
          {code ? '•'.repeat(code.length)
                : <Text type="secondary" style={{ fontSize: 16, letterSpacing: 0 }}>{t('common.enterCode')}</Text>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {KEYS.map((d) => keyBtn(d, () => append(d)))}
          {keyBtn(<DeleteOutlined />, clear, true)}
          {keyBtn('0', () => append('0'))}
          {keyBtn(<CheckOutlined />, () => send(code), false, true)}
        </div>
      </div>

      {/* Currently inside — lets a "stayed" person exit directly */}
      {(hints.data?.inside || []).length > 0 && (
        <Card size="small" style={{ width: 360 }}
              title={<Space><HomeOutlined />{t('pinpad.kiosk.currentlyInside')}</Space>}>
          <Text type="secondary">{t('common.tapToExit')}</Text>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(hints.data?.inside || []).map((p) => (
              <Button key={p.personCode} block danger icon={<LogoutOutlined />}
                      loading={submitting}
                      disabled={!hints.data?.pin}
                      onClick={() => send(`${hints.data?.pin ?? ''}${p.personCode}`)}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span>{p.fullName} <Tag>{p.personCode}</Tag></span>
                  <span>{t('common.exit')}</span>
                </Space>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Demo cheat-sheet — PoC only */}
      <Card size="small" style={{ width: 360 }} title={<Space><span>🧪</span>{t('pinpad.kiosk.demoCodes')}</Space>}>
        {hints.isLoading ? <Spin /> : (
          <>
            <Space>
              <Text type="secondary">{t('common.roomPin')}</Text>
              <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 14 }}>
                {hints.data?.pin ?? '—'}
              </Tag>
            </Space>
            <Divider style={{ margin: '10px 0' }} />
            <Text type="secondary">{t('common.tapToFill')}</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(hints.data?.people || []).map((p) => {
                const full = `${hints.data?.pin ?? ''}${p.personCode}`
                return (
                  <Button key={p.personCode} block onClick={() => setCode(full)}
                          disabled={!p.active || !hints.data?.pin}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span>{p.fullName} <Tag>{p.personCode}</Tag></span>
                      <Text code>{full}</Text>
                    </Space>
                  </Button>
                )
              })}
              {(hints.data?.people || []).length === 0 &&
                <Text type="secondary">{t('common.noPermissionYet')}</Text>}
            </div>
          </>
        )}
      </Card>
    </>,
  )
}
