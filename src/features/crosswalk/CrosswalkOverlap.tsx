import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { Card, CardHeader, RegChip } from '@/components/ui/primitives'
import { REG_LABEL, REG_STYLE } from '@/components/ui/tokens'
import { cn, formatPct } from '@/lib/utils'
import type { CrosswalkTheme, RegulationId } from '@/types/domain'
import { tr } from '@/i18n'

/**
 * Mutualisation : ce qu'une action unique permet de couvrir.
 *
 * Plutôt qu'un graphe de forces, deux lectures fixes :
 *  1. combien d'exigences unifiées sont partagées par 5, 4, 3, 2 textes, ou
 *     propres à un seul ;
 *  2. quelles combinaisons de textes reviennent, et avec quelles exigences
 *     (une lecture « UpSet » : une ligne par combinaison, des pastilles pour
 *     les textes qui la composent).
 */
export default function CrosswalkOverlap({
  themes,
  regs,
  selectedId,
  onSelect,
}: {
  themes: CrosswalkTheme[]
  regs: RegulationId[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { regs: RegulationId[]; themes: CrosswalkTheme[] }>()
    for (const t of themes) {
      const covered = regs.filter((r) => t.mappings.some((m) => m.regulation === r))
      if (covered.length === 0) continue
      const key = covered.join('+')
      const row = map.get(key) ?? { regs: covered, themes: [] }
      row.themes.push(t)
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.regs.length - a.regs.length || b.themes.length - a.themes.length)
  }, [themes, regs])

  const byDegree = useMemo(() => {
    const out = new Map<number, number>()
    for (const r of rows) out.set(r.regs.length, (out.get(r.regs.length) ?? 0) + r.themes.length)
    return out
  }, [rows])
  const total = rows.reduce((n, r) => n + r.themes.length, 0)
  const shared = total - (byDegree.get(1) ?? 0)
  const maxRow = Math.max(1, ...rows.map((r) => r.themes.length))
  const [open, setOpen] = useState<string | null>(rows[0] ? rows[0].regs.join('+') : null)

  return (
    <div className="grid gap-5 xl:grid-cols-[20rem_1fr]">
      <Card className="h-fit">
        <CardHeader title={tr('Effet de levier', 'Leverage')} subtitle={tr("Exigences unifiées selon le nombre de textes qu'elles couvrent", 'Unified requirements by number of texts covered')} />
        <div className="space-y-4 p-5">
          <div>
            <div className="text-3xl font-semibold tracking-tight text-ink">
              {formatPct(total ? shared / total : 0)}
            </div>
            <p className="text-xs text-ink-3">
              {tr('des exigences satisfont au moins deux textes à la fois : une action, plusieurs conformités.', 'of requirements satisfy at least two texts at once: one action, several compliances.')}
            </p>
          </div>
          <ul className="space-y-2.5">
            {[5, 4, 3, 2, 1]
              .filter((d) => d <= regs.length)
              .map((d, i) => {
                const n = byDegree.get(d) ?? 0
                return (
                  <li key={d}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-2">{d === 1 ? tr('Propres à un texte', 'Specific to one text') : tr(`Communes à ${d} textes`, `Shared by ${d} texts`)}</span>
                      <span className="font-semibold text-ink">{n}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-overlay">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: d === 1 ? 'var(--c-ink-4)' : `color-mix(in srgb, var(--c-accent) ${40 + d * 15}%, transparent)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${total ? (n / total) * 100 : 0}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 }}
                      />
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader title={tr('Combinaisons de textes', 'Text combinations')} subtitle={tr('Une ligne par combinaison ; dépliez pour voir les exigences et ouvrir leur fiche', 'One row per combination; expand to see the requirements and open their card')} />
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 border-b border-rule px-5 py-2">
          <div className="flex gap-1.5">
            {regs.map((r) => (
              <span key={r} className="w-16 text-center text-[10px] font-semibold leading-tight text-ink-3">
                {REG_LABEL[r]}
              </span>
            ))}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-4">{tr('Exigences', 'Requirements')}</span>
        </div>
        <ul className="divide-y divide-rule">
          {rows.map((row) => {
            const key = row.regs.join('+')
            const isOpen = open === key
            return (
              <li key={key}>
                <button
                  onClick={() => setOpen(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className={cn('grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-2.5 text-left transition-colors hover:bg-raised', isOpen && 'bg-raised')}
                >
                  <span className="flex gap-1.5">
                    {regs.map((r) => {
                      const on = row.regs.includes(r)
                      return (
                        <span key={r} className="flex w-16 justify-center">
                          <span
                            className="size-3 rounded-full"
                            style={{ background: on ? REG_STYLE[r].hex : 'var(--c-overlay)' }}
                            aria-label={on ? REG_LABEL[r] : undefined}
                          />
                        </span>
                      )
                    })}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-overlay">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(row.themes.length / maxRow) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right text-sm font-semibold text-ink">{row.themes.length}</span>
                  </span>
                  <ChevronRight size={14} className={cn('text-ink-4 transition-transform', isOpen && 'rotate-90')} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 bg-raised px-5 pb-4 pt-1">
                        <span className="mb-1 flex w-full flex-wrap items-center gap-1 text-2xs text-ink-3">
                          {row.regs.map((r) => (
                            <RegChip key={r} id={r} size="sm" />
                          ))}
                          <span className="ml-1">{row.regs.length > 1 ? tr('couverts ensemble par :', 'covered together by:') : tr('seul, par :', 'alone, by:')}</span>
                        </span>
                        {row.themes.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            className={cn(
                              'rounded-md px-2.5 py-1.5 text-xs transition-colors',
                              t.id === selectedId ? 'bg-accent text-accent-ink' : 'bg-surface text-ink-2 shadow-card hover:text-ink',
                            )}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
