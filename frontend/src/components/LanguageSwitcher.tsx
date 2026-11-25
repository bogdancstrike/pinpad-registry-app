import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES } from '@/i18n/config'
import { setLocale } from '@/i18n'

// Language choice. Calls i18n.changeLanguage (no reload) and stores the choice.
export function LanguageSwitcher({ style }: { style?: React.CSSProperties }) {
  const { t, i18n } = useTranslation()
  return (
    <Select
      aria-label={t('lang.label')}
      value={i18n.language}
      onChange={(code: string) => { void setLocale(code) }}
      suffixIcon={<GlobalOutlined />}
      style={{ minWidth: 120, ...style }}
      options={SUPPORTED_LOCALES.map((l) => ({ value: l.code, label: l.label }))}
    />
  )
}
