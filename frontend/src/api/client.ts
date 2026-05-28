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
    const msg = data?.message || data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  },
)

export const API_BASE = BASE_URL
