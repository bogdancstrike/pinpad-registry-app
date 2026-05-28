import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────────
export interface Person {
  id: string
  personCode: string
  fullName: string
  department?: string | null
  role?: string | null
  active: boolean
  createdAt?: string
}

export interface Room {
  id: string
  code: string
  name: string
  description?: string | null
  active: boolean
  createdAt?: string
}

export interface Permission {
  id: string
  personId: string
  roomId: string
  personCode: string
  personName: string
  roomCode: string
  roomName: string
  validFrom?: string | null
  validUntil?: string | null
  active: boolean
}

export interface Door {
  roomId: string
  roomCode?: string
  roomName?: string
  state: string
  locked: boolean
  doorOpen: boolean
  controllerOnline: boolean
  lastUnlockAt?: string | null
  lastLockAt?: string | null
}

export interface AccessEvent {
  id: string
  createdAt: string
  eventType: string
  decision: string
  reason?: string | null
  rawCodeMasked?: string | null
  personCode?: string | null
  personName?: string | null
  roomCode?: string | null
  roomName?: string | null
  doorStateBefore?: Door | null
  doorStateAfter?: Door | null
}

export interface AccessResult {
  decision: 'GRANTED' | 'DENIED' | 'ERROR'
  eventType: string
  message: string
  reason?: string
  person?: { code: string; fullName: string }
  room?: { code: string; name: string }
  door?: Door
  eventId?: string
}

export interface MonitoringSummary {
  totalRooms: number
  activePeople: number
  currentlyInside: number
  grantedToday: number
  deniedToday: number
  doorsOffline: number
}

export interface Occupant {
  personCode: string
  personName: string
  roomCode: string
  roomName: string
  enteredAt: string | null
}

interface ListResponse<T> { items: T[] }
interface PagedResponse<T> { items: T[]; total: number; page: number; size: number }

export interface PinpadHints {
  roomCode: string
  roomName: string
  active: boolean
  pin: string | null
  people: { personCode: string; fullName: string; active: boolean }[]
  inside: { personCode: string; fullName: string; enteredAt: string | null }[]
}

// ── Access ─────────────────────────────────────────────────────────────────
export const submitAccessAttempt = (roomCode: string, enteredCode: string) =>
  apiClient.post<AccessResult>('/api/access/attempt', { roomCode, enteredCode }).then((r) => r.data)

export const getPinpadHints = (roomCode: string) =>
  apiClient.get<PinpadHints>(`/api/pinpad/${roomCode}/hints`).then((r) => r.data)

// ── People ───────────────────────────────────────────────────────────────
export const listPeople = () =>
  apiClient.get<ListResponse<Person>>('/api/people').then((r) => r.data.items)
export const createPerson = (body: Partial<Person>) =>
  apiClient.post<Person>('/api/people', body).then((r) => r.data)
export const updatePerson = (id: string, body: Partial<Person>) =>
  apiClient.put<Person>(`/api/people/${id}`, body).then((r) => r.data)
export const deletePerson = (id: string) =>
  apiClient.delete(`/api/people/${id}`).then((r) => r.data)

// ── Rooms ──────────────────────────────────────────────────────────────────
export const listRooms = () =>
  apiClient.get<ListResponse<Room>>('/api/rooms').then((r) => r.data.items)
export const createRoom = (body: Partial<Room> & { pin?: string }) =>
  apiClient.post<Room>('/api/rooms', body).then((r) => r.data)
export const updateRoom = (id: string, body: Partial<Room> & { pin?: string }) =>
  apiClient.put<Room>(`/api/rooms/${id}`, body).then((r) => r.data)
export const deleteRoom = (id: string) =>
  apiClient.delete(`/api/rooms/${id}`).then((r) => r.data)

// ── Permissions ────────────────────────────────────────────────────────────
export const listPermissions = () =>
  apiClient.get<ListResponse<Permission>>('/api/permissions').then((r) => r.data.items)
export const createPermission = (body: { personId: string; roomId: string; validFrom?: string | null; validUntil?: string | null }) =>
  apiClient.post<Permission>('/api/permissions', body).then((r) => r.data)
export const deletePermission = (id: string) =>
  apiClient.delete(`/api/permissions/${id}`).then((r) => r.data)

// ── Registry ───────────────────────────────────────────────────────────────
export const listEvents = (params: Record<string, string | number | undefined>) =>
  apiClient.get<PagedResponse<AccessEvent>>('/api/registry/events', { params }).then((r) => r.data)

// ── Hardware ─────────────────────────────────────────────────────────────
export const listDoors = () =>
  apiClient.get<ListResponse<Door>>('/api/mock-hardware/doors').then((r) => r.data.items)
export const doorAction = (roomCode: string, action: string) =>
  apiClient.post<Door>(`/api/mock-hardware/doors/${roomCode}/${action}`).then((r) => r.data)

// ── Monitoring ─────────────────────────────────────────────────────────────
export const getSummary = () =>
  apiClient.get<MonitoringSummary>('/api/monitoring/summary').then((r) => r.data)
export const getMonitoringDoors = () =>
  apiClient.get<ListResponse<Door>>('/api/monitoring/doors').then((r) => r.data.items)
export const getOccupancy = () =>
  apiClient.get<ListResponse<Occupant>>('/api/monitoring/occupancy').then((r) => r.data.items)
export const getDeniedEvents = () =>
  apiClient.get<ListResponse<AccessEvent>>('/api/monitoring/denied-events').then((r) => r.data.items)
