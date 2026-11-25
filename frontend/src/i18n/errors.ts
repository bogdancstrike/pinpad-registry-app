// Maps API error codes (error code, or details.reason) to translated text.
// The API message is English and is never shown: unknown codes get a generic message.
export type Translate = (key: string) => string

export interface ApiErrorLike {
  code?: string
  reason?: string
}

const KNOWN_CODES = new Set([
  'validation_error', 'not_found', 'conflict', 'hardware_error', 'internal_error',
])

export function translateApiError(err: unknown, t: Translate): string {
  const { code, reason } = (err ?? {}) as ApiErrorLike
  if (reason) return t(`reason.${reason}`)
  if (code && KNOWN_CODES.has(code)) return t(`errors.${code}`)
  return t('errors.unknown')
}
