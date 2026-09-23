import { motion } from 'motion/react'
import { ShieldCheck } from 'lucide-react'
import { Bar, Card, CardHeader, RegChip, ScoreRing } from '@/components/ui/primitives'
import { REG_STYLE, STATUS_STYLE } from '@/components/ui/tokens'
import { STATUS_LABEL } from '@/engines/qualification'
import { cn, formatDate } from '@/lib/utils'
import type { PublicSnapshot } from '@/types/domain'

/**
 * Ce qu'un tiers voit d'une entité partagée : périmètre et avancement,
 * rien d'autre. Le même composant sert à l'aperçu et à la page publique,
 * pour que l'aperçu ne mente jamais sur ce qui est publié.
 */
export function SnapshotView({ name, snapshot }: { name: string; snapshot: PublicSnapshot }) {
  const applicable = snapshot.verdicts.filter((v) => v.status !== 'hors_champ')
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <ScoreRing value={snapshot.score / 100} label="couverture déclarée" sublabel={`${snapshot.themesCovered} sur ${snapshot.themesTotal}`} />
        </Card>
        <Card>
          <CardHeader
            title={name}
            subtitle={[snapshot.sectorLabel, snapshot.nis2Category ? `Entité ${snapshot.nis2Category} au sens de NIS 2` : null].filter(Boolean).join(' · ') || undefined}
            icon={<ShieldCheck size={16} />}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {applicable.map((v, i) => {
              const score = snapshot.scores[v.regulation]
              return (
                <motion.div key={v.regulation} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <RegChip id={v.regulation} size="sm" />
                    <span className="tabular text-sm font-semibold text-ink">{typeof score === 'number' ? `${score} %` : '—'}</span>
                  </div>
                  <Bar ratio={(score ?? 0) / 100} color={REG_STYLE[v.regulation].hex} />
                  <div className="mt-1.5 flex items-center gap-1.5 text-2xs text-ink-3">
                    <span className={cn('size-1.5 rounded-full', STATUS_STYLE[v.status].dot)} />
                    {STATUS_LABEL[v.status]}
                    {v.qualification ? ` — ${v.qualification}` : ''}
                  </div>
                </motion.div>
              )
            })}
            {applicable.length === 0 ? <p className="text-sm text-ink-3">Aucun texte applicable retenu.</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Avancement par domaine" subtitle="Part des exigences unifiées en place, partiel compté pour moitié" />
        <div className="grid gap-x-8 gap-y-3 p-5 md:grid-cols-2">
          {snapshot.domains.map((d) => (
            <div key={d.domain} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
              <span className="truncate text-xs text-ink-2">{d.label}</span>
              <Bar ratio={d.score / 100} tone={d.score >= 75 ? 'positive' : d.score >= 40 ? 'caution' : 'critical'} />
              <span className="tabular text-right text-xs text-ink">{d.score} %</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-2xs text-ink-4">Instantané calculé le {formatDate(snapshot.generatedAt)}. Déclaratif : aucune preuve n'a été vérifiée par un tiers.</p>
    </div>
  )
}
