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
import { LANG, tr } from '@/i18n'
import { englishDemoFields, localizeDemo, localizeDemoSummary } from '@/i18n/demo'

/**
 * Client de l'API locale.
 *
 * Toutes les routes passent par `/api` : en développement, Vite les relaie
 * vers FastAPI ; une fois compilée, l'application est servie par FastAPI
 * lui-même, sur la même origine. La session est portée par un cookie
 * `HttpOnly`, invisible du code de la page.
 */

/** Codes d'erreur du serveur, traduits pour l'interface. */
const ERROR_MESSAGES: Record<string, () => string> = {
  unauthenticated: () => tr('Session expirée : reconnectez-vous.', 'Session expired: please sign in again.'),
  invalid_credentials: () => tr('Nom de profil ou mot de passe incorrect.', 'Incorrect profile name or password.'),
  too_many_attempts: () =>
    tr('Trop de tentatives. Réessayez dans quelques minutes.', 'Too many attempts. Please try again in a few minutes.'),
  password_setup_required: () =>
    tr('Ce profil doit définir un mot de passe.', 'This profile needs to set a password.'),
  password_mismatch: () => tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.'),
  password_too_short: () =>
    tr('Le mot de passe doit comporter au moins 10 caractères.', 'The password must be at least 10 characters long.'),
  password_too_long: () =>
    tr('Le mot de passe dépasse la longueur autorisée (72 octets).', 'The password exceeds the maximum length (72 bytes).'),
  name_taken: () => tr('Un profil porte déjà ce nom.', 'A profile with this name already exists.'),
  name_required: () => tr('Le nom du profil est requis.', 'A profile name is required.'),
  not_found: () => tr('Élément introuvable.', 'Item not found.'),
  demo_read_only: () =>
    tr("L'entité de démonstration est en lecture seule.", 'The demo entity is read-only.'),
  guest_forbidden: () => tr('Action indisponible en mode invité.', 'Not available in guest mode.'),
  link_inactive: () => tr("Ce lien n'est pas ou plus actif.", 'This link is not or no longer active.'),
  csrf: () => tr('Requête refusée par le serveur.', 'Request refused by the server.'),
  unsupported_file: () =>
    tr('Format de fichier non pris en charge.', 'Unsupported file format.'),
  file_too_large: () => tr('Fichier trop volumineux (5 Mo au plus).', 'File too large (5 MB maximum).'),
  empty_file: () => tr('Le fichier est vide.', 'The file is empty.'),
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string) {
    super(ERROR_MESSAGES[code]?.() ?? code)
    this.status = status
    this.code = code
  }
}

/** Appelée lorsqu'une session a expiré, pour revenir à l'écran de connexion. */
let onUnauthenticated: (() => void) | null = null
export function setUnauthenticatedHandler(handler: () => void) {
  onUnauthenticated = handler
}

async function request<T>(path: string, init?: RequestInit & { raw?: boolean }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }),
        'X-Scopeo': '1',
        'Accept-Language': LANG,
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(0, tr("Le serveur local ne répond pas. Vérifiez qu'il est démarré.", 'The local server is not responding. Check that it is running.'))
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let code = res.statusText
    try {
      const body = await res.json()
      code = typeof body.detail === 'string' ? body.detail : code
    } catch {
      /* corps non JSON : on garde le libellé HTTP */
    }
    if (res.status === 401 && code === 'unauthenticated') onUnauthenticated?.()
    throw new ApiError(res.status, code)
  }
  if (init?.raw) return (await res.blob()) as T
  return (await res.json()) as T
}

const json = (body: unknown) => JSON.stringify(body)

export interface RegisterInput {
  name: string
  role: UserRole
  organisation?: string
  email?: string
  password: string
  password_confirm: string
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
    | 'iso_controls'
  >
>

export interface PublicView {
  name: string
  is_demo: boolean
  updated_at: string
  snapshot: PublicSnapshot | null
}

export interface StoredFile {
  id: string
  name: string
  content_type: string
  size: number
  created_at: string
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  // Authentification
  me: () => request<UserProfile>('/auth/me'),
  register: (input: RegisterInput) => request<UserProfile>('/auth/register', { method: 'POST', body: json(input) }),
  login: (name: string, password: string) => request<UserProfile>('/auth/login', { method: 'POST', body: json({ name, password }) }),
  setupPassword: (name: string, password: string, password_confirm: string) =>
    request<UserProfile>('/auth/setup-password', { method: 'POST', body: json({ name, password, password_confirm }) }),
  guest: () => request<UserProfile>('/auth/guest', { method: 'POST' }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (current: string, password: string, password_confirm: string) =>
    request<void>('/auth/password', { method: 'POST', body: json({ current, password, password_confirm }) }),

  // Profil
  user: (id: string) => request<UserProfile>(`/users/${id}`),
  updateUser: (id: string, patch: Partial<{ name: string; role: UserRole; organisation: string; email: string; onboarded: boolean }>) =>
    request<UserProfile>(`/users/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteUser: (id: string, password?: string) => request<void>(`/users/${id}`, { method: 'DELETE', body: json({ password: password ?? null }) }),

  // Entités
  entities: (userId: string) => request<EntitySummary[]>(`/users/${userId}/entities`).then((l) => l.map(localizeDemoSummary)),
  entity: (id: string) => request<EntityRecord>(`/entities/${id}`).then(localizeDemo),
  createEntity: (userId: string, input: { name: string; scope_note?: string; answers?: Answers; profile?: EntityProfile }) =>
    request<EntityRecord>(`/users/${userId}/entities`, { method: 'POST', body: json(input) }),
  copyDemo: async (userId: string) => {
    const copy = await request<EntityRecord>(`/users/${userId}/entities/from-demo`, { method: 'POST' })
    // La copie hérite de la langue de l'interface, pas de celle de la démonstration.
    return LANG === 'en' ? api.updateEntity(copy.id, { ...englishDemoFields(copy), name: copy.name.replace('(exemple)', '(example)') }) : copy
  },
  updateEntity: (id: string, patch: EntityPatch) => request<EntityRecord>(`/entities/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteEntity: (id: string) => request<void>(`/entities/${id}`, { method: 'DELETE' }),
  revisions: (id: string) => request<Revision[]>(`/entities/${id}/revisions`),
  share: (id: string, enabled: boolean, rotate = false) =>
    request<EntityRecord>(`/entities/${id}/share`, { method: 'PUT', body: json({ enabled, rotate }) }),

  // Déclaration d'applicabilité ISO 27001
  uploadSoa: (id: string, file: File) =>
    request<StoredFile>(`/entities/${id}/soa?name=${encodeURIComponent(file.name)}`, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    }),
  downloadSoa: (id: string) => request<Blob>(`/entities/${id}/soa`, { raw: true }),
  deleteSoa: (id: string) => request<void>(`/entities/${id}/soa`, { method: 'DELETE' }),

  publicView: (token: string) => request<PublicView>(`/public/${encodeURIComponent(token)}`),
}

export const DEMO_ENTITY_ID = 'demo-finexa'
