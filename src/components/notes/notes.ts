import { useCallback } from 'react'
import { useEntityEditor } from '@/lib/queries'
import { useScoping } from '@/lib/hooks'
import { uid } from '@/lib/utils'
import type { EntityNote, NoteAnchor, NoteTag } from '@/types/domain'
import { tr } from '@/i18n'

/**
 * Notes d'entretien.
 *
 * Une note est toujours posée quelque part (une question, une exigence, un
 * article) pour se relire dans son contexte. Son étiquette dit ce qu'elle
 * appelle : une vérification, une hypothèse retenue, une décision, une preuve
 * à obtenir. Les rapports reprennent les notes ouvertes en annexe.
 */

export const TAG_META: Record<NoteTag, { label: string; plural: string; tone: 'caution' | 'accent' | 'positive' | 'brass' | 'neutral'; hint: string }> = {
  verifier: {
    label: tr('À vérifier', 'To check'),
    plural: tr('Points à vérifier', 'Points to check'),
    tone: 'caution',
    hint: tr('Une réponse ou un fait à confirmer auprès de l’entité.', 'An answer or fact to confirm with the entity.'),
  },
  hypothese: {
    label: tr('Hypothèse', 'Assumption'),
    plural: tr('Hypothèses retenues', 'Assumptions made'),
    tone: 'accent',
    hint: tr('Ce que l’on a supposé faute d’information.', 'What was assumed for lack of information.'),
  },
  decision: {
    label: tr('Décision', 'Decision'),
    plural: tr('Décisions', 'Decisions'),
    tone: 'positive',
    hint: tr('Un arbitrage pris pendant l’entretien.', 'A decision taken during the interview.'),
  },
  preuve: {
    label: tr('Preuve demandée', 'Evidence requested'),
    plural: tr('Preuves demandées', 'Evidence requested'),
    tone: 'brass',
    hint: tr('Un document à obtenir pour étayer une réponse.', 'A document to obtain to support an answer.'),
  },
  note: { label: tr('Note', 'Note'), plural: tr('Notes', 'Notes'), tone: 'neutral', hint: tr('Observation libre.', 'Free-form observation.') },
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
