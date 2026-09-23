import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Lock, RotateCcw } from 'lucide-react'
import {
  Bar,
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
import { DOMAIN_LABEL, LEVEL_STYLE, RELATION_STYLE } from '@/components/ui/tokens'
import { Button, Input, LinkButton, SegmentedControl, Textarea } from '@/components/ui/controls'
import { RecyfPanel } from '@/components/recyf/RecyfPanel'
import { useScoping } from '@/lib/hooks'
import { NoteButton } from '@/components/notes/NoteButton'
import { NextStep } from '@/components/layout/NextStep'
import { useEntityEditor } from '@/lib/queries'
import { OBLIGATION_BY_ID, recyfForTheme } from '@/engines/corpus'
import { RECYF_PILLARS } from '@/data/recyf'
import { cn, formatPct } from '@/lib/utils'
import { DOMAINS, type CoverageEntry, type CoverageLevel, type Domain, type MeasureStatus } from '@/types/domain'

/** Trois états seulement : au-delà, la distinction devient subjective et ne tient pas en contrôle. */
const STATES: { value: Exclude<CoverageLevel, 'non_evalue'>; label: string; hint: string }[] = [
  { value: 'en_place', label: 'En place', hint: 'Pratique réelle, démontrable par une preuve datée.' },
  { value: 'partiel', label: 'Partiellement en place', hint: "Des éléments existent, sans couvrir toute l'exigence." },
  { value: 'absent', label: 'Absent', hint: "Rien n'existe, ou rien de démontrable." },
]

type Filter = 'tous' | 'a_traiter' | 'evalues'
type View = 'exigences' | 'anssi'

function StatePicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: CoverageLevel | MeasureStatus | undefined
  onChange: (v: Exclude<CoverageLevel, 'non_evalue'> | null) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div className="inline-flex rounded-md border border-rule-2 bg-sunken p-0.5" role="radiogroup" aria-label={label}>
      {STATES.map((s) => {
        const active = value === s.value
        const st = LEVEL_STYLE[s.value]
        return (
          <button
            key={s.value}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={s.hint}
            onClick={() => onChange(active ? null : s.value)}
            className={cn(
              'relative flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-2xs font-medium transition-colors disabled:cursor-not-allowed',
              active ? cn(st.text) : 'text-ink-3 hover:text-ink',
            )}
          >
            {active ? (
              <motion.span layoutId={`${label}-pill`} className={cn('absolute inset-0 rounded-sm border', st.wash, st.line)} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            ) : null}
            <span className={cn('relative size-1.5 rounded-full', active ? st.dot : 'bg-rule-3')} />
            <span className="relative">{s.value === 'partiel' ? 'Partiel' : s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function AssessmentPage() {
  const scoping = useScoping()
  const { entity, readOnly } = scoping
  const edit = useEntityEditor()
  const [params, setParams] = useSearchParams()
  const view: View = params.get('vue') === 'anssi' ? 'anssi' : 'exigences'
  const [filter, setFilter] = useState<Filter>('tous')
  const [open, setOpen] = useState<string | null>(null)

  const items = useMemo(
    () =>
      scoping.prioritised.filter((p) => {
        if (filter === 'evalues') return p.coverage !== 'non_evalue'
        if (filter === 'a_traiter') return p.coverage !== 'en_place'
        return true
      }),
    [scoping.prioritised, filter],
  )

  const byDomain = useMemo(
    () => DOMAINS.map((d) => ({ domain: d, items: items.filter((i) => i.theme.domain === d) })).filter((g) => g.items.length > 0),
    [items],
  )

  if (!entity) return null

  if (!scoping.qualified) {
    return (
      <>
        <PageHeader eyebrow={entity.name} title="Évaluation" />
        <EmptyState title="Qualification requise" action={<LinkButton to="/app/qualification" variant="primary">Qualifier l'entité</LinkButton>}>
          L'évaluation porte sur les exigences effectivement applicables. Elle suppose donc de savoir lesquelles le sont.
        </EmptyState>
      </>
    )
  }

  const setCoverage = (themeId: string, patch: Partial<CoverageEntry>) =>
    edit((cur) => {
      const prev = cur.coverage[themeId] ?? { level: 'non_evalue' as CoverageLevel, updatedAt: '' }
      return { coverage: { ...cur.coverage, [themeId]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } }
    })
  const setMeasure = (id: string, status: MeasureStatus | null) =>
    edit((cur) => {
      const next = { ...cur.measures }
      if (status) next[id] = status
      else delete next[id]
      return { measures: next }
    })

  const all = scoping.prioritised
  const s = scoping.scores.global
  const count = (l: CoverageLevel) => all.filter((p) => p.coverage === l).length
  const hasNis2 = scoping.anssiApplies && scoping.recyf.length > 0

  return (
    <>
      <PageHeader
        eyebrow={entity.name}
        title="Évaluation"
        lead="Une seule réponse par exigence unifiée vaut pour tous les textes qu'elle couvre. Répondez du point de vue de ce que vous pourriez démontrer lors d'un contrôle."
        actions={
          readOnly ? (
            <Tag>
              <Lock size={10} /> Démonstration — lecture seule
            </Tag>
          ) : (
            <Button
              variant="ghost"
              icon={<RotateCcw size={13} />}
              onClick={() => {
                if (window.confirm("Effacer toute l'évaluation de cette entité ?")) edit({ coverage: {}, measures: {} })
              }}
            >
              Tout réinitialiser
            </Button>
          )
        }
      />

      <Card className="mb-5">
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Stat label="Score" value={formatPct(s.score)} tone={s.score > 0.7 ? 'positive' : s.score > 0.35 ? 'caution' : 'critical'} />
            <Bar ratio={s.score} tone={s.score > 0.7 ? 'positive' : s.score > 0.35 ? 'caution' : 'critical'} className="mt-2" />
          </div>
          <Stat label="En place" value={count('en_place')} unit={`/ ${all.length}`} tone="positive" />
          <Stat label="Partiellement en place" value={count('partiel')} tone="caution" hint="Comptées pour moitié dans le score." />
          <Stat label="Absentes" value={count('absent')} tone="critical" hint={`${count('non_evalue')} non évaluée${count('non_evalue') > 1 ? 's' : ''}`} />
        </div>
      </Card>

      {scoping.doraPrevails && scoping.applicable.includes('NIS2') ? (
        <Callout tone="neutral" className="mb-5" title="Pas de mesures ANSSI à évaluer">
          Entité financière : DORA remplace ici les obligations de gestion des risques et de notification de NIS 2 (article 4 de NIS 2). Le
          détail d'implémentation de l'ANSSI, qui décline l'article 21, reste consultable dans le corpus à titre de référence.
        </Callout>
      ) : null}

      {hasNis2 ? (
        <div className="mb-5">
          <SegmentedControl<View>
            ariaLabel="Vue"
            value={view}
            onChange={(v) => setParams(v === 'anssi' ? { vue: 'anssi' } : {}, { replace: true })}
            options={[
              { value: 'exigences', label: 'Exigences unifiées', count: all.length },
              { value: 'anssi', label: 'Mesures ANSSI (NIS 2)', count: scoping.measures.total },
            ]}
          />
        </div>
      ) : null}

      {view === 'anssi' && hasNis2 ? (
        <AnssiView readOnly={readOnly} onSet={setMeasure} />
      ) : (
        <>
          <div className="mb-4">
            <SegmentedControl<Filter>
              ariaLabel="Filtrer les exigences"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'tous', label: 'Toutes', count: all.length },
                { value: 'a_traiter', label: 'À traiter', count: all.filter((p) => p.coverage !== 'en_place').length },
                { value: 'evalues', label: 'Évaluées', count: s.evaluated },
              ]}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState title="Aucune exigence dans ce filtre" />
          ) : (
            <div className="space-y-7">
              {byDomain.map((group) => (
                <section key={group.domain}>
                  <SectionRule aside={`${group.items.length}`}>{DOMAIN_LABEL[group.domain as Domain]}</SectionRule>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => {
                      const entry = entity.coverage[item.themeId]
                      const level = entry?.level ?? 'non_evalue'
                      const isOpen = open === item.themeId
                      const recyf = scoping.anssiApplies && item.regulations.includes('NIS2') ? recyfForTheme(item.theme.recyf, scoping.nis2Category) : []
                      return (
                        <li key={item.themeId}>
                          <Card className={cn('transition-colors', isOpen && 'ring-1 ring-rule-3')}>
                            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                              <button onClick={() => setOpen(isOpen ? null : item.themeId)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left" aria-expanded={isOpen}>
                                <ChevronRight size={14} className={cn('mt-1 shrink-0 text-ink-4 transition-transform', isOpen && 'rotate-90')} />
                                <span className="min-w-0">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-medium text-ink">{item.theme.title}</span>
                                    {item.theme.relation !== 'recouvrement' ? (
                                      <Tag tone={item.theme.relation === 'divergence' ? 'critical' : 'brass'}>{RELATION_STYLE[item.theme.relation].label}</Tag>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="ref text-ink-4">{item.theme.code}</span>
                                    {item.regulations.map((r) => (
                                      <RegChip key={r} id={r} size="sm" />
                                    ))}
                                  </span>
                                </span>
                              </button>
                              <div className="flex shrink-0 items-center gap-3">
                                <NoteButton anchor={{ kind: 'theme', id: item.themeId, label: item.theme.title }} />
                                <Ladder level={level} />
                                <StatePicker
                                  label={`Couverture — ${item.theme.code}`}
                                  value={level}
                                  disabled={readOnly}
                                  onChange={(v) => setCoverage(item.themeId, { level: v ?? 'non_evalue' })}
                                />
                              </div>
                            </div>

                            <AnimatePresence initial={false}>
                              {isOpen ? (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="space-y-4 border-t border-rule bg-sunken/60 px-4 py-4">
                                    <div>
                                      <div className="label-caps mb-1">L'action attendue</div>
                                      <p className="text-sm leading-relaxed text-ink-2">{item.theme.unifiedAction}</p>
                                    </div>
                                    <Field label="Preuve invoquée">
                                      <Input disabled={readOnly} value={entry?.evidence ?? ''} onChange={(e) => setCoverage(item.themeId, { evidence: e.target.value })} placeholder="Document, référence, date de dernière revue" />
                                      <p className="mt-1 text-2xs text-ink-3">Attendu par les textes : {item.theme.evidence.join(' · ')}</p>
                                    </Field>
                                    <Field label="Commentaire">
                                      <Textarea disabled={readOnly} rows={2} value={entry?.note ?? ''} onChange={(e) => setCoverage(item.themeId, { note: e.target.value })} placeholder="Réserve, dépendance, décision à prendre" />
                                    </Field>

                                    <div className="rounded-lg bg-sunken p-3">
                                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                        <span className="text-xs font-semibold text-ink-2">Suivi — facultatif</span>
                                        <span className="text-2xs text-ink-4">Utile si aucun autre outil ne porte le plan d'action ; repris dans les rapports.</span>
                                      </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Field label="Porteur pressenti">
                                        <Input disabled={readOnly} value={entry?.owner ?? ''} onChange={(e) => setCoverage(item.themeId, { owner: e.target.value })} placeholder="Direction ou personne" />
                                      </Field>
                                      <Field label="Échéance visée">
                                        <Input disabled={readOnly} type="date" value={entry?.targetDate ?? ''} onChange={(e) => setCoverage(item.themeId, { targetDate: e.target.value })} />
                                      </Field>
                                    </div>
                                    </div>

                                    {recyf.length > 0 ? (
                                      <RecyfPanel objectives={recyf} statuses={entity.measures} onSetStatus={readOnly ? undefined : setMeasure} compact />
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-2.5">
                                      <Link to={`/app/croisements?theme=${item.themeId}`} className="ref text-accent hover:underline">
                                        Fiche de croisement →
                                      </Link>
                                      {item.theme.mappings
                                        .flatMap((m) => m.obligationIds)
                                        .slice(0, 5)
                                        .map((id) => {
                                          const ob = OBLIGATION_BY_ID.get(id)
                                          return ob ? (
                                            <Link key={id} to={`/app/corpus?obligation=${id}`} className="ref text-ink-3 hover:text-accent hover:underline">
                                              {ob.regulation === 'NIS2' ? 'NIS 2' : ob.regulation} {ob.shortRef ?? ob.article}
                                            </Link>
                                          ) : null
                                        })}
                                    </div>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </Card>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <Callout tone="neutral" className="mt-6">
        Les niveaux déclarés alimentent directement le score et la priorisation : un écart sur une exigence à fort effet de levier remonte dans
        l'ordre de traitement.{' '}
        <Link to="/app/priorisation" className="font-medium text-accent underline underline-offset-2">
          Voir l'ordre de traitement
        </Link>
      </Callout>
      <div className="mt-6">
        <NextStep to="/app/priorisation" label="Prioriser : l'ordre de traitement" hint="Calculé à partir de l'exposition, des écarts et de l'effet de levier" />
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function AnssiView({ readOnly, onSet }: { readOnly: boolean; onSet: (id: string, s: MeasureStatus | null) => void }) {
  const { recyf, entity, measures, nis2Category } = useScoping()
  return (
    <div className="space-y-6">
      <Callout tone="accent" title="Détail d'implémentation ANSSI">
        Les mesures du Référentiel Cyber France traduisent concrètement les exigences de l'article 21 de NIS 2. Seules celles attendues d'une
        entité {nis2Category ?? 'essentielle ou importante'} sont listées : {measures.total} mesures, dont {measures.en_place} en place.
      </Callout>
      {RECYF_PILLARS.map((p) => {
        const objectives = recyf.filter((o) => (p.objectives as readonly number[]).includes(o.n))
        if (objectives.length === 0) return null
        return (
          <section key={p.id}>
            <SectionRule aside={`${objectives.length} objectif${objectives.length > 1 ? 's' : ''}`}>{p.label}</SectionRule>
            <RecyfPanel className="mt-3" objectives={objectives} statuses={entity!.measures} onSetStatus={readOnly ? undefined : onSet} />
          </section>
        )
      })}
    </div>
  )
}
