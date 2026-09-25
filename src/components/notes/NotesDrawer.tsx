import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ClipboardCopy, CornerDownRight, NotebookPen, Trash2, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/controls'
import { useSession } from '@/lib/store'
import { cn, copyText, formatDate } from '@/lib/utils'
import { NOTE_TAGS, type EntityNote, type NoteTag } from '@/types/domain'
import { anchorRoute, TAG_META, useNotes } from './notes'
import { NoteComposer, TagBadge } from './NoteComposer'
import { tr } from '@/i18n'

type Filter = 'ouvertes' | NoteTag | 'toutes'

/** Bouton d'en-tête : ouvre le journal, signale les points encore à vérifier. */
export function NotesButton() {
  const { notes, available } = useNotes()
  const setOpen = useSession((s) => s.setNotesOpen)
  const pending = notes.filter((n) => !n.resolved && n.tag === 'verifier').length

  // Alt + N ouvre le journal depuis n'importe quel écran.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (!available) return null
  return (
    <Tooltip content={tr("Journal d'entretien (Alt + N)", 'Interview log (Alt + N)')}>
      <button
        onClick={() => setOpen(true)}
        data-tour="notes"
        aria-label={tr("Ouvrir le journal d'entretien", 'Open the interview log')}
        className="relative flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-tint hover:text-ink"
      >
        <NotebookPen size={17} />
        {pending > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caution px-1 font-mono text-[9px] font-bold text-[#141008]">
            {pending}
          </span>
        ) : null}
      </button>
    </Tooltip>
  )
}

function toMarkdown(notes: EntityNote[]): string {
  return NOTE_TAGS.map((t) => {
    const list = notes.filter((n) => n.tag === t && !n.resolved)
    if (list.length === 0) return ''
    return `## ${TAG_META[t].plural}\n\n${list.map((n) => `- ${n.text}${n.anchor.kind !== 'general' ? ` _(${n.anchor.label})_` : ''}`).join('\n')}`
  })
    .filter(Boolean)
    .join('\n\n')
}

export function NotesDrawer() {
  const open = useSession((s) => s.notesOpen)
  const setOpen = useSession((s) => s.setNotesOpen)
  const { notes, add, update, remove, readOnly } = useNotes()
  const [filter, setFilter] = useState<Filter>('ouvertes')
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const shown = useMemo(() => {
    const list = filter === 'toutes' ? notes : filter === 'ouvertes' ? notes.filter((n) => !n.resolved) : notes.filter((n) => n.tag === filter)
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [notes, filter])

  const counts = (t: Filter) =>
    t === 'toutes' ? notes.length : t === 'ouvertes' ? notes.filter((n) => !n.resolved).length : notes.filter((n) => n.tag === t).length

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-[rgb(16_20_28_/_0.35)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.aside
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-rule bg-surface shadow-modal"
              >
                <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-ink">{tr("Journal d'entretien", 'Interview log')}</Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-xs text-ink-3">
                      {tr("Toutes les notes de l'entité. Les points ouverts figurent en annexe du rapport complet.", "All of the entity's notes. Open points appear in the appendix of the full report.")}
                    </Dialog.Description>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip content={copied ? tr('Copié', 'Copied') : tr('Copier en texte (compte rendu)', 'Copy as text (minutes)')}>
                      <button
                        onClick={async () => {
                          if (!(await copyText(toMarkdown(notes)))) return
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1500)
                        }}
                        className="rounded-md p-1.5 text-ink-3 hover:bg-tint hover:text-ink"
                        aria-label={tr('Copier le journal', 'Copy the log')}
                      >
                        {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
                      </button>
                    </Tooltip>
                    <Dialog.Close className="rounded-md p-1.5 text-ink-3 hover:bg-tint hover:text-ink" aria-label={tr('Fermer', 'Close')}>
                      <X size={15} />
                    </Dialog.Close>
                  </div>
                </header>

                <div className="flex gap-1 overflow-x-auto border-b border-rule px-4 py-2">
                  {(['ouvertes', ...NOTE_TAGS, 'toutes'] as Filter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'h-7 shrink-0 rounded-md px-2 text-xs transition-colors',
                        filter === f ? 'bg-accent-wash font-medium text-accent-strong' : 'text-ink-3 hover:bg-tint hover:text-ink',
                      )}
                    >
                      {f === 'ouvertes' ? tr('Ouvertes', 'Open') : f === 'toutes' ? tr('Toutes', 'All') : TAG_META[f].label}
                      <span className="ml-1 font-mono text-[10px]">{counts(f)}</span>
                    </button>
                  ))}
                </div>

                <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                  {shown.length === 0 ? (
                    <li className="px-2 py-8 text-center text-sm text-ink-3">
                      {tr('Aucune note ici. Ajoutez-en depuis une question, une exigence ou un article (icône de bulle), ou ci-dessous.', 'No notes here. Add one from a question, a requirement or an article (speech bubble icon), or below.')}
                    </li>
                  ) : (
                    shown.map((n) => {
                      const route = anchorRoute(n.anchor)
                      return (
                        <li key={n.id} className={cn('group rounded-lg bg-sunken px-3 py-2.5', n.resolved && 'opacity-55')}>
                          <div className="flex items-center justify-between gap-2">
                            <TagBadge tag={n.tag} />
                            <span className="font-mono text-[10px] text-ink-4">{formatDate(n.createdAt)}</span>
                          </div>
                          <p className={cn('mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink', n.resolved && 'line-through')}>{n.text}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            {route ? (
                              <button
                                onClick={() => {
                                  setOpen(false)
                                  navigate(route)
                                }}
                                className="inline-flex min-w-0 items-center gap-1 text-2xs text-ink-3 hover:text-accent"
                              >
                                <CornerDownRight size={11} className="shrink-0" />
                                <span className="truncate">{n.anchor.label}</span>
                              </button>
                            ) : (
                              <span className="text-2xs text-ink-4">{tr('Note générale', 'General note')}</span>
                            )}
                            {readOnly ? null : (
                              <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button onClick={() => update(n.id, { resolved: !n.resolved })} className="rounded p-1 text-ink-3 hover:text-positive" aria-label={n.resolved ? tr('Rouvrir', 'Reopen') : tr('Marquer comme traitée', 'Mark as resolved')}>
                                  <Check size={13} />
                                </button>
                                <button onClick={() => remove(n.id)} className="rounded p-1 text-ink-3 hover:text-critical" aria-label={tr('Supprimer', 'Delete')}>
                                  <Trash2 size={13} />
                                </button>
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })
                  )}
                </ul>

                <footer className="border-t border-rule px-4 py-3">
                  {readOnly ? (
                    <p className="text-2xs text-ink-3">{tr('Démonstration en lecture seule : copiez-la depuis la page Entités pour prendre des notes.', 'Read-only demo: copy it from the Entities page to take notes.')}</p>
                  ) : (
                    <NoteComposer onSubmit={(tag, text) => add({ kind: 'general', id: '', label: tr('Note générale', 'General note') }, tag, text)} />
                  )}
                </footer>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
