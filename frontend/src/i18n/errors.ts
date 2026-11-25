import i18n from './index'

/**
 * Text for an error thrown by the API layer, in the current language. The
 * backend's English `message` is not shown; the stable `code` is mapped here.
 */
export function translateError(e: unknown): string {
  const err = e as { code?: string; networkFailure?: boolean } | undefined
  if (err?.networkFailure) return i18n.t('errors.network')
  const code = err?.code
  if (code && i18n.exists(`errors.${code}`)) return i18n.t(`errors.${code}`)
  return i18n.t('errors.generic')
}
