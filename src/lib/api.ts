import type {
  AdminUser,
  Answers,
  AuditEvent,
  AuthStatus,
  GlobalSettings,
  LdapConfigRead,
  LdapConfigUpdate,
  LdapTestReport,
  ApiTokenInfo,
  LoginResult,
  MfaSetup,
  SsoConfigRead,
  SsoConfigUpdate,
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
  invalid_credentials: () => tr('Identifiant ou mot de passe incorrect.', 'Incorrect username or password.'),
  too_many_attempts: () =>
    tr('Trop de tentatives. Réessayez dans quelques minutes.', 'Too many attempts. Please try again in a few minutes.'),
  password_unchanged: () =>
    tr("Le nouveau mot de passe doit être différent de l'actuel.", 'The new password must differ from the current one.'),
  password_change_required: () =>
    tr('Choisissez un nouveau mot de passe pour continuer.', 'Choose a new password to continue.'),
  registration_closed: () =>
    tr("La création de profil est fermée. Demandez un compte à l'administrateur.", 'Profile creation is closed. Ask the administrator for an account.'),
  guest_disabled: () => tr("Le mode invité a été désactivé par l'administrateur.", 'Guest mode has been disabled by the administrator.'),
  setup_required: () => tr("Créez d'abord le profil administrateur.", 'Create the administrator profile first.'),
  account_disabled: () =>
    tr("Ce compte est suspendu. Contactez l'administrateur.", 'This account is suspended. Contact the administrator.'),
  ldap_disabled: () => tr("La connexion par annuaire n'est pas activée.", 'Directory sign-in is not enabled.'),
  ldap_unavailable: () =>
    tr("L'annuaire ne répond pas. Réessayez ou contactez l'administrateur.", 'The directory is not responding. Try again or contact the administrator.'),
  request_too_large: () =>
    tr('Contenu trop volumineux pour être enregistré.', 'Content too large to be saved.'),
  ldap_password_expired: () =>
    tr(
      'Votre mot de passe a expiré ou doit être changé. Changez-le sur votre poste, puis réessayez.',
      'Your password has expired or must be changed. Change it on your computer, then try again.',
    ),
  mfa_challenge_expired: () =>
    tr('La vérification a expiré. Reconnectez-vous.', 'Verification has expired. Please sign in again.'),
  mfa_invalid_code: () => tr('Code incorrect.', 'Incorrect code.'),
  mfa_already_enabled: () => tr('La double authentification est déjà active.', 'Two-factor authentication is already on.'),
  mfa_setup_required: () => tr('Recommencez la configuration.', 'Start the setup again.'),
  mfa_not_enabled: () => tr("La double authentification n'est pas active.", 'Two-factor authentication is not on.'),
  managed_by_directory: () =>
    tr("Ce mot de passe est géré par l'annuaire de votre organisation.", "This password is managed by your organisation's directory."),
  admin_required: () => tr('Réservé aux administrateurs.', 'Administrators only.'),
  last_admin: () =>
    tr('Il doit rester au moins un administrateur actif.', 'At least one active administrator must remain.'),
  cannot_change_self: () =>
    tr('Un autre administrateur doit effectuer cette action sur votre compte.', 'Another administrator must do this on your account.'),
  ldap_url_invalid: () => tr('Adresse invalide : ldap:// ou ldaps:// suivi du serveur.', 'Invalid address: ldap:// or ldaps:// followed by the server.'),
  ldap_base_dn_required: () => tr('La base de recherche est requise.', 'The search base is required.'),
  sso_issuer_invalid: () =>
    tr("L'émetteur doit être une adresse https://.", 'The issuer must be an https:// address.'),
  sso_client_id_required: () => tr("L'identifiant client est requis.", 'The client ID is required.'),
  sso_scopes_invalid: () => tr('Les portées doivent inclure « openid ».', 'Scopes must include "openid".'),
  sso_disabled: () => tr("La connexion unique n'est pas activée.", 'Single sign-on is not enabled.'),
  sso_cancelled: () => tr('Connexion annulée.', 'Sign-in cancelled.'),
  sso_state_invalid: () =>
    tr('La connexion a expiré ou a été interrompue. Réessayez.', 'Sign-in expired or was interrupted. Please try again.'),
  sso_token_invalid: () =>
    tr("La réponse du fournisseur d'identité n'a pas pu être vérifiée.", 'The identity provider response could not be verified.'),
  sso_domain_forbidden: () =>
    tr("Votre adresse n'appartient pas à un domaine autorisé.", 'Your address does not belong to an allowed domain.'),
  sso_not_in_group: () =>
    tr("Votre compte n'appartient pas au groupe autorisé.", 'Your account is not in the allowed group.'),
  sso_unreachable: () =>
    tr("Le fournisseur d'identité ne répond pas.", 'The identity provider is not responding.'),
  sso_provider_error: () =>
    tr("Le fournisseur d'identité a refusé la demande.", 'The identity provider rejected the request.'),
  sso_discovery_invalid: () =>
    tr('Configuration du fournisseur introuvable ou incomplète.', 'Provider configuration missing or incomplete.'),
  sso_insecure_url: () => tr('Adresse non chiffrée refusée (https requis).', 'Unencrypted address refused (https required).'),
  sso_no_id_token: () => tr("Le fournisseur n'a pas renvoyé d'identité.", 'The provider returned no identity.'),
  mfa_managed_by_provider: () =>
    tr("La double authentification est gérée par le fournisseur d'identité de votre organisation.", "Two-factor authentication is handled by your organisation's identity provider."),
  public_url_invalid: () =>
    tr("L'adresse publique doit commencer par https://.", 'The public address must start with https://.'),
  api_tokens_disabled: () =>
    tr("Les jetons d'API sont désactivés par l'administrateur.", 'API tokens are disabled by the administrator.'),
  too_many_tokens: () => tr('Vingt jetons au plus par compte.', 'At most twenty tokens per account.'),
  token_forbidden: () => tr('Action impossible avec un jeton d’API.', 'Not allowed with an API token.'),
  backup_unsupported: () =>
    tr('Sauvegarde intégrée disponible avec la base SQLite uniquement.', 'Built-in backup is only available with the SQLite database.'),
  ldap_ca_invalid: () =>
    tr("Le certificat d'autorité n'est pas un certificat PEM valide.", 'The authority certificate is not a valid PEM certificate.'),
  ldap_filter_invalid: () =>
    tr('Le filtre doit être entre parenthèses et contenir {username}.', 'The filter must be in parentheses and contain {username}.'),
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

/** Message lisible pour un code d'erreur du serveur (utilisé aussi par les retours de redirection). */
export function messageFor(code: string): string {
  return ERROR_MESSAGES[code]?.() ?? code
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
  status: () => request<AuthStatus>('/auth/status'),
  me: () => request<UserProfile>('/auth/me'),
  register: (input: RegisterInput) => request<UserProfile>('/auth/register', { method: 'POST', body: json(input) }),
  login: (name: string, password: string) => request<LoginResult>('/auth/login', { method: 'POST', body: json({ name, password }) }),
  ldapLogin: (username: string, password: string) =>
    request<LoginResult>('/auth/ldap', { method: 'POST', body: json({ username, password }) }),
  mfaVerify: (challenge: string, code: string) =>
    request<UserProfile>('/auth/mfa/verify', { method: 'POST', body: json({ challenge, code }) }),
  mfaSetup: (password: string) => request<MfaSetup>('/auth/mfa/setup', { method: 'POST', body: json({ password }) }),
  mfaEnable: (code: string) => request<{ codes: string[] }>('/auth/mfa/enable', { method: 'POST', body: json({ code }) }),
  mfaRecoveryCodes: (code: string) =>
    request<{ codes: string[] }>('/auth/mfa/recovery-codes', { method: 'POST', body: json({ code }) }),
  mfaDisable: (password: string, code: string) =>
    request<void>('/auth/mfa/disable', { method: 'POST', body: json({ password, code }) }),
  tokens: () => request<ApiTokenInfo[]>('/auth/tokens'),
  createToken: (name: string, expires_days: number) =>
    request<ApiTokenInfo & { token: string }>('/auth/tokens', { method: 'POST', body: json({ name, expires_days }) }),
  revokeToken: (id: string) => request<void>(`/auth/tokens/${id}`, { method: 'DELETE' }),
  guest: () => request<UserProfile>('/auth/guest', { method: 'POST' }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (current: string, password: string, password_confirm: string) =>
    request<void>('/auth/password', { method: 'POST', body: json({ current, password, password_confirm }) }),

  // Profil
  user: (id: string) => request<UserProfile>(`/users/${id}`),
  updateUser: (
    id: string,
    patch: Partial<{ name: string; role: UserRole; organisation: string; email: string; onboarded: boolean; admin_onboarded: boolean }>,
  ) =>
    request<UserProfile>(`/users/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteUser: (id: string, password?: string, confirm?: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE', body: json({ password: password || null, confirm: confirm ?? null }) }),

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

  // Administration
  admin: {
    users: () => request<AdminUser[]>('/admin/users'),
    createUser: (input: { name: string; role: UserRole; organisation?: string; email?: string; password: string; is_admin: boolean }) =>
      request<AdminUser>('/admin/users', { method: 'POST', body: json(input) }),
    updateUser: (id: string, patch: { is_admin?: boolean; disabled?: boolean }) =>
      request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: json(patch) }),
    resetPassword: (id: string, password: string) =>
      request<void>(`/admin/users/${id}/password`, { method: 'POST', body: json({ password }) }),
    resetMfa: (id: string) => request<void>(`/admin/users/${id}/mfa/reset`, { method: 'POST' }),
    deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
    settings: () => request<GlobalSettings>('/admin/settings'),
    saveSettings: (s: GlobalSettings) => request<GlobalSettings>('/admin/settings', { method: 'PUT', body: json(s) }),
    ldap: () => request<LdapConfigRead>('/admin/ldap'),
    saveLdap: (c: LdapConfigUpdate) => request<LdapConfigRead>('/admin/ldap', { method: 'PUT', body: json(c) }),
    testLdap: (config: LdapConfigUpdate, username: string) =>
      request<LdapTestReport>('/admin/ldap/test', { method: 'POST', body: json({ config, username }) }),
    audit: () => request<AuditEvent[]>('/admin/audit'),
    sso: () => request<SsoConfigRead>('/admin/sso'),
    saveSso: (c: SsoConfigUpdate) => request<SsoConfigRead>('/admin/sso', { method: 'PUT', body: json(c) }),
    testSso: (c: SsoConfigUpdate) => request<LdapTestReport>('/admin/sso/test', { method: 'POST', body: json(c) }),
    backup: () => request<Blob>('/admin/backup', { raw: true }),
  },

  publicView: (token: string) => request<PublicView>(`/public/${encodeURIComponent(token)}`),
}

export const DEMO_ENTITY_ID = 'demo-finexa'
