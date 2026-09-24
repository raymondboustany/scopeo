import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, ChevronRight, Lock, RotateCcw, TriangleAlert } from 'lucide-react'
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
import { REG_LABEL } from '@/components/ui/tokens'
import { REGULATIONS } from '@/data/regulations'
import { FrameworkNote } from '@/components/ui/primitives'
import { isManualLevel } from '@/engines/iso'
import { Tooltip } from '@/components/ui/controls'
import { COLON, tr } from '@/i18n'

/** Trois états seulement : au-delà, la distinction devient subjective et ne tient pas en contrôle. */
const STATES: { value: Exclude<CoverageLevel, 'non_evalue'>; label: string; hint: string }[] = [
  { value: 'en_place', label: tr('En place', 'In place'), hint: tr('Pratique réelle, démontrable par une preuve datée.', 'Actual practice, provable with dated evidence.') },
  { value: 'partiel', label: tr('Partiellement en place', 'Partly in place'), hint: tr("Des éléments existent, sans couvrir toute l'exigence.", 'Some elements exist, without covering the whole requirement.') },
  { value: 'absent', label: tr('Absent', 'Missing'), hint: tr("Rien n'existe, ou rien de démontrable.", 'Nothing exists, or nothing provable.') },
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
            <span className="relative">{s.value === 'partiel' ? tr('Partiel', 'Partial') : s.label}</span>
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
        <PageHeader eyebrow={entity.name} title={tr('Évaluation', 'Assessment')} />
        <EmptyState title={tr('Qualification requise', 'Scoping required')} action={<LinkButton to="/app/qualification" variant="primary">{tr("Qualifier l'entité", 'Scope the entity')}</LinkButton>}>
          {tr("L'évaluation porte sur les exigences effectivement applicables. Elle suppose donc de savoir lesquelles le sont.", 'The assessment covers the requirements that actually apply. It therefore requires knowing which ones do.')}
        </EmptyState>
      </>
    )
  }

  const setCoverage = (themeId: string, patch: Partial<CoverageEntry>) =>
    edit((cur) => {
      const prev = cur.coverage[themeId] ?? { level: 'non_evalue' as CoverageLevel, updatedAt: '' }
      const next: CoverageEntry = { ...prev, ...patch, updatedAt: new Date().toISOString() }
      delete next.fromIso
      return { coverage: { ...cur.coverage, [themeId]: next } }
    })
  /** Choix d'un niveau : effacer un niveau proposé par ISO revient à écarter la proposition. */
  const setLevel = (themeId: string, level: Exclude<CoverageLevel, 'non_evalue'> | null) => {
    const suggested = scoping.coverage[themeId]?.fromIso
    setCoverage(themeId, { level: level ?? 'non_evalue', isoDismissed: level === null && suggested ? true : undefined })
  }
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
        title={tr('Évaluation', 'Assessment')}
        lead={tr("Une seule réponse par exigence unifiée vaut pour tous les textes qu'elle couvre. Répondez du point de vue de ce que vous pourriez démontrer lors d'un contrôle.", 'A single answer per unified requirement applies to all the texts it covers. Answer from the standpoint of what you could prove during an inspection.')}
        actions={
          readOnly ? (
            <Tag>
              <Lock size={10} /> {tr('Démonstration, lecture seule', 'Demo, read-only')}
            </Tag>
          ) : (
            <Button
              variant="ghost"
              icon={<RotateCcw size={13} />}
              onClick={() => {
                if (window.confirm(tr("Effacer toute l'évaluation de cette entité ?", "Erase this entity's entire assessment?"))) edit({ coverage: {}, measures: {} })
              }}
            >
              {tr('Tout réinitialiser', 'Reset all')}
            </Button>
          )
        }
      />

      <Card className="mb-5">
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Stat label={tr('Score', 'Score')} value={formatPct(s.score)} tone={s.score > 0.7 ? 'positive' : s.score > 0.35 ? 'caution' : 'critical'} />
            <Bar ratio={s.score} tone={s.score > 0.7 ? 'positive' : s.score > 0.35 ? 'caution' : 'critical'} className="mt-2" />
          </div>
          <Stat label={tr('En place', 'In place')} value={count('en_place')} unit={`/ ${all.length}`} tone="positive" />
          <Stat label={tr('Partiellement en place', 'Partly in place')} value={count('partiel')} tone="caution" hint={tr('Comptées pour moitié dans le score.', 'Count for half in the score.')} />
          <Stat label={tr('Absentes', 'Missing')} value={count('absent')} tone="critical" hint={tr(`${count('non_evalue')} non évaluée${count('non_evalue') > 1 ? 's' : ''}`, `${count('non_evalue')} not assessed`)} />
        </div>
      </Card>

      {scoping.doraPrevails && scoping.applicable.includes('NIS2') ? (
        <Callout tone="neutral" className="mb-5" title={tr('Pas de mesures ReCyF à évaluer', 'No ReCyF measures to assess')}>
          {tr("Entité financière : DORA remplace ici les obligations de gestion des risques et de notification de NIS2 (article 4 de NIS2). Les mesures du ReCyF, qui déclinent l'article 21, restent consultables dans le corpus à titre de référence.", "Financial entity: DORA replaces NIS2's risk-management and notification obligations here (Article 4 of NIS2). The ReCyF measures, which break down Article 21, remain available in the corpus for reference.")}
        </Callout>
      ) : null}

      {hasNis2 ? (
        <div className="mb-5">
          <SegmentedControl<View>
            ariaLabel={tr('Vue', 'View')}
            value={view}
            onChange={(v) => setParams(v === 'anssi' ? { vue: 'anssi' } : {}, { replace: true })}
            options={[
              { value: 'exigences', label: tr('Exigences unifiées', 'Unified requirements'), count: all.length },
              { value: 'anssi', label: tr('Exigences NIS2 (ReCyF)', 'NIS2 requirements (ReCyF)'), count: scoping.measures.total },
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
              ariaLabel={tr('Filtrer les exigences', 'Filter requirements')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'tous', label: tr('Toutes', 'All'), count: all.length },
                { value: 'a_traiter', label: tr('À traiter', 'To address'), count: all.filter((p) => p.coverage !== 'en_place').length },
                { value: 'evalues', label: tr('Évaluées', 'Assessed'), count: s.evaluated },
              ]}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState title={tr('Aucune exigence dans ce filtre', 'No requirement in this filter')} />
          ) : (
            <div className="space-y-7">
              {byDomain.map((group) => (
                <section key={group.domain}>
                  <SectionRule aside={`${group.items.length}`}>{DOMAIN_LABEL[group.domain as Domain]}</SectionRule>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => {
                      const entry = entity.coverage[item.themeId]
                      const effective = scoping.coverage[item.themeId]
                      const level = effective?.level ?? 'non_evalue'
                      const fromIso = Boolean(effective?.fromIso)
                      const suggestion = scoping.iso.suggestions.get(item.themeId)
                      const alert = scoping.iso.alerts.get(item.themeId)
                      const perimeterWarning = suggestion?.blockedByPerimeter && suggestion.controls.some((c) => c.state.applicability === 'applicable')
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
                                    {fromIso ? (
                                      <Tooltip
                                        content={tr(
                                          'Niveau proposé à partir des contrôles ISO 27001 déclarés. Choisissez un autre niveau pour le remplacer.',
                                          'Level suggested from the declared ISO 27001 controls. Pick another level to replace it.',
                                        )}
                                      >
                                        <span className="inline-flex items-center gap-1 rounded-md bg-positive-wash px-1.5 text-[10px] font-medium text-positive">
                                          <BadgeCheck size={10} /> {tr('Renseigné via ISO 27001', 'Filled in via ISO 27001')}
                                        </span>
                                      </Tooltip>
                                    ) : null}
                                  </span>
                                  {alert ? (
                                    <span className="mt-1.5 flex items-start gap-1.5 text-2xs text-caution">
                                      <TriangleAlert size={11} className="mt-0.5 shrink-0" />
                                      {tr(
                                        `Exclue de la démarche ISO 27001 (${alert.controls.map((c) => `A.${c}`).join(', ')} non applicable) mais obligatoire au titre de ${alert.regulations.map((r) => REGULATIONS[r].shortName).join(', ')}.`,
                                        `Excluded from the ISO 27001 initiative (${alert.controls.map((c) => `A.${c}`).join(', ')} not applicable) but mandatory under ${alert.regulations.map((r) => REGULATIONS[r].shortName).join(', ')}.`,
                                      )}
                                    </span>
                                  ) : null}
                                  {perimeterWarning ? (
                                    <span className="mt-1.5 flex items-start gap-1.5 text-2xs text-caution">
                                      <TriangleAlert size={11} className="mt-0.5 shrink-0" />
                                      {tr(
                                        'Démarche ISO 27001 limitée à une partie du périmètre : pré-remplissage désactivé, à évaluer à la main.',
                                        'ISO 27001 initiative limited to part of the scope: pre-filling turned off, assess by hand.',
                                      )}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                              <div className="flex shrink-0 items-center gap-3">
                                <NoteButton anchor={{ kind: 'theme', id: item.themeId, label: item.theme.title }} />
                                <Ladder level={level} />
                                <StatePicker
                                  label={tr(`Couverture ${item.theme.code}`, `Coverage ${item.theme.code}`)}
                                  value={level}
                                  disabled={readOnly}
                                  onChange={(v) => setLevel(item.themeId, v)}
                                />
                              </div>
                            </div>

                            <AnimatePresence initial={false}>
                              {isOpen ? (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="space-y-4 border-t border-rule bg-sunken/60 px-4 py-4">
                                    <div>
                                      <div className="label-caps mb-1">{tr("L'action attendue", 'The expected action')}</div>
                                      <p className="text-sm leading-relaxed text-ink-2">{item.theme.unifiedAction}</p>
                                    </div>
                                    {suggestion && suggestion.controls.length > 0 ? (
                                      <div className="rounded-lg border border-rule-2 px-3 py-2.5 text-2xs text-ink-3">
                                        <span className="font-medium text-ink-2">{tr('Contrôles ISO 27001 correspondants', 'Matching ISO 27001 controls')} : </span>
                                        {suggestion.controls.map((c) => (c.id.startsWith('C') ? c.id.replace('C', tr('clause ', 'clause ')) : `A.${c.id}`)).join(' · ')}
                                        {suggestion.capReason ? <span className="mt-1 block">{suggestion.capReason}</span> : null}
                                        {entry?.isoDismissed && !readOnly ? (
                                          <button
                                            onClick={() => setCoverage(item.themeId, { level: 'non_evalue', isoDismissed: undefined })}
                                            className="mt-1 block text-accent hover:underline"
                                          >
                                            {tr('Rétablir la proposition ISO', 'Restore the ISO suggestion')}
                                          </button>
                                        ) : null}
                                        {isManualLevel(entry) && !entry?.isoDismissed && suggestion.level ? (
                                          <span className="mt-1 block">{tr(`Proposition ISO : ${LEVEL_STYLE[suggestion.level].label.toLowerCase()} (remplacée par votre saisie).`, `ISO suggestion: ${LEVEL_STYLE[suggestion.level].label.toLowerCase()} (overridden by your entry).`)}</span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    <Field label={tr('Preuve invoquée', 'Evidence cited')}>
                                      <Input disabled={readOnly} value={entry?.evidence ?? ''} onChange={(e) => setCoverage(item.themeId, { evidence: e.target.value })} placeholder={tr('Document, référence, date de dernière revue', 'Document, reference, date of last review')} />
                                      <p className="mt-1 text-2xs text-ink-3">{tr('Attendu par les textes', 'Expected by the texts')}{COLON}{item.theme.evidence.join(' · ')}</p>
                                    </Field>
                                    <Field label={tr('Commentaire', 'Comment')}>
                                      <Textarea disabled={readOnly} rows={2} value={entry?.note ?? ''} onChange={(e) => setCoverage(item.themeId, { note: e.target.value })} placeholder={tr('Réserve, dépendance, décision à prendre', 'Caveat, dependency, decision to take')} />
                                    </Field>

                                    <div className="rounded-lg bg-sunken p-3">
                                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                        <span className="text-xs font-semibold text-ink-2">{tr('Suivi (facultatif)', 'Follow-up (optional)')}</span>
                                        <span className="text-2xs text-ink-4">{tr("Utile si aucune autre plateforme ne porte le plan d'action ; repris dans les rapports.", 'Useful if no other platform holds the action plan; included in the reports.')}</span>
                                      </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Field label={tr('Porteur pressenti', 'Expected owner')}>
                                        <Input disabled={readOnly} value={entry?.owner ?? ''} onChange={(e) => setCoverage(item.themeId, { owner: e.target.value })} placeholder={tr('Direction ou personne', 'Department or person')} />
                                      </Field>
                                      <Field label={tr('Échéance visée', 'Target date')}>
                                        <Input disabled={readOnly} type="date" value={entry?.targetDate ?? ''} onChange={(e) => setCoverage(item.themeId, { targetDate: e.target.value })} />
                                      </Field>
                                    </div>
                                    </div>

                                    {recyf.length > 0 ? (
                                      <RecyfPanel objectives={recyf} statuses={scoping.measureStatuses} equivalence={scoping.iso.recyfEquivalence} onSetStatus={readOnly ? undefined : setMeasure} compact />
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-2.5">
                                      <Link to={`/app/croisements?theme=${item.themeId}`} className="ref text-accent hover:underline">
                                        {tr('Fiche de croisement →', 'Crosswalk card →')}
                                      </Link>
                                      {item.theme.mappings
                                        .flatMap((m) => m.obligationIds)
                                        .slice(0, 5)
                                        .map((id) => {
                                          const ob = OBLIGATION_BY_ID.get(id)
                                          return ob ? (
                                            <Link key={id} to={`/app/corpus?obligation=${id}`} className="ref text-ink-3 hover:text-accent hover:underline">
                                              {REG_LABEL[ob.regulation]} {ob.shortRef ?? ob.article}
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
        {tr("Les niveaux déclarés alimentent directement le score et la priorisation : un écart sur une exigence à fort effet de levier remonte dans l'ordre de traitement.", 'Declared levels feed straight into the score and the prioritisation: a gap on a high-leverage requirement moves up the treatment order.')}{' '}
        <Link to="/app/priorisation" className="font-medium text-accent underline underline-offset-2">
          {tr("Voir l'ordre de traitement", 'See the treatment order')}
        </Link>
      </Callout>
      <div className="mt-6">
        <NextStep to="/app/priorisation" label={tr("Prioriser : l'ordre de traitement", 'Prioritise: the treatment order')} hint={tr("Calculé à partir de l'exposition, des écarts et de l'effet de levier", 'Computed from exposure, gaps and leverage')} />
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
  const { recyf, measureStatuses, measures, nis2Category, iso } = useScoping()
  return (
    <div className="space-y-6">
      <Callout tone="accent" title={tr('Exigences NIS2 détaillées par le ReCyF', 'NIS2 requirements detailed by the ReCyF')}>
        {tr(
          `Les mesures du Référentiel Cyber France traduisent concrètement les exigences de l'article 21 de NIS2. Seules celles attendues d'une entité ${nis2Category ?? 'essentielle ou importante'} sont listées : ${measures.total} mesures, dont ${measures.en_place} en place.`,
          `The French cyber framework (ReCyF) measures turn the requirements of NIS2 Article 21 into concrete actions. Only those expected of ${nis2Category === 'importante' ? 'an important' : nis2Category === 'essentielle' ? 'an essential' : 'an essential or important'} entity are listed: ${measures.total} measures, ${measures.en_place} of them in place.`,
        )}{' '}
        <FrameworkNote />
      </Callout>
      {RECYF_PILLARS.map((p) => {
        const objectives = recyf.filter((o) => (p.objectives as readonly number[]).includes(o.n))
        if (objectives.length === 0) return null
        return (
          <section key={p.id}>
            <SectionRule aside={tr(`${objectives.length} objectif${objectives.length > 1 ? 's' : ''}`, `${objectives.length} objective${objectives.length > 1 ? 's' : ''}`)}>{p.label}</SectionRule>
            <RecyfPanel className="mt-3" objectives={objectives} statuses={measureStatuses} equivalence={iso.recyfEquivalence} onSetStatus={readOnly ? undefined : onSet} />
          </section>
        )
      })}
    </div>
  )
}
