import { useCallback, useEffect } from 'react'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { api, type EntityPatch, type UserInput } from './api'
import { useSession } from './store'
import type { EntityProfile, EntityRecord } from '@/types/domain'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export const keys = {
  users: ['users'] as const,
  user: (id: string) => ['user', id] as const,
  entities: (userId: string) => ['entities', userId] as const,
  entity: (id: string) => ['entity', id] as const,
  revisions: (id: string) => ['revisions', id] as const,
  public: (token: string) => ['public', token] as const,
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: api.users })

export function useCurrentUser() {
  const userId = useSession((s) => s.userId)
  return useQuery({
    queryKey: keys.user(userId ?? '—'),
    queryFn: () => api.user(userId!),
    enabled: Boolean(userId),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) => api.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateUser>[1] }) => api.updateUser(id, patch),
    onSuccess: (user) => {
      qc.setQueryData(keys.user(user.id), user)
      qc.invalidateQueries({ queryKey: keys.users })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}

// ---------------------------------------------------------------------------
// Entités
// ---------------------------------------------------------------------------

export function useEntities() {
  const userId = useSession((s) => s.userId)
  return useQuery({
    queryKey: keys.entities(userId ?? '—'),
    queryFn: () => api.entities(userId!),
    enabled: Boolean(userId),
  })
}

export function useEntity(entityId: string | null) {
  return useQuery({
    queryKey: keys.entity(entityId ?? '—'),
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
      qc.invalidateQueries({ queryKey: keys.user(userId!) })
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
      qc.invalidateQueries({ queryKey: keys.user(userId!) })
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
      qc.invalidateQueries({ queryKey: keys.user(userId!) })
    },
  })
}

export function useRevisions(entityId: string | null) {
  return useQuery({
    queryKey: keys.revisions(entityId ?? '—'),
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
    useSaveStatus.setState({ state: 'error', error: e instanceof Error ? e.message : 'Échec de l’enregistrement' })
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
    queryKey: keys.public(token ?? '—'),
    queryFn: () => api.publicView(token!),
    enabled: Boolean(token),
    retry: false,
  })
}
