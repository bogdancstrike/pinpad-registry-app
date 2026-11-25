import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n/languages'
import { setLanguage } from '@/i18n'

export function LanguageSwitcher({ size }: { size?: 'small' | 'middle' }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language
  return (
    <Select
      size={size}
      aria-label={t('language.label')}
      title={t('language.label')}
      value={current}
      onChange={(code: string) => setLanguage(code)}
      suffixIcon={<GlobalOutlined />}
      style={{ minWidth: 120 }}
      options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
      data-testid="language-switcher"
    />
  )
}
