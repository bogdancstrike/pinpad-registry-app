import axios from 'axios'

// Backend routes are namespaced under /pinpad (QF Framework). In dev, Vite
// proxies /pinpad to the backend; in prod, nginx does.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/pinpad'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err.response?.data
    // Keep the API code and reason so the UI can translate them. The English
    // message is kept for logs only and is not shown to the user.
    const error = Object.assign(new Error(data?.message || err.message || 'Request failed'), {
      code: typeof data?.error === 'string' ? data.error : undefined,
      reason: typeof data?.details?.reason === 'string' ? data.details.reason : undefined,
    })
    return Promise.reject(error)
  },
)

export const API_BASE = BASE_URL
