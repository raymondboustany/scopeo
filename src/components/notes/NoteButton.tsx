import * as Popover from '@radix-ui/react-popover'
import { Check, MessageSquarePlus, MessageSquareText, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteAnchor } from '@/types/domain'
import { sameAnchor, useNotes } from './notes'
import { NoteComposer, TagBadge } from './NoteComposer'

/**
 * Bouton de note, posé à côté d'une question, d'une exigence ou d'un article.
 * Il affiche le nombre de notes ouvertes à cet endroit et permet d'en ajouter
 * sans quitter l'écran.
 */
export function NoteButton({ anchor, className }: { anchor: NoteAnchor; className?: string }) {
  const { notes, add, update, remove, readOnly, available } = useNotes()
  if (!available) return null
  const here = notes.filter((n) => sameAnchor(n.anchor, anchor))
  const open = here.filter((n) => !n.resolved).length

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={here.length ? `${here.length} note(s) sur « ${anchor.label} »` : `Ajouter une note sur « ${anchor.label} »`}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-2xs transition-colors',
            here.length ? 'bg-accent-wash text-accent-strong' : 'text-ink-4 hover:bg-raised hover:text-ink-2',
            className,
          )}
        >
          {here.length ? <MessageSquareText size={14} /> : <MessageSquarePlus size={14} />}
          {here.length ? <span className="font-semibold tabular">{open || here.length}</span> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[22rem] rounded-lg border border-rule bg-surface p-3 shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 truncate text-2xs font-medium text-ink-3">Notes · {anchor.label}</div>
          {here.length > 0 ? (
            <ul className="mb-3 max-h-56 space-y-1.5 overflow-y-auto">
              {here.map((n) => (
                <li key={n.id} className={cn('group rounded-md bg-sunken px-2.5 py-2', n.resolved && 'opacity-55')}>
                  <div className="flex items-center justify-between gap-2">
                    <TagBadge tag={n.tag} />
                    {readOnly ? null : (
                      <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => update(n.id, { resolved: !n.resolved })} className="rounded p-1 text-ink-3 hover:text-positive" aria-label={n.resolved ? 'Rouvrir' : 'Marquer comme traitée'}>
                          <Check size={12} />
                        </button>
                        <button onClick={() => remove(n.id)} className="rounded p-1 text-ink-3 hover:text-critical" aria-label="Supprimer la note">
                          <Trash2 size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                  <p className={cn('mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink', n.resolved && 'line-through')}>{n.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {readOnly ? (
            <p className="text-2xs text-ink-3">Démonstration en lecture seule : copiez-la depuis la page Entités pour prendre des notes.</p>
          ) : (
            <NoteComposer compact autoFocus onSubmit={(tag, text) => add(anchor, tag, text)} />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
