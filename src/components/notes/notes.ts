import { useCallback } from 'react'
import { useEntityEditor } from '@/lib/queries'
import { useScoping } from '@/lib/hooks'
import { uid } from '@/lib/utils'
import type { EntityNote, NoteAnchor, NoteTag } from '@/types/domain'

/**
 * Notes d'entretien.
 *
 * Une note est toujours posée quelque part — une question, une exigence, un
 * article — pour se relire dans son contexte. Son étiquette dit ce qu'elle
 * appelle : une vérification, une hypothèse retenue, une décision, une preuve
 * à obtenir. Les rapports reprennent les notes ouvertes en annexe.
 */

export const TAG_META: Record<NoteTag, { label: string; plural: string; tone: 'caution' | 'accent' | 'positive' | 'brass' | 'neutral'; hint: string }> = {
  verifier: { label: 'À vérifier', plural: 'Points à vérifier', tone: 'caution', hint: 'Une réponse ou un fait à confirmer auprès de l’entité.' },
  hypothese: { label: 'Hypothèse', plural: 'Hypothèses retenues', tone: 'accent', hint: 'Ce que l’on a supposé faute d’information.' },
  decision: { label: 'Décision', plural: 'Décisions', tone: 'positive', hint: 'Un arbitrage pris pendant l’entretien.' },
  preuve: { label: 'Preuve demandée', plural: 'Preuves demandées', tone: 'brass', hint: 'Un document à obtenir pour étayer une réponse.' },
  note: { label: 'Note', plural: 'Notes', tone: 'neutral', hint: 'Observation libre.' },
}

export function anchorRoute(a: NoteAnchor): string | null {
  switch (a.kind) {
    case 'question':
      return '/app/qualification'
    case 'theme':
      return `/app/croisements?theme=${encodeURIComponent(a.id)}`
    case 'obligation':
      return `/app/corpus?obligation=${encodeURIComponent(a.id)}`
    case 'regulation':
      return '/app/corpus'
    default:
      return null
  }
}

export const sameAnchor = (a: NoteAnchor, b: NoteAnchor) => a.kind === b.kind && a.id === b.id

export function useNotes() {
  const { entity, readOnly } = useScoping()
  const edit = useEntityEditor()
  const notes: EntityNote[] = entity?.notes ?? []

  const add = useCallback(
    (anchor: NoteAnchor, tag: NoteTag, text: string) => {
      const now = new Date().toISOString()
      const note: EntityNote = { id: uid(), anchor, tag, text: text.trim(), resolved: false, createdAt: now, updatedAt: now }
      edit((cur) => ({ notes: [...(cur.notes ?? []), note] }))
    },
    [edit],
  )
  const update = useCallback(
    (id: string, patch: Partial<Pick<EntityNote, 'text' | 'tag' | 'resolved'>>) =>
      edit((cur) => ({
        notes: (cur.notes ?? []).map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)),
      })),
    [edit],
  )
  const remove = useCallback((id: string) => edit((cur) => ({ notes: (cur.notes ?? []).filter((n) => n.id !== id) })), [edit])

  return { notes, add, update, remove, readOnly, available: Boolean(entity) }
}
