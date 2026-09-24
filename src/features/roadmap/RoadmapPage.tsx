import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Download, Lock } from 'lucide-react'
import {
  Callout,
  Card,
  EmptyState,
  Ladder,
  PageHeader,
  RegChip,
  SectionRule,
  Stat,
  Tag,
} from '@/components/ui/primitives'
import { RELATION_STYLE } from '@/components/ui/tokens'
import { Button, LinkButton, Tooltip } from '@/components/ui/controls'
import { useScoping } from '@/lib/hooks'
import { NextStep } from '@/components/layout/NextStep'
import { COVERAGE_LABEL, WAVES } from '@/engines/prioritisation'
import { CROSSWALK_BY_ID } from '@/data/crosswalk'
import { RECURRING_DUTIES } from '@/data/timeline'
import { cn, formatDateShort, formatPct } from '@/lib/utils'
import { REG_LABEL } from '@/components/ui/tokens'
import type { PrioritisedItem } from '@/types/domain'
import { COLON, tr } from '@/i18n'

/**
 * Marque d'ordre des octets. Sans elle, un tableur francophone ouvre le
 * fichier dans la page de code locale et les accents sont illisibles. Elle est
 * construite par code de caractère plutôt qu'écrite littéralement, un
 * caractère invisible dans le source étant une source d'erreurs.
 */
const BOM = String.fromCharCode(0xfeff)

export default function RoadmapPage() {
  const scoping = useScoping()
  const profile = scoping.entity

  const byWave = useMemo(
    () => WAVES.map((w) => ({ ...w, items: scoping.prioritised.filter((p) => p.wave === w.n) })),
    [scoping.prioritised],
  )

  if (!profile) return null

  if (!scoping.qualified) {
    return (
      <>
        <PageHeader eyebrow={profile.name} title={tr('Feuille de route', 'Roadmap')} />
        <EmptyState
          title={tr('Qualification requise', 'Scoping required')}
          action={<LinkButton to="/app/qualification" variant="primary">{tr("Qualifier l'entité", 'Scope the entity')}</LinkButton>}
        >
          {tr("La feuille de route découle de l'ordre de traitement, qui suppose de connaître les textes applicables.", 'The roadmap follows from the treatment order, which requires knowing the applicable texts.')}
        </EmptyState>
      </>
    )
  }

  const totalEffort = scoping.prioritised.reduce((n, p) => n + p.theme.effort, 0)
  const remaining = scoping.prioritised.filter((p) => p.coverage !== 'en_place')
  const remainingEffort = remaining.reduce((n, p) => n + p.theme.effort, 0)

  const exportCsv = () => {
    const rows = [
      [tr('Rang', 'Rank'), tr('Phase', 'Phase'), tr('Horizon', 'Horizon'), 'Code', tr('Exigence', 'Requirement'), tr('Textes', 'Texts'), tr('Couverture', 'Coverage'), tr('Charge', 'Effort'), tr('Responsable', 'Owner'), tr('Échéance', 'Due date'), 'Action'],
      ...scoping.prioritised.map((p) => {
        const entry = scoping.coverage[p.themeId]
        const wave = WAVES.find((w) => w.n === p.wave)
        return [
          String(p.rank),
          String(p.wave),
          wave?.horizon ?? '',
          p.theme.code,
          p.theme.title,
          p.regulations.map((r) => REG_LABEL[r]).join(' + '),
          COVERAGE_LABEL[p.coverage],
          String(p.theme.effort),
          entry?.owner ?? '',
          entry?.targetDate ?? '',
          p.theme.unifiedAction,
        ]
      }),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    // La marque d'ordre des octets en tête garantit qu'un tableur francophone
    // ouvre le fichier en UTF-8 plutôt qu'en page de code locale.
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tr('feuille-de-route', 'roadmap')}-${profile.name.replace(/[^\w-]+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        eyebrow={profile.name}
        title={tr('Feuille de route', 'Roadmap')}
        lead={tr("L'ordre de traitement découpé en quatre phases, en respectant les antériorités techniques. Chaque phase est un engagement de séquence, pas une promesse de date : les horizons sont indicatifs.", 'The treatment order split into four phases, respecting technical prerequisites. Each phase is a sequencing commitment, not a date promise: horizons are indicative.')}
        actions={
          <Button icon={<Download size={13} />} onClick={exportCsv}>
            {tr('Exporter en CSV', 'Export as CSV')}
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-6 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={tr('Exigences au plan', 'Requirements in the plan')} value={scoping.prioritised.length} />
          <Stat
            label={tr('Restant à traiter', 'Remaining')}
            value={remaining.length}
            tone={remaining.length > 0 ? 'caution' : 'positive'}
            hint={tr('Exigences non formalisées et non testées.', 'Requirements not yet formalised and tested.')}
          />
          <Stat
            label={tr('Charge totale', 'Total effort')}
            value={totalEffort}
            unit="points"
            hint={tr('Somme des charges estimées, de 1 à 5 par exigence.', 'Sum of estimated efforts, 1 to 5 per requirement.')}
          />
          <Stat
            label={tr('Charge restante', 'Remaining effort')}
            value={remainingEffort}
            unit="points"
            tone={remainingEffort > totalEffort * 0.6 ? 'critical' : 'caution'}
            hint={tr(`${formatPct(remainingEffort / Math.max(1, totalEffort))} de la charge initiale.`, `${formatPct(remainingEffort / Math.max(1, totalEffort))} of the initial effort.`)}
          />
        </div>
      </Card>

      <div className="space-y-8">
        {byWave.map((wave) => (
          <section key={wave.n}>
            <SectionRule
              aside={tr(
                `${wave.items.length} exigence${wave.items.length > 1 ? 's' : ''} · charge ${wave.items.reduce((n, i) => n + i.theme.effort, 0)}`,
                `${wave.items.length} requirement${wave.items.length > 1 ? 's' : ''} · effort ${wave.items.reduce((n, i) => n + i.theme.effort, 0)}`,
              )}
            >
              {wave.label} · {wave.horizon}
            </SectionRule>
            <p className="mt-2 max-w-2xl text-sm text-ink-2">{wave.intent}</p>

            {wave.items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-3">{tr('Aucune exigence dans cette phase.', 'No requirement in this phase.')}</p>
            ) : (
              <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                {wave.items.map((item) => (
                  <WaveCard key={item.themeId} item={item} coverage={scoping.coverage[item.themeId]} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Obligations récurrentes ---------------------------------------- */}
      <section className="mt-10">
        <SectionRule>{tr('Charges récurrentes une fois le plan achevé', 'Recurring duties once the plan is complete')}</SectionRule>
        <Callout tone="neutral" className="mt-3">
          {tr("La conformité n'a pas de point d'arrivée : ces obligations reviennent à échéance fixe, indépendamment de l'avancement du plan. Les inscrire au calendrier dès maintenant évite de les découvrir en situation de contrôle.", 'Compliance has no finish line: these obligations come back at fixed intervals, regardless of plan progress. Putting them in the calendar now avoids discovering them during an inspection.')}
        </Callout>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RECURRING_DUTIES.filter((d) => scoping.applicable.includes(d.regulation)).map((d) => (
            <li key={d.id}>
              <Card className="h-full p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <RegChip id={d.regulation} size="sm" />
                  <Tag tone="brass">{d.cadence}</Tag>
                </div>
                <h3 className="mt-2 text-sm font-medium text-ink">{d.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{d.detail}</p>
                <p className="ref mt-2 border-t border-rule pt-2 text-ink-4">{d.basis}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-6">
        <NextStep to="/app/signalement" label={tr('Préparer le signalement', 'Prepare reporting')} hint={tr("Autorités, délais et chaîne d'escalade", 'Authorities, deadlines and escalation chain')} />
      </div>
    </>
  )
}

/* ========================================================================== */

function WaveCard({
  item,
  coverage,
}: {
  item: PrioritisedItem
  coverage?: { level: string; owner?: string; targetDate?: string }
}) {
  return (
    <li>
      <Card className="flex h-full flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-2xs text-ink-4">#{item.rank}</span>
            {item.regulations.map((r) => (
              <RegChip key={r} id={r} size="sm" />
            ))}
            {item.theme.relation !== 'recouvrement' ? (
              <Tag tone={item.theme.relation === 'divergence' ? 'critical' : 'brass'}>
                {RELATION_STYLE[item.theme.relation].label}
              </Tag>
            ) : null}
          </div>
          <Ladder level={item.coverage} size="sm" />
        </div>

        <h3 className="mt-2 text-sm font-medium text-ink">{item.theme.title}</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-2">{item.theme.unifiedAction}</p>

        {item.blockedBy.length > 0 ? (
          <Tooltip
            content={`${tr('À traiter après', 'To handle after')}${COLON}${item.blockedBy.map((id) => CROSSWALK_BY_ID.get(id)?.title ?? id).join(', ')}`}
          >
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-xs border border-caution-line bg-caution-wash px-1.5 py-0.5 text-2xs text-caution">
              <Lock size={9} />
              {tr(`Dépend de ${item.blockedBy.length} prérequis`, `Depends on ${item.blockedBy.length} prerequisite${item.blockedBy.length > 1 ? 's' : ''}`)}
            </div>
          </Tooltip>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-2 text-2xs text-ink-3">
          <span className="ref">{item.theme.code}</span>
          <span>{tr('Charge', 'Effort')} {item.theme.effort}/5</span>
          {coverage?.owner ? <span className="text-ink-2">{coverage.owner}</span> : null}
          {coverage?.targetDate ? (
            <span className={cn('ml-auto', 'text-ink-2')}>{formatDateShort(coverage.targetDate)}</span>
          ) : null}
        </div>

        <div className="mt-2">
          <Link to={`/app/evaluation`} className="ref text-accent hover:underline">
            {tr('Renseigner responsable et échéance →', 'Set owner and due date →')}
          </Link>
        </div>
      </Card>
    </li>
  )
}
