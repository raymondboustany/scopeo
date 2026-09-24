import { useCallback, useEffect } from 'react'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { api, type EntityPatch, type RegisterInput } from './api'
import { useSession } from './store'
import type { EntityProfile, EntityRecord, UserProfile } from '@/types/domain'
import { tr } from '@/i18n'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export const keys = {
  me: ['me'] as const,
  user: (id: string) => ['user', id] as const,
  entities: (userId: string) => ['entities', userId] as const,
  entity: (id: string) => ['entity', id] as const,
  revisions: (id: string) => ['revisions', id] as const,
  public: (token: string) => ['public', token] as const,
}

// ---------------------------------------------------------------------------
// Session et profil
// ---------------------------------------------------------------------------

/** Profil de la session en cours, vérifié par le serveur. */
export function useCurrentUser() {
  const userId = useSession((s) => s.userId)
  return useQuery({
    queryKey: [...keys.me, userId ?? 'none'],
    queryFn: () => api.me(),
    enabled: Boolean(userId),
    retry: false,
  })
}

/** Ouvre la session côté client une fois le serveur d'accord. */
function useOpenSession() {
  const qc = useQueryClient()
  const signIn = useSession((s) => s.signIn)
  const setLastName = useSession((s) => s.setLastName)
  return (user: UserProfile) => {
    qc.clear()
    if (!user.is_guest) setLastName(user.name)
    signIn(user.id)
  }
}

export function useLogin() {
  const open = useOpenSession()
  return useMutation({
    mutationFn: ({ name, password }: { name: string; password: string }) => api.login(name, password),
    onSuccess: open,
  })
}

export function useRegister() {
  const open = useOpenSession()
  return useMutation({ mutationFn: (input: RegisterInput) => api.register(input), onSuccess: open })
}

export function useSetupPassword() {
  const open = useOpenSession()
  return useMutation({
    mutationFn: ({ name, password, confirm }: { name: string; password: string; confirm: string }) => api.setupPassword(name, password, confirm),
    onSuccess: open,
  })
}

export function useGuest() {
  const open = useOpenSession()
  return useMutation({ mutationFn: () => api.guest(), onSuccess: open })
}

/** Déconnexion : la session est détruite au serveur, pas seulement oubliée ici. */
export function useLogout() {
  const qc = useQueryClient()
  const signOut = useSession((s) => s.signOut)
  return useCallback(async () => {
    await flushAll()
    try {
      await api.logout()
    } finally {
      signOut()
      qc.clear()
    }
  }, [qc, signOut])
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateUser>[1] }) => api.updateUser(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, password, confirm }: { current: string; password: string; confirm: string }) =>
      api.changePassword(current, password, confirm),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  const signOut = useSession((s) => s.signOut)
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) => api.deleteUser(id, password),
    onSuccess: () => {
      signOut()
      qc.clear()
    },
  })
}

// ---------------------------------------------------------------------------
// Entités
// ---------------------------------------------------------------------------

export function useEntities() {
  const userId = useSession((s) => s.userId)
  return useQuery({
    queryKey: keys.entities(userId ?? 'none'),
    queryFn: () => api.entities(userId!),
    enabled: Boolean(userId),
  })
}

export function useEntity(entityId: string | null) {
  return useQuery({
    queryKey: keys.entity(entityId ?? 'none'),
    queryFn: () => api.entity(entityId!),
    enabled: Boolean(entityId),
  })
}

export function useCurrentEntity() {
  const entityId = useSession((s) => s.entityId)
  return useEntity(entityId)
}

export function useCreateEntity() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  return useMutation({
    mutationFn: (input: { name: string; scope_note?: string; profile?: EntityProfile }) => api.createEntity(userId!, input),
    onSuccess: (entity) => {
      qc.setQueryData(keys.entity(entity.id), entity)
      qc.invalidateQueries({ queryKey: keys.entities(userId!) })
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useCopyDemo() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  return useMutation({
    mutationFn: () => api.copyDemo(userId!),
    onSuccess: (entity) => {
      qc.setQueryData(keys.entity(entity.id), entity)
      qc.invalidateQueries({ queryKey: keys.entities(userId!) })
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useDeleteEntity() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  return useMutation({
    mutationFn: (id: string) => api.deleteEntity(id),
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: keys.entity(id) })
      qc.invalidateQueries({ queryKey: keys.entities(userId!) })
      qc.invalidateQueries({ queryKey: keys.me })
    },
  })
}

export function useRevisions(entityId: string | null) {
  return useQuery({
    queryKey: keys.revisions(entityId ?? 'none'),
    queryFn: () => api.revisions(entityId!),
    enabled: Boolean(entityId),
  })
}

export function useShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled, rotate }: { id: string; enabled: boolean; rotate?: boolean }) =>
      api.share(id, enabled, rotate),
    onSuccess: (entity) => qc.setQueryData(keys.entity(entity.id), entity),
  })
}

// ---------------------------------------------------------------------------
// Enregistrement automatique
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export const useSaveStatus = create<{ state: SaveState; at: number | null; error: string | null }>(() => ({
  state: 'idle',
  at: null,
  error: null,
}))

const pending = new Map<string, { patch: EntityPatch; timer: ReturnType<typeof setTimeout> }>()
const SAVE_DELAY = 600

async function flush(entityId: string) {
  const entry = pending.get(entityId)
  if (!entry) return
  pending.delete(entityId)
  clearTimeout(entry.timer)
  useSaveStatus.setState({ state: 'saving', error: null })
  try {
    const saved = await api.updateEntity(entityId, entry.patch)
    // On ne réécrit le cache que si aucune saisie n'est arrivée entre-temps :
    // sinon la réponse, déjà dépassée, effacerait une frappe en cours.
    if (!pending.has(entityId)) queryClient.setQueryData(keys.entity(entityId), saved)
    queryClient.invalidateQueries({ queryKey: ['entities'] })
    if ('answers' in entry.patch) queryClient.invalidateQueries({ queryKey: keys.revisions(entityId) })
    useSaveStatus.setState({ state: 'saved', at: Date.now() })
  } catch (e) {
    useSaveStatus.setState({ state: 'error', error: e instanceof Error ? e.message : tr('Échec de l’enregistrement', 'Save failed') })
  }
}

export function flushAll() {
  return Promise.all([...pending.keys()].map(flush))
}

/**
 * Modifie l'entité courante : mise à jour immédiate de l'affichage, puis
 * envoi groupé au serveur après une courte pause de saisie.
 */
export function useEntityEditor() {
  const qc = useQueryClient()
  const entityId = useSession((s) => s.entityId)

  useEffect(() => {
    const onUnload = () => {
      void flushAll()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  return useCallback(
    (patch: EntityPatch | ((current: EntityRecord) => EntityPatch)) => {
      if (!entityId) return
      const current = qc.getQueryData<EntityRecord>(keys.entity(entityId))
      if (!current || current.is_demo) return
      const resolved = typeof patch === 'function' ? patch(current) : patch
      qc.setQueryData<EntityRecord>(keys.entity(entityId), { ...current, ...resolved, updated_at: new Date().toISOString() })

      const existing = pending.get(entityId)
      if (existing) clearTimeout(existing.timer)
      const merged = { ...(existing?.patch ?? {}), ...resolved }
      pending.set(entityId, { patch: merged, timer: setTimeout(() => void flush(entityId), SAVE_DELAY) })
      useSaveStatus.setState({ state: 'pending' })
    },
    [entityId, qc],
  )
}

// ---------------------------------------------------------------------------
// Trust Center
// ---------------------------------------------------------------------------

export function usePublicView(token: string | undefined) {
  return useQuery({
    queryKey: keys.public(token ?? 'none'),
    queryFn: () => api.publicView(token!),
    enabled: Boolean(token),
    retry: false,
  })
}
