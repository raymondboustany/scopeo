import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { LevelPill, Tag } from '@/components/ui/primitives'
import { RECYF_META } from '@/data/recyf'
import { cn } from '@/lib/utils'
import type { MeasureStatus, RecyfObjective } from '@/types/domain'

/**
 * Détail d'implémentation ANSSI.
 *
 * Le ReCyF n'est pas un référentiel de plus : c'est la traduction, par
 * l'autorité française, de ce que NIS 2 attend concrètement. Il ne s'affiche
 * donc que sous une exigence NIS 2, replié par défaut, pour qui veut descendre
 * au niveau de la mesure.
 */

const STATUSES: MeasureStatus[] = ['en_place', 'partiel', 'absent']

export function RecyfPanel({
  objectives,
  statuses,
  onSetStatus,
  defaultOpen,
  compact = false,
  className,
}: {
  objectives: RecyfObjective[]
  statuses?: Record<string, MeasureStatus>
  onSetStatus?: (measureId: string, status: MeasureStatus | null) => void
  /** Objectif à déplier d'emblée. */
  defaultOpen?: number
  compact?: boolean
  className?: string
}) {
  if (objectives.length === 0) return null
  return (
    <section className={cn('rounded-md border border-nis2-line bg-nis2-wash/40', className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-nis2-line/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-nis2" aria-hidden />
          <span className="text-xs font-semibold text-ink">Détail d'implémentation ANSSI</span>
          <Tag mono>ReCyF v{RECYF_META.version}</Tag>
        </div>
        <a href={RECYF_META.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs text-ink-3 hover:text-ink">
          <ExternalLink size={10} /> Référentiel
        </a>
      </header>
      <ul className="divide-y divide-rule">
        {objectives.map((o) => (
          <Objective
            key={o.n}
            objective={o}
            statuses={statuses}
            onSetStatus={onSetStatus}
            initiallyOpen={defaultOpen === o.n}
            compact={compact}
          />
        ))}
      </ul>
      {!compact ? (
        <p className="border-t border-rule px-4 py-2 text-[10px] leading-snug text-ink-4">{RECYF_META.status}.</p>
      ) : null}
    </section>
  )
}

function Objective({
  objective: o,
  statuses,
  onSetStatus,
  initiallyOpen,
  compact,
}: {
  objective: RecyfObjective
  statuses?: Record<string, MeasureStatus>
  onSetStatus?: (id: string, s: MeasureStatus | null) => void
  initiallyOpen: boolean
  compact: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const done = statuses ? o.measures.filter((m) => statuses[m.id] === 'en_place').length : 0
  return (
    <li id={`recyf-${o.n}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-raised/40" aria-expanded={open}>
        <ChevronRight size={13} className={cn('mt-0.5 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs text-nis2">Obj. {o.n}</span>
            <span className="text-sm text-ink">{o.title}</span>
            {o.scope === 'EE' ? <Tag>Entités essentielles</Tag> : null}
          </span>
        </span>
        <span className="shrink-0 font-mono text-2xs text-ink-4">
          {statuses ? `${done}/` : ''}
          {o.measures.length} mesure{o.measures.length > 1 ? 's' : ''}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 px-4 pb-3 pl-10">
              {!compact ? <p className="text-xs italic leading-relaxed text-ink-3">{o.statement}</p> : null}
              <ul className="space-y-1.5">
                {o.measures.map((m) => {
                  const st = statuses?.[m.id]
                  return (
                    <li key={m.id} className="flex flex-col gap-2 rounded-sm bg-surface/70 px-3 py-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-ink-4">{m.id}</span>
                        <p className="text-xs leading-relaxed text-ink-2">{m.text}</p>
                      </div>
                      {onSetStatus ? (
                        <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={`Statut de la mesure ${m.id}`}>
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              role="radio"
                              aria-checked={st === s}
                              onClick={() => onSetStatus(m.id, st === s ? null : s)}
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                                st === s
                                  ? s === 'en_place'
                                    ? 'border-positive-line bg-positive-wash text-positive'
                                    : s === 'partiel'
                                      ? 'border-caution-line bg-caution-wash text-caution'
                                      : 'border-critical-line bg-critical-wash text-critical'
                                  : 'border-rule-2 text-ink-4 hover:border-rule-3 hover:text-ink-2',
                              )}
                            >
                              {s === 'en_place' ? 'En place' : s === 'partiel' ? 'Partiel' : 'Absent'}
                            </button>
                          ))}
                        </div>
                      ) : st ? (
                        <LevelPill level={st} className="shrink-0" />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              {o.equivalence && !compact ? <p className="text-2xs text-ink-3">Équivalence : {o.equivalence}</p> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  )
}
