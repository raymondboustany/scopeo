import type {
  Answers,
  EntityProfile,
  EntityRecord,
  EntitySummary,
  PublicSnapshot,
  Revision,
  UserProfile,
  UserRole,
} from '@/types/domain'

/**
 * Client de l'API locale.
 *
 * Toutes les routes passent par `/api` : en développement, Vite les relaie
 * vers FastAPI ; une fois compilée, l'application est servie par FastAPI
 * lui-même, sur la même origine.
 */

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, "Le serveur local ne répond pas. Vérifiez qu'il est démarré (npm run dev).")
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = typeof body.detail === 'string' ? body.detail : detail
    } catch {
      /* corps non JSON : on garde le libellé HTTP */
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

const json = (body: unknown) => JSON.stringify(body)

export interface UserInput {
  name: string
  role: UserRole
  organisation?: string
  email?: string
  is_guest?: boolean
}

export type EntityPatch = Partial<
  Pick<
    EntityRecord,
    | 'name'
    | 'scope_note'
    | 'answers'
    | 'coverage'
    | 'measures'
    | 'weights'
    | 'contacts'
    | 'seen_alerts'
    | 'profile'
    | 'notes'
    | 'public_snapshot'
  >
>

export interface PublicView {
  name: string
  is_demo: boolean
  updated_at: string
  snapshot: PublicSnapshot | null
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  users: () => request<UserProfile[]>('/users'),
  user: (id: string) => request<UserProfile>(`/users/${id}`),
  createUser: (input: UserInput) => request<UserProfile>('/users', { method: 'POST', body: json(input) }),
  updateUser: (id: string, patch: Partial<UserInput & { onboarded: boolean }>) =>
    request<UserProfile>(`/users/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  entities: (userId: string) => request<EntitySummary[]>(`/users/${userId}/entities`),
  entity: (id: string) => request<EntityRecord>(`/entities/${id}`),
  createEntity: (userId: string, input: { name: string; scope_note?: string; answers?: Answers; profile?: EntityProfile }) =>
    request<EntityRecord>(`/users/${userId}/entities`, { method: 'POST', body: json(input) }),
  copyDemo: (userId: string) => request<EntityRecord>(`/users/${userId}/entities/from-demo`, { method: 'POST' }),
  updateEntity: (id: string, patch: EntityPatch) =>
    request<EntityRecord>(`/entities/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteEntity: (id: string) => request<void>(`/entities/${id}`, { method: 'DELETE' }),
  revisions: (id: string) => request<Revision[]>(`/entities/${id}/revisions`),
  share: (id: string, enabled: boolean, rotate = false) =>
    request<EntityRecord>(`/entities/${id}/share`, { method: 'PUT', body: json({ enabled, rotate }) }),

  publicView: (token: string) => request<PublicView>(`/public/${encodeURIComponent(token)}`),
}

export const DEMO_ENTITY_ID = 'demo-finexa'
