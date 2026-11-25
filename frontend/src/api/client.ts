import axios from 'axios'

// Backend routes are namespaced under /pinpad (QF Framework). In dev, Vite
// proxies /pinpad to the backend; in prod, nginx does.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/pinpad'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

/** API failure. `code` is the backend error code (e.g. "not_found"); `message` is the English fallback. */
export class ApiError extends Error {
  code?: string
  status?: number
  networkFailure: boolean
  constructor(message: string, opts: { code?: string; status?: number; networkFailure: boolean }) {
    super(message)
    this.name = 'ApiError'
    this.code = opts.code
    this.status = opts.status
    this.networkFailure = opts.networkFailure
  }
}

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err.response?.data
    const msg = data?.message || data?.error || err.message || 'Request failed'
    return Promise.reject(new ApiError(msg, {
      code: typeof data?.error === 'string' ? data.error : undefined,
      status: err.response?.status,
      networkFailure: !err.response,
    }))
  },
)

export const API_BASE = BASE_URL
